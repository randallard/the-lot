import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const DEFAULT_OFFSET = new THREE.Vector3(0, 8, 12);
const LERP_FACTOR = 3;
const FAST_LERP_FACTOR = 12;

interface CameraRigProps {
  target: React.RefObject<THREE.Vector3 | null>;
  offset?: React.RefObject<THREE.Vector3 | null>;
  lookAtOffset?: React.RefObject<THREE.Vector3 | null>;
}

export function CameraRig({ target, offset, lookAtOffset }: CameraRigProps) {
  const currentLookAt = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!target.current) return;

    const off = offset?.current ?? DEFAULT_OFFSET;
    const isOverride = !!offset?.current;
    const factor = isOverride ? FAST_LERP_FACTOR : LERP_FACTOR;
    const desired = target.current.clone().add(off);
    state.camera.position.lerp(desired, 1 - Math.exp(-factor * delta));

    const desiredLookAt = lookAtOffset?.current
      ? target.current.clone().add(lookAtOffset.current)
      : target.current;
    currentLookAt.current.lerp(desiredLookAt, 1 - Math.exp(-factor * delta));
    state.camera.lookAt(currentLookAt.current);
  });

  return null;
}
