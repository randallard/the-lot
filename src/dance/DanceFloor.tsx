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
  armPoses,
  contact,
  type ArmPoses,
  forearm,
  gripBlend,
  poseArms,
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
import { useDancePerformance, type DancePerformanceOptions } from "./useDancePerformance";
import type { AnimationController } from "../services/animation-controller";
import { NEUTRAL_POSE, type ResolvedPose } from "../services/emotes";
import {
  MYCO_DEFAULTS,
  EMBER_DEFAULTS,
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
  readonly left: Forearm;
  readonly right: Forearm;
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

// Scratch objects for per-frame arm posing — allocated once, never per frame.
const DOWN = new THREE.Vector3(0, -1, 0);
const _poses = armPoses();
const _read = armPose();
const _self: Placement = { x: 0, z: 0, yaw: 0 };
const _partner: Placement = { x: 0, z: 0, yaw: 0 };
const _aim = new THREE.Vector3();

const _proposed = armPoses();
const _euler = new THREE.Euler();
const _swing = new THREE.Vector3();

/**
 * The expression layer's arms, restated as poses the dance layer can reason about.
 *
 * An emote gives an arm a *rotation* about the shoulder; the dance layer works in
 * where the arm ends up. Same rig either way — one group per shoulder — so this is a
 * change of description, not of pose: the group stays at rest and the aim is the
 * emote's own rotation applied to the resting hang.
 *
 * Emote arm names are viewer-mirrored: they were authored against the player rig,
 * where "left" is the group at −x, and −x is a dancer's anatomical *right*.
 */
function proposeArms(out: ArmPoses, m: ArmMetrics, rp: ResolvedPose): ArmPoses {
  for (const side of SIDES) {
    const sign = side === "left" ? 1 : -1;
    const from = side === "left" ? rp.rightArm : rp.leftArm;
    const target = out[side];
    target.x = sign * m.restX;
    target.y = m.restY;
    target.z = 0;
    _euler.set(
      deg2rad(from.upperArmRotation[0]),
      deg2rad(from.upperArmRotation[1]),
      deg2rad(from.upperArmRotation[2]),
    );
    _swing.copy(DOWN).applyEuler(_euler);
    target.aimX = _swing.x;
    target.aimY = _swing.y;
    target.aimZ = _swing.z;
  }
  return out;
}

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
  onBeat,
  onArms,
  controllers,
  ...performanceOptions
}: DanceFloorProps) {
  const runtime = useDancePerformance(performanceOptions);
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
        left: forearm(),
        right: forearm(),
        contact: contact(),
        holding: false,
      };
    }
    return map;
  }, [keys]);

  // Body and head refs, for the channels an emote owns outright.
  const expressions = useMemo(() => {
    const map: Record<string, DancerExpressionRigs> = {};
    for (const key of keys) map[key] = { body: createRef(), head: createRef() };
    return map;
  }, [keys]);

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

  useFrame((state, delta) => {
    if (!paused) {
      // Guard against tab-restore producing an enormous delta and teleporting the
      // square across the floor.
      const dt = Math.min(delta, 0.1);
      const states = runtime.advance(dt);

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
        const ease = Math.min(1, dt * 10);

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
          const me = metrics[i];
          const them = metrics[1 - i];
          const track = tracked[key];
          const blend = blends[key];
          if (!rig || !partner || !arms || !me || !them || !track || !blend) return;

          const grip = runtime.motions[key]?.grips.find(
            (g) => beat >= g.from && beat <= g.to,
          );
          track.grip = grip?.hand ?? null;
          track.holding = false;
          advanceGripBlend(blend, track.grip, ease);

          readPlacement(_self, rig);
          readPlacement(_partner, partner);

          // The expression layer, if this dancer has one. Its arms are a *proposal*
          // — `poseArms` folds them in where they trespass and drops them entirely
          // on a hand the engine has engaged.
          // `NEUTRAL_POSE` when this dancer has no expression layer, so the code
          // path is the same either way: a neutral proposal is the resting hang, and
          // a stopped emote cannot leave a channel stuck where it left it.
          const rp = controllers?.[i]?.tick(state.clock.elapsedTime) ?? NEUTRAL_POSE;
          const poses = poseArms(
            _poses,
            me,
            them,
            _self,
            _partner,
            blend,
            proposeArms(_proposed, me, rp),
          );

          for (const side of SIDES) {
            const arm = arms[side].current;
            if (!arm) continue;
            const pose = poses[side];
            arm.position.set(pose.x, pose.y, pose.z);
            _aim.set(pose.aimX, pose.aimY, pose.aimZ);
            arm.quaternion.setFromUnitVectors(DOWN, _aim);
          }

          // Expression channels: an emote owns these outright, because none of them
          // can break a formation. Note what is *not* here — `bodyDeltaRotY`. A spin
          // emote may not turn a dancer in a square; facing belongs to the
          // choreography, and dropping the channel is the whole of that rule.
          const parts = expressions[key];
          if (parts) {
            rig.position.y = rp.bodyDeltaY;
            const body = parts.body.current;
            if (body) {
              body.rotation.x = deg2rad(occupantShapes[i]?.body.leanX ?? 0) + deg2rad(rp.bodyLeanX);
              body.rotation.z = deg2rad(occupantShapes[i]?.body.leanZ ?? 0) + deg2rad(rp.bodyLeanZ);
            }
            // The head *group* — sphere and facing marker — so the turn is visible.
            const head = parts.head.current;
            if (head) {
              head.rotation.set(
                deg2rad(rp.headDeltaRotation[0]),
                deg2rad(rp.headDeltaRotation[1]),
                deg2rad(rp.headDeltaRotation[2]),
              );
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
            _read.x = arm.position.x;
            _read.y = arm.position.y;
            _read.z = arm.position.z;
            _aim.copy(DOWN).applyQuaternion(arm.quaternion);
            _read.aimX = _aim.x;
            _read.aimY = _aim.y;
            _read.aimZ = _aim.z;
            trackForearm(track[side], me, _read, _self);
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
