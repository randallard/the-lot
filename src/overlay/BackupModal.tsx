import { useRef, useState } from "react";
import { downloadBackup, importBackup } from "../services/backup";

interface BackupModalProps {
  onClose: () => void;
}

export function BackupModal({ onClose }: BackupModalProps) {
  const [includeChats, setIncludeChats] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    downloadBackup(includeChats);
    setStatus({ type: "ok", text: "backup downloaded!" });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importBackup(reader.result as string);
      if (result.ok) {
        setStatus({ type: "ok", text: `restored ${result.restoredKeys.length} items — refresh to apply` });
      } else {
        setStatus({ type: "error", text: result.error });
      }
    };
    reader.readAsText(file);
    // Reset file input so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid #2a2a3e",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "#9b59b6", fontSize: 16, fontWeight: 700, margin: 0 }}>
            backup & restore
          </p>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#666", fontSize: 12, cursor: "pointer" }}
          >
            close
          </button>
        </div>

        {/* Export */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: "#ccc", fontSize: 13, fontWeight: 600, margin: 0 }}>save backup</p>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeChats}
              onChange={(e) => setIncludeChats(e.target.checked)}
              style={{ accentColor: "#6a4c93" }}
            />
            <span style={{ color: "#888", fontSize: 12 }}>include chat history</span>
          </label>
          <button
            onClick={handleExport}
            style={{
              padding: "10px 16px",
              background: "#6a4c93",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            download backup
          </button>
        </div>

        <div style={{ height: 1, background: "#2a2a3e" }} />

        {/* Import */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: "#ccc", fontSize: 13, fontWeight: 600, margin: 0 }}>restore from backup</p>
          <p style={{ color: "#888", fontSize: 11, margin: 0 }}>
            this will overwrite your current data — refresh after restoring
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              padding: "10px 16px",
              background: "#2a2a3e",
              color: "#ccc",
              border: "1px solid #3a3a5e",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            choose file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        {/* Status */}
        {status && (
          <p
            style={{
              color: status.type === "ok" ? "#27ae60" : "#e74c3c",
              fontSize: 13,
              margin: 0,
              textAlign: "center",
            }}
          >
            {status.text}
          </p>
        )}
      </div>
    </div>
  );
}
