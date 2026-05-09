const fs = require("fs");
const path = require("path");
const dir = path.resolve(__dirname, "fixtures/raw");
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
let pass = 0, fail = 0;
const errors = [];
for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    if (!data.name) throw new Error("missing name");
    if (!Array.isArray(data.experience)) throw new Error("experience not array");
    if (!Array.isArray(data.skills)) throw new Error("skills not array");
    if (!Array.isArray(data.education)) throw new Error("education not array");
    if (typeof data.total_experience_years !== "number") throw new Error("total_experience_years not number");
    for (const s of data.skills) {
      if (!s.name || !s.domain || !s.source) throw new Error("skill missing fields: " + JSON.stringify(s));
    }
    for (const e of data.experience) {
      if (!e.company || !e.title) throw new Error("experience missing company/title");
      if (!Array.isArray(e.bullets)) throw new Error("experience bullets not array");
    }
    pass++;
  } catch (err) {
    fail++;
    errors.push(f + ": " + err.message);
  }
}
console.log("=== FIXTURE VALIDATION ===");
console.log("Pass: " + pass + " / Fail: " + fail + " / Total: " + files.length);
if (errors.length > 0) {
  console.log("\nErrors:");
  errors.forEach(e => console.log("  " + e));
}
