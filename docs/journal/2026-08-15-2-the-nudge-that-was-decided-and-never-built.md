# 2026-08-15 (2) — the nudge that was decided and never built

_Documents `74a0650` (ADR-0018) and `cddfd09` (the build)._

Ryan watched the arm work from this morning and reported: *"fist bump requires way too close of
a position — I thought we talked about nudging so it wasn't necessary to be so exact."*

Both halves of that are right, and they are different problems.

## We did talk about it, and it has been sitting in the queue

Auto-positioning is Ryan's, from 2026-07-30: *"a move may bring both bodies into position when
accepted by both parties."* It has been **item 2 of the next-action list** ever since, deferred
pending its own ADR because it splits the availability predicate and because "accepted by both
parties" implies an offer/response handshake nothing has built.

So the honest answer to "I thought we talked about nudging" is: we did, it was written down as
next, and it was still next this morning when the geometry underneath it got stricter. The
deferral is what the watch ran into.

## The measurement, because "too close" deserved a number

| pair | old limit | new limit |
|---|---|---|
| player ↔ Ryan / Myco | 1.215 | **0.917** |
| player ↔ Ember | 1.495 | 1.402 |
| player ↔ Sprout | 0.885 | 0.750 |
| player ↔ Player | 1.090 | 0.955 |

A quarter off the default pairing. The breakdown for the player's own arm: `handReach` 0.545,
of which **0.38 is spent climbing down** to the mean-elbow contact height and **0.25 crossing
the body's own midline**, leaving `axialReach` **0.300** to travel across the floor.

The climb is the interesting one and it is not a bug. The player's rig sits at `BASE_Y` 0.75
and an NPC's at 0 with its body centre at 0.5, so the player genuinely stands a quarter of a
unit higher; `gripHeight`'s mean puts the contact well below the player's own elbow, and the
arm spends itself getting down there. That is `gripHeight`'s known unequal-pair placeholder
(step 3 of the dancer-size brief) showing up as a *reach* cost rather than as a height error.
Still open, still not what today is about.

## What I did not do

I did not loosen the reach. The tight number is the true one for a rigid arm on a torso that
cannot twist, and buying comfort back by making the geometry lie would quietly undo this
morning's work. The complaint is about **positioning**, and positioning has an answer that has
been written down for two weeks.

I also did not reach for `outOfRange: "reach"`, which is already implemented and would offer
the bump at any distance. It reproduces the original floating-arms screenshot — that field is
about what happens when a move is *performed* out of range, not about getting into range.

## The blocker dissolved for the case that exists

The handshake is needed when **both participants are players**. Today one is an NPC, and an
NPC's consent is already modelled: `ComfortPreferences` has been threaded through
`availability` since ADR-0016 exactly so it would not need retrofitting. The player's consent
is the wheel — a move that only ever runs because someone picked it off a menu has been chosen.

**Being chosen is what consent to be moved looks like from the choosing end.** That is
ADR-0018's title and the reason it could land today instead of behind a feature nothing yet
requires.

## What landed

- **`approach: "none" | "turn" | "turn-and-step"`** on `ContactMove`, optional in the type and
  read through `approachOf`, because moves authored before today are already in `localStorage`
  and a stored move silently gaining the power to move its participants is not a migration
  anyone agreed to.
- **`availability` asks a weaker question** of a move that approaches: facing dropped entirely,
  distance widened to `offerReach`. Consent untouched — geometry is what gets relaxed.
- **`approachTarget`**, pure: two destination placements. Separation is *clamped into a
  comfortable band, not set*, so a pair already standing well are only turned. The walk splits
  evenly, since who reaches further is already `contactFraction`'s job.
- **The driver's approach phase** — freeze both placements, ease over `APPROACH_SECONDS`, snap,
  then run the envelope. Snapped for the grip's reason: the envelope solves contact against
  these placements, so arriving *nearly* there means every frame of the hold is solved against
  a pose the bodies never quite took.
- **`playerBodyDriven` / `npcBodyDriven`** — ADR-0010's owned-channel contract applied to
  placement, the same shape `drivenArms` already has one level down.
- An `approach` control in the move editor.

For the default pairing that takes the offer radius from **0.92 to about 2.2**, and drops the
facing requirement entirely. 526 tests (from 507), lint 0 errors, typecheck and build clean.

## One defect the tests caught, and it was mine

The first `offerReach` was `maxSeparation + APPROACH_STEP`, which reads right and is wrong: the
approach stages the pair at `maxSeparation × 0.8`, so the gap actually closed at the edge of
the offer is `0.2 × reach` more than the budget the constant promises. Small — 0.18 units — and
exactly the kind of quiet disagreement between a documented promise and its arithmetic that
this subsystem keeps getting caught by. Measured from the staged separation instead, with a
test that walks the whole offer range and asserts nobody is ever asked to move further than
`APPROACH_STEP` in total.

## Flagged for the watch

- **This is the first thing in the game that moves the player without them steering.** Input is
  ignored for the whole gesture, not just the step — handing the controls back when the fists
  meet lets you walk out of a contact you are still in. About 1.25s of not being in charge.
  Whether that *feels* right is the question only a watch answers.
- 🔴 A stuck ownership flag would freeze the player permanently, which is much worse than a
  dropped bump. Released on the ending frame **and** on unmount, since the ending frame is not
  guaranteed to run.
- The approach ignores obstacles. Bounded at 1.5 units on open ground, so a pair can be stepped
  through scenery. A navmesh is a different feature.
- An NPC mid-walk is frozen for the duration rather than pausing gracefully.
