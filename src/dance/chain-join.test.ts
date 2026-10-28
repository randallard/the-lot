import { describe, expect, it } from "vitest";
import { getBodyShape } from "../services/body-shapes";
import { BAKED_TRACKS, chooseBake, REVIEW2_SIZING } from "./baked-tracks";
import { joinChain } from "./chain-join";
import { couplePaths } from "./engine-paths";
import { bodyOf, fromDials, type Body } from "./whole-move";
import { standingFrame } from "./whole-move-twirl";

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const ARM = /^[01]\.(upper-arm|forearm)-(left|right)\.(raise|toward|pitch|heading)$/;
const short = (d: number) => Math.abs(((d % 360) + 540) % 360 - 180);

describe("🧪 calls chain (step 4, 2026-10-27; square-one ADR-0026)", () => {
  const ryan = getBodyShape("ryan");
  const shapes = [ryan, ryan] as const;
  const bodies: [Body, Body] = [bodyOf(ryan), bodyOf(ryan)];
  const bake = chooseBake(BAKED_TRACKS, "california-twirl", shapes, { grow: "meet", draw: () => "reshape" })!;
  const paths = couplePaths("california-twirl", shapes, bake.sizing ?? REVIEW2_SIZING);
  const [a, b] = joinChain([{ bake, paths }, { bake, paths }], shapes);
  const n = bake.keyframes.length;
  const K = 10;

  it("hands one twirl to the next on the same pose, where the bakes alone snapped", () => {
    const end = a!.keyframes[n - 1]!.values;
    const start = b!.keyframes[0]!.values;
    let before = 0;
    for (const key of Object.keys(end).filter((k) => ARM.test(k))) {
      expect(short(end[key]! - start[key]!), key).toBeLessThan(0.2);
      before = Math.max(before, short(bake.keyframes[n - 1]!.values[key]! - bake.keyframes[0]!.values[key]!));
    }
    expect(before).toBeGreaterThan(90);
  });

  it("keeps the arch up through the join, with the arms at their own length (10-27)", () => {
    // Ryan: the beau's twirl arm went "a bit wonky". The hands dipped to the chest at the join,
    // and the arm that brought them back up was stretched and tangled.
    for (let i = n - 1 - K; i < n; i++) {
      const v = a!.keyframes[i]!.values;
      expect(v["0.upper-arm-right.raise"], `raise at ${String(i)}`).toBeGreaterThan(120);
      // No longer than the bake itself stretches them mid-call (33 / 37 cm here); the tangle had
      // them at 42 / 61.
      expect(v["0.upper-arm-right.length"], `upper arm at ${String(i)}`).toBeLessThan(35);
      expect(v["0.forearm-right.length"], `forearm at ${String(i)}`).toBeLessThan(40);
    }
  });

  it("starts and ends the sequence as the standing couple: waiting", () => {
    const path = (i: number) => [
      { x: paths.beau[i]!.x / 100, z: paths.beau[i]!.z / 100, yaw: paths.beau[i]!.facing * D2R, arms: [] },
      { x: paths.belle[i]!.x / 100, z: paths.belle[i]!.z / 100, yaw: paths.belle[i]!.facing * D2R, arms: [] },
    ] as never;
    for (const [track, i] of [[a!, 0], [b!, n - 1]] as const) {
      const want = standingFrame(shapes, bodies, path(i));
      const v = track.keyframes[i]!.values;
      for (const d of [0, 1] as const) {
        const got = fromDials(v, d, bodies[d]);
        for (const side of [0, 1] as const) for (const key of ["raise", "toward", "pitch", "heading"] as const) {
          expect(short((got.arms[side][key] - want[d].arms[side][key]) * R2D), `${String(d)} ${String(side)} ${key}`).toBeLessThan(0.2);
        }
      }
      expect(Math.hypot(v["0.offset.x"] ?? 0, v["0.offset.z"] ?? 0)).toBeLessThan(0.1);
    }
  });

  it("leaves the middle of each call as baked", () => {
    for (const t of [a!, b!]) for (let i = K; i <= n - 1 - K; i++) {
      expect(t.keyframes[i]!.values).toEqual(bake.keyframes[i]!.values);
    }
  });

  it("passes a call with no bake through, and treats its boundary as the floor's standing couple", () => {
    const [none, twirl] = joinChain([{ bake: undefined, paths: undefined }, { bake, paths }], shapes, { iterations: 50 });
    expect(none).toBeUndefined();
    const v = twirl!.keyframes[0]!.values;
    const want = standingFrame(shapes, bodies, [
      { x: paths.beau[0]!.x / 100, z: paths.beau[0]!.z / 100, yaw: paths.beau[0]!.facing * D2R, arms: [] as never },
      { x: paths.belle[0]!.x / 100, z: paths.belle[0]!.z / 100, yaw: paths.belle[0]!.facing * D2R, arms: [] as never },
    ] as never);
    expect(short((fromDials(v, 0, bodies[0]).arms[1].raise - want[0].arms[1].raise) * R2D)).toBeLessThan(0.2);
  });
});
