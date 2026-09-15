# ADR-0054: The solve places the hand and the wrist follows
- Status: Accepted
- Date: 2026-09-14
- Deciders: Ryan, Claude

## Context

The standing handhold has now been solved three ways, and the first two are both in the
repo's history for the same reason: **each fixed the defect the one before it had, and
introduced the opposite one.**

1. **Both hand centres on one point.** The hand sat on the forearm's axis, so
   `elbow + forearmSpan · aim` was the end of the arm *and* the hand's centre, and the hold
   was that point for both dancers. The hands were concentric, and a forearm ran through the
   partner's hand on nine of twenty-five pairings — Ryan, on `sprout-myco`: *"can you see the
   arm sticking straight into the center of myco's hand."*
2. **Both wrists on one point.** [ADR-0052](0052-a-palm-turns-on-its-forearm-before-the-wrist-bends.md)
   gave the wrist a rotation; the rebuild of 2026-09-13 gave it the translation that goes
   with one, and moved the solve's target from the hand to the wrist. That cleared the
   forearms — the cylinder now stops a `handForearmGap` short of the hand — but the hands
   then **splayed**, up to 0.178 apart on `player/player`, because each hand carried on past
   the shared wrist point along its own arm's line and the two lines point opposite ways.

🔑 **The splay was not a residual. It was algebraic**, and measuring it is what settled this:

```
splay = | dead_belle · û(arc_belle) − dead_beau · û(arc_beau) |      dead = forearmSpan − drawnSpan
```

reproduced against the real solve to three decimals across all twenty-five pairings —
`player/player` 0.178 predicted against 0.178 measured, `myco/myco` 0.143 against 0.142,
`ember/ember` 0.056 against 0.054. The **identity pairings are what make it unarguable**
([ADR-0053](0053-a-dancer-is-paired-with-themselves-too.md) earning its keep): two identical
hands must be concentric, and they were 0.054 to 0.178 apart.

**Ryan's sketch of 2026-09-14** ([`journal/2026-09-14-sketch.jpg`](../journal/2026-09-14-sketch.jpg))
is what names the missing piece. It is the same top view as the 09-13 sketch drawn properly:
the two forearms arrive from **opposite sides** — as a couple standing side by side must —
each swept off the **median** by its own *arc*, with the hands overlaid over the median and
the wrists well apart. The 09-13 sketch had drawn both arms leaving to the same side, and
that simplification is what got built. Ryan: *"there is an arc from the center line that
accounts for the placement so that the hands are overlaid properly … right now the way it's
figured I think it is a bit askew because it doesn't factor the arc for overlay."*

🔴 **The defect was one axis wide.** `settleTouch` already computed the hand's whole swing
off the wrist and then used **`y` alone**, discarding `x` and `z`. So both wrists were pinned
to one point in plan — `wristSep` measured 0.000 on every one of the twenty-five pairings —
and the arc existed nowhere in the solve.

## Decision

**The hold names a hand centre, and the wrist is wherever that hand's own swing puts it.**

`settleTouch`'s `handX`/`handZ` are the hand's centre; the wrist is placed at
`hand + off`, where `off` is the hand's swing off the wrist taken on **all three axes**.
The iterate becomes that vector, stepped or halved as a vector and never componentwise.

Every reach budget — `bandedHeight`, `touchSpanAt`, `relaxedForward` — was already cut to
the wrist (`wristReach`, `drawnSpan`) and was being handed the *hold's* coordinates to spend
them against, which is the wrist's only on the vertical. They are now handed the wrist's, via
one `wristAcross` conversion rather than four sprinkled signs.

**Where the two hands sit across the contact plane is a property of the pair, not of one
dancer.** The vertical stays local — each dancer puts their own palm on `hold.height` and
they meet there, which is `palmOffset`'s whole design — but the flush rule references the
*partner's* radius and cannot be local in the same way.

## Alternatives considered

**Raise `hold.forward` and close the splay that way.** This was the parked question, and it
is what ADR-0027 would have had to be reopened for: forcing the hands forward by hand shut
the splay 0.186 → 0.119 and took 0 → 5 of 25 clear. **It is no longer needed, and the reason
is the point.** Under this decision the hand separation is fixed by construction and does not
depend on the arcs at all, so it does not depend on `forward` either. ADR-0027 stands.
Measured: `forward` was zero on **12 of 25** orderings before and is zero on **2 of 25**
after, having gone *up* as a consequence rather than as a target.

**Keep the wrist as the target and offset the hands afterwards.** Two derivations of where a
hand is, which is the defect [ADR-0045](0045-a-couples-width-is-the-one-they-are-dancing-at.md)
was written about, and the reason `handCentre` is a single function.

## Consequences

**Exact overlay on 21 of 25 pairings, from 0 of 25**, most of them at 1e-13 to 1e-15 — machine
precision. The wrists separate by 0.015 to 0.176, which is the sketch's picture: the splay has
moved off the hands and onto the wrists, where it belongs.

**The solve is a root-find, not an iteration, and that is part of this decision rather than a
detail under it.** Placing the hand instead of the wrist makes `g` a map whose gain exceeds 1
— the hand sits a `dead` span out from the wrist, so nudging the wrist sideways rotates the
forearm and swings the hand further back the other way. Iterating `g` cannot converge there,
and measurement said so: **26 of 50 arms never settled**, the whole residual living in `x` and
`z` while `y` reached 1e-12. `settleTouch` now solves `F(off) = g(off) − off = 0` by damped
Newton — a forward-differenced 3×3 Jacobian, Cramer, and a backtracking line search that makes
it safe across ADR-0052's flexion kink. Twelve passes, where the iteration had twenty-four.

**Three cheaper fixes were tried and measured first**, recorded so nobody pays for them twice:
raising the pass bound 24 → 48 (buys only the slow minority, ~50% more solver time);
persistent adaptive damping `w ← w/2` (worst residual 1.7e-1 → 4.5e-2, still diverging, and it
*stalls* — `|g(x) − x|` does not shrink just because the step does); and disabling the ±face
flip in `wristRotation` on the suspicion it was a discontinuity (26 → 25 at the bound; not the
cause).

🔴 **Four pairings are still not exact** and they are the extreme bodies:
`player/player` **1.0e-1**, `myco/sprout` 2.7e-3, `sprout/player` 2.6e-3, `sprout/myco` 3.7e-7.
`player/player` is the one that matters — it is an identity pairing, so the honest answer is
zero, and 1e-1 means the line search is finding no step that improves `|F|` and stopping.
Whether that is the kink, a singular Jacobian, or no root existing at that stance is **not yet
diagnosed**.

🔴 **The flush rule is decided but NOT implemented.** Ryan ruled that the hold names the
**smaller hand's centre**, with the larger at `hold + Δ · û(arc_small)` for
`Δ = r_large − r_small` — derived, not chosen: `hold.height` is the contact plane, the contact
patch is the smaller palm since it lies entirely inside the larger, so the hold is the centre
of the contact. Today both dancers target the same point, which is correct for a matched pair
and leaves mismatched hands **concentric rather than flush**, by up to 0.06.

**Promotion condition.** If the four stragglers turn out to need the *hold* placed differently
rather than a better solve, this decision is what to re-read first: it is the one that made the
hold a hand rather than a wrist, and it is what decides which point the budgets are owed
against.
