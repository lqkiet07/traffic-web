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

// 5. License file and citation/contact contract
const licensePath = path.resolve(__dirname, "../LICENSE");
assert.ok(fs.existsSync(licensePath), "LICENSE file must exist at root");
const licenseContent = fs.readFileSync(licensePath, "utf8");
assert.ok(licenseContent.includes("ACADEMIC NON-COMMERCIAL"), "LICENSE must declare Academic Non-Commercial terms");
assert.ok(licenseContent.includes("Can Tho University"), "LICENSE must cite Can Tho University");

// 6. Citation, Academic License, and Collaboration links in README
assert.ok(
  readme.includes("Optimization of Cycle-Based Max Pressure Control in Mixed Traffic Based on Continuous Area Occupancy"),
  "README.md must cite the exact paper title"
);
assert.ok(readme.includes("THS2026-69"), "README.md must cite study code THS2026-69");
assert.ok(readme.includes("Thi-Ngoc-Tran Nguyen"), "README.md must list lead student author");
assert.ok(readme.includes("Quoc-Kiet Le"), "README.md must list author Quoc-Kiet Le");
assert.ok(readme.includes("Thanh-Khoa Nguyen"), "README.md must list advisor Thanh-Khoa Nguyen");
assert.ok(readme.includes("@inproceedings{nguyen2026optimization"), "README.md must include exact BibTeX citation block");
assert.ok(readme.includes("Academic Non-Commercial"), "README.md must reference the Academic License");
assert.ok(readme.includes("@lqkiet07"), "README.md must include permanent contact GitHub profile link");
assert.ok(readme.includes("issues"), "README.md must include GitHub Issues link for collaboration");
assert.ok(!readme.includes("License-MIT"), "README.md must not reference MIT badge");

// 7. Language consistency: Sections 7 & 8 and LICENSE must be 100% in English
assert.ok(!readme.includes("Đề tài nghiên cứu được thực hiện"), "README.md must not contain Vietnamese in Section 7");
assert.ok(!readme.includes("Trích Dẫn Khoa Học"), "README.md citation heading must be in English");
assert.ok(!readme.includes("Dự án được bảo hộ theo giấy phép"), "README.md Section 8 must be in English");
assert.ok(!licenseContent.includes("Dự án này được công bố"), "LICENSE must not contain Vietnamese text");
assert.ok(!licenseContent.includes("QUYỀN HẠN ĐƯỢC PHÉP"), "LICENSE sections must be in English");

console.log("[readme_contract.test] all assertions passed!");
