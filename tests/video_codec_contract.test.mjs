import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const videoPath = path.resolve(__dirname, "../public/videos/intersection_1_roi.mp4");

assert.ok(fs.existsSync(videoPath), `Video file must exist: ${videoPath}`);

const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,pix_fmt -of json "${videoPath}"`;
const output = execSync(probeCmd, { encoding: "utf-8" });
const info = JSON.parse(output);

assert.ok(info.streams && info.streams.length > 0, "Video stream 0 must be present");
const stream0 = info.streams[0];

assert.strictEqual(stream0.codec_name, "h264", `Expected codec_name to be h264, got ${stream0.codec_name}`);
assert.strictEqual(stream0.pix_fmt, "yuv420p", `Expected pix_fmt to be yuv420p, got ${stream0.pix_fmt}`);

console.log("[video_codec_contract.test] Passed: H.264 yuv420p verified.");
