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
  const [selectedIcon, setSelectedIcon] = useState(0);

  // Build list of available home actions for keyboard nav
  const homeActions: (() => void)[] = [];
  if (mode === "homescreen") {
    if (onAppClick) homeActions.push(onAppClick);
    if (onFindClick) homeActions.push(onFindClick);
    if (onChatClick) homeActions.push(onChatClick);
    if (onSettingsClick) homeActions.push(onSettingsClick);
  }

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
      if (e.code === "Escape" || e.code === "KeyE") { onClose(); return; }
      if (mode !== "homescreen" || homeActions.length === 0) return;
      const cols = 2;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIcon((s) => Math.min(s + 1, homeActions.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIcon((s) => Math.max(s - 1, 0));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIcon((s) => Math.min(s + cols, homeActions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIcon((s) => Math.max(s - cols, 0));
      } else if (e.key === "Tab") {
        e.preventDefault();
        setSelectedIcon((s) => (s + 1) % homeActions.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        homeActions[selectedIcon]?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, mode, homeActions, selectedIcon]);

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
            {(() => {
              let idx = 0;
              const icons: React.ReactNode[] = [];
              if (onAppClick) {
                const i = idx++;
                icons.push(
                  <HomeIcon key="app"
                    icon={<div style={{ width: 22, height: 16, background: "#889099", borderRadius: 4 }} />}
                    label="get t' cheese" bg="#6a4c93" onClick={onAppClick} selected={selectedIcon === i}
                  />
                );
              }
              if (onFindClick) {
                const i = idx++;
                icons.push(
                  <HomeIcon key="find" icon={<span style={{ fontSize: 20 }}>🔍</span>} label="find..." bg="#2a2a3e" onClick={onFindClick} selected={selectedIcon === i} />
                );
              }
              if (onChatClick) {
                const i = idx++;
                icons.push(
                  <HomeIcon key="chat" icon={<span style={{ fontSize: 20 }}>💬</span>} label="messages" bg="#2a2a3e" onClick={onChatClick} badge={chatUnreadCount > 0} selected={selectedIcon === i} />
                );
              }
              if (onSettingsClick) {
                const i = idx++;
                icons.push(
                  <HomeIcon key="settings" icon={<span style={{ fontSize: 20 }}>⚙️</span>} label="settings" bg="#2a2a3e" onClick={onSettingsClick} selected={selectedIcon === i} />
                );
              }
              return icons;
            })()}
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

function HomeIcon({ icon, label, bg, onClick, badge, selected }: { icon: React.ReactNode; label: string; bg: string; onClick: () => void; badge?: boolean; selected?: boolean }) {
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
          boxShadow: selected ? "0 0 12px rgba(155, 138, 191, 0.5)" : "0 0 8px rgba(100, 100, 150, 0.2)",
          border: selected ? "2px solid #9b8abf" : "2px solid transparent",
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