# 2026-10-10 (1) — the rules check, and Ryan poses

Ten days away, and a review rather than a fix. Ryan: *"we've been struggling with these postures —
let's review and consider whether we're on the best way forward to get the positions figured out
for all the pairings and positions."*

No source changed this session. What changed is how the posture work is going to be done.

## What the review found

The trouble is not any one posture. It is the loop.

- **Every fix was checked against a number the session chose, and Ryan's eye then found what the
  number missed.** [09-26](2026-09-26-1-the-join-was-never-over-her-head.md) measured her hand and
  not what it cost the hold. The session after it (09-27, no entry of its own) pinned "over her
  head" on a view that did not show ten pairings letting go.
  [09-30](2026-09-30-1-a-broken-hold-stops-it-does-not-stretch.md) fixed that and moved three
  shipped orderings nobody had asked about. About a dozen entries in this directory are titled
  some form of *"X was never Y"*.
- **`sizeArch` is a ladder of rules, not one judgement.** Fit, then reach, then duck, then let go
  — each rung added for one reported pairing, and the last one a cliff (ADR-0040, worklist item
  10). The rungs interact, which is why a cheaper break made `myco/sprout` worse with every dial
  off.
- **"Good" is written down nowhere but in Ryan's eye, and the eye sees one cell at a time.** The
  review page is single-cell. The 875-cell sweep has never been run and no ratings have been
  exported into the repo.
- **Scope outran acceptance.** Four turn-under styles, a duck, two 🧪 dials, a head guard and a
  selection rule, while the plain arch on the 25 orderings has never been signed off.
- **The nets are worn.** 38 red tests, several on purpose; three weeks uncommitted; a 292 KB
  PROGRESS doc. Ryan opened this session with a pasted message that turned out to be one session
  stale — the doc had the truth and it took a search to find it.

## The way forward Ryan chose

> *"I wonder though if there was a way that we could set the rules and I could do some dragging
> around of the limbs to set each position every once in a while then you could try with the
> others and we could go back and forth that way … maybe this could be like setting keyframes and
> then watching the animation between them too, but also setting poses for each of the L, duck,
> lazy, and casual."*

So: **Ryan authors poses, the rules are hard checks, and the code's job is to carry a pose from
the pairing it was set on to the others.** The rule ladder stops being the thing that *generates*
a pose; at most it is the first guess for a pairing nobody has posed.

**The rules**, as Ryan stated them and as read back to him:

1. No arm through a head, a body or another arm — its owner's or the partner's.
2. An arm stays on the side it started.
3. Arms keep their length (this is what stops a drag stretching one).
4. Feet stay on the floor (ADR-0043).
5. Joined hands touch in the styles that keep contact (`full-l`, `duck-under`) and need not in the
   two that break it (`lazy-l`, `casual`).

🔴 Rule 1 is only partly checkable today. An arm through its **own head** has no check at all
(worklist item 11), and arm-against-arm is unconfirmed. Rule 2's fix
([09-21 (1)](2026-09-21-1-the-down-arm-was-never-moving.md)) is asserted over twenty orderings and
still has not been watched.

**The loop:**

1. Ryan poses one pairing at one step — a draggable hand and elbow per arm, plus the pair's
   separation and a dancer's duck. That is all a pose is: `ArmPose` is already an elbow and a hand.
2. The rules run live during the drag; a limb that breaks one goes red.
3. The pose is stored **relative to the bodies** (so far above her crown, so far out from his
   shoulder, in their own arm lengths), re-applied to the other 24, and nudged the least it takes
   to satisfy the rules.
4. Ryan looks at all 25 at once and re-poses only the ones that read wrong. Each correction is
   another example; a body nobody posed gets the blend of its nearest examples. Bodies are
   editable, so hand-authoring every pairing was never an option — the cast is five *samples*.
5. The named steps (`stand`, `quarter`, `under-arch`, `three-quarter`) are the keyframes, and
   `blendPose` already goes between two poses. The rules run on the in-betweens too.

**Naming, asked and answered:** the four are **styles** — `TurnUnderStyle`, ADR-0057. They also
have a preference order, L first, which is what Ryan's 09-26 *"choose between fallback methods"*
was naming. The order is a property of the styles, not a second name for them.

## Build order

1. ✅ **Checkpoint.** Everything from 09-19 through 09-30 committed as it stood — three red tests
   and all — so the new work starts from a known state.
2. **The rules as one checker**: a pose in, the rules it breaks out.
3. **A contact sheet**: all 25 orderings at one step, same camera, the checker's verdict under
   each. Nothing like it exists; `review-chart.ts` is a table of ratings, not a view.
4. **Drag handles and save**, poses in a file in the repo rather than localStorage (the reason
   `review-chart.ts` gives for the chart living in the planning directory).
5. **Carry-over** to the other pairings.

2 and 3 pay for themselves before anything can be dragged: they show how today's poses score
against Ryan's rules across the whole cast.

No ADR. Nothing is built, and the standing instruction from 09-26 applies — *"let's try it out in
practice before setting it in stone."* When the loop has produced an accepted pose, the ADR is the
one that says poses are authored and carried, and it supersedes whichever of ADR-0037 and ADR-0040
it replaces.

## State

Suite **907 passing / 38 failing**, `tsc -b` clean, `eslint` 0 errors / 25 warnings — unchanged
from 09-30, re-run today. The three tests 09-30 left failing are still failing and still a
decision; under the new approach they are likely to be deleted with the stance they pin rather
than re-pointed.

Still parked, untouched: `BREAK_COMFORT`'s value, the overhead-join default, `CASUAL`'s pose, the
head guard as its own solver (item 11 — its *check* is now step 2), the selection rule (item 13).
