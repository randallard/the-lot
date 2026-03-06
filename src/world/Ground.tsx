import { Plane } from "@react-three/drei";

export function Ground() {
  return (
    <Plane
      args={[200, 200]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial color="#ffffff" />
    </Plane>
  );
}
