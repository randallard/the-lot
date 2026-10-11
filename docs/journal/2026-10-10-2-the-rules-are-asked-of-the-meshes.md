# 2026-10-10 (2) — the rules are asked of the meshes

Step 2 of [this morning's](2026-10-10-1-the-rules-check-and-ryan-poses.md) build order: the rules
as one checker. Built, unit-tested, wired to the review page — and **not yet seen running**.

## What was built

**`src/dance/pose-rules.ts`** — plain numbers, no renderer. `measurePose(pair, ctx)` takes two
dancers *as drawn* and returns every measurement of every rule, kept or broken; `violations()` is
the filter and `describe()` the one-line sentence. The five rules are Ryan's:

| rule | what is measured |
|---|---|
| `clip` | each forearm and each hand against own head, own body, partner head, partner body, every other forearm and hand, and the floor |
| `side` | each elbow stays its own side of its owner's midline; a hand may come *to* the midline (a turn-under puts it over its owner's crown) but not past it by more than itself |
| `length` | elbow no further from its shoulder than the upper arm is long |
| `feet` | the torso's lowest point is where it is when standing — a duck shortens, it does not sink |
| `contact` | the two joined hands touch, when the style keeps the hold |

**`src/dance/pose-solids.ts`** — the only part that knows three.js is there. `readSolids` reads a
dancer off the scene graph: the forearm cone's two ends from its own mesh, the hand as an ellipsoid
from the hand mesh's world matrix, the torso from the scaled capsule, the head from its group.

🔑 **Read back, not re-derived — and that is the point of the whole design.** The review this
morning found three sessions in a row measuring something other than the picture. A checker that
took an `ArmPose` and a body shape and worked out where the hand must be would be a fourth opinion
about where a hand is. This one is handed the meshes. It also means it does not care how a pose
was made: `sizeArch` today, a drag tomorrow.

**`DanceFloor`** — `ArmReport` gains `solids` and `findings`, filled after the existing arm
read-back and only when `onArms` is set. **`DanceReviewScene`** — a verdict box under the step's
question: grey *not measured yet*, green *all kept*, red with one line per broken rule.

## Decisions made in passing, each Ryan's to overrule

- **`SKIN = 0.01`.** One centimetre of overlap is let through. A number to choose, not a
  measurement; it exists so palms that are meant to touch are not reported.
- **The upper arm is not a solid.** It is not drawn (ADR-0017), so nothing can clip it.
- **An arm under the floor is a clip.** Not on Ryan's list by name. `clearFloor` (ADR-0055) keeps a
  *solved* arm out; a dragged one has no such guarantee.
- **Joined hands are excused from clipping each other and nothing else.** A joined hand inside the
  partner's *forearm* is still reported — that is the 09-13 "forearm through the hand" defect and
  should stay visible.
- **A forearm grip (arm turn) excuses those two arms from each other entirely**, since that hold is
  an overlap by construction.
- **`keepsContact` is read as "the accommodation drawn is not a break".**
- 🔴 **Rule 1 supersedes the 2026-08-17 exclusion** in `ArmMetrics.parts` (*"just bodies heads and
  shoulders"*). That was about what the spacing solve owes and still holds there; an arm through
  its own body is now reported.
- 🔴 **`length` does not look at the forearm.** ADR-0040's reach *lengthens the forearm*
  (`growForearm`), which on a plain reading breaks "arms keep their length" — but the same cast
  grows and shrinks its torso by design. Unasked; the rule as built only catches a stretched upper
  arm.

## State

`pose-rules.test.ts`, 20 tests on synthetic dancers, all passing. Suite **927 passing / 38
failing** — the same 38; `tsc -b` clean; eslint 0 errors / 25 warnings. Uncommitted.

🔴 **Nobody has seen the verdict box.** I opened `#review=california-twirl/under-arch/ryan-ember`
in a background Chrome tab and it reported *not measured yet*: the tab was `hidden`, so no frame
ran and nothing was posed. That is the tab, not evidence about the code — and it is also no
evidence *for* the code. The reader's assumptions about the scene graph (the forearm is the arm
group's one cylinder; the hand mesh's matrix carries its flattening) are untested until a visible
tab runs it.

## Next

1. **Ryan opens any `under-arch` cell and reads the box.** Three things to tell me: does it leave
   *not measured yet*; does what it says match what is on screen; and is anything it calls broken
   something he would not call broken (or the reverse).
2. Expect it to be noisy at first — an arm's rest pose may already sit inside its owner's body by
   authored design. If so the fix is a baseline (a pose is charged only for what it adds over the
   dancer's own rest), not a bigger `SKIN`.
3. Then the contact sheet — step 3.
