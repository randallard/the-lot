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
  armMetrics,
  armPose,
  blendPose,
  restPose,
  type ArmMetrics,
  type ArmPose,
  type Placement,
} from "./arm-pose";
import {
  SELF,
  TOTAL_SECONDS,
  bumpContact,
  bumpPose,
  envelopeAt,
  localPartner,
  resolveContact,
  type BumpEnvelope,
} from "./fist-bump";
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
  playerArm: React.RefObject<THREE.Group | null>;
  npcArm: React.RefObject<THREE.Group | null>;
  /** Set while the driver owns the player's arm, so `Player` leaves it alone. */
  drivenArms: React.RefObject<{ left: boolean; right: boolean }>;
  playerShape: CharacterBodyShape;
  npcShape: CharacterBodyShape;
  /** Fired once when a bump completes, for whatever wants to record it. */
  onDone?: () => void;
}

/** The rig's resting aim: straight down, which is what `restPose` returns. */
const DOWN = new THREE.Vector3(0, -1, 0);

function readPlacement(out: Placement, rig: THREE.Group): void {
  out.x = rig.position.x;
  out.z = rig.position.z;
  out.yaw = rig.rotation.y;
}

/** Write one side's pose onto its group, the way `DanceFloor` does. */
function applyPose(group: THREE.Group, pose: ArmPose, aim: THREE.Vector3): void {
  group.position.set(pose.x, pose.y, pose.z);
  aim.set(pose.aimX, pose.aimY, pose.aimZ);
  group.quaternion.setFromUnitVectors(DOWN, aim);
}

export function FistBumpDriver({
  request,
  playerRig,
  npcRig,
  playerArm,
  npcArm,
  drivenArms,
  playerShape,
  npcShape,
  onDone,
}: FistBumpDriverProps) {
  // Frame-loop scratch, allocated once. The dance code's convention, and the reason
  // this can run every frame without churning the heap.
  const scratch = useRef({
    env: { t: 0, touching: false, done: false } as BumpEnvelope,
    contact: bumpContact(),
    self: { x: 0, z: 0, yaw: 0 } as Placement,
    other: { x: 0, z: 0, yaw: 0 } as Placement,
    local: { x: 0, z: 0, yaw: 0 } as Placement,
    pose: armPose(),
    rest: armPose(),
    aim: new THREE.Vector3(),
    metrics: null as { player: ArmMetrics; npc: ArmMetrics } | null,
    shapes: null as { player: CharacterBodyShape; npc: CharacterBodyShape } | null,
    owning: false,
  });

  useFrame(() => {
    const s = scratch.current;
    const req = request.current;
    const driven = drivenArms.current;
    const pRig = playerRig.current;
    const nRig = npcRig.current;
    const pArm = playerArm.current;
    const nArm = npcArm.current;

    if (!req || !driven) return;

    // Nothing running: release the arm exactly once, then stay out of the way.
    if (req.startedAt === null) {
      if (s.owning) {
        driven.left = false;
        driven.right = false;
        s.owning = false;
      }
      return;
    }

    if (!pRig || !nRig || !pArm || !nArm) return;

    // Metrics are derived from body shapes, which the editor can change mid-session,
    // so they are cached against the shapes rather than computed once at mount.
    if (!s.shapes || s.shapes.player !== playerShape || s.shapes.npc !== npcShape) {
      s.shapes = { player: playerShape, npc: npcShape };
      s.metrics = {
        player: armMetrics(playerShape, PLAYER_BODY_CENTER_Y),
        npc: armMetrics(npcShape, NPC_BODY_CENTER_Y),
      };
    }
    const m = s.metrics;
    if (!m) return;

    const elapsed = (performance.now() - req.startedAt) / 1000;
    envelopeAt(elapsed, s.env);

    if (s.env.done || elapsed > TOTAL_SECONDS) {
      req.startedAt = null;
      driven.left = false;
      driven.right = false;
      s.owning = false;
      onDone?.();
      return;
    }

    // Claim the right arm for the duration. Claimed every frame rather than once, so a
    // shape change or a remount cannot leave `Player` writing a side the driver is
    // also writing.
    driven.right = true;
    s.owning = true;

    readPlacement(s.self, pRig);
    readPlacement(s.other, nRig);

    // Player's side, in the player's own frame.
    // `resolveContact` is frame-agnostic: `SELF` plus the localised partner gives a
    // rig-local answer, which is what the arm group wants.
    const cp = s.contact;
    localPartner(s.local, s.self, s.other);
    resolveContact(cp, m.player, m.npc, SELF, s.local);
    restPose(s.rest, m.player, 1);
    bumpPose(s.pose, m.player, cp, cp.dirAX, cp.dirAZ);
    blendPose(s.pose, s.rest, s.pose, s.env.t);
    applyPose(pArm, s.pose, s.aim);

    // NPC's side, in the NPC's own frame.
    localPartner(s.local, s.other, s.self);
    resolveContact(cp, m.npc, m.player, SELF, s.local);
    restPose(s.rest, m.npc, 1);
    bumpPose(s.pose, m.npc, cp, cp.dirAX, cp.dirAZ);
    blendPose(s.pose, s.rest, s.pose, s.env.t);
    applyPose(nArm, s.pose, s.aim);
  });

  return null;
}
