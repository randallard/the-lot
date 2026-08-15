/**
 * Runs a fist bump between the player and an NPC — the first two-body contact in this
 * game that is not inside a square.
 *
 * Renders nothing. It is a component only because it needs `useFrame`, which means it
 * has to live inside the `<Canvas>`; everything it decides comes from
 * [`fist-bump.ts`](fist-bump.ts), which is pure and tested without a renderer.
 *
 * ## Why this exists rather than an emote
 *
 * `DanceFloor` already drives two-body contact, but only for dancers it owns
 * outright. `Player` and `Npc` are independent components that each run their own
 * frame loop and pose their own arms, so nobody was in a position to write both. That
 * is the gap planning ADR-0009 called the real integration, and it is what this is.
 *
 * ## What it takes over, and gives back
 *
 * For the length of a bump it **owns one arm on each character** — ADR-0010's
 * owned-channel rule, applied outside a square. `drivenArms` tells `Player` to stop
 * writing that side from the emote pose, so the two are never fighting for the same
 * group; the NPC has no arm animation of its own, so it only needs the pose. When the
 * envelope finishes, ownership is released and the next frame of ordinary posing puts
 * the arm back.
 *
 * Right hand to right hand, on the handshake convention: facing each other, both right
 * hands land on the same side of the axis between them, which is why the contact point
 * needs no lateral offset.
 *
 * ## The blend is toward rest, and the hold is exact
 *
 * `blendPose` runs between the resting hang and the contact pose, and at `t === 1` the
 * contact pose is written **exactly**. That is the sliding-grip lesson: easing *through*
 * a contact window is how a defect looks right and measures wrong, so the extend and
 * withdraw ease and the hold does not.
 *
 * Contact is resolved every frame rather than frozen at the start, because either
 * character may still be drifting when the bump begins.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  armPose,
  elbowLocal,
  vec3,
  type ArmMetrics,
  type ArmPose,
  type Placement,
  type Vec3,
} from "./arm-pose";
import { bumpContact, envelopeWith, type BumpEnvelope } from "./fist-bump";
import {
  OPEN_TO_EVERYTHING,
  availability,
  fistBumpMove,
  metricsFor,
  resolveRole,
  restSign,
  totalSeconds,
  type Availability,
  type ComfortPreferences,
  type ContactMove,
  type RigHandedness,
  type RoleResolution,
  type RoleScratch,
} from "./contact-move";
import { NPC_BODY_CENTER_Y, PLAYER_BODY_CENTER_Y, type CharacterBodyShape } from "../services/body-shapes";

/** A bump the player has asked for. Cleared by the driver when it finishes. */
export interface BumpRequest {
  /** Wall-clock ms when it started, or `null` for "nothing running". */
  startedAt: number | null;
}

export interface FistBumpDriverProps {
  request: React.RefObject<BumpRequest>;
  playerRig: React.RefObject<THREE.Group | null>;
  npcRig: React.RefObject<THREE.Group | null>;
  /**
   * The **forearm** groups this driver poses — the elbow and everything below it.
   *
   * Not the shoulders: those are pinned by `Player`/`Npc` and have no ref, so a bump can
   * bend an arm and cannot detach one (ADR-0017).
   */
  playerForearm: React.RefObject<THREE.Group | null>;
  npcForearm: React.RefObject<THREE.Group | null>;
  /** Set while the driver owns the player's arm, so `Player` leaves it alone. */
  drivenArms: React.RefObject<{ left: boolean; right: boolean }>;
  /**
   * Which key of `drivenArms` corresponds to the arm this driver is writing.
   *
   * Supplied rather than derived, because `Player`/`Npc` name their `+x` group `"right"`
   * while `+x` is anatomically the *left* arm — see {@link RigHandedness}. The caller
   * hands over the matching group and the matching key together, so the driver never has
   * to reason about the naming.
   */
  drivenKey?: "left" | "right";
  playerShape: CharacterBodyShape;
  npcShape: CharacterBodyShape;
  /**
   * The move to play. Defaults to the built-in fist bump.
   *
   * The player is role **A** and the NPC role **B**, which is the only casting decision
   * this driver makes; everything else about the gesture is authored.
   */
  move?: ContactMove;
  /**
   * Written every frame with whether this move is currently on offer, for the wheel.
   *
   * Published across the ref boundary (ADR-0002) because the predicate needs **yaw**, and
   * yaw lives on the rigs inside the `<Canvas>` — the DOM side has the player's `x`/`z`
   * and nothing else. Kept up to date while idle too, so the answer is already correct on
   * the render that opens the wheel.
   */
  availabilityRef?: React.RefObject<Availability>;
  /** This player's stance on what may be done with them. */
  playerComfort?: ComfortPreferences;
  /** The NPC's. */
  npcComfort?: ComfortPreferences;
  /**
   * Fired on each transition into and out of a running bump.
   *
   * Exists so the two characters can *draw* the hand the move is solved on. Called only
   * when it changes, never per frame — it drives React state.
   */
  onActiveChange?: (active: boolean) => void;
  /** Fired once when a bump completes, for whatever wants to record it. */
  onDone?: () => void;
}

const DEFAULT_MOVE = fistBumpMove();

/**
 * A character at yaw 0 faces `+z`, so its anatomical **right** arm is at `-x`.
 *
 * True of every rig here. `Player`/`Npc` merely *call* their `+x` group "right" — see
 * {@link RigHandedness} — which is why `World` hands this driver the group those
 * components name `left`, together with the matching `drivenKey`.
 */
const PLAYER_NPC_RIG: RigHandedness = "left-positive";

/** The rig's resting aim: straight down, which is what `restPose` returns. */
const DOWN = new THREE.Vector3(0, -1, 0);

function readPlacement(out: Placement, rig: THREE.Group): void {
  out.x = rig.position.x;
  out.z = rig.position.z;
  out.yaw = rig.rotation.y;
}

/**
 * Write one side's pose onto its **forearm** group, the way `DanceFloor` does.
 *
 * The group hangs inside a shoulder pinned at `(±restX, restY, 0)` and the pose is
 * rig-local, so the elbow has to come back into the shoulder's frame first —
 * {@link elbowLocal}, named rather than inlined for the reason that function gives.
 * `sign` is the same one the pose was solved with; passing a different one would put a
 * correctly-solved arm on the wrong shoulder.
 */
function applyPose(
  group: THREE.Group,
  pose: ArmPose,
  m: ArmMetrics,
  sign: number,
  elbow: Vec3,
  aim: THREE.Vector3,
): void {
  elbowLocal(elbow, pose, m, sign);
  group.position.set(elbow.x, elbow.y, elbow.z);
  aim.set(pose.aimX, pose.aimY, pose.aimZ);
  group.quaternion.setFromUnitVectors(DOWN, aim);
}

export function FistBumpDriver({
  request,
  playerRig,
  npcRig,
  playerForearm,
  npcForearm,
  drivenArms,
  playerShape,
  npcShape,
  move = DEFAULT_MOVE,
  availabilityRef,
  drivenKey = "right",
  playerComfort = OPEN_TO_EVERYTHING,
  npcComfort = OPEN_TO_EVERYTHING,
  onActiveChange,
  onDone,
}: FistBumpDriverProps) {
  // Frame-loop scratch, allocated once. The dance code's convention, and the reason
  // this can run every frame without churning the heap.
  const scratch = useRef({
    env: { t: 0, touching: false, done: false } as BumpEnvelope,
    self: { x: 0, z: 0, yaw: 0 } as Placement,
    other: { x: 0, z: 0, yaw: 0 } as Placement,
    role: { local: { x: 0, z: 0, yaw: 0 }, rest: armPose() } as RoleScratch,
    out: { pose: armPose(), side: "right", contact: bumpContact() } as RoleResolution,
    aim: new THREE.Vector3(),
    elbow: vec3(),
    metrics: null as { player: ArmMetrics; npc: ArmMetrics } | null,
    shapes: null as { player: CharacterBodyShape; npc: CharacterBodyShape } | null,
    origins: { player: NaN, npc: NaN },
    constraintId: "",
    owning: false,
    announced: false,
  });

  useFrame(() => {
    const s = scratch.current;
    const req = request.current;
    const driven = drivenArms.current;
    const pRig = playerRig.current;
    const nRig = npcRig.current;
    const pArm = playerForearm.current;
    const nArm = npcForearm.current;

    if (!req || !driven) return;
    if (!pRig || !nRig || !pArm || !nArm) return;

    // One constraint today. The schema is a list because a star is four contacts at one
    // point and a wave is a chain, but nothing authored needs more than one yet, and a
    // driver that pretended otherwise would be untested speculation.
    const constraint = move.constraints[0];
    if (!constraint) return;

    // Metrics are derived from body shapes, which the editor can change mid-session, and
    // from the *authored* hand shape, which the editor can also change — so they are
    // cached against all of it rather than computed once at mount.
    //
    // Each rig declares its **world Y**, because `gripHeight` answers in world space and
    // these two rigs do not share a frame (`Player`'s group sits at `BASE_Y`, `Npc`'s at
    // 0). Read off the live rig rather than assumed, so a jumping player still bumps
    // level. `metricsFor` carries the authored hand through, which is what makes a fist
    // bump measure as a fist.
    const pOriginY = pRig.position.y;
    const nOriginY = nRig.position.y;
    if (
      !s.shapes ||
      s.shapes.player !== playerShape ||
      s.shapes.npc !== npcShape ||
      s.origins.player !== pOriginY ||
      s.origins.npc !== nOriginY ||
      s.constraintId !== constraint.id
    ) {
      s.shapes = { player: playerShape, npc: npcShape };
      s.origins = { player: pOriginY, npc: nOriginY };
      s.constraintId = constraint.id;
      s.metrics = {
        player: metricsFor(constraint, "A", playerShape, PLAYER_BODY_CENTER_Y, pOriginY),
        npc: metricsFor(constraint, "B", npcShape, NPC_BODY_CENTER_Y, nOriginY),
      };
    }
    const m = s.metrics;
    if (!m) return;

    readPlacement(s.self, pRig);
    readPlacement(s.other, nRig);

    // Published whether or not a bump is running, so the wheel's answer is already
    // current on the render that opens it. This is what greys the wedge out instead of
    // letting the move stretch — the unwired `canBump` the M5 handover flagged, and the
    // thing that makes the far-apart screenshot unreachable.
    if (availabilityRef?.current) {
      availability(
        move, m.player, m.npc, s.self, s.other, playerComfort, npcComfort,
        availabilityRef.current,
      );
    }

    // Nothing running: release the arm exactly once, then stay out of the way.
    if (req.startedAt === null) {
      if (s.owning) {
        driven.left = false;
        driven.right = false;
        s.owning = false;
      }
      if (s.announced) {
        s.announced = false;
        onActiveChange?.(false);
      }
      return;
    }

    const elapsed = (performance.now() - req.startedAt) / 1000;
    envelopeWith(elapsed, move.envelope.extend, move.envelope.hold, move.envelope.withdraw, s.env);

    if (s.env.done || elapsed > totalSeconds(move.envelope)) {
      req.startedAt = null;
      driven.left = false;
      driven.right = false;
      s.owning = false;
      if (s.announced) {
        s.announced = false;
        onActiveChange?.(false);
      }
      onDone?.();
      return;
    }

    // Player is role A, NPC is role B. `resolveRole` localises the partner and resolves
    // the contact from `SELF`, so each answer comes back in that character's own rig
    // space — which is what the arm group wants.
    const a = resolveRole(
      s.out, s.role, move, constraint, "A", m.player, m.npc, s.self, s.other, s.env.t,
      PLAYER_NPC_RIG,
    );
    // Claim the authored side for the duration. Claimed every frame rather than once, so
    // a shape change or a remount cannot leave `Player` writing a side the driver is also
    // writing.
    driven[drivenKey] = true;
    s.owning = true;
    if (!s.announced) {
      s.announced = true;
      onActiveChange?.(true);
    }
    applyPose(pArm, a.pose, m.player, restSign(PLAYER_NPC_RIG, a.side), s.elbow, s.aim);

    const b = resolveRole(
      s.out, s.role, move, constraint, "B", m.npc, m.player, s.other, s.self, s.env.t,
      PLAYER_NPC_RIG,
    );
    applyPose(nArm, b.pose, m.npc, restSign(PLAYER_NPC_RIG, b.side), s.elbow, s.aim);
  });

  return null;
}
