# ADR-0037: The figure is sized to the accommodation drawn, and a pair who let go are not held to a handhold's width
- Status: Accepted
- Date: 2026-08-21
- Deciders: Ryan, Claude
- Supersedes: [ADR-0030](0030-the-arch-clearance-is-measured-from-the-worse-accommodation.md)

## Context

[ADR-0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md) gave a pair who cannot
make an arch two answers, drawn at even odds per execution: **reshape** or **break**.
[ADR-0030](0030-the-arch-clearance-is-measured-from-the-worse-accommodation.md) then sized the
*figure* to the **worse** of the two, with a reason that was sound at the time — the motions were
built before the coin was flipped, so the bow had to hold either way.

The cost was invisible until the two were measured apart:

| accommodation | room it needs, as a fraction of the couple's width |
|---|---|
| **reshape** | **0.193** — the joined hand rides high above the crown, where a head is narrow |
| **break** | **0.951** — the hand never gets up, so it sits low, where a head is widest |

**Five times.** Every California Twirl was danced with a bow for a break, and the pair reshape half
the time.

And [ADR-0036](0036-the-arch-clearance-carries-its-own-margin.md)'s guard had just turned up a
pair for whom **neither** fits: Myco with Sprout wants 1.62 of their handholding width under either
accommodation, which square-one cannot deliver at any bow and silently answers with its cap. Ryan:

> so do what we did with the california twirl — sometimes myco gets smaller and sprout gets
> bigger, and sometimes they just reach as far as possible but don't connect — **make this a rule**

## Decision

**One rule, in three parts, in `sizeArch`.**

1. **Draw first, then build.** The accommodation for each execution is drawn *before* the motions
   are, and the figure for that execution is sized to it — through square-one's `ShapeAt` (its
   ADR-0025). The pose reads the same draw rather than making a second one.
2. **Floor it at the hands-free clearance.** `archClearance` measures what must fit at the
   **hand's height**, and a reshape's hand costs almost nothing — so unfloored, a reshaped Twirl
   passed *closer* than a Partner Trade out of the same two people. **A hold cannot make a pass
   cheaper than no hold.**
3. **When neither accommodation fits, the pair let go — and a pair who have let go are not held to
   a handhold's width.** They stand at **twice** the room they need, which is exactly where the
   beau's arc delivers it **on its own radius, with no bow at all**
   ([ADR-0014](https://github.com/randallard/square-one)'s relationship, used the other way round).

Part 3 is the one Ryan asked for, and part 2 is what part 1 exposed.

## Alternatives considered

- **Keep sizing to the worse of the two** (ADR-0030). Its reason has been removed rather than
  refuted: the coin can now be flipped before the figure is built. Kept, it charges every
  reshaping pair for a break.
- **Widen the couple under a reshape too.** Under a reshape they are *holding on*, and the
  handhold is what sets a couple's width. Widening it would draw two people holding hands at
  arm's length and beyond.
- **Pick a target ratio and stand at `wanted / ratio`.** What I reached for first, and it is a
  fitted constant — the thing square-one's ADR-0023 had just finished calling out. `2 × wanted`
  is derived: it is the width at which the arc's own radius *is* the clearance.
- **Refuse to dance the call.** Honest and useless: the caller called it, and a square-dance
  engine that declines figures for mismatched pairs is a worse answer than one that dances them
  further apart.

## Consequences

- **A reshaped Twirl passes at 0.685 of the couple's width instead of 0.951**, so the beau bows
  markedly less on half of all executions — and the figure now differs between two Twirls in a
  row, which is what ADR-0028's per-execution draw always claimed and could not deliver.
- **Both mismatched pairs can dance an arch.** Myco/Sprout stand 2.393 world units apart and
  Ember/Sprout 1.160, both at a ratio of exactly **0.500** — the no-bow case, by construction.
- 🔴 **`archClearance` reporting less than the bodies need was a live defect, not a rounding
  matter**, and it was hidden by ADR-0030: the break always bound, so the reshape's too-small
  number never reached a figure. **Taking the worst of two answers conceals a wrong one.**
- 🔴 **`sizeArch` exists because this logic had been duplicated into a test helper three times and
  was wrong there twice** — once omitting the arch clearance, once omitting its floor. A helper
  that drives the performance *almost* like the scene measures a figure nobody dances. There is
  one implementation now and the suite calls it.
- 🔴 **A sequence is non-deterministic now**, deliberately. The suite fixes the draw; the scene
  does not, which is the point.
- **Promotion condition:** part 3 widens a couple for one call. If a figure ever needs the pair to
  *arrive* at a different width — a call that legitimately changes the formation, which Star Thru
  is — that is a formation change and not an accommodation, and it belongs with S2.
