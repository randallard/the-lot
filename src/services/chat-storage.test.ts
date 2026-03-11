import { describe, it, expect, beforeEach } from "vitest";
import {
  addMessage,
  getChats,
  genMessageId,
  getUnreadCount,
  getTotalUnreadCount,
  markAsRead,
} from "./chat-storage";

describe("chat-storage unread features", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function addUnread(npcId: string, text: string): void {
    addMessage(npcId, {
      id: genMessageId(),
      sender: "npc",
      text,
      timestamp: Date.now(),
      isUnread: true,
    });
  }

  it("getUnreadCount returns 0 when no messages", () => {
    expect(getUnreadCount("myco")).toBe(0);
  });

  it("getUnreadCount counts unread messages", () => {
    addUnread("myco", "hello");
    addUnread("myco", "world");
    addMessage("myco", {
      id: genMessageId(),
      sender: "player",
      text: "hi",
      timestamp: Date.now(),
    });
    expect(getUnreadCount("myco")).toBe(2);
  });

  it("getTotalUnreadCount counts across all NPCs", () => {
    addUnread("myco", "msg1");
    addUnread("ember", "msg2");
    addUnread("ember", "msg3");
    expect(getTotalUnreadCount()).toBe(3);
  });

  it("markAsRead clears unread flags for an NPC", () => {
    addUnread("myco", "msg1");
    addUnread("myco", "msg2");
    addUnread("ember", "msg3");

    markAsRead("myco");

    expect(getUnreadCount("myco")).toBe(0);
    expect(getUnreadCount("ember")).toBe(1);
    expect(getTotalUnreadCount()).toBe(1);
  });

  it("markAsRead is idempotent", () => {
    addUnread("myco", "msg1");
    markAsRead("myco");
    markAsRead("myco");
    expect(getUnreadCount("myco")).toBe(0);
  });

  it("markAsRead preserves message content", () => {
    addUnread("myco", "test message");
    markAsRead("myco");

    const chats = getChats("myco");
    expect(chats).toHaveLength(1);
    expect(chats[0]!.text).toBe("test message");
    expect(chats[0]!.isUnread).toBe(false);
  });
});
