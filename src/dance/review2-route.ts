/**
 * Which pairing and figure, if any, the posing screen should open on for a given URL hash.
 *
 * `#review2` → the first figure, first pairing; `#review2=<figure>/<beau>-<belle>` → that one;
 * a trailing `/only` → that one, with changes going to that couple alone (the drawer's highlight);
 * anything unknown → the first, for the reason `review-route.ts` gives (a stale link should open
 * the screen, not a blank page). Anything that is not a `#review2` hash → `null`.
 *
 * 🧪 **Prototype (2026-10-18).** `#review2` is the posing screen planned in the 10-11 journal —
 * Ryan poses, the rules check — stood up beside `#review` rather than inside it. The address has
 * no step in it on purpose: this screen is about the whole move, and where along it you are is
 * the scrubber's, not the URL's. See `work/square-dance-planning/review2/`.
 *
 * Its own module so `main.tsx` can parse at mount time without breaking fast refresh.
 */

import { REVIEW2_FIGURES, type Review2Figure } from "./review2-figures";
import { reviewPairings, pairingId, type Pairing } from "./review-route";

export interface PoseTarget {
  readonly figure: Review2Figure;
  readonly pairing: Pairing;
  /** Edits go to this pairing alone, not to the draft every pairing shares. */
  readonly only: boolean;
}

export function poseTargetId(t: PoseTarget): string {
  return `${t.figure.id}/${pairingId(t.pairing)}${t.only ? "/only" : ""}`;
}

export function review2Target(hash: string): PoseTarget | null {
  const m = /^#review2(?:=(.*))?$/.exec(hash);
  if (m === null) return null;
  const figures = REVIEW2_FIGURES;
  const pairings = reviewPairings();
  const first: PoseTarget | null =
    figures[0] !== undefined && pairings[0] !== undefined
      ? { figure: figures[0], pairing: pairings[0], only: false }
      : null;
  const requested = m[1];
  if (requested === undefined || requested === "") return first;
  const [figureId, pair, mode] = decodeURIComponent(requested).split("/");
  const figure = figures.find((f) => f.id === figureId);
  const pairing = pairings.find((p) => pairingId(p) === pair);
  return figure !== undefined && pairing !== undefined ? { figure, pairing, only: mode === "only" } : first;
}

export function review2Hash(t: PoseTarget): string {
  return `#review2=${poseTargetId(t)}`;
}
