import assert from "node:assert";
import fs from "node:fs";

const checks = [
  {
    file: "src/components/CameraView.jsx",
    forbidden: [
      "isCalibrating",
      "CalibrationBar",
      "Hiệu chuẩn 4 điểm neo",
      "LayerCheckboxes",
      "LayerToggles",
      "Bbox YOLO",
      "ByteTrack ID",
      "CAM-CTU-01",
      "max-h-[340px]",
      "<PipelineStrip",
      "col-span-6",
    ],
    required: [
      "Nút giao Quang Trung",
      "h-full",
      "max-h-[460px]",
      "col-span-7",
      "items-start",
    ],
  },
  {
    file: "src/components/PipelineStrip.jsx",
    forbidden: [
      "Đang phát",
    ],
  },
  {
    file: "src/components/IpmZone.jsx",
    forbidden: [
      "IpmComparisonCards",
      "max-h-[190px]",
      "LiveSignalAllocation",
      "Pha 2 (Nhánh cắt ngang)",
      "Baseline cắt hụt",
      "col-span-6",
      "aspect-video",
    ],
    required: [
      "h-full",
      "max-h-[380px]",
      "col-span-5",
      "aspect-[4/3]",
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

assert.strictEqual(failed, 0, `Tab 3 Clean UI contract violated: ${failed} pattern checks failed.`);
console.log("[tab3_clean_ui.test] all assertions passed");
