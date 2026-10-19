import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readmePath = path.resolve(__dirname, "../README.md");

// 1. File must exist and have substantial content (> 1500 chars)
assert.ok(fs.existsSync(readmePath), "README.md must exist at root");
const readme = fs.readFileSync(readmePath, "utf8");
assert.ok(readme.length > 1500, "README.md must be comprehensive (>1500 chars)");

// 2. Core commands required for any developer
assert.ok(readme.includes("npm install"), "README must document npm install");
assert.ok(readme.includes("npm run dev"), "README must document npm run dev");
assert.ok(readme.includes("npm run build"), "README must document npm run build");
assert.ok(readme.includes("node --test tests/*.test.mjs"), "README must document test suite command");

// 3. Document all 3 primary modules (Clean UI aligned)
assert.ok(readme.includes("CAO-CBMP"), "README must document CAO-CBMP algorithm");
assert.ok(readme.includes("Quang Trung"), "README must cite real-world Quang Trung intersection");
assert.ok(readme.includes("Giờ cao điểm xe máy"), "README must document scenario 1");
assert.ok(readme.includes("Kẹt xe dây chuyền"), "README must document scenario 2");

// 4. Must NOT contain deprecated slop keywords
assert.ok(!readme.includes("LabSpawnerDock"), "README must not reference removed spawner dock");
assert.ok(!readme.includes("CalibrationBar"), "README must not reference removed calibration bar");

console.log("[readme_contract.test] all assertions passed!");
