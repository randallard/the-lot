import { useRef, useState, useEffect, useCallback } from "react";
import type { InputDirection } from "../world/useInputDirection";

const STICK_SIZE = 120;
const KNOB_SIZE = 48;
const MAX_DIST = (STICK_SIZE - KNOB_SIZE) / 2;

interface VirtualJoystickProps {
  inputDir: React.RefObject<InputDirection>;
}

export function VirtualJoystick({ inputDir }: VirtualJoystickProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  const updateKnob = useCallback(
    (clientX: number, clientY: number) => {
      let dx = clientX - origin.current.x;
      let dy = clientY - origin.current.y;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > MAX_DIST) {
        dx = (dx / dist) * MAX_DIST;
        dy = (dy / dist) * MAX_DIST;
      }

      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      // Map to input: x = left/right, z = forward/back (y on screen = z in world)
      inputDir.current!.x = dx / MAX_DIST;
      inputDir.current!.z = dy / MAX_DIST;
    },
    [inputDir]
  );

  const reset = useCallback(() => {
    touchId.current = null;
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
    inputDir.current!.x = 0;
    inputDir.current!.z = 0;
  }, [inputDir]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (touchId.current !== null) return;
      const touch = e.changedTouches[0];
      touchId.current = touch.identifier;
      const rect = stickRef.current!.getBoundingClientRect();
      origin.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      updateKnob(touch.clientX, touch.clientY);
    },
    [updateKnob]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId.current) {
          updateKnob(touch.clientX, touch.clientY);
          break;
        }
      }
    },
    [updateKnob]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          reset();
          break;
        }
      }
    },
    [reset]
  );

  if (!isTouchDevice) return null;

  return (
    <div
      ref={stickRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      style={{
        position: "fixed",
        bottom: 40,
        left: 40,
        width: STICK_SIZE,
        height: STICK_SIZE,
        borderRadius: "50%",
        background: "rgba(255, 255, 255, 0.15)",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none",
        zIndex: 5,
      }}
    >
      <div
        ref={knobRef}
        style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.5)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
