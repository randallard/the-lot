import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getScreenSizeIndex,
  loadBubbleOffset,
  saveBubbleOffset,
  hasOffsetForCurrentSize,
} from "./bubble-offset";

describe("getScreenSizeIndex", () => {
  it("returns 0 for small mobile (<=480)", () => {
    vi.stubGlobal("innerWidth", 375);
    expect(getScreenSizeIndex()).toBe(0);
  });

  it("returns 1 for tablet (481-768)", () => {
    vi.stubGlobal("innerWidth", 768);
    expect(getScreenSizeIndex()).toBe(1);
  });

  it("returns 4 for 1280-1600 range", () => {
    vi.stubGlobal("innerWidth", 1440);
    expect(getScreenSizeIndex()).toBe(4);
  });

  it("returns 6 for 1920-2560 range", () => {
    vi.stubGlobal("innerWidth", 2560);
    expect(getScreenSizeIndex()).toBe(6);
  });

  it("returns 7 for ultra-wide (>2560)", () => {
    vi.stubGlobal("innerWidth", 3840);
    expect(getScreenSizeIndex()).toBe(7);
  });

  it("returns index at exact breakpoint boundary", () => {
    vi.stubGlobal("innerWidth", 1024);
    expect(getScreenSizeIndex()).toBe(2);
  });
});

describe("saveBubbleOffset / loadBubbleOffset", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1440);
  });

  it("returns null when nothing saved", () => {
    expect(loadBubbleOffset("pc")).toBeNull();
    expect(loadBubbleOffset("npc")).toBeNull();
  });

  it("saves and loads pc offset", () => {
    const offset = { x: 0.5, y: -0.3 };
    saveBubbleOffset("pc", offset);
    expect(loadBubbleOffset("pc")).toEqual(offset);
  });

  it("saves and loads npc offset", () => {
    const offset = { x: -0.2, y: 0.1 };
    saveBubbleOffset("npc", offset);
    expect(loadBubbleOffset("npc")).toEqual(offset);
  });

  it("keeps pc and npc offsets separate", () => {
    saveBubbleOffset("pc", { x: 1, y: 2 });
    saveBubbleOffset("npc", { x: 3, y: 4 });
    expect(loadBubbleOffset("pc")).toEqual({ x: 1, y: 2 });
    expect(loadBubbleOffset("npc")).toEqual({ x: 3, y: 4 });
  });

  it("saves different offsets per screen size", () => {
    vi.stubGlobal("innerWidth", 375);
    saveBubbleOffset("pc", { x: 0.1, y: 0.1 });

    vi.stubGlobal("innerWidth", 1440);
    saveBubbleOffset("pc", { x: 0.5, y: 0.5 });

    vi.stubGlobal("innerWidth", 375);
    expect(loadBubbleOffset("pc")).toEqual({ x: 0.1, y: 0.1 });

    vi.stubGlobal("innerWidth", 1440);
    expect(loadBubbleOffset("pc")).toEqual({ x: 0.5, y: 0.5 });
  });

  it("overwrites previous offset for same screen size", () => {
    saveBubbleOffset("pc", { x: 1, y: 1 });
    saveBubbleOffset("pc", { x: 2, y: 2 });
    expect(loadBubbleOffset("pc")).toEqual({ x: 2, y: 2 });
  });
});

describe("hasOffsetForCurrentSize", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1440);
  });

  it("returns false when nothing saved", () => {
    expect(hasOffsetForCurrentSize("pc")).toBe(false);
  });

  it("returns true after saving", () => {
    saveBubbleOffset("pc", { x: 0, y: 0 });
    expect(hasOffsetForCurrentSize("pc")).toBe(true);
  });

  it("returns false for a different screen size", () => {
    saveBubbleOffset("pc", { x: 0, y: 0 });
    vi.stubGlobal("innerWidth", 375);
    expect(hasOffsetForCurrentSize("pc")).toBe(false);
  });
});
