import { describe, expect, it } from "vitest";
import { defined } from "../test/defined";
import { diskSlots, initialLayout, refocus, ringAngles, type Coord, type Layout } from "./couple-disk";

const IDS = Array.from({ length: 25 }, (_, i) => `p${String(i)}`);
const k = ([x, z]: Coord) => `${x.toFixed(6)},${z.toFixed(6)}`;
const radius = (c: Coord, center: Coord) => Math.hypot(c[0] - center[0], c[1] - center[1]);
const distinct = (l: Layout) => new Set(Object.values(l).map(k)).size;

describe("the couple disk", () => {
  it("🔑 is the focus, then rings of 5, 9 and 10, each evenly spaced round its circle", () => {
    const slots = diskSlots([0, 0], 25);
    expect(slots).toHaveLength(25);
    expect(slots[0]).toEqual([0, 0]);
    const byRing = [1, 2, 3].map((r) => slots.filter((s) => Math.abs(radius(s, [0, 0]) - r) < 1e-6));
    expect(byRing.map((r) => r.length)).toEqual([5, 9, 10]);
    for (const ring of ringAngles(24)) {
      const sorted = [...ring].sort((a, b) => a - b);
      const steps = sorted.map((a, i) => (i + 1 < sorted.length ? defined(sorted[i + 1], "sorted[i + 1]") : defined(sorted[0], "sorted[0]") + 2 * Math.PI) - a);
      for (const step of steps) expect(step).toBeCloseTo((2 * Math.PI) / ring.length, 9);
    }
  });

  it("turns each outer ring off the inner couples' lines as far as even spacing allows", () => {
    const [r1, r2] = ringAngles(14);
    const gap = Math.min(...defined(r2, "r2").flatMap((a) => defined(r1, "r1").map((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))))));
    // 9 against 5 can be at most 4° off (their spacings share 8°); it gets there.
    expect((gap * 180) / Math.PI).toBeCloseTo(4, 0);
  });

  it("leaves the camera's side of the focus open in the first ring", () => {
    const front = diskSlots([0, 0], 6).slice(1).filter((s) => s[1] > 0 && Math.abs(s[0]) < 0.3);
    expect(front).toHaveLength(0);
  });

  it("starts with the focus at the centre and everyone on their own spot", () => {
    const l = initialLayout(IDS, "p7");
    expect(l["p7"]).toEqual([0, 0]);
    expect(distinct(l)).toBe(25);
  });

  it("🔑 a refocus keeps the new focus where it stands and fills the disk round it", () => {
    const before = initialLayout(IDS, "p0");
    const edge = IDS.reduce((a, b) => (radius(defined(before[b], "before[b]"), [0, 0]) > radius(defined(before[a], "before[a]"), [0, 0]) ? b : a));
    const after = refocus(before, IDS, edge);
    expect(after[edge]).toEqual(before[edge]);
    expect(distinct(after)).toBe(25);
    const disk = new Set(diskSlots(defined(before[edge], "before[edge]"), 25).map(k));
    for (const id of IDS) expect(disk.has(k(defined(after[id], "after[id]")))).toBe(true);
  });

  it("refocusing on the couple already in focus moves nobody", () => {
    const l = initialLayout(IDS, "p3");
    expect(refocus(l, IDS, "p3")).toEqual(l);
  });
});
