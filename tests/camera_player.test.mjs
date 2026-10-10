import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const metaPath = path.resolve(__dirname, "../public/data/camera_roi_meta.json");
const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

function formatTimestamp(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = s.toFixed(1).padStart(4, "0");
  return `${mm}:${ss}`;
}

function findClosestFrame(frames, currentTime) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  let effectiveTime = currentTime;
  if (frames.length > 1) {
    const maxTime = frames[frames.length - 1]?.time ?? 0;
    if (maxTime > 0 && currentTime > maxTime) {
      const rem = currentTime % maxTime;
      effectiveTime = rem === 0 ? maxTime : rem;
    }
  }
  let closest = frames[0];
  let minDiff = Math.abs((frames[0]?.time ?? 0) - effectiveTime);
  for (let i = 1; i < frames.length; i++) {
    const diff = Math.abs((frames[i]?.time ?? 0) - effectiveTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = frames[i];
    }
  }
  return closest;
}

// 1. formatTimestamp formatting test
assert.strictEqual(formatTimestamp(0), "00:00.0");
assert.strictEqual(formatTimestamp(2.5), "00:02.5");
assert.strictEqual(formatTimestamp(15), "00:15.0");
assert.strictEqual(formatTimestamp(65.4), "01:05.4");
assert.strictEqual(formatTimestamp(-5), "00:00.0");
assert.strictEqual(formatTimestamp(NaN), "00:00.0");

// 2. findClosestFrame robustness
assert.strictEqual(findClosestFrame(null, 0), null);
assert.strictEqual(findClosestFrame([], 5), null);

// 3. findClosestFrame with real camera frames
const frames = meta.frames;
const f0 = findClosestFrame(frames, 0);
assert.strictEqual(f0.time, 0);

const f02 = findClosestFrame(frames, 0.2);
assert.strictEqual(f02.time, 0);

const f04 = findClosestFrame(frames, 0.4);
assert.strictEqual(f04.time, 0.5);

const fMid = findClosestFrame(frames, 2.0);
assert.strictEqual(fMid.time, 2.0);

// 4. cyclic modulo playback wrap-around
const maxTime = frames[frames.length - 1].time;
const fWrap = findClosestFrame(frames, maxTime + 1.5);
assert.strictEqual(fWrap.time, 1.5);

const fExactMultiple = findClosestFrame(frames, maxTime * 2);
assert.strictEqual(fExactMultiple.time, maxTime);

const fBeyond = findClosestFrame(frames, maxTime + 2.0);
assert.strictEqual(fBeyond.time, 2.0);

console.log("[camera_player.test] all assertions passed");
