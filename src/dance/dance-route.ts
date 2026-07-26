/**
 * Which call, if any, the debug scene should show for a given URL hash.
 *
 * Its own module so `DanceDebugScene.tsx` exports only a component — `main.tsx`
 * needs this at mount time, and mixing it in breaks fast refresh.
 */

import type { CallName } from "square-one";

export const DEBUG_CALLS: readonly CallName[] = ["dosado", "pass-thru", "allemande-left"];

function isCallName(value: string): value is CallName {
  return (DEBUG_CALLS as readonly string[]).includes(value);
}

/** `#dance` → dosado; `#dance=pass-thru` → that call; anything else → `null`. */
export function danceSceneCall(hash: string): CallName | null {
  const m = /^#dance(?:=(.*))?$/.exec(hash);
  if (m === null) return null;
  const requested = m[1];
  if (requested === undefined || requested === "") return "dosado";
  return isCallName(requested) ? requested : "dosado";
}
