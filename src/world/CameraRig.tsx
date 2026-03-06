import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CAMERA_OFFSET = new THREE.Vector3(0, 8, 12);
const LERP_FACTOR = 3;

interface CameraRigProps {
  target: React.RefObject<THREE.Vector3 | null>;
}

export function CameraRig({ target }: CameraRigProps) {
  useFrame((state, delta) => {
    if (!target.current) return;

    const desired = target.current.clone().add(CAMERA_OFFSET);
    state.camera.position.lerp(desired, 1 - Math.exp(-LERP_FACTOR * delta));
    state.camera.lookAt(target.current);
  });

  return null;
}
