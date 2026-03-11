// Screen size buckets for saving bubble position preferences.
// Groups similar screen sizes so small resizes don't lose preferences.
const BREAKPOINTS = [480, 768, 1024, 1280, 1600, 1920, 2560];

export function getScreenSizeIndex(): number {
  const w = window.innerWidth;
  for (let i = 0; i < BREAKPOINTS.length; i++) {
    if (w <= BREAKPOINTS[i]) return i;
  }
  return BREAKPOINTS.length;
}

function storageKey(role: "pc" | "npc", idx: number): string {
  return `bubble-offset-${role}-${idx}`;
}

export function loadBubbleOffset(role: "pc" | "npc"): { x: number; y: number } | null {
  const idx = getScreenSizeIndex();
  try {
    const saved = localStorage.getItem(storageKey(role, idx));
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export function saveBubbleOffset(role: "pc" | "npc", offset: { x: number; y: number }): void {
  const idx = getScreenSizeIndex();
  try {
    localStorage.setItem(storageKey(role, idx), JSON.stringify(offset));
  } catch {}
}

export function hasOffsetForCurrentSize(role: "pc" | "npc"): boolean {
  const idx = getScreenSizeIndex();
  return localStorage.getItem(storageKey(role, idx)) !== null;
}

const HINT_DISMISSED_KEY = "bubble-hint-dismissed";

export function isBubbleHintDismissed(): boolean {
  const idx = getScreenSizeIndex();
  try {
    const val = localStorage.getItem(HINT_DISMISSED_KEY);
    if (!val) return false;
    const sizes: number[] = JSON.parse(val);
    return sizes.includes(idx);
  } catch {}
  return false;
}

export function dismissBubbleHint(): void {
  const idx = getScreenSizeIndex();
  try {
    const val = localStorage.getItem(HINT_DISMISSED_KEY);
    const sizes: number[] = val ? JSON.parse(val) : [];
    if (!sizes.includes(idx)) {
      sizes.push(idx);
      localStorage.setItem(HINT_DISMISSED_KEY, JSON.stringify(sizes));
    }
  } catch {}
}
