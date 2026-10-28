/** 🧪 `#solve4` (step 5, 2026-10-27; `SolveFourScene`). */

/** `#solve4` → four NPC Ryans; `#solve4=a,b,c,d` → those four; anything else → null. */
export function solveFourCast(hash: string): string[] | null {
  const m = /^#solve4(?:=(.*))?$/.exec(hash);
  if (m === null) return null;
  const ids = (m[1] ?? "").split(",").filter((x) => x !== "");
  return [0, 1, 2, 3].map((i) => ids[i] ?? ids[0] ?? "ryan");
}
