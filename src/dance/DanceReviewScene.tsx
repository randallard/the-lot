/**
 * The pose review: every figure, at every named step, on every pairing — one at a time,
 * scored 0–4 with a note.
 *
 * Reached at `#review`, or `#review=<figure>/<step>/<beau>-<belle>` for one cell.
 *
 * ## What this is for
 *
 * `#dance` is the instrument that *finds* defects; this is the one that **tracks** them.
 * The difference is coverage that can be resumed. Every arm and arch decision of the last
 * month came out of Ryan standing one pose up and looking at it, and the recurring cost
 * was never the looking — it was that the pose had to be caught by hand at 120 bpm, that
 * only the pairing on screen got checked, and that "I looked at this and it was fine" was
 * not written down anywhere a week later. Three of those ADRs turned on a pairing nobody
 * had stood up until a dropdown existed.
 *
 * So: the moments are named and addressable (`review-steps.ts`), the matrix is enumerated
 * rather than remembered (`review-route.ts`), and the judgement is stored beside the
 * address (`review-store.ts`).
 *
 * ## The pose is live, not a picture
 *
 * Each cell stands the **real scene** up through the same `DanceFloor` the debug scene
 * uses, at the same beat, with the same bodies. A captured screenshot would be cheaper to
 * page through and would go stale the moment `arm-pose.ts` changes — and stale is the
 * worst thing a review can be, because a wrong rating that looks right is worse than a
 * missing one. It also means the camera still moves: a pose is judged from a *chosen*
 * angle, and the arm defect this route was built for is invisible from the front.
 *
 * ## The panel
 *
 * | Control | What it is for |
 * |---|---|
 * | **0–4** | The score. 0 terrible · 1 bad · **2 can't tell** · 3 good · 4 perfect. 2 is the abstention, not the average — see `review-store.ts`. |
 * | **note** | The finding, in words. Saved as you type, so nothing is lost to a keystroke that navigates. |
 * | **← / →** | Previous and next cell in matrix order: figure, then step, then pairing — so the bodies change under a held moment. |
 * | **next unrated** | Resume. A 650-cell sweep is not one sitting. |
 * | **figure filter** | Narrow the walk to one figure, for when a fix has landed and only its own cells are owed a re-look. |
 * | **beat readout** | What the clock actually says, against what the step asked for. An instrument that cannot be caught lying is not an instrument. |
 * | **export** | The whole matrix as markdown, for `work/square-dance-planning/`. |
 * | **rules** | The verdict box under the step's question: every rule the pose on screen breaks (`pose-rules.ts`), read off the drawn meshes. Grey is *not measured yet*, green *all kept*, red one line per breach. On every step. |
 * | **🧪 stretch & shrink** | The purple dashed box: per dancer, torso / forearm / upper-arm sliders in cm **added to whatever the figure chose**, the amount actually worn beside each, and how far the pose has pulled each undrawn upper arm past its length. On every step. Reshapes the dancer only — the figure's sizing is not re-solved. `2026-10-11-1` |
 *
 * ## 🧪 The dials
 *
 * Six exploratory dials sit in the dashed amber box — **four on the `stand` step and two on the
 * arch steps**, because the last two are about a figure somebody turns under and the first four
 * are about a couple standing still. **None of them is a decided stance**, none is ever saved
 * with a rating, and each is `0` by default and changes nothing there. The box turns amber and
 * says *don't rate it* the moment any of them is off zero, because a rating taken of a dialed
 * pose is worse than no rating. (The stretch sliders above are separate from these six and say
 * the same thing when moved.)
 *
 * | Dial | Step | What it moves | Journal |
 * |---|---|---|---|
 * | **turn in** | stand | Each dancer's yaw — does a turned couple keep its forearms off the vertical pole. Posed rig only; `touchHold` is not re-solved. | `2026-09-14-2` |
 * | **stagger** | stand | Beau back, belle forward along the couple's facing, half each so the hold point stays put. | `2026-09-14-2` |
 * | **hand height** | stand | `hold.height` — the one point both arms solve onto, up or down. | `2026-09-19-3` |
 * | **hands fwd** | stand | `hold.forward` — Ryan's *"a dial for elbow back"*, from the end that exists. A handhold's elbow is derived by `touchPose` from anatomy, so what sends it back is the hands going forward. | `2026-09-19-3` |
 * | **join overhead** | arch | `archLateral` — the joined hands from the midpoint of the two inside shoulders to over the turning dancer's own crown. | `2026-09-26` |
 * | **pair closes** | arch | How close the pair stand while turning under, from their handhold's width to the tightest the figure can still be delivered at. | `2026-09-26` |
 *
 * `hand height`, `hands fwd` and both arch dials reach the **solve** rather than turning the
 * posed rig afterward, so they cost something `turn in` and `stagger` do not: `hold.forward` is
 * ADR-0027's *as far forward as both can hold with the upper arm hanging*, and past it the upper
 * arm stops hanging. The `stand` readout's second line is that cost — **upper arm off hang** per
 * dancer, and **strain** in red once the hold has been asked for past the end of somebody's arm.
 * The arch readout is the other pair's: where the join landed against the turning dancer's
 * midline, which way her hand points, and whether the couple's width **grew** (red) because the
 * figure stopped being deliverable and the pair let go.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { DanceFloor, type ArmReport, type Stretch } from "./DanceFloor";
import { describe, violations } from "./pose-rules";
import { getBodyShape } from "../services/body-shapes";
import { castRoster } from "../config/npcs";
import { REVIEW_FIGURES, type ReviewStep } from "./review-steps";
import {
  cellId as addressOf,
  pairingId,
  reviewCells,
  reviewPairings,
  reviewSceneCell,
  reviewSceneHash,
  type ReviewCell,
} from "./review-route";
import {
  RATING_LABELS,
  clearCell,
  exportJson,
  isRating,
  loadReviews,
  noteCell,
  rateCell,
  type Rating,
  type ReviewRecords,
} from "./review-store";
import { reviewChartMarkdown } from "./review-chart";
import { holdMetrics } from "./hold-metrics";
import { insideShoulderX, planArch, sizeArch } from "./arch";
import { RESHAPE, growForearm } from "./accommodation";
import { passingWidth } from "./frame";
import { lateralClearance, rigidParts } from "../services/body-shapes";
import { armMetrics, touchHold } from "./arm-pose";
import { DUCK_UNDER, FULL_L, LAZY_L, type TurnUnderStyle } from "./turn-under";

const PANEL_WIDTH = 340;

/** Chest height, the same target the debug scene orbits — see its note. */
const ORBIT_TARGET: [number, number, number] = [0, 0.9, 0];

/** Warm for good, cold for bad, grey for the abstention. */
const RATING_COLOR: Readonly<Record<Rating, string>> = {
  0: "#b03a2e",
  1: "#c97b3c",
  2: "#8a8a84",
  3: "#5b8c5a",
  4: "#2e7d32",
};

const BUTTON: React.CSSProperties = {
  padding: "4px 8px",
  cursor: "pointer",
  background: "#fff",
  color: "#333",
  border: "1px solid #999",
  borderRadius: 4,
};

/** One dancer's stretch dials, in whole centimetres — the unit the sliders move in. */
interface StretchCm {
  readonly body: number;
  readonly forearm: number;
  readonly upperArm: number;
}
const NO_STRETCH: StretchCm = { body: 0, forearm: 0, upperArm: 0 };

/** What one dancer is wearing and how far the pose has pulled each upper arm, in world units. */
interface Stretched {
  readonly body: number;
  readonly forearm: number;
  readonly upperLeft: number;
  readonly upperRight: number;
}

/**
 * The stretch dials' rows and ranges, in cm. Wide on purpose — these are for finding out what
 * a body would have to do, and `growBody` / `growForearm` / `growUpperArm` each stop at the
 * shape editor's own bounds whatever the slider says.
 */
const STRETCH_PARTS = [
  { part: "body", label: "torso", min: -120, max: 120 },
  { part: "forearm", label: "forearm", min: -30, max: 40 },
  { part: "upperArm", label: "upper arm", min: -30, max: 40 },
] as const;

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(3)}`;
}

export function DanceReviewScene({ initialCell }: { initialCell: ReviewCell }) {
  const allCells = useMemo(() => reviewCells(), []);
  const [records, setRecords] = useState<ReviewRecords>(() => loadReviews());
  const [figureFilter, setFigureFilter] = useState<string>("all");
  const [advance, setAdvance] = useState(true);
  /**
   * 🧪 **Exploratory turn-in, in degrees** (journal 2026-09-14-2; not mirrored since
   * 2026-09-19). The beau turns this far toward the belle; the belle turns the same number
   * of degrees the other way, away from him (`player/player` under the mirrored version
   * looked wrong at the eye test). Gated by `turnOn` so the dialed-in angle survives a
   * toggle off and back on. It is a thing to look at, not a setting: it is never saved with
   * a rating, and it only applies to the `stand` step.
   */
  const [turnDeg, setTurnDeg] = useState(0);
  const [turnOn, setTurnOn] = useState(false);
  const [turnNudge, setTurnNudge] = useState(0);
  /**
   * 🧪 **Exploratory stagger, in cm** (2026-09-19, `floor-stagger-yaw` probe 2026-09-14). The
   * beau steps this far back, the belle the same distance forward, along the couple's shared
   * facing — half the dial each, so the joined-hands point doesn't move. Gated by
   * `staggerOn`, same reasoning as `turnOn`. Only applies to the `stand` step.
   */
  const [staggerCm, setStaggerCm] = useState(0);
  const [staggerOn, setStaggerOn] = useState(false);
  const [staggerNudge, setStaggerNudge] = useState(0);
  /**
   * 🧪 **Exploratory hand height, in cm** (2026-09-19). Moves the one point both dancers'
   * arms solve onto, up or down — signed, unlike `turnDeg`/`staggerCm`. `settleTouch` works
   * out whatever elbow bend the new target implies; nothing here poses an elbow directly.
   * Gated by `handHeightOn`, same reasoning as the other two. Only applies to the `stand`
   * step.
   */
  const [handHeightCm, setHandHeightCm] = useState(0);
  const [handHeightOn, setHandHeightOn] = useState(false);
  const [handHeightNudge, setHandHeightNudge] = useState(0);
  /**
   * 🧪 **Exploratory hands-forward, in cm** (2026-09-19) — Ryan's *"give me a dial for elbow
   * back"*, which is this one seen from the other end.
   *
   * A handhold's elbow is **derived, not posed**: `touchPose` keeps the humerus in its own
   * shoulder's plane and takes the further-back of the two legal points, so there is no elbow
   * parameter to turn. What sends an elbow back is the hands going forward, and the anatomy
   * decides the rest. So the dial moves `hold.forward` and the readout prints what it costs —
   * the upper-arm angle off the hang, and the strain when it has been asked for more arm than
   * there is. ADR-0027 sets the zero: as far forward as **both** can hold with the upper arm
   * hanging. Signed, gated by `handForwardOn`, `stand` step only.
   */
  const [handForwardCm, setHandForwardCm] = useState(0);
  const [handForwardOn, setHandForwardOn] = useState(false);
  const [handForwardNudge, setHandForwardNudge] = useState(0);
  /**
   * 🧪 **Exploratory overhead join, in percent** (2026-09-26) — Ryan, watching the L against
   * four reference photographs: *"the beau kind of has to put their hand directly above the
   * belle's head … in our implementation the beau is just putting his hand up in between the
   * couple and that causes the belle to have to reach more than is reasonable."*
   *
   * `0` is ADR-0025's rule — the join at the midpoint of the two inside shoulders — and `100`
   * puts it over the turning dancer's own crown. **The only dial here that applies to the arch
   * steps instead of `stand`**, because it is the only one about a figure somebody turns under.
   *
   * It reaches further than the other four: the join's lateral is an input to the reshape, the
   * height, the clearance and the figure's own width, so moving it re-sizes the Twirl. Expect
   * the couple's spacing to change, not just the arms.
   */
  const [overheadPct, setOverheadPct] = useState(100);
  const [overheadOn, setOverheadOn] = useState(false);
  const [overheadNudge, setOverheadNudge] = useState(0);
  /**
   * 🧪 **Exploratory close-up, in percent** (2026-09-26) — Ryan: *"the turn under we should
   * have the pair get closer during execution of that type of move."*
   *
   * `0` is the standing handhold's width, `100` is as close as the figure can still be
   * delivered (bisected — see `closedWidth`). The other half of `join overhead`, and on the
   * same gate: arch steps only.
   */
  const [closePct, setClosePct] = useState(100);
  const [closeOn, setCloseOn] = useState(false);
  const [closeNudge, setCloseNudge] = useState(0);
  /**
   * 🧪 The stretch dials (2026-10-11): each dancer's torso, forearm and upper arm, in **cm added
   * to whatever the figure chose**. Ryan: *"can we list all stretch and shrink and give me a dial
   * to play around for those?"* — the list is `stretched` below, read back off the floor; these
   * are the hand on it. Beau first. Unlike the amber dials they are live on every step, because
   * a stretch is a fact about a body and not about one figure.
   */
  const [stretchCm, setStretchCm] = useState<readonly [StretchCm, StretchCm]>([NO_STRETCH, NO_STRETCH]);
  const [stretchNudge, setStretchNudge] = useState(0);

  /**
   * The cells being walked. Filtering narrows the *walk*, never the store: a rating given
   * under a filter is a rating of that cell, and re-widening must bring it back. The
   * filter exists because a landed fix owes a re-look to its own figure and not to the
   * other four.
   */
  const cells = useMemo(
    () => (figureFilter === "all" ? allCells : allCells.filter((c) => c.figure.id === figureFilter)),
    [allCells, figureFilter],
  );

  const [cellId, setCellId] = useState<string>(initialCell.id);
  // Falling back to the filtered list's first cell keeps the scene showing something the
  // arrows can move from when a filter is applied that excludes the current cell.
  const cell = cells.find((c) => c.id === cellId) ?? cells[0] ?? initialCell;
  const index = cells.findIndex((c) => c.id === cell.id);
  const record = records[cell.id];

  // The URL follows the cell, in the namespace the loader reads — so what is in the bar
  // reopens what is on screen, and a note about a bad pose can carry its link.
  useEffect(() => {
    window.location.hash = reviewSceneHash(cell);
  }, [cell]);

  /**
   * …and the cell follows the URL, which is the half that was missing.
   *
   * 🔴 Found by using it: the loader reads the hash **once, at mount**, so pasting a
   * `#review=…` address into an already-open review moved the bar and nothing else. Every
   * claim made for these URLs — share one, keep one in a note, reopen a pose tomorrow —
   * quietly needed a reload first. Writing a URL nobody can navigate to is worse than not
   * writing one, because it looks like it worked.
   *
   * No loop: the effect above writes the hash the cell already names, so the event this
   * hears sets the id it is already on, and setting state to its current value is a no-op.
   */
  useEffect(() => {
    const onHash = () => {
      const target = reviewSceneCell(window.location.hash);
      if (target !== null) setCellId(target.id);
    };
    window.addEventListener("hashchange", onHash);
    return () => { window.removeEventListener("hashchange", onHash); };
  }, []);

  /**
   * What the floor is asked to stand up, derived straight from the cell rather than
   * bumped in an effect.
   *
   * The token only has to *change* when the cell does, and the cell's own position in the
   * full matrix already does that — so the address is the token. Deriving it means there
   * is no order in which the pose and the panel can disagree: they are the same render.
   *
   * `arch: "down"` is the `stand` step asking for the standing couple — the pose
   * underneath a California Twirl's beat-0 arch, which `go home` produces in the debug
   * scene. Asking for it **by name** rather than by bumping the `home` prop is what keeps
   * the two poses at beat 0 distinguishable.
   */
  const seek = useMemo(
    () => ({
      // A paused floor writes nothing, so a turn-in, stagger, hand-height or hands-forward
      // change has to arrive as a fresh seek. The nudges keep the token unique without
      // disturbing the cell's own position in it.
      token:
        allCells.findIndex((c) => c.id === cell.id) * 100000 +
        turnNudge +
        staggerNudge +
        handHeightNudge +
        handForwardNudge +
        overheadNudge +
        closeNudge +
        stretchNudge,
      beat: cell.step.pose.kind === "stand" ? 0 : cell.step.pose.beat,
      arch: cell.step.pose.kind === "stand" ? ("down" as const) : ("declared" as const),
    }),
    [allCells, cell, turnNudge, staggerNudge, handHeightNudge, handForwardNudge, overheadNudge, closeNudge, stretchNudge],
  );


  const shapes = useMemo(
    () => [getBodyShape(cell.pairing.beau), getBodyShape(cell.pairing.belle)] as const,
    [cell.pairing.beau, cell.pairing.belle],
  );

  /**
   * The turn-under style this cell is of — **both dancers**, so the pair are dancing one style
   * rather than two.
   *
   * Given to both because the style is what the cell *is*: four cells name beat 2 of a Twirl
   * and the only difference between them is this. A per-dancer mix is a thing the prop can
   * express and the matrix deliberately cannot — mixing them would make a cell a pose nobody
   * asked a question about.
   *
   * `null` on the steps outside a turn leaves the floor on its default.
   */
  const turnUnder = useMemo<readonly (TurnUnderStyle | null)[]>(
    () => [cell.step.turnUnder ?? null, cell.step.turnUnder ?? null],
    [cell.step.turnUnder],
  );

  /**
   * 🔴 Whether this cell's style has a pose of its own yet — the same honesty the dials get.
   *
   * `FULL_L` is what the arch has always rendered as (which is to say: undrawn, ADR-0027's
   * hanging humerus), and `LAZY_L` reaches ADR-0037's break and so genuinely differs. The other
   * two do not exist yet, and a matrix that let them be scored anyway would fill with ratings of
   * a pose that was never built — indistinguishable later from ratings of one that was.
   */
  const unbuiltStyle =
    cell.step.turnUnder !== undefined &&
    cell.step.turnUnder !== FULL_L &&
    cell.step.turnUnder !== LAZY_L &&
    // 🧪 2026-09-26: `DUCK_UNDER` has a pose now — the torso drop `sizeArch` sizes and
    // `duckProfile` spreads across the turn. Removed from this guard one style at a time, as
    // each lands, which is what the guard's own note asks for. `CASUAL` is still owed one.
    cell.step.turnUnder !== DUCK_UNDER;

  /**
   * The figure's steps grouped by **moment** — one row of chips per pose, with the branched
   * styles sitting together.
   *
   * Keyed on the step's own `pose`, so the grouping is a fact about what the floor is asked to
   * stand up rather than a convention about how ids are spelled. A step list that never branches
   * comes back as one group per step and renders exactly as it did before.
   */
  const stepGroups = useMemo(() => {
    const groups: { key: string; label: string; steps: ReviewStep[] }[] = [];
    for (const step of cell.figure.steps) {
      const key = JSON.stringify(step.pose);
      const last = groups[groups.length - 1];
      if (last?.key === key) last.steps.push(step);
      else groups.push({ key, label: step.label.split(" · ")[0] ?? step.label, steps: [step] });
    }
    return groups;
  }, [cell.figure]);

  const standing = cell.step.pose.kind === "stand";
  /**
   * Whether this cell is inside the arch — the steps the overhead dial can say anything about.
   *
   * Beat 4 is deliberately outside: square-one releases the hold half a beat before the call
   * ends (`HOLD_RELEASE_BEATS`), so `end` is the ordinary handhold with the bodies swapped and
   * has no join overhead to move. The step list brackets the arch on both sides.
   */
  const arched =
    cell.figure.id === "california-twirl" &&
    cell.step.pose.kind === "beat" &&
    cell.step.pose.beat < 4;
  const turnIn = standing && turnOn ? (turnDeg * Math.PI) / 180 : 0;
  const stagger = standing && staggerOn ? staggerCm / 100 : 0;
  const handHeight = standing && handHeightOn ? handHeightCm / 100 : 0;
  const handForward = standing && handForwardOn ? handForwardCm / 100 : 0;
  const archOverhead = arched && overheadOn ? overheadPct / 100 : 0;
  const archClose = arched && closeOn ? closePct / 100 : 0;
  /**
   * 🧪 Where the dial actually puts the join, against the two landmarks it sits between: the
   * couple's own midpoint and the belle's midline, which is directly above her crown.
   *
   * Printed rather than assumed, because the whole finding was that a rule everybody could read
   * — "halfway between the inside shoulders" — lands somewhere nobody expected once the two
   * dancers are different sizes.
   */
  const overheadReadout = useMemo(() => {
    const beau = armMetrics(shapes[0]);
    const belle = armMetrics(shapes[1]);
    const standing = touchHold(beau, belle).width;
    const bodies = passingWidth(lateralClearance(rigidParts(shapes[0]), rigidParts(shapes[1])));
    // The same call the floor makes, so the readout is of the figure on screen rather than of
    // an arithmetic lookalike — the defect `sizeArch`'s own doc comment was written about.
    const sized = sizeArch(
      beau, belle, shapes[0], shapes[1], standing, bodies, RESHAPE, archOverhead, archClose,
    );
    // 🔴 **On the bodies `sizeArch` sized the figure for, which is what the floor draws**
    // (ADR-0045). Without this the readout planned on the *resting* arms while the scene
    // posed the lengthened ones, so the printed gap was of a figure nobody was looking at —
    // 11 of the 25 orderings reach, and `ryan/sprout` printed 0.234 against a drawn 0.204.
    const beauShape = sized.armDelta === 0 ? shapes[0] : growForearm(shapes[0], sized.armDelta);
    const belleShape = sized.armDelta === 0 ? shapes[1] : growForearm(shapes[1], sized.armDelta);
    const beauReached = sized.armDelta === 0 ? beau : armMetrics(beauShape);
    const belleReached = sized.armDelta === 0 ? belle : armMetrics(belleShape);
    const plan = planArch(
      beauReached, belleReached, beauShape, belleShape,
      sized.width, sized.accommodation, sized.aim, archOverhead,
    );
    const herShoulder = insideShoulderX(belleReached, sized.width, 1);
    return {
      lateral: plan.lateral,
      standing,
      stood: sized.width,
      herMidline: sized.width / 2,
      short: sized.width / 2 - plan.lateral,
      // Positive is her hand out over her own head; negative is back across her chest, which
      // is the thing Ryan saw and the sign that has to flip.
      herHand: plan.hands.belle.lateral - herShoulder,
      gap: plan.gap,
    };
  }, [shapes, archOverhead, archClose]);
  /** The numbers for this pairing at these dials, from the same `holdMetrics` the probe read. */
  const turnReadout = useMemo(() => {
    const m = holdMetrics(shapes[0], shapes[1], turnIn, stagger, handHeight, handForward);
    return {
      tilt: [m.beau.forearmTilt, m.belle.forearmTilt] as const,
      gap: Math.min(m.beau.partnerForearmGap, m.belle.partnerForearmGap),
      flat: Math.max(m.beau.flatness, m.belle.flatness),
      // 🧪 What the hands-forward dial costs: the upper arm off the hang (ADR-0027's zero),
      // and the strain once the hold has been asked for past the end of somebody's arm.
      upper: [m.beau.upperArmAngle, m.belle.upperArmAngle] as const,
      strain: Math.max(m.beau.strain, m.belle.strain),
      forward: m.hold.forward,
    };
  }, [shapes, turnIn, stagger, handHeight, handForward]);

  const labels = useMemo(() => new Map(castRoster().map((c) => [c.id, c.label])), []);

  const go = useCallback(
    (delta: number) => {
      if (cells.length === 0) return;
      const next = cells[(index + delta + cells.length) % cells.length];
      if (next) setCellId(next.id);
    },
    [cells, index],
  );

  /**
   * Move along one axis and hold the other two — the two walks the arrow keys cannot do.
   *
   * 🔑 **This is the ask, and the first version did not have it.** Ryan asked to go through
   * *"step by step … at each step in each move and each pairing"*, and with the pairing
   * innermost the arrows walk twenty bodies before they reach the next step. Following one
   * couple through a whole California Twirl meant twenty presses per step or hand-editing
   * the URL. Holding the pairing and stepping through the figure is one question; holding
   * the step and changing the bodies under it is the other; the matrix order only serves
   * the second.
   */
  const goToStep = useCallback(
    (stepId: string) => {
      const step = cell.figure.steps.find((s) => s.id === stepId);
      if (step) setCellId(addressOf(cell.figure, step, cell.pairing));
    },
    [cell],
  );

  const goToPairing = useCallback(
    (id: string) => {
      const pairing = reviewPairings().find((p) => pairingId(p) === id);
      if (pairing) setCellId(addressOf(cell.figure, cell.step, pairing));
    },
    [cell],
  );

  const nextUnrated = useCallback(() => {
    if (cells.length === 0) return;
    // From here forward, wrapping — so "next unrated" after the last one goes back for the
    // ones skipped on the way rather than reporting the sweep finished.
    for (let i = 1; i <= cells.length; i++) {
      const candidate = cells[(index + i) % cells.length];
      if (candidate && records[candidate.id] === undefined) {
        setCellId(candidate.id);
        return;
      }
    }
  }, [cells, index, records]);

  const rate = useCallback(
    (rating: Rating) => {
      setRecords((r) => rateCell(r, cell.id, rating));
      if (advance) go(1);
    },
    [cell.id, advance, go],
  );

  /**
   * Keyboard, and the one rule that makes it usable: **not while typing.**
   *
   * The note field is the reason this route has a note field, and a `2` typed into a
   * sentence must be a `2` in the sentence rather than a score. Checking the event target
   * rather than tracking focus in state keeps that true however focus got there.
   */
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target !== null &&
        (target.tagName === "TEXTAREA" ||
          target.tagName === "INPUT" ||
          target.isContentEditable);
      if (typing) {
        // Escape leaves the note and hands the keys back, which is the way out of the one
        // mode this scene has.
        if (e.key === "Escape") target.blur();
        return;
      }
      const n = Number(e.key);
      if (e.key.length === 1 && !Number.isNaN(n) && isRating(n)) {
        rate(n);
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "j") { go(1); e.preventDefault(); }
      else if (e.key === "ArrowLeft" || e.key === "k") { go(-1); e.preventDefault(); }
      else if (e.key === "u") { nextUnrated(); e.preventDefault(); }
      else if (e.key === "n") { noteRef.current?.focus(); e.preventDefault(); }
      else if (e.key === "x") { setRecords((r) => clearCell(r, cell.id)); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [rate, go, nextUnrated, cell.id]);

  // The beat the clock actually reports, written straight to the DOM at 60 fps (ADR-0002's
  // idiom). Its job is to be able to *disagree* with the step: if a seek to beat 2 reports
  // anything else, the pose on screen is not the pose being rated.
  const beatLabel = useRef<HTMLSpanElement>(null);
  const onBeat = useCallback((beat: number, totalBeats: number) => {
    const el = beatLabel.current;
    if (el) el.textContent = `${beat.toFixed(2)} / ${String(totalBeats)}`;
  }, []);

  /*
   * The rules (`pose-rules.ts`), asked of the pose on screen. The floor reports every frame it
   * poses; the panel re-renders only when the *verdict* changes, which for a seeked cell is
   * once. `null` is "nothing measured yet", and it is not the same as an empty list — a clean
   * pose and a floor that has not reported must not look alike.
   */
  const [broken, setBroken] = useState<readonly string[] | null>(null);
  const brokenKey = useRef<string | null>(null);
  const beauName = labels.get(cell.pairing.beau) ?? cell.pairing.beau;
  const belleName = labels.get(cell.pairing.belle) ?? cell.pairing.belle;
  const onArms = useCallback(
    (report: ArmReport) => {
      if (report.solids === null) return;
      // A dancer paired with their own build needs telling apart by role.
      const names: [string, string] =
        beauName === belleName ? [`${beauName} (beau)`, `${belleName} (belle)`] : [beauName, belleName];
      const lines = violations(report.findings).map((f) => describe(f, names));
      const key = lines.join("\n");
      if (key === brokenKey.current) return;
      brokenKey.current = key;
      setBroken(lines);
    },
    [beauName, belleName],
  );

  const stretch = useMemo<readonly [Stretch, Stretch]>(
    () => [
      { body: stretchCm[0].body / 100, forearm: stretchCm[0].forearm / 100, upperArm: stretchCm[0].upperArm / 100 },
      { body: stretchCm[1].body / 100, forearm: stretchCm[1].forearm / 100, upperArm: stretchCm[1].upperArm / 100 },
    ],
    [stretchCm],
  );
  const stretchDialled = stretchCm.some((d) => d.body !== 0 || d.forearm !== 0 || d.upperArm !== 0);
  const setStretch = useCallback((who: 0 | 1, part: keyof StretchCm, cm: number) => {
    setStretchCm((now) => {
      const next: [StretchCm, StretchCm] = [now[0], now[1]];
      next[who] = { ...now[who], [part]: cm };
      return next;
    });
    setStretchNudge((n) => n + 1);
  }, []);

  /*
   * Every stretch and shrink on screen, **read back off the floor** rather than recomputed
   * here: the torso and forearm changes the dancers are wearing (figure and dial together), and
   * how far past its natural length each undrawn upper arm has been pulled by the pose. Same
   * once-per-change rule as the rules verdict.
   */
  const [stretched, setStretched] = useState<readonly Stretched[] | null>(null);
  const stretchedKey = useRef("");
  const onStretch = useCallback((report: ArmReport) => {
    const rows = report.dancers.slice(0, 2).map((d) => ({
      body: d.bodyDelta,
      forearm: d.forearmDelta,
      upperLeft: d.upperArm.left - d.upperArmNatural,
      upperRight: d.upperArm.right - d.upperArmNatural,
    }));
    const key = rows
      .map((r) => [r.body, r.forearm, r.upperLeft, r.upperRight].map((n) => n.toFixed(3)).join(","))
      .join("|");
    if (key === stretchedKey.current) return;
    stretchedKey.current = key;
    setStretched(rows);
  }, []);
  const onFloor = useCallback(
    (report: ArmReport) => {
      onArms(report);
      onStretch(report);
    },
    [onArms, onStretch],
  );

  const ratedCount = allCells.filter((c) => records[c.id] !== undefined).length;
  const ratedHere = cells.filter((c) => records[c.id] !== undefined).length;

  const copyChart = useCallback(() => {
    void navigator.clipboard.writeText(reviewChartMarkdown(records));
  }, [records]);
  const copyJson = useCallback(() => {
    void navigator.clipboard.writeText(exportJson(records));
  }, [records]);

  const asked =
    cell.step.pose.kind === "stand" ? "standing couple" : `beat ${String(cell.step.pose.beat)}`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f4f4f2", display: "flex" }}>
      <div
        style={{
          width: PANEL_WIDTH,
          flex: "0 0 auto",
          overflowY: "auto",
          borderRight: "1px solid #ccc",
          background: "#fbfbfa",
          font: "13px/1.45 system-ui, sans-serif",
          color: "#333",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div>
          <strong>pose review</strong>
          <div style={{ color: "#666", fontSize: 11 }}>
            {ratedCount} of {allCells.length} rated
            {figureFilter === "all" ? "" : ` · ${String(ratedHere)}/${String(cells.length)} in filter`}
          </div>
        </div>

        {/* Where we are. The figure and the pairing are the axes; the step is the moment. */}
        <div style={{ borderTop: "1px solid #e0e0da", paddingTop: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{cell.figure.label}</div>
          <div style={{ fontSize: 14 }}>{cell.step.label}</div>
          <div style={{ color: "#444" }}>
            {labels.get(cell.pairing.beau) ?? cell.pairing.beau}
            <span style={{ color: "#999" }}> → </span>
            {labels.get(cell.pairing.belle) ?? cell.pairing.belle}
          </div>
          <div style={{ color: "#666", fontSize: 11, marginTop: 4 }}>
            cell {index + 1} of {cells.length} · asked for <strong>{asked}</strong> · clock{" "}
            <span ref={beatLabel} style={{ fontVariantNumeric: "tabular-nums" }}>–</span>
          </div>
        </div>

        {/* The two axes the arrows cannot walk. Steps first, because following one couple
            through a figure is the thing the matrix order is worst at and the thing that was
            actually asked for. A rated step carries its score on the chip, so the figure's
            shape across this pairing is readable without moving.

            🔑 **Grouped by moment**, since the turn branched four ways (2026-09-21). Fifteen
            chips in one wrapped row is a list you have to read; four rows of "this beat, its
            four styles" is a shape you can see — and comparing the styles *at one beat* is the
            whole reason the branch exists. The group's own chip carries the short beat label,
            and the style chips inside it carry only the style. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {stepGroups.map((group) => (
            <div key={group.key} style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              {group.steps.map((s) => {
            const r = records[addressOf(cell.figure, s, cell.pairing)];
            const here = s.id === cell.step.id;
            return (
              <button
                key={s.id}
                onClick={() => { goToStep(s.id); }}
                title={s.label}
                style={{
                  ...BUTTON,
                  padding: "3px 6px",
                  fontSize: 11,
                  background: here ? "#333" : "#fff",
                  color: here ? "#fff" : "#333",
                  borderColor: r === undefined ? "#bbb" : RATING_COLOR[r.rating],
                  borderWidth: r === undefined ? 1 : 2,
                }}
              >
                {group.steps.length > 1 ? (s.label.split(" · ")[1] ?? s.label) : s.label}
                {r === undefined ? "" : ` ${String(r.rating)}`}
              </button>
            );
              })}
              {group.steps.length > 1 && (
                <span style={{ fontSize: 10, color: "#888", alignSelf: "center" }}>
                  {group.label}
                </span>
              )}
            </div>
          ))}
        </div>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
          pairing
          <select
            value={pairingId(cell.pairing)}
            onChange={(e) => { goToPairing(e.target.value); }}
            style={{ ...BUTTON, cursor: "default", flex: "1 1 0" }}
          >
            {reviewPairings().map((p) => (
              <option key={pairingId(p)} value={pairingId(p)}>
                {labels.get(p.beau) ?? p.beau} → {labels.get(p.belle) ?? p.belle}
              </option>
            ))}
          </select>
        </label>

        {/* What this step is on screen to answer. Above the buttons on purpose: a rating
            given without the question in view is a rating of the general vibe. */}
        <div
          style={{
            background: "#f7f7f4",
            border: "1px solid #e0e0da",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 12,
          }}
        >
          {cell.step.watch}
        </div>

        {/* The rules verdict for the pose on screen — read off the drawn meshes, so it cannot
            describe a figure nobody is looking at. */}
        <div
          style={{
            margin: "6px 0",
            padding: "6px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
            background: broken === null ? "#eee" : broken.length === 0 ? "#e6f4ea" : "#fdecea",
            color: broken === null ? "#555" : broken.length === 0 ? "#2e7d32" : "#b03a2e",
          }}
        >
          <strong>
            {broken === null
              ? "rules: not measured yet"
              : broken.length === 0
                ? "rules: all kept"
                : `rules: ${String(broken.length)} broken`}
          </strong>
          {broken?.map((line) => <div key={line}>{line}</div>)}
        </div>

        {/* 🧪 Every stretch and shrink, and a hand on each. The number beside a slider is what
            the dancer is wearing — figure and dial together — so a slider at 0 with a number
            beside it is the figure's own choice. */}
        <div
          style={{
            margin: "6px 0",
            padding: "6px 8px",
            border: "1px dashed #7a5ea8",
            borderRadius: 4,
            fontSize: 11,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>🧪 stretch &amp; shrink</strong>
            <button
              type="button"
              disabled={!stretchDialled}
              onClick={() => { setStretchCm([NO_STRETCH, NO_STRETCH]); setStretchNudge((n) => n + 1); }}
              style={{ fontSize: 10 }}
            >
              reset
            </button>
          </div>
          {([0, 1] as const).map((who) => {
            const row = stretched?.[who];
            const name = who === 0 ? beauName : belleName;
            return (
              <div key={who} style={{ marginTop: 4 }}>
                <div style={{ color: "#555" }}>
                  {name}{beauName === belleName ? (who === 0 ? " (beau)" : " (belle)") : ""}
                </div>
                {STRETCH_PARTS.map(({ part, label, min, max }) => (
                  <label key={part} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ width: 58 }}>{label}</span>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={1}
                      value={stretchCm[who][part]}
                      onChange={(e) => { setStretch(who, part, Number(e.target.value)); }}
                      style={{ flex: "1 1 0", minWidth: 0 }}
                    />
                    <span style={{ width: 34, textAlign: "right" }}>
                      {stretchCm[who][part] > 0 ? "+" : ""}{stretchCm[who][part]}cm
                    </span>
                    <span style={{ width: 52, textAlign: "right", color: "#555" }}>
                      {row === undefined
                        ? "—"
                        : part === "upperArm"
                          ? ""
                          : signed(part === "body" ? row.body : row.forearm)}
                    </span>
                  </label>
                ))}
                <div style={{ color: "#555" }}>
                  upper arm pulled past its length: left{" "}
                  <span style={{ color: (row?.upperLeft ?? 0) > 0.01 ? "#b03a2e" : "#555" }}>
                    {row === undefined ? "—" : signed(Math.max(0, row.upperLeft))}
                  </span>{" "}
                  · right{" "}
                  <span style={{ color: (row?.upperRight ?? 0) > 0.01 ? "#b03a2e" : "#555" }}>
                    {row === undefined ? "—" : signed(Math.max(0, row.upperRight))}
                  </span>
                </div>
              </div>
            );
          })}
          {stretchDialled ? <strong>not the shipped pose — don&apos;t rate it</strong> : null}
        </div>

        {/* 🔴 The same guard the dials get, for the same reason: a rating of a pose that was
            never built is worse than a missing one, because later nothing distinguishes it from
            a rating of a pose that was. `LAZY_L` is exempt — it reaches ADR-0037's break, which
            is real. Removed one style at a time as each pose lands. */}
        {unbuiltStyle && (
          <div
            style={{
              border: "1px dashed #b03030",
              borderRadius: 4,
              padding: "6px 10px",
              fontSize: 12,
              background: "#fdf2f2",
              color: "#7a1f1f",
            }}
          >
            🔴 <strong>This style has no pose yet — don&apos;t rate it.</strong> It renders as
            the L does. The <em>watch</em> above is the specification it is owed, not a
            description of what is on screen.
          </div>
        )}

        {/* 🧪 Exploratory, and labelled as such so a rating is never taken of a turned,
            staggered or height-shifted pose by accident. Journal 2026-09-14-2 has what
            turn-in measured; stagger is the same `floor-stagger-yaw` probe; hand height is
            2026-09-19 — it moves the hold point the arm solves onto and lets `settleTouch`
            work out the bend, rather than posing an elbow directly. Each dial keeps its
            dialed-in value across an on/off toggle — the checkbox gates whether it's
            *applied*, not the number itself. */}
        <div
          style={{
            border: "1px dashed #b58b2a",
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 12,
            background:
              turnIn === 0 && stagger === 0 && handHeight === 0 && handForward === 0 &&
              archOverhead === 0 && archClose === 0
                ? "transparent"
                : "#fff6e0",
          }}
        >
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={turnOn}
              disabled={!standing}
              onChange={(e) => { setTurnOn(e.target.checked); setTurnNudge((n) => n + 1); }}
            />
            <span>🧪 turn in</span>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={turnDeg}
              disabled={!standing || !turnOn}
              onChange={(e) => { setTurnDeg(Number(e.target.value)); setTurnNudge((n) => n + 1); }}
              style={{ flex: "1 1 0" }}
            />
            <span style={{ fontVariantNumeric: "tabular-nums", width: 28, textAlign: "right" }}>{turnDeg}°</span>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={staggerOn}
              disabled={!standing}
              onChange={(e) => { setStaggerOn(e.target.checked); setStaggerNudge((n) => n + 1); }}
            />
            <span>🧪 stagger</span>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={staggerCm}
              disabled={!standing || !staggerOn}
              onChange={(e) => { setStaggerCm(Number(e.target.value)); setStaggerNudge((n) => n + 1); }}
              style={{ flex: "1 1 0" }}
            />
            <span style={{ fontVariantNumeric: "tabular-nums", width: 34, textAlign: "right" }}>{staggerCm}cm</span>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={handHeightOn}
              disabled={!standing}
              onChange={(e) => { setHandHeightOn(e.target.checked); setHandHeightNudge((n) => n + 1); }}
            />
            <span>🧪 hand height</span>
            <input
              type="range"
              min={-30}
              max={30}
              step={1}
              value={handHeightCm}
              disabled={!standing || !handHeightOn}
              onChange={(e) => { setHandHeightCm(Number(e.target.value)); setHandHeightNudge((n) => n + 1); }}
              style={{ flex: "1 1 0" }}
            />
            <span style={{ fontVariantNumeric: "tabular-nums", width: 40, textAlign: "right" }}>
              {handHeightCm > 0 ? "+" : ""}{handHeightCm}cm
            </span>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={handForwardOn}
              disabled={!standing}
              onChange={(e) => { setHandForwardOn(e.target.checked); setHandForwardNudge((n) => n + 1); }}
            />
            <span title="Ryan's &quot;elbow back&quot; — a handhold's elbow is derived by touchPose from anatomy, so what sends it back is the hands going forward.">
              🧪 hands fwd
            </span>
            <input
              type="range"
              min={-20}
              max={40}
              step={1}
              value={handForwardCm}
              disabled={!standing || !handForwardOn}
              onChange={(e) => { setHandForwardCm(Number(e.target.value)); setHandForwardNudge((n) => n + 1); }}
              style={{ flex: "1 1 0" }}
            />
            <span style={{ fontVariantNumeric: "tabular-nums", width: 40, textAlign: "right" }}>
              {handForwardCm > 0 ? "+" : ""}{handForwardCm}cm
            </span>
          </label>
          {/* 🧪 The odd one out: this dial applies to the **arch** steps, not `stand`, because
              it is about a figure somebody turns under. It also reaches further than the other
              four — the join's lateral re-sizes the whole Twirl, not just the arms. */}
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={overheadOn}
              disabled={!arched}
              onChange={(e) => { setOverheadOn(e.target.checked); setOverheadNudge((n) => n + 1); }}
            />
            <span title="0% is the midpoint of the two inside shoulders (ADR-0025's rule, inherited from the standing hold). 100% puts the join directly above the turning dancer's own crown, which is where it sits in every reference photograph.">
              🧪 join overhead
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={overheadPct}
              disabled={!arched || !overheadOn}
              onChange={(e) => { setOverheadPct(Number(e.target.value)); setOverheadNudge((n) => n + 1); }}
              style={{ flex: "1 1 0" }}
            />
            <span style={{ fontVariantNumeric: "tabular-nums", width: 34, textAlign: "right" }}>
              {overheadPct}%
            </span>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={closeOn}
              disabled={!arched}
              onChange={(e) => { setCloseOn(e.target.checked); setCloseNudge((n) => n + 1); }}
            />
            <span title="0% is the standing handhold's own width. 100% is as close as the figure can still be delivered — bisected, never below the room their two bodies need to pass (ADR-0044).">
              🧪 pair closes
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={closePct}
              disabled={!arched || !closeOn}
              onChange={(e) => { setClosePct(Number(e.target.value)); setCloseNudge((n) => n + 1); }}
              style={{ flex: "1 1 0" }}
            />
            <span style={{ fontVariantNumeric: "tabular-nums", width: 34, textAlign: "right" }}>
              {closePct}%
            </span>
          </label>
          {arched ? (
            <div style={{ color: "#555", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
              join {overheadReadout.lateral.toFixed(3)} · her midline{" "}
              {overheadReadout.herMidline.toFixed(3)} ·{" "}
              <span style={{ color: Math.abs(overheadReadout.short) > 1e-6 ? "#b03a2e" : "#2e7d32" }}>
                {overheadReadout.short.toFixed(3)} short of over her head
              </span>
              <br />
              {/* The two things that have to move together: her hand has to come OUT over her
                  own head (positive), and the pair have to close for the beau to follow it. */}
              her hand{" "}
              <span style={{ color: overheadReadout.herHand >= 0 ? "#2e7d32" : "#b03a2e" }}>
                {overheadReadout.herHand > 0 ? "+" : ""}{overheadReadout.herHand.toFixed(3)}
              </span>{" "}
              from her shoulder · width {overheadReadout.standing.toFixed(3)} →{" "}
              <span
                style={{
                  color: overheadReadout.stood > overheadReadout.standing + 1e-6 ? "#b03a2e" : "#555",
                }}
              >
                {overheadReadout.stood.toFixed(3)}
              </span>{" "}
              · hold gap {overheadReadout.gap.toFixed(3)}
              {archOverhead === 0 && archClose === 0
                ? ""
                : <><br /><strong>not the shipped pose — don&apos;t rate it</strong></>}
            </div>
          ) : null}
          {standing ? (
            <div style={{ color: "#555", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
              forearm off vertical {turnReadout.tilt[0].toFixed(1)}° / {turnReadout.tilt[1].toFixed(1)}° ·
              forearm gap {turnReadout.gap.toFixed(3)} · flatness {turnReadout.flat.toFixed(2)}
              <br />
              {/* 🧪 The hands-forward dial's own cost. `upper` is the elbow off the hang —
                  ADR-0027's zero is "as far forward as both can hold with the upper arm
                  hanging", so this is how far past that the dial has gone. `strain` turns red
                  when the hold has been asked for past the end of somebody's arm. */}
              hold fwd {turnReadout.forward.toFixed(3)} · upper arm off hang{" "}
              {turnReadout.upper[0].toFixed(1)}° / {turnReadout.upper[1].toFixed(1)}° ·{" "}
              <span style={{ color: turnReadout.strain > 1e-6 ? "#b03a2e" : "#555" }}>
                strain {turnReadout.strain.toFixed(3)}
              </span>
              {turnIn === 0 && stagger === 0 && handHeight === 0 && handForward === 0
                ? ""
                : <><br /><strong>not the shipped pose — don't rate it</strong></>}
            </div>
          ) : arched ? null : (
            <div style={{ color: "#888", fontSize: 11 }}>standing couple step only</div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", gap: 4 }}>
            {([0, 1, 2, 3, 4] as const).map((r) => (
              <button
                key={r}
                onClick={() => { rate(r); }}
                title={RATING_LABELS[r]}
                style={{
                  ...BUTTON,
                  flex: "1 1 0",
                  padding: "6px 0",
                  fontWeight: 600,
                  background: record?.rating === r ? RATING_COLOR[r] : "#fff",
                  color: record?.rating === r ? "#fff" : "#333",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div style={{ color: "#666", fontSize: 11, marginTop: 3 }}>
            {record === undefined
              ? "0 terrible · 2 can't tell · 4 perfect"
              : `${String(record.rating)} — ${RATING_LABELS[record.rating]}`}
          </div>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "#666" }}>note (n to focus · esc to leave)</span>
          <textarea
            ref={noteRef}
            value={record?.note ?? ""}
            onChange={(e) => { setRecords((r) => noteCell(r, cell.id, e.target.value)); }}
            rows={4}
            placeholder="what is wrong, in your words"
            style={{
              font: "12px/1.4 system-ui, sans-serif",
              padding: "6px 8px",
              border: "1px solid #999",
              borderRadius: 4,
              resize: "vertical",
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { go(-1); }} style={{ ...BUTTON, flex: "1 1 0" }}>← prev</button>
          <button onClick={() => { go(1); }} style={{ ...BUTTON, flex: "1 1 0" }}>next →</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={nextUnrated} style={{ ...BUTTON, flex: "1 1 0" }}>next unrated (u)</button>
          <button onClick={() => { setRecords((r) => clearCell(r, cell.id)); }} style={BUTTON}>
            clear (x)
          </button>
        </div>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
          <input type="checkbox" checked={advance} onChange={(e) => { setAdvance(e.target.checked); }} />
          advance on rate
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "#666" }}>note (n to focus · esc to leave)</span>
          <textarea
            ref={noteRef}
            value={record?.note ?? ""}
            onChange={(e) => { setRecords((r) => noteCell(r, cell.id, e.target.value)); }}
            rows={4}
            placeholder="what is wrong, in your words"
            style={{
              font: "12px/1.4 system-ui, sans-serif",
              padding: "6px 8px",
              border: "1px solid #999",
              borderRadius: 4,
              resize: "vertical",
            }}
          />
        </label>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { go(-1); }} style={{ ...BUTTON, flex: "1 1 0" }}>← prev</button>
          <button onClick={() => { go(1); }} style={{ ...BUTTON, flex: "1 1 0" }}>next →</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={nextUnrated} style={{ ...BUTTON, flex: "1 1 0" }}>next unrated (u)</button>
          <button onClick={() => { setRecords((r) => clearCell(r, cell.id)); }} style={BUTTON}>
            clear (x)
          </button>
        </div>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
          <input type="checkbox" checked={advance} onChange={(e) => { setAdvance(e.target.checked); }} />
          advance on rate
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 11, color: "#666" }}>walk</span>
          <select
            value={figureFilter}
            onChange={(e) => { setFigureFilter(e.target.value); }}
            style={{ ...BUTTON, cursor: "default" }}
          >
            <option value="all">every figure ({allCells.length} cells)</option>
            {REVIEW_FIGURES.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={copyChart} style={{ ...BUTTON, flex: "1 1 0" }}>copy chart (md)</button>
          <button onClick={copyJson} style={BUTTON}>json</button>
        </div>

        <span style={{ color: "#666", fontSize: 11 }}>
          <strong>0–4</strong> rate · <strong>←/→</strong> or <strong>k/j</strong> move ·{" "}
          <strong>u</strong> next unrated · <strong>n</strong> note · <strong>x</strong> clear.
          Drag to orbit, scroll to zoom — the pose is live, so judge it from the angle that
          answers the question, not the one it opens on.
        </span>
      </div>

      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <Canvas shadows camera={{ position: [0, 6.5, 7.5], fov: 45 }}>
          <OrbitControls
            target={ORBIT_TARGET}
            maxPolarAngle={Math.PI / 2}
            minDistance={1.5}
            maxDistance={24}
          />
          <ambientLight intensity={0.75} />
          <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[24, 24]} />
            <meshStandardMaterial color="#e8e8e4" />
          </mesh>
          <gridHelper args={[24, 24, "#b9b9b3", "#d6d6d0"]} />
          <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.02, 0), 2.2, 0xcc4433]} />
          <arrowHelper args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.02, 0), 2.2, 0x3355cc]} />

          {/* Keyed on the cast **and the figure**: the frame and its body-derived scale are
              built once per mount, and the performance is memoised per figure — so a fresh
              floor is the honest way to change either. The step is not in the key, because
              a step change is exactly what `seek` is for. The hold arrangement **is** in the
              key: a separation is spent out of the couple's reach, so it moves their width —
              Myco/Sprout stand 0.829 apart square and 0.745 apart on the candidate — and the
              width is what the frame scale is built from. */}
          <DanceFloor
            key={`${cell.pairing.beau}|${cell.pairing.belle}|${cell.figure.id}`}
            call={cell.figure.call}
            {...(cell.figure.sequence === undefined ? {} : { sequence: cell.figure.sequence })}
            paused
            seek={seek}
            onBeat={onBeat}
            onArms={onFloor}
            stretch={stretch}
            shapes={shapes}
            turnIn={turnIn}
            stagger={stagger}
            handHeight={handHeight}
            handForward={handForward}
            turnUnder={turnUnder}
            archOverhead={archOverhead}
            archClose={archClose}
          />
        </Canvas>
      </div>
    </div>
  );
}
