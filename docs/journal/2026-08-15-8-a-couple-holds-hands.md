# 2026-08-15 (8) — S1 wired in, and a couple that holds hands

_Documents `95ad31b` and `a8bf113`._

Two pieces: making planning ADR-0011's S1 watchable at all, then Ryan's note on what a
partnered-up couple should look like.

## The wiring, and a seam that held

`useDancePerformance` gained a `sequence` option: when set, the two dancers are a **couple**
dancing calls in order rather than a facing pair looping one. That is a different *formation*,
not a different length — a facing pair points opposite ways and a couple points the same way,
which is why square-one composes each side of a couple from its own chain instead of deriving
one dancer from the other. Partner Trade needs exactly that: its two dancers walk genuinely
different figures.

**`DanceFloor` needed no change at all.** It already spreads `...performanceOptions` into the
hook, so the new option arrived for free. Worth recording, because this subsystem's journal is
mostly the other story — a seam holding under a change it was not designed for is the rarer
entry.

Verified through the real stepper before handing over rather than trusting the types: all
three figures run to `done` and end on the couple's own starting spots, so all three are
zeros — the mixed one included, which is the Partner Trade / California Twirl equivalence
dancing.

## Touch hands

> they should hold hands — we say touch hands — beau right palm up and belle's left palm
> down — making sure hands in open position — so the characters need to be a bit closer
> together when partnered up

square-one narrowed the couple (its own journal has the measurement — "a bit" was a factor of
three). This is the pose.

**Decided from the live placements, not from a formation flag.** `standingAsCouple` asks
whether these two are close enough and pointed the same way; that is the shape the rest of
`arm-pose` already uses, since `reachAllowance` and `constrainArm` both key off the separation
they can see. A renderer that had to be *told* which formation it was drawing is one that could
be told wrong. The heading check is what stops the pose firing on a Dosado's closest moment.

**`touchHeight` is the mean of the two dancers' own hanging hands.** The width square-one chose
is the one at which resting hands meet, so nobody lifts anything — which is what makes touch
hands a *resting formation* rather than a pose being held, and is why it can be the default
state of a standing couple instead of something a call has to ask for.

**Who goes underneath is decided anatomically.** The dancer whose inside hand is their **right**
is the beau, and the beau's palm is up. Stated that way on purpose: square-one's characters
face `+y` and townage's face `+z`, so the two repos genuinely disagree about which way `+x`
points. A rule phrased in body terms survives that; one phrased in coordinates would not.

The arm is solved with `reachPose` (ADR-0017) rather than placed, so the shoulder stays on the
body and the elbow gives. Only the inside arm is claimed; the outside one goes on being
*limited* exactly as it was.

## 🔴 A units bug written and caught in the same pass

`COUPLE_WIDTH` is an **engine** unit. Every placement the arm layer sees is **world**, scaled by
the frame — 2.60 for the default cast. My first version compared them directly.

It would have looked for a couple a third of a world unit wide, never found one, joined no
hands, and **said nothing about why**. Not a crash, not a wrong number on screen — an absence.
The same class as the rig-frame defect ADR-0017 chased: two frames, one comparison, no error.

Caught because I stopped to ask what units the comparison was in before running it, which is
the only reason it is a paragraph here rather than a watch item.

## Two things deliberately not done

- **Palm rotation.** The hands are stacked by their own radii, which reads as under and over,
  but the hand *mesh* orientation is static per side (`handRotations`). A literal palm-up /
  palm-down needs a per-frame hand-orientation channel. Flagged rather than faked.
- **Open hands** needed nothing: `Dancer` already draws `hand.open`.

560 tests (from 545 this morning), lint 0 errors, typecheck and build clean.

🔴 **The square-one link is active and uncommitted**, and PROGRESS says so at the top. A fresh
`pnpm install` reverts to the v0.2.0 pin and the sequence figures stop building.
