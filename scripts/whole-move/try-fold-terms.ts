// Scratch: one Allemande frame's cost, term by term: the solve's pose against the placed start.
import { getBodyShape } from "../../src/services/body-shapes";
import { REVIEW2_SIZING } from "../../src/dance/baked-tracks";
import { figurePaths } from "../../src/dance/engine-paths";
import { armTurnGrip } from "../../src/dance/forearm-hold";
import { bodyOf, frameCost, solveBest, WEIGHTS, type Weights } from "../../src/dance/whole-move";
import { figureMove } from "../../src/dance/whole-move-figure";
const [beau, belle] = (process.argv[2] ?? "ember-ember").split("-") as [string, string];
const shapes = [getBodyShape(beau), getBodyShape(belle)] as const;
const P = figurePaths("allemande-left", "pair", shapes, REVIEW2_SIZING);
const bodies = [bodyOf(shapes[0]), bodyOf(shapes[1])] as [ReturnType<typeof bodyOf>, ReturnType<typeof bodyOf>];
const g = armTurnGrip(bodies[0], bodies[1]);
const fm = figureMove("allemande-left", P, bodies, { stepCap: 0.1, gripHeight: g.height, grow: "meet", trade: g.grow });
if ("unsupported" in fm) throw new Error(fm.unsupported);
const W = { ...WEIGHTS };
const r = solveBest({ ...fm.move, frames: fm.start }, { weights: W });
const i = Math.round((fm.path.length - 1) / 2);
const zero: Weights = Object.fromEntries(Object.keys(W).map((k) => [k, 0])) as unknown as Weights;
const terms: [string, Partial<Weights>][] = [["clip", { clip: W.clip, margin: W.margin }], ["hold", { hold: W.hold, clasp: W.clasp }], ["plane", { plane: W.plane, clasp: W.clasp }], ["stretch", { stretch: W.stretch }], ["range", { range: W.range }], ["rest", { rest: W.rest }], ["gravity", { gravity: W.gravity }], ["grow", { grow: W.grow, clip: 0 }], ["smooth", { smooth1: W.smooth1, smooth2: W.smooth2 }]];
for (const [name, frame] of [["solved", r.frames[i]!], ["start", fm.start[i]!]] as const) {
  console.log(name, terms.map(([n, w]) => `${n} ${frameCost(fm.move, i, frame, { ...zero, ...w }).toFixed(3)}`).join("  "), "total", frameCost(fm.move, i, frame, W).toFixed(2));
}
import { segSeg, shapesOf } from "../../src/dance/whole-move";
for (const [name, f] of [["solved", r.frames[i]!], ["start", fm.start[i]!]] as const) {
  const A = shapesOf(bodies[0], f[0]), B = shapesOf(bodies[1], f[1]);
  const out: string[] = [];
  for (const [X, Y, who] of [[A, B, "a/b"], [A, A, "a/a"], [B, B, "b/b"]] as const)
    for (const s1 of X) for (const s2 of Y) {
      if (X === Y && s1.name >= s2.name) continue;
      const over = s1.r + s2.r + 0.02 - segSeg(s1.a, s1.b, s2.a, s2.b);
      if (over > 0) out.push(`${who} ${s1.name}/${s2.name} ${(over * 100).toFixed(1)}`);
    }
  console.log(name, out.join(" | "));
}
