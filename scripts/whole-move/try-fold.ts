// Scratch: the Allemande's geometry. Where does the grip ask each elbow to be, against the shoulder?
import { getBodyShape } from "../../src/services/body-shapes";
import { defined } from "../../src/test/defined";
import { REVIEW2_SIZING } from "../../src/dance/baked-tracks";
import { figurePaths } from "../../src/dance/engine-paths";
import { RESHAPE } from "../../src/dance/accommodation";
import { armMetrics, contactRadius, contactSeparation } from "../../src/dance/arm-pose";
import { bodyGripRadius, pairGripRadius, planForearm } from "../../src/dance/forearm-hold";
import { reviewPairings } from "../../src/dance/review-route";
import { bodyOf, toFloor } from "../../src/dance/whole-move";
import { figureMove } from "../../src/dance/whole-move-figure";

for (const p of reviewPairings()) {
  const shapes = [getBodyShape(p.beau), getBodyShape(p.belle)] as const;
  const P = figurePaths("allemande-left", "pair", shapes, REVIEW2_SIZING);
  const bodies = [bodyOf(shapes[0]), bodyOf(shapes[1])] as [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>];
  const ma = armMetrics(shapes[0]), mb = armMetrics(shapes[1]);
  const plan = planForearm(ma, mb, shapes[0], shapes[1], RESHAPE);
  const fm = figureMove("allemande-left", P, bodies, { gripHeight: plan.height });
  if ("unsupported" in fm) continue;
  const h = defined(fm.move.holds[0], "fm.move.holds[0]");
  const R = contactRadius(ma, mb), S = contactSeparation(ma, mb);
  const worst = [0, 0], worstOut = [0, 0];
  const beatOf = (t: number) => t * P.beats;
  const seps: number[] = [];
  fm.path.forEach((f, i) => {
    const t = i / (fm.path.length - 1);
    if (t < h.from || t > h.to) return;
    const dx = f[1].x - f[0].x, dz = f[1].z - f[0].z, d = Math.hypot(dx, dz);
    seps.push(d);
    const px = (f[0].x + f[1].x) / 2, pz = (f[0].z + f[1].z) / 2;
    for (const k of [0, 1] as const) {
      const ux = (k === 0 ? dx : -dx) / d, uz = (k === 0 ? dz : -dz) / d; // toward partner
      const m = k === 0 ? ma : mb;
      const back = R - m.forearmSpan;
      const half = S / 2;
      const ex = px + back * ux + half * uz, ez = pz + back * uz - half * ux;
      const s = toFloor(bodies[k].shoulder[0], f[k]); // left shoulder
      const need = Math.hypot(ex - s[0], plan.height - s[1], ez - s[2]);
      const w = beatOf(t) <= 7 ? worst : worstOut;
      w[k] = Math.max(defined(w[k], "w[k]"), need / bodies[k].upper0);
    }
  });
  console.log(`${p.beau}-${p.belle}`.padEnd(14), `sep ${Math.min(...seps).toFixed(3)}–${Math.max(...seps).toFixed(3)} m`, `R ${R.toFixed(3)}`, `fore ${ma.forearmSpan.toFixed(3)}/${mb.forearmSpan.toFixed(3)}`, `upper ${bodies[0].upper0.toFixed(3)}/${bodies[1].upper0.toFixed(3)}`, `upper-arm × turn ${worst.map((x) => x.toFixed(2)).join('/')} out ${worstOut.map((x) => x.toFixed(2)).join('/')}`, `own r ${bodyGripRadius(ma, mb).toFixed(3)}/${bodyGripRadius(mb, ma).toFixed(3)} pair ${pairGripRadius(ma, mb).toFixed(3)}`);
}
