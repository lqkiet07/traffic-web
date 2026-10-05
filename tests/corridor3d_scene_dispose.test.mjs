import assert from "node:assert";
import { disposeThreeScene } from "../src/lib/corridor3dScene.js";

let geoDisposed = 0;
let matDisposed = 0;
let texDisposed = 0;
const sharedTexture = { dispose: () => { texDisposed += 1; } };

const scene = {
  traverse: (fn) => {
    fn({
      geometry: { dispose: () => { geoDisposed += 1; } },
      material: { map: sharedTexture, dispose: () => { matDisposed += 1; } },
    });
    // Same texture shared by a second material must only be disposed once.
    fn({
      geometry: { dispose: () => { geoDisposed += 1; } },
      material: { map: sharedTexture, dispose: () => { matDisposed += 1; } },
    });
  },
};

disposeThreeScene(scene);
assert.strictEqual(geoDisposed, 2, "every geometry is disposed");
assert.strictEqual(matDisposed, 2, "every material is disposed");
assert.strictEqual(texDisposed, 1, "shared textures are disposed exactly once");

// Null / malformed scenes must not throw.
disposeThreeScene(null);
disposeThreeScene({});

console.log("[corridor3d_scene_dispose.test] all assertions passed");
