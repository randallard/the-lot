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
  const npcIds = new Set([
    ...NPC_CONFIGS.map((n) => n.id),
    ...getAllChatNpcIds(),
  ]);

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

      {[...npcIds].map((id) => {
        const npc = getNpcById(id);
        if (!npc) return null;
        const chats = getChats(id);
        const lastMsg = chats[chats.length - 1];
        const unread = getUnreadCount(id);
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            style={{
              width: "100%",
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
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
              <p
                style={{
                  color: "#ccc",
                  fontSize: 14,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {npc.displayName}
              </p>
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
  const [showInfo, setShowInfo] = useState<"unavailable" | "privacy" | null>(
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
        const response = await chatWithNpc(npc, history);
        const npcMsg: ChatMessage = {
          id: genMessageId(),
          sender: "npc",
          text: response,
          timestamp: Date.now(),
        };
        addMessage(npcId, npcMsg);
        setMessages((prev) => [...prev, npcMsg]);
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
              <span className="typing-dots">...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
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
          animation: typing-pulse 1.5s ease-in-out infinite;
        }
        @keyframes typing-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
