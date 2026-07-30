/**
 * Two characters performing an authored contact move, for the editor.
 *
 * **It drives them through the same resolver the game does.** `resolveRole` here,
 * `resolveRole` in `FistBumpDriver` — no second copy of the geometry, which is the
 * property ADR-0016 turns on. An editor that previews through its own maths is an editor
 * that lies, and a move authored against a lie is worse than no editor at all.
 *
 * That is also why this is not `CharacterPreview`. That component rigs an arm as
 * shoulder/elbow/wrist *joint angles*, which is right for an emote and cannot express a
 * contact pose — `arm-pose` produces a **placement and an aim** for one group, the rig
 * `Player`, `Npc` and `Dancer` all use. Two components, two rigs, on purpose.
 */

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  type CharacterBodyShape,
  computePositions,
  deg2rad,
  handRotations,
} from "../services/body-shapes";
import { armPose, type Placement } from "../dance/arm-pose";
import { bumpContact, envelopeWith, maxSeparation } from "../dance/fist-bump";
import {
  type ContactMove,
  type RoleId,
  type RoleResolution,
  type RoleScratch,
  handFor,
  metricsFor,
  resolveRole,
  stancePlacements,
  totalSeconds,
} from "../dance/contact-move";

/**
 * Both preview rigs sit on the floor, so world and rig-local heights coincide.
 *
 * Each character keeps its **own** `bodyCenterY` (the player's is 0, an NPC's is 0.5),
 * because that is what the game does and the contact height has to resolve across the
 * difference. Flattening them here would preview a pair the game never renders.
 */
const PREVIEW_RIG_Y = 0;

/**
 * A character at yaw 0 faces `+z`, so its anatomical right arm is at `-x`.
 *
 * This rig is built fresh here, so unlike `Player`/`Npc` it can name its sides
 * anatomically — `right` really is the right arm. That is why the preview is trustworthy
 * about which hand a move uses.
 */
const PREVIEW_RIG = "left-positive" as const;

/**
 * How far apart the stance stands them, as a fraction of their combined reach.
 *
 * Comfortably inside the limit: the editor is for judging whether a move *reads*, and
 * staging it at the very edge of reach would make every move look strained.
 */
const STANCE_FRACTION = 0.75;

export interface CastMember {
  shape: CharacterBodyShape;
  bodyCenterY: number;
  label: string;
}

// ---------------------------------------------------------------------------

interface RigProps {
  shape: CharacterBodyShape;
  bodyCenterY: number;
  hand: "open" | "closed";
  placement: Placement;
  leftRef: React.RefObject<THREE.Group | null>;
  rightRef: React.RefObject<THREE.Group | null>;
}

/**
 * One character, built the way `Npc` builds one: body, head, and two arm groups pivoting
 * at their own shoulders with the forearm and hand as children at `centre − shoulder`.
 *
 * Unlike `Npc`, the hand mesh is drawn in the **authored** pose rather than always open,
 * so a fist bump previews with fists. `Npc` and `Player` do not do this yet.
 */
function Rig({ shape, bodyCenterY, hand, placement, leftRef, rightRef }: RigProps) {
  const { head, body, forearm } = shape;
  const pos = computePositions(shape, bodyCenterY, hand);
  const active = shape.hand[hand];
  const rot = handRotations(active);
  const forearmLocalY = pos.forearmCenterY - pos.shoulderY;
  const handLocalY = pos.handCenterY - pos.shoulderY;
  const color = shape.bodyColor;

  const arm = (side: "left" | "right") => (
    <group
      ref={side === "left" ? leftRef : rightRef}
      // Anatomical: facing +z, the right hand is at -x.
      position={[side === "left" ? pos.forearmX : -pos.forearmX, pos.shoulderY, 0]}
    >
      <mesh position={[0, forearmLocalY, 0]}>
        <cylinderGeometry
          args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]}
        />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[0, handLocalY, 0]}
        scale={[1, 1, active.flattenZ]}
        rotation={side === "left" ? rot.right : rot.left}
      >
        <sphereGeometry args={[active.radius, active.widthSegments, active.heightSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );

  return (
    <group position={[placement.x, PREVIEW_RIG_Y, placement.z]} rotation={[0, placement.yaw, 0]}>
      <mesh
        position={[0, bodyCenterY, 0]}
        rotation={[deg2rad(body.leanX), 0, deg2rad(body.leanZ)]}
      >
        <capsuleGeometry args={[body.radius, body.height, body.capSegments, body.radialSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh
        position={[head.offsetX, pos.headY + head.offsetY, head.offsetZ]}
        rotation={[
          deg2rad(head.rotation[0]),
          deg2rad(head.rotation[1]),
          deg2rad(head.rotation[2]),
        ]}
      >
        <sphereGeometry args={[head.radius, head.widthSegments, head.heightSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* A marker on the front of the head, so "facing" is readable from any camera
          angle. The dance debug scene learned this the hard way — a featureless sphere
          gives a watcher no way to tell which way a character is turned. */}
      <mesh position={[head.offsetX, pos.headY + head.offsetY, head.offsetZ + head.radius * 0.92]}>
        <sphereGeometry args={[head.radius * 0.16, 8, 8]} />
        <meshStandardMaterial color="#0d0d1a" />
      </mesh>
      {arm("left")}
      {arm("right")}
    </group>
  );
}

// ---------------------------------------------------------------------------

interface DriverProps {
  move: ContactMove;
  cast: { A: CastMember; B: CastMember };
  placements: { a: Placement; b: Placement };
  aLeft: React.RefObject<THREE.Group | null>;
  aRight: React.RefObject<THREE.Group | null>;
  bLeft: React.RefObject<THREE.Group | null>;
  bRight: React.RefObject<THREE.Group | null>;
  /** Fixed blend when scrubbing; `undefined` plays the envelope on a loop. */
  scrub?: number;
}

const DOWN = new THREE.Vector3(0, -1, 0);

function Driver({ move, cast, placements, aLeft, aRight, bLeft, bRight, scrub }: DriverProps) {
  const s = useRef({
    time: 0,
    env: { t: 0, touching: false, done: false },
    role: { local: { x: 0, z: 0, yaw: 0 }, rest: armPose() } as RoleScratch,
    out: { pose: armPose(), side: "right", contact: bumpContact() } as RoleResolution,
    aim: new THREE.Vector3(),
  });

  useFrame((_, delta) => {
    const scratch = s.current;
    const constraint = move.constraints[0];
    if (!constraint) return;

    let blend: number;
    if (scrub === undefined) {
      // Loop the envelope with a beat of rest on either end, so the return is watchable
      // rather than instantly restarting.
      const total = totalSeconds(move.envelope) + 0.6;
      scratch.time = total > 0 ? (scratch.time + delta) % total : 0;
      envelopeWith(
        scratch.time,
        move.envelope.extend,
        move.envelope.hold,
        move.envelope.withdraw,
        scratch.env,
      );
      blend = scratch.env.t;
    } else {
      blend = scrub;
    }

    const mA = metricsFor(constraint, "A", cast.A.shape, cast.A.bodyCenterY, PREVIEW_RIG_Y);
    const mB = metricsFor(constraint, "B", cast.B.shape, cast.B.bodyCenterY, PREVIEW_RIG_Y);

    const write = (role: RoleId) => {
      const self = role === "A" ? mA : mB;
      const other = role === "A" ? mB : mA;
      const selfP = role === "A" ? placements.a : placements.b;
      const otherP = role === "A" ? placements.b : placements.a;
      const r = resolveRole(
        scratch.out, scratch.role, move, constraint, role,
        self, other, selfP, otherP, blend, PREVIEW_RIG,
      );
      const group =
        role === "A"
          ? (r.side === "left" ? aLeft : aRight).current
          : (r.side === "left" ? bLeft : bRight).current;
      if (!group) return;
      group.position.set(r.pose.x, r.pose.y, r.pose.z);
      scratch.aim.set(r.pose.aimX, r.pose.aimY, r.pose.aimZ);
      group.quaternion.setFromUnitVectors(DOWN, scratch.aim);
    };

    write("A");
    write("B");
  });

  return null;
}

// ---------------------------------------------------------------------------

export interface ContactMovePreviewProps {
  move: ContactMove;
  cast: { A: CastMember; B: CastMember };
  /** Fixed blend, 0 at rest and 1 at contact. Omit to loop the envelope. */
  scrub?: number;
}

export function ContactMovePreview({ move, cast, scrub }: ContactMovePreviewProps) {
  const aLeft = useRef<THREE.Group>(null);
  const aRight = useRef<THREE.Group>(null);
  const bLeft = useRef<THREE.Group>(null);
  const bRight = useRef<THREE.Group>(null);

  const constraint = move.constraints[0];

  const { placements, separation, handA, handB } = useMemo(() => {
    const c = move.constraints[0];
    const mA = c ? metricsFor(c, "A", cast.A.shape, cast.A.bodyCenterY, PREVIEW_RIG_Y) : null;
    const mB = c ? metricsFor(c, "B", cast.B.shape, cast.B.bodyCenterY, PREVIEW_RIG_Y) : null;
    const sep = mA && mB ? maxSeparation(mA, mB) * STANCE_FRACTION : 1.5;
    return {
      placements: stancePlacements(move, sep),
      separation: sep,
      handA: c ? handFor(c, "A") : ("open" as const),
      handB: c ? handFor(c, "B") : ("open" as const),
    };
  }, [move, cast]);

  // Frame both of them, whatever the stance and however big they are.
  const height = Math.max(
    cast.A.bodyCenterY + cast.A.shape.body.height + cast.A.shape.head.radius * 2,
    cast.B.bodyCenterY + cast.B.shape.body.height + cast.B.shape.head.radius * 2,
  );
  const dist = Math.max(2.2, separation * 1.9 + 1.2);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [dist * 0.72, height * 1.15, dist * 0.72], fov: 40 }}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <color attach="background" args={["#0d0d1a"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 4, 3]} intensity={1.3} />
        <directionalLight position={[-2, 1, -2]} intensity={0.3} color="#8888cc" />
        <gridHelper args={[8, 16, "#1e1e30", "#161626"]} />
        <Rig
          shape={cast.A.shape} bodyCenterY={cast.A.bodyCenterY} hand={handA}
          placement={placements.a} leftRef={aLeft} rightRef={aRight}
        />
        <Rig
          shape={cast.B.shape} bodyCenterY={cast.B.bodyCenterY} hand={handB}
          placement={placements.b} leftRef={bLeft} rightRef={bRight}
        />
        {constraint && (
          <Driver
            move={move}
            cast={cast}
            placements={placements}
            aLeft={aLeft}
            aRight={aRight}
            bLeft={bLeft}
            bRight={bRight}
            scrub={scrub}
          />
        )}
        <OrbitControls target={[0, height * 0.6, 0]} enablePan={false} minDistance={1} maxDistance={12} />
      </Canvas>
    </div>
  );
}
