const CHATS_KEY = "townage-chats";
const PREFS_KEY = "townage-chat-prefs";

export interface ChatMessage {
  id: string;
  sender: "player" | "npc";
  text: string;
  timestamp: number;
  isSeen?: boolean; // true when Haiku was unavailable
}

export interface ChatPreferences {
  useHaiku: boolean;
  optInShown: boolean;
}

let counter = 0;
export function genMessageId(): string {
  return `${Date.now()}-${++counter}`;
}

export function getChats(npcId: string): ChatMessage[] {
  try {
    const data = localStorage.getItem(CHATS_KEY);
    if (!data) return [];
    const allChats = JSON.parse(data) as Record<string, ChatMessage[]>;
    return allChats[npcId] ?? [];
  } catch {
    return [];
  }
}

export function addMessage(npcId: string, msg: ChatMessage): void {
  try {
    const data = localStorage.getItem(CHATS_KEY);
    const allChats: Record<string, ChatMessage[]> = data
      ? JSON.parse(data)
      : {};
    if (!allChats[npcId]) allChats[npcId] = [];
    allChats[npcId].push(msg);
    localStorage.setItem(CHATS_KEY, JSON.stringify(allChats));
  } catch {
    // localStorage full or unavailable
  }
}

export function getAllChatNpcIds(): string[] {
  try {
    const data = localStorage.getItem(CHATS_KEY);
    if (!data) return [];
    return Object.keys(JSON.parse(data) as Record<string, ChatMessage[]>);
  } catch {
    return [];
  }
}

export function getPreferences(): ChatPreferences {
  try {
    const data = localStorage.getItem(PREFS_KEY);
    if (!data) return { useHaiku: false, optInShown: false };
    return JSON.parse(data) as ChatPreferences;
  } catch {
    return { useHaiku: false, optInShown: false };
  }
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
  return FRIENDLY_EMOJIS[Math.floor(Math.random() * FRIENDLY_EMOJIS.length)]!;
}
