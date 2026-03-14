import { useEffect, useState, type ReactNode } from "react";
import { getTownHappiness, getHappinessEmoji } from "../services/town-happiness";

interface PhoneOverlayProps {
  mode?: "homescreen" | "app";
  onFindClick?: () => void;
  onChatClick?: () => void;
  onSettingsClick?: () => void;
  onTownReportClick?: () => void;
  onClose: () => void;
  chatUnreadCount?: number;
  children?: ReactNode;
}

export function PhoneOverlay({
  mode = "homescreen",
  onFindClick,
  onChatClick,
  onSettingsClick,
  onTownReportClick,
  onClose,
  chatUnreadCount = 0,
  children,
}: PhoneOverlayProps) {
  const [selectedIcon, setSelectedIcon] = useState(0);

  // Build list of available home actions for keyboard nav
  const homeActions: (() => void)[] = [];
  if (mode === "homescreen") {
    if (onFindClick) homeActions.push(onFindClick);
    if (onChatClick) homeActions.push(onChatClick);
    if (onSettingsClick) homeActions.push(onSettingsClick);
    if (onTownReportClick) homeActions.push(onTownReportClick);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Escape" || e.code === "KeyE") { onClose(); return; }
      if (mode === "homescreen" && e.code === "KeyT" && onTownReportClick) { onTownReportClick(); return; }
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
          width: isApp ? 340 : 200,
          height: isApp ? 560 : 320,
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
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, justifyItems: "center" }}>
            {(() => {
              let idx = 0;
              const icons: React.ReactNode[] = [];
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
              if (onTownReportClick) {
                const i = idx++;
                const emoji = getHappinessEmoji(getTownHappiness());
                icons.push(
                  <HomeIcon key="town-report" icon={<span style={{ fontSize: 20 }}>{emoji}</span>} label="townage" bg="#2a2a3e" onClick={onTownReportClick} selected={selectedIcon === i} />
                );
              }
              return icons;
            })()}
          </div>
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
