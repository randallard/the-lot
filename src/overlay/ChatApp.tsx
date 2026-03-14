import { useState, useRef, useEffect, useCallback } from "react";
import { NPC_CONFIGS, getNpcById } from "../config/npcs";
import {
  getChats,
  addMessage,
  genMessageId,
  getPreferences,
  setPreferences,
  getRandomEmoji,
  getAllChatNpcIds,
  getUnreadCount,
  markAsRead,
  type ChatMessage,
} from "../services/chat-storage";
import { chatWithNpc } from "../services/haiku-npc";
import { nudgeFriendliness, NUDGE_CHAT } from "../services/npc-friendliness";
import { getRank } from "../services/npc-records";
import { isAsleep, recordMessage, getTimeUntilWake } from "../services/npc-sleep";
import { ChatInfoModal } from "./ChatInfoModal";
import { ChatOptInModal } from "./ChatOptInModal";

interface ChatAppProps {
  onClose: () => void;
  onUnreadChange?: () => void;
}

export function ChatApp({ onClose, onUnreadChange }: ChatAppProps) {
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);

  const handleSelectNpc = useCallback((id: string) => {
    setActiveNpcId(id);
    markAsRead(id);
    onUnreadChange?.();
  }, [onUnreadChange]);

  if (activeNpcId) {
    return (
      <ConversationView
        npcId={activeNpcId}
        onBack={() => setActiveNpcId(null)}
        onClose={onClose}
      />
    );
  }

  return <ContactsList onSelect={handleSelectNpc} onClose={onClose} />;
}

function ContactsList({
  onSelect,
  onClose,
}: {
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const npcIds = new Set([
    ...NPC_CONFIGS.map((n) => n.id),
    ...getAllChatNpcIds(),
  ]);

  const filteredIds = [...npcIds].filter((id) => {
    if (!filter) return true;
    const npc = getNpcById(id);
    if (!npc) return false;
    const q = filter.toLowerCase();
    return npc.displayName.toLowerCase().includes(q) || npc.id.toLowerCase().includes(q);
  });

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [filter]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (filteredIds.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((s) => Math.min(s + 1, filteredIds.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredIds[selectedIdx]) onSelect(filteredIds[selectedIdx]);
      }
    },
    [filteredIds, selectedIdx, onSelect],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        gap: 2,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 4px 8px",
        }}
      >
        <p
          style={{
            color: "#9b59b6",
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
          }}
        >
          messages
        </p>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#666",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          close
        </button>
      </div>

      <input
        type="text"
        placeholder="search..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIdx((s) => Math.min(s + 1, filteredIds.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIdx((s) => Math.max(s - 1, 0));
          } else if (e.key === "Enter" && filteredIds[selectedIdx]) {
            e.preventDefault();
            e.stopPropagation();
            onSelect(filteredIds[selectedIdx]);
          }
        }}
        style={{
          padding: "8px 12px",
          background: "#1a1a2e",
          border: "1px solid #2a2a3e",
          borderRadius: 10,
          color: "#ccc",
          fontSize: 13,
          outline: "none",
          margin: "0 4px 4px",
        }}
      />

      {filteredIds.map((id, i) => {
        const npc = getNpcById(id);
        if (!npc) return null;
        const chats = getChats(id);
        const lastMsg = chats[chats.length - 1];
        const unread = getUnreadCount(id);
        const rank = getRank(id);
        const isSel = i === selectedIdx;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              width: "100%",
              background: isSel ? "#2a2a4e" : "#1a1a2e",
              border: isSel ? "1px solid #6a4c93" : "1px solid #2a2a3e",
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 22 }}>{npc.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p
                style={{
                  color: isAsleep(id) ? "#666" : "#ccc",
                  fontSize: 14,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {npc.displayName}
              </p>
              {isAsleep(id) && (
                <span style={{ color: "#6a7fff", fontSize: 10 }}>zzz</span>
              )}
              {rank && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: rank === "S" ? "#FFD700" : rank === "A" ? "#C0C0C0" : "#8B6914",
                  color: rank === "S" ? "#1a1a2e" : rank === "A" ? "#1a1a2e" : "#fff",
                }}>
                  {rank}
                </span>
              )}
              </div>
              {lastMsg ? (
                <p
                  style={{
                    color: "#666",
                    fontSize: 11,
                    margin: "2px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lastMsg.sender === "player" ? "You: " : ""}
                  {lastMsg.text}
                </p>
              ) : (
                <p
                  style={{
                    color: "#555",
                    fontSize: 11,
                    margin: "2px 0 0",
                    fontStyle: "italic",
                  }}
                >
                  no messages yet
                </p>
              )}
            </div>
            {unread > 0 && (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#e74c3c",
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ConversationView({
  npcId,
  onBack,
  onClose,
}: {
  npcId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const npc = getNpcById(npcId);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    getChats(npcId),
  );
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState<"unavailable" | "privacy" | "sleeping" | null>(
    null,
  );
  const [showOptIn, setShowOptIn] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const doSendMessage = useCallback(
    async (msg: string) => {
      if (!msg.trim() || !npc || loading) return;

      const playerMsg: ChatMessage = {
        id: genMessageId(),
        sender: "player",
        text: msg.trim(),
        timestamp: Date.now(),
      };
      addMessage(npcId, playerMsg);
      recordMessage(npcId);
      setMessages((prev) => [...prev, playerMsg]);
      setText("");
      setLoading(true);

      const prefs = getPreferences();
      if (!prefs.useHaiku) {
        await new Promise((r) => setTimeout(r, 600));
        const emoji = getRandomEmoji();
        const npcMsg: ChatMessage = {
          id: genMessageId(),
          sender: "npc",
          text: emoji,
          timestamp: Date.now(),
        };
        addMessage(npcId, npcMsg);
        setMessages((prev) => [...prev, npcMsg]);
        setLoading(false);
        return;
      }

      try {
        const history = getChats(npcId);
        const result = await chatWithNpc(npc, history);
        const npcMsg: ChatMessage = {
          id: genMessageId(),
          sender: "npc",
          text: result.text,
          timestamp: Date.now(),
        };
        addMessage(npcId, npcMsg);
        setMessages((prev) => [...prev, npcMsg]);
        nudgeFriendliness(npcId, NUDGE_CHAT);
      } catch {
        const npcMsg: ChatMessage = {
          id: genMessageId(),
          sender: "npc",
          text: "\u{1F440}",
          timestamp: Date.now(),
          isSeen: true,
        };
        addMessage(npcId, npcMsg);
        setMessages((prev) => [...prev, npcMsg]);
      }
      setLoading(false);
    },
    [npcId, npc, loading],
  );

  const sendMessage = useCallback(
    (msg: string) => {
      const prefs = getPreferences();
      if (!prefs.optInShown) {
        setPendingMessage(msg);
        setShowOptIn(true);
        return;
      }
      doSendMessage(msg);
    },
    [doSendMessage],
  );

  const handleOptInChoice = useCallback(
    (useHaiku: boolean) => {
      setPreferences({ useHaiku, optInShown: true });
      setShowOptIn(false);
      if (pendingMessage) {
        doSendMessage(pendingMessage);
        setPendingMessage(null);
      }
    },
    [pendingMessage, doSendMessage],
  );

  if (!npc) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 4px",
          borderBottom: "1px solid #2a2a3e",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "#6a4c93",
            fontSize: 18,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          ←
        </button>
        <span style={{ fontSize: 18 }}>{npc.emoji}</span>
        <p
          style={{
            color: "#ccc",
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
            flex: 1,
          }}
        >
          {npc.displayName}
        </p>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#666",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          close
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {messages.length === 0 && (
          <p
            style={{
              color: "#555",
              fontSize: 12,
              textAlign: "center",
              marginTop: 20,
              fontStyle: "italic",
            }}
          >
            start a conversation with {npc.displayName}
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent:
                msg.sender === "player" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "8px 12px",
                borderRadius: 14,
                background:
                  msg.sender === "player" ? "#6a4c93" : "#2a2a3e",
                color: msg.sender === "player" ? "#fff" : "#ccc",
                fontSize: 13,
                lineHeight: 1.4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>{msg.text}</span>
              {msg.isSeen && (
                <button
                  onClick={() => setShowInfo("unavailable")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#666",
                    fontSize: 11,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  (?)
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 14,
                background: "#2a2a3e",
                color: "#888",
                fontSize: 13,
              }}
            >
              <span className="typing-dots">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input or sleep banner */}
      {isAsleep(npcId) ? (
        <div
          style={{
            padding: "12px 8px",
            borderTop: "1px solid #2a2a3e",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#888", fontSize: 12, margin: "0 0 4px" }}>
            {npc?.displayName ?? "NPC"} is sleeping... wakes {getTimeUntilWake(npcId) ?? "soon"}
          </p>
          <button
            onClick={() => setShowInfo("sleeping")}
            style={{
              background: "transparent",
              border: "none",
              color: "#6a4c93",
              fontSize: 11,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            why?
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: "8px 4px",
            borderTop: "1px solid #2a2a3e",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                e.stopPropagation();
                sendMessage(text);
              }
            }}
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 10,
              color: "#ccc",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            onClick={() => sendMessage(text)}
            disabled={!text.trim() || loading}
            style={{
              padding: "8px 14px",
              background: text.trim() && !loading ? "#6a4c93" : "#333",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              cursor: text.trim() && !loading ? "pointer" : "default",
              fontWeight: 600,
            }}
          >
            →
          </button>
        </div>
      )}

      {showOptIn && (
        <ChatOptInModal
          onAccept={() => handleOptInChoice(true)}
          onDecline={() => handleOptInChoice(false)}
        />
      )}

      {showInfo && (
        <ChatInfoModal mode={showInfo} onClose={() => setShowInfo(null)} />
      )}

      <style>{`
        .typing-dots {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          height: 1em;
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #888;
          animation: typing-bounce 1.4s ease-in-out infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
