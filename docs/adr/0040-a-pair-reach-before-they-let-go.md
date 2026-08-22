# ADR-0040: A pair reach with the undrawn upper arm before they let go
- Status: Accepted
- Date: 2026-08-22
- Deciders: Ryan, Claude
- Extends: [ADR-0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md), [ADR-0037](0037-the-figure-is-sized-to-the-accommodation-drawn.md)

## Context

[ADR-0037](0037-the-figure-is-sized-to-the-accommodation-drawn.md) part 3 gave a pair who can make
no arch a terminal answer: **let go and stand at twice the room they need**, where the beau's arc
delivers the clearance on its own radius with no bow at all.

With the cast picker in `#dance` it became possible to ask that of every pairing, and the answer
came back for **nine of the twenty orderings** of the shipped cast — including Myco with Sprout, an
adult and a child, who were pushed from a 0.737 handholding width out to 1.572. Ryan:

> no, that doesn't make any sense. Myco and sprout should be just fine… they should not have to
> stand wide

[ADR-0039](0039-a-hand-is-charged-against-the-other-dancer.md) took one conflation out of the
measurement and moved nine to... nine. The number was honest and the outcome barely changed, which
said the remaining cause was not in `archClearance`.

**It was not in the arch at all.** Myco and Sprout want **1.010 of their entire handholding width**
to pass each other *hands free, with no arch involved* — so a Partner Trade fails for them on the
same ground. `touchHold` solves the couple's standing width from the handhold, and a short-armed
pair therefore stands closer together than their own bodies can walk past.

Two levers were measured against that:

| lever | rescues | cost on Myco/Sprout |
|---|---|---|
| **head radius** (shrink the belle's, lowering her crown by twice the change) | 4 of 9 | **never** — it cannot widen the couple |
| **upper arm** (lengthen the undrawn shoulder-to-elbow segment) | **7 of 9** | **0.030** |

Ryan: *"can we have last resort be extending the upper arm?"*

## Decision

**When neither accommodation can be delivered at the couple's own width, both dancers lengthen the
undrawn upper arm by the least the shape editor's own slider allows, until the figure fits. Only if
no length within the editor's bounds is enough do they let go and stand at twice the room
(ADR-0037 part 3).**

`sizeArch` returns the extension as `ArchSizing.armDelta`, and `DanceFloor` poses with it — eased
in by the same `blend` as the torso reshape, so an arm stretches rather than pops.

Three properties are the decision rather than the implementation:

1. **It buys reach one-for-one and distorts nothing that is drawn.** `computePositions` builds a
   dancer as `elbowY = bodyTop - upperArmSpacing`, so `handReach = spacing + forearm.height +
   handForearmGap + handRadius`. Extending by `e` adds exactly `e` of reach and leaves
   `forearmSpan` — the part with a mesh on it — untouched. What lengthens is the gap this cast
   does not render.
2. **It is the only lever that widens the couple**, because `touchHold` solves the standing width
   from how far the two can reach across to each other. That is what answers a pair whose *bodies*
   will not pass, which no amount of reshaping can: a torso trade moves shoulders vertically.
3. **It belongs to the pair, not to the draw.** The extension is solved so that **both**
   accommodations fit, so the couple stand in the same place whichever way the coin lands and only
   the torsos and the bow differ between two Twirls.

**This extends ADR-0037 rather than superseding it.** Part 3's reasoning is untouched and its rule
still runs — it is now the *second* thing tried instead of the first, and it is still the only
answer for a pair no arm can rescue.

## Alternatives considered

- **The head lever.** Shrinking the belle's head lowers her crown by twice the change without
  moving her shoulder, which is exactly the axis a torso trade cannot move. It rescues four of the
  nine and **cannot** rescue Myco with Sprout, because it does nothing about the couple's width.
  Measured and rejected on that. Worth recording: *trading* it — the beau's head growing as the
  belle's shrinks, the way torsos do — costs **more** every time (0.086 → 0.097, 0.144 → 0.156,
  0.175 → 0.187), because growing the beau's head widens the thing his partner's hand has to get
  past. **The head lever is one-sided or it is worse than nothing**, which is a real difference
  from the torso, where growing the beau helps.
- **Make it a third accommodation.** ADR-0028 is explicit that a hold added later must answer
  *which of these two* rather than inventing a third silent one. This is not a third way to hold
  hands; it is what a pair do when neither of the two can be danced where they are standing, and
  the draw survives it intact.
- **Solve the extension per draw.** Cheaper — size the arm to the accommodation actually drawn —
  and it puts the per-execution difference into where the couple *stand*, which a watcher reads as
  the dance changing rather than the dancers. The draw belongs in the torsos and the bow.
- **Float the join above the belle's crown.** Would rescue the two this cannot, and it is a
  different decision about what an arch *is* — see below.

## Consequences

- **Seven of the nine pairings keep hold**, and the widening is small: Myco with Sprout stand at
  **0.774 instead of 1.572**, a 5% move where the old answer was 113%. The shipped cast now goes
  11 dancing at their own width, 7 reaching, 2 letting go.
- **Nothing changes for a pair who can already dance it.** `armDelta` is `0` on all eleven, the
  helpers return their argument unchanged, and no per-frame `armMetrics` is paid.
- 🔴 **The couple's width is now a per-execution fact for a reaching pair**, delivered through
  square-one's `ShapeAt` (its ADR-0025) like the clearance beside it. Two different pairs dancing
  the same call stand in different places, which was already true, and now a *reaching* pair stand
  somewhere their own handhold would not have put them.
- **It fixed the let-go pose on the way past.** `DanceFloor` planned the arch at `hold.width`
  whatever `sizeArch` returned, so a pair standing at *twice* the room had their arms solved for a
  separation they were not standing at. The plan is now made at the width they actually dance at in
  every branch, which the reaching case forced and the let-go case had quietly needed since
  ADR-0037.
- 🔴 **The two it cannot rescue are both Ember as beau**, and they say what the next decision is.
  The join is pinned to `crownOf(belle) + headroom` — the **lowest** height that clears her — and on
  a beau this much taller that is level with his own head. Longer arms let both of them reach
  higher but do not move the join, so his head stays beside it. **Promotion condition:** if the
  join is ever allowed to rise above the belle's crown to clear a tall beau, this lever's
  bound stops being the reason those two let go, and the ordering here should be re-measured.
- 🔴 **And the real cause is still upstream and untouched.** `touchHold` never floors the couple's
  width at the room their bodies need to pass, so a short-armed pair is *born* too narrow and this
  decision widens them one call at a time. Flooring the width would be a decision about what a
  couple's width is, beside ADR-0027, and would make this lever's job smaller rather than remove
  it.
