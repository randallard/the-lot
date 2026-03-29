import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  type CharacterBodyShape,
  computePositions,
  handRotations,
  deg2rad,
} from "../services/body-shapes";
import { Eyes } from "../world/Eyes";
import type { ArmPose, ArmAction } from "../services/arm-actions";
import { ZERO_POSE } from "../services/arm-actions";
import { type Emote, type ResolvedPose, NEUTRAL_POSE, sampleEmote } from "../services/emotes";

const PREVIEW_BODY_Y = 0.5;

// ---------------------------------------------------------------------------
// Hierarchical arm — shoulder → upper arm group → elbow → forearm mesh → wrist → hand

interface ArmGroupProps {
  /** World position of the shoulder joint */
  shoulderPos: [number, number, number];
  /** Mirror Y and Z rotations for the left arm */
  mirror: boolean;
  shape: CharacterBodyShape;
  color: string;
  handPose: "open" | "closed";
  armPose: ArmPose;
}

function ArmGroup({ shoulderPos, mirror, shape, color, handPose, armPose }: ArmGroupProps) {
  const { forearm, hand } = shape;
  const pos = computePositions(shape, PREVIEW_BODY_Y, handPose);
  const activePose = hand[handPose];
  const baseRot = handRotations(activePose);

  const shoulderRef = useRef<THREE.Group>(null);
  const elbowRef    = useRef<THREE.Group>(null);
  const wristRef    = useRef<THREE.Group>(null);

  const sign = mirror ? -1 : 1;

  useFrame(() => {
    const ua = armPose.upperArmRotation;
    const fa = armPose.forearmRotation;
    const ha = armPose.handRotation;
    const base = mirror ? baseRot.left : baseRot.right;

    shoulderRef.current?.rotation.set(
      deg2rad(ua[0]),
      deg2rad(ua[1] * sign),
      deg2rad(ua[2] * sign),
    );
    elbowRef.current?.rotation.set(
      deg2rad(fa[0]),
      deg2rad(fa[1] * sign),
      deg2rad(fa[2] * sign),
    );
    wristRef.current?.rotation.set(
      base[0] + deg2rad(ha[0]),
      base[1] + deg2rad(ha[1] * sign),
      base[2] + deg2rad(ha[2] * sign),
    );
  });

  const upperArmLen  = pos.upperArmLength;
  // Upper arm radius: slightly wider than the forearm top
  const upperArmR    = forearm.topRadius * 1.1;

  return (
    <group position={shoulderPos}>
      {/* Shoulder pivot */}
      <group ref={shoulderRef}>
        {/* Upper arm mesh — invisible, but provides the pivot geometry */}
        <mesh position={[0, -upperArmLen / 2, 0]} visible={false}>
          <cylinderGeometry args={[upperArmR, forearm.topRadius, upperArmLen, forearm.radialSegments]} />
          <meshStandardMaterial color={color} />
        </mesh>

        {/* Elbow pivot — at bottom of upper arm */}
        <group position={[0, -upperArmLen, 0]}>
          <group ref={elbowRef}>
            {/* Forearm: top (elbow) at y=0, hangs to y=-height */}
            <mesh position={[0, -forearm.height / 2, 0]}>
              <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
              <meshStandardMaterial color={color} />
            </mesh>

            {/* Wrist pivot — at bottom of forearm */}
            <group position={[0, -forearm.height, 0]}>
              {/* Gap along the forearm axis — outside wrist rotation so it's unaffected by hand angle */}
              <group position={[0, -activePose.handForearmGap, 0]}>
                {/* Wrist rotation — pivot is at the palm base (top of hand) */}
                <group ref={wristRef}>
                  {/* Hand center one radius below the palm-base pivot */}
                  <mesh position={[0, -activePose.radius, 0]} scale={[1, 1, activePose.flattenZ]}>
                    <sphereGeometry args={[activePose.radius, activePose.widthSegments, activePose.heightSegments]} />
                    <meshStandardMaterial color={color} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Arm-action playback (kept for ArmActionBuilderModal)

interface AnimDriverProps {
  action: ArmAction;
  isPlaying: boolean;
  onPoseChange: (pose: ArmPose) => void;
}

function AnimDriver({ action, isPlaying, onPoseChange }: AnimDriverProps) {
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!isPlaying) return;
    timeRef.current += delta;

    const kfs = action.keyframes;
    if (kfs.length === 0) return;

    const segments: Array<{ from: ArmPose; to: ArmPose; duration: number }> = [];
    let prev: ArmPose = ZERO_POSE;
    for (const kf of kfs) {
      segments.push({ from: prev, to: kf.pose, duration: kf.transitionDuration });
      prev = kf.pose;
    }
    segments.push({ from: prev, to: ZERO_POSE, duration: action.returnDuration });

    const totalTime = segments.reduce((s, seg) => s + seg.duration, 0);
    const t = timeRef.current % totalTime;

    let elapsed = 0;
    for (const seg of segments) {
      if (t < elapsed + seg.duration) {
        const alpha = (t - elapsed) / seg.duration;
        onPoseChange(lerpPose(seg.from, seg.to, alpha));
        return;
      }
      elapsed += seg.duration;
    }
  });

  return null;
}

function lerpV3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function lerpPose(a: ArmPose, b: ArmPose, t: number): ArmPose {
  return {
    upperArmRotation: lerpV3(a.upperArmRotation, b.upperArmRotation, t),
    forearmRotation:  lerpV3(a.forearmRotation,  b.forearmRotation,  t),
    handRotation:     lerpV3(a.handRotation,     b.handRotation,     t),
  };
}

// ---------------------------------------------------------------------------
// Emote playback driver

interface EmoteDriverProps {
  emote: Emote;
  isPlaying: boolean;
  onPoseChange: (pose: ResolvedPose) => void;
}

function EmoteDriver({ emote, isPlaying, onPoseChange }: EmoteDriverProps) {
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!isPlaying) return;
    const total = emote.duration;
    if (total <= 0) return;
    timeRef.current = emote.loop
      ? (timeRef.current + delta) % total
      : Math.min(timeRef.current + delta, total);
    onPoseChange(sampleEmote(emote, timeRef.current));
  });

  return null;
}

// ---------------------------------------------------------------------------
// Merge animation ResolvedPose into a shape snapshot for rendering

function mergeAnimation(shape: CharacterBodyShape, rp: ResolvedPose): CharacterBodyShape {
  return {
    ...shape,
    head: {
      ...shape.head,
      rotation: [
        shape.head.rotation[0] + rp.headDeltaRotation[0],
        shape.head.rotation[1] + rp.headDeltaRotation[1],
        shape.head.rotation[2] + rp.headDeltaRotation[2],
      ] as [number, number, number],
      offsetX: shape.head.offsetX + rp.headOffsetX,
      offsetY: shape.head.offsetY + rp.headOffsetY,
      offsetZ: shape.head.offsetZ + rp.headOffsetZ,
      radius:  shape.head.radius  + rp.headRadiusDelta,
    },
    body: {
      ...shape.body,
      leanX:  shape.body.leanX  + rp.bodyLeanX,
      leanZ:  shape.body.leanZ  + rp.bodyLeanZ,
      radius: shape.body.radius + rp.bodyRadiusDelta,
      height: shape.body.height + rp.bodyHeightDelta,
    },
  };
}

// ---------------------------------------------------------------------------
// Static body (head + torso only — arms handled separately)

interface BodyMeshProps {
  shape: CharacterBodyShape;  // already has animation merged in
  color: string;
  handPose: "open" | "closed";
  bodyDeltaY?: number;        // additive jump offset (remains separate)
}

function BodyMesh({ shape, color, handPose, bodyDeltaY = 0 }: BodyMeshProps) {
  const { head, body } = shape;
  const pos = computePositions(shape, PREVIEW_BODY_Y, handPose);
  const hr: [number, number, number] = [deg2rad(head.rotation[0]), deg2rad(head.rotation[1]), deg2rad(head.rotation[2])];
  return (
    <>
      <mesh position={[0, PREVIEW_BODY_Y + bodyDeltaY, 0]} rotation={[deg2rad(body.leanX), 0, deg2rad(body.leanZ)]}>
        <capsuleGeometry args={[body.radius, body.height, body.capSegments, body.radialSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[head.offsetX, pos.headY + bodyDeltaY + head.offsetY, head.offsetZ]} rotation={hr}>
        <sphereGeometry args={[head.radius, head.widthSegments, head.heightSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------------------
// Scene

interface SceneProps {
  shape: CharacterBodyShape;
  color: string;
  handPose: "open" | "closed";
  armPose: ArmPose;
  animationPreview?: ArmAction;
  isPlaying?: boolean;
  onLivepose?: (p: ArmPose) => void;
  // Emote
  emotePreview?: Emote;
  isEmotePlaying?: boolean;
  onLiveEmotePose?: (p: ResolvedPose) => void;
  resolvedPose?: ResolvedPose;
}

function Scene({
  shape, color, handPose, armPose,
  animationPreview, isPlaying, onLivepose,
  emotePreview, isEmotePlaying, onLiveEmotePose, resolvedPose,
}: SceneProps) {
  const rp = resolvedPose ?? NEUTRAL_POSE;
  const animShape = mergeAnimation(shape, rp);
  const pos = computePositions(animShape, PREVIEW_BODY_Y, handPose);
  const sY = pos.shoulderY + rp.bodyDeltaY;
  const sX = pos.forearmX;

  const rightPose = resolvedPose ? resolvedPose.rightArm : armPose;
  const leftPose  = resolvedPose ? resolvedPose.leftArm  : armPose;

  return (
    <>
      <color attach="background" args={["#0d0d1a"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 3]} intensity={1.3} />
      <directionalLight position={[-2, 1, -2]} intensity={0.3} color="#8888cc" />
      <BodyMesh shape={animShape} color={color} handPose={handPose} bodyDeltaY={rp.bodyDeltaY} />
      <ArmGroup shoulderPos={[sX, sY, 0]}  mirror={false} shape={animShape} color={color} handPose={handPose} armPose={rightPose} />
      <ArmGroup shoulderPos={[-sX, sY, 0]} mirror={true}  shape={animShape} color={color} handPose={handPose} armPose={leftPose} />
      <Eyes
        eyes={animShape.eyes}
        headY={pos.headY + rp.bodyDeltaY + animShape.head.offsetY}
        headRadius={animShape.head.radius}
        headOffsetX={animShape.head.offsetX}
        headOffsetZ={animShape.head.offsetZ}
        expressionOverride={Object.keys(rp.eyeOverride).length > 0 ? rp.eyeOverride : undefined}
      />
      {animationPreview && isPlaying && onLivepose && (
        <AnimDriver action={animationPreview} isPlaying={isPlaying} onPoseChange={onLivepose} />
      )}
      {emotePreview && isEmotePlaying && onLiveEmotePose && (
        <EmoteDriver emote={emotePreview} isPlaying={isEmotePlaying} onPoseChange={onLiveEmotePose} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Public component

export interface CharacterPreviewProps {
  shape: CharacterBodyShape;
  color: string;
  handPose?: "open" | "closed";
  /** "arms" focuses the camera on the arm area and disables auto-rotate */
  focusMode?: "full" | "arms";
  /** Overrides arm pose for keyframe preview (arm-action editor) */
  armPoseOverride?: ArmPose;
  animationPreview?: ArmAction;
  isPlaying?: boolean;
  onLivePose?: (p: ArmPose) => void;
  /** Emote preview — drives all tracks */
  emotePreview?: Emote;
  isEmotePlaying?: boolean;
  onLiveEmotePose?: (p: ResolvedPose) => void;
  /** Static resolved pose override (e.g. selected keyframe in emote editor) */
  resolvedPoseOverride?: ResolvedPose;
}

export function CharacterPreview({
  shape,
  color,
  handPose = "open",
  focusMode = "full",
  armPoseOverride,
  animationPreview,
  isPlaying = false,
  onLivePose,
  emotePreview,
  isEmotePlaying = false,
  onLiveEmotePose,
  resolvedPoseOverride,
}: CharacterPreviewProps) {
  const pos = computePositions(shape, PREVIEW_BODY_Y, handPose);
  const armY = pos.shoulderY - pos.upperArmLength / 2;

  const isArms = focusMode === "arms";
  const camPos: [number, number, number] = isArms ? [2.4, armY + 0.1, 1.4] : [0, 0.8, 2.8];
  const target: [number, number, number] = isArms ? [0, armY, 0] : [0, 0.75, 0];

  const activePose = armPoseOverride ?? ZERO_POSE;
  const [spinning, setSpinning] = useState(true);
  const [liveEmotePose, setLiveEmotePose] = useState<ResolvedPose | null>(null);

  const resolvedPose = resolvedPoseOverride ?? (isEmotePlaying ? (liveEmotePose ?? undefined) : undefined);

  function handleLiveEmotePose(p: ResolvedPose) {
    setLiveEmotePose(p);
    onLiveEmotePose?.(p);
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: camPos, fov: isArms ? 32 : 38 }}
        gl={{ antialias: true }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <Scene
          shape={shape}
          color={color}
          handPose={handPose}
          armPose={activePose}
          animationPreview={animationPreview}
          isPlaying={isPlaying}
          onLivepose={onLivePose}
          emotePreview={emotePreview}
          isEmotePlaying={isEmotePlaying}
          onLiveEmotePose={handleLiveEmotePose}
          resolvedPose={resolvedPose}
        />
        <OrbitControls
          target={target}
          autoRotate={!isArms && spinning}
          autoRotateSpeed={2}
          enablePan={false}
          minDistance={isArms ? 0.8 : 1.2}
          maxDistance={isArms ? 4 : 7}
        />
      </Canvas>
      {!isArms && (
        <button
          onClick={() => setSpinning(s => !s)}
          title={spinning ? "Stop rotation" : "Resume rotation"}
          style={{
            position: "absolute", bottom: 8, right: 8,
            background: "rgba(0,0,0,0.45)", border: "none", borderRadius: 4,
            color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1,
            padding: "4px 7px", opacity: 0.7,
          }}
        >
          {spinning ? "⏸" : "▶"}
        </button>
      )}
    </div>
  );
}
