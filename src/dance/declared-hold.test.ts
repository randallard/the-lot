import { describe, expect, it } from "vitest";
import { danceCoupleSequence, partnerUp, flattenSequence, sampleMotion } from "square-one";
import { armMetrics, touchHold, insideSide, touchingSide } from "./arm-pose";
import {
  lateralClearance, rigidParts,
  PLAYER_DEFAULTS, MYCO_DEFAULTS, EMBER_DEFAULTS, RYAN_DEFAULTS, SPROUT_DEFAULTS,
  type CharacterBodyShape,
} from "../services/body-shapes";
import { passingWidth, makeFrame, toWorld, facingToRotationY, DEFAULT_SCALE } from "./frame";
import { pairGripRadius } from "./forearm-hold";
import { sizeArch } from "./arch";
import { RESHAPE } from "./accommodation";

/**
 * 🔴 **The 2026-08-23 defect: the California Twirl's down arm swaps sides** (ADR-0056).
 *
 * Ryan's report, from the effort's `PROGRESS.md`: *"the belle's arm that stays down seems to
 * be switching sides halfway through … at this point the right arm should pass under the
 * raised arm for the twirl … but instead it just appears on the other side as if becoming the
 * left arm."*
 *
 * The cause was `insideSide`, which measures the partner's bearing in the dancer's **own**
 * frame — so it moves when either dancer moves *or* when this one turns. A Twirl does both at
 * once and out of phase, and the belle's joined hand was re-labelled twice mid-figure.
 *
 * Driven through the real engine rather than asserted on placements, because the whole point
 * is that square-one already carries the answer and the-lot was not asking for it.
 */
const CAST: readonly (readonly [string, CharacterBodyShape])[] = [
  ["player", PLAYER_DEFAULTS],
  ["myco", MYCO_DEFAULTS],
  ["ember", EMBER_DEFAULTS],
  ["ryan", RYAN_DEFAULTS],
  ["sprout", SPROUT_DEFAULTS],
];

const scale = DEFAULT_SCALE;

interface Walked {
  /** The arch span's hand, as square-one declares it, per dancer. */
  readonly declared: { beau: "left" | "right" | "none"; belle: "left" | "right" | "none" };
  /** The pair's solved standing hold, which is what `touchingSide` is asked with. */
  readonly hold: ReturnType<typeof touchHold>;
  /** Every quarter-beat of the figure: where each dancer is, and the live bearing's answer. */
  readonly frames: readonly {
    readonly beat: number;
    readonly beau: { x: number; z: number; yaw: number };
    readonly belle: { x: number; z: number; yaw: number };
    readonly liveBeau: "left" | "right";
    readonly liveBelle: "left" | "right";
  }[];
}

/** One California Twirl, walked at quarter-beat resolution through the real pipeline. */
function walkTwirl(beauShape: CharacterBodyShape, belleShape: CharacterBodyShape): Walked {
  const b = armMetrics(beauShape);
  const l = armMetrics(belleShape);
  const hold = touchHold(b, l);
  const bodies = passingWidth(lateralClearance(rigidParts(beauShape), rigidParts(belleShape)));
  const sized = sizeArch(b, l, beauShape, belleShape, hold.width, bodies, RESHAPE);

  const couple = partnerUp(
    "a", "b", undefined, undefined,
    hold.width / scale, bodies / scale, undefined, pairGripRadius(b, l) / scale,
  );
  const shapeAt = () => ({ width: sized.width / scale, archClearance: sized.wanted / scale });
  const motions = flattenSequence(
    danceCoupleSequence(["california-twirl"] as never, couple, shapeAt as never),
  ) as Record<string, { beats: number; grips: readonly { hand: string; grip: string }[] }>;

  const archHand = (key: string) =>
    (motions[key]!.grips.find((g) => g.grip === "arch")?.hand ?? "none") as "left" | "right" | "none";

  const frame = makeFrame({ x: 0, z: 0 }, scale, 0);
  const at = (key: string, beat: number) => {
    const s = sampleMotion(motions[key]! as never, beat) as {
      position: { x: number; y: number };
      facing: number;
    };
    const w = toWorld(frame, s.position);
    return { x: w.x, z: w.z, yaw: facingToRotationY(frame, s.facing) };
  };

  const frames: Walked["frames"] = Array.from({ length: 17 }, (_, i) => {
    const beat = i * 0.25;
    const beau = at("a", beat);
    const belle = at("b", beat);
    return {
      beat,
      beau,
      belle,
      liveBeau: insideSide(beau, belle),
      liveBelle: insideSide(belle, beau),
    };
  });

  return { declared: { beau: archHand("a"), belle: archHand("b") }, hold, frames };
}

const PAIRS = CAST.flatMap(([beauName, beauShape]) =>
  CAST.filter(([belleName]) => belleName !== beauName).map(
    ([belleName, belleShape]) => [`${beauName}/${belleName}`, beauShape, belleShape] as const,
  ),
);

describe("🔴 a declared hold keeps the hand the figure named", () => {
  it("🔑 square-one names the arch's hand, and it is the same one for the whole span", () => {
    // The premise the fix rests on. If this ever stops being true — a figure that changes
    // hands mid-call — the answer stops being "ask the engine" and becomes a real question.
    for (const [name, beauShape, belleShape] of PAIRS) {
      const { declared } = walkTwirl(beauShape, belleShape);
      expect(declared.beau, `${name}: the beau's arch hand`).toBe("right");
      expect(declared.belle, `${name}: the belle's arch hand`).toBe("left");
    }
  });

  it("🔴 the live bearing re-labels the belle's hand twice mid-Twirl — the 08-23 defect", () => {
    // Pinned as a *finding*, not as desired behaviour: this is what the old path returned, and
    // it is the reason the fix exists. `player/myco` is the pairing Ryan's screenshots came
    // from — the swap at ~1.1 is his second image, the swap back at ~2.9 his third.
    const { frames } = walkTwirl(PLAYER_DEFAULTS, MYCO_DEFAULTS);
    const flips = frames.filter(
      (f, i) => i > 0 && f.liveBelle !== frames[i - 1]!.liveBelle,
    );
    expect(flips.map((f) => f.beat)).toEqual([1.25, 3]);

    // 🔑 And it is a phase error, not a change of side: the two rotations cancel at the ends.
    // That is what makes the figure's own answer safe to prefer — it loses no information.
    expect(frames[0]!.liveBelle).toBe("left");
    expect(frames[frames.length - 1]!.liveBelle).toBe("left");
  });

  it("🔴 and it briefly made BOTH dancers the beau, which pulls the hold apart", () => {
    // `poseArms` reads the role off the same side — `const beau = side === "right"` — so while
    // the belle's hand read `right` the pair had two palms up and both applied `+hold.lateral`,
    // writing two different contact points for one hold. Invisible in the screenshots and worse
    // than the visible half.
    const { frames } = walkTwirl(PLAYER_DEFAULTS, MYCO_DEFAULTS);
    const bothBeau = frames.filter((f) => f.liveBeau === "right" && f.liveBelle === "right");
    expect(bothBeau.length).toBeGreaterThan(0);
    expect(bothBeau.map((f) => f.beat)).toEqual([1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75]);
  });

  it("✅ asked with the declared hand, the side never moves — for every pairing", () => {
    for (const [name, beauShape, belleShape] of PAIRS) {
      const { declared, hold, frames } = walkTwirl(beauShape, belleShape);
      for (const f of frames) {
        expect(
          touchingSide(f.beau, f.belle, hold, declared.beau as "left" | "right"),
          `${name}: the beau at beat ${f.beat}`,
        ).toBe("right");
        expect(
          touchingSide(f.belle, f.beau, hold, declared.belle as "left" | "right"),
          `${name}: the belle at beat ${f.beat}`,
        ).toBe("left");
      }
    }
  });

  it("✅ and it agrees with the live answer at both ends of the figure", () => {
    // The seam. The arch releases half a beat before the call ends (`HOLD_RELEASE_BEATS`), at
    // which point `declaredHold` falls back to the placements — so if the two disagreed there,
    // the release would pop the arm across. They agree, for everyone.
    for (const [name, beauShape, belleShape] of PAIRS) {
      const { frames } = walkTwirl(beauShape, belleShape);
      for (const f of [frames[0]!, frames[frames.length - 1]!]) {
        expect(f.liveBeau, `${name}: the beau at beat ${f.beat}`).toBe("right");
        expect(f.liveBelle, `${name}: the belle at beat ${f.beat}`).toBe("left");
      }
    }
  });

  it("🔑 an undeclared pair still reads their hold off the placements", () => {
    // The change is scoped to declared holds. A couple the *placements* reveal really can
    // change which hand is nearer — they are not inside a figure — and that path is untouched.
    const b = armMetrics(PLAYER_DEFAULTS);
    const l = armMetrics(MYCO_DEFAULTS);
    const hold = touchHold(b, l);
    const beau = { x: 0, z: 0, yaw: 0 };
    expect(touchingSide(beau, { x: hold.width, z: 0, yaw: 0 }, hold)).toBe("left");
    // Stand the partner on the other side — both still facing the same way, so they are still
    // a couple — and the nearer hand genuinely becomes the other one.
    expect(touchingSide(beau, { x: -hold.width, z: 0, yaw: 0 }, hold)).toBe("right");
  });

  it("🔑 a hold declared without a hand still asks the placements", () => {
    // The review route's turn-in dial declares the hold — to skip `standingAsCouple`'s facing
    // tolerance — but names no hand, because there is no span. Nobody turns there, so the
    // bearing is stable and `true` is the right amount of declaration.
    const b = armMetrics(PLAYER_DEFAULTS);
    const l = armMetrics(MYCO_DEFAULTS);
    const hold = touchHold(b, l);
    const beau = { x: 0, z: 0, yaw: 0 };
    // Far enough apart that `standingAsCouple` would say "not a couple" on its own.
    const far = { x: hold.width * 3, z: 0, yaw: 0 };
    expect(touchingSide(beau, far, hold, false)).toBe(null);
    expect(touchingSide(beau, far, hold, true)).toBe("left");
  });
});
