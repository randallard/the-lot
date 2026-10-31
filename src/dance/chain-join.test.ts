import { describe, expect, it } from "vitest";
import { getBodyShape } from "../services/body-shapes";
import { defined } from "../test/defined";
import { BAKED_TRACKS, chooseBake, REVIEW2_SIZING, stepToCouple, type BakedTrack, type PathSample } from "./baked-tracks";
import { joinChain } from "./chain-join";
import { couplePaths } from "./engine-paths";
import { bodyOf, fromDials, metrics, shapesOf, type Body, type Frame } from "./whole-move";
import { standingFrame } from "./whole-move-twirl";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const ARM = /^[01]\.(upper-arm|forearm)-(left|right)\.(raise|toward|pitch|heading)$/;
const short = (d: number) => Math.abs(((d % 360) + 540) % 360 - 180);
/** A track's dial values at sample `i`. */
const valuesAt = (t: BakedTrack, i: number) => defined(t.keyframes[i], `keyframe ${String(i)}`).values;
/** A dial a test names; a missing one fails there. */
const dial = (v: Readonly<Record<string, number>>, key: string) => defined(v[key], key);
/** The standing couple's placements at path sample `i`, as `standingFrame` takes them. */
const placed = (beau: readonly PathSample[], belle: readonly PathSample[], i: number) => {
  const pb = defined(beau[i], `beau path ${String(i)}`);
  const pl = defined(belle[i], `belle path ${String(i)}`);
  return [
    { x: pb.x / 100, z: pb.z / 100, yaw: pb.facing * D2R, arms: [] },
    { x: pl.x / 100, z: pl.z / 100, yaw: pl.facing * D2R, arms: [] },
  ] as never;
};

describe("🧪 calls chain (step 4, 2026-10-27; square-one ADR-0026)", () => {
  const ryan = getBodyShape("ryan");
  const shapes = [ryan, ryan] as const;
  const bodies: [Body, Body] = [bodyOf(ryan), bodyOf(ryan)];
  const bake = defined(chooseBake(BAKED_TRACKS, "california-twirl", shapes, { grow: "meet", draw: () => "reshape" }), "ryan's twirl bake");
  const paths = couplePaths("california-twirl", shapes, bake.sizing ?? REVIEW2_SIZING);
  const joined = joinChain([{ bake, paths }, { bake, paths }], shapes);
  const a = defined(joined[0], "the first twirl");
  const b = defined(joined[1], "the second twirl");
  const n = bake.keyframes.length;
  const K = 10;
  /** The join's window (`JoinOptions.join`). */
  const J = 15;

  it("hands one twirl to the next on the same pose, where the bakes alone snapped", () => {
    const end = valuesAt(a, n - 1);
    const start = valuesAt(b, 0);
    let before = 0;
    for (const key of Object.keys(end).filter((k) => ARM.test(k))) {
      expect(short(dial(end, key) - dial(start, key)), key).toBeLessThan(0.2);
      before = Math.max(before, short(dial(valuesAt(bake, n - 1), key) - dial(valuesAt(bake, 0), key)));
    }
    expect(before).toBeGreaterThan(90);
  });

  it("keeps the arch up through the join, with the arms at their own length (10-27)", () => {
    // Ryan: the beau's twirl arm went "a bit wonky". The hands dipped to the chest at the join,
    // and the arm that brought them back up was stretched and tangled.
    for (let i = n - 1 - J; i < n; i++) {
      const v = valuesAt(a, i);
      expect(v["0.upper-arm-right.raise"], `raise at ${String(i)}`).toBeGreaterThan(120);
      // No longer than the bake itself stretches them mid-call; the tangle had them at 42 / 61.
      // The 10-27 bake stretched them 37 / 43 cm. Re-baked 10-29 under the upper-arm cap, the upper
      // arm keeps its 33 and the forearm carries the reach, 51 cm at most.
      expect(v["0.upper-arm-right.length"], `upper arm at ${String(i)}`).toBeLessThan(34);
      expect(v["0.forearm-right.length"], `forearm at ${String(i)}`).toBeLessThan(52);
    }
  });

  it("closes sprout → sprout's hands at the join, and keeps them up (10-27)", () => {
    // Their arms are at full reach holding the arch. A 6 cm margin between the two held arms
    // stepped the beau out 15–17 cm, and the hands opened 3.4 cm.
    const sprout = getBodyShape("sprout");
    const s2 = [sprout, sprout] as const;
    const sb2: [Body, Body] = [bodyOf(sprout), bodyOf(sprout)];
    const sb = defined(chooseBake(BAKED_TRACKS, "california-twirl", s2, { grow: "meet", draw: () => "reshape" }), "sprout's twirl bake");
    const sp = couplePaths("california-twirl", s2, sb.sizing ?? REVIEW2_SIZING);
    const x = defined(joinChain([{ bake: sb, paths: sp }, { bake: sb, paths: sp }], s2)[0], "the first twirl");
    const m = x.keyframes.length;
    const frames: Frame[] = [];
    for (let i = m - 1 - J; i < m; i++) {
      const v = valuesAt(x, i);
      const p = [defined(sp.beau[i], "beau path"), defined(sp.belle[i], "belle path")] as const;
      const [sx, sz] = stepToCouple(v["0.offset.x"] ?? 0, v["0.offset.z"] ?? 0, p[0].facing * D2R);
      frames.push(([0, 1] as const).map((d) => ({
        ...fromDials(v, d, sb2[d]),
        x: p[d].x / 100 + (d === 0 ? sx / 100 : 0),
        z: p[d].z / 100 + (d === 0 ? sz / 100 : 0),
        yaw: p[d].facing * D2R,
      })) as unknown as Frame);
    }
    const got = metrics({ bodies: sb2, frames, holds: [{ from: 0, to: 1, beau: 1, belle: 0 }] }, frames);
    expect(got.holdGap).toBeLessThan(0.015);
    expect(got.clip).toBeLessThan(0.001);
    // Ryan: "the hands come down after each twirl". The bake lowers them from 100 cm to 77 for its
    // own end; through the join they stay up.
    for (const fr of frames) {
      const hb = defined(shapesOf(sb2[0], fr[0]).find((h) => h.name === "hand-right"), "the beau's right hand");
      expect(hb.a[1]).toBeGreaterThan(0.88);
    }
  });

  it("starts and ends the sequence as the standing couple: waiting", () => {
    for (const [track, i] of [[a, 0], [b, n - 1]] as const) {
      const want = standingFrame(shapes, bodies, placed(paths.beau, paths.belle, i));
      const v = valuesAt(track, i);
      for (const d of [0, 1] as const) {
        const got = fromDials(v, d, bodies[d]);
        for (const side of [0, 1] as const) for (const key of ["raise", "toward", "pitch", "heading"] as const) {
          expect(short((got.arms[side][key] - want[d].arms[side][key]) * R2D), `${String(d)} ${String(side)} ${key}`).toBeLessThan(0.2);
        }
      }
      expect(Math.hypot(v["0.offset.x"] ?? 0, v["0.offset.z"] ?? 0)).toBeLessThan(0.1);
    }
  });

  it("waits a beat or more in the standing couple, and flows on through less (10-27)", () => {
    // Ryan: "if there's a beat or more after the next call should be called then they go to
    // handhold". square-one's waits leave the gap; the join reads it from each call's `wait`.
    const waited = joinChain([{ bake, paths }, { bake, paths, wait: 2 }], shapes);
    const w1 = defined(waited[0], "the first call"), w2 = defined(waited[1], "the second call");
    for (const [track, i] of [[w1, n - 1], [w2, 0]] as const) {
      const want = standingFrame(shapes, bodies, placed(paths.beau, paths.belle, i));
      const got = fromDials(valuesAt(track, i), 0, bodies[0]);
      expect(short((got.arms[1].raise - want[0].arms[1].raise) * R2D), `sample ${String(i)}`).toBeLessThan(0.2);
    }
    // Half a beat is no wait: the same join as none, the arch held through it.
    const h1 = defined(joinChain([{ bake, paths }, { bake, paths, wait: 0.5 }], shapes)[0], "the first call");
    expect(valuesAt(h1, n - 1)).toEqual(valuesAt(a, n - 1));
  });

  it("leaves the middle of each call as baked", () => {
    for (let i = K; i <= n - 1 - J; i++) expect(valuesAt(a, i)).toEqual(valuesAt(bake, i));
    for (let i = J; i <= n - 1 - K; i++) expect(valuesAt(b, i)).toEqual(valuesAt(bake, i));
  });

  it("passes a call with no bake through, and treats its boundary as the floor's standing couple", () => {
    const [none, twirl] = joinChain([{ bake: undefined, paths: undefined }, { bake, paths }], shapes, { iterations: 50 });
    expect(none).toBeUndefined();
    const v = valuesAt(defined(twirl, "the twirl"), 0);
    const want = standingFrame(shapes, bodies, placed(paths.beau, paths.belle, 0));
    expect(short((fromDials(v, 0, bodies[0]).arms[1].raise - want[0].arms[1].raise) * R2D)).toBeLessThan(0.2);
  });
});
