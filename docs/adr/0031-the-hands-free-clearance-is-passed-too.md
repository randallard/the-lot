# ADR-0031: The hands-free clearance is passed too, so a Trade bows like a Twirl does
- Status: Accepted
- Date: 2026-08-21
- Deciders: Ryan, Claude

## Context

[ADR-0030](0030-the-arch-clearance-is-measured-from-the-worse-accommodation.md) measured what has
to fit through the gap when a couple pass **under an arch** — two heads and a joined hand between
them — and passed it to square-one, whose `laneForClearance` bows the beau's arc out to deliver
it. A California Twirl has cleared its bodies since.

The *hands-free* clearance was measured by this module long before that, for the frame scale, and
was deliberately **not** passed. The note on `useDancePerformance` said why:

> The engine would bow a Partner Trade's arc out for it too — which would fix the head overlap
> pinned since ADR-0014 and would also change a figure Ryan has already watched and accepted.
> That is a look, not a number, and it is owed rather than taken.

That was the right call to defer and the wrong state to stay in, because a Trade and a Twirl are
the **same two paths** (square-one's ADR-0017) and differ only in what is in the gap. Passing one
clearance and not the other meant one of the two bowed. Ryan took the look:

> I looked at `#dance=two-trades` and it's still too tight — if we're generalizing correctly it
> should be like `#dance=two-twirls`

## Decision

**`DanceFloor` measures the couple's hands-free clearance and passes it, as it already does the
arch one.** `lateralClearance` over the two rigid silhouettes — ADR-0012's height-aware
measurement, the same instrument the frame scale uses, which counts **heads** and not only torsos.

Both numbers are passed, and both are needed: they are the same two bodies with different things
in the gap, and square-one picks by the figure's hold.

## Alternatives considered

- **Pass the torso clearance instead of the height-aware one.** Cheaper bow, and wrong by the part
  of the body most likely to collide — Myco's head is 0.49 where his torso is 0.30. ADR-0012
  settled this once already for the frame scale.
- **Keep withholding it and widen the frame scale instead.** The status quo. It works, and it is
  what square-one's ADR-0020 calls *whole-square breathing done coarsely* — one wide pair pushes
  everybody apart, in every call, whether or not they are in it.
- **Give the Trade the arch clearance too, so the two figures look identical.** The literal reading
  of *"it should be like two-twirls"*, and it would draw a hands-free Trade swinging as wide as a
  figure with a hand overhead. The two calls should bow *differently*, out of the same bodies —
  that difference is the whole of ADR-0018.

## Consequences

- **The head overlap pinned here since square-one's ADR-0014 is closed.** On the shipped cast the
  closest approach over a Trade goes **0.554 → 0.709** world units against the 0.710 its heads
  want. Three tests in `dance-performance.test.ts` that asserted the shortfall have been rewritten
  to assert the clearance; one of them said of itself that it was written *"so this test fails
  loudly the day somebody fixes it properly."*
- **And the finding it was pinned against is reversed.** That suite claimed wide bodies were
  structurally unable to dance a Trade at handholding distance — *"no amount of work on this side
  fixes that"* — which was true of this side and not of the figure. `cast([0.6, 0.1])` goes
  0.535 → 0.891 against 0.894 wanted; `cast([0.6, 0.6])` goes 0.819 → 1.197 against 1.200.
- 🔴 **The Trade bows less than the Twirl, and that is correct rather than incomplete.** Same pair:
  the beau's arc peaks at 0.710 world for a Trade and 1.315 for a Twirl, and his path over the
  four beats runs 1.789 (no bodies) → 2.033 (Trade) → 3.387 (Twirl). A Trade that matched the
  Twirl would mean the hand in the gap had stopped counting.
- 🔴 **The `#dance=two-twirls` sprint watch now has a second subject.** The beau covers 14% more
  ground in a Trade than he did. That is far short of the Twirl's 89%, so if the Twirl reads as
  acceptable this should too — but it is a look, and it is the one this decision is waiting on.
- 🔴 **The frame scale still derives from the engine's fixed lane** (`minScaleForGap`, dividing by
  a hand-copied `ENGINE_LANE_OFFSET`). square-one's ADR-0020 makes the pair calls able to hold
  their own accommodation, which would let that stop growing the whole square — a separate change,
  a separate watch, and it needs a square-one tag first.
- **Promotion condition:** the two clearances are passed as absolute world measurements divided by
  the frame scale. If the scale ever stops being uniform across the square, both crossings need
  revisiting together rather than one at a time — which is the mistake this ADR is repairing.
