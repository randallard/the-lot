import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface ScreenPos {
  x: number; // 0-1 screen space
  y: number;
  visible: boolean;
}

export function useScreenPosition(
  worldPos: React.RefObject<THREE.Vector3 | null>,
  out: React.RefObject<ScreenPos>
) {
  const { camera } = useThree();

  useFrame(() => {
    if (!worldPos.current) {
      out.current!.visible = false;
      return;
    }

    const projected = worldPos.current.clone().project(camera);
    const onScreen =
      projected.x >= -1 && projected.x <= 1 &&
      projected.y >= -1 && projected.y <= 1 &&
      projected.z < 1;

    out.current!.x = (projected.x + 1) / 2;
    out.current!.y = (-projected.y + 1) / 2;
    out.current!.visible = onScreen;
  });
}
