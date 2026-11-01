import { arrayOf, isBoolean, isNumber, isRecord, isString, readStoredJson, recordOf } from "./json-guards";

const CHATS_KEY = "townage-chats";
const PREFS_KEY = "townage-chat-prefs";

export interface ChatMessage {
  id: string;
  sender: "player" | "npc" | "system";
  text: string;
  timestamp: number;
  isSeen?: boolean; // true when Haiku was unavailable
  isUnread?: boolean; // true for async NPC messages not yet viewed
}

export interface ChatPreferences {
  useHaiku: boolean;
  optInShown: boolean;
}

function isChatMessage(v: unknown): v is ChatMessage {
  return (
    isRecord(v) && isString(v.id) && isString(v.text) && isNumber(v.timestamp) &&
    (v.sender === "player" || v.sender === "npc" || v.sender === "system") &&
    (v.isSeen === undefined || isBoolean(v.isSeen)) &&
    (v.isUnread === undefined || isBoolean(v.isUnread))
  );
}

/** Every NPC's chat, keeping only the messages that read back as messages. */
function loadChats(): Record<string, ChatMessage[]> {
  const all = recordOf(readStoredJson(CHATS_KEY), Array.isArray);
  const out: Record<string, ChatMessage[]> = {};
  for (const [npcId, msgs] of Object.entries(all)) out[npcId] = arrayOf(msgs, isChatMessage);
  return out;
}

let counter = 0;
export function genMessageId(): string {
  return `${Date.now()}-${++counter}`;
}

export function getChats(npcId: string): ChatMessage[] {
  return loadChats()[npcId] ?? [];
}

export function addMessage(npcId: string, msg: ChatMessage): void {
  try {
    const allChats = loadChats();
    (allChats[npcId] ??= []).push(msg);
    localStorage.setItem(CHATS_KEY, JSON.stringify(allChats));
  } catch {
    // localStorage full or unavailable
  }
}

export function getAllChatNpcIds(): string[] {
  return Object.keys(loadChats());
}

export function getPreferences(): ChatPreferences {
  const prefs = readStoredJson(PREFS_KEY);
  if (!isRecord(prefs)) return { useHaiku: false, optInShown: false };
  return { useHaiku: prefs.useHaiku === true, optInShown: prefs.optInShown === true };
}

export function setPreferences(prefs: ChatPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearAllChats(): void {
  localStorage.removeItem(CHATS_KEY);
}

const FRIENDLY_EMOJIS = [
  "😊", "👋", "🌟", "✨", "🎉", "💫", "🌈", "🍀",
  "🦊", "🐱", "🐶", "🦋", "🐝", "🐢", "🦉", "🐙",
  "🌻", "🍄", "🐉", "💚", "🎵", "🌸", "🐾", "🦜",
];

export function getRandomEmoji(): string {
  return FRIENDLY_EMOJIS[Math.floor(Math.random() * FRIENDLY_EMOJIS.length)] ?? "😊";
}

export function getUnreadCount(npcId: string): number {
  return getChats(npcId).filter((m) => m.isUnread).length;
}

export function getTotalUnreadCount(): number {
  let count = 0;
  for (const msgs of Object.values(loadChats())) {
    count += msgs.filter((m) => m.isUnread).length;
  }
  return count;
}

export function markAsRead(npcId: string): void {
  try {
    const allChats = loadChats();
    const msgs = allChats[npcId];
    if (!msgs) return;
    let changed = false;
    for (const msg of msgs) {
      if (msg.isUnread) {
        msg.isUnread = false;
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(CHATS_KEY, JSON.stringify(allChats));
    }
  } catch {}
}
