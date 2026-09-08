# The wrist landed, and the stagger is not needed

**2026-09-07, evening**

[ADR-0052](../adr/0052-a-palm-turns-on-its-forearm-before-the-wrist-bends.md) is implemented,
composing onto the authored rotation as Ryan chose. The remeasure is unambiguous.

| standing couple, all 20 orderings | before | after |
|---|---|---|
| palms meeting face on | **2 of 40** | **40 of 40** |
| centre gap ÷ flat-palm ideal | **3.0× – 6.5×** | **1.0× everywhere** |
| median palm flatness (0 face on, 1 on the rim) | **0.86** | **0.00** |
| worst palm | 1.00 | **0.005** |

## 🔑 The prediction was wrong, in the good direction, and the reason is worth keeping

ADR-0052 states that four hands *"will still be wrong, by construction"* — the Sprout-as-beau
orderings needing 77°–88° against an 80° clamp — and made their staying wrong the evidence the
stagger decision would need.

**They came out at 2°–3°.** The arithmetic that predicted 77°–88° treated the forearm as
fixed and asked how far the wrist must bend to reach it. But the hold is a **fixed point**: as
a palm rolls level its centre moves — a flat hand rises by its thickness rather than its
width, which is nearly 0.09 closer on Myco — and the arm re-solves to the new hand position
with the forearm further off vertical, which leaves the wrist less to do. Two passes settle
it.

**So ADR-0051's stagger is not needed, and that is now measured rather than assumed.** Its
promotion condition has been tested and resolved in the "does not come back" direction.

🔑 **The lesson is the same one twice in one day.** ADR-0051 was wrong because it costed a
rotation in the wrong plane; ADR-0052's forecast was wrong because it costed it against a
frozen arm. Both times the error was **holding something still that the solve moves**, and
both times it was only visible by running the real thing.

## What had to be safeguarded

🔴 **Two hands never converged.** `you/sprout` and `sprout/you` bounced across the clamp
boundary forever — 200 passes, still 1.2e-3 out — because the clamp puts a kink in the map
from lift to rise. A step that is not contracting is now halved rather than taken, which
turns the bounce into a bisection. Everything else settles in two passes, which is *faster*
than before the wrist.

## What is left over, for Ryan

**Six pinned numbers moved**, all of them encoding earlier decisions, so none were re-pinned
here. Four are improvements, one is a tolerance, one wants a real look:

- ✅ 19 of 20 orderings now hold at the aimed waist height, up from 16.
- ✅ Sprout's hanging hand reaches 0.461 rather than 0.475, so the hold no longer has to rise
  for her — she can get down to a grown partner's waist now.
- ✅ No ordering loses the hold when asked at the resting width; `sprout/ryan` used to.
- ⚠️ One arm sits **1.8e-6** beyond its span against a 1e-9 assertion. It is a converged fixed
  point, not a failure to settle, and it is well inside the 1.2e-5 this repo has accepted
  before — but the tolerance is a judgement.
- 🔴 **Myco/Sprout's couple width is 0.829, down from 0.922** (`arch.test.ts` ×2). Flat hands
  sit closer to the contact plane, which changes the reach budget the stance is cut from.
  Narrower may well be right — Ryan's own watch item on 2026-08-22 asked whether 1.057 read as
  *too far apart* — but 0.922 was reasoned, and re-pinning it is a decision.

Plus the pre-existing arch terminal case, unchanged.

## A discrepancy found on the way, not chased

**The hand-map side naming and the rig side naming are mirrored, and `palmOffset` may be
reading the wrong one.** `armMetrics.handMap.right` is `handDrawnMap(pose, "right")`, which
`Dancer` draws on the mesh inside the ***left*** forearm group. For three of five characters
the two maps are identical (`rotation: [0,0,0]`) and for the other two θ is the same either
way, so nothing observable turns on it today — and the renderer here solves from each mesh's
*own* map, so the picture is right regardless. Flagged rather than fixed: it is its own
question and this change is already large enough.

753 tests, 746 passing. `tsc` clean, lint 0 errors, `docs-hygiene` clean. Uncommitted.
