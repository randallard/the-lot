import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  type CharacterBodyShape,
  computePositions,
  handRotations,
} from "../services/body-shapes";

// All previews use this body center Y for visual consistency
const PREVIEW_BODY_Y = 0.5;

function CharacterMesh({ shape, color, handPose }: { shape: CharacterBodyShape; color: string; handPose: "open" | "closed" }) {
  const { head, body, forearm, hand } = shape;
  const pos = computePositions(shape, PREVIEW_BODY_Y, handPose);
  const activePose = hand[handPose];
  const rot = handRotations(activePose);

  return (
    <>
      <mesh position={[0, PREVIEW_BODY_Y, 0]}>
        <capsuleGeometry args={[body.radius, body.height, body.capSegments, body.radialSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, pos.headY, 0]}>
        <sphereGeometry args={[head.radius, head.widthSegments, head.heightSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[-pos.forearmX, pos.forearmCenterY, 0]}>
        <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-pos.forearmX, pos.handCenterY, 0]} scale={[1, activePose.flattenY, 1]} rotation={rot.left}>
        <sphereGeometry args={[activePose.radius, activePose.widthSegments, activePose.heightSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[pos.forearmX, pos.forearmCenterY, 0]}>
        <cylinderGeometry args={[forearm.topRadius, forearm.bottomRadius, forearm.height, forearm.radialSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[pos.forearmX, pos.handCenterY, 0]} scale={[1, activePose.flattenY, 1]} rotation={rot.right}>
        <sphereGeometry args={[activePose.radius, activePose.widthSegments, activePose.heightSegments]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}

interface CharacterPreviewProps {
  shape: CharacterBodyShape;
  color: string;
  handPose?: "open" | "closed";
}

export function CharacterPreview({ shape, color, handPose = "open" }: CharacterPreviewProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.8, 2.8], fov: 38 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <color attach="background" args={["#0d0d1a"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 3]} intensity={1.3} />
      <directionalLight position={[-2, 1, -2]} intensity={0.3} color="#8888cc" />
      <CharacterMesh shape={shape} color={color} handPose={handPose} />
      <OrbitControls
        target={[0, 0.75, 0]}
        autoRotate
        autoRotateSpeed={2}
        enablePan={false}
        minDistance={1.2}
        maxDistance={7}
      />
    </Canvas>
  );
}
