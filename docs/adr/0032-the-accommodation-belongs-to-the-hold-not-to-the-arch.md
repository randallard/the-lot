# ADR-0032: The accommodation belongs to the hold, not to the arch
- Status: Accepted
- Date: 2026-08-21
- Deciders: Ryan, Claude

## Context

[ADR-0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md) decided what a pair does
when their bodies cannot make the arch a California Twirl asks for: they **reshape** or they
**break**, drawn at even odds per execution. It is one of the few decisions in this repo that came
from Ryan as a shape rather than as a bug —

> I want two options that happen randomly each time a move like this is executed

— and all of it landed in `arch.ts`, because the arch was the first hold a pair could physically
fail to make.

It is not the only one. Ryan, 2026-08-21, after square-one's ADR-0020 made every call sizeable:

> I want to make sure we remember the two different styles of accommodation for the reach in
> california twirl

The question those two styles answer is not about arches. It is *these two people cannot reach the
thing the call says they are holding — what do they do?* Two other holds ask it and neither has an
answer:

- **`forearm`** (Allemande Left). `DanceFloor` finds the accommodation with
  `g.grip === "arch"`, so a forearm grip gets none. `gripPose` poses the hold and nothing asks
  whether two dancers of different arm lengths can reach it.
- **the standing touch-hands handhold**, and `fist-bump.ts`'s `gripHeight` still carries the
  deferred note that *"past a big enough height difference the taller dancer does nearly all the
  accommodating."* ADR-0028 said that fact had arrived somewhere it could not be deferred. It is
  still deferred everywhere else.

A third hold arriving would find the machinery under a call it has nothing to do with, and the
cheap thing to write would be a single silent fallback.

## Decision

**The two styles, the draw, and the body reshape move to `accommodation.ts`, and `arch.ts` builds
on them.** `Accommodation`, `RESHAPE`, `BREAK`, `ACCOMMODATIONS`, `OVERSHOOT`, `BodyDeltas`,
`NO_DELTAS`, `growBody`, `reshapeDeltas` and `drawAccommodation` are hold-agnostic; `planArch`,
`archClearance`, `crownOf`, `reachCeiling` and `archLateral` are the arch's own geometry on top.

The `ARCH_` prefix goes with them: they were never the arch's.

**A hold added later must answer *which of these two* and keep the per-execution draw**, rather
than inventing a third. Neither is the fallback — they are two things dancers of mismatched size
actually do.

The reasoning that makes the reshape a *torso* moves too, because it is about bodies rather than
about arches: `computePositions` hangs head, elbow and hand off `shoulderY = bodyCenterY +
height/2 + radius`, so a height change of `d` moves the whole assembly by `d/2` and changes no arm
length at all.

## Alternatives considered

- **Leave it in `arch.ts` and import from there.** What the first pass did, via a re-export facade.
  Rejected on the second look: a facade keeps the name of the thing that used to own it, and the
  whole point is that it does not. Consumers import from `accommodation` now.
- **Generalise it the day a second hold needs it.** The ordinary rule, and it loses to a specific
  precedent — square-one's `Couple.clearance` sat with a producer, a value and no consumer for two
  days and was silently dropped at a call boundary (its ADR-0019). Here the code already exists and
  is exercised; what is being moved is a *name*, and the cost of moving it later is that a second
  hold gets written against the arch's.
- **Give the two styles to square-one.** It declares the holds. It also has no bodies by its
  ADR-0002, and an accommodation is entirely a fact about bodies. The seam stays where it is: the
  engine says *this hand is joined and raised*, this module decides what happens when it cannot be.

## Consequences

- **Pure refactor, and asserted as one**: 627 tests unchanged, lint and typecheck clean. Nothing
  about the arch's behaviour moved.
- 🔴 **The forearm hold still has no accommodation.** This decision makes the machinery reachable
  and does not apply it. That is the next step, and it pairs with square-one's `gripRadius` — the
  field its ADR-0020 added that nothing supplies, and which is exactly the question *how far apart
  do two joined forearms hold this pair?*
- 🔴 **`NO_DELTAS` and `ACCOMMODATIONS` exist ahead of their consumers**, which is the thing the
  alternatives above warn about. They are two lines each and both are used by the arch's own
  clearance planner; if a second hold does not arrive, they should go.
- **Promotion condition:** if a hold ever needs a *third* style — a step-out, a substitution, a
  refusal to dance the call — that is a new decision and not an addition to this file's union.
  Two is a claim about what dancers do, not a convenient number.
