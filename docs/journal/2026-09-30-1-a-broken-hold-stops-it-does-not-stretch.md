# 2026-09-30 (1) — a broken hold stops, it does not stretch

Ryan, watching the [09-26](2026-09-26-1-the-join-was-never-over-her-head.md) 🧪 **join overhead**
dial on screen: *"it doesn't look like it worked."*

It had not. The dial put the join exactly where it was asked to — `0.000 short of over her head`
on every pairing — and the *hold* paid for it. Ten of the 25 orderings fell through to the terminal
let-go and stood **1.4× to 2.7× their own width apart**; `ryan/myco` went from 1.140 to **3.061**,
with no raised arm drawn at all. Every ordering whose hands actually met at `overhead = 0` —
`player/ember`, `ryan/ember`, `sprout/ember`, `ember/ryan` — lost them at `100%`.

🔑 **The 09-26 session measured her hand and never measured what it cost.** The numbers it
reported were true and the figure they described was worse than the one they replaced.

## The couple were being moved for a collision that should have stopped a hand

`sizeArch` will not let a pair stand at their own width unless **both** accommodations fit
(`ArchSizing.armDelta`'s reason — the pair stand in one place whichever way the draw lands). With
the join over the belle's crown, the *break* becomes incoherent: the beau's hand leaves his
shoulder aimed at a point above her head, falls short, and therefore stops **under** it — which is
inside her. `archClearance` charges that, correctly, and answers with a separation.

```
ryan/ryan    w=1.140   reshape needs 0.870 ✓   break needs 1.460 ✗  → let go at 2.920
ryan/ember   w=1.140   reshape needs 0.760 ✓   break needs 1.460 ✗  → let go at 2.919
ryan/myco    w=1.140   reshape needs 0.883 ✓   break needs 1.531 ✗  → let go at 3.061
player/myco  w=0.880   reshape needs 0.835 ✓   break needs 1.331 ✗  → let go at 2.662
```

Four pairs dancing a reshape they fit comfortably, walked apart by an accommodation they are not
drawing.

## Ryan's rule, and the half of it that did nothing

> *"for a broken hold, the arms should move in the direction but not require touch — should get as
> close as comfortably possible, not spread to max distance — so should go at least in the
> direction of overhead."*

Two things, and only one of them was the lever.

**`BREAK_COMFORT`** (0.95) is the ceiling back. ADR-0028 has both arms reach *as far as they can*,
and that is right for a hold **being made** — it is why `touchHold` deleted its own `TOUCH_COMFORT`
(0.95, the same number, and the only non-invented one available). A break is the opposite case:
nothing has to arrive, so nothing has to strain.

🔴 **On its own it moved the let-go count from 10 to 8 and no further.** A ceiling shortens a reach
without aiming it anywhere new, and the direction is the problem: at 70% of his arm the beau's hand
is inside Myco's cap instead of above it. The comfort ceiling is a **look**, not a fit.

**`stopClearOf`** is the lever. A hand that is not going to arrive walks back along its own reach to
the last point clear of the other dancer, and stops there. `archClearance`'s premise is square-one's
ADR-0018 — a *joined* hand in the gap between two heads, which the pair must be **given room for**,
because the hold is going to be made and the hand has to go somewhere. There is no joined hand in a
break. Two separate hands that would collide do not need the dancers moved apart; they need to
stop, which is what Ryan said.

Walked and not bisected, for `duckForIt`'s reason: a silhouette is not monotone in height, so a
bisection can settle on the far side of a waist it never sampled.

## What it bought

| at `overhead = 100%` | before | after |
|---|---|---|
| orderings that let go | 10 / 25 | **4 / 25** |
| of the 20 **non-self** orderings | 5 | **0** |
| standing wider than their own hold | 16 / 25 | 11 / 25 |

The four that still let go are `myco/myco`, `ember/ember`, `player/player` and `sprout/sprout` —
**every one of them a dancer paired with their own build**, which is the case where neither of them
is the one who can reach.

🔑 **`ryan/ember` is the pairing to look at.** It stood at 2.919 with a 2.099 gap; it now stands at
its own **1.140** with **gap 0.000** and her hand **+0.360 out over her own head**. That is the
reference photograph, on the pairing that was furthest from it. `ryan/myco` comes back from 3.061
to 1.140 and draws a raised arm again, still with a 0.682 gap.

## 🔴 It is not overhead-only, and three witnesses moved

`stopClearOf` and the ceiling are properties of a **break**, not of the dial, so the shipped figure
at `overhead = 0` changes in three orderings:

- **`myco/sprout`** 0.831 → 0.766 apart, but gap 0.135 → **0.499**. The break got cheap enough that
  `sizeArch` no longer reaches for the forearm, and the reshape at the closer width cannot close the
  hands. The *worst* of the three and the one to look at.
- **`ember/ryan`** gap 0.000 → 0.035. A perfect hold lost by three and a half centimetres.
- **`ember/ember`** gap 0.084 → 0.141, already a break.

And three tests fail that did not, each of them asserting the stance this entry changes. Left
failing rather than re-pointed, for the reason [09-26](2026-09-26-1-the-join-was-never-over-her-head.md)
gave about ADR-0037's witness — whether the case still wants that witness is a decision:

1. `arch.test.ts` · *is bounded, and lets go when no arm within the sheet is left to take* —
   ADR-0037 part 3's terminal witness, losing it for the second time.
2. `arch.test.ts` · *stops the short arm across as well as up* — asserts the beau's hand is at
   `handReach` **exactly**, which is the "spread to max distance" Ryan named.
3. `duck.test.ts` · *ryan/ember is the pairing that shows the cost* — the recorded duck cost moved.

Suite: **907 passing, 38 failing** against a baseline of 910 / 35. `tsc` and `eslint` clean.

## Also fixed: the readout was of a figure nobody was looking at

`DanceReviewScene`'s dial readout called `planArch` on the **resting** arms while the floor posed
the lengthened ones — so for the 11 orderings that reach, the printed `hold gap` and `her hand` were
not the figure on screen. `ryan/sprout` printed 0.234 against a drawn 0.204. It now plans on the
bodies `sizeArch` sized the figure for (ADR-0045), like the floor does.

## Next

- **Look at it.** `ryan/ember` at `overhead = 100%` is the one that came right; `myco/sprout` at
  `overhead = 0` is the one that got worse.
- **`BREAK_COMFORT` is a number to choose, not a measurement.** 0.95 is the repo's own former
  `TOUCH_COMFORT` and the only non-invented value available; between 0.85 and 1.00 it changes no
  fit at all, only how straight a broken arm looks. One line.
- Then the ADR — now four decisions, not three: the overhead join, the closing, **what a break
  does**, and whether the four styles rank.
- Nothing is committed. `CASUAL` still has no pose.
