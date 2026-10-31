import { describe, expect, it } from "vitest";
import { defined } from "../test/defined";
import { getBodyShape } from "../services/body-shapes";
import { costN, startN } from "./whole-move-n";
import { rightAndLeftThru } from "./whole-move-rlt";

describe("🧪 the N-dancer solve (step 5, 2026-10-27)", () => {
  const ryan = getBodyShape("ryan");
  const m = rightAndLeftThru([ryan, ryan, ryan, ryan], { perBeat: 2 });

  it("has an exact gradient: it matches central differences", () => {
    // A start with every variable nudged, so clearances, holds and ranges are all live somewhere.
    const v = startN(m);
    let seed = 7;
    for (let j = 0; j < v.length; j++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      v[j] = defined(v[j], "v[j]") + (seed / 2147483648 - 0.5) * 0.3;
    }
    const grad = new Float64Array(v.length);
    costN(m, v, undefined, grad);
    const h = 1e-6;
    let worst = 0;
    for (let j = 0; j < v.length; j += 3) {
      const x = defined(v[j], "v[j]");
      v[j] = x + h;
      const up = costN(m, v);
      v[j] = x - h;
      const dn = costN(m, v);
      v[j] = x;
      const num = (up - dn) / (2 * h);
      worst = Math.max(worst, Math.abs(num - defined(grad[j], "grad[j]")) / Math.max(1, Math.abs(num)));
    }
    expect(worst).toBeLessThan(1e-4);
  });

  it("holds the pull-by, the courtesy turn's hands, and the couple handhold at each end", () => {
    const kinds = m.holds.map((h) => `${String(h.a.dancer)}${h.a.side === 1 ? "R" : "L"}→${String(h.b.dancer)}${"back" in h.b ? "back" : h.b.side === 1 ? "R" : "L"}`);
    // The couple handhold (gent's right in her left) twice: from beat 0, and from the courtesy turn to the end.
    // His right on her back twice: held where he can reach it, and a reach through the whole turn.
    expect(kinds.sort()).toEqual(["0L→1L", "0R→1L", "0R→1L", "0R→1back", "0R→1back", "0R→3R", "1R→2R", "2L→3L", "2R→3L", "2R→3L", "2R→3back", "2R→3back"]);
  });
});
