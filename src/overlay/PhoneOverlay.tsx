import { useEffect, useState, type ReactNode } from "react";

export type PhoneMode = "homescreen" | "app" | "sidebar";

interface PhoneOverlayProps {
  mode?: PhoneMode;
  onAppClick?: () => void;
  onClose: () => void;
  onNudge?: () => void;
  children?: ReactNode;
}

export function PhoneOverlay({ mode = "homescreen", onAppClick, onClose, onNudge, children }: PhoneOverlayProps) {
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    if (mode !== "homescreen") return;
    const t = setTimeout(() => {
      setNudge(true);
      onNudge?.();
    }, 6000);
    return () => clearTimeout(t);
  }, [mode, onNudge]);

  useEffect(() => {
    if (mode === "app") return; // no escape-to-close in app mode
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyE") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, mode]);

  const isApp = mode === "app";
  const isSidebar = mode === "sidebar";

  const phoneWidth = isApp ? 420 : isSidebar ? 340 : 160;
  const phoneHeight = isApp ? "85vh" : isSidebar ? "90vh" : 280;

  return (
    <div
      onClick={mode === "homescreen" ? onClose : undefined}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: isSidebar ? "flex-end" : "center",
        justifyContent: "center",
        background: mode === "homescreen" ? "rgba(0, 0, 0, 0.75)" : "rgba(0, 0, 0, 0.85)",
        zIndex: 10,
        padding: isSidebar ? "16px 16px 16px 0" : 0,
      }}
    >
      {/* Phone */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: phoneWidth,
          maxWidth: "95vw",
          height: phoneHeight,
          background: "#111",
          borderRadius: isApp || isSidebar ? 24 : 20,
          border: "3px solid #333",
          display: "flex",
          flexDirection: "column",
          alignItems: children ? "stretch" : "center",
          justifyContent: children ? "flex-start" : "center",
          gap: children ? 0 : 12,
          padding: children ? 0 : 24,
          overflow: "hidden",
          transition: "width 0.3s ease, height 0.3s ease",
        }}
      >
        {children ? (
          <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
            {children}
          </div>
        ) : (
          <>
            {/* App icon */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onAppClick?.();
              }}
              style={{
                width: 56,
                height: 56,
                background: "#6a4c93",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: nudge
                  ? "0 0 20px rgba(106, 76, 147, 0.6)"
                  : "0 0 10px rgba(106, 76, 147, 0.3)",
                animation: nudge ? "pocket-pulse 1s ease-in-out infinite" : "none",
              }}
            >
              <div style={{ width: 24, height: 18, background: "#889099", borderRadius: 4 }} />
            </div>
            <p style={{ color: "#888", fontSize: 10 }}>get t' cheese</p>
          </>
        )}
      </div>

      {/* Nudge text */}
      {mode === "homescreen" && nudge && <NudgeBubble />}

      {mode === "homescreen" && (
        <p style={{ color: "#555", fontSize: 12, marginTop: 24 }}>
          click outside to close
        </p>
      )}
    </div>
  );
}

function NudgeBubble() {
  return (
    <div
      style={{
        position: "fixed",
        top: "25%",
        left: 24,
        maxWidth: 320,
        padding: "18px 28px",
        background: "#fff",
        border: "3px solid #222",
        borderRadius: 20,
        zIndex: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -18,
          top: "50%",
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          borderTop: "12px solid transparent",
          borderBottom: "12px solid transparent",
          borderRight: "18px solid #222",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -13,
          top: "50%",
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          borderRight: "15px solid #fff",
        }}
      />
      <p style={{ color: "#222", fontSize: 16, lineHeight: 1.5 }}>
        go ahead and click that app you just installed
      </p>
    </div>
  );
}
