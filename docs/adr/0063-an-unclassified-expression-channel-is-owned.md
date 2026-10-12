# ADR-0063: An unclassified expression channel is owned

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

[ADR-0059](0059-emote-and-choreography-share-a-dancer-by-channel.md) sorts every channel of
`ResolvedPose` into owned, limited or free. `ResolvedPose` grows — an emote system gains fields —
and a field added by someone thinking about emotes has not been thought about by anyone thinking
about a square.

Until the classification lived in one place this rule held only by accident: a new field did
nothing to a dancer because nobody had wired it up. The same accident let the silhouette channels
sit unapplied for a day while an accepted ADR said otherwise.

## Decision

A channel nobody has classified is **owned**: dropped for a driven dancer until someone decides
what it is. Failing toward a formation that holds is the safe direction, and it makes the
omission visible rather than silent.

It is structural, not a convention. `CHANNELS` is typed `Record<keyof ResolvedPose, Channel>`, so
adding a field to `ResolvedPose` stops `expression-channels.ts` compiling until it is classified.

## Alternatives considered

- **Default to free.** A new field then reaches a dancer the day it is added, and the first
  anyone hears of it is a formation breaking.
- **Default to limited.** There is no general clip — a limit needs to know what the channel
  trespasses *on*.

## Consequences

- Adding an expression channel is a compile error in the dance subsystem until it is classified.
  That is the point, and it is a small tax on every emote feature.
- A new channel that *should* be free does nothing in a square until someone says so.
