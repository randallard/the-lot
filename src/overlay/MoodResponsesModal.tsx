import { useState } from "react";
import {
  getAllMoodResponses,
  setMoodResponse,
  resetMoodResponses,
  DEFAULT_MOOD_RESPONSES,
} from "../services/mood-responses";

interface MoodResponsesModalProps {
  onClose: () => void;
}

const PROMPTS: Record<number, string> = {
  0: "a little down",
  1: "not great but not bad",
  2: "pretty good",
  3: "good",
  4: "great",
  5: "excited",
};

export function MoodResponsesModal({ onClose }: MoodResponsesModalProps) {
  const [responses, setResponses] = useState(() => getAllMoodResponses());

  const handleChange = (level: number, text: string) => {
    setMoodResponse(level, text);
    setResponses((prev) => ({ ...prev, [level]: text }));
  };

  const handleReset = () => {
    resetMoodResponses();
    setResponses({ ...DEFAULT_MOOD_RESPONSES });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
      }}
    >
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid #3a3a4e",
          borderRadius: 16,
          padding: "20px 24px",
          maxWidth: 320,
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p
          style={{
            color: "#e0d4f0",
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
          }}
        >
          customize your check-in
        </p>
        <p style={{ color: "#b0a0c8", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
          what would you say to let them know you're feeling...
        </p>

        {[0, 1, 2, 3, 4, 5].map((level) => (
          <div key={level}>
            <p
              style={{
                color: "#b0a0c8",
                fontSize: 11,
                margin: "0 0 3px",
                textTransform: "lowercase",
              }}
            >
              {PROMPTS[level]}
            </p>
            <input
              type="text"
              value={responses[level] ?? ""}
              onChange={(e) => handleChange(level, e.target.value)}
              placeholder={DEFAULT_MOOD_RESPONSES[level]}
              style={{
                width: "100%",
                padding: "7px 10px",
                background: "#12121e",
                border: "1px solid #3a3a4e",
                borderRadius: 8,
                color: "#ddd",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <button
            onClick={handleReset}
            style={{
              background: "transparent",
              border: "none",
              color: "#9b8abf",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            reset defaults
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "6px 18px",
              background: "#6a4c93",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            done
          </button>
        </div>
      </div>
    </div>
  );
}
