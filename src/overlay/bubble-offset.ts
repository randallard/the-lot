import { arrayOf, isNumber, isRecord, readStoredJson } from "../services/json-guards";

// Screen size buckets for saving bubble position preferences.
// Groups similar screen sizes so small resizes don't lose preferences.
const BREAKPOINTS = [480, 768, 1024, 1280, 1600, 1920, 2560];

export function getScreenSizeIndex(): number {
  const w = window.innerWidth;
  const i = BREAKPOINTS.findIndex((bp) => w <= bp);
  if (i !== -1) return i;
  return BREAKPOINTS.length;
}

function storageKey(role: string, idx: number): string {
  return `bubble-offset-${role}-${idx}`;
}

export function loadBubbleOffset(role: string): { x: number; y: number } | null {
  const saved = readStoredJson(storageKey(role, getScreenSizeIndex()));
  return isRecord(saved) && isNumber(saved.x) && isNumber(saved.y) ? { x: saved.x, y: saved.y } : null;
}

export function saveBubbleOffset(role: string, offset: { x: number; y: number }): void {
  const idx = getScreenSizeIndex();
  try {
    localStorage.setItem(storageKey(role, idx), JSON.stringify(offset));
  } catch {}
}

export function hasOffsetForCurrentSize(role: string): boolean {
  const idx = getScreenSizeIndex();
  return localStorage.getItem(storageKey(role, idx)) !== null;
}

const HINT_DISMISSED_KEY = "bubble-hint-dismissed";

export function isBubbleHintDismissed(): boolean {
  return arrayOf(readStoredJson(HINT_DISMISSED_KEY), isNumber).includes(getScreenSizeIndex());
}

export function dismissBubbleHint(): void {
  const idx = getScreenSizeIndex();
  try {
    const sizes = arrayOf(readStoredJson(HINT_DISMISSED_KEY), isNumber);
    if (!sizes.includes(idx)) {
      sizes.push(idx);
      localStorage.setItem(HINT_DISMISSED_KEY, JSON.stringify(sizes));
    }
  } catch {}
}
