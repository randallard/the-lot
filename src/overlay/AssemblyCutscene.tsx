import { useRef, useState, useEffect, useCallback } from "react";

interface AssemblyCutsceneProps {
  onComplete: () => void;
}

export function AssemblyCutscene({ onComplete }: AssemblyCutsceneProps) {
  const [visible, setVisible] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const [pos1, setPos1] = useState({ x: -60, y: 0 });
  const [pos2, setPos2] = useState({ x: 60, y: 0 });
  const activePiece = useRef<1 | 2 | null>(null);
  const mode = useRef<"idle" | "held" | "following">("idle");
  const dragStart = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const SNAP_DISTANCE = 30;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (assembled) {
      const timer = setTimeout(onComplete, 1200);
      return () => clearTimeout(timer);
    }
  }, [assembled, onComplete]);

  const setActivePos = useCallback((pos: { x: number; y: number }) => {
    if (activePiece.current === 1) setPos1(pos);
    else if (activePiece.current === 2) setPos2(pos);
  }, []);

  const getOtherPos = useCallback(() => {
    if (activePiece.current === 1) return pos2;
    return pos1;
  }, [pos1, pos2]);

  const trySnap = useCallback((x: number, y: number) => {
    const other = getOtherPos();
    const dist = Math.sqrt((x - other.x) ** 2 + (y - other.y) ** 2);
    if (dist < SNAP_DISTANCE) {
      setActivePos({ x: other.x, y: other.y });
      mode.current = "idle";
      activePiece.current = null;
      setAssembled(true);
      return true;
    }
    return false;
  }, [getOtherPos, setActivePos]);

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + rect.height / 2),
    };
  }, []);

  const onPiecePointerDown = useCallback((piece: 1 | 2, e: React.PointerEvent) => {
    if (assembled) return;
    e.stopPropagation();

    if (mode.current === "following") {
      const currentPos = activePiece.current === 1 ? pos1 : pos2;
      if (!trySnap(currentPos.x, currentPos.y)) {
        mode.current = "idle";
        activePiece.current = null;
      }
      return;
    }

    activePiece.current = piece;
    mode.current = "held";
    dragStart.current = { x: e.clientX, y: e.clientY };
    startOffset.current = { ...(piece === 1 ? pos1 : pos2) };
  }, [pos1, pos2, assembled, trySnap]);

  const onPieceClick = useCallback((piece: 1 | 2, e: React.MouseEvent) => {
    e.stopPropagation();
    if (assembled) return;
    if (mode.current === "idle") {
      activePiece.current = piece;
      mode.current = "following";
    }
  }, [assembled]);

  const onOverlayPointerMove = useCallback((e: React.PointerEvent) => {
    if (assembled || !activePiece.current) return;

    if (mode.current === "held") {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const newX = startOffset.current.x + dx;
      const newY = startOffset.current.y + dy;
      if (!trySnap(newX, newY)) {
        setActivePos({ x: newX, y: newY });
      }
    } else if (mode.current === "following") {
      const pos = getRelativePos(e.clientX, e.clientY);
      if (!trySnap(pos.x, pos.y)) {
        setActivePos(pos);
      }
    }
  }, [assembled, trySnap, getRelativePos, setActivePos]);

  const onOverlayPointerUp = useCallback(() => {
    if (mode.current === "held") {
      mode.current = "idle";
      activePiece.current = null;
    }
  }, []);

  const onOverlayClick = useCallback(() => {
    if (mode.current === "following" && activePiece.current) {
      const currentPos = activePiece.current === 1 ? pos1 : pos2;
      if (!trySnap(currentPos.x, currentPos.y)) {
        mode.current = "idle";
        activePiece.current = null;
      }
    }
  }, [pos1, pos2, trySnap]);

  const pieceStyle = (pos: { x: number; y: number }, rot: string, isActive: boolean) => ({
    position: "absolute" as const,
    left: `calc(50% + ${pos.x}px)`,
    top: `calc(50% + ${pos.y}px)`,
    transform: `translate(-50%, -50%) rotate(${rot})`,
    width: 36,
    height: 28,
    background: "#889099",
    borderRadius: 3,
    boxShadow: assembled
      ? "0 0 30px rgba(140, 80, 200, 0.6)"
      : isActive
        ? "0 0 20px rgba(136, 144, 153, 0.6)"
        : "0 0 15px rgba(136, 144, 153, 0.4)",
    cursor: assembled ? "default" : "grab",
    touchAction: "none" as const,
    transition: assembled ? "box-shadow 0.5s, left 0.15s, top 0.15s" : "none",
  });

  return (
    <div
      onPointerMove={onOverlayPointerMove}
      onPointerUp={onOverlayPointerUp}
      onClick={onOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.1s linear",
        zIndex: 10,
        touchAction: "none",
      }}
    >
      <p
        style={{
          color: "#d0d0d0",
          fontSize: 20,
          letterSpacing: 1.5,
          textAlign: "center",
          padding: "0 20px",
          marginBottom: 48,
        }}
      >
        {assembled
          ? "they fit!"
          : "you found another trinket — wait, do these fit together?"}
      </p>

      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: 200,
          height: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          onPointerDown={(e) => onPiecePointerDown(1, e)}
          onClick={(e) => onPieceClick(1, e)}
          style={pieceStyle(pos1, "6deg", activePiece.current === 1)}
        />
        <div
          onPointerDown={(e) => onPiecePointerDown(2, e)}
          onClick={(e) => onPieceClick(2, e)}
          style={pieceStyle(pos2, "-4deg", activePiece.current === 2)}
        />
      </div>

      {!assembled && (
        <p
          style={{
            color: "#555",
            fontSize: 12,
            marginTop: 40,
          }}
        >
          drag to fit
        </p>
      )}
    </div>
  );
}
