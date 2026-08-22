# ADR-0036: The arch clearance carries its own margin, and must stay inside the couple's width
- Status: Accepted
- Date: 2026-08-21
- Deciders: Ryan, Claude

## Context

[ADR-0035](0035-the-square-does-not-grow-for-its-widest-pair.md) moved `SCALE_MARGIN` off the
frame and onto the clearances this module measures, renaming it `CLEARANCE_MARGIN`. It applied it
to **both** numbers crossing the seam — the hands-free clearance and the arch clearance.

Ryan, on the next look:

> most moves look great — almost all — all except california twirl … the beau is going way too far
> out now

He was right, and the mechanism is exact. square-one bows the beau's arc out to meet
`archClearance`, and at **both ends** of the call the two dancers are exactly the couple's width
apart whatever the bow does in between — so the minimum separation only ever *approaches* that
width, and a request at or above it cannot be delivered at any bow (its ADR-0018). Rather than
orbit forever, `laneForClearance` caps the bow at one couple-width and returns it.

| | arch ÷ couple width |
|---|---|
| what ADR-0018 measured and Ryan accepted | **0.951** — inside the cap, only just |
| with `CLEARANCE_MARGIN` applied | **1.046** — outside it: capped, maximum bow |

🔴 **The ratio is scale-invariant** — both are world measurements over the same frame — so
ADR-0035's tighter square did *not* cause this. It was the margin alone, and 0.951 leaves so
little headroom that a 10% margin was more than enough to spend it.

## Decision

**`CLEARANCE_MARGIN` applies to the hands-free clearance and not to the arch clearance.**

The distinction is what each number already contains, not a preference:

- `lateralClearance` returns the distance at which nothing **touches**, which is the distance at
  which everything touches. It has no margin, and that is what `CLEARANCE_MARGIN` is for.
- `archClearance` carries margin three times over before it leaves this module: `headroom` keeps a
  hand's width of daylight above the crown, `ARCH_OVERSHOOT` reshapes *"a little more than
  necessary"* ([ADR-0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md)), and it
  takes the **worse** of the two accommodations ([ADR-0030](0030-the-arch-clearance-is-measured-from-the-worse-accommodation.md)).

**The margin belongs to the measurement that lacks one.**

**And a satisfiability check goes in the suite**, because the engine cannot make one: a request it
cannot meet is not an error there, it is the cap. `arch.test.ts` now asserts the shipped default
pairing stays under its couple's width.

## Alternatives considered

- **Apply a smaller margin to the arch.** It would fit today and it is fitting a number to one
  cast, on a quantity with 4.9% of headroom. The next body edit spends it again.
- **Have square-one refuse or report an unsatisfiable clearance.** The better long-term answer,
  and it changes the engine's API for a case its own ADR-0018 documents. Recorded there instead,
  on the field a consumer reads (square-one `d575bc8`), and a consumer-side test is what actually
  catches it.
- **Raise the cap.** ADR-0018 measured what happens without one: the beau orbited at **73 times**
  the couple's width. The cap is not a tuning knob.

## Consequences

- **The California Twirl is back to the figure Ryan accepted this morning** — arch/width 0.951,
  the arc peaking at 1.152× the couple's width rather than at the cap.
- 🔴 **The guard immediately found a second, older instance, and it is still open.** Myco with
  Sprout — an adult and a child — wants **1.62** of their handholding width, and has been capped
  in silence since the field existed. ADR-0018 measured **one** pairing and nobody checked the
  rest. It is pinned in `arch.test.ts` with the ratio, in the style this repo uses for findings
  it cannot fix yet.
- 🔴 **The cause of that one is structural.** A couple's width comes from the **handhold**, so a
  short-armed pair stands narrow — while two heads with a hand between them want as much room as
  anyone's. The narrower the couple, the further out of reach their arch. Fixing it means letting
  a couple stand wider for the call, which changes what a couple *is*, and that is Ryan's decision
  rather than a tuning pass.
- **An unsatisfiable clearance looks exactly like a working figure.** That is the sibling of
  ADR-0020's *"a shape a call does not read is silently ignored"*, and between them they are the
  standing hazard of this seam: **measure the figure, never the argument.** Both are now warned
  about at the fields themselves.
