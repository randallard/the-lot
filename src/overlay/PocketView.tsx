import { useEffect } from "react";

interface PocketViewProps {
  onClose: () => void;
  inventory: string[];
  onPhoneClick?: () => void;
}

export function PocketView({ onClose, inventory, onPhoneClick }: PocketViewProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "KeyE") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
        cursor: "pointer",
        zIndex: 10,
      }}
    >
      <p
        style={{
          color: "#888",
          fontSize: 14,
          letterSpacing: 1,
          marginBottom: 32,
        }}
      >
        your pocket
      </p>

      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 20px",
        }}
      >
        {inventory.length === 0 && (
          <p
            style={{
              color: "#555",
              fontSize: 16,
                }}
          >
            empty.
          </p>
        )}

        {inventory.includes("trinket") && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 28,
                height: 20,
                background: "#889099",
                borderRadius: 4,
                transform: "rotate(6deg)",
                boxShadow: "0 0 20px rgba(136, 144, 153, 0.3)",
                marginBottom: 10,
              }}
            />
            <p
              style={{
                color: "#999",
                fontSize: 12,
                    }}
            >
              trinket
            </p>
          </div>
        )}

        {inventory.includes("bot-parts") && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 2 }}>
              <div
                style={{
                  width: 22,
                  height: 16,
                  background: "#889099",
                  borderRadius: 3,
                  transform: "rotate(6deg)",
                }}
              />
              <div
                style={{
                  width: 22,
                  height: 16,
                  background: "#889099",
                  borderRadius: 3,
                  transform: "rotate(-4deg)",
                }}
              />
            </div>
            <p
              style={{
                color: "#999",
                fontSize: 12,
                marginTop: 10,
              }}
            >
              bot parts
            </p>
          </div>
        )}

        {inventory.includes("phone") && (
          <div
            onClick={onPhoneClick ? (e) => { e.stopPropagation(); onPhoneClick(); } : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: onPhoneClick ? "pointer" : "default",
              padding: onPhoneClick ? 20 : 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 60,
                background: "#222",
                borderRadius: 6,
                border: onPhoneClick ? "2px solid #6a4c93" : "2px solid #444",
                marginBottom: 10,
                boxShadow: onPhoneClick ? "0 0 15px rgba(106, 76, 147, 0.4)" : "none",
                transition: "border-color 0.3s, box-shadow 0.3s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {inventory.includes("gettcheese-app") && (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    background: "#6a4c93",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 6,
                      background: "#889099",
                      borderRadius: 2,
                    }}
                  />
                </div>
              )}
            </div>
            <p
              style={{
                color: onPhoneClick ? "#6a4c93" : "#999",
                fontSize: 12,
              }}
            >
              phone
            </p>
          </div>
        )}
      </div>

      <p
        style={{
          color: "#555",
          fontSize: 12,
          marginTop: 40,
        }}
      >
        click to close
      </p>
    </div>
  );
}
