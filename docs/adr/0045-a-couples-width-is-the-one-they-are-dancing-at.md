# ADR-0045: A couple's width is the one they are dancing at, not the one they would rest at
- Status: Accepted
- Date: 2026-08-22
- Deciders: Ryan, Claude
- Extends: [ADR-0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md), [ADR-0040](0040-a-pair-reach-before-they-let-go.md)

## Context

`TouchHold.width` means *how far apart these two are standing*. Everything downstream reads it that
way: `standingAsCouple` asks whether the pair's live separation matches it, `touchReach` divides it
to find how far across each arm goes, and the debug panel prints it as `stance`.

[ADR-0040](0040-a-pair-reach-before-they-let-go.md) gave that number a **second meaning** and
nobody noticed. A pair who cannot dance an arch at their own stance lengthen the undrawn upper arm
until they can — and then dance the call at `ArchSizing.width`, which is wider. Their resting
handhold goes on reporting the narrower number, because it was solved on the arms they have at rest.

So the floor placed the pair at one width and asked `standingAsCouple` about another. Past 35% of
the stance — `TOUCH_TOLERANCE` — the predicate answers *"these two are not a couple"*, the hold is
never posed, and both dancers' arms hang. Measured across the shipped cast, **five of the twenty
orderings lost the hold entirely at beat 0**: Ember with the player, with Myco and with Ryan, and
the player with Sprout in both directions. The pairs whose reach was small enough to stay inside the
tolerance kept it, which is why it read as intermittent rather than broken.

Ryan, playing with the cast picker:

> myco and ember look fine but not the player and ember and not myco and sprout … the more I play
> around with it it looks like this is just kind of flakey with the way it chooses between
> characters and home and positions — maybe we have too many states stacking here

**It is not stacked state and it is not flakey.** It is deterministic, and it is one number that
quietly became two.

## Decision

**The hold a pair pose to is solved on the bodies they are dancing the call with.**

When `ArchSizing.armDelta` is zero — every pair who can dance the figure at their own stance — that
is the resting `touchHold`, unchanged. When they reached, the hold is re-solved on the lengthened
arms, and it is that hold's `width` every consumer sees.

🔑 **On a reaching pair this comes out equal to `ArchSizing.width` by construction.** `reachForIt`
chooses the extension *by* solving `touchHold` on those same lengthened arms and asking whether the
figure fits at the width it returns. So the stance, the figure's width and the engine's placement
stop being three numbers and go back to being three readings of one.

## Alternatives considered

- **Widen `TOUCH_TOLERANCE`.** It would have hidden this pairing-by-pairing and left the predicate
  comparing two different quantities — and the tolerance exists for a reason of its own (a Trade
  bows the pair off their radius, and a couple mid-call is a couple). Loosening a tolerance to
  absorb a wrong number is how you lose the tolerance's meaning as well as the number's.
- **Pass the danced width to `standingAsCouple` at the call site.** The one-line version. It fixes
  the predicate and leaves `touchReach` — and the panel's `stance` line, and anything added later —
  still reading a width the pair are not standing at. The ambiguity was the defect; patching one
  reader keeps it.
- **Re-solve the hold every frame from the live separation.** Then the hold chases the figure: a
  Trade bows the pair off their radius and the hands would drift with the bow, which is the grip
  drift ADR-0027's fixed point exists to prevent. It is solved once per execution, like the
  accommodation and the plan beside it.

## Consequences

- **All twenty orderings hold hands at beat 0, in both figures.** Pinned by a test that drives the
  real pipeline — square-one's placement, the frame's conversion, the predicate — rather than
  asserting on geometry, because the defect was in the seam between them.
- 🔴 **The happy-path test would pass without this change**, so it is not the guard. The guard is
  its counter-assertion: asking the predicate with the **resting** width loses exactly those five
  orderings, and every one of them is a pair who reached. That pins the distinction rather than the
  outcome.
- **`under.stance` joins the plan and the accommodation as per-execution state**, solved in the same
  block, from the same reached bodies. One more field on a ref that already holds four — and the
  case for it is that it removes a disagreement rather than adding a state to keep in sync.
- 🔴 **Three of today's five findings are the same shape**: `PERSONAL_SPACE` claiming to be the
  frame's margin, `archLateral` claiming the arch sits above both crowns, and now `TouchHold.width`
  claiming to be where the pair stand. **A name keeps its old meaning while the thing it names
  moves.** No tooling catches it; only asking the question on a case the old meaning cannot cover,
  which on this cast means a pairing nobody had been able to stand up until the picker existed.
- **Promotion condition:** the stance is re-solved for the *arch's* reach because that is the only
  thing today that moves a couple off their resting width. Any future accommodation that changes
  where the pair stand has to land in the same place, or this comes apart again in the same way.
