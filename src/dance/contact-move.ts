/**
 * Authored two-body moves: what an editor writes and the runtime plays.
 *
 * [ADR-0016](../../docs/adr/0016-contact-moves-are-authored-constraints-not-keyframes.md).
 * A contact move is **not** a keyframed pose. It is a list of constraints, each naming a
 * **part**, a **destination**, and **who owns the part on arrival**, resolved at play
 * time from the participants' body metrics.
 *
 * ## Why not keyframes, when the emote editor is keyframes
 *
 * `services/emotes` authors joint angles for one rig, and that is right for an emote: a
 * wave is a wave regardless of who waves. A *contact* move is the other thing. The
 * geometry it needs already exists here and is body-relative on purpose —
 * `contactFraction` splits the gap by reach so the longer-armed character covers more of
 * it, `gripHeight` picks a shared height from both bodies, `reachAllowance` is where "a
 * child cannot raise their arm to an adult's" will live. Author angles and every pairing
 * needs its own take, and the dancer-size brief's rule stops falling out of the geometry
 * and becomes a special case. Author constraints and a bump between a child and an adult
 * solves itself.
 *
 * ## The editor and the runtime call the same functions
 *
 * That is the property this module exists to guarantee, and the reason it is pure and
 * three.js-free like `arm-pose` and `fist-bump`. An editor that previews through its own
 * copy of the maths is an editor that lies, and a move authored against a lie is worse
 * than no editor.
 *
 * ## Detachment is authored, not prevented
 *
 * `arm-pose` says an arm "is not obliged to stay plausibly connected to a shoulder", and
 * that is an **affordance** rather than a compromise — these are avatars, and the arc
 * wants a fist lobbed across the floor and dancers trading heads. So reach is not a
 * validity gate. It is {@link OutOfRange}, which the move chooses. The wrong thing about
 * an arm floating in a gap is not that it left the body; it is that nothing *said* it
 * could, which makes a bug and a joke indistinguishable.
 *
 * {@link Anchor.attach} and {@link ContactExit} carry the rest of that idea. Neither
 * `"free"` nor `"transfer"` resolves yet — they are 🔴 **gated**, because a part that
 * ends up owned by someone else is the one case a receiver cannot decline by not
 * looking. They exist in the schema so the shape does not foreclose them.
 */

import {
  type ArmMetrics,
  type ArmPose,
  type Placement,
  armMetrics,
  gripHeight,
  restPose,
  blendPose,
} from "./arm-pose";
import type { CharacterBodyShape } from "../services/body-shapes";
import {
  type BumpContact,
  bumpPose,
  contactFraction,
  facingYaw,
  localPartner,
  maxSeparation,
  resolveContactAt,
  SELF,
} from "./fist-bump";

// ---------------------------------------------------------------------------
// Vocabulary

/**
 * A move is authored against roles, never against characters.
 *
 * Binding a move to "npc ryan" makes it unreusable and defeats the body-independence the
 * resolution rules exist for. A cast is applied at preview and at play time.
 *
 * Two today. The schema is a list of constraints between named roles, which is already
 * N-ready by shape — a star is four constraints meeting at one point, a wave is a chain —
 * so growing to four or eight needs no new kind of thing.
 */
export type RoleId = "A" | "B";
export const ROLE_IDS: readonly RoleId[] = ["A", "B"];

export type Side = "left" | "right";

/** A named point on a body a constraint can move. Derived from the body, never placed by hand. */
export type AnchorPart = "hand" | "elbow" | "shoulder";
export const ANCHOR_PARTS: readonly AnchorPart[] = ["hand", "elbow", "shoulder"];

/** Which of a body's two authored hand shapes the role wears for this move. */
export type HandPoseName = "open" | "closed";

/**
 * Whether the part stays on its arm chain.
 *
 * 🔴 `"free"` is gated and unimplemented — it is the lobbed fist. Resolving as `"rigid"`.
 */
export type Attachment = "rigid" | "free";

export interface Anchor {
  role: RoleId;
  side: Side;
  part: AnchorPart;
  hand: HandPoseName;
  attach: Attachment;
}

/**
 * The starting relation the move needs, named rather than given as coordinates.
 *
 * One authored fact doing two jobs: it places the editor's preview, and it is the
 * runtime **availability predicate** — what greys a wedge out instead of letting the
 * move stretch. That second job is why this is a relation and not a position.
 */
export type Stance = "facing-within-reach" | "side-by-side-within-reach";
export const STANCES: readonly Stance[] = ["facing-within-reach", "side-by-side-within-reach"];

/** Where along the axis between the pair the contact point sits. */
export type HorizontalRule = "reach-fraction" | "midpoint" | "at-a" | "at-b";
export const HORIZONTAL_RULES: readonly HorizontalRule[] = [
  "reach-fraction", "midpoint", "at-a", "at-b",
];

/** How high it sits. Resolves in **world** space; callers localise per character. */
export type VerticalRule = "mean-elbow" | "mean-shoulder" | "absolute";
export const VERTICAL_RULES: readonly VerticalRule[] = ["mean-elbow", "mean-shoulder", "absolute"];

/**
 * What the move does when the pair cannot reach.
 *
 * A rule the move chooses, not a validity gate the model imposes — see the header.
 * `"reach"` is the behaviour the unauthored fist bump had by accident.
 *
 * 🔴 `"lean"` is unimplemented and currently behaves as `"reach"`; it needs a body
 * channel this module does not own.
 */
export type OutOfRange = "decline" | "reach" | "lean" | "none";
export const OUT_OF_RANGE: readonly OutOfRange[] = ["decline", "reach", "lean", "none"];

/**
 * Which hand each role uses, stated physically.
 *
 * Deliberately not called "mirrored". Two characters *facing* each other bump both
 * **right** hands — the handshake convention — because facing reverses one frame, so the
 * word "mirrored" means the opposite thing depending on the stance. Naming the physical
 * fact instead removes the ambiguity.
 */
export type Handedness = "same-hand" | "opposite-hand" | "independent";
export const HANDEDNESS: readonly Handedness[] = ["same-hand", "opposite-hand", "independent"];

/**
 * Who owns the part when the move ends.
 *
 * 🔴 `"transfer"` is gated and unimplemented. See the header.
 */
export type ContactExit = "return" | "transfer";

export interface ContactConstraint {
  id: string;
  anchors: readonly [Anchor, Anchor];
  horizontal: HorizontalRule;
  vertical: VerticalRule;
  /** World Y, used only when `vertical` is `"absolute"`. */
  absoluteHeight: number;
}

/** Extend, hold, withdraw — in seconds, because a gesture answers to a thumb. */
export interface ContactEnvelope {
  extend: number;
  hold: number;
  withdraw: number;
}

export interface ContactMove {
  id: string;
  name: string;
  stance: Stance;
  handedness: Handedness;
  outOfRange: OutOfRange;
  exit: ContactExit;
  constraints: ContactConstraint[];
  envelope: ContactEnvelope;
  /**
   * Classification, in a reserved namespace of the same free-text tag list emotes use.
   *
   * Authored from day one with nothing reading them yet: retrofitting classification onto
   * existing authored content is the expensive part. See the planning brief
   * "opting out of the chaos".
   */
  tags: string[];
}

export function totalSeconds(e: ContactEnvelope): number {
  return e.extend + e.hold + e.withdraw;
}

// ---------------------------------------------------------------------------
// Comfort

/**
 * One participant's stance on what may be done *with* them.
 *
 * Not a rendering filter — that is a separate, later, receiver-side concern. This is the
 * participation half: a move nobody has consented to is never offered, so it is part of
 * {@link availability} rather than something applied afterwards. Threading it through
 * later would be expensive; one parameter now is not.
 */
export interface ComfortPreferences {
  /** A move carrying any of these tags is not offered to or by this character. */
  mutedTags: readonly string[];
  /** Whether this character accepts a move that ends with a part of them owned by someone else. */
  allowsTransfer: boolean;
}

export const OPEN_TO_EVERYTHING: ComfortPreferences = {
  mutedTags: [],
  allowsTransfer: true,
};

// ---------------------------------------------------------------------------
// Availability

export type UnavailableReason =
  | "out-of-reach"
  | "not-facing"
  | "not-side-by-side"
  | "muted-by-a"
  | "muted-by-b"
  | "transfer-not-consented";

export interface Availability {
  available: boolean;
  reason: UnavailableReason | null;
  /** Floor distance between the pair, so a caller can show "move closer". */
  separation: number;
}

/**
 * How far a character's heading may be off the line to their partner and still count as
 * facing them.
 *
 * Generous on purpose. A bump is a friendly gesture and refusing one because someone is
 * fifteen degrees off reads as the game being fussy; the screenshot this exists to
 * prevent had the two characters facing *away*, which is nowhere near this. A number to
 * watch and tune rather than one derived from anything.
 */
export const FACING_TOLERANCE = (75 * Math.PI) / 180;

/** Smallest absolute angle between two headings, in radians. */
export function angleBetween(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

/**
 * Whether the pair are standing the way this stance needs.
 *
 * `height` is the world contact height this move's vertical rule asks for, and reach is
 * judged **at it** rather than in the abstract: an arm spends part of itself getting up
 * or down to the contact, so how far apart two characters may stand depends on where
 * they are being asked to meet (ADR-0017). Passed in rather than derived here, because
 * the rule that produces it is authored per constraint and this function is deliberately
 * given the stance alone.
 */
export function stanceHolds(
  stance: Stance,
  a: ArmMetrics,
  b: ArmMetrics,
  pa: Placement,
  pb: Placement,
  height: number,
): UnavailableReason | null {
  const separation = Math.hypot(pb.x - pa.x, pb.z - pa.z);
  if (separation > maxSeparation(a, b, height)) return "out-of-reach";

  if (stance === "facing-within-reach") {
    // Each has to be looking roughly at the other, which is two checks and not one — a
    // character can be faced *by* their partner while looking elsewhere.
    const aToB = facingYaw(pa, pb);
    const bToA = facingYaw(pb, pa);
    if (angleBetween(pa.yaw, aToB) > FACING_TOLERANCE) return "not-facing";
    if (angleBetween(pb.yaw, bToA) > FACING_TOLERANCE) return "not-facing";
    return null;
  }

  // Side by side: same heading, shoulder to shoulder. The hip bump's stance.
  if (angleBetween(pa.yaw, pb.yaw) > FACING_TOLERANCE) return "not-side-by-side";
  return null;
}

/**
 * Whether this move is offered between these two, standing here.
 *
 * Geometry **and** consent, per ADR-0016: the predicate is stance ∧ both participants'
 * comfort. `outOfRange` other than `"decline"` means the move is happy to be performed
 * beyond reach, so a failed distance check does not withhold it.
 */
export function availability(
  move: ContactMove,
  a: ArmMetrics,
  b: ArmMetrics,
  pa: Placement,
  pb: Placement,
  prefsA: ComfortPreferences = OPEN_TO_EVERYTHING,
  prefsB: ComfortPreferences = OPEN_TO_EVERYTHING,
  out?: Availability,
): Availability {
  // Caller-owned result, because the wheel wants this answer every frame and the frame
  // loop allocates nothing — the same convention as the rest of the dance code.
  const r = out ?? { available: false, reason: null, separation: 0 };
  r.separation = Math.hypot(pb.x - pa.x, pb.z - pa.z);

  const muted = (p: ComfortPreferences) => move.tags.some((t) => p.mutedTags.includes(t));
  if (muted(prefsA)) return fail(r, "muted-by-a");
  if (muted(prefsB)) return fail(r, "muted-by-b");

  if (move.exit === "transfer" && !(prefsA.allowsTransfer && prefsB.allowsTransfer)) {
    return fail(r, "transfer-not-consented");
  }

  // Reach is judged at the height the move's own first constraint asks for. One
  // constraint is all anything authored uses today (see `resolveRole`), and a move whose
  // constraints disagreed about height would need a policy this schema has not been
  // asked for yet.
  const first = move.constraints[0];
  const height = first
    ? verticalHeight(first.vertical, a, b, first.absoluteHeight)
    : gripHeight(a, b);
  const failed = stanceHolds(move.stance, a, b, pa, pb, height);
  // A move that would rather stretch than decline is still offered out of reach — reach
  // is a rule the move chooses, not a gate the model imposes.
  if (failed && !(failed === "out-of-reach" && move.outOfRange !== "decline")) {
    return fail(r, failed);
  }

  r.available = true;
  r.reason = null;
  return r;
}

function fail(r: Availability, reason: UnavailableReason): Availability {
  r.available = false;
  r.reason = reason;
  return r;
}

/** A short phrase for an unavailable wedge — a visible reason beats a silent no-op. */
export function availabilityLabel(reason: UnavailableReason | null): string | null {
  switch (reason) {
    case null: return null;
    case "out-of-reach": return "too far away";
    case "not-facing": return "face them";
    case "not-side-by-side": return "stand alongside";
    case "muted-by-a": return "you turned this off";
    case "muted-by-b": return "they'd rather not";
    case "transfer-not-consented": return "needs both to agree";
  }
}

/**
 * Where this stance puts a pair standing `separation` apart, centred on the origin.
 *
 * The staging counterpart of {@link stanceHolds}: that function asks whether a pair
 * satisfies the stance, this one produces a pair that does. Lives here rather than in the
 * editor so the two can never drift — a preview that stages a stance the predicate would
 * reject is a preview of a move that will never be offered.
 */
export function stancePlacements(
  move: ContactMove,
  separation: number,
): { a: Placement; b: Placement } {
  if (move.stance === "side-by-side-within-reach") {
    // Shoulder to shoulder, both looking the same way.
    return { a: { x: -separation / 2, z: 0, yaw: 0 }, b: { x: separation / 2, z: 0, yaw: 0 } };
  }
  // Facing: A looks along +z at B, B looks back along -z.
  return { a: { x: 0, z: -separation / 2, yaw: 0 }, b: { x: 0, z: separation / 2, yaw: Math.PI } };
}

// ---------------------------------------------------------------------------
// Resolution

/**
 * `a`'s share of the gap under this rule — 0 at `a`, 1 at `b`.
 *
 * `height` is the contact height the vertical rule already resolved, which
 * `reach-fraction` needs because reach across the floor depends on how far the arm has
 * to climb or drop to get there. Resolved vertically first and horizontally second, in
 * that order, because the dependency only runs one way.
 */
export function horizontalFraction(
  rule: HorizontalRule,
  a: ArmMetrics,
  b: ArmMetrics,
  height: number,
): number {
  switch (rule) {
    case "reach-fraction": return contactFraction(a, b, height);
    case "midpoint":       return 0.5;
    case "at-a":           return 0;
    case "at-b":           return 1;
  }
}

/**
 * The contact height under this rule, in **world** space.
 *
 * World because the two characters' rigs sit at different world heights and a shared
 * height is meaningless in either one's local frame — the defect that put a fist bump's
 * two fists 0.75 apart. See `ArmMetrics.rigOriginY`.
 */
export function verticalHeight(
  rule: VerticalRule,
  a: ArmMetrics,
  b: ArmMetrics,
  absolute: number,
): number {
  switch (rule) {
    case "mean-elbow":    return gripHeight(a, b);
    case "mean-shoulder": return (a.rigOriginY + a.restY + b.rigOriginY + b.restY) / 2;
    case "absolute":      return absolute;
  }
}

/** Resolve one constraint's contact point. `pa`/`pb` and the result share a frame, except height. */
export function resolveConstraint(
  out: BumpContact,
  c: ContactConstraint,
  a: ArmMetrics,
  b: ArmMetrics,
  pa: Placement,
  pb: Placement,
): BumpContact {
  const height = verticalHeight(c.vertical, a, b, c.absoluteHeight);
  return resolveContactAt(out, a, b, pa, pb, horizontalFraction(c.horizontal, a, b, height), height);
}

/**
 * Which side this role engages.
 *
 * `same-hand` is the handshake convention — both roles use the side the constraint names,
 * which for two characters facing each other puts both right hands on the same side of
 * the axis and needs no lateral offset. `opposite-hand` flips B, which is what a
 * side-by-side hip bump wants. `independent` lets each anchor say for itself.
 */
export function sideFor(move: ContactMove, c: ContactConstraint, role: RoleId): Side {
  const own = c.anchors.find((x) => x.role === role) ?? c.anchors[0];
  switch (move.handedness) {
    case "independent":   return own.side;
    case "same-hand":     return c.anchors[0].side;
    case "opposite-hand": return role === "A" ? c.anchors[0].side : flip(c.anchors[0].side);
  }
}

function flip(s: Side): Side {
  return s === "left" ? "right" : "left";
}

/** The hand shape this role wears for this constraint. */
export function handFor(c: ContactConstraint, role: RoleId): HandPoseName {
  return (c.anchors.find((x) => x.role === role) ?? c.anchors[0]).hand;
}

/**
 * Measure one role's arm the way this constraint needs it.
 *
 * The authored hand shape has to reach `armMetrics`, because `handRadius` and `handReach`
 * are both measured on it — a fist bump solved with the open hand's radius separates the
 * fists by the wrong amount, which is exactly the bug the closed-hand selector uncovered.
 * Routed through here rather than left to each caller, since "remember to pass the hand
 * pose" is the kind of instruction that gets followed once.
 *
 * `rigOriginY` is the world Y of the character's group — see `ArmMetrics.rigOriginY`.
 */
export function metricsFor(
  c: ContactConstraint,
  role: RoleId,
  shape: CharacterBodyShape,
  bodyCenterY: number,
  rigOriginY: number,
): ArmMetrics {
  return armMetrics(shape, bodyCenterY, rigOriginY, handFor(c, role));
}

/**
 * Which anatomical side of a rig sits on `+x`.
 *
 * **Geometrically this is `"left-positive"` for every rig in this repo, and it is not a
 * matter of convention.** A character at `rotation.y === 0` faces `+z`
 * (`Player.tsx` sets `rotation.y = atan2(dir.x, dir.z)`), and facing `+z` with `+y` up,
 * the right hand is at `-x` — right = forward × up = ẑ × ŷ = −x̂. `Dancer.tsx` places
 * `arms.right` at `-forearmX` accordingly, and `poseArms`' "+x is the anatomical left
 * group" says the same.
 *
 * 🔴 **`Player.tsx` and `Npc.tsx` name their groups the other way round** — their
 * `rightArmRef` is at `+forearmX`, which is the character's *left* arm. So is
 * `Eyes.tsx`'s `rightEye`. The mislabelling is self-consistent across the game and
 * `CharacterPreview`, which means **every authored emote's "R arm" track already means the
 * `+x` arm**; renaming would mirror content that exists. It is left alone deliberately.
 *
 * The consequence for anything posing an *anatomical* side: pass `"left-positive"` and
 * then write the pose to the group those components call `left`. That is what
 * `FistBumpDriver`'s `drivenKey` and `World`'s ref wiring are for.
 */
export type RigHandedness = "right-positive" | "left-positive";

/** The `restX` multiplier that puts `side` on the correct shoulder of this rig. */
export function restSign(rig: RigHandedness, side: Side): number {
  const rightIsPositive = rig === "right-positive";
  return side === "right" ? (rightIsPositive ? 1 : -1) : rightIsPositive ? -1 : 1;
}

/** Everything one character needs to pose itself for one frame of a move. */
export interface RoleResolution {
  /** Rig-local pose for this role's engaged arm. */
  pose: ArmPose;
  /** Which arm the pose belongs on. */
  side: Side;
  /** The contact point, in this role's local frame — for overlays and assertions. */
  contact: BumpContact;
}

/** Caller-owned scratch, so the frame loop allocates nothing. */
export interface RoleScratch {
  local: Placement;
  rest: ArmPose;
}

/**
 * Pose one role's engaged arm for this frame, in that role's own rig-local space.
 *
 * `self`/`other` are the two characters' metrics and world placements; `blend` is the
 * envelope's `t`. The partner is localised and the contact resolved from `SELF`, which is
 * the trick `fist-bump` already uses: the geometry is frame-agnostic, so feeding it a
 * localised partner returns a rig-local answer, which is what the arm group wants.
 *
 * At `blend === 1` the contact pose is written **exactly**, never approached — easing
 * through a contact window is how this repo's last arm defect looked right and measured
 * wrong.
 */
export function resolveRole(
  out: RoleResolution,
  scratch: RoleScratch,
  move: ContactMove,
  c: ContactConstraint,
  role: RoleId,
  self: ArmMetrics,
  other: ArmMetrics,
  selfPlacement: Placement,
  otherPlacement: Placement,
  blend: number,
  rig: RigHandedness,
): RoleResolution {
  out.side = sideFor(move, c, role);

  localPartner(scratch.local, selfPlacement, otherPlacement);
  // `self` is always the `a` of the pair here, so `dirA*` points back at it.
  resolveConstraint(out.contact, c, self, other, SELF, scratch.local);

  // The same `sign` feeds both ends of the blend, which is what keeps the arm on one
  // shoulder for the whole envelope. `bumpPose` needs it under ADR-0017 because the
  // shoulder is now an input to the pose rather than a by-product of it.
  const sign = restSign(rig, out.side);
  restPose(scratch.rest, self, sign);
  bumpPose(out.pose, self, out.contact, out.contact.dirAX, out.contact.dirAZ, sign);
  blendPose(out.pose, scratch.rest, out.pose, blend);
  return out;
}

// ---------------------------------------------------------------------------
// Construction

let seq = 0;
function nextId(prefix: string): string {
  // `crypto.randomUUID` is what the emote and arm-action builders use; this module is
  // imported by tests in a jsdom environment where it exists, but the counter keeps ids
  // stable and readable for fixtures.
  seq += 1;
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeAnchor(role: RoleId, overrides: Partial<Anchor> = {}): Anchor {
  return {
    role,
    side: "right",
    part: "hand",
    hand: "open",
    attach: "rigid",
    ...overrides,
  };
}

export function makeConstraint(overrides: Partial<ContactConstraint> = {}): ContactConstraint {
  return {
    id: nextId("constraint"),
    anchors: [makeAnchor("A"), makeAnchor("B")] as const,
    horizontal: "reach-fraction",
    vertical: "mean-elbow",
    absoluteHeight: 1.2,
    ...overrides,
  };
}

export function makeContactMove(name = "", overrides: Partial<ContactMove> = {}): ContactMove {
  return {
    id: nextId("move"),
    name,
    stance: "facing-within-reach",
    handedness: "same-hand",
    outOfRange: "decline",
    exit: "return",
    constraints: [makeConstraint()],
    envelope: { extend: 0.25, hold: 0.35, withdraw: 0.3 },
    tags: [],
    ...overrides,
  };
}

/**
 * The fist bump, as authored data.
 *
 * This is the same gesture `fist-bump.ts`'s constants describe, expressed in the schema —
 * closed hands, right to right, meeting at the reach-weighted point at mean elbow height,
 * declining rather than stretching when out of reach. It ships built-in so the runtime
 * has something to play before anything has been authored, and so the editor has a
 * worked example to open.
 */
export function fistBumpMove(): ContactMove {
  return makeContactMove("fist bump", {
    id: "builtin-fist-bump",
    stance: "facing-within-reach",
    handedness: "same-hand",
    outOfRange: "decline",
    exit: "return",
    tags: ["greeting", "contact"],
    constraints: [
      makeConstraint({
        id: "builtin-fist-bump-hands",
        anchors: [
          makeAnchor("A", { side: "right", part: "hand", hand: "closed" }),
          makeAnchor("B", { side: "right", part: "hand", hand: "closed" }),
        ] as const,
        horizontal: "reach-fraction",
        vertical: "mean-elbow",
      }),
    ],
  });
}
