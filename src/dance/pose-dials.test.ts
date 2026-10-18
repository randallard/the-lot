import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { CharacterBodyShape } from "../services/body-shapes";
import { EDGE_BLEND, WIDTH_KEY, applyToRigs, dialKey, ease, readRigs, sampleTrack } from "./pose-dials";

/** A stand-in for `Dancer`'s graph: the same names, the same nesting. */
function rig(x: number): THREE.Group {
  const g = new THREE.Group();
  g.name = "dancer";
  g.position.set(x, 0, 0);
  const torso = new THREE.Mesh();
  torso.name = "torso";
  g.add(torso);
  const head = new THREE.Group();
  const headMesh = new THREE.Mesh();
  headMesh.name = "head";
  head.add(headMesh);
  g.add(head);
  for (const [side, sx] of [["left", 0.2], ["right", -0.2]] as const) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx, 1.4, 0);
    const arm = new THREE.Group();
    arm.position.set(0, -0.3, 0);
    const fore = new THREE.Mesh();
    fore.name = `forearm-${side}`;
    fore.position.set(0, -0.15, 0);
    const hand = new THREE.Mesh();
    hand.name = `hand-${side}`;
    hand.position.set(0, -0.3, 0);
    arm.add(fore, hand);
    shoulder.add(arm);
    g.add(shoulder);
  }
  return g;
}

const shapes = [{ body: { height: 1 } }, { body: { height: 1 } }] as unknown as CharacterBodyShape[];

describe("dials written back onto the rig", () => {
  it("🔑 round-trips: what you dial is what the rig then reads — the L included", () => {
    const rigs = [rig(-0.5), rig(0.5)];
    const set = {
      [dialKey(0, "upper-arm-left", "raise")]: 90,
      [dialKey(0, "upper-arm-left", "toward")]: 90,
      [dialKey(0, "upper-arm-left", "length")]: 30,
      [dialKey(0, "forearm-left", "pitch")]: 0,
      [dialKey(0, "forearm-left", "heading")]: 0,
      [dialKey(0, "forearm-left", "length")]: 25,
      [dialKey(1, "head", "turn")]: 30,
      [dialKey(1, "torso", "lean-fwd")]: 10,
      [dialKey(1, "hand-right", "roll")]: 45,
    };
    applyToRigs(rigs, shapes, set);
    const got = readRigs(rigs, shapes);
    for (const [k, v] of Object.entries(set)) expect(got[k], k).toBeCloseTo(v, 0);
    // Upper arm straight out to the side, forearm level and forward: the elbow is a right angle.
    expect(got[dialKey(0, "forearm-left", "bend")]).toBeCloseTo(90, 0);
  });

  it("the right arm mirrors: 90° toward its own side is out to the right", () => {
    const rigs = [rig(0), rig(1)];
    applyToRigs(rigs, shapes, { [dialKey(0, "upper-arm-right", "raise")]: 90, [dialKey(0, "upper-arm-right", "toward")]: 90 });
    const elbow = rigs[0]!.getObjectByName("forearm-right")!.parent!;
    expect(elbow.position.x).toBeLessThan(-0.29);
  });

  it("couple width moves both dancers about their middle", () => {
    const rigs = [rig(-0.5), rig(0.5)];
    applyToRigs(rigs, shapes, { [WIDTH_KEY]: 160 });
    expect(rigs[0]!.position.x).toBeCloseTo(-0.8);
    expect(rigs[1]!.position.x).toBeCloseTo(0.8);
    expect(readRigs(rigs, shapes)[WIDTH_KEY]).toBeCloseTo(160);
  });

  it("writes only what it's given", () => {
    const rigs = [rig(-0.5), rig(0.5)];
    const before = readRigs(rigs, shapes);
    applyToRigs(rigs, shapes, { [dialKey(1, "head", "nod")]: 12 });
    const after = readRigs(rigs, shapes);
    for (const k of Object.keys(before)) if (k !== dialKey(1, "head", "nod")) expect(after[k], k).toBeCloseTo(before[k]!, 5);
  });
});

describe("playing keyframes", () => {
  const k = (t: number, values: Record<string, number>) => ({ t, values, setKeys: [] });
  const lean = dialKey(0, "torso", "lean-fwd");
  const facing = dialKey(0, "torso", "facing");
  const x = dialKey(0, "torso", "x");

  it("eases each value in and out between the keyframes either side", () => {
    const frames = [k(0.2, { [lean]: 0, [x]: 10 }), k(0.6, { [lean]: 20, [x]: 50 })];
    expect(sampleTrack(frames, 0.4)?.[lean]).toBeCloseTo(10);
    // A quarter of the way in time is less than a quarter of the way in pose: it's slow leaving.
    expect(sampleTrack(frames, 0.3)?.[x]).toBeCloseTo(10 + 40 * ease(0.25));
    expect(ease(0.25)).toBeLessThan(0.25);
    expect(sampleTrack(frames, 0.2)?.[lean]).toBe(0);
    expect(sampleTrack(frames, 0.6)?.[lean]).toBe(20);
  });

  it("🔑 blends from the solver into the first keyframe and back out after the last", () => {
    const frames = [k(0.3, { [lean]: 10 }), k(0.6, { [lean]: 20 })];
    const solver = { [lean]: 0 };
    expect(sampleTrack(frames, 0.3 - EDGE_BLEND / 2, solver)?.[lean]).toBeCloseTo(5);
    expect(sampleTrack(frames, 0.6 + EDGE_BLEND / 2, solver)?.[lean]).toBeCloseTo(10);
    expect(sampleTrack(frames, 0.3 - EDGE_BLEND - 0.01, solver)).toBeUndefined();
    expect(sampleTrack(frames, 0.6 + EDGE_BLEND + 0.01, solver)).toBeUndefined();
    // Continuous at the keyframe itself: no pop.
    expect(sampleTrack(frames, 0.3 - 1e-4, solver)?.[lean]).toBeCloseTo(10, 1);
  });

  it("leaves the solver alone outside the keyframes when there's no solver pose to blend from", () => {
    const frames = [k(0.2, { [lean]: 0 }), k(0.6, { [lean]: 20 })];
    expect(sampleTrack(frames, 0.15)).toBeUndefined();
    expect(sampleTrack(frames, 0.65)).toBeUndefined();
    expect(sampleTrack([], 0.5)).toBeUndefined();
    expect(sampleTrack([k(0.5, { [lean]: 3 })], 0.5)?.[lean]).toBe(3);
  });

  it("turns angles the short way round", () => {
    const frames = [k(0, { [facing]: 170 }), k(1, { [facing]: -170 })];
    expect(Math.abs(sampleTrack(frames, 0.5)![facing]!)).toBeCloseTo(180);
    const cm = [k(0, { [WIDTH_KEY]: 170 }), k(1, { [WIDTH_KEY]: -170 })];
    expect(sampleTrack(cm, 0.5)![WIDTH_KEY]).toBeCloseTo(0);
  });
});
