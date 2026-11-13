// Builds assets/data/repos.json: every public repo of the GitHub user, with a short
// summary, highlights and skills written by Claude from the repo's README and recent commits.
// Repos whose README, description and topics haven't changed keep their previous card (no API call),
// so the file only changes, and the Action only opens a PR, when there is something new to show.
//
//   node scripts/index-repos.mjs            needs ANTHROPIC_API_KEY; GITHUB_TOKEN recommended
//   node scripts/index-repos.mjs --no-ai    metadata only, uses the repo description as summary
//   node scripts/index-repos.mjs --force    re-summarise every repo
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const OUT = path.join(root, "assets/data/repos.json");
const USER = process.env.GITHUB_USER || "DiogoS7";
const MODEL = "claude-opus-5-5";
const README_LIMIT = 30_000; // characters; longer READMEs are cut and Claude is told so

const args = new Set(process.argv.slice(2));
const NO_AI = args.has("--no-ai");
const FORCE = args.has("--force");

const CV = createRequire(import.meta.url)(path.join(root, "assets/js/data.js"));
const SKILLS = CV.skills.flatMap(g => g.items.map(s => s.name));
const FEATURED = new Set(CV.projects.map(p => (p.repo || "").toLowerCase()).filter(Boolean));

async function gh(pathname) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "cv-repo-indexer", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com${pathname}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${pathname}: ${res.status} ${await res.text()}`);
  return res.json();
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "highlights", "stack", "skills"],
  properties: {
    summary: { type: "string", description: "One or two plain sentences: what the project is and who it is for." },
    highlights: { type: "array", items: { type: "string" }, description: "Two to four short, concrete facts worth a recruiter's attention." },
    stack: { type: "array", items: { type: "string" }, description: "Main languages, frameworks and services, most important first." },
    skills: { type: "array", items: { type: "string", enum: SKILLS }, description: "Skills from the CV's list that this project clearly demonstrates." },
  },
};

async function summarise(client, repo, readme, commits, languages) {
  let readmeText = readme || "(no README)";
  let note = "";
  if (readmeText.length > README_LIMIT) {
    readmeText = readmeText.slice(0, README_LIMIT);
    note = `\n(The README is longer than ${README_LIMIT} characters; only the first part is shown.)`;
  }
  const prompt = `Write a portfolio card for this GitHub repository, for recruiters reading Diogo Santos's CV website. Use only the facts below; if the README is thin, keep the card short rather than guessing. Plain, specific wording, no marketing language.

Repository: ${repo.full_name}
Description: ${repo.description || "(none)"}
Languages (bytes): ${JSON.stringify(languages || {})}
Topics: ${(repo.topics || []).join(", ") || "(none)"}
Recent commit messages:
${commits.map(c => `- ${c}`).join("\n") || "(none)"}

README:${note}
<readme>
${readmeText}
</readme>`;

  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason === "refusal") throw new Error(`Claude declined to summarise ${repo.full_name}`);
  const text = res.content.filter(b => b.type === "text").map(b => b.text).join("");
  return JSON.parse(text);
}

async function main() {
  if (!NO_AI && !process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Set it, or run with --no-ai for metadata only.");
    process.exit(1);
  }
  const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { repos: [] };
  const prevByName = new Map(previous.repos.map(r => [r.full_name.toLowerCase(), r]));
  const client = NO_AI ? null : new Anthropic();

  const all = await gh(`/users/${USER}/repos?per_page=100&type=owner&sort=pushed`);
  const repos = all.filter(r => !r.fork && !r.archived && !r.private);
  const out = [];
  let written = 0;

  for (const repo of repos) {
    const key = repo.full_name.toLowerCase();
    const prev = prevByName.get(key);
    const base = {
      name: repo.name,
      full_name: repo.full_name,
      url: repo.html_url,
      homepage: repo.homepage || "",
      description: repo.description || "",
      language: repo.language || "",
      topics: repo.topics || [],
      featured: FEATURED.has(key),
    };
    const readmeFile = await gh(`/repos/${repo.full_name}/readme`);
    base.source = [readmeFile?.sha || "", repo.description || "", (repo.topics || []).join(",")].join("|");
    const unchanged = prev && prev.source === base.source && prev.ai;
    if (unchanged && !FORCE) { out.push({ ...prev, ...base }); continue; }
    if (NO_AI) {
      out.push({ ...base, summary: prev?.summary || repo.description || "", highlights: prev?.highlights || [], stack: prev?.stack || (repo.language ? [repo.language] : []), skills: prev?.skills || [], ai: prev?.ai || false });
      continue;
    }
    const readme = readmeFile ? Buffer.from(readmeFile.content, readmeFile.encoding || "base64").toString("utf8") : "";
    const [commits, languages] = await Promise.all([
      gh(`/repos/${repo.full_name}/commits?per_page=15`).then(cs => (cs || []).map(c => c.commit.message.split("\n")[0])).catch(() => []),
      gh(`/repos/${repo.full_name}/languages`),
    ]);
    try {
      const card = await summarise(client, repo, readme, commits, languages);
      out.push({ ...base, ...card, ai: true });
      written++;
      console.log(`summarised ${repo.full_name}`);
    } catch (err) {
      console.warn(`kept old card for ${repo.full_name}: ${err.message}`);
      out.push({ ...base, summary: prev?.summary || repo.description || "", highlights: prev?.highlights || [], stack: prev?.stack || [], skills: prev?.skills || [], ai: prev?.ai || false });
    }
  }

  const sameRepos = JSON.stringify(out) === JSON.stringify(previous.repos);
  const result = { generated: sameRepos ? previous.generated : new Date().toISOString(), user: USER, repos: out };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
  console.log(`${out.length} repos in ${path.relative(root, OUT)} (${written} newly summarised${sameRepos ? ", nothing changed" : ""})`);
}

main().catch(err => { console.error(err); process.exit(1); });
