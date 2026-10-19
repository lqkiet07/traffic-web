import assert from "node:assert";
import fs from "node:fs";

const panelContent = fs.readFileSync(new URL("../src/components/LabAnalysisPanel.jsx", import.meta.url), "utf8");
const labContent = fs.readFileSync(new URL("../src/components/AlgorithmLab.jsx", import.meta.url), "utf8");
const algoLabContent = labContent;

const forbiddenInPanel = [
  "LabSpawnerDock",
  "QuickBatchSection",
  "VehiclePicker",
  "Dọn sạch xe",
  "Thả xe nhanh",
  "LabWhyBox",
  "Hướng dẫn học tập",
  "DilationPipelineVisual",
  "SimVsRealComparison",
  "BackpressureCauseEffect",
  "Bảng 1 (Nghiên cứu)",
  "Tự động (3s)",
  "Đầu chu kỳ",
  "Nghịch lý xe máy che khuất",
  "Kẹt dội ngược liên nút",
  '"balanced"',
  '"heterogeneous"',
];

let failed = 0;

for (const needle of forbiddenInPanel) {
  if (panelContent.includes(needle)) {
    console.error(`[FAIL] LabAnalysisPanel.jsx must NOT contain "${needle}"`);
    failed++;
  } else {
    console.log(`[PASS] LabAnalysisPanel.jsx does not contain "${needle}"`);
  }
}

const requiredInPanel = [
  "<LiveMathBox",
  "1. Giờ cao điểm xe máy",
  "2. Kẹt xe dây chuyền",
];

for (const needle of requiredInPanel) {
  if (!panelContent.includes(needle)) {
    console.error(`[FAIL] LabAnalysisPanel.jsx MUST contain "${needle}"`);
    failed++;
  } else {
    console.log(`[PASS] LabAnalysisPanel.jsx contains "${needle}"`);
  }
}

const forbiddenInLab = [
  "<LabControlBar",
  "MouseHintChip",
  "Chế độ từng bước: Quan sát",
  "Chuột trái: Xoay 360",
  '"chase"',
  '"free"',
];

for (const needle of forbiddenInLab) {
  if (labContent.includes(needle)) {
    console.error(`[FAIL] AlgorithmLab.jsx must NOT contain "${needle}"`);
    failed++;
  } else {
    console.log(`[PASS] AlgorithmLab.jsx does not contain "${needle}"`);
  }
}

if (!algoLabContent.includes('useState("stepper")')) {
  console.error(`[FAIL] AlgorithmLab.jsx MUST contain 'useState("stepper")'`);
  failed++;
} else {
  console.log(`[PASS] AlgorithmLab.jsx contains 'useState("stepper")'`);
}

assert.strictEqual(failed, 0, `Tab 2 Clean UI contract violated: ${failed} assertions failed.`);
console.log("[tab2_clean_ui.test] all assertions passed");
