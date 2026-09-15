# 2026-09-14 — The arc from the median

Ryan's second sketch landed. The hold was parked on 09-13 waiting for it, with 18 tests
failing by design and a note in `PROGRESS.md` saying four guesses had been measured and all
four were wrong. This is what the sketch said and what it cost to put in.

## What the sketch says

[`2026-09-14-sketch.jpg`](2026-09-14-sketch.jpg). A top view, and it is the **same view the
09-13 sketch drew** — but drawn properly.

The 09-13 sketch put both forearms leaving to the same side, wrists together at one edge of
the hands. That is what got built: `settleTouch` was handed the same `(lateral, forward)`
point for both dancers, so the two wrists were pinned to one point in plan and differed only
by a palm's thickness in height.

**A couple stands side by side, so their two forearms arrive from opposite sides.** The new
sketch draws that: a dashed **median** down the page, the beau's forearm coming in from the
lower left and the belle's from the lower right, each swept off the median by an annotation
arc, the two **wrists well apart**, and the hands **overlaid over the median** with the
smaller nested inside the larger. It labels *"wrist of smaller hand"*, *"beau's hand on
bottom"*, *"belle's hand on top"*, and both arcs *"from median"*.

Fitting circles to the two annotation arcs puts their vertices on the median, up at the hold —
they are angle marks, the angle between the median and each forearm.

Ryan: *"The hands meet at the edge of each shape, each forearm to the center of that dancer's
hand is a straight line, but there is an arc from the center line that accounts for the
placement so that the hands are overlaid properly."*

## The defect was one axis wide

`settleTouch` already built the hand's whole swing off the wrist, through `handOffset`. Then:

```ts
const wristLift = (aimX, aimY, aimZ) => {
  handOffset(_hang, m, side, aimX, aimY, aimZ);
  return palmOffset(m, isBeau, aimX, aimY, aimZ) - _hang.y;   // ← y, and only y
};
```

`_hang.x` and `_hang.z` were computed and thrown away. Measured: `wristSep` was **0.000 on
all 25 pairings**. The arc was not approximated or mis-signed — it was absent.

## Measure first

The lesson of 09-13 was four guesses, so this one got a number before it got an edit. The
splay is not a residual; it is algebraic:

```
splay = | dead_belle · û(arc_belle) − dead_beau · û(arc_beau) |
```

against the real solve, to three decimals:

| pairing | arc beau | arc belle | splay | predicted | should be |
|---|---|---|---|---|---|
| `player/player` | −90.0° | +48.6° | 0.178 | 0.178 | 0.000 |
| `myco/myco` | −40.6° | +32.3° | 0.142 | 0.143 | 0.000 |
| `ember/ember` | −19.8° | +18.8° | 0.054 | 0.056 | 0.000 |

🔑 **The diagonal is what makes it unarguable.** Two identical hands have to be concentric.
ADR-0053 put those five rows in as a control four days ago and this is the first thing they
have caught that no mixed row could have named.

And the mechanism reads straight off the table: the splay *is* the difference of the two
arcs. `ember/ember`, whose arcs are nearly equal and opposite, splays least.

## What went in

Two changes, and the second is the half I would have missed.

**One.** The iterate becomes a vector — the wrist's whole offset from the hand it is placing,
not just its height. Stepped or halved **as a vector**; the module's standing lesson is that
holding one component still while another jumps breaks convergence, and it applies with a
breadth of three exactly as it did with two.

**Two.** Every reach budget was already cut to the wrist — `wristReach`, `drawnSpan`,
`touchSpanAt` — and was then handed the **hold's** coordinates to spend it against. That is
the wrist's coordinates on the vertical only. The wrist is up to 0.074 off the hold across
and forward as well, so `bandedHeight`, `placeHold` and `relaxedForward` now take the wrist's
across and the wrist's forward, through one `wristAcross` conversion rather than four
sprinkled signs.

🔑 **The first change alone takes 12 of 25 to exact overlay; the second takes it to 13 and
roughly doubles `forward`.** The budget half is not a tidy-up — an arm budgeted against the
wrong point is an arm the stance believes can reach somewhere it cannot.

## ADR-0027 is not the blocker after all

The parked question was whether the hands had to come further forward, which meant letting
the upper arm swing at the shoulder, which is ADR-0027's decision to reopen.

**It does not.** Under ADR-0054 the hand separation is fixed by construction and does not
depend on the arcs, so it does not depend on `forward` either. `forward` went from zero on
**12 of 25** orderings to zero on **2 of 25** — it went *up*, as a consequence of budgeting
the arm against the right point, not as something aimed at. ADR-0027 stands untouched.

## Where it stops, and why there

**13 of 25 exact. The other 12 do not converge.**

I reported these as a reach failure first and that was wrong — worth recording, because the
number that disproved it is one I should have taken before writing the first diagnosis. The
across demand looked small and I concluded the binding axis was the drop/forward, in the
stance. Then Ryan asked whether the `e-9` failures were worth worrying about, and chasing
that question is what turned the real cause up.

🔑 **`touchPose` lands the wrist exactly where it is asked, on every pass of every arm** —
traced 50 of 50, all hits, no `reachPose` fallback anywhere. Nothing is out of reach and the
stance is not at fault. **26 of 50 arms simply run the pass budget out without settling**,
and the residual splits like this:

| arm | \|dx\| | \|dy\| | \|dz\| |
|---|---|---|---|
| `player/player` beau | 3.3e-2 | **3.6e-4** | 1.7e-1 |
| `player/sprout` beau | 9.7e-2 | **2.0e-12** | 1.4e-2 |
| `player/player` belle | 6.7e-2 | **9.4e-9** | 2.8e-2 |
| `sprout/sprout` beau | 2.8e-2 | **6.2e-8** | 3.0e-2 |

**`y` converges. `x` and `z` do not.** Those are exactly the two components this change added.
The old scalar iterate solved `y` alone and solved it well, which is why this never showed
before today.

**The mechanism is a lever.** The hand sits a `dead` span out from the wrist, so moving the
wrist sideways rotates the forearm and swings the hand further back the other way — a gain
above 1, which no damped iteration of the form `x ← x + w(g(x) − x)` will hold. It bites
hardest where `dead` is largest relative to reach: `sprout`, short-armed, and `player`,
large-handed. That is the failing population exactly.

### Three fixes tried and measured, so nobody pays for them twice

- **Raise the bound 24 → 48.** Buys only the genuinely-slow minority. ~50% more solver time,
  suite 13s → 19s, and `settleTouch` is on the per-frame path. Reverted.
- **Persistent adaptive damping, `w ← w/2` when not contracting.** Worst residual 1.7e-1 →
  4.5e-2, still not converging — and it *stalls*, because `|g(x) − x|` does not shrink just
  because the step does, so the weight collapses to its floor and the iteration freezes.
  🔑 A lesson worth keeping: **the residual is the right measure and the wrong step control.**
- **Disable the ±face flip in `wristRotation`**, on the suspicion that choosing which face
  comes level was a discontinuity moving the hand. 26 → 25 arms at the bound. Not the cause.

**What it wants is a root-find on `F(x) = g(x) − x`** — secant or Broyden on the 3-vector, or
the placement solved in closed form instead of iterated at all. That is the next piece of work
and it is self-contained in `settleTouch`.

🔴 **The flush rule is decided and deliberately not implemented.** Ryan ruled the hold names
the **smaller hand's centre**, the larger sitting `Δ · û(arc_small)` along it. Today both
dancers target the same point, so mismatched hands are concentric rather than flush, by up to
0.06. Held back because the offset's direction is the smaller dancer's **arc**, and the arcs
do not settle on the 12 above. **Converge first, then flush.**

## The root-find, and where it got to

**Built and measured; the suite has NOT been run against it.** Read that first — see *Tests*
below, whose numbers are from *before* this section's change.

`settleTouch` now solves `F(off) = g(off) − off = 0` instead of iterating `g`. Damped Newton:
a forward-differenced 3×3 Jacobian (`SETTLE_DIFF = 1e-6`), Cramer for the 3×3, and a
backtracking line search on `|F|` — which is what makes it safe across ADR-0052's flexion
kink, since a Newton step that overshoots a corner is rejected rather than taken. A pass that
cannot improve `|F|` at any length stops the solve rather than wandering, because the callers
read this as a *position* and a pose that moves between frames is the visible failure.
`SETTLE_PASSES` is **12**, where the iteration had 24 — Newton is quadratic where the map is
smooth, and each pass costs 3 evaluations for the Jacobian plus usually one for the step.

**Exact overlay went 13 → 21 of 25**, most of them landing at **1e-13 to 1e-15**. Wrists
separate by 0.015–0.176.

🔴 **Four are still out, and they are the extreme bodies:**

| pairing | splay | note |
|---|---|---|
| `player/player` | **1.0e-1** | identity pairing — the honest answer is **0** |
| `myco/sprout` | 2.7e-3 | |
| `sprout/player` | 2.6e-3 | |
| `sprout/myco` | 3.7e-7 | nearly there |

`player/player` is the one to chase. 1e-1 means the line search found no step that improved
`|F|` and broke out — so it is one of: the flexion kink sitting exactly under the solution, a
singular Jacobian (the `det < 1e-18` fallback firing), or **no root existing at that stance
at all**, which would put the question back in `placeHold` rather than in the solve. 🔑 **Not
diagnosed — and the lesson of this entry is not to write down which one it is before
measuring.** Instrument `settleTouch` to report passes used, final `|F|`, whether the
determinant fallback fired, and whether the line search exhausted its ten halvings.

## Tests

🔴 **These numbers are from BEFORE the root-find above. The suite has not been run since.**
Run `npx vitest run` first thing. `tsc` is clean; lint and docs-hygiene were clean as of the
previous state.

**18 failing, 745 passing of 763** — the parked count, with the composition moved.

- 🔴 **`"hangs the binding dancer's upper arm dead vertical, and holds the hands forward"` is
  left FAILING, on `7e-9` against a `5e-10` tolerance, and that is the right place to leave
  it.** 7e-9 is six orders below anything visible — Ryan could see 0.04 — so the *magnitude*
  means nothing. But it is the only test that noticed the solve stopped converging, and
  raising `SETTLE_PASSES` to buy it off is masking the defect above. **The number does not
  matter; the fact that it moved does.**
- 🔑 **`"never lets an elbow get outboard of the hand it is holding with"` fails on
  `2.8e-17 <= 0`.** That one *is* nothing — machine epsilon on a quantity that is analytically
  zero. The line above it already carries an epsilon and this one does not; it wants `1e-12`.
- 🔑 **`"closes the gap to something a handhold could have"`, `player→ryan` at 1.374 against
  1.35.** One pairing marginally over, and `player/ryan` is one of the 12 that do not
  converge. Should come back on its own. Do not re-pin it.

The rest are the documented parked set: the arch consequence pins, the four standing-couple
measurements that describe the old defect, and the three `"still puts the two hands on each
other"` residuals.

`tsc` clean · lint 0 errors (25 pre-existing warnings) · docs-hygiene clean. 📌 Uncommitted,
`src/` and `docs/` alike.

## The two things I would tell the next person

**The 09-13 sketch and the 09-14 sketch are the same drawing.** One has the arms leaving to
the same side and one has them leaving to opposite sides, and that single difference is the
whole of what was wrong. Be slow about what a sketch is a view *of* — the first one was read
carefully and implemented faithfully, and it was still the wrong picture.

**And I wrote a diagnosis down before I had measured it.** The arc itself got a closed form
and 25 pairings of evidence before a line changed, and it was right. The leftover 12 got a
plausible story — "reach failure in the stance" — and it was wrong, and it went into an ADR
and two PROGRESS files before a question from Ryan knocked it over. The discipline that
worked on the first half was available for the second and I did not apply it.
