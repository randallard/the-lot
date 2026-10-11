import { describe as suite, expect, it } from "vitest";
import {
  RULES,
  SKIN,
  breaks,
  describe,
  measurePose,
  signedGap,
  violations,
  type ArmSolid,
  type DancerSolids,
  type Finding,
  type Hull,
  type PoseContext,
} from "./pose-rules";

/**
 * Synthetic dancers, on purpose. The checker is handed solids and has no opinion about how they
 * were posed, so the way to test it is to put a solid somewhere unambiguous and ask — not to
 * drive `poseArms` and discover which of the two is wrong.
 *
 * The figure: a torso capsule of radius 0.3 from y 0.3 to 1.0 (so it stands on y 0), a head of
 * radius 0.25 at y 1.5, shoulders at ±0.45 and y 1.2. Arms hang straight down beside the body.
 */
const BODY_R = 0.3;
const HEAD_R = 0.25;
const HEAD_Y = 1.5;
const SHOULDER_X = 0.45;
const SHOULDER_Y = 1.2;
const UPPER = 0.3;
const FORE = 0.3;
const HAND_R = 0.08;
const HAND_THIN = 0.02;

type P = { x: number; y: number; z: number };

/** An ellipsoid's corners — finely tessellated, so it stands in for the round thing. */
function ellipsoid(c: P, rx: number, ry: number, rz: number, n = 14): Hull {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * Math.PI;
    for (let j = 0; j < 2 * n; j++) {
      const th = (j / n) * Math.PI;
      pts.push(
        c.x + rx * Math.sin(phi) * Math.cos(th),
        c.y + ry * Math.cos(phi),
        c.z + rz * Math.sin(phi) * Math.sin(th),
      );
    }
  }
  return { points: pts };
}

const sphere = (c: P, r: number) => ellipsoid(c, r, r, r);

/** A vertical capsule: two spheres, which is all a convex hull needs of one. */
function capsule(x: number, y0: number, y1: number, r: number): Hull {
  return {
    points: [
      ...Array.from(sphere({ x, y: y0, z: 0 }, r).points),
      ...Array.from(sphere({ x, y: y1, z: 0 }, r).points),
    ],
  };
}

/** A forearm: a flat-ended cone from `a` (radius `ra`) to `b` (radius `rb`), `n` sides. */
function cone(a: P, b: P, ra = 0.06, rb = 0.03, n = 12): Hull {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const ax = dx / len, ay = dy / len, az = dz / len;
  // Two axes square to the cone's own.
  let ux = ay, uy = -ax, uz = 0;
  if (Math.hypot(ux, uy) < 1e-6) { ux = 1; uy = 0; uz = 0; }
  const un = Math.hypot(ux, uy, uz);
  ux /= un; uy /= un; uz /= un;
  const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
  const pts: number[] = [];
  for (const [c, r] of [[a, ra], [b, rb]] as const) {
    for (let k = 0; k < n; k++) {
      const t = (k / n) * 2 * Math.PI;
      pts.push(
        c.x + r * (ux * Math.cos(t) + vx * Math.sin(t)),
        c.y + r * (uy * Math.cos(t) + vy * Math.sin(t)),
        c.z + r * (uz * Math.cos(t) + vz * Math.sin(t)),
      );
    }
  }
  return { points: pts };
}

/** A hand whose palm faces along world z: wide in x and y, thin in z. */
const hand = (x: number, y: number, z: number) => ellipsoid({ x, y, z }, HAND_R, HAND_R, HAND_THIN);

/** An arm hanging from a shoulder at world `(sx, SHOULDER_Y, 0)`. */
function hanging(sx: number): ArmSolid {
  const elbowY = SHOULDER_Y - UPPER;
  const wristY = elbowY - FORE;
  const elbow = { x: sx, y: elbowY, z: 0 };
  return {
    shoulder: { x: sx, y: SHOULDER_Y, z: 0 },
    elbow,
    upperArm: UPPER,
    forearm: cone(elbow, { x: sx, y: wristY, z: 0 }),
    hand: hand(sx, wristY - 0.1, 0),
  };
}

/** A dancer standing at `x`, facing +z (yaw 0), so their left is world +x. */
function dancer(x: number, over: Partial<DancerSolids> = {}): DancerSolids {
  return {
    x,
    z: 0,
    yaw: 0,
    body: capsule(x, 0.3, 1.0, BODY_R),
    head: sphere({ x, y: HEAD_Y, z: 0 }, HEAD_R),
    left: hanging(x + SHOULDER_X),
    right: hanging(x - SHOULDER_X),
    ...over,
  };
}

const APART: PoseContext = { joined: [null, null], keepsContact: false, standY: [0, 0] };

/** An arm whose forearm runs from `elbow` to `wrist`, hand just past the wrist. */
function arm(shoulderX: number, elbow: P, wrist: P): ArmSolid {
  const dx = wrist.x - elbow.x, dy = wrist.y - elbow.y, dz = wrist.z - elbow.z;
  const n = Math.hypot(dx, dy, dz) || 1;
  return {
    shoulder: { x: shoulderX, y: SHOULDER_Y, z: 0 },
    elbow,
    upperArm: UPPER,
    forearm: cone(elbow, wrist),
    hand: hand(wrist.x + (dx / n) * 0.1, wrist.y + (dy / n) * 0.1, wrist.z + (dz / n) * 0.1),
  };
}

function only(findings: readonly Finding[], rule: string): Finding[] {
  return violations(findings).filter((f) => f.rule === rule);
}

suite("signedGap — how far apart two drawn solids are", () => {
  /** An axis-aligned box, by its eight corners. */
  function box(c: P, hx: number, hy: number, hz: number): Hull {
    const pts: number[] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      pts.push(c.x + sx * hx, c.y + sy * hy, c.z + sz * hz);
    }
    return { points: pts };
  }
  const O = { x: 0, y: 0, z: 0 };

  it("is the daylight between two boxes, face to face", () => {
    expect(signedGap(box(O, 1, 1, 1), box({ x: 2.5, y: 0, z: 0 }, 1, 1, 1))).toBeCloseTo(0.5, 6);
  });

  it("is the diagonal between two boxes, corner to corner", () => {
    // No face of either box is square to this gap; the direction has to be found.
    const g = signedGap(box(O, 1, 1, 1), box({ x: 3, y: 3, z: 3 }, 1, 1, 1));
    expect(g).toBeGreaterThan(Math.sqrt(3) - 0.002);
    expect(g).toBeLessThanOrEqual(Math.sqrt(3) + 1e-9);
  });

  it("goes negative by the overlap when one is inside the other", () => {
    expect(signedGap(box(O, 1, 1, 1), box({ x: 1.7, y: 0.2, z: -0.1 }, 1, 1, 1))).toBeCloseTo(-0.3, 6);
  });

  it("agrees with the round answer for two finely drawn spheres, either way", () => {
    const apart = signedGap(sphere(O, 0.5), sphere({ x: 0.6, y: 0.9, z: -0.4 }, 0.3));
    expect(apart).toBeCloseTo(Math.hypot(0.6, 0.9, 0.4) - 0.8, 2);
    const into = signedGap(sphere(O, 0.5), sphere({ x: 0.3, y: 0.4, z: 0 }, 0.3));
    expect(into).toBeCloseTo(0.5 - 0.8, 2);
  });

  it("never reports more daylight than there is", () => {
    // The search can miss the best direction and cannot beat it. Sweep a box round a sphere
    // and hold every answer to the true distance.
    const ball = sphere(O, 0.4);
    for (let k = 0; k < 40; k++) {
      const t = k * 0.37;
      const c = { x: 1.6 * Math.cos(t), y: 0.9 * Math.sin(2.3 * t), z: 1.6 * Math.sin(t) };
      const b = box(c, 0.2, 0.3, 0.1);
      // True distance from the origin to an axis-aligned box, less the ball.
      const d = Math.hypot(
        Math.max(Math.abs(c.x) - 0.2, 0),
        Math.max(Math.abs(c.y) - 0.3, 0),
        Math.max(Math.abs(c.z) - 0.1, 0),
      ) - 0.4;
      const g = signedGap(ball, b);
      expect(g).toBeLessThanOrEqual(d + 0.006); // the ball is a polyhedron, up to 5mm inside its sphere
      expect(g).toBeGreaterThan(d - 0.004);
    }
  });

  it("sees daylight beside a three-sided forearm that a round one would deny", () => {
    // The 2026-10-11 false alarm, in miniature. A head, and a forearm whose *nominal* radius
    // reaches into it — drawn with three sides, a flat towards the head, it does not.
    const headHull = sphere(O, 0.5);
    const a = { x: 0.56, y: -0.3, z: 0 };
    const b = { x: 0.56, y: 0.3, z: 0 };
    // Round: 0.56 − 0.1 − 0.5 = −0.04, a breach. Three sides with a flat facing −x sit at half
    // the radius: 0.56 − 0.05 − 0.5 = +0.01.
    const round = signedGap(headHull, cone(a, b, 0.1, 0.1, 24));
    const pts: number[] = [];
    for (const c of [a, b]) for (const deg of [0, 120, 240]) {
      const t = (deg * Math.PI) / 180;
      pts.push(c.x + 0.1 * Math.cos(t), c.y, c.z + 0.1 * Math.sin(t));
    }
    const three = signedGap(headHull, { points: pts });
    expect(round).toBeLessThan(-0.03);
    expect(three).toBeGreaterThan(0);
  });
});

suite("two dancers standing apart with their arms down", () => {
  const findings = measurePose([dancer(-1), dancer(1)], APART);

  it("break nothing", () => {
    expect(violations(findings)).toEqual([]);
  });

  it("and every rule but contact was actually asked", () => {
    // An empty list of violations from a checker that measured nothing proves nothing.
    const asked = new Set(findings.map((f) => f.rule));
    expect([...asked].sort()).toEqual([RULES.clip, RULES.feet, RULES.length, RULES.side].sort());
  });
});

suite("rule 1 — no arm through a head, a body or another arm", () => {
  it("catches a forearm through its owner's own head", () => {
    // The free arm raised inward past horizontal — worklist item 11, on every character.
    const a = dancer(-1, {
      left: arm(-1 + SHOULDER_X, { x: -1 + SHOULDER_X, y: HEAD_Y, z: 0 }, { x: -1.1, y: HEAD_Y, z: 0 }),
    });
    const hit = only(measurePose([a, dancer(1)], APART), RULES.clip);
    expect(hit.some((f) => f.who === 0 && f.what === "left forearm" && f.against === "own head")).toBe(true);
  });

  it("catches a hand inside the partner's body", () => {
    const reach = arm(-1 + SHOULDER_X, { x: 0.3, y: 0.7, z: 0 }, { x: 0.65, y: 0.7, z: 0 });
    const hit = only(measurePose([dancer(-1, { left: reach }), dancer(1)], APART), RULES.clip);
    expect(hit.some((f) => f.what === "left hand" && f.against === "partner body")).toBe(true);
  });

  it("catches two forearms crossing, once and not twice", () => {
    // Both dancers lay an inside forearm through the same point between them.
    const a = dancer(-1, { left: arm(-0.55, { x: -0.3, y: 1, z: -0.2 }, { x: 0.1, y: 1, z: 0.2 }) });
    const b = dancer(1, { right: arm(0.55, { x: 0.3, y: 1, z: -0.2 }, { x: -0.1, y: 1, z: 0.2 }) });
    const hit = only(measurePose([a, b], APART), RULES.clip).filter(
      (f) => f.what.endsWith("forearm") && f.against.endsWith("forearm"),
    );
    expect(hit).toHaveLength(1);
    expect(hit[0]).toMatchObject({ who: 0, what: "left forearm", against: "partner right forearm" });
  });

  it("catches an arm under the floor", () => {
    const sunk = arm(-1 + SHOULDER_X, { x: -0.55, y: 0.2, z: 0 }, { x: -0.55, y: -0.1, z: 0 });
    const hit = only(measurePose([dancer(-1, { left: sunk }), dancer(1)], APART), RULES.clip);
    expect(hit.some((f) => f.against === "floor")).toBe(true);
  });

  it("measures a hand by the way it is facing, not by its width", () => {
    // A palm 0.08 wide and 0.02 thick, 0.05 in front of a head's surface. Face-on it is clear;
    // the same centre with the palm turned edge-on is inside. A sphere of the hand's radius
    // would call both a breach.
    const c = { x: -1, y: HEAD_Y, z: HEAD_R + 0.05 };
    const flat = ellipsoid(c, HAND_R, HAND_R, HAND_THIN);
    const edge = ellipsoid(c, HAND_THIN, HAND_R, HAND_R);
    const up = (h: Hull) =>
      only(
        measurePose([dancer(-1, { left: { ...hanging(-1 + SHOULDER_X), hand: h } }), dancer(1)], APART),
        RULES.clip,
      ).filter((f) => f.what === "left hand" && f.against === "own head");
    expect(up(flat)).toEqual([]);
    expect(up(edge)).toHaveLength(1);
  });
});

suite("rule 2 — an arm stays on the side it started", () => {
  it("catches an elbow that has crossed its owner's midline", () => {
    // In front of the body, so it is the side rule speaking and not a clip.
    const crossed = arm(-1 + SHOULDER_X, { x: -1.2, y: 0.9, z: 0.6 }, { x: -1.4, y: 0.7, z: 0.6 });
    const hit = only(measurePose([dancer(-1, { left: crossed }), dancer(1)], APART), RULES.side);
    expect(hit.map((f) => f.what).sort()).toEqual(["left elbow", "left hand"]);
  });

  it("lets a hand come to the midline", () => {
    // Elbow out on its own side, hand directly above the head: part of it is still on its side.
    const over = arm(-1 + SHOULDER_X, { x: -0.7, y: 1.7, z: 0 }, { x: -0.95, y: 2.0, z: 0 });
    const findings = measurePose([dancer(-1, { left: over }), dancer(1)], APART);
    expect(only(findings, RULES.side)).toEqual([]);
  });

  it("is not asked of the arm raised in an arch — she turns under it", () => {
    // Ryan, 2026-10-11, of Ember in an L: "she's in an L with that arm so that's expected …
    // at times it will be across the midline."
    const crossed = arm(-1 + SHOULDER_X, { x: -1.2, y: 1.9, z: 0.1 }, { x: -1.5, y: 2.1, z: 0.1 });
    const pair: [DancerSolids, DancerSolids] = [dancer(-1, { left: crossed }), dancer(1)];
    expect(only(measurePose(pair, APART), RULES.side).length).toBeGreaterThan(0);
    const raised: PoseContext = { ...APART, raised: ["left", null] };
    expect(only(measurePose(pair, raised), RULES.side)).toEqual([]);
  });

  it("is asked in the dancer's own frame, so turning round does not flip it", () => {
    // Facing −z, a dancer's left is world −x. Their arms swap world sides and are still legal.
    const turned = dancer(-1, {
      yaw: Math.PI,
      left: hanging(-1 - SHOULDER_X),
      right: hanging(-1 + SHOULDER_X),
    });
    expect(only(measurePose([turned, dancer(1)], APART), RULES.side)).toEqual([]);
  });
});

suite("rule 3 — an arm keeps its length", () => {
  it("catches an elbow further from its shoulder than the upper arm is long", () => {
    const stretched = arm(-0.55, { x: -0.55, y: SHOULDER_Y - UPPER - 0.2, z: 0 }, { x: -0.55, y: 0.5, z: 0 });
    const hit = only(measurePose([dancer(-1, { left: stretched }), dancer(1)], APART), RULES.length);
    expect(hit).toHaveLength(1);
    expect(hit[0]!.margin).toBeCloseTo(-0.2, 6);
  });

  it("does not mind a bent arm", () => {
    const bent = arm(-0.55, { x: -0.55, y: SHOULDER_Y - 0.1, z: 0.1 }, { x: -0.55, y: 0.8, z: 0.2 });
    expect(only(measurePose([dancer(-1, { left: bent }), dancer(1)], APART), RULES.length)).toEqual([]);
  });
});

suite("rule 4 — feet stay on the floor", () => {
  it("catches a dancer who sank, and one who lifted", () => {
    const sank = dancer(-1, { body: capsule(-1, 0.1, 0.8, BODY_R) });
    const rose = dancer(1, { body: capsule(1, 0.5, 1.2, BODY_R) });
    const hit = only(measurePose([sank, rose], APART), RULES.feet);
    expect(hit.map((f) => f.who).sort()).toEqual([0, 1]);
  });

  it("does not mind a duck — a shorter torso on the same floor", () => {
    const ducked = dancer(-1, { body: capsule(-1, 0.3, 0.6, BODY_R) });
    expect(only(measurePose([ducked, dancer(1)], APART), RULES.feet)).toEqual([]);
  });
});

suite("rule 5 — joined hands touch, where the style keeps contact", () => {
  // Dancer 0's left and dancer 1's right, raised between them and `gap` apart palm to palm.
  function joinedAt(gap: number): [DancerSolids, DancerSolids] {
    const y = 1.9;
    const a = arm(-0.55, { x: -0.45, y: 1.45, z: 0 }, { x: -0.1, y: y - 0.05, z: 0 });
    const b = arm(0.55, { x: 0.45, y: 1.45, z: 0 }, { x: 0.1, y: y - 0.05, z: 0 });
    return [
      dancer(-1, { left: { ...a, hand: hand(0, y, -(HAND_THIN + gap / 2)) } }),
      dancer(1, { right: { ...b, hand: hand(0, y, HAND_THIN + gap / 2) } }),
    ];
  }
  const held: PoseContext = { joined: ["left", "right"], keepsContact: true, standY: [0, 0] };

  it("passes two palms laid together", () => {
    const pair = joinedAt(0);
    expect(signedGap(pair[0].left.hand, pair[1].right.hand)).toBeCloseTo(0, 3);
    expect(violations(measurePose(pair, held))).toEqual([]);
  });

  it("catches a hold that has come apart", () => {
    const hit = only(measurePose(joinedAt(0.2), held), RULES.contact);
    expect(hit).toHaveLength(1);
    expect(hit[0]!.margin).toBeCloseTo(-0.2, 3);
  });

  it("does not ask it of a style that breaks the hold", () => {
    const broke = { ...held, keepsContact: false };
    expect(only(measurePose(joinedAt(0.2), broke), RULES.contact)).toEqual([]);
  });

  it("excuses the two joined hands from clipping each other, and only those", () => {
    // Pressed 0.03 into each other: a hold, not a collision.
    const pressed = joinedAt(-0.03);
    expect(only(measurePose(pressed, held), RULES.clip)).toEqual([]);
    // The same two hands with nobody holding are just two hands in one place.
    const hit = only(measurePose(pressed, APART), RULES.clip);
    expect(hit.some((f) => f.what === "left hand" && f.against === "partner right hand")).toBe(true);
  });
});

suite("reporting", () => {
  it("lets a breach inside the skin through, and nothing deeper", () => {
    const f = (margin: number): Finding => ({ rule: RULES.clip, who: 0, what: "a", against: "b", margin });
    expect(breaks(f(-SKIN / 2))).toBe(false);
    expect(breaks(f(-SKIN * 2))).toBe(true);
  });

  it("sorts the worst first and names it in a sentence", () => {
    const a = dancer(-1, {
      left: arm(-1 + SHOULDER_X, { x: -1 + SHOULDER_X, y: HEAD_Y, z: 0 }, { x: -1.1, y: HEAD_Y, z: 0 }),
    });
    const v = violations(measurePose([a, dancer(1)], APART));
    expect(v.length).toBeGreaterThan(0);
    for (let i = 1; i < v.length; i++) expect(v[i]!.margin).toBeGreaterThanOrEqual(v[i - 1]!.margin);
    expect(describe(v[0]!, ["Myco", "Ember"])).toMatch(/^Myco's left (forearm|hand) is \d\.\d{3} into own head$/);
  });
});
