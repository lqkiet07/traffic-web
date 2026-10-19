import assert from "node:assert";
import fs from "node:fs";

const checks = [
  {
    file: "src/App.jsx",
    forbidden: ["Hướng dẫn phân tích:"],
    required: ["NetworkSummaryCard"],
  },
  {
    file: "src/components/Header.jsx",
    forbidden: [
      "Replay xe/đèn chỉ có Medium_900",
      "Replay xe/đèn chỉ có CAO-CBMP",
      "<Activity",
      "rounded-full bg-emerald-500",
      "8 nút giao",
    ],
  },
  {
    file: "src/components/MapView.jsx",
    forbidden: [
      "Theo xe",
      "<Tooltip",
    ],
  },
  {
    file: "src/components/JunctionInspector.jsx",
    forbidden: [
      "HintChip",
      "CollapsedChip",
      "GraduationCap",
      "WhyBox",
      "PhaseTuneBox",
      "toFixed(6)",
    ],
  },
  {
    file: "src/components/ReplayControls.jsx",
    forbidden: [
      "formatClock(globalSimTime)",
    ],
  },
  {
    file: "src/components/ComparisonCharts.jsx",
    forbidden: [
      "min-h-[280px]",
    ],
    required: [
      "ticks=",
    ],
  },
];

let failed = 0;
for (const check of checks) {
  const content = fs.readFileSync(new URL(`../${check.file}`, import.meta.url), "utf8");
  for (const needle of check.forbidden || []) {
    if (content.includes(needle)) {
      console.error(`[FAIL] ${check.file} must NOT contain "${needle}"`);
      failed++;
    } else {
      console.log(`[PASS] ${check.file} does not contain "${needle}"`);
    }
  }
  for (const needle of check.required || []) {
    if (!content.includes(needle)) {
      console.error(`[FAIL] ${check.file} MUST contain "${needle}"`);
      failed++;
    } else {
      console.log(`[PASS] ${check.file} contains "${needle}"`);
    }
  }
}

assert.strictEqual(failed, 0, `Tab 1 Clean UI contract violated: ${failed} pattern checks failed.`);
console.log("[tab1_clean_ui.test] all assertions passed");
