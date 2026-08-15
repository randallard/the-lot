import { describe, expect, it } from "vitest";
import {
  APPROACH_FRACTION,
  APPROACH_STEP,
  DEFAULT_MAX_TWIST_DEGREES,
  FACING_TOLERANCE,
  OPEN_TO_EVERYTHING,
  approachOf,
  approachTarget,
  availability,
  closestComfortable,
  offerReach,
  angleBetween,
  fistBumpMove,
  handFor,
  horizontalFraction,
  makeAnchor,
  makeConstraint,
  makeContactMove,
  metricsFor,
  resolveConstraint,
  resolveRole,
  restSign,
  squareUp,
  stancePlacements,
  sideFor,
  stanceHolds,
  totalSeconds,
  verticalHeight,
  type ComfortPreferences,
  type ContactMove,
  type RoleResolution,
  type RoleScratch,
} from "./contact-move";
import {
  armMetrics,
  armPose,
  gripHeight,
  upperArmStrain,
  type ArmMetrics,
  type Placement,
} from "./arm-pose";
import {
  bumpContact,
  bumpPose,
  contactFraction,
  envelopeWith,
  localPartner,
  facingYaw,
  maxSeparation,
  resolveContact,
  twistOf,
  SELF,
} from "./fist-bump";
import {
  MYCO_DEFAULTS,
  PLAYER_DEFAULTS,
  RYAN_DEFAULTS,
  SPROUT_DEFAULTS,
} from "../services/body-shapes";

// The two rigs that actually pair up in the world, at their real world heights.
const PLAYER_RIG_Y = 0.75;
const NPC_RIG_Y = 0;

function at(x: number, z: number, yaw = 0): Placement {
  return { x, z, yaw };
}

function scratch(): RoleScratch {
  return { local: at(0, 0), rest: armPose() };
}

function resolution(): RoleResolution {
  return { pose: armPose(), side: "right", contact: bumpContact() };
}

/** The height the built-in fist bump meets at — its `mean-elbow` rule, resolved. */
function meetAt(a: ArmMetrics, b: ArmMetrics) {
  return gripHeight(a, b);
}

/** Stand two characters facing each other, `frac` of the way to their reach limit. */
function facingPair(a: ArmMetrics, b: ArmMetrics, frac = 0.8) {
  const sep = maxSeparation(a, b, meetAt(a, b)) * frac;
  // A looks along +z toward B; B looks back along -z.
  return [at(0, 0, 0), at(0, sep, Math.PI)] as const;
}

/** A forearm span from the elbow — where a pose actually puts the hand (ADR-0017). */
function handOf(pose: ReturnType<typeof armPose>, m: ArmMetrics) {
  return {
    x: pose.x + pose.aimX * m.forearmSpan,
    y: pose.y + pose.aimY * m.forearmSpan,
    z: pose.z + pose.aimZ * m.forearmSpan,
  };
}

describe("the fist bump, authored", () => {
  const move = fistBumpMove();
  const c = move.constraints[0];

  it("wears closed hands on both sides", () => {
    expect(handFor(c, "A")).toBe("closed");
    expect(handFor(c, "B")).toBe("closed");
  });

  it("puts both right hands out — the handshake convention, not a mirror", () => {
    expect(sideFor(move, c, "A")).toBe("right");
    expect(sideFor(move, c, "B")).toBe("right");
  });

  it("declines rather than stretching", () => {
    expect(move.outOfRange).toBe("decline");
  });

  it("returns the arm rather than transferring it", () => {
    expect(move.exit).toBe("return");
  });

  it("carries classification tags, even though nothing reads them yet", () => {
    expect(move.tags.length).toBeGreaterThan(0);
  });

  it("keeps the hand-authored envelope", () => {
    expect(totalSeconds(move.envelope)).toBeCloseTo(0.9, 10);
  });
});

describe("the authored move and the hardcoded gesture agree", () => {
  // The property ADR-0016 turns on: the editor previews through the same resolver the
  // runtime plays through, so they cannot disagree. Asserted against `fist-bump.ts`'s own
  // path — resolveContact + bumpPose with reach-fraction and mean-elbow — which is what
  // the driver did before it was authored.
  const move = fistBumpMove();
  const c = move.constraints[0];
  const player = metricsFor(c, "A", PLAYER_DEFAULTS, 0, PLAYER_RIG_Y);
  const npc = metricsFor(c, "B", RYAN_DEFAULTS, 0.5, NPC_RIG_Y);

  it("produces the same pose the hardcoded bump did", () => {
    const [pa, pb] = facingPair(player, npc);

    const authored = resolveRole(
      resolution(), scratch(), move, c, "A", player, npc, pa, pb, 1, "right-positive",
    );

    const expected = armPose();
    const cc = resolveContact(bumpContact(), player, npc, SELF, localPartner(at(0, 0), pa, pb));
    // `"right-positive"` puts the anatomical right shoulder on +x, so `restSign` is +1
    // — the same shoulder `resolveRole` solved against, which is now part of the answer.
    bumpPose(expected, player, cc, cc.dirAX, cc.dirAZ, restSign("right-positive", "right"));

    expect(authored.pose.x).toBeCloseTo(expected.x, 12);
    expect(authored.pose.y).toBeCloseTo(expected.y, 12);
    expect(authored.pose.z).toBeCloseTo(expected.z, 12);
    expect(authored.pose.aimX).toBeCloseTo(expected.aimX, 12);
    expect(authored.pose.aimZ).toBeCloseTo(expected.aimZ, 12);
  });

  it("lands both fists at the same world height", () => {
    const [pa, pb] = facingPair(player, npc);
    const a = resolveRole(
      resolution(), scratch(), move, c, "A", player, npc, pa, pb, 1, "right-positive");
    const b = resolveRole(
      resolution(), scratch(), move, c, "B", npc, player, pb, pa, 1, "right-positive");
    // The **fists**, not the elbows: two elbows solved from two different shoulders have
    // no reason to share a height, and since ADR-0017 a pose names the elbow.
    expect(player.rigOriginY + handOf(a.pose, player).y).toBeCloseTo(
      npc.rigOriginY + handOf(b.pose, npc).y,
      10,
    );
  });

  it("sizes the fists as fists", () => {
    expect(player.handRadius).toBe(PLAYER_DEFAULTS.hand.closed.radius);
    expect(npc.handRadius).toBe(RYAN_DEFAULTS.hand.closed.radius);
  });

  it("is at rest when the envelope is at 0", () => {
    const [pa, pb] = facingPair(player, npc);
    const r = resolveRole(
      resolution(), scratch(), move, c, "A", player, npc, pa, pb, 0, "right-positive");
    expect(r.pose.aimY).toBeCloseTo(-1, 10);
  });
});

describe("rig handedness — which shoulder the arm goes back to", () => {
  // Geometry, not convention: a character at yaw 0 faces +z, and facing +z with +y up the
  // right hand is at -x (right = forward x up = z x y = -x). So `"left-positive"` is the
  // truth for every rig here, and `Dancer.tsx` places `arms.right` at `-forearmX`
  // accordingly.
  //
  // `Player.tsx` and `Npc.tsx` *name* their +x group "right", which is the character's
  // left arm — the same inversion `Eyes.tsx` has. That naming is baked into every authored
  // emote, so it is left alone and callers map around it instead.
  //
  // Getting the sign wrong is invisible in a contact assertion — the hands still meet at
  // exactly the right point — and shows up only as the wrong arm doing the move.
  const move = fistBumpMove();
  const c = move.constraints[0];
  const player = metricsFor(c, "A", PLAYER_DEFAULTS, 0, PLAYER_RIG_Y);
  const npc = metricsFor(c, "B", RYAN_DEFAULTS, 0.5, NPC_RIG_Y);

  it("maps sides to signs opposite ways round", () => {
    expect(restSign("right-positive", "right")).toBe(1);
    expect(restSign("right-positive", "left")).toBe(-1);
    expect(restSign("left-positive", "right")).toBe(-1);
    expect(restSign("left-positive", "left")).toBe(1);
  });

  it("rests the anatomical right arm on -x, which is what every rig here means", () => {
    const [pa, pb] = facingPair(player, npc);
    const r = resolveRole(
      resolution(), scratch(), move, c, "A", player, npc, pa, pb, 0, "left-positive");
    expect(r.side).toBe("right");
    expect(r.pose.x).toBeCloseTo(-player.restX, 10);
  });

  it("mirrors it for a rig that really did put the right arm on +x", () => {
    const [pa, pb] = facingPair(player, npc);
    const r = resolveRole(
      resolution(), scratch(), move, c, "A", player, npc, pa, pb, 0, "right-positive");
    expect(r.pose.x).toBeCloseTo(player.restX, 10);
  });

  // 🔴 **This used to assert the opposite, and the change is the point.** Under the
  // one-segment arm the whole pose was placed from the contact point, so the handedness
  // sign vanished from the answer at full extension — the two rigs produced the *same*
  // pose and only the group it was written to differed. That is what made "it was driving
  // the left arm" invisible to every assertion here. Since ADR-0017 the shoulder is an
  // input, so the sign is now visible in the pose itself, while the contact point — which
  // is a property of the pair, not of either arm — still does not move.
  it("moves the arm but not the contact point", () => {
    const [pa, pb] = facingPair(player, npc);
    const right = resolveRole(
      resolution(), scratch(), move, c, "A", player, npc, pa, pb, 1, "right-positive");
    const rx = right.pose.x;
    const rc = { x: right.contact.x, z: right.contact.z, height: right.contact.height };
    const left = resolveRole(
      resolution(), scratch(), move, c, "A", player, npc, pa, pb, 1, "left-positive");

    expect(left.contact.x).toBeCloseTo(rc.x, 12);
    expect(left.contact.z).toBeCloseTo(rc.z, 12);
    expect(left.contact.height).toBeCloseTo(rc.height, 12);
    expect(left.pose.x).not.toBeCloseTo(rx, 6);
  });

  it("still lands both hands on the contact point, whichever shoulder they came from", () => {
    const [pa, pb] = facingPair(player, npc);
    for (const rig of ["right-positive", "left-positive"] as const) {
      const r = resolveRole(
        resolution(), scratch(), move, c, "A", player, npc, pa, pb, 1, rig);
      const hand = handOf(r.pose, player);
      expect(Math.hypot(hand.x - r.contact.x, hand.z - r.contact.z)).toBeCloseTo(
        player.handRadius, 10);
      expect(upperArmStrain(r.pose, player, restSign(rig, r.side))).toBeCloseTo(0, 10);
    }
  });
});

describe("horizontal rules", () => {
  const big = armMetrics(RYAN_DEFAULTS);
  const small = armMetrics(SPROUT_DEFAULTS);

  it("reach-fraction makes the longer arm cover more of the gap", () => {
    const h = meetAt(big, small);
    const f = horizontalFraction("reach-fraction", big, small, h);
    expect(f).toBe(contactFraction(big, small, h));
    // `f` is the share measured from `big`, so a bigger reach means meeting further away.
    expect(f).toBeGreaterThan(0.5);
  });

  it("midpoint ignores the bodies", () => {
    expect(horizontalFraction("midpoint", big, small, meetAt(big, small))).toBe(0.5);
  });

  it("at-a and at-b are the ends", () => {
    const h = meetAt(big, small);
    expect(horizontalFraction("at-a", big, small, h)).toBe(0);
    expect(horizontalFraction("at-b", big, small, h)).toBe(1);
  });

  it("meets at the midpoint on the floor when told to", () => {
    const c = makeConstraint({ horizontal: "midpoint" });
    const out = resolveConstraint(bumpContact(), c, big, small, at(0, 0), at(0, 2));
    expect(out.z).toBeCloseTo(1, 10);
  });
});

describe("vertical rules resolve in world space", () => {
  const player = armMetrics(PLAYER_DEFAULTS, 0, PLAYER_RIG_Y);
  const npc = armMetrics(RYAN_DEFAULTS, 0.5, NPC_RIG_Y);

  it("mean-elbow is gripHeight", () => {
    expect(verticalHeight("mean-elbow", player, npc, 0)).toBe(gripHeight(player, npc));
  });

  it("mean-shoulder sits above mean-elbow", () => {
    // A forearm hangs from the shoulder, so shoulders are the higher pair of joints.
    expect(verticalHeight("mean-shoulder", player, npc, 0)).toBeGreaterThan(
      verticalHeight("mean-elbow", player, npc, 0),
    );
  });

  it("mean-shoulder averages both rigs' world shoulders", () => {
    const expected =
      (player.rigOriginY + player.restY + npc.rigOriginY + npc.restY) / 2;
    expect(verticalHeight("mean-shoulder", player, npc, 0)).toBeCloseTo(expected, 12);
  });

  it("absolute is taken literally", () => {
    expect(verticalHeight("absolute", player, npc, 1.37)).toBe(1.37);
  });

  it("every rule accounts for the rig offset", () => {
    const grounded = armMetrics(PLAYER_DEFAULTS, 0, 0);
    for (const rule of ["mean-elbow", "mean-shoulder"] as const) {
      const raised = verticalHeight(rule, player, npc, 0);
      const flat = verticalHeight(rule, grounded, npc, 0);
      expect(raised - flat).toBeCloseTo(PLAYER_RIG_Y / 2, 10);
    }
  });
});

describe("handedness", () => {
  const c = makeConstraint({
    anchors: [
      makeAnchor("A", { side: "right" }),
      makeAnchor("B", { side: "left" }),
    ] as const,
  });

  it("same-hand puts both on the constraint's side", () => {
    const m = makeContactMove("m", { handedness: "same-hand", constraints: [c] });
    expect(sideFor(m, c, "A")).toBe("right");
    expect(sideFor(m, c, "B")).toBe("right");
  });

  it("opposite-hand flips B", () => {
    const m = makeContactMove("m", { handedness: "opposite-hand", constraints: [c] });
    expect(sideFor(m, c, "A")).toBe("right");
    expect(sideFor(m, c, "B")).toBe("left");
  });

  it("independent lets each anchor speak for itself", () => {
    const m = makeContactMove("m", { handedness: "independent", constraints: [c] });
    expect(sideFor(m, c, "A")).toBe("right");
    expect(sideFor(m, c, "B")).toBe("left");
  });
});

describe("stance is the availability predicate", () => {
  const a = armMetrics(PLAYER_DEFAULTS, 0, PLAYER_RIG_Y);
  const b = armMetrics(RYAN_DEFAULTS, 0.5, NPC_RIG_Y);
  const reach = maxSeparation(a, b, meetAt(a, b));

  it("holds when they are close and facing", () => {
    const [pa, pb] = facingPair(a, b);
    expect(stanceHolds("facing-within-reach", a, b, pa, pb, meetAt(a, b))).toBeNull();
  });

  it("fails out of reach", () => {
    expect(
      stanceHolds("facing-within-reach", a, b, at(0, 0, 0), at(0, reach * 2, Math.PI), meetAt(a, b)),
    ).toBe("out-of-reach");
  });

  it("fails when one of them is facing away — both have to be looking", () => {
    // The first screenshot: close enough, pointed the wrong way.
    const sep = reach * 0.5;
    expect(stanceHolds("facing-within-reach", a, b, at(0, 0, Math.PI), at(0, sep, Math.PI), meetAt(a, b)))
      .toBe("not-facing");
    expect(stanceHolds("facing-within-reach", a, b, at(0, 0, 0), at(0, sep, 0), meetAt(a, b)))
      .toBe("not-facing");
  });

  it("tolerates being a little off", () => {
    const sep = reach * 0.5;
    const nudge = FACING_TOLERANCE * 0.5;
    expect(stanceHolds("facing-within-reach", a, b, at(0, 0, nudge), at(0, sep, Math.PI), meetAt(a, b)))
      .toBeNull();
  });

  it("side-by-side wants matching headings, not opposed ones", () => {
    const sep = reach * 0.5;
    expect(stanceHolds("side-by-side-within-reach", a, b, at(0, 0, 0), at(sep, 0, 0), meetAt(a, b)))
      .toBeNull();
    expect(stanceHolds("side-by-side-within-reach", a, b, at(0, 0, 0), at(sep, 0, Math.PI), meetAt(a, b)))
      .toBe("not-side-by-side");
  });

  it("angleBetween wraps", () => {
    expect(angleBetween(0.1, -0.1)).toBeCloseTo(0.2, 10);
    expect(angleBetween(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(0.2, 10);
  });
});

describe("staging a stance satisfies the stance", () => {
  // The editor stages a pair with `stancePlacements` and the game asks `stanceHolds`
  // whether to offer the move. If those two ever disagree, the editor previews a move
  // that will never be offered — so they are asserted against each other rather than
  // separately, which is the same reason both live in this module.
  const move = fistBumpMove();
  const c = move.constraints[0];
  const a = metricsFor(c, "A", PLAYER_DEFAULTS, 0, PLAYER_RIG_Y);
  const b = metricsFor(c, "B", RYAN_DEFAULTS, 0.5, NPC_RIG_Y);

  it("stages a facing pair the predicate accepts", () => {
    const sep = maxSeparation(a, b, meetAt(a, b)) * 0.75;
    const p = stancePlacements(move, sep);
    expect(stanceHolds("facing-within-reach", a, b, p.a, p.b, meetAt(a, b))).toBeNull();
    expect(availability(move, a, b, p.a, p.b).available).toBe(true);
  });

  it("stages a side-by-side pair the predicate accepts", () => {
    const hip = makeContactMove("hip bump", {
      ...move,
      stance: "side-by-side-within-reach",
    });
    const sep = maxSeparation(a, b, meetAt(a, b)) * 0.75;
    const p = stancePlacements(hip, sep);
    expect(stanceHolds("side-by-side-within-reach", a, b, p.a, p.b, meetAt(a, b))).toBeNull();
  });

  it("stages them the requested distance apart, centred on the origin", () => {
    const p = stancePlacements(move, 2);
    expect(Math.hypot(p.b.x - p.a.x, p.b.z - p.a.z)).toBeCloseTo(2, 10);
    expect(p.a.x + p.b.x).toBeCloseTo(0, 10);
    expect(p.a.z + p.b.z).toBeCloseTo(0, 10);
  });
});

describe("availability is geometry and consent", () => {
  const move = fistBumpMove();
  const c = move.constraints[0];
  const a = metricsFor(c, "A", PLAYER_DEFAULTS, 0, PLAYER_RIG_Y);
  const b = metricsFor(c, "B", RYAN_DEFAULTS, 0.5, NPC_RIG_Y);
  const reach = maxSeparation(a, b, meetAt(a, b));
  const near = facingPair(a, b, 0.5);
  const far = [at(0, 0, 0), at(0, reach * 3, Math.PI)] as const;

  it("offers the bump when they are close and facing", () => {
    const r = availability(move, a, b, near[0], near[1]);
    expect(r.available).toBe(true);
    expect(r.reason).toBeNull();
  });

  it("withholds it when out of reach, because this move declines", () => {
    const r = availability(move, a, b, far[0], far[1]);
    expect(r.available).toBe(false);
    expect(r.reason).toBe("out-of-reach");
    expect(r.separation).toBeCloseTo(reach * 3, 10);
  });

  it("offers a move that would rather stretch", () => {
    // Reach is a rule the move chooses, not a gate the model imposes — the lobbed fist
    // and the paddle live on this branch.
    const stretchy = makeContactMove("lob", { ...move, outOfRange: "reach", tags: [] });
    expect(availability(stretchy, a, b, far[0], far[1]).available).toBe(true);
  });

  it("withholds it from someone who has muted its tags", () => {
    const prefs: ComfortPreferences = { mutedTags: ["contact"], allowsTransfer: true };
    expect(availability(move, a, b, near[0], near[1], prefs).reason).toBe("muted-by-a");
    expect(availability(move, a, b, near[0], near[1], OPEN_TO_EVERYTHING, prefs).reason)
      .toBe("muted-by-b");
  });

  it("is open to everything by default", () => {
    expect(availability(move, a, b, near[0], near[1]).available).toBe(true);
  });

  it("needs both to consent before a part changes hands", () => {
    const lob = makeContactMove("lob", { ...move, exit: "transfer" });
    const no: ComfortPreferences = { mutedTags: [], allowsTransfer: false };
    expect(availability(lob, a, b, near[0], near[1]).available).toBe(true);
    expect(availability(lob, a, b, near[0], near[1], no).reason).toBe("transfer-not-consented");
    expect(availability(lob, a, b, near[0], near[1], OPEN_TO_EVERYTHING, no).reason)
      .toBe("transfer-not-consented");
  });

  it("checks consent before geometry — a muted move is never offered, near or far", () => {
    const prefs: ComfortPreferences = { mutedTags: ["greeting"], allowsTransfer: true };
    expect(availability(move, a, b, far[0], far[1], prefs).reason).toBe("muted-by-a");
  });
});

describe("authored envelopes", () => {
  it("respects durations other than the fist bump's", () => {
    const e = { extend: 1, hold: 2, withdraw: 1 };
    expect(envelopeWith(0.5, e.extend, e.hold, e.withdraw).t).toBeCloseTo(0.5, 1);
    expect(envelopeWith(2, e.extend, e.hold, e.withdraw).touching).toBe(true);
    expect(envelopeWith(4.1, e.extend, e.hold, e.withdraw).done).toBe(true);
  });

  it("writes the hold exactly, at any duration", () => {
    for (let s = 1; s < 3; s += 0.05) {
      expect(envelopeWith(s, 1, 2, 1).t).toBe(1);
    }
  });

  it("survives a zero-length phase — the editor's sliders reach 0", () => {
    expect(envelopeWith(0.1, 0, 1, 0.5).t).toBe(1);
    expect(envelopeWith(1.2, 0, 1, 0).done).toBe(true);
    expect(Number.isNaN(envelopeWith(0.5, 0, 0, 0).t)).toBe(false);
  });
});

describe("construction", () => {
  it("defaults a new move to something authorable", () => {
    const m = makeContactMove("new");
    expect(m.constraints).toHaveLength(1);
    expect(m.stance).toBe("facing-within-reach");
    expect(m.exit).toBe("return");
    expect(totalSeconds(m.envelope)).toBeGreaterThan(0);
  });

  it("gives every move and constraint a distinct id", () => {
    const ids = new Set([makeContactMove().id, makeContactMove().id, makeContactMove().id]);
    expect(ids.size).toBe(3);
  });

  it("defaults anchors to rigid and attached — detachment is opt-in", () => {
    expect(makeAnchor("A").attach).toBe("rigid");
  });

  it("measures metrics on the authored hand", () => {
    const c = makeConstraint({
      anchors: [
        makeAnchor("A", { hand: "closed" }),
        makeAnchor("B", { hand: "open" }),
      ] as const,
    });
    expect(metricsFor(c, "A", MYCO_DEFAULTS, 0.5, 0).handRadius)
      .toBe(MYCO_DEFAULTS.hand.closed.radius);
    expect(metricsFor(c, "B", MYCO_DEFAULTS, 0.5, 0).handRadius)
      .toBe(MYCO_DEFAULTS.hand.open.radius);
  });
});

describe("the approach — a move may bring the pair into position", () => {
  // ADR-0018. The split this rests on: the stance says what relation the move *needs*,
  // the approach says whether the move will *produce* it. Everything here is the pure
  // half — the driver eases toward an answer it did not compute itself.
  const move = fistBumpMove();
  const c = move.constraints[0];
  const a = metricsFor(c, "A", PLAYER_DEFAULTS, 0, PLAYER_RIG_Y);
  const b = metricsFor(c, "B", RYAN_DEFAULTS, 0.5, NPC_RIG_Y);
  const h = meetAt(a, b);
  const reach = maxSeparation(a, b, h);

  const RIG = "left-positive" as const;
  const maxTwist = (DEFAULT_MAX_TWIST_DEGREES * Math.PI) / 180;
  /** Reach once both are turned as far as the move allows — what staging is measured against. */
  const twistedReach = maxSeparation(a, b, h, maxTwist, maxTwist);

  function target(m: ContactMove, pa: Placement, pb: Placement) {
    return approachTarget(
      { a: at(0, 0), b: at(0, 0) }, m, a, b, pa, pb, h, RIG,
    );
  }

  const stepper = makeContactMove("stepper", { ...move, approach: "turn-and-step" });
  const turner = makeContactMove("turner", { ...move, approach: "turn" });
  const still = makeContactMove("still", { ...move, approach: "none" });

  it("ships on the built-in fist bump", () => {
    // The watch on 2026-08-15 said lining the pair up by hand was far too fussy, and this
    // is the answer to it. A default of "none" would leave the built-in exactly as it was.
    expect(approachOf(fistBumpMove())).toBe("turn-and-step");
  });

  it("defaults an absent field to none, so moves authored before this keep behaving", () => {
    const legacy = { ...move };
    delete (legacy as { approach?: unknown }).approach;
    expect(approachOf(legacy as ContactMove)).toBe("none");
  });

  it("turns both of them to face each other, whatever they were looking at", () => {
    // Close enough to reach squarely, so no twist is spent and facing is exact.
    const near = closestComfortable(a, b);
    const t = target(turner, at(0, 0, 2.5), at(0, near, -1.2));
    expect(t.a.yaw).toBeCloseTo(0, 10);           // partner at +z
    expect(t.b.yaw).toBeCloseTo(Math.PI, 10);     // partner at −z
  });

  it("turns them past facing when the distance asks for it, and no further", () => {
    // ADR-0019. The twist is a budget spent on reach, so it appears exactly when squaring
    // up would not get there — and is capped where the move says.
    const t = target(turner, at(0, 0, 0), at(0, twistedReach * 0.98, Math.PI));
    const offA = twistOf(t.a, t.b);
    const offB = twistOf(t.b, t.a);
    expect(offA).toBeGreaterThan(0.01);
    expect(offB).toBeGreaterThan(0.01);
    expect(offA).toBeLessThanOrEqual(maxTwist + 1e-9);
    expect(offB).toBeLessThanOrEqual(maxTwist + 1e-9);
  });

  it("leaves a close pair square-on — nobody turns sideways to bump a fist in their face", () => {
    const t = target(turner, at(0, 0, 0), at(0, closestComfortable(a, b), Math.PI));
    expect(twistOf(t.a, t.b)).toBeCloseTo(0, 9);
    expect(twistOf(t.b, t.a)).toBeCloseTo(0, 9);
  });

  it("turns the engaged shoulder toward the partner, not away", () => {
    // The whole point: the twist has to bring the bumping shoulder forward. Facing +z the
    // anatomical right shoulder is at −x, so it leads on a *positive* yaw offset.
    const t = target(turner, at(0, 0, 0), at(0, twistedReach * 0.98, Math.PI));
    const sign = restSign("left-positive", sideFor(move, c, "A"));
    // The shoulder's world z after the turn — positive means it moved toward the partner.
    const shoulderZ = -(sign * a.restX) * Math.sin(t.a.yaw);
    expect(shoulderZ).toBeGreaterThan(0);
  });

  it("twisting really does buy reach — the arithmetic behind the decision", () => {
    expect(twistedReach).toBeGreaterThan(maxSeparation(a, b, h));
    // And past the flat `handReach + handReach` limit that preceded ADR-0017, which is
    // what makes this a fix rather than a partial walk-back.
    expect(twistedReach).toBeGreaterThan(a.handReach + b.handReach);
  });

  it("turns on the short arc — a handshake is not a pirouette", () => {
    // Straddling ±π is where a naive average sends a character the long way round. The
    // target is an angle, so this asserts the *destination*; the driver's easing is what
    // makes the arc short, and `easePlacement` does that with the same atan2 trick.
    const t = target(turner, at(0, 0, 3.0), at(0, 1, 0));
    const delta = Math.abs(Math.atan2(Math.sin(t.a.yaw - 3.0), Math.cos(t.a.yaw - 3.0)));
    expect(delta).toBeLessThan(Math.PI);
  });

  it("leaves positions alone when it is only allowed to turn", () => {
    const pa = at(0, 0, 0);
    const pb = at(0, reach * 1.4, 0);
    const t = target(turner, pa, pb);
    expect(t.a.x).toBe(pa.x);
    expect(t.a.z).toBe(pa.z);
    expect(t.b.z).toBe(pb.z);
  });

  it("does nothing at all when the move does not approach", () => {
    const pa = at(0, 0, 2.5);
    const pb = at(0, reach * 1.4, 1.1);
    const t = target(still, pa, pb);
    expect(t.a).toEqual(pa);
    expect(t.b).toEqual(pb);
  });

  it("closes a gap that is too wide, to a comfortable fraction of reach", () => {
    const t = target(stepper, at(0, 0, 0), at(0, twistedReach * 1.3, Math.PI));
    const staged = Math.hypot(t.b.x - t.a.x, t.b.z - t.a.z);
    // Measured against the reach a full twist buys, because the turn is what pays for it.
    expect(staged).toBeCloseTo(twistedReach * APPROACH_FRACTION, 10);
    // And the staged pair satisfy the predicate they were staged for, which is the
    // property worth having: an approach that produced a stance the move would still
    // refuse is an approach that walks you somewhere useless.
    expect(stanceHolds("facing-within-reach", a, b, t.a, t.b, h)).toBeNull();
  });

  it("opens a gap that is too narrow, rather than leaving them overlapping", () => {
    const t = target(stepper, at(0, 0, 0), at(0, 0.05, Math.PI));
    const staged = Math.hypot(t.b.x - t.a.x, t.b.z - t.a.z);
    expect(staged).toBeCloseTo(closestComfortable(a, b), 10);
    expect(staged).toBeGreaterThan(0.05);
  });

  it("leaves a pair who are already standing well exactly where they are", () => {
    // The nudge nudges and otherwise keeps out of the way.
    const sep = (closestComfortable(a, b) + reach * APPROACH_FRACTION) / 2;
    const t = target(stepper, at(0, 0, 0), at(0, sep, Math.PI));
    expect(t.a.z).toBeCloseTo(0, 10);
    expect(t.b.z).toBeCloseTo(sep, 10);
  });

  it("splits the walk evenly — who reaches further is a different question", () => {
    // `contactFraction` already makes the longer arm cover more of the *reach*. Making it
    // also cover more of the *walk* would count the same asymmetry twice.
    const t = target(stepper, at(0, 0, 0), at(0, twistedReach * 1.3, Math.PI));
    const movedA = Math.hypot(t.a.x - 0, t.a.z - 0);
    const movedB = Math.hypot(t.b.x - 0, t.b.z - twistedReach * 1.3);
    expect(movedA).toBeCloseTo(movedB, 10);
  });

  it("keeps them on the line they were already on", () => {
    const pa = at(1, -2, 0);
    const pb = at(4, 2, 0);
    const t = target(stepper, pa, pb);
    // Cross product of the original axis with the staged one is zero if they are parallel.
    const cross = (pb.x - pa.x) * (t.b.z - t.a.z) - (pb.z - pa.z) * (t.b.x - t.a.x);
    expect(cross).toBeCloseTo(0, 9);
  });

  it("survives two characters standing in exactly the same spot", () => {
    const t = target(stepper, at(2, 2, 0.4), at(2, 2, 1.1));
    for (const v of [t.a.x, t.a.z, t.a.yaw, t.b.x, t.b.z, t.b.yaw]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    // No axis to face along, so nobody is spun on the spot on the strength of nothing.
    expect(t.a.yaw).toBe(0.4);
    expect(t.b.yaw).toBe(1.1);
  });

  it("gives a side-by-side move one shared heading", () => {
    const hip = makeContactMove("hip bump", {
      ...move, stance: "side-by-side-within-reach", approach: "turn",
    });
    const t = target(hip, at(0, 0, 0.2), at(0.5, 0, -0.2));
    expect(t.a.yaw).toBeCloseTo(t.b.yaw, 10);
    expect(stanceHolds("side-by-side-within-reach", a, b, t.a, t.b, meetAt(a, b))).toBeNull();
  });
});

describe("the approach widens the offer", () => {
  const move = fistBumpMove();
  const c = move.constraints[0];
  const a = metricsFor(c, "A", PLAYER_DEFAULTS, 0, PLAYER_RIG_Y);
  const b = metricsFor(c, "B", RYAN_DEFAULTS, 0.5, NPC_RIG_Y);
  const h = meetAt(a, b);
  const reach = maxSeparation(a, b, h);
  const still = makeContactMove("still", { ...move, approach: "none" });

  it("offers a stepping move from a step further out", () => {
    const maxTwist = (DEFAULT_MAX_TWIST_DEGREES * Math.PI) / 180;
    const twisted = maxSeparation(a, b, h, maxTwist, maxTwist);
    expect(offerReach(move, a, b, h)).toBeCloseTo(twisted * APPROACH_FRACTION + APPROACH_STEP, 10);
    // A move that turns nobody gets the square-on number — the twist is the approach's to
    // spend, so a move that does not approach cannot borrow against it.
    expect(offerReach(still, a, b, h)).toBeCloseTo(reach, 10);
    expect(offerReach(move, a, b, h)).toBeGreaterThan(offerReach(still, a, b, h));
  });

  it("never asks anyone to walk further than the step budget", () => {
    // The offer radius and the staged separation are one promise seen from two ends: at
    // the very edge of the offer, the gap closed is exactly `APPROACH_STEP` and each of
    // them covers half. Measuring it from the reach *limit* instead overshoots by the
    // comfortable margin, which is the version this used to have.
    const edge = offerReach(move, a, b, h);
    for (const sep of [edge, edge * 0.9, edge * 0.5, 0.02]) {
      const t = approachTarget({ a: at(0, 0), b: at(0, 0) }, move, a, b,
        at(0, 0, 0), at(0, sep, Math.PI), h, "left-positive");
      const movedA = Math.hypot(t.a.x, t.a.z);
      const movedB = Math.hypot(t.b.x, t.b.z - sep);
      expect(movedA + movedB).toBeLessThanOrEqual(APPROACH_STEP + 1e-9);
    }
  });

  it("offers it at a distance the same move would refuse standing still", () => {
    // The complaint this exists for: the pair had to be lined up by hand.
    const sep = reach + APPROACH_STEP * 0.5;
    const pa = at(0, 0, 0);
    const pb = at(0, sep, Math.PI);
    expect(availability(move, a, b, pa, pb).available).toBe(true);
    expect(availability(still, a, b, pa, pb).available).toBe(false);
  });

  it("still refuses beyond the step — a nudge is not a teleport", () => {
    const far = at(0, reach + APPROACH_STEP * 1.5, Math.PI);
    const r = availability(move, a, b, at(0, 0, 0), far);
    expect(r.available).toBe(false);
    expect(r.reason).toBe("out-of-reach");
  });

  it("stops caring which way they are facing, because it is about to fix that", () => {
    const sep = reach * 0.6;
    // Both facing away — the first screenshot's stance, and previously "face them".
    const pa = at(0, 0, Math.PI);
    const pb = at(0, sep, 0);
    expect(availability(move, a, b, pa, pb).available).toBe(true);
    expect(availability(still, a, b, pa, pb).reason).toBe("not-facing");
  });

  it("does not let an approach override consent", () => {
    // Geometry is what the approach relaxes. Consent is not geometry.
    const shy = { mutedTags: ["greeting"], allowsTransfer: true };
    const r = availability(move, a, b, at(0, 0, 0), at(0, reach * 0.5, Math.PI),
      OPEN_TO_EVERYTHING, shy);
    expect(r.available).toBe(false);
    expect(r.reason).toBe("muted-by-b");
  });
});

describe("squaring back up after the gesture", () => {
  // Both halves of what Ryan's watch caught on 2026-08-15: the driver held the twist to
  // its last frame and dropped it, so the NPC snapped square the moment its own `lookAt`
  // resumed and the player, having no such behaviour, was simply left turned. The twist is
  // spent to make the contact possible, so it comes back as the contact ends.
  const move = fistBumpMove();
  const c = move.constraints[0];
  const a = metricsFor(c, "A", PLAYER_DEFAULTS, 0, PLAYER_RIG_Y);
  const b = metricsFor(c, "B", RYAN_DEFAULTS, 0.5, NPC_RIG_Y);
  const h = meetAt(a, b);
  const maxTwist = (DEFAULT_MAX_TWIST_DEGREES * Math.PI) / 180;
  const reach = maxSeparation(a, b, h, maxTwist, maxTwist);

  /** The staged pair, then the same pair squared up — what the driver eases between. */
  function stagedAndSettled(sep: number) {
    const staged = approachTarget(
      { a: at(0, 0), b: at(0, 0) }, move, a, b,
      at(0, 0, 0), at(0, sep, Math.PI), h, "left-positive",
    );
    const settled = {
      a: { ...staged.a },
      b: { ...staged.b },
    };
    squareUp(settled, move, staged.a, staged.b);
    return { staged, settled };
  }

  it("takes the twist back out, leaving both squarely facing", () => {
    const { staged, settled } = stagedAndSettled(reach * 0.98);
    expect(twistOf(staged.a, staged.b)).toBeGreaterThan(0.01);
    expect(twistOf(settled.a, settled.b)).toBeCloseTo(0, 12);
    expect(twistOf(settled.b, settled.a)).toBeCloseTo(0, 12);
  });

  it("leaves them standing where the step put them — you square up, you do not walk back", () => {
    const { staged, settled } = stagedAndSettled(reach * 0.98);
    expect(settled.a.x).toBe(staged.a.x);
    expect(settled.a.z).toBe(staged.a.z);
    expect(settled.b.x).toBe(staged.b.x);
    expect(settled.b.z).toBe(staged.b.z);
  });

  it("is a no-op on a pair who were never twisted", () => {
    // A close-up bump spends no twist, so there is nothing to unwind and nothing moves.
    const { staged, settled } = stagedAndSettled(closestComfortable(a, b));
    expect(settled.a.yaw).toBeCloseTo(staged.a.yaw, 12);
    expect(settled.b.yaw).toBeCloseTo(staged.b.yaw, 12);
  });

  it("agrees with what an NPC's own look-at would do, so there is nothing left to snap", () => {
    // The NPC faces the player every frame it is hovered. If the driver let go anywhere
    // else, that is the snap — so the place it lets go has to be exactly here.
    const { settled } = stagedAndSettled(reach * 0.98);
    expect(settled.b.yaw).toBeCloseTo(facingYaw(settled.b, settled.a), 12);
  });

  it("gives a side-by-side move its shared heading back", () => {
    const hip = makeContactMove("hip bump", {
      ...move, stance: "side-by-side-within-reach", approach: "turn",
    });
    const staged = approachTarget(
      { a: at(0, 0), b: at(0, 0) }, hip, a, b,
      at(0, 0, 0.3), at(0.6, 0, -0.3), h, "left-positive",
    );
    const settled = { a: { ...staged.a }, b: { ...staged.b } };
    squareUp(settled, hip, staged.a, staged.b);
    expect(settled.a.yaw).toBeCloseTo(settled.b.yaw, 12);
    expect(stanceHolds("side-by-side-within-reach", a, b, settled.a, settled.b, h)).toBeNull();
  });
});
