// Fails if index.html or data.js points at a local file that isn't in the repo.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const sources = ["index.html", "assets/js/data.js"].map(f => fs.readFileSync(path.join(root, f), "utf8"));
const refs = new Set();
for (const text of sources) {
  for (const m of text.matchAll(/(?:src|href)=["']([^"'#]+)["']|src:\s*"([^"]+)"/g)) {
    const ref = m[1] || m[2];
    if (!/^(https?:|mailto:|tel:|data:)/.test(ref)) refs.add(ref);
  }
}
const missing = [...refs].filter(ref => !fs.existsSync(path.join(root, ref)));
if (missing.length) {
  console.error("Missing files:\n  " + missing.join("\n  "));
  process.exit(1);
}
console.log(`All ${refs.size} local files found.`);
