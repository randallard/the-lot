/**
 * Shared registry for positioned world-mode chat bubbles.
 * Enables angled tails and overlap prevention across SpeechBubble / NpcChatBubble.
 */

// ---------------------------------------------------------------------------
// Unique IDs

let _nextId = 0;
export function allocBubbleId(): number {
  return _nextId++;
}

// ---------------------------------------------------------------------------
// Position registry — updated every RAF frame by each bubble

interface BubbleRect { x: number; y: number; w: number; h: number }
const _registry = new Map<number, BubbleRect>();

export function registerBubble(id: number, rect: BubbleRect): void {
  _registry.set(id, rect);
}

export function unregisterBubble(id: number): void {
  _registry.delete(id);
}

/**
 * Given a desired (x, y) position for a bubble of size (w, h), push it upward
 * until it no longer overlaps any other registered bubble.
 */
export function avoidOverlaps(
  myId: number,
  x: number, y: number,
  w: number, h: number,
  pad = 8,
): { x: number; y: number } {
  let fy = y;
  for (const [id, r] of _registry) {
    if (id === myId) continue;
    const xOverlap = x < r.x + r.w + pad && x + w > r.x - pad;
    const yOverlap = fy < r.y + r.h + pad && fy + h > r.y - pad;
    if (xOverlap && yOverlap) {
      fy = r.y - h - pad;
    }
  }
  // Clamp to viewport so pushing never sends a bubble off-screen
  const margin = 8;
  fy = Math.max(margin, Math.min(window.innerHeight - h - margin, fy));
  const fx = Math.max(margin, Math.min(window.innerWidth - w - margin, x));
  return { x: fx, y: fy };
}

// ---------------------------------------------------------------------------
// Angled tail styles

/**
 * Compute CSS border-trick triangle styles for a downward-pointing tail
 * that leans toward the speaker.
 *
 * @param tailLeftPx   Position of the tail element from bubble's left edge
 * @param dx           speakerX − bubbleCenterX (positive = speaker to right)
 * @param bw           Bubble width in px
 * @param outerColor   Border colour for the outline triangle (default #222)
 * @param innerColor   Fill colour for the inner triangle (default #fff)
 */
export function computeTailStyles(
  tailLeftPx: number,
  dx: number,
  bw: number,
  outerColor = "#222",
  innerColor = "#fff",
): { outer: React.CSSProperties; inner: React.CSSProperties } {
  // Lean factor: −1 = fully left, +1 = fully right
  const lean = Math.max(-0.85, Math.min(0.85, dx / Math.max(bw / 2, 1)));

  // Asymmetric border widths. Outer total = 24px, inner total = 20px.
  const OL = Math.max(2, Math.min(22, Math.round(12 + lean * 9)));
  const OR = 24 - OL;
  const IL = Math.max(1, OL - 2);
  const IR = Math.max(1, OR - 2);

  return {
    outer: {
      position: "absolute",
      bottom: -18,
      left: tailLeftPx,
      width: 0,
      height: 0,
      borderLeft: `${OL}px solid transparent`,
      borderRight: `${OR}px solid transparent`,
      borderTop: `18px solid ${outerColor}`,
    },
    inner: {
      position: "absolute",
      bottom: -13,
      left: tailLeftPx + 2,
      width: 0,
      height: 0,
      borderLeft: `${IL}px solid transparent`,
      borderRight: `${IR}px solid transparent`,
      borderTop: `15px solid ${innerColor}`,
    },
  };
}
