# ADR-0033: The forearm hold is a reach a pair can fail, and it gets the same two accommodations
- Status: Accepted
- Date: 2026-08-21
- Deciders: Ryan, Claude

## Context

[ADR-0032](0032-the-accommodation-belongs-to-the-hold-not-to-the-arch.md) moved `reshape` and
`break` out from under the arch and said the next step out loud: the **forearm** hold — the
arm-turn family's grip, Allemande Left — had no accommodation, and nothing asked whether two
dancers could reach it.

Nothing had ever asked. `gripHeight` averages the two dancers' resting elbows, `gripPose` places
both forearms at that height, and the note on `gripHeight` has carried the failure mode since the
fist bump:

> past a big enough height difference the real rule is that the *taller* dancer does nearly all
> the accommodating, because an adult can drop their arm to a child's height and the child cannot
> raise theirs to the adult's

A joined forearm lies horizontal at one shared height, so each dancer's elbow has to be **at**
that height — and the elbow hangs off the shoulder on an upper arm of fixed length, so a dancer
can reach a height exactly when `|height − restY| ≤ elbowReach`. Measured on the shipped cast:

| pair | elbows | mean | shortfall |
|---|---|---|---|
| Myco / Ember | 0.620, 1.095 | 0.857 | **0.238** (Ember cannot drop that far) |
| Ember / Sprout | 1.095, 0.650 | 0.873 | **0.222** |
| Myco / Sprout | 0.620, 0.650 | 0.635 | 0.015 |

Two of the three pairings cannot make the hold they were being posed in.

Separately, square-one's [ADR-0020](https://github.com/randallard/square-one) added
`FigureShape.gripRadius` — *how far from the shared pivot two joined forearms hold a dancer* —
and shipped it in v0.3.0 with **nothing supplying it**. That is the same question from the
horizontal side, and this module owns arms.

## Decision

**The forearm hold is planned like the arch: draw an accommodation per execution, and either
reshape or break.** `forearm-hold.ts` holds it, `DanceFloor` finds an `arch` **or** `forearm`
span and plans whichever is live, and the reshape machinery reads `bodyDeltas` without caring
which hold asked.

- **`reshape`** — the dancer whose elbow is **lower** grows and the other shrinks, by the same
  amount. A height change of `d` moves the elbow `d/2` and no arm length at all, so growing the
  lower by `d` and shrinking the higher by `d` closes *both* gaps to the mean by `d/2` and
  **leaves the mean exactly where it was**. The hold is made reachable without being relocated,
  which the arch's version cannot claim.
- **`break`** — nobody changes shape, each forearm goes to the nearest height that dancer's own
  upper arm allows, and the two finish on **different planes**. Two forearms not on the same
  plane are hands that have come apart: the hold breaking as a number rather than a special case,
  exactly as the arch does it with `TouchHold`'s two heights.

**And `gripRadius` is supplied.** Read out of the pose rather than invented: `gripPose` puts the
hand at `contactRadius` from the pivot and walks the forearm back, so the shoulder lands
`forearmSpan − contactRadius` behind it and the body centre a further `restX` back — the dancers
face tangentially in an arm turn, so it is the inside shoulder that is over the pivot. The pair's
figure gets the **mean** of the two.

## Alternatives considered

- **Take the max grip radius rather than the mean.** The habit the clearances teach, and wrong
  here: square-one's ADR-0021 makes `gripRadius` its one unfloored measurement precisely because
  a grip is a *placement* and not room a figure must find. The mean is where two arms of
  different lengths put the pair's shared circle; the per-dancer difference is not lost, because
  `gripPose` places each arm from the pivot independently.
- **Move the shared height instead of the bodies** — lower the hold until both can reach. It is
  one line and it makes the taller dancer's forearm sit far below their elbow with nothing
  holding it there, which is the arch's rejected "lower it and let them through" in a new place.
- **Reuse `planArch` with different inputs.** They look alike and differ where it matters: an
  arch is a *vertical clearance over a head* and has an asymmetric constraint (ADR-0028's finding
  that the belle's side has no `d` in it at all), while this is two elbows converging on their
  own mean and is symmetric. Sharing the code would have meant sharing that asymmetry.

## Consequences

- **Two of the three shipped pairings stop being posed in a hold they cannot make.** Myco/Ember's
  forearms finish 0.238 apart under a break and **0.036** under a reshape; Ember/Sprout 0.245 and
  0.033.
- 🔴 **A reshape does not always close it to zero**, because `growBody` clamps to the shape
  editor's bounds and a pair whose accommodation is clipped there "simply breaks by more" —
  `growBody`'s standing contract since ADR-0028, honoured here by measuring the finished gap back
  from the deltas that survived rather than from the magnitude asked for.
- 🔴 **The first implementation was inverted and looked fine.** It signed the reshape by whose
  *shortfall* was larger rather than by whose *elbow was lower*, which grew the taller dancer and
  drove her elbow further from the line: 0.511 apart where a break gave 0.238. It is pinned now
  by a test asserting a reshape never finishes further apart than a break — **an accommodation
  has to beat the alternative it was chosen over, and nothing else in the suite was comparing
  them.**
- **`gripRadius` comes out *smaller* than square-one's `ORBIT_RADIUS` on every shipped pairing**
  (0.205–0.274 engine against 0.300). That is the unfloored exception doing real work: this cast
  dances a tighter Allemande than the body-agnostic figure, and a floored version would have
  drawn one they cannot reach.
- **`gripHeight` keeps its job and loses its warning.** It still answers *where the hold wants to
  be*, which is the right question for it; whether the pair can get there now has an owner.
- 🔴 **Untried on screen.** `#dance=allemande-left` is a facing pair, and the reshape has never
  been watched on anything but an arch. Whether a torso easing half a unit through an arm turn
  reads as accommodation or as a dancer inflating is a look, not a number.
- **Promotion condition:** the standing touch-hands handhold is the third hold and still has
  none. It differs again — the hands meet in front of the pair rather than between them — so it
  is a third plan, not a third caller of these two.
