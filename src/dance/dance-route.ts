/**
 * Which figure, if any, the debug scene should show for a given URL hash.
 *
 * Its own module so `DanceDebugScene.tsx` exports only a component — `main.tsx`
 * needs this at mount time, and mixing it in breaks fast refresh.
 */

import type { CallName } from "square-one";

/**
 * Something the debug scene can dance: either one call by a **facing pair**, or a
 * sequence of calls by a **couple**.
 *
 * The two are different formations rather than different lengths (planning ADR-0011's
 * S1). A facing pair points opposite ways; a couple points the same way, which is why
 * square-one composes each side of a couple from its own chain instead of deriving one
 * dancer from the other.
 */
export interface DebugFigure {
  readonly id: string;
  readonly label: string;
  /** The call a facing pair dances. Ignored when `sequence` is set. */
  readonly call: CallName;
  /** When present, the couple sequence to dance instead. */
  readonly sequence?: readonly CallName[];
}

export const DEBUG_FIGURES: readonly DebugFigure[] = [
  { id: "dosado", label: "Dosado", call: "dosado" },
  { id: "pass-thru", label: "Pass Thru", call: "pass-thru" },
  { id: "allemande-left", label: "Allemande Left", call: "allemande-left" },
  // S1's couple work. Both of these are **zeros** — the set finishes where it started —
  // which is the property to watch for as much as the shapes themselves.
  {
    id: "two-trades",
    label: "2× Partner Trade (zero)",
    call: "partner-trade",
    sequence: ["partner-trade", "partner-trade"],
  },
  {
    id: "two-twirls",
    label: "2× California Twirl (zero)",
    call: "california-twirl",
    sequence: ["california-twirl", "california-twirl"],
  },
  // 🔴 The two calls walk the **identical** paths (square-one's ADR-0017): a Twirl is a
  // Trade with the inside hands joined and raised. One of each is a zero, and until the
  // arch is drawn the two halves of this figure are indistinguishable on screen — which
  // is the honest state of it, and what makes this the figure to re-watch when it is.
  {
    id: "trade-twirl",
    label: "Trade + Twirl (same paths, different hands)",
    call: "partner-trade",
    sequence: ["partner-trade", "california-twirl"],
  },
];

/** The calls a facing pair can be sent to directly. Kept for the scene's older buttons. */
export const DEBUG_CALLS: readonly CallName[] = DEBUG_FIGURES.filter(
  (f) => f.sequence === undefined,
).map((f) => f.call);

const DEFAULT_FIGURE = DEBUG_FIGURES[0] as DebugFigure;

/** `#dance` → Dosado; `#dance=two-trades` → that figure; anything else → the default. */
export function danceSceneFigure(hash: string): DebugFigure | null {
  const m = /^#dance(?:=(.*))?$/.exec(hash);
  if (m === null) return null;
  const requested = m[1];
  if (requested === undefined || requested === "") return DEFAULT_FIGURE;
  return DEBUG_FIGURES.find((f) => f.id === requested) ?? DEFAULT_FIGURE;
}

/**
 * The hash that names a figure — the inverse of {@link danceSceneFigure}, and here
 * rather than in the scene because an inverse that lives away from its function is an
 * inverse nobody notices has stopped being one.
 *
 * The scene writes this as figures are chosen, so the URL in the bar is the URL that
 * reloads what is on screen. It used to write the figure's **call** instead, which is a
 * different namespace: `two-trades` dances `partner-trade`, so the couple figures each
 * wrote a hash that read back as the default and no couple watch could be reloaded or
 * shared. Round-tripped over every figure in `dance-route.test.ts`.
 */
export function danceSceneHash(figure: DebugFigure): string {
  return figure.id === DEFAULT_FIGURE.id ? "#dance" : `#dance=${figure.id}`;
}
