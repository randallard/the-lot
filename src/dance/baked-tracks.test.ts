import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { getBodyShape } from "../services/body-shapes";
import {
  applyBaked,
  BAKE_FORMAT,
  BAKED_TRACKS,
  bodyPrint,
  findBake,
  gapOff,
  bakeFits,
  GAP_KEY,
  GAP_TOLERANCE_CM,
  relativeKeyframes,
  sampleBaked,
  spanAt,
  stepToCouple,
  stepToDancer,
  type BakedTrack,
} from "./baked-tracks";

const D2R = Math.PI / 180;

const track = (call: string, bodies: [string, string], ks: BakedTrack["keyframes"]): BakedTrack => ({
  format: BAKE_FORMAT,
  version: 1,
  call,
  pairing: "x-y",
  bodies,
  note: "test",
  keyframes: ks,
});

describe("baked tracks", () => {
  it("a step into a dancer's frame and back is the same step, at any facing", () => {
    for (const yaw of [-3, -1.2, 0, 0.4, Math.PI / 2, 2.9]) {
      const [lx, lz] = stepToDancer(0.3, -0.7, yaw);
      const [x, z] = stepToCouple(lx, lz, yaw);
      expect(x).toBeCloseTo(0.3, 9);
      expect(z).toBeCloseTo(-0.7, 9);
    }
  });

  it("toCouple is what three.js does to a child of a rig turned by yaw", () => {
    const yaw = 0.83;
    const v = new THREE.Vector3(0.2, 0, 0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const [x, z] = stepToCouple(0.2, 0.5, yaw);
    expect(x).toBeCloseTo(v.x, 9);
    expect(z).toBeCloseTo(v.z, 9);
  });

  it("samples linearly between keyframes, not eased, and holds past either end", () => {
    const k = track("c", ["a", "b"], [
      { t: 0.2, values: { "0.forearm-left.length": 10 } },
      { t: 0.6, values: { "0.forearm-left.length": 30 } },
    ]);
    expect(sampleBaked(k, 0.3)["0.forearm-left.length"]).toBeCloseTo(15, 9);
    expect(sampleBaked(k, 0.5)["0.forearm-left.length"]).toBeCloseTo(25, 9);
    expect(sampleBaked(k, 0)["0.forearm-left.length"]).toBe(10);
    expect(sampleBaked(k, 1)["0.forearm-left.length"]).toBe(30);
  });

  it("angles take the short way round", () => {
    const k = track("c", ["a", "b"], [
      { t: 0, values: { "0.forearm-left.heading": 170 } },
      { t: 1, values: { "0.forearm-left.heading": -170 } },
    ]);
    expect(sampleBaked(k, 0.5)["0.forearm-left.heading"]).toBeCloseTo(180, 9);
  });

  it("finds a call's span by beat; a boundary belongs to the call starting there", () => {
    const spans = [
      { call: "a", startBeat: 0, beats: 4 },
      { call: "b", startBeat: 4, beats: 2 },
    ];
    expect(spanAt(spans, 0)?.index).toBe(0);
    expect(spanAt(spans, 3.99)?.index).toBe(0);
    expect(spanAt(spans, 4)?.index).toBe(1);
    expect(spanAt(spans, 9)?.index).toBe(1);
    expect(spanAt([], 1)).toBeUndefined();
  });

  it("a body's print follows its geometry, not its colour", () => {
    const ryan = getBodyShape("ryan");
    expect(bodyPrint({ ...ryan, bodyColor: "#000000" })).toBe(bodyPrint(ryan));
    expect(bodyPrint({ ...ryan, head: { ...ryan.head, radius: ryan.head.radius + 0.01 } })).not.toBe(bodyPrint(ryan));
    expect(bodyPrint(getBodyShape("myco"))).not.toBe(bodyPrint(ryan));
  });

  it("matches on the call and both bodies, beau first", () => {
    const ryan = getBodyShape("ryan");
    const myco = getBodyShape("myco");
    const k = track("california-twirl", [bodyPrint(ryan), bodyPrint(myco)], [{ t: 0, values: {} }]);
    expect(findBake([k], "california-twirl", [ryan, myco])).toBe(k);
    expect(findBake([k], "california-twirl", [myco, ryan])).toBeUndefined();
    expect(findBake([k], "partner-trade", [ryan, myco])).toBeUndefined();
    expect(findBake([k], "california-twirl", [ryan])).toBeUndefined();
  });

  it("turns an absolute keyframe into arms plus a step in each dancer's own frame", () => {
    // The beau faces −x (yaw −90°) and stands 10 cm further along −x than the engine put him:
    // that's 10 cm straight ahead for him. The belle is on her path.
    const paths = [
      [{ x: -50, z: 0, facing: -90 }, { x: -50, z: 0, facing: -90 }],
      [{ x: 50, z: 0, facing: 90 }, { x: 50, z: 0, facing: 90 }],
    ] as const;
    const [k] = relativeKeyframes(
      [{ t: 0.5, values: { "0.torso.x": -60, "0.torso.z": 0, "0.torso.facing": -90, "1.torso.x": 50, "1.torso.z": 0, "0.forearm-left.pitch": -40 } }],
      paths,
    );
    expect(k!.values["0.torso.x"]).toBeUndefined();
    expect(k!.values["0.torso.facing"]).toBeUndefined();
    expect(k!.values["0.forearm-left.pitch"]).toBe(-40);
    expect(k!.values["0.offset.x"]).toBeCloseTo(0, 6);
    expect(k!.values["0.offset.z"]).toBeCloseTo(10, 6);
    expect(k!.values["1.offset.x"]).toBeCloseTo(0, 6);
    expect(k!.values["1.offset.z"]).toBeCloseTo(0, 6);
    // The engine had them 100 cm apart: that's the gap the arms were solved across.
    expect(k!.values[GAP_KEY]).toBeCloseTo(100, 6);
  });

  it("measures how far the live engine's spacing is from the solve's, before the bake's step", () => {
    const a = new THREE.Group();
    const b = new THREE.Group();
    a.position.set(0, 0, -0.91);
    expect(gapOff([a, b], { [GAP_KEY]: 91 })).toBeCloseTo(0, 6);
    a.position.set(0, 0, -1.71);
    // Review 1's own arch sizing, 10-26: 80 cm wider, and the hands missed.
    expect(gapOff([a, b], { [GAP_KEY]: 91 })).toBeCloseTo(80, 6);
    expect(bakeFits(gapOff([a, b], { [GAP_KEY]: 91 }))).toBe(false);
    expect(bakeFits(GAP_TOLERANCE_CM)).toBe(true);
    // A bake with no gap recorded isn't guarded.
    expect(gapOff([a, b], {})).toBe(0);
  });

  it("applies the step on top of where the engine put the dancer, in his own frame", () => {
    const rig = new THREE.Group();
    rig.position.set(1, 0, 2);
    rig.rotation.y = -90 * D2R;
    applyBaked([rig], [getBodyShape("ryan")], { "0.offset.x": 0, "0.offset.z": 10 });
    // 10 cm ahead of a dancer facing −x.
    expect(rig.position.x).toBeCloseTo(0.9, 9);
    expect(rig.position.z).toBeCloseTo(2, 9);
  });

  it("ships the ryan → ryan twirl, and it matches today's ryan", () => {
    const ryan = getBodyShape("ryan");
    const k = findBake(BAKED_TRACKS, "california-twirl", [ryan, ryan]);
    expect(k).toBeDefined();
    expect(k!.keyframes.length).toBe(41);
    expect(k!.keyframes[0]!.t).toBe(0);
    expect(k!.keyframes[k!.keyframes.length - 1]!.t).toBe(1);
    // It says how its figure was sized, and the gap at every keyframe.
    expect(k!.sizing).toEqual({ accommodation: "reshape", overhead: 0, close: 0 });
    expect(k!.keyframes.every((f) => f.values[GAP_KEY] !== undefined)).toBe(true);
  });
});
