# ADR-0023: The bodies bound the handhold, and the square grows to fit them
- Status: Superseded by [ADR-0025](0025-the-joined-hands-hang-between-the-shoulders.md)
- Date: 2026-08-17
- Deciders: Ryan, Claude

## Context

Supersedes [ADR-0022](0022-a-couples-handhold-is-solved-for-the-pair.md), which solved a
couple's handhold as three numbers derived from the two bodies. Everything that ADR decided
about *whose* job the accommodation is still holds and is restated below. What stopped holding
is its arithmetic about **where a body actually is**.

ADR-0022 knew a torso as one number, `body.radius`, and used it in exactly one place: as a
floor on the stance, `beauRadius + belleRadius` — the distance at which two torsos stand
**flush**. Nothing anywhere constrained where the *hold* went. Both gaps are invisible on the
shipped cast, whose dancers are close in size and stand far enough apart that neither bound
binds, and both are catastrophic off it.

Ryan found it the first time the debug scene's `bodies` casts were watched with `go home`:

> note with different body sizes go home should update so that the handhold is between the beau
> and the belle as comfortably as possible, right? never pushed into the body of either — we
> want the square to accommodate in this case

Measured on the two casts the scene ships for exactly this purpose:

| cast | stance | torso gap | the hold | beau reach |
|---|---|---|---|---|
| `default` | 1.140 | 0.620 | clears both | 68% |
| `mixed` | **0.820** | 0.120 | **0.140 inside the beau's torso** | **100.000%** |
| `max` | 1.200 | **0.000 — flush** | **0.240 inside the belle's torso** | 86% |

Three things were wrong and they compound:

1. **The hold was never checked against a body at all.** Its position came from shoulder
   offsets and reach, neither of which knows where a chest is, so on a mismatched pair the
   preference walked it into the wider dancer.
2. **The square shrank as the bodies grew.** `mixed` stood *narrower than the default cast*
   while being twice the size, because the stance was capped by how far the beau could reach —
   and the more the hold slid into him, the less he could reach, which tightened the cap.
3. **The stance floor was not the pair's clearance.** The repo already had the right number:
   [ADR-0012](0012-pair-clearance-from-the-3d-silhouette.md)'s `lateralClearance` over both
   dancers' rigid parts, which is height-aware and counts heads. Touch hands ignored it and
   used a sum of radii that permits flush contact and cannot see a head at all.

## Decision

**A body is a constraint on the handhold, not just an input to it. The stance is floored by
the pair's own ADR-0012 clearance, and the hold is clamped into the corridor between the two
bodies — and where those two demands conflict with a preference, the bodies win.**

Concretely, in `touchHold`:

- **Stance floor** is `lateralClearance(beau.parts, belle.parts) + PERSONAL_SPACE`, the same
  height-aware clearance the rest of the square uses, so a head wider than its torso counts and
  a head at a height nobody is near does not. Never again a sum of radii.
- **And at least a corridor**: at the hold's own height, both bodies' cross-sections plus a
  hand's width of daylight each side. A pair that merely clears each other can still have
  nowhere to *put* the hands.
- **The hold is clamped into that corridor.** ADR-0022's lateral rule — her arm hangs, he
  covers the daylight — decides where the hold *wants* to be; the clamp decides where it may
  be. A hold inside a dancer is not a hold, and no opinion about which dancer reaches can buy
  one.
- **The height band is solved in 3D.** A hand already reaching sideways has less than its whole
  arm left to reach down with, so the reachable band is re-cut once the across is known, as a
  bounded fixed point. Without this, four shipped pairs overshot their arms by 0.06% the moment
  the hold stopped being free to sit exactly under a shoulder.

**Narrowest, not roomiest**, is what "as comfortably as possible" resolves to: widening past
the corridor makes both dancers reach further for nothing, so the couple stands as close as
their bodies allow and only wider when their shoulders ask for it.

Everything ADR-0022 decided about the *opinion* is unchanged and carries forward: the height is
the belle's waist, the joined hands sit off the midpoint under her own inside shoulder, and the
beau covers the daylight because that is what taking his side means.

## Alternatives considered

- **Keep the stance and just push the hold out of the body.** Cheaper, and it produces a couple
  standing flush with their hands wedged between them. The ask was that the square accommodate,
  and a square that cannot move cannot.
- **Give the belle back some of the daylight when the beau is over-extended.** Already in
  ADR-0022 as the shortage case, and it does not help here: on `mixed` the beau is at 100% of
  his reach *because his own belly is in the way*, and no redistribution between the two of them
  moves his own body.
- **A tolerance — allow the hands a small overlap into a torso.** One tuned constant to decide
  how far inside somebody a hand may be. This solve has spent two days deleting exactly that
  kind of number.

## Consequences

- The default cast is **bit-for-bit unchanged** — stance 1.140, hands 0.713, off-mid 0.210,
  reaches 68%/69% — and a test pins those four numbers so this cannot quietly move the pose Ryan
  signed off. That is the point of the change being a floor and a clamp: it binds only where it
  was already wrong.
- `mixed` now stands at 1.070 with the hold tangent to the beau's surface, and `max` at 1.640
  with 0.276/0.000 of daylight. Nobody's hand is inside anybody on any cast, asserted both ways
  round.
- **A dancer can still be at 100% of their reach**, and on `mixed` the beau is. That is honest:
  a torso wider than an arm is long forces a straight arm, and the alternative is standing
  closer, which means standing inside him. `upperArmStrain` still reads out anything past it.
- `ArmMetrics` now carries the body's rigid parts in world height, so the arm layer can ask
  where a body is instead of approximating it with a radius. `bodyRadius` stays for the callers
  that genuinely want "how wide is the middle of them".
- The solve is now iterative (bounded at four passes, settling in two on every cast in the
  repo) rather than a single pass. It is still pure, deterministic and symmetric in the pair.
- **Promotion condition:** the corridor is measured side-to-side only, because that is the axis
  a square's spacing lives on. If joined hands ever move *forward* of the bodies — ADR-0022's
  own deferred alternative, which is where real hands sit — the clearance question becomes 3D
  and this decision needs revisiting rather than extending.
