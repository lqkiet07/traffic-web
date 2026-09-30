import assert from "node:assert";
import { declutter } from "../src/lib/declutter.js";
import { V_INDEX } from "../src/lib/data.js";

const M_LAT = 111320;
const M_LNG = 109640;
const V = (id, type, lat, lng, speed, heading) => [id, type, lat, lng, speed, heading];
const LNG = (m) => m / M_LNG;
const LAT = (m) => m / M_LAT;
const lonGapM = (a, b) => Math.abs(a[V_INDEX.LNG] - b[V_INDEX.LNG]) * M_LNG;

const X0 = 10.03;
const Y0 = 105.77;

{
  const a = V("a", 1, Y0, X0, 0, 0);
  const b = V("b", 1, Y0, X0, 0, 0);
  const out = declutter([a, b]);
  assert.strictEqual(out.length, 2);
  assert.ok(lonGapM(out[0], out[1]) >= 5.0 - 1e-9, `stopped gap got ${lonGapM(out[0], out[1])}`);
}

{
  const gap = 6;
  const lead = V("a", 1, Y0, X0 + LNG(gap), 13, 0);
  const foll = V("b", 1, Y0, X0, 13, 0);
  const out = declutter([lead, foll]);
  assert.deepStrictEqual([out[0][V_INDEX.LAT], out[0][V_INDEX.LNG]], [lead[V_INDEX.LAT], lead[V_INDEX.LNG]]);
  assert.deepStrictEqual([out[1][V_INDEX.LAT], out[1][V_INDEX.LNG]], [foll[V_INDEX.LAT], foll[V_INDEX.LNG]]);
}

{
  const lead = V("a", 1, Y0, X0 + LNG(0.5), 13, 0);
  const foll = V("b", 1, Y0 + LAT(0.2), X0, 13, 0);
  const out = declutter([lead, foll]);
  const g = Math.abs(out[0][V_INDEX.LNG] - out[1][V_INDEX.LNG]) * M_LNG;
  assert.ok(g >= 4.4, `moving overlap gap got ${g}`);
}

{
  const lead = V("a", 1, Y0 + LAT(3.0), X0, 13, 0);
  const foll = V("b", 1, Y0, X0, 13, 0);
  const before = [lead.slice(), foll.slice()];
  const out = declutter([lead, foll]);
  assert.deepStrictEqual(out, before);
}

{
  const a = V("car1", 1, Y0, X0, 0, 0);
  const b = V("car2", 2, Y0, X0, 0, 0);
  const src = [a.slice(), b.slice()];
  const out = declutter([a, b]);
  for (let i = 0; i < 2; i++) {
    assert.strictEqual(out[i][V_INDEX.ID], src[i][V_INDEX.ID]);
    assert.strictEqual(out[i][V_INDEX.TYPE], src[i][V_INDEX.TYPE]);
    assert.strictEqual(out[i][V_INDEX.SPEED], src[i][V_INDEX.SPEED]);
    assert.strictEqual(out[i][V_INDEX.HEADING], src[i][V_INDEX.HEADING]);
  }
  assert.strictEqual(a[V_INDEX.LNG], src[0][V_INDEX.LNG]);
  assert.strictEqual(b[V_INDEX.LNG], src[1][V_INDEX.LNG]);
}

console.log("[declutter.test] all assertions passed");
