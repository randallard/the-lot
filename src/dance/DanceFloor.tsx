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

import { createRef, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  Dancer,
  type DancerArmRigs,
  type DancerExpressionRigs,
  type DancerRig,
} from "./Dancer";
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
} from "./arm-pose";
import {
  facingToRotationY,
  makeFrame,
  refit,
  scaleForGaps,
  toWorld,
  type DanceFrame,
  type WorldPoint,
} from "./frame";
import { COUPLE_WIDTH } from "square-one";
import { archClearance, planArch, type ArchPlan } from "./arch";
import {
  BREAK,
  drawAccommodation,
  growBody,
  type Accommodation,
} from "./accommodation";
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
  deg2rad,
  lateralClearance,
  rigidParts,
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
}

const DEFAULT_SHAPES = [MYCO_DEFAULTS, EMBER_DEFAULTS] as const;
const DEBUG_COLORS = ["#e2725b", "#5b8ce2"] as const;

const SIDES = ["left", "right"] as const;

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

/** Every pair's height-aware side-by-side clearance (ADR-0012) — the lane
 *  arithmetic's input, and the arm tuck's proximity yardstick. */
function clearanceGaps(shapes: readonly CharacterBodyShape[]): number[] {
  const parts = shapes.map((s) => rigidParts(s));
  const gaps: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i];
      const b = parts[j];
      if (a && b) gaps.push(lateralClearance(a, b));
    }
  }
  return gaps;
}

export function DanceFloor({
  origin = { x: 0, z: 0 },
  scale,
  yaw = 0,
  shapes = DEFAULT_SHAPES,
  followDrift = false,
  paused = false,
  home = 0,
  onBeat,
  onArms,
  controllers,
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
    // hold is not symmetric in the pair — its height is the belle's waist and its lateral
    // offset is signed toward her — so the order matters here in a way the width alone
    // never did.
    return touchHold(armMetrics(a), armMetrics(b));
  }, [shapes]);

  const coupleWidthWorld =
    hold?.width ?? COUPLE_WIDTH * (scale ?? scaleForGaps(clearanceGaps([...shapes])));

  const coupleWidthEngine = useMemo(
    () => coupleWidthWorld / (scale ?? scaleForGaps(clearanceGaps([...shapes]))),
    [coupleWidthWorld, scale, shapes],
  );

  /**
   * How far apart the pair must pass **under an arch**, in engine units — the second half of
   * the seam `coupleWidth` is (square-one ADR-0018).
   *
   * `undefined` for a floor with no couple, and for a cast this floor cannot resolve two shapes
   * for: the engine's default is the arc's own radius, which is what everything did before.
   */
  const archClearanceEngine = useMemo(() => {
    const a = shapes[0];
    const b = shapes[1];
    if (a === undefined || b === undefined || hold === undefined) return undefined;
    const scaleNow = scale ?? scaleForGaps(clearanceGaps([...shapes]));
    return archClearance(armMetrics(a), armMetrics(b), a, b, hold.width) / scaleNow;
  }, [shapes, hold, scale]);

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
    const scaleNow = scale ?? scaleForGaps(clearanceGaps([...shapes]));
    return lateralClearance(rigidParts(a), rigidParts(b)) / scaleNow;
  }, [shapes, scale]);

  const runtime = useDancePerformance({
    ...performanceOptions,
    coupleWidth: coupleWidthEngine,
    ...(clearanceEngine === undefined ? {} : { clearance: clearanceEngine }),
    ...(archClearanceEngine === undefined ? {} : { archClearance: archClearanceEngine }),
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

  // The pairwise clearances that set the square's spacing. The arm envelope no
  // longer reads them: it splits the pair's *live* separation by body radius, which
  // resolves to the same bound at the closest pass and relaxes as they part.
  const gaps = useMemo(() => clearanceGaps(occupantShapes), [occupantShapes]);

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
    for (const key of keys) map[key] = { left: createRef(), right: createRef() };
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
    /** 0 hands down and shapes unchanged, 1 fully into the arch. */
    blend: number;
  }>({ span: null, accommodation: BREAK, plan: null, blend: 0 });

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
    }),
    [keys, tracked],
  );

  const frameRef = useRef<DanceFrame>(makeFrame(origin, scale ?? scaleForGaps(gaps), yaw));

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

  useFrame((state, delta) => {
    // A home request outranks the pause — it is the one thing that must move the
    // dancers while the clock is frozen — and it is consumed here, so a bump of the
    // token buys exactly one pass however long the floor then sits paused.
    const goingHome = home !== homeSeen.current;
    homeSeen.current = home;

    if (goingHome || !paused) {
      // Guard against tab-restore producing an enormous delta and teleporting the
      // square across the floor. Going home takes no time at all: the whole point is
      // to land on beat 0 rather than to travel there.
      const dt = goingHome ? 0 : Math.min(delta, 0.1);
      const states = goingHome ? runtime.home() : runtime.advance(dt);

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
        // join would still be drawn holding.
        const ease = goingHome ? 1 : Math.min(1, dt * 10);

        /*
         * The arch (square-one's ADR-0017), resolved for the **pair** before either dancer
         * is posed — it is one hold, one accommodation and one plan, and a per-dancer answer
         * would be two dancers negotiating separately about the same pair of hands.
         *
         * The span identity is its beat range: a second California Twirl in a sequence is a
         * second execution and gets its own draw, which is the whole point of the draw.
         */
        const first = keys[0];
        const archSpan =
          first === undefined
            ? undefined
            : runtime.motions[first]?.grips.find(
                (g) => g.grip === "arch" && beat >= g.from && beat <= g.to,
              );
        const under = arch.current;
        if (archSpan === undefined) {
          under.span = null;
        } else {
          const id = `${String(archSpan.from)}:${String(archSpan.to)}`;
          if (under.span !== id) {
            under.span = id;
            under.accommodation = drawAccommodation();
            const beauM = metrics[0];
            const belleM = metrics[1];
            const beauS = occupantShapes[0];
            const belleS = occupantShapes[1];
            under.plan =
              beauM && belleM && beauS && belleS && hold
                ? planArch(beauM, belleM, beauS, belleS, hold.width, under.accommodation)
                : null;
          }
        }
        // Eased like a grip and snapped like one: a shape a hair off its target is a torso
        // that never quite finishes moving, and it would be drawn every frame for as long
        // as the dancers stand still afterwards.
        {
          const target = archSpan === undefined ? 0 : 1;
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
          const myDelta = plan === null ? 0 : plan.bodyDeltas[mine] * under.blend;
          const theirDelta = plan === null ? 0 : plan.bodyDeltas[theirs] * under.blend;
          const shape = myDelta === 0 ? baseShape : growBody(baseShape, myDelta);
          const me = myDelta === 0 ? baseMe : armMetrics(shape);
          const them =
            theirDelta === 0 ? baseThem : armMetrics(growBody(partnerShape, theirDelta));
          track.bodyDelta = myDelta;

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
           * **One `TouchHold`, two heights.** Everything about an arch that differs from a
           * standing handhold is already expressible here — it is higher, it is not carried
           * forward of the bodies, and it sits between the same two shoulders — so this is a
           * different hold rather than a different mechanism, and `poseArms` needs no branch
           * for it. The one thing that is new is that the two dancers may be given
           * **different heights**: under a break each reaches their own ceiling, and hands
           * that are not on the same plane are hands that have come apart. That is the whole
           * of "the hold breaks", and it is a number rather than a special case.
           */
          const standing = performanceOptions.sequence === undefined ? undefined : hold;
          const archHold: TouchHold | undefined =
            standing === undefined || plan === null || under.blend <= 0
              ? undefined
              : {
                  width: standing.width,
                  height: lerp(standing.height, plan.hands[mine], under.blend),
                  lateral: lerp(standing.lateral, plan.lateral, under.blend),
                  // An arm reaching overhead has nothing spare to spend going forward, so
                  // the standing hold's `forward` (ADR-0027) unwinds to zero as it rises.
                  forward: lerp(standing.forward, 0, under.blend),
                };
          const coupleHold = archHold ?? standing;
          _ctx.hold = coupleHold;
          _ctx.declaredHold = archHold !== undefined;
          // Reported from the same call `poseArms` poses from, so the markers cannot
          // point at a hold the render did not draw.
          track.touch = touchingSide(_self, _partner, coupleHold, archHold !== undefined);
          resolveExpression(ex, _ctx);

          for (const side of SIDES) {
            const arm = arms[side].current;
            if (!arm) continue;
            const pose = ex.arms[side];
            // The pose names the elbow in rig space; the group it goes on hangs inside
            // a shoulder pinned at `(±restX, restY, 0)`. ADR-0017 — and `+x` is the
            // anatomical **left** shoulder here, which is what `SIGN` carries.
            elbowLocal(_elbow, pose, me, SIGN[side]);
            arm.position.set(_elbow.x, _elbow.y, _elbow.z);
            _aim.set(pose.aimX, pose.aimY, pose.aimZ);
            arm.quaternion.setFromUnitVectors(DOWN, _aim);
          }

          const parts = expressions[key];
          if (parts) {
            rig.position.y = ex.bodyDeltaY;

            const body = parts.body.current;
            if (body) {
              body.rotation.x = deg2rad(ex.shape.body.leanX);
              body.rotation.z = deg2rad(ex.shape.body.leanZ);
              const rs = ex.shape.body.radius / shape.body.radius;
              const hs = ex.shape.body.height / shape.body.height;
              body.scale.set(rs, hs, rs);
            }

            // The head *group* — sphere and facing marker — so the turn is visible.
            // Its rotation is the emote's delta alone: a dancer deliberately does not
            // wear `shape.head.rotation`, which is caricature the dance scene drops.
            const head = parts.head.current;
            if (head) {
              head.position.set(
                ex.shape.head.offsetX,
                ex.headY + ex.shape.head.offsetY,
                ex.shape.head.offsetZ,
              );
              head.rotation.set(
                deg2rad(ex.headRotation[0]),
                deg2rad(ex.headRotation[1]),
                deg2rad(ex.headRotation[2]),
              );
              head.scale.setScalar(ex.shape.head.radius / shape.head.radius);
            }

            // 🔴 The shoulders, which nothing was moving. `shoulderY` is
            // `bodyCenterY + height/2 + radius`, so a torso that changes height takes its
            // shoulders with it — and the body mesh has been scaling and the head group
            // following while the arms stayed at their mount-time height. Derived from the
            // resolved shape, exactly as the head above is; ADR-0017's rule is that no
            // driver *chooses* a shoulder, and this one is not choosing.
            for (const side of SIDES) {
              const shoulder = parts.shoulders[side].current;
              if (shoulder) shoulder.position.y = ex.shoulderY;
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
            _read.x = arm.position.x + SIGN[side] * me.restX;
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
