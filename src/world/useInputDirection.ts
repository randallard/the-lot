import { useEffect, useRef } from "react";

/** Shared movement direction — x and z in range [-1, 1] */
export interface InputDirection {
  x: number;
  z: number;
}

export function useInputDirection() {
  const dir = useRef<InputDirection>({ x: 0, z: 0 });
  const keys = useRef({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const update = () => {
      // Keyboard contributes when no touch is active
      dir.current.x = (keys.current.d ? 1 : 0) - (keys.current.a ? 1 : 0);
      dir.current.z = (keys.current.s ? 1 : 0) - (keys.current.w ? 1 : 0);
    };

    const handleKey = (e: KeyboardEvent, pressed: boolean) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp":    keys.current.w = pressed; break;
        case "KeyS": case "ArrowDown":   keys.current.s = pressed; break;
        case "KeyA": case "ArrowLeft":   keys.current.a = pressed; break;
        case "KeyD": case "ArrowRight":  keys.current.d = pressed; break;
        default: return;
      }
      update();
    };

    const onDown = (e: KeyboardEvent) => handleKey(e, true);
    const onUp = (e: KeyboardEvent) => handleKey(e, false);

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return dir;
}
