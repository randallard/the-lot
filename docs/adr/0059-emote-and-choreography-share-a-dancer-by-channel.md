# ADR-0059: Emote and choreography share a dancer by channel: owned, limited or free

- Status: Accepted
- Date: 2026-10-11
- Deciders: Ryan, Claude

## Context

This is one of six ADRs (0059–0064) that together supersede
[ADR-0010](0010-emote-choreography-channel-contract.md). ADR-0010's reasoning has not stopped
holding — its *shape* has. It carried several decisions in one file, and on 2026-10-11 one of
them (the fold that limited an ungripped arm against a partner) was switched off as an
experiment. The convention has no status for a partly superseded ADR, so the parts that still
stand are restated one per file and the arm fold is left with no ADR at all until the experiment
settles. Nothing here is a new decision; the text is ADR-0010's, brought up to what the code
does today.

Two systems want to write the same dancer every frame. **square-one** drives the choreography:
where each dancer is, which way they face, when a grip engages. townage's `AnimationController`
plays an emote: arms, head, lean, bob, silhouette, eyes, effects. They overlap, and the overlap
matters — a square is a shared coordinate agreement, so one dancer's emote turning them 180°
breaks the formation for everyone, while the same dancer glancing at a partner breaks nothing.

The two naive answers each cause the other's failure. Suspending emotes while dancing kills
expression at exactly the moment the characters are together; letting emotes play through turns
a dancer out of the set. The M4 experiment (`dance/debug-emotes.ts`, watched 2026-07-28) found
the middle ground on screen rather than by argument.

## Decision

Every channel of `ResolvedPose` is one of three kinds, and its kind alone decides what happens
when the choreography and an emote both want it:

- **owned** — the choreography writes it and the emote's contribution is dropped entirely, not
  blended. A facing that is half the formation's and half the emote's is a dancer pointing
  nowhere.
- **limited** — the emote writes it, clipped by however much it trespasses on space that is not
  this dancer's. Constrained, never replaced, and never eased at the boundary.
- **free** — the emote writes it outright; the choreography does not take part.

`CHANNELS` in `src/dance/expression-channels.ts` is the table, and that module is the one place
the classification is applied.

## Alternatives considered

- **A global veto — emotes suspend while a call runs.** Simple and correct, and it makes the
  expression layer pointless during the only time two characters dance together. Still the right
  rule for free-play locomotion (`Player.tsx`).
- **Per-channel blend weights.** Wrong on principle for owned channels. For limited ones a weight
  is a worse clamp: it scales the whole pose toward rest instead of removing only the trespass.
- **Ease a limit closed with proximity** instead of clamping at the boundary. Held as a fallback
  and not built; the watch said a hard clamp reads as intent.
- **Push expression into square-one** so one system owns everything. Rejected by the engine
  boundary: square-one is choreography, and a shared engine would have to model every character
  system to arbitrate.

## Consequences

- Emote authors get a real guarantee for the owned and limited channels: an emote cannot turn a
  dancer out of a square or inflate them through a partner. It can be quietly clipped, which is
  the cost.
- Which channels are which is decided separately: owned in
  [ADR-0061](0061-the-choreography-owns-position-body-facing-and-a-gripped-arm.md), limited in
  [ADR-0060](0060-a-channel-is-limited-exactly-when-it-feeds-the-silhouette.md), free in
  [ADR-0062](0062-head-facing-forward-lean-and-the-bob-are-the-emotes.md).
- 🔴 **The ungripped arm has no ADR.** `CHANNELS` still marks it `limited`, and since 2026-10-11
  the only limit actually applied to it is the floor: the fold against a partner is switched off
  (`FOLD_FREE_ARMS` in `arm-pose.ts`) while the posture work experiments. See
  [journal 2026-10-11 (2)](../journal/2026-10-11-2-one-address-two-poses.md).
- **Promotion condition:** if square-one ever drives arms, expression or per-dancer timing
  itself, the ownership boundary moves and this becomes townage's proposal to the engine rather
  than its arbitration. Revisit via a new ADR then.
