# ADR-0056: A declared hold keeps the hand the figure named

- Status: Accepted
- Date: 2026-09-21
- Deciders: Ryan, Claude

## Context

Ryan, 2026-08-23, watching a California Twirl:

> the belle's arm that stays down seems to be switching sides halfway through — heres a before
> and after and after — it does switch back but … it's weird — starting the twirl - right arm
> down … at this point the right arm should pass under the raised arm for the twirl - like a
> spin in place under the arch, but instead it just appears on the other side as if becomming
> the left arm … here is the point where the down arm becomes the right arm again

Three screenshots, kept in the planning effort's `screenshots/`. The defect stayed open for
four weeks behind the width lever, ADR-0046's aim, and the wrist.

**It is `insideSide`.** That function answers "which of my hands is the inside one" by taking
the partner's bearing **in this dancer's own frame**:

```ts
const localX = dx * Math.cos(self.yaw) - dz * Math.sin(self.yaw);
return localX >= 0 ? "left" : "right";
```

A bearing in one's own frame moves when *either* the partner moves **or** this dancer turns.
A California Twirl does both at once, on purpose, and **out of phase**: the belle walks the
diameter turning a steady 180° while the beau bows around an arc. Walked through the real
engine at quarter-beat resolution, `player/myco`:

| beat | belle's inside hand | her down arm | |
|---|---|---|---|
| 0.00 – 1.00 | left | **right** | screenshot 1 |
| 1.25 – 2.75 | **right** | **left** | screenshot 2 |
| 3.00 – 4.00 | left | **right** | screenshot 3 |

Identical on `sprout/ember`, so it is the figure and not the pairing. The beau never flips.

🔑 **The two rotations cancel exactly at the ends.** The belle reads `left` at beat 0 and
`left` at beat 4. So this is a **phase error inside the figure**, not a genuine change of side
— which is what makes a fixed answer safe: it loses no information anyone wanted.

🔴 **And the visible half is not the worse half.** `poseArms` reads the *role* off the same
side — `const beau = side === "right"` — so for the seven quarter-beats the belle's hand read
`right`, **both dancers were the beau**: two palms up, and `hold.lateral` applied in the same
direction by both, so the pair wrote two different contact points for one hold. Nobody had
reported it because it is invisible next to an arm teleporting across a body.

## Decision

**When the figure names the hand, that is the hand. Only an undeclared pair is asked from
their placements.**

`touchingSide`'s `declared` parameter widens from `boolean` to `DeclaredHold = boolean |
"left" | "right"`, and gains one line:

```ts
if (declared === "left" || declared === "right") return declared;
```

`DanceFloor` passes the hand square-one already gave it — `track.arch`, read off the live
`arch` grip span — instead of a bare `true`.

Three things make this the rule rather than a patch:

**The engine already knew.** `GripSpan.hand` carries the hand a span engages, and square-one's
own type doc says why: *"A grip span is for a hold the **figure** imposes, which the placements
cannot reveal."* Measured across all twenty shipped orderings, every Twirl declares beau
`right` / belle `left` and holds it from beat 0 to 7.5 — two whole executions, one answer. The
defect was the-lot re-deriving something it had been handed.

**A named hand beats a latch, because of seeking.** The obvious fix is to latch the side on the
first frame of the hold. It fails on the one instrument built to watch this: `#review` jumps
*straight to a beat*, so landing on `under-arch` would latch the swapped value and preserve the
defect in the tool for finding it. A declared hand is stateless and beat-independent.

**Three states, because there are three.** `false` is an undeclared pair, read off the
placements. `true` is a hold declared with no hand — the review route's turn-in dial, which
needs to skip `standingAsCouple`'s facing tolerance but has no span to name a side with, and
where the placements are still right because nobody is turning. A hand names it outright.

## Alternatives considered

**Latch the side at the start of the hold.** Rejected above: seek-hostile, and it adds
per-dancer frame state to a path that currently has none.

**Make `insideSide` frame-independent — ask which side of the *couple* the dancer is on.**
This is the correct geometry and it would fix the Twirl without the engine's help. Rejected as
more machinery for a worse answer: it needs the couple's facing threaded to a function that
today needs only two placements, and it would still be the-lot deciding something square-one
has already decided. If a future figure changes hands mid-call, this is the fallback to revisit.

**Fix it in `poseArms` by pinning the role instead of the side.** Cures the both-beau half and
leaves the arm still swapping. It treats the symptom that was not reported.

**Widen `standingAsCouple`'s tolerances so the arch needs no declaration at all.** Rejected
when `declared` was introduced and still wrong: a Twirl's pair close to half their standing
width and finish facing opposite ways. There is no tolerance that admits them and still
excludes two strangers standing near each other.

## Consequences

**The side is now constant for every pairing across the whole figure** — asserted over all
twenty orderings at quarter-beat resolution, not assumed.

**And it agrees with the live answer at both ends, so the release does not pop.** The arch span
ends half a beat before the call does (`HOLD_RELEASE_BEATS`), at which point `declaredHold`
falls back to the placements. If the two disagreed there, the arm would jump across on release.
They agree, for everyone — pinned, because it is the seam this fix creates.

**The both-beau bug is fixed as a side effect**, not separately. It was never a second defect.

**The old behaviour is pinned as a finding, not deleted.** `declared-hold.test.ts` asserts that
the live bearing flips at beats 1.25 and 3.0 and that both dancers read `beau` for seven
quarter-beats. That is what the defect *was*; a fix whose test only shows the good state cannot
tell anyone what it bought.

**`insideSide`'s docstring was wrong and is corrected in place.** It claimed the live
derivation *"stays right through a turn rather than being fixed at the moment the couple
formed."* That reasoning is sound for a couple the placements reveal and exactly backwards for
a hold a figure imposes — where the grip persisting through the turn is the entire point of the
call.

🔴 **This makes the *other* 08-23 defect more visible, not less.** Once the belle's arm stops
teleporting to the other side, her joined arm has to genuinely wind through 180° over her own
head — which is the pose Ryan asked for in the same report (*"an upside down L with the
invisible upper arm and the forearm then is horizontal over the head"*) and which nothing poses
yet. `TrackedArms.arch` remains reported-and-undrawn.

**It also does not touch the head.** A sweep of the cast shows **every** character's forearm
enters their own head sphere once the arm raises inward past roughly horizontal — Ember's
shoulder sits 0.022 outside her own head with 0.935 of arm on it; Myco's 0.140 with 0.350.
Nothing in `src/dance/` checks a dancer's arm against their own `parts`; every consumer of
that field is pairwise. That is a separate decision and is not made here.
