import { useEffect, useState, type ReactNode } from "react";

interface PhoneOverlayProps {
  mode?: "homescreen" | "app";
  onAppClick?: () => void;
  onFindClick?: () => void;
  onChatClick?: () => void;
  onSettingsClick?: () => void;
  onClose: () => void;
  onNudge?: () => void;
  chatUnreadCount?: number;
  children?: ReactNode;
}

export function PhoneOverlay({
  mode = "homescreen",
  onAppClick,
  onFindClick,
  onChatClick,
  onSettingsClick,
  onClose,
  onNudge,
  chatUnreadCount = 0,
  children,
}: PhoneOverlayProps) {
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
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Escape" || e.code === "KeyE") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isApp = mode === "app";
  const hasGrid = !!(onFindClick || onChatClick || onSettingsClick);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.75)",
        zIndex: 10,
      }}
    >
      {/* Phone */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isApp ? 340 : hasGrid ? 200 : 160,
          height: isApp ? 560 : hasGrid ? 320 : 280,
          maxHeight: isApp ? "80vh" : undefined,
          background: "#111",
          borderRadius: 20,
          border: "3px solid #333",
          display: "flex",
          flexDirection: "column",
          alignItems: isApp ? "stretch" : "center",
          justifyContent: isApp ? "flex-start" : "center",
          gap: isApp ? 0 : 12,
          padding: isApp ? 12 : 24,
          overflow: isApp ? "auto" : "visible",
        }}
      >
        {isApp ? (
          children
        ) : hasGrid ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, justifyItems: "center" }}>
            {onAppClick && (
              <HomeIcon
                icon={<div style={{ width: 22, height: 16, background: "#889099", borderRadius: 4 }} />}
                label="get t' cheese"
                bg="#6a4c93"
                onClick={() => onAppClick()}
              />
            )}
            {onFindClick && (
              <HomeIcon icon={<span style={{ fontSize: 20 }}>🔍</span>} label="find..." bg="#2a2a3e" onClick={onFindClick} />
            )}
            {onChatClick && (
              <HomeIcon icon={<span style={{ fontSize: 20 }}>💬</span>} label="messages" bg="#2a2a3e" onClick={onChatClick} badge={chatUnreadCount > 0} />
            )}
            {onSettingsClick && (
              <HomeIcon icon={<span style={{ fontSize: 20 }}>⚙️</span>} label="settings" bg="#2a2a3e" onClick={onSettingsClick} />
            )}
          </div>
        ) : (
          <>
            {/* Single app icon (tutorial flow) */}
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
                animation: nudge
                  ? "pocket-pulse 1s ease-in-out infinite"
                  : "none",
              }}
            >
              <div style={{ width: 24, height: 18, background: "#889099", borderRadius: 4 }} />
            </div>
            <p style={{ color: "#888", fontSize: 10 }}>get t' cheese</p>
          </>
        )}
      </div>


      {!isApp && (
        <p style={{ color: "#555", fontSize: 12, marginTop: 24 }}>
          click outside to close
        </p>
      )}
    </div>
  );
}

function HomeIcon({ icon, label, bg, onClick, badge }: { icon: React.ReactNode; label: string; bg: string; onClick: () => void; badge?: boolean }) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          background: bg,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 8px rgba(100, 100, 150, 0.2)",
          position: "relative",
        }}
      >
        {icon}
        {badge && (
          <div
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#e74c3c",
              border: "2px solid #111",
            }}
          />
        )}
      </div>
      <p style={{ color: "#888", fontSize: 9, margin: 0 }}>{label}</p>
    </div>
  );
}