/**
 * Where every couple stands on `#review2`'s floor: a round disk of couples in concentric rings,
 * with the focus couple at the centre. (2026-10-18)
 *
 * Rings of 5, 9 and 10 (25 couples in all; bigger floors keep adding rings). The hex lattice the
 * first version used didn't look round, so this gives up shared lattice points for rings. Each ring
 * is evenly spaced, turned to keep off the inner couples' lines where it can (`ringAngles`). Ring 1
 * leaves the front (+z, the camera's side) open, so nobody stands between the camera and the focus.
 *
 * Positions are in spacing units: the spacing dial scales them and never moves a couple.
 *
 * 🔑 **A refocus keeps the new focus where it stands** (the camera goes to it) and gives everyone
 * else the nearest free spot of the new disk, closest pairs first, so most moves are short. Which
 * couples are where depends on the order focus changes came in, so the layout is **managed** state
 * (ADR-0065): it lives in the session reducer and is changed only by `refocus`.
 */

/** A point on the floor in spacing units: `[x, z]`. */
export type Coord = readonly [x: number, z: number];

/** Couples per ring, from the centre out. Past these, each ring holds a few more. */
export const RINGS = [5, 9, 10] as const;
const ringSize = (i: number) => RINGS[i] ?? Math.round((10 * (i + 1)) / 3);

/** A point on the floor in metres. */
export function toWorld([x, z]: Coord, spacing: number): { x: number; z: number } {
  return { x: x * spacing, z: z * spacing };
}

const TAU = Math.PI * 2;
const norm = (a: number) => ((a % TAU) + TAU) % TAU;

/** How far apart two directions are, either way round. */
const gap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/**
 * The angles of each ring's couples, **evenly spaced round each ring**. Ring 1 has a couple straight
 * behind the focus (−z). Each ring after is turned to stand as far as it can off the lines from the
 * focus through the inner rings' couples. With rings of 5, 9 and 10 some pair still comes within a
 * few degrees; even spacing comes first (Ryan, 2026-10-18).
 */
export function ringAngles(n: number): number[][] {
  const rings: number[][] = [];
  let left = n;
  for (let i = 0; left > 0; i++) {
    const count = Math.min(ringSize(i), left);
    left -= count;
    const even = (o: number) => Array.from({ length: count }, (_, k) => norm(o + (k * TAU) / count));
    if (i === 0) { rings.push(even(-Math.PI / 2)); continue; }
    const inner = rings.flat();
    let best = 0;
    let bestGap = -1;
    for (let s = 0; s < 360; s++) {
      const o = (s / 360) * (TAU / count);
      const g = Math.min(...even(o).flatMap((a) => inner.map((b) => gap(a, b))));
      if (g > bestGap + 1e-9) { bestGap = g; best = o; }
    }
    rings.push(even(best));
  }
  return rings;
}

/** The `n` spots of a disk centred on `center`: the centre, then each ring, inner first. */
export function diskSlots(center: Coord, n: number): Coord[] {
  if (n <= 0) return [];
  const out: Coord[] = [center];
  ringAngles(n - 1).forEach((ring, i) => {
    for (const a of ring) out.push([center[0] + (i + 1) * Math.cos(a), center[1] + (i + 1) * Math.sin(a)]);
  });
  return out;
}

export type Layout = Readonly<Record<string, Coord>>;

/** The first layout: the focus at the origin, everyone else filling the disk in the given order. */
export function initialLayout(ids: readonly string[], focus: string): Layout {
  const slots = diskSlots([0, 0], ids.length);
  const others = ids.filter((id) => id !== focus);
  const out: Record<string, Coord> = { [focus]: slots[0]! };
  others.forEach((id, i) => { out[id] = slots[i + 1]!; });
  return out;
}

const dist = (a: Coord, b: Coord) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Re-centre the disk on `focus` where it stands. Everyone else takes the free spot nearest them,
 * the closest couple-to-spot pairs settled first.
 */
export function refocus(layout: Layout, ids: readonly string[], focus: string): Layout {
  const center = layout[focus];
  if (center === undefined) return initialLayout(ids, focus);
  const [, ...spots] = diskSlots(center, ids.length);
  const others = ids.filter((id) => id !== focus);
  const pairs: { id: string; spot: number; d: number }[] = [];
  for (const id of others) {
    const at = layout[id];
    spots.forEach((s, spot) => pairs.push({ id, spot, d: at === undefined ? Infinity : dist(at, s) }));
  }
  pairs.sort((a, b) => a.d - b.d || a.spot - b.spot);
  const out: Record<string, Coord> = { [focus]: center };
  const used = new Set<number>();
  for (const p of pairs) {
    if (out[p.id] !== undefined || used.has(p.spot)) continue;
    out[p.id] = spots[p.spot]!;
    used.add(p.spot);
  }
  return out;
}
