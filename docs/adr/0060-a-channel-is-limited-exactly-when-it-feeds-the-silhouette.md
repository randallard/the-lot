# ADR-0060: A channel is limited exactly when it feeds the silhouette

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

[ADR-0059](0059-emote-and-choreography-share-a-dancer-by-channel.md) says a *limited* channel is
written by the emote and clipped where it trespasses. The question here is which channels those
are, and whether that is a matter of taste.

It is not. The square's spacing is computed once from each dancer's rigid silhouette —
`rigidParts`, [ADR-0012](0012-pair-clearance-from-the-3d-silhouette.md). Anything an emote can
change that the spacing was computed from can invalidate the spacing.

The first sketch of the contract (2026-07-27) had "lean is free". That was wrong: `rigidParts`
counts `sin(|leanZ|) · height/2` as lateral reach, so a *sideways* lean is silhouette. Only the
forward/back lean is free.

## Decision

**A channel is `limited` exactly when it feeds `rigidParts`.** That makes six of them:

| Channel | Why |
|---|---|
| `bodyRadiusDelta`, `bodyHeightDelta` | The body capsule in `rigidParts` |
| `bodyLeanZ` | Sideways lean is lateral reach in `rigidParts` |
| `headRadiusDelta`, `headOffsetX` | The head part in `rigidParts` |
| `headOffsetY` | Moves head height, changing which parts clear each other |

They are clipped by `silhouette-limit.ts`: a dancer may inflate by their share of the live slack
between the pair, and no further.

## Alternatives considered

- **Classify by judgement, channel by channel.** How "lean is free" got written. A rule that can
  be derived from what the spacing reads is one that cannot drift from it.
- **Re-measure the spacing when an emote changes a silhouette.** Then one dancer puffing up moves
  everybody else in the square, which is the formation breaking by a different route.

## Consequences

- The classification follows `rigidParts`: change what that function reads and this list changes
  with it, by the rule rather than by a new decision.
- **Enforced since 2026-07-28** (`silhouette-limit.ts`), watchable at `#dance` with the *puff up*
  emote. ADR-0010 recorded these as "decided but not enforced"; that stopped being true the same
  day.
- An emote that changes a dancer's shape can be clipped to nothing in a tight pass. That is the
  guarantee working, and it is the cost.
- 🔴 **The ungripped arm is not on this list and is not covered by this rule** — arms are not in
  `rigidParts`. It was limited by a separate mechanism, now switched off; see ADR-0059's
  consequences.
