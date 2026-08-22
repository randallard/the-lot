import { describe, expect, it } from "vitest";
import { danceCoupleSequence, partnerUp, createPerformance, flattenSequence } from "square-one";
import { armMetrics, touchHold, standingAsCouple } from "./arm-pose";
import {
  lateralClearance, rigidParts,
  PLAYER_DEFAULTS, MYCO_DEFAULTS, EMBER_DEFAULTS, RYAN_DEFAULTS, SPROUT_DEFAULTS,
  type CharacterBodyShape,
} from "../services/body-shapes";
import { passingWidth, makeFrame, toWorld, facingToRotationY, DEFAULT_SCALE } from "./frame";
import { pairGripRadius } from "./forearm-hold";
import { sizeArch } from "./arch";
import { RESHAPE, growUpperArm } from "./accommodation";

/**
 * The couple is holding hands at beat 0 — for every pairing the cast can field, in both
 * figures, through the real pipeline.
 *
 * 🔴 **The defect this exists for (ADR-0045).** `standingAsCouple` asks whether two dancers are
 * standing at their couple's width, and it is given `TouchHold.width`. ADR-0040 gave that number
 * a second meaning: a pair who *reach* dance the call at `ArchSizing.width`, which is wider, while
 * their resting handhold still reports the narrower stance. Compared against the wrong one, five
 * of the twenty shipped orderings lost the hold entirely — Ember with the player, with Myco and
 * with Ryan, and the player with Sprout both ways. Ryan: *"player and ember are not [holding
 * hands] at all … maybe we have too many states stacking here."*
 *
 * Driven through square-one rather than asserted on the geometry, because the bug was in the
 * *seam* — three readings of one width that had silently become three numbers.
 */
const CAST: readonly (readonly [string, CharacterBodyShape])[] = [
  ["player", PLAYER_DEFAULTS],
  ["myco", MYCO_DEFAULTS],
  ["ember", EMBER_DEFAULTS],
  ["ryan", RYAN_DEFAULTS],
  ["sprout", SPROUT_DEFAULTS],
];

const scale = DEFAULT_SCALE;

/** Where the engine stands this pair at beat 0, in world units, and whether that reads as a couple. */
function atBeatZero(
  beauShape: CharacterBodyShape,
  belleShape: CharacterBodyShape,
  sequence: readonly string[],
) {
  const b = armMetrics(beauShape);
  const l = armMetrics(belleShape);
  const resting = touchHold(b, l);
  const bodies = passingWidth(lateralClearance(rigidParts(beauShape), rigidParts(belleShape)));
  const sized = sizeArch(b, l, beauShape, belleShape, resting.width, bodies, RESHAPE);

  // The stance the pair actually dance in — re-solved on the arms they reached with.
  const stance =
    sized.armDelta === 0
      ? resting
      : touchHold(
          armMetrics(growUpperArm(beauShape, sized.armDelta)),
          armMetrics(growUpperArm(belleShape, sized.armDelta)),
        );

  const isArch = sequence[0] === "california-twirl";
  const couple = partnerUp(
    "a", "b", undefined, undefined,
    resting.width / scale, bodies / scale, undefined, pairGripRadius(b, l) / scale,
  );
  const shapeAt = isArch
    ? () => ({ width: sized.width / scale, archClearance: sized.wanted / scale })
    : undefined;
  const motions = flattenSequence(danceCoupleSequence(sequence as never, couple, shapeAt as never));
  const states = createPerformance({ motions: motions as never }).sample() as {
    position: { x: number; y: number };
    facing: number;
  }[];

  const frame = makeFrame({ x: 0, z: 0 }, scale, 0);
  const at = states.map((s) => {
    const w = toWorld(frame, s.position);
    return { x: w.x, z: w.z, yaw: facingToRotationY(frame, s.facing) };
  });
  const separation = Math.hypot(at[1]!.x - at[0]!.x, at[1]!.z - at[0]!.z);
  return {
    separation,
    stanceWidth: stance.width,
    restingWidth: resting.width,
    reached: sized.armDelta,
    joined: standingAsCouple(at[0]!, at[1]!, stance.width),
    joinedIfAskedResting: standingAsCouple(at[0]!, at[1]!, resting.width),
  };
}

describe("🔴 a couple is holding hands at beat 0, whoever they are", () => {
  for (const seq of [["partner-trade", "partner-trade"], ["california-twirl", "california-twirl"]]) {
    for (const [beauName, beauShape] of CAST) {
      for (const [belleName, belleShape] of CAST) {
        if (beauName === belleName) continue;
        it(`${seq[0]!}: ${beauName} / ${belleName}`, () => {
          const r = atBeatZero(beauShape, belleShape, seq);
          expect(r.joined, `${beauName}/${belleName} reached ${r.reached.toFixed(2)}`).toBe(true);
        });
      }
    }
  }

  it("🔑 a reaching pair's stance IS the width they dance at, by construction", () => {
    // Not a coincidence worth leaving unstated: `reachForIt` picks the arm extension *by*
    // solving `touchHold` on the lengthened arms, so the stance, the figure's width and the
    // engine's placement are three readings of one number rather than three numbers.
    const r = atBeatZero(EMBER_DEFAULTS, MYCO_DEFAULTS, ["california-twirl", "california-twirl"]);
    expect(r.reached).toBeGreaterThan(0);
    expect(r.stanceWidth).toBeCloseTo(r.separation, 6);
  });

  it("🔴 and asking with the RESTING width instead loses the hold on five orderings", () => {
    // The counter-assertion, because the happy path above passes with or without the fix — it
    // measures the geometry, and the defect was in which number the *floor* handed the
    // predicate. This pins the distinction itself: the two widths differ, and using the one
    // that describes where the pair would be standing if they had not reached is what dropped
    // the hold. Ember with the player, with Myco and with Ryan; the player with Sprout, both ways.
    const lost: string[] = [];
    for (const [beauName, beauShape] of CAST) {
      for (const [belleName, belleShape] of CAST) {
        if (beauName === belleName) continue;
        const r = atBeatZero(beauShape, belleShape, ["california-twirl", "california-twirl"]);
        if (!r.joinedIfAskedResting) lost.push(`${beauName}/${belleName}`);
      }
    }
    expect(lost.sort()).toEqual([
      "ember/myco", "ember/player", "ember/ryan", "player/sprout", "sprout/player",
    ]);
    // Every one of them is a pair who reached — that is the whole mechanism.
    for (const name of lost) {
      const [bn, ln] = name.split("/");
      const beauShape = CAST.find(([n]) => n === bn)![1];
      const belleShape = CAST.find(([n]) => n === ln)![1];
      const r = atBeatZero(beauShape, belleShape, ["california-twirl", "california-twirl"]);
      expect(r.reached, name).toBeGreaterThan(0);
      expect(r.stanceWidth, name).toBeGreaterThan(r.restingWidth);
    }
  });
});