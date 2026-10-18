import { describe, expect, it } from "vitest";
import { diskSlots, hexToWorld, initialLayout, refocus, type Coord, type Layout } from "./couple-disk";

const IDS = Array.from({ length: 25 }, (_, i) => `p${String(i)}`);
const k = ([q, r]: Coord) => `${String(q)},${String(r)}`;
const radius = (c: Coord, center: Coord) => {
  const { x, z } = hexToWorld([c[0] - center[0], c[1] - center[1]], 1);
  return Math.hypot(x, z);
};
const distinct = (l: Layout) => new Set(Object.values(l).map(k)).size;

describe("the couple disk", () => {
  it("is filled: the centre, then whole rings, nobody further out than a gap closer in", () => {
    const slots = diskSlots([0, 0], 25);
    expect(slots).toHaveLength(25);
    expect(new Set(slots.map(k)).size).toBe(25);
    expect(slots[0]).toEqual([0, 0]);
    const far = Math.max(...slots.map((s) => radius(s, [0, 0])));
    // Every lattice point strictly inside the outermost ring used is in the disk.
    for (const p of diskSlots([0, 0], 61)) {
      if (radius(p, [0, 0]) < far - 1e-6) expect(slots.map(k)).toContain(k(p));
    }
  });

  it("takes a partial last ring evenly round, so the disk stays round", () => {
    const slots = diskSlots([0, 0], 25);
    const far = Math.max(...slots.map((s) => radius(s, [0, 0])));
    const outer = slots.filter((s) => Math.abs(radius(s, [0, 0]) - far) < 1e-6);
    const sum = outer.reduce((acc, s) => {
      const { x, z } = hexToWorld(s, 1);
      return { x: acc.x + x, z: acc.z + z };
    }, { x: 0, z: 0 });
    expect(Math.hypot(sum.x, sum.z) / outer.length).toBeLessThan(0.5);
  });

  it("starts with the focus at the centre and everyone on their own point", () => {
    const l = initialLayout(IDS, "p7");
    expect(l["p7"]).toEqual([0, 0]);
    expect(distinct(l)).toBe(25);
  });

  it("🔑 a refocus keeps the new focus where it stands and moves only couples outside the new disk", () => {
    const before = initialLayout(IDS, "p0");
    const edge = IDS.reduce((a, b) => (radius(before[b]!, [0, 0]) > radius(before[a]!, [0, 0]) ? b : a));
    const after = refocus(before, IDS, edge);
    expect(after[edge]).toEqual(before[edge]);
    expect(distinct(after)).toBe(25);
    const disk = new Set(diskSlots(before[edge]!, 25).map(k));
    for (const id of IDS) {
      expect(disk.has(k(after[id]!))).toBe(true);
      if (disk.has(k(before[id]!))) expect(after[id]).toEqual(before[id]);
    }
    const moved = IDS.filter((id) => k(after[id]!) !== k(before[id]!));
    expect(moved.length).toBeGreaterThan(0);
    expect(moved.length).toBeLessThan(25);
  });

  it("refocusing on the couple already in focus moves nobody", () => {
    const l = initialLayout(IDS, "p3");
    expect(refocus(l, IDS, "p3")).toEqual(l);
  });
});
