/**
 * A square on the floor, driven by square-one.
 *
 * This is M4's driver: it advances the engine's stepper each frame, maps every
 * dancer's engine pose through the {@link DanceFrame}, and writes the result onto
 * the dancer rigs.
 *
 * **The blend contract ([ADR-0010](../../docs/adr/0010-emote-choreography-channel-contract.md)).**
 * Every channel of a `ResolvedPose` is *owned* by the choreography, *limited* by it, or
 * *free*. Owned channels drop the emote's contribution outright — position and **body**
 * facing, and a hand while its grip is engaged — because a square is a shared coordinate
 * agreement and one dancer's emote spinning them 180° breaks the formation for everyone
 * else. Limited channels play, clipped by whatever trespasses: every ungripped arm, and
 * the silhouette deltas the frame scale was measured from. Free channels play untouched —
 * **head** facing, the bob, forward lean, eyes, effects — because nothing about them can
 * break a formation. Head facing and body facing are different channels with different
 * owners; that distinction is the ADR's, and it is what lets a dancer look at their
 * partner without leaving the set.
 *
 * Not hard-coded to 8: `applyCallToPair` gives a two-dancer square, and the call
 * model is two-couple-safe by construction.
 */

import { useCallback, createRef, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  Dancer,
  type DancerArmRigs,
  type DancerExpressionRigs,
  type DancerRig,
} from "./Dancer";
import { bodyMeshScale } from "./dancer-mesh";
import { measurePose, type DancerSolids, type Finding, type Side } from "./pose-rules";
import { readSolids } from "./pose-solids";
import {
  advanceGripBlend,
  armMetrics,
  armPose,
  contact,
  elbowLocal,
  forearm,
  gripBlend,
  trackContact,
  trackForearm,
  vec3,
  type ArmMetrics,
  type Contact,
  type Forearm,
  type GripBlend,
  type GripHand,
  type Placement,
  type Vec3,
  type TouchHold,
  touchHold,
  touchingSide,
  gripHeight,
  insideSide,
  standingAsCouple,
} from "./arm-pose";
import {
  facingToRotationY,
  makeFrame,
  refit,
  passingWidth,
  DEFAULT_SCALE,
  toWorld,
  type DanceFrame,
  type WorldPoint,
} from "./frame";
import { COUPLE_WIDTH, type ShapeAt } from "square-one";
import { handLie, wristRotation } from "./wrist";
import {
  LOW,
  planArch,
  sizeArch,
  type ArchPlan,
  type ArchSizing,
  type DuckRoom,
} from "./arch";
import { pairGripRadius, planForearm, type ForearmPlan } from "./forearm-hold";
import {
  BREAK,
  NO_DELTAS,
  drawAccommodation,
  growBody,
  growForearm,
  standingLift,
  type Accommodation,
  type BodyDeltas,
} from "./accommodation";
import {
  duckProfile,
  keepsContact as styleKeepsContact,
  duckRoom as styleRoom,
  forcedAccommodation,
  type TurnUnderStyle,
} from "./turn-under";
import { useDancePerformance, type DancePerformanceOptions } from "./useDancePerformance";
import type { AnimationController } from "../services/animation-controller";
import { NEUTRAL_POSE } from "../services/emotes";
import { restClearance, silhouetteMetrics } from "./silhouette-limit";
import {
  type ExpressionContext,
  resolveExpression,
  resolvedExpression,
} from "./expression-channels";
import {
  MYCO_DEFAULTS,
  EMBER_DEFAULTS,
  NPC_BODY_CENTER_Y,
  handDrawnMap,
  handRotations,
  deg2rad,
  lateralClearance,
  rigidParts,
  SHAPE_BOUNDS,
  type CharacterBodyShape,
} from "../services/body-shapes";

interface DanceFloorProps extends DancePerformanceOptions {
  /** Where the square sits on the floor. */
  origin?: WorldPoint;
  /**
   * World units per engine unit. Defaults to the occupants' pairwise clearance
   * needs (ADR-0012) — the square dances bigger when bigger dancers are in it.
   * An explicit value overrides that and may let bodies intersect.
   */
  scale?: number;
  yaw?: number;
  shapes?: readonly CharacterBodyShape[];
  /** Follow the dancers' centroid as the square migrates (square-one ADR-0006). */
  followDrift?: boolean;
  /** Freeze the performance clock; dancers hold their pose mid-move. */
  paused?: boolean;
  /**
   * Send the square home: **bump this number** and the next frame stands everyone at
   * beat 0 of whatever they are dancing.
   *
   * A token rather than a flag, because "go home" is an event and a flag would have to
   * be lowered again by whoever raised it. The pose is written once even while
   * `paused` — a paused floor writes nothing at all, so a rewind with no pass behind it
   * would move the clock and leave the dancers standing mid-move, which is the one
   * reading this control exists to prevent.
   */
  home?: number;
  /**
   * Cut to a **named beat** of whatever is being danced, and hold there: bump `token` and
   * the next frame stands everyone at `beat`. The review route's step addressing.
   *
   * 🔑 **Not the same pass as `home`, and the difference is the arch.** Both are cuts —
   * no time passes, nothing eases, every blend lands on its target in one frame. But
   * `home` deliberately forces the arch *down*, because square-one declares a California
   * Twirl's arch from `from: 0` and "go home" exists to show the standing couple
   * underneath it. A seek must not do that: a step that names beat 2 of a Twirl is asking
   * for the belle under a **raised** arch, and forcing the blend to 0 there would answer
   * a question nobody asked and answer it wrongly-but-plausibly. So a seek snaps the
   * blend to whatever the beat itself declares, which is the ordinary rule.
   *
   * A token-and-value pair rather than a bare number, because the same beat can be asked
   * for twice in a row — step back and forward again — and a bare `beat` prop would see
   * no change and write nothing.
   *
   * `arch` is how a seek asks for the *other* pose at a beat the arch covers. `declared`
   * (the default) is the ordinary rule: raised iff the beat is inside an arch span.
   * `down` forces it flat, which is the standing couple `home` produces — and having it
   * here as a **named request** rather than as a side effect of pressing a button is what
   * lets the review ask for both poses at beat 0 and say which is which.
   */
  seek?: { readonly token: number; readonly beat: number; readonly arch?: "declared" | "down" };
  /**
   * Called every frame with the performance clock, paused or not. Runs inside
   * the frame loop — write to refs or the DOM directly, never set React state.
   */
  onBeat?: (beat: number, totalBeats: number) => void;
  /**
   * Called every frame the arms are posed, with where they ended up and what they
   * have hold of. Same rules as `onBeat`, plus one more: **the report and
   * everything in it is scratch, reused every frame.** Read it, don't retain it.
   */
  onArms?: (report: ArmReport) => void;
  /**
   * An expression layer per occupant, in the same order as `shapes`. A dancer with
   * one may emote while dancing: head, lean and bob play untouched, arms play folded
   * in where they would trespass, and a hand the engine has engaged plays nothing at
   * all. Absent or `null` is a dancer who simply dances.
   */
  controllers?: readonly (AnimationController | null)[];
  /**
   * 🧪 **Exploratory (2026-09-14, un-mirrored 2026-09-19), not a decided stance.** Radians the
   * beau of a **standing couple** turns toward the belle; she turns the same number of
   * radians the other way, holding the same joined-hands point on the floor.
   *
   * Exists so Ryan can look at a turned-in couple before anything is decided. The measurement
   * is in `journal/2026-09-14-2`: a turn keeps the forearms off the vertical pole that stops
   * `settleTouch` converging. Applied only while the placements say the two are standing as
   * a couple, never during an arch. `touchHold` is **not** re-solved for the turn. `0` (the
   * default) changes nothing.
   */
  turnIn?: number;
  /**
   * 🧪 **Exploratory (2026-09-19), not a decided stance.** World units the beau of a
   * **standing couple** steps back, along the couple's shared facing, while the belle steps
   * forward by the same amount — half each, so the joined-hands point stays put. From the
   * `floor-stagger-yaw` probe (2026-09-14). Same gating as {@link turnIn}: only while
   * standing as a couple, never during an arch, `touchHold` not re-solved, `0` (the default)
   * changes nothing.
   */
  stagger?: number;
  /**
   * 🧪 **Exploratory (2026-09-19), not a decided stance.** World units added to the standing
   * couple's shared hold height — up or down, signed. Unlike {@link turnIn}/{@link stagger}
   * this reaches the actual solve rather than turning the posed rig afterward: it moves the
   * one point both dancers' arms independently settle onto ({@link touchHold}'s `height`),
   * and `settleTouch`/`touchPose` work out whatever elbow bend that target implies — a
   * fully-determined triangle, not a free swivel. Beyond the arm's reach it falls through to
   * `reachPose` (fully straight), same as any other unreachable target. `0` (the default)
   * changes nothing.
   */
  handHeight?: number;
  /**
   * 🧪 **Exploratory (2026-09-19), not a decided stance.** World units added to the standing
   * couple's `forward` — how far in front of the pair the joined hands are held, signed.
   *
   * 🔑 **The "elbow back" dial, turned from the end that exists.** A handhold's elbow is
   * derived, not posed: `touchPose` keeps the humerus in its own shoulder's plane and takes
   * the further-back of the two legal points, so there is no elbow parameter to turn. Moving
   * the hold forward is what sends the elbow back, and the anatomy still decides how far.
   *
   * Reaches the solve the same way {@link handHeight} does, and costs the same thing ADR-0027
   * buys: `hold.forward` is normally as far forward as **both** dancers can hold with the
   * upper arm hanging, so past that the upper arm stops hanging — `holdMetrics`'
   * `upperArmAngle` and `strain` are the meter. Out of reach falls through to `reachPose`,
   * same as any unreachable target. `0` (the default) changes nothing.
   */
  handForward?: number;
  /**
   * How each occupant takes their joined arm over their own head while turning beneath it —
   * one {@link TurnUnderStyle} per dancer, in the same order as {@link shapes}. See
   * [`turn-under.ts`](turn-under.ts) for the four and where they came from.
   *
   * 🔑 **Per dancer, and per render.** Ryan, 2026-09-21: *"this will be per character … each
   * render should have a preferred accommodation if they need it … but for now just set it per
   * render."* The two halves of that are a shape (per occupant, so a floor of several couples
   * is not all doing the same thing) and a scope (set, not inferred — for now).
   *
   * 🔴 **Deliberately NOT drawn like {@link drawAccommodation}.** ADR-0037's pair are a coin
   * flip because neither is the fallback; these are not, and Ryan has already said what should
   * decide them: *"characters where the happy path is easier will be more likely not to break —
   * have it depend on the strain."* A coin flip put in now would be a decision made by default
   * against one he has already stated, so the prop is set by the caller and the inference is
   * owed. `upperArmStrain` is the input it will read.
   *
   * Absent, or `null` for one dancer, is `FULL_L` — the happy path, and the only style with a
   * pose of its own yet.
   */
  turnUnder?: readonly (TurnUnderStyle | null)[];
  /**
   * 🧪 **Exploratory (2026-09-26), not a decided stance.** How far the arch's joined hands sit
   * **over the belle's own crown** rather than at the midpoint of the two inside shoulders —
   * `0` (the default) is ADR-0025's rule and changes nothing, `1` puts the join directly above
   * her head.
   *
   * Ryan, watching the L against four reference photographs: *"the beau kind of has to put
   * their hand directly above the belle's head … in our implementation the beau is just putting
   * his hand up in between the couple and that causes the belle to have to reach more than is
   * reasonable."*
   *
   * Unlike {@link turnIn}/{@link stagger} this reaches the **solve**, and it reaches all of it:
   * the join's lateral is an input to the reshape, the height, the hand placements, the
   * clearance and the figure's own width, so the dial is threaded into `sizeArch` as well as
   * `planArch`. Sizing and posing must see the same number or the beau bows for one arch and
   * poses another — ADR-0037's defect.
   *
   * 🔴 **Applies only to an arch**, which is the one figure where somebody turns under. A
   * standing couple keeps the shoulder midpoint whatever this says.
   */
  archOverhead?: number;
  /**
   * 🧪 **Exploratory (2026-09-26), not a decided stance.** How close the pair stand while
   * dancing an arch — `0` (the default) is the standing handhold's own width and changes
   * nothing, `1` is as close as the figure can still be delivered.
   *
   * Ryan, 2026-09-26: *"the turn under we should have the pair get closer during execution of
   * that type of move."*
   *
   * 🔑 **The other half of {@link archOverhead}.** A join over the belle's crown is most of a
   * separation from the beau's inside shoulder, so moving it without closing the pair up only
   * breaks the hold. Separate dials so the two effects can be told apart on screen.
   */
  archClose?: number;
  /**
   * 🧪 A hand on each dancer's stretch and shrink, **added to whatever the figure chose** —
   * beau first. For the review's dials; see {@link Stretch}.
   *
   * 🔑 **Drawn, not solved** (2026-10-11). The figure sizes, plans and poses the pair on the
   * bodies it chose; a dial then lengthens one drawn part and everything attached below it
   * rides along, so a hand leaves the hold rather than the elbow bending to keep it. The arm
   * dials go on the arm in the hold only (both, when neither is held).
   */
  stretch?: readonly [Stretch, Stretch];
  /**
   * 🧪 Call the arch's coin flip instead of tossing it (ADR-0037's draw). Absent leaves the
   * style's own answer — `lazy-l` forces a break, the others flip.
   *
   * Outranks the style on purpose: it is here so a reviewer can stand the *same* cell up both
   * ways and look at each, including the way the style would not have chosen.
   *
   * 🔴 **Not safe to change on a mounted floor.** The plan for an execution is cached on its
   * beat range, so a new value would re-size the figure and leave the arms posed for the old
   * draw — ADR-0037's defect by another door. Put it in the floor's `key`, as the review does.
   */
  accommodation?: Accommodation;
}

/** How far one dancer is stretched (positive) or shrunk (negative), in world units. */
export interface Stretch {
  /** Torso height — the reshape's lever (ADR-0028) and the duck's. */
  readonly body: number;
  /** Forearm length, on the arm in the hold — the reach's lever (ADR-0040, as superseded). */
  readonly forearm: number;
  /** Upper-arm length, on the arm in the hold. Undrawn (ADR-0017); the elbow moves out. */
  readonly upperArm: number;
}

/** One dancer's arms this frame: where they are, and what the hand has hold of. */
export interface TrackedArms {
  readonly key: string;
  /** The hand square-one has engaged, or `null` for hands free. */
  grip: GripHand;
  /**
   * The hand joined by **standing** as a couple — the touch hold, which square-one's
   * grip spans know nothing about (ADR-0027). `null` for a facing pair, or for a
   * couple who have moved out of their standing width.
   *
   * Separate from {@link grip} rather than folded into it because the two are different
   * kinds of hold: a grip is eased, owned, and resolved against the partner's forearm,
   * while a touch hold is written outright at the solved point and leaves the outside
   * arm alone. Anything that only wants to know *which hand is in somebody else's*
   * — the joint markers — should read `grip ?? touch`.
   */
  touch: "left" | "right" | null;
  /**
   * The hand square-one has engaged in an **arch** — palms joined and raised clear of the
   * head, high enough to walk beneath. `null` when no arch span covers this beat.
   *
   * 🔴 **Reported and not yet drawn.** square-one's California Twirl declares it for the
   * whole call (its ADR-0017), and nothing here poses it: an arch is a *raised* arm, and
   * every hold this module can pose is built on [ADR-0027](../../docs/adr/0027-the-upper-arm-hangs-and-the-hands-come-forward.md)
   * — the humerus of a **hanging** arm stays in the plane of its own shoulder. That is the
   * right anatomy for a couple standing hand in hand and the wrong one for an arch, and
   * which anatomy replaces it is a decision, not a fallback.
   *
   * It is a third field rather than a value of {@link grip} because routing it there would
   * pose it as a **forearm** grip — the arm-turn hold — which is a visibly wrong hold
   * rather than an absent one. A Twirl currently renders as the Partner Trade it is
   * geometrically identical to, with the hands free, which is honest about what has been
   * decided so far.
   */
  arch: "left" | "right" | null;
  /**
   * How this pair is accommodating an arch their bodies may not be able to make — drawn once
   * per execution of the move, `null` when no arch is live. See [`arch.ts`](arch.ts).
   */
  accommodation: Accommodation | null;
  /**
   * How far this dancer's torso has been stretched or squashed for the arch, in body-height
   * units. `0` under a break, and `0` for anyone whose reach was already enough.
   */
  bodyDelta: number;
  /**
   * How far the forearm **in the hold** has been lengthened, figure and dial together. The
   * other forearm is drawn at its built length.
   */
  forearmDelta: number;
  /**
   * The natural length of each upper arm this dancer is **wearing** — `elbowReach` of the
   * reshaped body, plus the dial on the arm in the hold. {@link upperArm} over this is how far
   * the pose has stretched it.
   */
  readonly upperArmNatural: { left: number; right: number };
  readonly left: Forearm;
  readonly right: Forearm;
  /**
   * How long the undrawn upper arm is this frame, per side — elbow to shoulder, in the
   * dancer's own rig space, against a natural length of `elbowReach`.
   *
   * Reported because ADR-0017 made it a real span rather than an assumption. A grip is
   * pinned to the pair's pivot and *should* breathe here, since the bodies do and the
   * hold does not let go; a reach should not. Either way the honest reading is a number
   * that can be watched drifting, which is this subsystem's standing answer to "is the
   * geometry real".
   */
  readonly upperArm: { left: number; right: number };
  /** Where the gripping hand meets the partner's forearm; meaningless unless
   *  `grip` names a hand and `holding` is true. */
  readonly contact: Contact;
  /** Whether `contact` was resolved this frame — both dancers must be gripping. */
  holding: boolean;
}

/** The square's tactile state for one frame. */
export interface ArmReport {
  beat: number;
  readonly dancers: readonly TrackedArms[];
  /**
   * The point a gripping pair holds over — their midpoint. Reported because
   * "are the joined forearms actually pinned to it" is the question the grip lives
   * or dies by, and it is only answerable against this point.
   */
  readonly pivot: Vec3;
  /** How far apart the pair are standing. Breathes; the grip must not. */
  separation: number;
  /**
   * The pair as **drawn** this frame, read back off the meshes — what `pose-rules.ts` checks.
   * `null` until both dancers have mounted, and for a floor that is not a pair.
   */
  solids: readonly [DancerSolids, DancerSolids] | null;
  /**
   * Every rule measurement for this frame's pose ({@link measurePose}), kept or broken. Empty
   * when {@link solids} is `null`. `violations()` is the filter.
   */
  findings: readonly Finding[];
}

const DEFAULT_SHAPES = [MYCO_DEFAULTS, EMBER_DEFAULTS] as const;
const DEBUG_COLORS = ["#e2725b", "#5b8ce2"] as const;

const SIDES = ["left", "right"] as const;

/**
 * A dancer with the arch's forearm extension on, or the very same object when there is none
 * — identity matters, because the callers use it to skip a per-frame `armMetrics`.
 */
function reached(
  shape: CharacterBodyShape | undefined,
  armDelta: number,
): CharacterBodyShape | undefined {
  if (shape === undefined || armDelta === 0) return shape;
  return growForearm(shape, armDelta);
}

/**
 * A dancer wearing both of an arch's shape changes: the torso trade that closes the pair's gap
 * (ADR-0028) and the forearm they reached with (ADR-0040, as superseded).
 *
 * Returns the argument unchanged when neither applies, which is every pair who can simply make
 * the hold — and every frame outside a hold — so the `armMetrics` above it is not paid for.
 */
function reshaped(
  shape: CharacterBodyShape,
  bodyDelta: number,
  armDelta: number,
): CharacterBodyShape {
  if (bodyDelta === 0 && armDelta === 0) return shape;
  const grown = bodyDelta === 0 ? shape : growBody(shape, bodyDelta);
  return armDelta === 0 ? grown : growForearm(grown, armDelta);
}

/** The shortest a dial may draw a forearm or an upper arm — a limb, not a point. */
const MIN_DRAWN_FOREARM = 0.02;

/** Straight-line interpolation. Named because the arch uses it four times on one hold. */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * The `restX` multiplier for each side's shoulder. `+x` is the anatomical **left** on
 * every dance rig — `Dancer` places `arms.right` at `−forearmX` — which is the same
 * convention `poseArms` states and the opposite of what `Player`/`Npc` *call* their
 * groups. Needed since ADR-0017, because the pose is written into the shoulder's frame
 * and the shoulder has a side.
 */
const SIGN = { left: 1, right: -1 } as const;

// Scratch objects for per-frame arm posing — allocated once, never per frame.
const DOWN = new THREE.Vector3(0, -1, 0);
const _read = armPose();
const _elbow = vec3();
const _self: Placement = { x: 0, z: 0, yaw: 0 };
const _partner: Placement = { x: 0, z: 0, yaw: 0 };
const _aim = new THREE.Vector3();
/** Scratch for the wrist (ADR-0052). Frame-loop code allocates nothing; this is that rule. */
const _m3 = new THREE.Matrix3();
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
/**
 * Which drawn hand sits inside which forearm group — **the mirror**, and it is here rather
 * than inline so the one place it matters names it. `Dancer` puts `handRotations(...).left`
 * on the mesh in the `right` group; hand-pose naming is viewer-mirrored, like the eye editor.
 */
const MIRRORED = { left: "right", right: "left" } as const;

/**
 * The resolver's input, mutated per dancer per frame rather than rebuilt.
 *
 * Seeded with the first default shape purely so the fields are non-null; every one of
 * them is overwritten before `resolveExpression` reads it.
 */
const _ctx: ExpressionContext = {
  pose: NEUTRAL_POSE,
  shape: DEFAULT_SHAPES[0],
  bodyCenterY: NPC_BODY_CENTER_Y,
  silhouette: silhouetteMetrics(DEFAULT_SHAPES[0]),
  partnerSilhouette: silhouetteMetrics(DEFAULT_SHAPES[0]),
  restNeed: 0,
  me: armMetrics(DEFAULT_SHAPES[0]),
  them: armMetrics(DEFAULT_SHAPES[0]),
  self: _self,
  partner: _partner,
  blend: gripBlend(),
  hold: undefined,
};

function readPlacement(out: Placement, rig: THREE.Group): void {
  out.x = rig.position.x;
  out.z = rig.position.z;
  out.yaw = rig.rotation.y;
}

export function DanceFloor({
  origin = { x: 0, z: 0 },
  scale,
  yaw = 0,
  shapes = DEFAULT_SHAPES,
  followDrift = false,
  paused = false,
  home = 0,
  seek,
  onBeat,
  onArms,
  controllers,
  turnIn = 0,
  stagger = 0,
  handHeight = 0,
  handForward = 0,
  turnUnder,
  archOverhead = 0,
  archClose = 0,
  stretch,
  accommodation: calledAccommodation,
  ...performanceOptions
}: DanceFloorProps) {
  /**
   * The handhold a couple of *these two bodies* stands in — where the joined hands are and
   * how far apart that puts them, in world units and then in engine ones.
   *
   * Solved once here rather than per frame per arm, and it is the same object both dancers
   * pose against, which is what keeps their two hands on each other.
   *
   * Derived from `shapes` rather than from `occupantShapes`, which is the whole reason
   * it sits up here: the couple's width is an input to the performance, and
   * `occupantShapes` is downstream of the performance's own keys. Reading it here would
   * be a cycle — and it would be a cycle for no gain, since a couple is two dancers and
   * the cast's first two are those two either way.
   *
   * square-one's `COUPLE_WIDTH` is the fallback and says of itself that it is the
   * body-agnostic default, to be replaced by a consumer that has bodies. This is that
   * consumer (ADR-0004's seam).
   */
  const hold = useMemo<TouchHold | undefined>(() => {
    const a = shapes[0];
    const b = shapes[1];
    if (a === undefined || b === undefined) return undefined;
    // `shapes[0]` wears the key `a`, which `useDancePerformance` makes the **beau**. The
    // hold is still not symmetric in the pair — its lateral offset is signed toward the belle,
    // and the reach clamps resolve per role — so the order matters here in a way the width
    // alone never did. Less than it used to: since ADR-0046 the *height* no longer depends on
    // which of them is called beau.
    return touchHold(armMetrics(a), armMetrics(b));
  }, [shapes]);

  const coupleWidthWorld =
    hold?.width ?? COUPLE_WIDTH * (scale ?? DEFAULT_SCALE);

  const coupleWidthEngine = useMemo(
    () => coupleWidthWorld / (scale ?? DEFAULT_SCALE),
    [coupleWidthWorld, scale, shapes],
  );

  /**
   * The arch each execution is danced under — **drawn before the figure is built, and the figure
   * sized to what was drawn** (ADR-0037).
   *
   * One entry per call in the sequence: the accommodation this pair drew for it, the room that
   * accommodation needs, and the width they stand at while dancing it.
   *
   * 🔴 **The draw used to happen in the frame loop, after the motions existed**, so the figure
   * could only be sized to the *worse* of the two accommodations (ADR-0030) and the beau bowed
   * for a break he had usually not drawn. On the default cast a reshape wants **0.193** of the
   * couple's width and a break **0.951** — five times more, spent on every Twirl.
   *
   * 🔴 **And when neither fits, the hold cannot be kept.** square-one delivers a clearance at or
   * above the couple's own width as its *cap* — the widest bow the figure has — because the two
   * are exactly a width apart at both ends of the call whatever the bow does between (its
   * ADR-0018). So the pair let go, and **a pair who have let go are not held to a handhold's
   * width**: they stand at twice the room they need, where the arc's own radius delivers it with
   * no bow at all (ADR-0014's relationship, used the other way round).
   */
  /** What the pair's {@link turnUnder} styles force on the reach draw — see `turn-under.ts`. */
  const forced = useMemo<Accommodation | null>(
    () => forcedAccommodation(turnUnder),
    [turnUnder],
  );

  /**
   * 🧪 How far each dancer is willing to drop, for `sizeArch`'s duck step — the shape editor's
   * own room below their body height for anyone dancing `DUCK_UNDER`, and `0` for everyone else
   * (2026-09-26).
   *
   * 🔑 **The style lives here and the geometry lives in `arch.ts`.** That module knows about
   * bodies and holds and deliberately not about the four turn-under styles; `duckRoom` is the
   * one sentence of translation between them.
   */
  const duckRoom = useMemo<DuckRoom>(() => {
    const floor = SHAPE_BOUNDS.body.height.min;
    const room = (shape: CharacterBodyShape | undefined, style: TurnUnderStyle | null | undefined) =>
      shape === undefined ? 0 : styleRoom(style, shape.body.height, floor);
    return { beau: room(shapes[0], turnUnder?.[0]), belle: room(shapes[1], turnUnder?.[1]) };
  }, [shapes, turnUnder]);

  const arches = useMemo<readonly (ArchSizing | null)[]>(() => {
    const a = shapes[0];
    const b = shapes[1];
    const seq = performanceOptions.sequence;
    if (a === undefined || b === undefined || hold === undefined || seq === undefined) return [];
    const am = armMetrics(a);
    const bm = armMetrics(b);
    const bodies = passingWidth(lateralClearance(rigidParts(a), rigidParts(b)));
    return seq.map((call) =>
      call === "california-twirl"
        ? sizeArch(
            am, bm, a, b, hold.width, bodies,
            // 🔴 **Forced here and nowhere downstream, because this is where the draw *is***
            // (ADR-0037). The figure is sized to the accommodation before it is built, so a
            // style that pinned the accommodation at the posing end instead would have the beau
            // bowing for one answer while the arms posed the other — the exact defect ADR-0037
            // was written to fix.
            //
            // 🔑 And forcing it is what makes a review cell **reproducible**. This has been a
            // coin flip per mount since the draw existed, so two visits to the same address
            // could show two different poses and a rating could not say which it was of.
            calledAccommodation ?? forced ?? drawAccommodation(),
            // 🧪 Sized with the same dial the pose uses, or the bow is built for one arch and
            // the arms solve another (ADR-0037).
            archOverhead,
            archClose,
            duckRoom,
          )
        : null,
    );
  }, [
    shapes, hold, performanceOptions.sequence, forced, calledAccommodation,
    archOverhead, archClose, duckRoom,
  ]);

  const shapeAt = useCallback<ShapeAt>(
    (index) => {
      const arch = arches[index];
      if (arch === undefined || arch === null) return undefined;
      const scaleNow = scale ?? DEFAULT_SCALE;
      return { archClearance: arch.wanted / scaleNow, width: arch.width / scaleNow };
    },
    [arches, scale],
  );

  /**
   * How far apart the pair must pass **hands free**, in engine units — the third and last
   * measurement across this seam (square-one ADR-0020, ADR-0031 here).
   *
   * The same instrument the frame scale uses: `lateralClearance` over the two rigid
   * silhouettes, which is height-aware and counts **heads** — and a head is the widest thing
   * most of this cast has. That is the whole difference between this and the torsos: Myco's
   * head is 0.49 where his torso is 0.30.
   *
   * 🔴 **Not the same number as {@link archClearanceEngine}, and both are needed.** They are
   * the same two bodies measured with different things in the gap, and square-one picks by the
   * hold — a Trade reads this one, a Twirl reads that one. Passing only the arch clearance is
   * what left `#dance=two-trades` tight while `#dance=two-twirls` bowed.
   */
  const clearanceEngine = useMemo(() => {
    const a = shapes[0];
    const b = shapes[1];
    if (a === undefined || b === undefined) return undefined;
    const scaleNow = scale ?? DEFAULT_SCALE;
    return passingWidth(lateralClearance(rigidParts(a), rigidParts(b))) / scaleNow;
  }, [shapes, scale]);

  /**
   * How far from a joined forearm the pair's bodies stand, in engine units — the **arm**
   * measurement square-one's ADR-0020 added and nothing supplied (ADR-0033).
   *
   * The last of the four across this seam, and the only one that is not a clearance. Nobody
   * passes anybody in an arm turn: the two of them grip and walk a circle, and its radius is
   * where their arms put them. Read out of the pose rather than invented — see
   * `pairGripRadius`.
   *
   * 🔴 Unlike the clearances it is **not** floored by the engine (its ADR-0021): a grip is a
   * placement, so short arms genuinely dance a tighter Allemande and a small number here is
   * meant.
   */
  const gripRadiusEngine = useMemo(() => {
    const a = shapes[0];
    const b = shapes[1];
    if (a === undefined || b === undefined) return undefined;
    const scaleNow = scale ?? DEFAULT_SCALE;
    return pairGripRadius(armMetrics(a), armMetrics(b)) / scaleNow;
  }, [shapes, scale]);

  const runtime = useDancePerformance({
    ...performanceOptions,
    coupleWidth: coupleWidthEngine,
    ...(clearanceEngine === undefined ? {} : { clearance: clearanceEngine }),
    shapeAt,
    ...(gripRadiusEngine === undefined ? {} : { gripRadius: gripRadiusEngine }),
  });
  const keys = useMemo(() => Object.keys(runtime.motions), [runtime.motions]);

  // One rig per dancer, created in a memo rather than by mutating a ref during
  // render — the latter is what `react-hooks/refs` objects to, and it is right to.
  const rigs = useMemo(() => {
    const map: Record<string, DancerRig> = {};
    for (const key of keys) map[key] = createRef<THREE.Group>();
    return map;
  }, [keys]);

  // The shape each occupant actually wears — the same cycling the render uses,
  // resolved once so the frame scale is derived from the real cast.
  const occupantShapes = useMemo(
    () => keys.map((_, i) => shapes[i % shapes.length] ?? DEFAULT_SHAPES[0]),
    [keys, shapes],
  );

  // Arm geometry per occupant, for grips and tucks.
  const metrics = useMemo<ArmMetrics[]>(
    () => occupantShapes.map((s) => armMetrics(s)),
    [occupantShapes],
  );

  // 🔴 **Nothing sets the square's spacing from the bodies any more** (ADR-0035). The pairwise
  // clearances used to grow the whole floor until the engine's fixed lane happened to fit the
  // widest pair; the figures carry their own accommodation now, so the square sits at
  // `DEFAULT_SCALE` and a wide pair widens the call they are in rather than everybody's.

  // Resting silhouettes, for the ADR-0010 `limited` shape channels. Same shape of
  // model as the arms and for the same reason: the square's spacing was derived from
  // these, so an emote that changes them has to be held to a share of the live slack.
  const silhouettes = useMemo(
    () => occupantShapes.map((s) => silhouetteMetrics(s)),
    [occupantShapes],
  );

  // What each pair needs at rest — the ADR-0012 number, resolved once per cast.
  // Two-dancer squares only, matching the driver loop below.
  const restNeeds = useMemo(
    () =>
      silhouettes.map((m, i) => {
        const them = silhouettes[1 - i];
        return them === undefined ? 0 : restClearance(m, them);
      }),
    [silhouettes],
  );

  // One resolved expression per dancer, reused every frame. The rigs are written from
  // these and never from an emote's pose — see `expression-channels.ts`.
  const resolved = useMemo(
    () => occupantShapes.map((s) => resolvedExpression(s)),
    [occupantShapes],
  );

  // One pair of arm rigs per dancer, mirroring the body rigs.
  const armRigs = useMemo(() => {
    const map: Record<string, DancerArmRigs> = {};
    for (const key of keys)
      map[key] = {
        left: createRef(),
        right: createRef(),
        hands: { left: createRef(), right: createRef() },
      };
    return map;
  }, [keys]);

  // The tracking channel: one record per dancer, mutated in place every frame.
  const tracked = useMemo(() => {
    const map: Record<string, TrackedArms> = {};
    for (const key of keys) {
      map[key] = {
        key,
        grip: null,
        touch: null,
        arch: null,
        accommodation: null,
        bodyDelta: 0,
        forearmDelta: 0,
        upperArmNatural: { left: 0, right: 0 },
        left: forearm(),
        right: forearm(),
        upperArm: { left: 0, right: 0 },
        contact: contact(),
        holding: false,
      };
    }
    return map;
  }, [keys]);

  // Body and head refs, for the channels an emote owns outright.
  const expressions = useMemo(() => {
    const map: Record<string, DancerExpressionRigs> = {};
    for (const key of keys) {
      map[key] = {
        body: createRef(),
        head: createRef(),
        shoulders: { left: createRef(), right: createRef() },
      };
    }
    return map;
  }, [keys]);

  /**
   * The arch this pair is currently under, if any — **one plan per execution of the move**.
   *
   * A ref rather than state: it is read and written inside the frame loop and nothing
   * renders off it. Three things are decided once when a span begins and then held still
   * for the whole call:
   *
   * - **the accommodation**, because a coin flipped every frame is not a coin flip;
   * - **the plan**, at the separation the pair start from. A California Twirl closes the
   *   couple to half their width at the pass, and re-planning against that would have the
   *   torsos breathing in and out through the figure. A dancer decides how to handle a hold
   *   when they take it.
   * - **the reshaped bodies**, so `armMetrics` is paid for once per call rather than per
   *   frame. `blend` eases the *effect* of them in and out; the target does not move.
   */
  const arch = useRef<{
    span: string | null;
    accommodation: Accommodation;
    plan: ArchPlan | null;
    /**
     * The forearm hold's plan, when the live span is an arm turn rather than an arch.
     *
     * 🔴 **Both, on one ref, because a dancer is only ever in one hold.** The two plans
     * share `bodyDeltas` and the draw, and the reshape machinery below reads that and does
     * not care which hold asked for it — which is exactly what ADR-0032 moving the two
     * styles out of `arch.ts` was for (ADR-0033).
     */
    forearm: ForearmPlan | null;
    /**
     * The upper-arm extension this execution is dancing with — `0` unless `sizeArch` had to
     * reach for it (ADR-0040). Eased in by `blend` like the reshape, and for the same reason:
     * an arm that snapped to length would be a limb popping rather than a dancer stretching.
     */
    armDelta: number;
    /**
     * The couple's stance **on the bodies they are dancing this call with** — the resting
     * `hold` when nobody reached, and the hold re-solved on the lengthened arms when they did
     * (ADR-0045).
     *
     * 🔴 **`TouchHold.width` means "how far apart these two are standing", and ADR-0040 gave
     * that number a second meaning without anybody noticing.** A reaching pair dance the call
     * at `ArchSizing.width` while their resting handhold still reports the narrower stance —
     * so `standingAsCouple`, asked whether they are a couple, compared where they *are*
     * against where they would be if they had not reached, and said no. Five of the twenty
     * shipped orderings lost the hold entirely at beat 0 on that alone.
     */
    stance: TouchHold | undefined;
    /** 0 hands down and shapes unchanged, 1 fully into the hold. */
    blend: number;
    /**
     * How far each dancer drops at the **deepest** point of a duck, as a body-height change —
     * negative, and `0` for anyone not dancing {@link DUCK_UNDER} (see `turn-under.ts`).
     *
     * 🔑 **Solved once per execution, like the plan, and scaled per frame by `duckProfile`.**
     * A depth re-solved every frame would be a dancer hunting for the shallowest duck that
     * works *at the pose she is currently in*, which is a feedback loop rather than a figure.
     */
    duck: BodyDeltas;
    /** The arch span the duck's profile is measured across — beats, from the live span. */
    duckSpan: { from: number; to: number } | null;
  }>({
    span: null, accommodation: BREAK, plan: null, forearm: null, armDelta: 0,
    stance: undefined, blend: 0, duck: NO_DELTAS, duckSpan: null,
  });

  // The only eased quantity in the arm channel: how far each hand is into its grip.
  const blends = useMemo(() => {
    const map: Record<string, GripBlend> = {};
    for (const key of keys) map[key] = gripBlend();
    return map;
  }, [keys]);

  const report = useMemo<ArmReport>(
    () => ({
      beat: 0,
      dancers: keys.flatMap((key) => (tracked[key] === undefined ? [] : [tracked[key]])),
      pivot: vec3(),
      separation: 0,
      solids: null,
      findings: [],
    }),
    [keys, tracked],
  );

  /** The metrics each dancer is *wearing* this frame — reshaped, where an arch reshapes them. */
  const worn = useRef<(ArmMetrics | undefined)[]>([]);
  /** The body each dancer is *drawn* in this frame — {@link worn}'s shape, plus the torso dial. */
  const wornShapes = useRef<(CharacterBodyShape | undefined)[]>([]);

  const frameRef = useRef<DanceFrame>(makeFrame(origin, scale ?? DEFAULT_SCALE, yaw));

  /**
   * The couple's standing width **in world units**, when this floor is dancing a couple.
   *
   * 🔴 `COUPLE_WIDTH` is an *engine* unit and every placement the arm layer sees is
   * *world* — scaled by the frame, which for the default cast is 2.60. Comparing the two
   * directly would have looked for a couple a third of a world unit wide and never found
   * one, so the hands would simply never have joined and nothing would have said why.
   * The same class of mistake as the rig-frame defect ADR-0017 chased: two frames, one
   * subtraction, no error.
   */

  /** The last `home` token this floor acted on, so one bump means one pass. */
  const homeSeen = useRef(home);
  /**
   * The same, for `seek` — but starting at `null` rather than at the current token, and
   * that difference is load-bearing.
   *
   * 🔴 **A floor that mounts paused runs no pass at all**, so it would stand its dancers
   * wherever the rigs were built and never pose them. `home` can start level with its
   * prop because an unpaused floor poses itself on the first advance; a seeking floor is
   * paused by definition — that is what a seek is for — so a fresh mount has to count as
   * never having seen the token. The review remounts this floor on every change of cast,
   * which is every third cell, and without this those cells come up unposed.
   */
  const seekSeen = useRef<number | null>(null);

  useFrame((state, delta) => {
    let coupleYaw: number | undefined;
    // A home request outranks the pause — it is the one thing that must move the
    // dancers while the clock is frozen — and it is consumed here, so a bump of the
    // token buys exactly one pass however long the floor then sits paused.
    const goingHome = home !== homeSeen.current;
    homeSeen.current = home;

    // A seek is the same kind of event and is consumed the same way. Both can be pending
    // on the same frame only if a caller bumps both, which no caller does; `home` is
    // checked first so that pairing would resolve to the pose with the stronger claim to
    // being a *named* moment.
    const seekTo = seek !== undefined && seek.token !== seekSeen.current ? seek.beat : null;
    if (seek !== undefined) seekSeen.current = seek.token;
    const seeking = !goingHome && seekTo !== null;

    if (goingHome || seeking || !paused) {
      // Guard against tab-restore producing an enormous delta and teleporting the
      // square across the floor. Going home takes no time at all: the whole point is
      // to land on beat 0 rather than to travel there. Neither does a seek.
      const dt = goingHome || seeking ? 0 : Math.min(delta, 0.1);
      const states = goingHome
        ? runtime.home()
        : seeking && seekTo !== null
          ? runtime.poseAt(seekTo)
          : runtime.advance(dt);

      for (const state of states) {
        const rig = rigs[state.key]?.current;
        if (!rig) continue;

        const world = toWorld(frameRef.current, state.position);
        rig.position.x = world.x;
        rig.position.z = world.z;
        // `bodyDeltaY` is a visual offset owned by the emote layer; the driver keeps
        // dancers grounded, matching how positionRef is handled everywhere else.
        rig.position.y = 0;
        rig.rotation.y = facingToRotationY(frameRef.current, state.facing);
      }

      // 🧪 The exploratory turn-in and stagger (see `turnIn`, `stagger`). Read off the
      // placements the engine just wrote, so a pair only turn/stagger while they really are
      // standing as a couple, and the couple's own facing is kept for `poseArms` before
      // either rig is moved.
      coupleYaw = undefined;
      if ((turnIn !== 0 || stagger !== 0) && keys.length === 2 && hold !== undefined) {
        const a = rigs[keys[0] ?? ""]?.current;
        const b = rigs[keys[1] ?? ""]?.current;
        if (a && b) {
          readPlacement(_self, a);
          readPlacement(_partner, b);
          if (standingAsCouple(_self, _partner, hold.width)) {
            const sideA = insideSide(_self, _partner);
            const sideB = insideSide(_partner, _self);
            coupleYaw =
              _self.yaw + Math.atan2(Math.sin(_partner.yaw - _self.yaw), Math.cos(_partner.yaw - _self.yaw)) / 2;
            if (turnIn !== 0) {
              // 🧪 2026-09-19: not mirrored any more. `keys[0]` is the beau (see the `poseArms`
              // note above) and he still turns toward the belle; she now turns the same number
              // of degrees the other way, away from him. Toward the partner: the inside-right
              // dancer turns clockwise (−), inside-left (+); away is the same formula negated.
              a.rotation.y += sideA === "right" ? -turnIn : turnIn;
              b.rotation.y += sideB === "right" ? turnIn : -turnIn;
            }
            if (stagger !== 0) {
              // 🧪 The beau (`a`) steps straight back, the belle (`b`) straight forward, along
              // the couple's shared facing (`coupleYaw`) rather than either dancer's own — half
              // the dial each, so the hold point they're aiming at doesn't move. World forward
              // for a given `rotation.y` is `(sin, cos)` in `(x, z)` (see `frame.ts`
              // `facingToRotationY`'s doc comment: heading is `atan2(dir.x, dir.z)`).
              const fx = Math.sin(coupleYaw), fz = Math.cos(coupleYaw);
              a.position.x -= fx * (stagger / 2);
              a.position.z -= fz * (stagger / 2);
              b.position.x += fx * (stagger / 2);
              b.position.z += fz * (stagger / 2);
            }
          }
        }
      }

      if (followDrift) {
        const actual: WorldPoint[] = [];
        for (const key of keys) {
          const rig = rigs[key]?.current;
          if (rig) actual.push({ x: rig.position.x, z: rig.position.z });
        }
        frameRef.current = refit(frameRef.current, actual);
      }

      // Arms. Two channels, both from `arm-pose`: the engine's grip spans
      // (square-one F2) lay a named forearm into the pair's grip, and mere
      // proximity tucks the forearm a dancer is about to pass someone with.
      // Two-dancer squares only for now; larger sets need partner resolution
      // from formations.
      if (keys.length === 2) {
        const beat = runtime.beat();
        // A home pass eases nothing. Arriving at beat 0 is a cut rather than a move,
        // and `ease` from a zero `dt` would be 0 — which leaves the grip blend exactly
        // where the interrupted move left it, so hands the figure's first beat does not
        // join would still be drawn holding. A seek is a cut for the same reason: it
        // lands on a *named* moment, and a moment half-blended out of the previous one
        // is not the moment that was named.
        const ease = goingHome || seeking ? 1 : Math.min(1, dt * 10);

        /*
         * The arch (square-one's ADR-0017), resolved for the **pair** before either dancer
         * is posed — it is one hold, one accommodation and one plan, and a per-dancer answer
         * would be two dancers negotiating separately about the same pair of hands.
         *
         * The span identity is its beat range: a second California Twirl in a sequence is a
         * second execution and gets its own draw, which is the whole point of the draw.
         */
        const first = keys[0];
        // 🔴 **Either hold, not just the arch** (ADR-0033). A forearm grip is a reach a pair
        // can fail to make exactly as an arch is — two dancers of very different height cannot
        // both put an elbow on the mean of their elbows — and until this it was posed with no
        // question asked. Found by the span, drawn per execution, planned once.
        const heldSpan =
          first === undefined
            ? undefined
            : runtime.motions[first]?.grips.find(
                (g) =>
                  (g.grip === "arch" || g.grip === "forearm") && beat >= g.from && beat <= g.to,
              );
        const archSpan = heldSpan?.grip === "arch" ? heldSpan : undefined;
        const under = arch.current;
        if (heldSpan === undefined) {
          under.span = null;
        } else {
          // The style is in the key, so a call that changed hold across the same beat range
          // would be a second execution and get its own draw.
          // 🧪 The overhead dial is part of the identity, because the plan is built once per
          // execution and cached here — without it, turning the dial on a paused floor would
          // re-size the figure and leave the arms posed for the arch before it.
          const id =
            `${heldSpan.grip}:${String(heldSpan.from)}:${String(heldSpan.to)}` +
            (archOverhead === 0 ? "" : `:oh${archOverhead.toFixed(3)}`) +
            (archClose === 0 ? "" : `:cl${archClose.toFixed(3)}`);
          if (under.span !== id) {
            under.span = id;
            // 🔴 **The arch's accommodation is not drawn here** (ADR-0037). It was drawn before
            // the figure was built, because the figure has to be sized to it — so this looks up
            // the draw for *this* execution rather than making a second, independent one. Two
            // draws would mean the beau bowing for one accommodation while his arms pose the
            // other, which is the defect the whole change is about, wearing a subtler disguise.
            //
            // Matched by ordinal: each Twirl in the sequence contributes exactly one arch span,
            // in order, so the n-th live arch span is the n-th call's draw. A forearm grip is
            // still drawn here — nothing sizes a figure to it.
            const archOrdinal =
              archSpan === undefined
                ? -1
                : (runtime.motions[first ?? ""]?.grips ?? [])
                    .filter((g) => g.grip === "arch")
                    .findIndex((g) => g.from === archSpan.from && g.to === archSpan.to);
            const chosen = archOrdinal < 0 ? undefined : arches[archOrdinal];
            under.accommodation =
              chosen === undefined || chosen === null ? drawAccommodation() : chosen.accommodation;
            /*
             * 🔴 **The arms this pair are dancing with, which are not always the ones they
             * stand around in** (ADR-0040). When neither accommodation could be delivered at
             * the couple's own width, `sizeArch` lengthened the undrawn upper arm until the
             * figure fit — and it re-solved the couple's width on the longer arms, because
             * that is half of what the lever buys. The plan has to be made on the same pair
             * `sizeArch` sized the figure for, or the arms would pose for one body and the
             * bow be built for another, which is ADR-0037's defect in a new costume.
             *
             * 🔴 **Which also fixes the let-go case, quietly, and it is worth saying out loud.**
             * The plan used to be made at `hold.width` whatever `sizeArch` decided — so a pair
             * standing at *twice* the room (ADR-0037 part 3) had their arms solved for a
             * separation they were not standing at. `stood` is the width they actually dance
             * at, in every branch.
             */
            under.armDelta = chosen == null ? 0 : chosen.armDelta;
            const stood = chosen == null ? undefined : chosen.width;
            const beauS = reached(occupantShapes[0], under.armDelta);
            const belleS = reached(occupantShapes[1], under.armDelta);
            const beauM = under.armDelta === 0 || !beauS ? metrics[0] : armMetrics(beauS);
            const belleM = under.armDelta === 0 || !belleS ? metrics[1] : armMetrics(belleS);
            const pair = beauM && belleM && beauS && belleS;
            // 🔑 **Solved on the bodies dancing the call, so its `width` is the width they are
            // actually standing at** (ADR-0045). On a reaching pair this comes out equal to
            // `ArchSizing.width` by construction — `reachForIt` chose the extension *by*
            // solving `touchHold` on these same lengthened arms — so the stance, the figure and
            // the engine's placement are three readings of one number again.
            under.stance =
              under.armDelta === 0 || !pair ? hold : touchHold(beauM, belleM);
            under.plan =
              pair && hold && heldSpan.grip === "arch"
                ? planArch(
                    beauM, belleM, beauS, belleS,
                    stood ?? hold.width,
                    under.accommodation,
                    // Same aim `sizeArch` chose (ADR-0042) — a reshape posed at one height while
                    // the bow was built for another is the whole class of defect ADR-0037 closed.
                    chosen == null ? LOW : chosen.aim,
                    archOverhead,
                  )
                : null;
            under.forearm =
              pair && heldSpan.grip === "forearm"
                ? planForearm(beauM, belleM, beauS, belleS, under.accommodation)
                : null;

            /*
             * 🔑 **The duck was *sized* with the figure, not solved here** (`turn-under.ts`).
             *
             * The first attempt did solve it at this point, and it could not work: a duck
             * measured at pose time can only be compared against `ArchSizing.width`, which for
             * exactly the pairings a duck exists to rescue is already the doubled let-go width.
             * The arm clears trivially at that separation, so every pairing came back wanting a
             * duck of one centimetre. It has to be tried while the pair are still trying to keep
             * the hold, which is inside `sizeArch`'s cascade.
             *
             * So all that is left here is the span the profile is measured across.
             */
            under.duck = chosen == null ? NO_DELTAS : chosen.duck;
            under.duckSpan = { from: heldSpan.from, to: heldSpan.to };
          }
        }
        // Eased like a grip and snapped like one: a shape a hair off its target is a torso
        // that never quite finishes moving, and it would be drawn every frame for as long
        // as the dancers stand still afterwards.
        {
          /*
           * 🔴 **A home pass lands on the standing couple, whatever the figure's first beat
           * declares.** "Go home" exists to give a *nameable* moment to judge, and the one it
           * names is the standing couple — which, as the debug scene's own doc says, "only
           * exists at the top of the loop, and at 120 bpm you cannot pause on it".
           *
           * square-one declares a California Twirl's arch from **beat 0** (`from: 0`), because
           * the hands are joined and raised for the whole call. With the blend snapped to its
           * target on a home pass, that put "go home" *inside* the arch — the one pose it was
           * built to let you look at, replaced by the pose the call moves into. Ryan: *"when
           * I'm in california twirl and click 'go home' they go to the arch."*
           *
           * Targeting **0** is what the couple actually are at the top of the loop: hands
           * joined, low and forward (ADR-0027), with the arch as the thing the first beats
           * *lift them into*. It is the blend's own resting value on a fresh mount, so this is
           * the home pass agreeing with the first frame of a performance rather than a new
           * rule.
           *
           * 🔑 **A seek is explicitly not that**, and the review route depends on the
           * difference. `go home` asks for the pose *underneath* the figure's first beat;
           * a seek asks for the pose *at* a beat, and at beat 2 of a Twirl that pose is
           * the belle under a raised arch. So a seek takes the ordinary target — the one
           * the span declares — and only the ease is shared between the two passes. The
           * review catalog gets the home pose back by **asking for it by name**: its
           * `stand` step seeks beat 0 with `arch: "down"`, and every other step takes the
           * declared answer. Naming it beats reusing the `home` event, which would make
           * the two poses at beat 0 depend on which prop the caller happened to bump.
           */
          const target =
            goingHome || (seeking && seek?.arch === "down")
              ? 0
              : archSpan === undefined
                ? 0
                : 1;
          const next = under.blend + (target - under.blend) * Math.min(1, Math.max(0, ease));
          under.blend = Math.abs(target - next) < 1e-3 ? target : next;
        }

        // Pose. Both dancers first, because contact is a property of the pair and
        // cannot be resolved until both arms have moved.
        //
        // The pose is written **exactly**, not eased toward: a joined pair holds
        // still relative to their shared pivot while their bodies breathe in and out
        // around it, and any lag in getting there is a lag *away from the pivot*,
        // which slides the grip and lets go of it. The one eased quantity is how far
        // each hand is into joining or releasing.
        keys.forEach((key, i) => {
          const partnerKey = keys[1 - i];
          const rig = rigs[key]?.current;
          const partner = partnerKey === undefined ? null : rigs[partnerKey]?.current;
          const arms = armRigs[key];
          const baseMe = metrics[i];
          const baseThem = metrics[1 - i];
          const baseShape = occupantShapes[i];
          const partnerShape = occupantShapes[1 - i];
          const track = tracked[key];
          const blend = blends[key];
          if (!rig || !partner || !arms || !baseMe || !baseThem || !track || !blend) return;
          if (!baseShape || !partnerShape) return;

          /*
           * The reshape, if this pair drew one. `blend` eases the *effect* in and out; the
           * plan itself was fixed when the span began.
           *
           * 🔴 **`armMetrics` per frame, and only here.** This module's standing idiom is
           * that a frame allocates nothing, and this breaks it for the few beats a torso is
           * actually changing size. The alternative is arithmetic — a body-height change of
           * `d` moves the shoulder by `d/2` and no arm length at all — but `armMetrics` also
           * re-derives `restX` from what is beside the arm at its new height, and a shape
           * that has grown is not a shape to half-measure. A break costs nothing: its deltas
           * are zero and both branches fall back to the memoised metrics.
           */
          const plan = under.plan;
          const mine = i === 0 ? "beau" : "belle";
          const theirs = i === 0 ? "belle" : "beau";
          // Whichever hold is live owns the reshape; they are mutually exclusive and both
          // carry `bodyDeltas`, so this reads one field and stays indifferent to the style.
          const deltas = plan?.bodyDeltas ?? under.forearm?.bodyDeltas ?? null;
          /*
           * 🔑 **The duck rides its own curve, not the hold's blend** (`turn-under.ts`).
           *
           * `under.blend` is how far the hands are into the hold — it reaches 1 as the arch
           * goes up and stays there for the whole span. A duck is not that shape: it is *"spread
           * across the turn"*, deepest under the arch and gone at both ends, so it takes
           * `duckProfile` over the span's own beats. Sharing the blend would leave her folded
           * at the ending position with the hands already back down.
           *
           * Added to the reshape rather than replacing it: a pair can be trading torsos to make
           * the arch **and** one of them ducking under it, and those are different questions
           * asked of the same lever.
           */
          const duckNow =
            under.duckSpan === null
              ? 0
              : duckProfile(beat, under.duckSpan.from, under.duckSpan.to);
          // 🧪 The review's stretch dials, on top of whatever the figure chose (`stretch`).
          //
          // 🔑 **Drawn, not solved** (Ryan, 2026-10-11: *"all attached appendages should move
          // downstream"*). Nothing below this block hands a dial to the solver: the pose is the
          // figure's own, and a dial then lengthens one part of the drawn dancer so that
          // everything hanging off it rides along — a taller torso carries the head, shoulders
          // and arms up; a longer upper arm carries the forearm and hand out; a longer forearm
          // carries the hand. Solving with the dial in instead is what kept the hand pinned to
          // the hold and bent the elbow to absorb the change.
          const dialMe = stretch?.[i];
          const myDelta =
            (deltas === null ? 0 : deltas[mine] * under.blend) + under.duck[mine] * duckNow;
          const theirDelta =
            (deltas === null ? 0 : deltas[theirs] * under.blend) + under.duck[theirs] * duckNow;
          // 🔑 **Both dancers take the same arm**, unlike the torso trade, which is signed.
          // The reshape moves one *against* the other because it is closing a gap between
          // them; the reach is the pair asking the same question of both their arms.
          const armDelta = under.armDelta * under.blend;
          const shape = reshaped(baseShape, myDelta, armDelta);
          // 🔑 **A reshaped dancer stands on a lifted rig** (ADR-0043), so the bottom of the body
          // stays put and the whole height change goes upward. `rigOriginY` is what that is for,
          // and every height comparison in the dance already reads it.
          const me =
            shape === baseShape
              ? baseMe
              : armMetrics(shape, NPC_BODY_CENTER_Y, standingLift(baseShape, shape));
          const theirShape = reshaped(partnerShape, theirDelta, armDelta);
          const them =
            theirShape === partnerShape
              ? baseThem
              : armMetrics(theirShape, NPC_BODY_CENTER_Y, standingLift(partnerShape, theirShape));
          worn.current[i] = me;

          const spans = runtime.motions[key]?.grips ?? [];
          const live = spans.filter((g) => beat >= g.from && beat <= g.to);
          // Split by **style**, because they are posed by different machinery and one of
          // them is not posed at all yet. A `forearm` grip is the arm-turn hold this module
          // owns; an `arch` is square-one's California Twirl (its ADR-0017), reported so a
          // watch can see the span is live and deliberately left undrawn — see `arch` on
          // `TrackedArms`. Sending it to `gripPose` would draw an Allemande.
          track.grip = live.find((g) => g.grip === "forearm")?.hand ?? null;
          // `Hand` includes `"none"`, which is a value there and an absence here.
          const archHand = live.find((g) => g.grip === "arch")?.hand;
          track.arch = archHand === "left" || archHand === "right" ? archHand : null;
          track.accommodation = archSpan === undefined ? null : under.accommodation;
          track.holding = false;
          advanceGripBlend(blend, track.grip, ease);

          readPlacement(_self, rig);
          readPlacement(_partner, partner);

          // The whole of ADR-0010, in one call. `NEUTRAL_POSE` when this dancer has no
          // expression layer, so the code path is the same either way: a neutral
          // proposal is the resting hang, and a stopped emote cannot leave a channel
          // stuck where it left it.
          //
          // Everything below writes rigs from `ex` and never from the emote's own pose.
          // That is not a convention to keep — `ResolvedExpression` has no field for an
          // owned channel, so a spin has nowhere to arrive from.
          const sil = silhouettes[i];
          const theirSil = silhouettes[1 - i];
          const ex = resolved[i];
          if (!sil || !theirSil || !ex) return;

          _ctx.pose = controllers?.[i]?.tick(state.clock.elapsedTime) ?? NEUTRAL_POSE;
          _ctx.shape = shape;
          _ctx.bodyCenterY = NPC_BODY_CENTER_Y;
          _ctx.silhouette = sil;
          _ctx.partnerSilhouette = theirSil;
          _ctx.restNeed = restNeeds[i] ?? 0;
          _ctx.me = me;
          _ctx.them = them;
          _ctx.self = _self;
          _ctx.partner = _partner;
          _ctx.blend = blend;
          /*
           * The hold this dancer poses to — only when this floor is dancing a couple, since
           * square-one owns what a couple's width *is* and passing it through rather than
           * guessing keeps that decision in one place.
           *
           * It is the standing hold until an arch is declared, and then eases into it.
           *
           * **One `TouchHold`, two hands.** Everything about an arch that differs from a
           * standing handhold is already expressible here — it is higher, it is not carried
           * forward of the bodies, and it sits between the same two shoulders — so this is a
           * different hold rather than a different mechanism, and `poseArms` needs no branch
           * for it. The one thing that is new is that the two dancers may be given
           * **different points**: under a break each gets as far toward the join as their own
           * arm goes, and hands that are not on the same point are hands that have come apart.
           * That is the whole of "the hold breaks", and it is a number rather than a special
           * case.
           *
           * 🔴 **The lateral is per-dancer too, as of ADR-0038.** It was `plan.lateral` — the
           * join — for both of them, which put a broken hold's short hand directly over a spot
           * its arm could not span to, and the render stretched the arm to get it there. The
           * same over-reach was being charged for in the figure's width.
           */
          const standing =
            performanceOptions.sequence === undefined ? undefined : (under.stance ?? hold);
          const archHold: TouchHold | undefined =
            standing === undefined || plan === null || under.blend <= 0
              ? undefined
              : {
                  width: standing.width,
                  height: lerp(standing.height, plan.hands[mine].height, under.blend),
                  lateral: lerp(standing.lateral, plan.hands[mine].lateral, under.blend),
                  // An arm reaching overhead has nothing spare to spend going forward, so
                  // the standing hold's `forward` (ADR-0027) unwinds to zero as it rises.
                  forward: lerp(standing.forward, 0, under.blend),
                  // The arms are where the stance put them; raising the hold does not move
                  // a shoulder (ADR-0049).
                  insideBeau: standing.insideBeau,
                  insideBelle: standing.insideBelle,
                  // 🔑 **The upper arm stands up as fast as the hands climb** (ADR-0058). The
                  // arch's own blend, reused rather than a second easing: a hold that is half
                  // raised should be posed by an anatomy that is half raised, and anything with
                  // a threshold in it would pop the elbow across partway up.
                  raised: under.blend,
                };
          // 🧪 The exploratory hand-height and hands-forward dials (see `handHeight`,
          // `handForward`). Shared, not per-dancer — moving one for only one of them is the
          // arch/break mechanism above (`forearmY`), which pulls the hold apart on purpose;
          // these instead keep it the one point both still solve their own arm onto, just
          // moved. Two axes of the same move, so they compose in one spread.
          const baseHold = archHold ?? standing;
          const coupleHold: TouchHold | undefined =
            baseHold === undefined || (handHeight === 0 && handForward === 0)
              ? baseHold
              : {
                  ...baseHold,
                  height: baseHold.height + handHeight,
                  forward: baseHold.forward + handForward,
                };
          _ctx.hold = coupleHold;
          /*
           * A turned-in couple face ~2·turnIn apart, which `standingAsCouple`'s facing tolerance
           * can read as "not a couple". They are one by construction, so the hold is declared.
           *
           * 🔑 **And an arch declares the hand as well** (ADR-0056). `track.arch` is the hand
           * square-one's own `arch` span names, held for the life of the span; passing it means
           * the pose reads the figure's answer instead of re-deriving one from a bearing that a
           * turning dancer moves under. The turn-in dial has no span and no hand, so it stays a
           * bare `true` and goes on asking the placements — which is correct there, because
           * nobody is turning.
           */
          _ctx.declaredHold = track.arch ?? (archHold !== undefined || coupleYaw !== undefined);
          _ctx.coupleYaw = archHold === undefined ? coupleYaw : undefined;
          // The planned height for **this** dancer, eased in with the rest of the hold. Under
          // a break the two get different numbers and the forearms finish on different planes,
          // which is the hold coming apart — the same thing `archHold`'s two heights do.
          const forearmPlan = under.forearm;
          _ctx.forearmY =
            forearmPlan === null
              ? undefined
              : lerp(
                  gripHeight(baseMe, baseThem),
                  mine === "beau" ? forearmPlan.beauY : forearmPlan.belleY,
                  under.blend,
                );
          // Reported from the same call `poseArms` poses from, so the markers cannot
          // point at a hold the render did not draw.
          track.touch = touchingSide(_self, _partner, coupleHold, _ctx.declaredHold);
          resolveExpression(ex, _ctx);

          /**
           * Where each shoulder hangs this frame (ADR-0049). The **inside** arm of a couple
           * is tucked in to whatever room the stance left; every other arm keeps the
           * authored `restX`.
           *
           * 🔑 **The same number the hold was solved against.** `poseArms` poses the held arm
           * from `hold.insideBeau`/`insideBelle`, so the shoulder the rig draws has to be the
           * one the pose was measured from, or the undrawn upper arm comes out the wrong
           * length — ADR-0017's span reported as drift by the read-back below.
           */
          const shoulderX = (side: "left" | "right"): number =>
            coupleHold !== undefined && side === track.touch
              ? side === "right"
                ? coupleHold.insideBeau
                : coupleHold.insideBelle
              : me.restX;

          /*
           * 🔑 **A stretch belongs to the arm in the hold** (Ryan, 2026-10-11: *"the stretch
           * should only affect the forearm that is in the handhold, the other one should stay
           * unaffected"*). The figure's own reach (ADR-0040) lengthens `shape.forearm`, which is
           * one number for both arms, so the free arm is drawn back at its built length here;
           * the dials go on the held arm alone. With no arm held there is no reach to undo and
           * a dial moves both, so a slider is never dead.
           */
          const held: Side | null =
            track.touch ?? track.arch ?? (track.grip === "left" || track.grip === "right" ? track.grip : null);
          const figureForearm = shape.forearm.height - baseShape.forearm.height;
          // The torso dial, on top of whatever the figure and the emote resolved to. Clamped by
          // `growBody`, so `rise` is what the body took rather than what the slider asked.
          const dialBody = dialMe?.body ?? 0;
          const wornShape = dialBody === 0 ? ex.shape : growBody(ex.shape, dialBody);
          const rise = (wornShape.body.height - ex.shape.body.height) / 2;
          wornShapes.current[i] = wornShape;
          track.bodyDelta = myDelta + 2 * rise;
          track.forearmDelta = figureForearm + (dialMe?.forearm ?? 0);

          for (const side of SIDES) {
            const arm = arms[side].current;
            if (!arm) continue;
            const pose = ex.arms[side];
            const inHold = held === null || side === held;
            const dialUpper = inHold ? (dialMe?.upperArm ?? 0) : 0;
            const forearmLength = Math.max(
              MIN_DRAWN_FOREARM,
              me.drawnSpan - (inHold ? 0 : figureForearm) + (inHold ? (dialMe?.forearm ?? 0) : 0),
            );
            track.upperArmNatural[side] = Math.max(MIN_DRAWN_FOREARM, me.elbowReach + dialUpper);
            // The pose names the elbow in rig space; the group it goes on hangs inside
            // a shoulder pinned at `(±restX, restY, 0)`. ADR-0017 — and `+x` is the
            // anatomical **left** shoulder here, which is what `SIGN` carries.
            elbowLocal(_elbow, pose, me, SIGN[side], shoulderX(side));
            // The upper-arm dial: the same direction out of the shoulder, further along it, so
            // the forearm and hand go with the elbow.
            const upperNow = Math.hypot(_elbow.x, _elbow.y, _elbow.z);
            const upperScale =
              dialUpper === 0 || upperNow < 1e-6
                ? 1
                : Math.max(MIN_DRAWN_FOREARM, upperNow + dialUpper) / upperNow;
            arm.position.set(_elbow.x * upperScale, _elbow.y * upperScale, _elbow.z * upperScale);
            // The forearm's own mesh, which nothing was stretching: the hand has always been
            // seated at the worn length while the cylinder stayed the length it was built. It
            // hangs from the elbow (the group's origin), so it scales about its top.
            const fore = arm.children.find(
              (c): c is THREE.Mesh => (c as THREE.Mesh).geometry instanceof THREE.CylinderGeometry,
            );
            if (fore !== undefined) {
              fore.scale.y = forearmLength / baseShape.forearm.height;
              fore.position.y = -forearmLength / 2;
            }
            _aim.set(pose.aimX, pose.aimY, pose.aimZ);
            arm.quaternion.setFromUnitVectors(DOWN, _aim);

            /*
             * The wrist (ADR-0052): roll the palm level on its own forearm, bend across it
             * for the remainder, clamp at what a wrist does.
             *
             * 🔴 **2026-09-19: only the touch-hold's own hand spends a wrist.** `wristRotation`
             * turns the palm to face world-**up** (`target = (aimX, −aimY, aimZ)`), which is
             * only a sensible thing to ask of the hand that is actually resting flat on a
             * partner's palm. Ryan caught it by eye on the outside hand of a standing couple:
             * hanging straight down (`restPose`'s `aimY = −1`) is a perfectly well-defined
             * input — not the degenerate case the early-return in `wristRotation` guards
             * against — so it was never a no-op there, just a wrong, nonzero turn toward
             * "flat" that a hand doing nothing has no business taking. `track.touch` is the
             * same signal `shoulderX` above already gates the inside-arm tuck on, so this
             * reuses it rather than inventing a second notion of "is this hand held."
             *
             * 🔑 **Solved from the mesh's own drawn map**, which on this side is the
             * *mirrored* one — the hand inside the `right` forearm group wears
             * `handRotations(...).left`. Reading the same-named map instead would turn the
             * two mirrored characters' hands by the wrong roll, and every other character's
             * by exactly the right one, which is the kind of defect that hides for weeks.
             *
             * Composed onto the authored rotation rather than replacing it: the authored
             * value is the hand's rest pose and its character (Ember's `[-23,45,-14]` is why
             * her palm sits 74° off her forearm rather than 90°), and the wrist turns it from
             * there.
             */
            const hand = arms.hands[side].current;
            if (hand) {
              const touching = side === track.touch;
              const drawn = MIRRORED[side];
              const map = handDrawnMap(ex.shape.hand.open, drawn);
              if (touching) {
                _m3.fromArray(wristRotation(map, pose.aimX, pose.aimY, pose.aimZ));
                // `fromArray` reads column-major and the wrist is row-major, so this is the
                // transpose — the inverse rotation. Transposing back is one call and beats
                // shipping a second matrix convention into this file.
                _m4.setFromMatrix3(_m3).transpose();
                _q.setFromRotationMatrix(_m4);
              } else {
                _q.identity();
              }
              const r = handRotations(ex.shape.hand.open)[drawn];
              _e.set(r[0], r[1], r[2]);
              hand.quaternion.setFromEuler(_e).premultiply(_q);

              /*
               * 🔑 **And the hand's POSITION swings with the wrist too**, which until
               * 2026-09-13 it did not. `Dancer` seats the hand at `[0, handLocalY, 0]` — on
               * the forearm's own axis — so ADR-0052 turned a hand that stayed where the
               * forearm pointed. A real hand hangs off its wrist: the centre sits a fixed
               * distance along the hand's own axis, and that axis turns with the joint.
               *
               * Ryan's sketch is the statement of it — two palms stacked flat, projecting
               * forward past two meeting wrists, forearms angling back to their own bodies —
               * and it is why a forearm used to run through the partner's hand. On the
               * forearm's line, each dancer's wrist lands under the middle of the partner's
               * palm. Off the wrist, both arms are behind the wrists and both hands in front.
               *
               * The wrist sits at `drawnSpan` down the group's own `−y`; `handLie` is the
               * direction on from there, and it comes back as `(0, −1, 0)` whenever the wrist
               * is doing nothing — which is what keeps every arm that is not holding hands
               * exactly where it was. Asked outright now, via `touching`, rather than relied
               * on: identity aim gives the same `(0, −1, 0)`, but a hanging arm's aim is not
               * identity, it is vertical — a different input this function was never meant to
               * see.
               */
              const lie = touching ? handLie(map, pose.aimX, pose.aimY, pose.aimZ) : ([0, -1, 0] as const);
              const reach = me.forearmSpan - me.drawnSpan;
              hand.position.set(lie[0] * reach, -forearmLength + lie[1] * reach, lie[2] * reach);
            }
          }

          const parts = expressions[key];
          if (parts) {
            // The emote's jump, plus the lift that keeps a changed body standing on its own
            // bottom (ADR-0043). Measured against the shape the geometry was **built** from, so
            // it covers a reshape and an emote's `bodyHeightDelta` with one rule.
            rig.position.y =
              ex.bodyDeltaY + standingLift(baseShape, wornShape);

            const body = parts.body.current;
            if (body) {
              body.rotation.x = deg2rad(ex.shape.body.leanX);
              body.rotation.z = deg2rad(ex.shape.body.leanZ);
              // 🔴 **Against `baseShape`, which is the shape the geometry was built from** — the
              // one handed to `Dancer` — and *not* against the reshaped `shape` above. Dividing
              // the resolved height by the reshaped height is dividing a number by itself: the
              // scale came out `1` for the whole of every reshape, so a growing dancer's head and
              // shoulders lifted off a torso that never moved. See `bodyMeshScale`, which also
              // handles the capsule's caps.
              const { radial, height } = bodyMeshScale(baseShape, wornShape);
              body.scale.set(radial, height, radial);
            }

            // The head *group* — sphere and facing marker — so the turn is visible.
            // Its rotation is the emote's delta alone: a dancer deliberately does not
            // wear `shape.head.rotation`, which is caricature the dance scene drops.
            const head = parts.head.current;
            if (head) {
              head.position.set(
                ex.shape.head.offsetX,
                ex.headY + rise + ex.shape.head.offsetY,
                ex.shape.head.offsetZ,
              );
              head.rotation.set(
                deg2rad(ex.headRotation[0]),
                deg2rad(ex.headRotation[1]),
                deg2rad(ex.headRotation[2]),
              );
              // Same rule as the torso: relative to the built geometry, not the worn shape.
              head.scale.setScalar(ex.shape.head.radius / baseShape.head.radius);
            }

            // 🔴 The shoulders, which nothing was moving. `shoulderY` is
            // `bodyCenterY + height/2 + radius`, so a torso that changes height takes its
            // shoulders with it — and the body mesh has been scaling and the head group
            // following while the arms stayed at their mount-time height. Derived from the
            // resolved shape, exactly as the head above is; ADR-0017's rule is that no
            // driver *chooses* a shoulder, and this one is not choosing.
            for (const side of SIDES) {
              const shoulder = parts.shoulders[side].current;
              if (!shoulder) continue;
              shoulder.position.y = ex.shoulderY + rise;
              // 🔴 And sideways, for the same reason (ADR-0049): a dancer whose arms are
              // authored wider than the couple is standing draws them in, or the inside
              // shoulder hangs over the partner and the forearm through their hand. Still
              // not a driver *choosing* a shoulder — it is derived from the solved stance.
              shoulder.position.x = SIGN[side] * shoulderX(side);
            }
          }
        });

        // Read the arms back off the rigs, so the report is what is on screen rather
        // than what was intended — which is how the easing bug above was caught.
        keys.forEach((key, i) => {
          const rig = rigs[key]?.current;
          const arms = armRigs[key];
          const me = metrics[i];
          const track = tracked[key];
          if (!rig || !arms || !me || !track) return;
          readPlacement(_self, rig);
          for (const side of SIDES) {
            const arm = arms[side].current;
            if (!arm) continue;
            // Back out of the shoulder's frame into the rig's, so what is measured is
            // still what is on screen. The inverse of `elbowLocal`, and deliberately
            // spelled out rather than trusting the pose that was written.
            // 🔴 The shoulder's **live** height, not the metrics', because an arch reshapes
            // a torso and takes the shoulders with it. `me` here is the mount-time cast, and
            // reading `restY` off it would report every arm at the height it would have had
            // if nobody had grown — which is exactly the class of "measured the wrong shape"
            // this read-back exists to prevent.
            const shoulder = expressions[key]?.shoulders[side].current;
            _read.x =
              arm.position.x + (shoulder?.position.x ?? SIGN[side] * me.restX);
            _read.y = arm.position.y + (shoulder?.position.y ?? me.restY);
            _read.z = arm.position.z;
            _aim.copy(DOWN).applyQuaternion(arm.quaternion);
            _read.aimX = _aim.x;
            _read.aimY = _aim.y;
            _read.aimZ = _aim.z;
            trackForearm(track[side], me, _read, _self);
            // The undrawn upper arm, straight off the rig: the group's own position
            // *is* the elbow in the shoulder's frame, so its length is the span. No
            // world transform needed, and nothing here is taken on trust from the pose.
            track.upperArm[side] = Math.hypot(
              arm.position.x, arm.position.y, arm.position.z,
            );
          }
        });

        // Contacts. A grip is mutual: each dancer's hand is on the forearm their
        // partner engaged, so resolve one against the other's named side.
        keys.forEach((key, i) => {
          const partnerKey = keys[1 - i];
          const me = metrics[i];
          const track = tracked[key];
          const partnerTrack = partnerKey === undefined ? undefined : tracked[partnerKey];
          const them = metrics[1 - i];
          if (!me || !them || !track || !partnerTrack) return;
          const mine = track.grip;
          const theirs = partnerTrack.grip;
          if (mine === null || mine === "none" || theirs === null || theirs === "none") return;
          trackContact(
            track.contact,
            track[mine].hand,
            me.handRadius,
            partnerTrack[theirs],
            them.forearmHalfWidth,
          );
          track.holding = true;
        });

        const a = keys[0] === undefined ? null : rigs[keys[0]]?.current;
        const b = keys[1] === undefined ? null : rigs[keys[1]]?.current;
        if (a && b) {
          report.pivot.x = (a.position.x + b.position.x) / 2;
          report.pivot.y = 0;
          report.pivot.z = (a.position.z + b.position.z) / 2;
          report.separation = Math.hypot(
            a.position.x - b.position.x,
            a.position.z - b.position.z,
          );
        }
        /*
         * The rules (`pose-rules.ts`), asked of the pose that was just drawn. Read off the
         * meshes rather than off `tracked`, for the reason the read-back above gives — and
         * because a hand's place and turn are only settled on the mesh.
         */
        report.solids = null;
        report.findings = [];
        // Only when somebody is listening: this walks every mesh's world matrix.
        if (onArms !== undefined && keys.length === 2) {
          const pair = keys.map((key, i) => {
            const rig = rigs[key]?.current;
            const arms = armRigs[key];
            const parts = expressions[key];
            const me = worn.current[i] ?? metrics[i];
            const ex = resolved[i];
            if (!rig || !arms || !parts || !me || !ex) return null;
            const natural = keys[i] === undefined ? undefined : tracked[keys[i]]?.upperArmNatural;
            return readSolids(rig, arms, parts, natural ?? { left: me.elbowReach, right: me.elbowReach });
          });
          const [p0, p1] = pair;
          const t0 = keys[0] === undefined ? undefined : tracked[keys[0]];
          const t1 = keys[1] === undefined ? undefined : tracked[keys[1]];
          const s0 = occupantShapes[0];
          const s1 = occupantShapes[1];
          const w0 = wornShapes.current[0] ?? resolved[0]?.shape;
          const w1 = wornShapes.current[1] ?? resolved[1]?.shape;
          if (p0 && p1 && t0 && t1 && s0 && s1 && w0 && w1) {
            const hand = (g: GripHand): Side | null => (g === "left" || g === "right" ? g : null);
            // Where a torso bottoms out standing on the floor **in the shape it is wearing**:
            // the built shape's bottom is the floor (ADR-0043's lift keeps it there upright),
            // and a leaning torso's lowest point is raised by its own tilt.
            const standY = (built: CharacterBodyShape, wornShape: CharacterBodyShape) => {
              const upright =
                Math.cos(deg2rad(wornShape.body.leanX)) * Math.cos(deg2rad(wornShape.body.leanZ));
              return (
                NPC_BODY_CENTER_Y - built.body.height / 2 - built.body.radius +
                (wornShape.body.height / 2) * (1 - upright)
              );
            };
            const styles = (turnUnder ?? []).filter((t): t is TurnUnderStyle => t != null);
            report.solids = [p0, p1];
            report.findings = measurePose([p0, p1], {
              joined: [t0.arch ?? t0.touch, t1.arch ?? t1.touch],
              raised: [t0.arch, t1.arch],
              gripped: [hand(t0.grip), hand(t1.grip)],
              // 🔑 **Asked of the style, not of the draw.** A style that keeps contact
              // (`full-l`, `duck-under`, `casual`) is owed joined hands whichever accommodation
              // the coin flip gave it — and it can be given a break (ADR-0037 draws one half the
              // time), which is exactly the pose this rule should be loudest about. Ryan,
              // 2026-10-11, of "the L": *"forearms aren't even close now."* Only with no style
              // set does the draw decide, since then a break is all anyone asked for.
              keepsContact:
                styles.length > 0 ? styles.every(styleKeepsContact) : t0.accommodation !== BREAK,
              standY: [standY(s0, w0), standY(s1, w1)],
            });
          }
        }
        report.beat = beat;
        onArms?.(report);
      }
    }

    onBeat?.(runtime.beat(), runtime.beats);
  });

  return (
    <>
      {keys.map((key, i) => {
        const rig = rigs[key];
        if (!rig) return null;
        return (
          <Dancer
            key={key}
            rig={rig}
            shape={occupantShapes[i] ?? DEFAULT_SHAPES[0]}
            color={DEBUG_COLORS[i % DEBUG_COLORS.length]}
            {...(armRigs[key] === undefined ? {} : { arms: armRigs[key] })}
            {...(expressions[key] === undefined ? {} : { expression: expressions[key] })}
          />
        );
      })}
    </>
  );
}

export type { WorldPoint };
