/**
 * Where every couple stands on `#review2`'s floor: a filled disk of couples on a hex lattice,
 * with the focus couple at the centre. (2026-10-18)
 *
 * Couples sit on lattice points, not at free positions, so "the disk around this couple" is a
 * set of points and a refocus can say exactly who's already in it. The spacing dial scales the
 * lattice and never moves a couple to a different point.
 *
 * 🔑 **A refocus moves as few couples as it can.** The new focus stays where it stands (the
 * camera goes to it). Every couple already inside the new disk stays too, and only the ones left
 * outside move, into the points the new disk has empty. Which couples are where depends on the
 * order focus changes came in, so the layout is **managed** state (ADR-0065): it lives in the
 * session reducer and is changed only by `refocus`.
 */

/** Axial hex coordinates. */
export type Coord = readonly [q: number, r: number];

const SQRT3 = Math.sqrt(3);

/** A lattice point on the floor, `spacing` metres between neighbours. */
export function hexToWorld([q, r]: Coord, spacing: number): { x: number; z: number } {
  return { x: spacing * (q + r / 2), z: spacing * ((r * SQRT3) / 2) };
}

const key = ([q, r]: Coord) => `${String(q)},${String(r)}`;

/**
 * The `n` lattice points nearest `center`, as a filled disk. Whole rings by distance, and where
 * the last ring is only partly needed, its points are taken evenly around it, so the disk stays
 * round instead of growing a lump on one side.
 */
export function diskSlots(center: Coord, n: number): Coord[] {
  const reach = Math.ceil(Math.sqrt(n)) + 1;
  const rings = new Map<number, { c: Coord; angle: number }[]>();
  for (let dq = -reach; dq <= reach; dq++) {
    for (let dr = -reach; dr <= reach; dr++) {
      const { x, z } = hexToWorld([dq, dr], 1);
      const d = Math.round(Math.hypot(x, z) * 1e6);
      const ring = rings.get(d) ?? [];
      ring.push({ c: [center[0] + dq, center[1] + dr], angle: Math.atan2(z, x) });
      rings.set(d, ring);
    }
  }
  const out: Coord[] = [];
  for (const d of [...rings.keys()].sort((a, b) => a - b)) {
    const ring = (rings.get(d) ?? []).sort((a, b) => a.angle - b.angle);
    const need = n - out.length;
    if (need <= 0) break;
    if (ring.length <= need) out.push(...ring.map((p) => p.c));
    else for (let i = 0; i < need; i++) out.push(ring[Math.floor((i * ring.length) / need)]!.c);
  }
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

/**
 * Re-centre the disk on `focus` where it stands. Couples inside the new disk keep their points;
 * the rest move into the empty ones, nearest-first in both lists so the moves stay short.
 */
export function refocus(layout: Layout, ids: readonly string[], focus: string): Layout {
  const center = layout[focus];
  if (center === undefined) return initialLayout(ids, focus);
  const slots = diskSlots(center, ids.length);
  const inDisk = new Set(slots.map(key));
  const taken = new Set<string>();
  const out: Record<string, Coord> = {};
  const movers: string[] = [];
  for (const id of ids) {
    const at = layout[id];
    if (at !== undefined && inDisk.has(key(at)) && !taken.has(key(at))) {
      out[id] = at;
      taken.add(key(at));
    } else movers.push(id);
  }
  const empty = slots.filter((s) => !taken.has(key(s)));
  // Movers whose old point was nearest the new disk take the empty points nearest its centre.
  const dist = (c: Coord | undefined) => {
    if (c === undefined) return Infinity;
    const { x, z } = hexToWorld([c[0] - center[0], c[1] - center[1]], 1);
    return Math.hypot(x, z);
  };
  movers.sort((a, b) => dist(layout[a]) - dist(layout[b]));
  movers.forEach((id, i) => { out[id] = empty[i]!; });
  return out;
}
