import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const SHOW_ARROW_DISTANCE = 15;
const HIDE_ARROW_DISTANCE = 10;
let arrowActivated = false;

export interface TrinketTrackerState {
  angle: number;
  distance: number;
  showArrow: boolean;
  screenX: number;
  screenY: number;
}

export function useTrinketTracker(
  playerPosition: React.RefObject<THREE.Vector3 | null>,
  targetPos: React.RefObject<THREE.Vector3 | null>,
  active: boolean,
  out: React.RefObject<TrinketTrackerState>
) {
  const { camera } = useThree();

  useFrame(() => {
    if (!playerPosition.current || !targetPos.current || !active) {
      out.current!.showArrow = false;
      out.current!.distance = 0;
      arrowActivated = false;
      return;
    }

    const playerXZ = new THREE.Vector3(
      playerPosition.current.x,
      0,
      playerPosition.current.z
    );
    const trinketXZ = new THREE.Vector3(targetPos.current.x, 0, targetPos.current.z);
    const dist = playerXZ.distanceTo(trinketXZ);

    const projected = targetPos.current.clone().project(camera);
    const onScreen =
      projected.x >= -1 && projected.x <= 1 &&
      projected.y >= -1 && projected.y <= 1 &&
      projected.z < 1;

    if (dist > SHOW_ARROW_DISTANCE || !onScreen) arrowActivated = true;
    if (dist < HIDE_ARROW_DISTANCE && onScreen) arrowActivated = false;

    out.current!.distance = dist;
    out.current!.showArrow = arrowActivated;

    if (arrowActivated) {
      let sx = projected.x;
      let sy = projected.y;
      // When target is behind camera, projected coords are inverted — flip them
      if (projected.z > 1) {
        sx = -sx;
        sy = -sy;
      }
      const screenDir = new THREE.Vector2(sx, sy);
      if (screenDir.length() > 0) {
        out.current!.angle = Math.atan2(screenDir.x, screenDir.y);
        screenDir.normalize().multiplyScalar(0.7);
      }
      out.current!.screenX = (screenDir.x + 1) / 2;
      out.current!.screenY = (-screenDir.y + 1) / 2;
    }
  });
}
