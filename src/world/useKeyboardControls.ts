import { useEffect, useRef } from "react";

interface Keys {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export function useKeyboardControls() {
  const keys = useRef<Keys>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent, pressed: boolean) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = pressed;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.backward = pressed;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = pressed;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = pressed;
          break;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => handleKey(e, true);
    const onKeyUp = (e: KeyboardEvent) => handleKey(e, false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return keys;
}
