import { describe, expect, it } from "vitest";
import {
  EMBER_DEFAULTS,
  MYCO_DEFAULTS,
  NPC_DEFAULTS,
  lateralClearance,
  rigidParts,
  type CharacterBodyShape,
} from "./body-shapes";

function shapeWith(over: {
  body?: Partial<CharacterBodyShape["body"]>;
  head?: Partial<CharacterBodyShape["head"]>;
  layout?: Partial<CharacterBodyShape["layout"]>;
}): CharacterBodyShape {
  return {
    ...NPC_DEFAULTS,
    body: { ...NPC_DEFAULTS.body, ...over.body },
    head: { ...NPC_DEFAULTS.head, ...over.head },
    layout: { ...NPC_DEFAULTS.layout, ...over.layout },
  };
}

describe("rigidParts — the clearance silhouette", () => {
  it("is the body capsule segment plus the head as a zero-length segment", () => {
    const [body, head] = rigidParts(NPC_DEFAULTS);
    // NPC default at bodyCenterY 0.5: body height 0.3, radius 0.3.
    expect(body).toEqual({ y0: 0.35, y1: 0.65, radius: 0.3 });
    // bodyTop 0.95, headBodyGap −0.2, head radius 0.3 → center 1.05.
    expect(head?.y0).toBeCloseTo(1.05, 9);
    expect(head?.y1).toBeCloseTo(1.05, 9);
    expect(head?.radius).toBeCloseTo(0.3, 9);
  });

  it("forward head offset does not widen the lateral silhouette", () => {
    // Dancers pass side-on: a forward-jutting caricature head (Ember's 0.28)
    // never narrows the lane gap.
    const [, head] = rigidParts(EMBER_DEFAULTS);
    expect(head?.radius).toBeCloseTo(EMBER_DEFAULTS.head.radius, 9);
  });

  it("sideways head offset counts in full", () => {
    const [, head] = rigidParts(shapeWith({ head: { offsetX: -0.4 } }));
    expect(head?.radius).toBeCloseTo(NPC_DEFAULTS.head.radius + 0.4, 9);
  });

  it("sideways lean widens the body; forward lean does not", () => {
    const tall = { height: 2.0, radius: 0.1 };
    const [sideways] = rigidParts(shapeWith({ body: { ...tall, leanZ: 30 } }));
    const [forward] = rigidParts(shapeWith({ body: { ...tall, leanX: 30 } }));
    expect(sideways?.radius).toBeCloseTo(0.1 + Math.sin(Math.PI / 6) * 1.0, 9);
    expect(forward?.radius).toBeCloseTo(0.1, 9);
  });
});

describe("lateralClearance — height-aware pair clearance", () => {
  it("parts at the same height need the full sum of radii", () => {
    const pair = rigidParts(NPC_DEFAULTS);
    // Identical dancers: bodies overlap in height, heads coincide → 0.6.
    expect(lateralClearance(pair, pair)).toBeCloseTo(0.6, 9);
  });

  it("parts at different heights need less — the √((r₁+r₂)²−dy²) chord", () => {
    const a = rigidParts(MYCO_DEFAULTS);
    const b = rigidParts(EMBER_DEFAULTS);
    // Binding pair is Myco's 0.49 head (y 1.04, inside Ember's tall torso span)
    // against Ember's 0.22 torso → 0.71. Ember's own head is high enough (1.715)
    // that against Myco's head (dy 0.675, radii 0.93) only 0.6397 is needed.
    expect(lateralClearance(a, b)).toBeCloseTo(0.71, 9);
  });

  it("a short dancer passes under a tall dancer's head entirely", () => {
    const child = rigidParts(
      shapeWith({ body: { radius: 0.1, height: 0.1 }, head: { radius: 0.1 } }),
    );
    const adult = rigidParts(NPC_DEFAULTS);
    // Child head center 0.55+0.1−0.2… all parts sit below the adult head's
    // reach; the need comes from torso-vs-torso and torso-vs-child-head chords,
    // strictly less than any disc sum involving the adult's 0.3 head at 1.05.
    const need = lateralClearance(child, adult);
    expect(need).toBeLessThan(0.1 + 0.3 + 0.2); // < naive disc sum of widest parts
    expect(need).toBeGreaterThan(0);
  });

  it("is symmetric", () => {
    const a = rigidParts(MYCO_DEFAULTS);
    const b = rigidParts(EMBER_DEFAULTS);
    expect(lateralClearance(a, b)).toBeCloseTo(lateralClearance(b, a), 9);
  });

  it("far-separated heights need nothing", () => {
    const low: readonly [{ y0: number; y1: number; radius: number }] = [
      { y0: 0, y1: 0.1, radius: 0.2 },
    ];
    const high = [{ y0: 2, y1: 2.1, radius: 0.2 }];
    expect(lateralClearance(low, high)).toBe(0);
  });
});
