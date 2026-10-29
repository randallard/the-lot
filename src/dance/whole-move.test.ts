import { describe, expect, it } from "vitest";
import { computePositions, getBodyShape, NPC_BODY_CENTER_Y } from "../services/body-shapes";
import { armPoints, bodyOf, frameCost, frameCostGrad, fromDials, gripSlides, armThrough, growRoom, pack, tradeCost, PER, planOf, reachArm, restArm, segSeg, solve, targetsFromKeyframes, toDials, toFloor, toRig, unpackOne, WEIGHTS, wornBody, type Arm, type DancerFrame, type Frame, type Move, type Vec } from "./whole-move";
import { growBody, standingLift } from "./accommodation";

const near = (a: Vec, b: Vec, eps = 1e-9) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < eps;

describe("the whole-move forward model", () => {
  const shape = getBodyShape("ryan");
  const body = bodyOf(shape);
  const pos = computePositions(shape, NPC_BODY_CENTER_Y);

  it("puts a resting arm where Dancer.tsx draws it", () => {
    const p = armPoints(body, 0, restArm(body));
    expect(near(p.s, [pos.forearmX, pos.shoulderY, pos.shoulderZ])).toBe(true);
    expect(near(p.e, [pos.forearmX, pos.elbowY, pos.shoulderZ])).toBe(true);
    expect(near(p.h, [pos.forearmX, pos.handCenterY, pos.shoulderZ])).toBe(true);
    // The right arm is the mirror.
    expect(armPoints(body, 1, restArm(body)).h[0]).toBeCloseTo(-pos.forearmX);
  });

  it("measures segment distances, crossing and parallel", () => {
    expect(segSeg([0, 0, 0], [1, 0, 0], [0.5, 1, -1], [0.5, 1, 1])).toBeCloseTo(1);
    expect(segSeg([0, 0, 0], [1, 0, 0], [0, 0.3, 0], [1, 0.3, 0])).toBeCloseTo(0.3);
    expect(segSeg([0, 0, 0], [0, 0, 0], [2, 0, 0], [2, 0, 0])).toBeCloseTo(2);
  });

  it("goes to the floor frame and back", () => {
    const f: DancerFrame = { x: 0.4, z: -0.7, yaw: 2.1, arms: [restArm(body), restArm(body)] };
    const p: Vec = [0.3, 1.1, -0.2];
    expect(near(toRig(toFloor(p, f), f), p, 1e-12)).toBe(true);
    // Facing −z (yaw π): the rig's left (+x) is the floor's −x.
    expect(toFloor([1, 0, 0], { ...f, x: 0, z: 0, yaw: Math.PI })[0]).toBeCloseTo(-1);
  });

  it("reaches a target in range exactly, and stretches evenly for one out of range", () => {
    const f: DancerFrame = { x: 0, z: 0, yaw: Math.PI / 3, arms: [restArm(body), restArm(body)] };
    const s = toFloor(body.shoulder[1], f);
    const inReach: Vec = [s[0] + 0.2, s[1] + 0.3, s[2] - 0.1];
    const a = reachArm(body, 1, f, inReach, [0, -1, 0]);
    expect(near(toFloor(armPoints(body, 1, a).h, f), inReach, 1e-9)).toBe(true);
    expect(a.ulen).toBeCloseTo(body.upper0);
    const far: Vec = [s[0], s[1] + 1.2, s[2]];
    const b = reachArm(body, 1, f, far, [1, 0, 0]);
    expect(near(toFloor(armPoints(body, 1, b).h, f), far, 1e-9)).toBe(true);
    expect(b.ulen / body.upper0).toBeCloseTo(b.flen / body.fore0);
  });

  it("round-trips #review2's dials", () => {
    const f: DancerFrame = {
      x: 0.25, z: -0.5, yaw: -1.2,
      arms: [restArm(body), { raise: 2.6, toward: -1.1, ulen: 0.4, pitch: 0.7, heading: 0.3, flen: 0.38 }],
    };
    const back = fromDials(toDials(f, 1), 1, body);
    const p = armPoints(body, 1, back.arms[1]);
    const q = armPoints(body, 1, f.arms[1]);
    expect(near(p.h, q.h, 0.005)).toBe(true);
    expect(back.x).toBeCloseTo(0.25);
  });
});

describe("🧪 Ryan's keyframes steer the solve (2026-10-26)", () => {
  const body = bodyOf(getBodyShape("ryan"));
  const D2R = Math.PI / 180;

  it("takes only the dials he set, in solver units, split between the two nearest samples", () => {
    const { targets, unused } = targetsFromKeyframes(
      [{
        t: 0.50625, // a quarter of the way from sample 20 to 21 of 41 (20.25 / 40)
        values: { "1.upper-arm-left.raise": 150, "1.forearm-left.length": 40, "0.upper-arm-right.raise": 99, "1.torso.lean-fwd": 5 },
        setKeys: ["1.upper-arm-left.raise", "1.forearm-left.length", "1.torso.lean-fwd"],
      }],
      41,
    );
    // The beau's raise wasn't set, so it doesn't pull.
    expect(targets.some((g) => g.dancer === 0)).toBe(false);
    const raise = targets.filter((g) => g.key === "raise");
    expect(raise.map((g) => g.i)).toEqual([20, 21]);
    expect(raise[0]!.weight).toBeCloseTo(0.75);
    expect(raise[1]!.weight).toBeCloseTo(0.25);
    expect(raise[0]!.value).toBeCloseTo(150 * D2R);
    expect(raise[0]).toMatchObject({ dancer: 1, side: 0 });
    expect(targets.find((g) => g.key === "flen")!.value).toBeCloseTo(0.4);
    // The torso isn't a solver variable: reported, not dropped silently.
    expect(unused).toEqual(["1.torso.lean-fwd"]);
  });

  it("a keyframe on a sample pulls only that sample, and a locked one pulls harder", () => {
    const { targets } = targetsFromKeyframes(
      [{ t: 0.5, values: { "0.forearm-right.pitch": 30 }, setKeys: ["0.forearm-right.pitch"], weight: 10 }],
      41,
    );
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ i: 20, weight: 10, key: "pitch" });
  });

  it("bends the solve toward the dial, and smoothness carries it to the samples around it", () => {
    // Two dancers far apart, nothing held: alone, a free arm hangs at rest.
    const frame = (): Frame => [
      { x: -2, z: 0, yaw: 0, arms: [restArm(body), restArm(body)] },
      { x: 2, z: 0, yaw: 0, arms: [restArm(body), restArm(body)] },
    ];
    const base: Move = { bodies: [body, body], frames: Array.from({ length: 9 }, frame), holds: [] };
    const free = solve(base, { iterations: 300 }).frames;
    const { targets } = targetsFromKeyframes(
      [{ t: 0.5, values: { "0.upper-arm-left.raise": 90 }, setKeys: ["0.upper-arm-left.raise"] }],
      9,
    );
    const steered = solve({ ...base, targets }, { iterations: 300 }).frames;
    const raise = (fs: Frame[], i: number) => fs[i]![0].arms[0].raise / D2R;
    expect(raise(free, 4)).toBeLessThan(5);
    expect(raise(steered, 4)).toBeGreaterThan(60);
    // Smooth into and out of it: the samples beside it rise too, the ends least.
    expect(raise(steered, 3)).toBeGreaterThan(raise(steered, 0));
    expect(raise(steered, 3)).toBeLessThan(raise(steered, 4) + 1e-6);
  });
});

describe("🧪 the exact gradient (2026-10-26, step 2)", () => {
  const ryan = bodyOf(getBodyShape("ryan"));
  const myco = bodyOf(getBodyShape("myco"));
  // A seeded generator, so a failure repeats.
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const arm = (b: typeof ryan) => ({
    raise: rnd() * 3.4 - 0.2,
    toward: rnd() * 6 - 3,
    ulen: b.upper0 * (0.5 + rnd() * 0.9),
    pitch: rnd() * 3.6 - 1.8,
    heading: rnd() * 6 - 3,
    flen: b.fore0 * (0.5 + rnd() * 0.9),
  });

  it("is frameCost's cost and frameCost's gradient, with every term in play", () => {
    // Close enough that bodies, arms and heads overlap; a hold with a plane; a guide; targets.
    const frames: Frame[] = Array.from({ length: 5 }, (_, i) => [
      { x: -0.25 + 0.02 * i, z: 0.05, yaw: Math.PI / 2 + 0.3 * i, arms: [arm(ryan), arm(ryan)] },
      { x: 0.25, z: -0.03 * i, yaw: -Math.PI / 2 - 0.2 * i, arms: [arm(myco), arm(myco)] },
    ]);
    const m: Move = {
      bodies: [ryan, myco],
      frames,
      holds: [
        { from: 0, to: 0.6, beau: 1, belle: 0, plane: { p: [0, 0, 0.1], n: [0.6, 0, 0.8] } },
        { from: 0.4, to: 1, beau: 0, belle: 1 },
        // 🧪 A forearm grip (step 7, 10-28): ryan's hand at myco's elbow, myco's (the shorter forearm) sliding on his.
        { from: 0.2, to: 0.8, beau: 1, belle: 1, forearm: true, gripHeight: 1.1 },
      ],
      targets: [
        { i: 2, dancer: 0, side: 1, key: "raise", value: 2.6, weight: 1 },
        { i: 2, dancer: 1, side: 0, key: "flen", value: 0.3, weight: 0.5 },
        { i: 3, dancer: 1, side: 1, key: "heading", value: -3, weight: 2 },
      ],
      // 🧪 Both may change height (10-27); the belle's room is small, so some samples are past it.
      grow: [{ min: -0.3, max: 0.4, weight: 1 }, { min: -0.05, max: 0.02, weight: 2 }],
      trade: true,
      // 🧪 A floor for the held hands (10-27): high enough on some samples to bite.
      lift: [undefined, 2.2, 0.1, 2.4, 1.9],
    };
    const v = pack(frames);
    for (let i = 0; i < v.length; i += PER) {
      v[i + 24] = rnd() * 0.2 - 0.1;
      v[i + 25] = rnd() * 0.1 - 0.05;
      v[i + 26] = rnd() * 0.4 - 0.15;
      v[i + 27] = rnd() * 0.16 - 0.08;
    }
    const plans = planOf(m);
    const guide = { at: [0.05, 1.7, 0] as Vec, weight: 120 };
    let clipping = 0;
    for (let i = 0; i < frames.length; i++) {
      const base = frames[i]!;
      const g = new Float64Array(v.length);
      const c = frameCostGrad(m, plans[i]!, i, v, base, WEIGHTS, guide, g);
      expect(c).toBeCloseTo(frameCost(m, i, unpackOne(v, i, base), WEIGHTS, guide), 6);
      if (c > 50) clipping++;
      const h = 1e-6;
      for (let k = 0; k < PER; k++) {
        const j = i * PER + k;
        const x = v[j]!;
        v[j] = x + h;
        const up = frameCost(m, i, unpackOne(v, i, base), WEIGHTS, guide);
        v[j] = x - h;
        const dn = frameCost(m, i, unpackOne(v, i, base), WEIGHTS, guide);
        v[j] = x;
        const num = (up - dn) / (2 * h);
        expect(Math.abs(g[j]! - num)).toBeLessThan(1e-4 * Math.max(1, Math.abs(num)));
      }
      // Only its own sample's variables.
      for (let j = 0; j < v.length; j++) if (j < i * PER || j >= (i + 1) * PER) expect(g[j]).toBe(0);
    }
    // The poses really do clip, so the clearance terms were tested, not skipped.
    expect(clipping).toBeGreaterThan(2);
  });

  it("solves the same as the numerical gradient", () => {
    const frame = (): Frame => [
      { x: -0.35, z: 0, yaw: Math.PI / 2, arms: [restArm(ryan), restArm(ryan)] },
      { x: 0.35, z: 0, yaw: -Math.PI / 2, arms: [restArm(myco), restArm(myco)] },
    ];
    const m: Move = { bodies: [ryan, myco], frames: Array.from({ length: 7 }, frame), holds: [{ from: 0, to: 1, beau: 1, belle: 0 }] };
    const a = solve(m, { iterations: 200 });
    const b = solve(m, { iterations: 200, gradient: "numeric" });
    // Adam's steps are normalised, so tiny differences near the clearance kinks drift a little
    // mid-run (the cost is still falling at 200); every dial agrees within about a degree.
    let worst = 0;
    for (let i = 0; i < 7; i++) for (const d of [0, 1] as const) for (const s of [0, 1] as const)
      for (const k of ["raise", "toward", "ulen", "pitch", "heading", "flen"] as const)
        worst = Math.max(worst, Math.abs(a.frames[i]![d].arms[s][k] - b.frames[i]![d].arms[s][k]));
    expect(worst).toBeLessThan(0.02);
  });
});

describe("🧪 growing and shrinking (2026-10-27, step 3b)", () => {
  it("moves the body as the floor draws a reshape: feet planted, head and shoulders up", () => {
    for (const name of ["ryan", "myco", "ember", "sprout"]) {
      const shape = getBodyShape(name);
      for (const g of [-0.15, 0.25]) {
        const worn = wornBody(bodyOf(shape), g);
        const grown = growBody(shape, g);
        const want = bodyOf(grown);
        const lift = standingLift(shape, grown);
        const same = (a: Vec, b: Vec) => [0, 1, 2].forEach((k) => expect(a[k]! - (b[k]! + (k === 1 ? lift : 0))).toBeCloseTo(0, 9));
        same(worn.torso.a, want.torso.a);
        same(worn.torso.b, want.torso.b);
        same(worn.head.c, want.head.c);
        same(worn.shoulder[0], want.shoulder[0]);
        same(worn.shoulder[1], want.shoulder[1]);
        // The arms keep their lengths: only the shoulder moves.
        expect(want.upper0).toBeCloseTo(worn.upper0, 9);
      }
    }
  });

  it("gives each style its room: meet both ways in the editor's limits, duck the belle down only", () => {
    const ryan = bodyOf(getBodyShape("ryan"));
    const ember = bodyOf(getBodyShape("ember"));
    expect(growRoom("none", [ryan, ember])).toEqual({});
    const meet = growRoom("meet", [ryan, ember]);
    expect(meet.trade).toBe(true);
    expect(meet.grow?.[0].min).toBeCloseTo(0.1 - 0.3, 9);
    expect(meet.grow?.[1].max).toBeCloseTo(2 - 1.41, 9);
    const duck = growRoom("duck", [ryan, ember]);
    expect(duck.trade).toBeUndefined();
    expect([duck.grow?.[0].min, duck.grow?.[0].max, duck.grow?.[1].max]).toEqual([0, 0, 0]);
    expect(duck.grow?.[1].min).toBeCloseTo(0.1 - 1.41, 9);
  });

  it("meets in proportion, and lets one go on alone when the other is at a limit", () => {
    const room = [{ min: -0.2, max: 1.7, weight: 1 }, { min: -0.2, max: 1.7, weight: 1 }] as const;
    // 1.6 m and 1.2 m: growing 8 cm is matched by shrinking 6.
    expect(tradeCost(0.08, -0.06, 1.6, 1.2, room, 1000)[0]).toBeCloseTo(0, 9);
    expect(tradeCost(0.08, -0.03, 1.6, 1.2, room, 1000)[0]).toBeCloseTo(1000 * 0.025 ** 2, 9);
    // She's at her lowest: his growing on past her share is free, his growing less than it isn't.
    expect(tradeCost(0.4, -0.2, 1.6, 1.2, room, 1000)[0]).toBe(0);
    expect(tradeCost(0.1, -0.2, 1.6, 1.2, room, 1000)[0]).toBeGreaterThan(1);
  });

  it("round-trips a height change through the dials", () => {
    const ryan = bodyOf(getBodyShape("ryan"));
    const d = { x: 0.1, z: 0, yaw: 0, arms: [restArm(ryan), restArm(ryan)] as [Arm, Arm], grow: -0.123 };
    expect(fromDials(toDials(d, 1), 1, ryan).grow).toBeCloseTo(-0.123, 3);
    expect(toDials({ ...d, grow: 0 }, 1)["1.torso.grow"]).toBeUndefined();
  });
});

describe("🧪 a forearm grip between unequal forearms (10-28, 12)", () => {
  const sprout = bodyOf(getBodyShape("sprout"));
  const ember = bodyOf(getBodyShape("ember"));
  const hang = (b: typeof sprout) => [restArm(b), restArm(b)] as [Arm, Arm];
  const m: Move = {
    bodies: [sprout, ember],
    frames: [[{ x: 0, z: 0, yaw: 0, arms: hang(sprout) }, { x: 1, z: 0, yaw: Math.PI, arms: hang(ember) }]],
    holds: [{ from: 0, to: 1, beau: 0, belle: 0, forearm: true }],
  };

  it("slides the shorter forearm's hand, not the longer's", () => {
    expect(gripSlides(m, 0)).toBe(true); // sprout, 0.20
    expect(gripSlides(m, 1)).toBe(false); // ember, 0.605
    const even: Move = { ...m, bodies: [ember, ember] };
    expect(gripSlides(even, 0)).toBe(false);
    expect(gripSlides(even, 1)).toBe(false);
  });

  it("counts the shorter's hand held anywhere along the longer forearm", () => {
    // Only the hold weighted: sprout's hand on ember's forearm a third of the way along costs what
    // it costs two thirds along. Ember's own hand (at sprout's elbow) is the same in both.
    const f = m.frames[0]!;
    const { e, w } = armPoints(ember, 0, f[1].arms[0]);
    const elbow = toFloor(e, f[1]);
    const wrist = toFloor(w, f[1]);
    const on = (u: number): Vec => [elbow[0] + (wrist[0] - elbow[0]) * u, elbow[1] + (wrist[1] - elbow[1]) * u, elbow[2] + (wrist[2] - elbow[2]) * u];
    const s = toFloor(sprout.shoulder[0], f[0]);
    const holdOnly = { ...Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 0])), hold: WEIGHTS.hold, clasp: WEIGHTS.clasp } as typeof WEIGHTS;
    const cost = (mv: Move, u: number) => {
      const arm = armThrough(sprout, 0, f[0], [s[0], s[1] - 0.1, s[2]], on(u));
      return frameCost(mv, 0, [{ ...f[0], arms: [arm, f[0].arms[1]] }, f[1]], holdOnly);
    };
    expect(cost(m, 1 / 3)).toBeCloseTo(cost(m, 2 / 3), 9);
    // Held to the elbow (as if sprout's forearm were the longer), the two differ.
    const atElbow: Move = { ...m, bodies: [{ ...sprout, fore0: 1 }, ember] };
    expect(cost(atElbow, 2 / 3)).toBeGreaterThan(cost(atElbow, 1 / 3) + 1);
  });
});
