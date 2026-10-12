# ADR-0064: The channel contract governs engine-driven dancers only

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

[ADR-0059](0059-emote-and-choreography-share-a-dancer-by-channel.md) arbitrates between the
choreography and an emote. That presumes there is a choreography with authority over the dancer.

For an NPC driven from square-one there is. For the **player** in free play there is not: the
square is not authoritative over the player, and a square that falls apart because the player
wandered off or spun round is a playable situation rather than an error. See the planning
effort's `square-dance-planning/briefs/breakdown-is-the-feature.md`.

## Decision

The owned / limited / free contract applies to **engine-driven dancers**. The free-play player is
out of its scope: nothing here drops, clips or limits what the player's own emote does to the
player.

## Alternatives considered

- **Apply it to the player too.** Then the player cannot break a square, which removes the thing
  the arc is built around.
- **Suspend the player's emotes while they are in a figure.** What `Player.tsx` does for
  locomotion, and right there — stopping to wave is a design choice, not a conflict. It is not
  this contract.

## Consequences

- A player can put an arm through an NPC partner, or turn out of a set. By design.
- A contact move that moves the player has its own rule about that
  ([ADR-0021](0021-being-moved-needs-a-live-yes.md)) and does not inherit this one.
- **Promotion condition:** when the player is first driven by the engine (`externallyDriven`,
  planned), which of these channels the engine then owns is a new decision.
