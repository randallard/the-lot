# ADR-0030: The arch clearance is measured from the worse accommodation, and passed as a number
- Status: **Superseded by [ADR-0037](0037-the-figure-is-sized-to-the-accommodation-drawn.md)** — the figure is sized to the accommodation actually drawn. Taking the worse of the two charged every reshaping pair for a break (0.951 of the couple's width against 0.193) and concealed a reshape clearance that was below what the bodies need.
- Date: 2026-08-19
- Deciders: Ryan, Claude

## Context

[ADR-0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md) drew the arch and found
that on the shipped cast the pair cannot make one — they either reshape their torsos or let the
hold break, drawn at random per execution. That fixed the *hands*. It did not fix the *pass*.
Ryan, watching a break:

> the beau's hand clips through the belle's head — it shouldn't push into the beau's own head
> either though

square-one has no bodies by its ADR-0002, and its Twirl passes the two dancers at half the
couple's width because that is what the figure gives. This module has the bodies, and the numbers
are not close:

| what has to fit through the gap at the pass | wants (world units) |
|---|---|
| two torsos, side by side | 0.520 |
| two heads | 0.710 |
| two heads with a **joined hand** between them | **1.084** |
| — what the figure delivered | 0.570 |

square-one's [ADR-0018](https://github.com/randallard/square-one/blob/main/docs/adr/0018-the-arch-needs-a-hands-room-between-two-heads.md) answers the choreography half: a couple
carries `archClearance` and the beau's arc bows out to meet it. **This is the module that has to
produce that number**, and producing it needs two decisions the engine cannot make.

**Which accommodation?** The figure is sized once, before the coin is flipped, and the two
accommodations put the hands in different places at different heights.

**Whose hand, at whose head?** The joined hands sit at the pair's midpoint, so each hand has to
clear **both** dancers' cross-sections, and a head is not a cylinder — `sideExtentAt` narrows a
sphere toward its poles, so a hand held high over a crown costs less than one held at eye level.

## Decision

**`archClearance(beau, belle, beauShape, belleShape, width)` returns the widest gap either
accommodation needs, measured at the heights that accommodation actually puts the hands at.**

- It plans **both** `ARCH_BREAK` and `ARCH_RESHAPE`, grows each dancer by that plan's own body
  delta, and takes the maximum over both plans and both hand heights of
  `2 × (widest cross-section at that height + hand radius)`.
- Half the separation each way, because the hands are at the midpoint and the requirement is
  symmetric.
- **The worse of the two, because the figure is sized before the draw.** A break is usually the
  binding one: its beau never gets his hand up, so it sits lower, where a head is wider.
- `DanceFloor` divides by the frame scale and passes it to `useDancePerformance` as
  `archClearance` — the same seam `coupleWidth` already uses, in the same place.

## Alternatives considered

- **Size the figure after the draw.** Honest, and it would give the reshape a tighter pass. It
  means re-deriving the whole performance mid-scene when a span begins, and the motions are
  memoised per figure — the coin would be re-flipping the choreography, not just the bodies.
- **Measure at the standing hold's height instead of the arch's.** Cheaper and wrong in the
  direction that matters: the standing hold is at the belle's waist, and the clip Ryan saw is at
  head height.
- **Ask for the torso clearance and let the hands look after themselves.** That is 0.520, and it
  is the number that produced the clip. The joined hand belongs to neither dancer, so neither
  dancer's own width accounts for it.
- **Fix it by raising the arch.** There is no height left — ADR-0028's whole premise is that this
  cast cannot reach the crown as it is.

## Consequences

- **The clip is gone, in both accommodations**, and the beau's own head is clear too: in the
  reshape his hand was grazing at 0.001 and now clears by 0.194. The pass goes **0.570 → 1.314**
  world units and the pair never come closer than the 1.140 they stand at.
- 🔴 **The beau's arc is now much wider — it peaks at 1.152× the couple's width, where it peaked
  at 0.5× — and he covers it in the same 4 beats.** Whether that reads as *sprinting* is the one
  thing only a render can decide, and it is the open watch on this chunk.
- 🔴 **The hands-free `clearance` is deliberately still not passed.** The same seam would fix the
  head overlap pinned since square-one's ADR-0014 — 0.570 delivered against 0.710 wanted — and it
  would also bow a Partner Trade that Ryan has already watched and accepted. That is a look, not a
  number, and it is owed rather than taken. Flagged where a reader will hit it, on
  `useDancePerformance`'s `archClearance` doc.
- **`armMetrics` is called once per accommodation per resize**, inside a `useMemo` keyed on the
  shapes and the hold. This is the module whose standing idiom is that a frame allocates nothing;
  this is not per frame.
- **Promotion condition:** if a figure ever needs its clearance *during* the call rather than
  before it — a pass whose geometry changes as the dancers reshape — then a single number computed
  up front is the wrong shape and the engine needs a callback rather than a scalar.
