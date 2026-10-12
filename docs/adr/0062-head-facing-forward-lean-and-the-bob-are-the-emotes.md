# ADR-0062: Head facing, forward lean and the bob are the emote's

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

[ADR-0059](0059-emote-and-choreography-share-a-dancer-by-channel.md) says a *free* channel is
written by the emote outright. This is which channels those are.

They are what is left once the owned channels
([ADR-0061](0061-the-choreography-owns-position-body-facing-and-a-gripped-arm.md)) and the
silhouette ([ADR-0060](0060-a-channel-is-limited-exactly-when-it-feeds-the-silhouette.md)) are
taken out — but "what is left" is not automatically safe, and one of them carries a risk worth
writing down.

## Decision

These channels are free for an engine-driven dancer:

| Channel | Why |
|---|---|
| `headDeltaRotation` — head facing | Nothing about which way a head points can break a formation |
| `bodyLeanX`, `headOffsetZ` | Forward and back. ADR-0012 leaves forward overhang out of lateral clearance by design |
| `bodyDeltaY` — the bob | Vertical, and bounded |
| `eyeOverride`, `activeEffects` | No spatial extent |

## Alternatives considered

- **Limit the bob.** It is the one free channel with a real spatial effect. Left free because it
  is small and vertical; see the first consequence.
- **Fold head facing into "facing" and own it.** Rejected in ADR-0061.

## Consequences

- **`bodyDeltaY` is free with a residual risk.** `rigidParts` assumes a fixed body centre, so a
  bob is invisible to the clearance model: a jump that brings a short dancer's head up to a tall
  dancer's height mid-pass is unmodelled. Accepted as bounded.
- A dancer can look at their partner, or anywhere, in the middle of a grip. Watched 2026-07-28.
- **Promotion condition:** if an emote ever takes a dancer off the floor, the bob stops being
  bounded and wants reclassifying by a new ADR.
