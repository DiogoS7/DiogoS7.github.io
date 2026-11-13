// Turns the CV (assets/js/data.js) and the repo index (assets/data/repos.json)
// into one plain-text briefing that goes into the system prompt.
// Both files are bundled into the Worker at deploy time, so a redeploy picks up CV edits.
import CV from "../../assets/js/data.js";
import REPOS from "../../assets/data/repos.json";

const SITE = "https://diogos7.github.io";
const line = (label, value) => (value ? `${label}: ${value}\n` : "");

function cvText() {
  let out = "## Profile\n";
  out += "Name: Diogo Santos\nRole: Business analyst & QA consultant, Lisbon, Portugal\n";
  out += `Website: ${SITE}\n\n`;

  out += "## Journey (education and work, oldest first)\n";
  for (const m of CV.journey) {
    if (m.type === "next") continue;
    out += `- ${m.title}, ${m.org} (${m.when})${m.current ? " [current]" : ""}\n`;
    for (const p of m.points) out += `  - ${p}\n`;
  }

  out += "\n## Skills (level 1 = learning, 5 = uses daily)\n";
  for (const g of CV.skills) {
    out += `- ${g.group}: ${g.items.map(s => `${s.name} (${s.level})`).join(", ")}\n`;
  }

  out += "\n## Languages\n";
  for (const l of CV.languages) out += `- ${l.name}: ${l.level}\n`;

  out += "\n## Featured projects (hand-written by Diogo)\n";
  for (const p of CV.projects) {
    out += `\n### ${p.name}\n`;
    out += line("Category", p.category);
    out += line("Context", p.context);
    out += line("Repository", p.url);
    out += line("Live demo", p.demo);
    out += line("Description", p.desc);
    if (p.skills?.length) out += `Skills: ${p.skills.join(", ")}\n`;
    for (const d of p.details || []) out += `- ${d}\n`;
    for (const r of p.releases || []) {
      out += `Release ${r.version}${r.name ? ` "${r.name}"` : ""} (${r.date || "n/a"}): ${r.summary || ""}\n`;
      for (const n of r.notes || []) out += `  - ${n}\n`;
    }
    for (const l of p.links || []) out += `Link: ${l.label} ${l.url}\n`;
  }

  out += "\n## Contact\n";
  for (const c of CV.contact) out += `- ${c.label}: ${c.href || c.value}\n`;
  return out;
}

function reposText() {
  const repos = REPOS.repos || [];
  if (!repos.length) return "";
  let out = `\n## All public GitHub repositories (summaries generated from each README on ${REPOS.generated?.slice(0, 10) || "n/a"})\n`;
  for (const r of repos) {
    out += `\n### ${r.name}${r.featured ? " (also featured above)" : ""}\n`;
    out += line("URL", r.url);
    out += line("Live site", r.homepage);
    out += line("Summary", r.summary || r.description);
    if (r.highlights?.length) for (const h of r.highlights) out += `- ${h}\n`;
    if (r.stack?.length) out += `Stack: ${r.stack.join(", ")}\n`;
  }
  return out;
}

export const KNOWLEDGE = cvText() + reposText();
