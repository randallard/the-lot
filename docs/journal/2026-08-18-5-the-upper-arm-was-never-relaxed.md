# 2026-08-18 (5) — the upper arm was never relaxed, and forward is what was left over

_Documents commit `d3cd4fb` — *a couple's handhold, solved from the bodies, and the instrument that judges it*. Landed 2026-08-18 after Ryan verified the pose in the running scene._

Ryan:

> one more adjustment - they should be held a little forward from where they are, as if the upper
> arm is relaxed and hanging straight down

[ADR-0027](../adr/0027-the-upper-arm-hangs-and-the-hands-come-forward.md), superseding ADR-0025 —
because ADR-0025 carried a promotion condition that said, in as many words, *"if joined hands ever
move forward of the bodies … this decision needs revisiting rather than extending."* This is that.

## The hold had no forward axis at all

`TouchHold` was three numbers: stance, height, off-midpoint. Its `z` was **zero** — the plane
through both dancers' centres — and `touchPose` got a hand there by swinging the elbow *backward*
out of that plane. So the upper arm was never relaxed; it was rotated behind the body in order to
put a hand somewhere no real hand goes. The beau's elbow sat at `z −0.276`.

`ELBOW_BACK` is why. It went in on 2026-08-16 because an elbow that folds *outward* reads as an arm
pointing at the partner (Ryan: *"the beau's arm is pointing at the belle"*). It was the right fix
for that and it papered over this: with the hand pinned to `z` 0, backward is the only place the
elbow can go.

## Ryan's sentence is the derivation

A relaxed upper arm puts the elbow **directly below its own shoulder** — no freedom left in it.
From there the forearm is a fixed length reaching a hand already committed to a lateral offset
(ADR-0025's shoulder midpoint) and a height (her waist, plus this dancer's own drawn palm,
ADR-0026). One axis is left, and the leftover length goes into it:

```ts
forward² = forearmSpan² − across² − (handY − elbowY)²
```

The two dancers get different answers, so the hold takes the **shorter**. The longer-reaching one's
elbow folds back to take up the slack, which is what an elbow is for; the shorter-reaching one is
exactly relaxed. Further forward would over-extend somebody, and no opinion about posture buys arm
length.

## The check that the reading is right: `touchPose` needed no change

I expected to have to rewrite the elbow choice. `touchPose` picks the further-back of the two
solutions in the shoulder's own plane — and at the exactly-relaxed hand position **that solution
is the vertical one**, to 1e-16. The rule invented to stop an elbow pointing outward produces a
hanging upper arm the moment the hand is put where a hand goes.

The way that showed up is the nicest thing in this entry. One test failed:

```
FAIL  🔴 joins nothing when no hold is supplied
AssertionError: expected -1.3877787807814457e-16 to be less than -0.01
```

It asserted the elbow was swung back by at least 0.01. It is now dead vertical. **A failing test
whose failure is the feature landing** — and it had to be rewritten to say what actually separates
a handhold from a hang now, which is neither the elbow's x (shared by construction) nor its z
(shared too, on the binding dancer), but the forearm going somewhere: `aimZ > 0.5`.

## What it does

| cast | stance | height | lateral | **forward** | upper arms | reach |
|---|---|---|---|---|---|---|
| `default` | 1.140 | 0.713 | 0.050 | **0.320** | beau **0.00°**, belle 25.8° back | 50→67% / 71→79% |
| `mixed` | 1.070 | 0.670 | 0.175 | **0.000** | beau 0.00°, belle 78.4° back | 100% / 62% |
| `max` | 1.640 | 0.903 | 0.005 | **0.306** | belle **0.00°**, beau 5.0° back | 64→74% / 90→96% |

Stance, height, lateral and every clearance unchanged on all three. `mixed` gets no forward at all
because the beau there is already at 100% of his reach — a torso wider than an arm is long
(ADR-0023) — which is honest degradation rather than a special case.

**Watched live**, and this is a **plan view** question, exactly as "is the elbow behind the body"
was: from above, the black pivot marker (the pair's midpoint, `z` 0) and the red hand markers are
visibly different points, with the hands out in front along the facing. That is the joint markers
repaired this morning being used for the third watch in a day.

## 🔴 The number is bigger than "a little", and here is why

**0.320 is about one torso radius (0.30).** So the joined hands sit essentially at the front surface
of the beau's belly, and his forearm comes out **3° above horizontal** rather than hanging at all.

The cause is an interaction worth writing down: the hold height is the **belle's** waist, and on
this pairing her waist sits at 0.713 while his hanging elbow sits at 0.620 — his hand centre ends
up 0.020 *above* his own elbow. So the vertical term is almost nothing, the across is 0.160, and
nearly the whole of his 0.358 forearm has nowhere to go but forward.

That is the mechanism Ryan asked for, followed exactly. If the pose reads as thrust out rather than
relaxed, **the honest dial is not a fudge factor on `forward`** — it is the standing decision that
her waist sets the height, which he restated one message earlier. Two opinions that were each right
alone are pulling against each other here, and that is his call to make, not something to tune away.

## The one to carry

**A mechanism is a better instruction than a target.** "A little forward" alone would have been a
constant to guess and re-guess. "As if the upper arm is relaxed and hanging straight down" is a
sentence with an answer in it, and the answer came out derived, testable, and different per cast —
including honestly *zero* on the cast that has no arm to spare. Worth asking for the mechanism
whenever a look note arrives.

## State

**600 tests** (from 599), lint 0 errors and none in `src/dance/`, typecheck and build clean. The
promotion condition ADR-0025 left open is **resolved rather than deferred**: the corridor is still
measured side-to-side at `z` 0, and that is provably conservative now the hands are in front,
because a capsule's lateral half-width at a forward offset is `sqrt(r² − z²)` — strictly narrower.
A hold that clears in the bodies' own plane clears in front of it.

⚠️ Still owed, now for four reasons: **the elbow watch on the default cast.** The joined hands moved
laterally, both free arms dropped, both hands moved vertically, and now the whole hold has moved
forward and both upper arms have changed angle.
