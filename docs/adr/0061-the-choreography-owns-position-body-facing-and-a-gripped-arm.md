# ADR-0061: The choreography owns position, body facing and a gripped arm

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

[ADR-0059](0059-emote-and-choreography-share-a-dancer-by-channel.md) says an *owned* channel is
the choreography's and the emote's contribution to it is dropped. This is which channels those
are.

The non-obvious one is facing. "Facing belongs to the choreography" was the first rule written,
and it forbids a dancer looking at their partner. A dancer's **head** facing and **body** facing
became different questions the moment heads could turn.

## Decision

Three things are owned by the choreography for an engine-driven dancer:

| Channel | Why |
|---|---|
| horizontal position | Where a dancer stands is the formation. Not expressible in `ResolvedPose` at all — enforced by the type, not by a resolver |
| `bodyDeltaRotY` — body facing | One dancer spinning is one dancer out of the square |
| a **gripped** arm | While a grip is engaged the hand is a placement, not a pose: a hand holding someone has somewhere it must be |

An arm is owned only while the engine has its grip engaged; `poseArms` resolves that transition.

## Alternatives considered

- **Own all of "facing".** Forbids a glance at a partner, which is most of what expression in a
  square is for. Head facing is the emote's
  ([ADR-0062](0062-head-facing-forward-lean-and-the-bob-are-the-emotes.md)).
- **Blend a gripped arm with the emote.** A hand half on a partner's forearm is a hold that has
  come apart.

## Consequences

- A spin emote does nothing to a driven dancer's body. That is the rule working, and it looks
  identical to a feature that was never wired.
- **So every owned channel needs an indicator the expression layer cannot move.** Learned twice
  in one day: `spin` "passed" for a week by doing nothing, and body facing was unreadable once
  the emote owned the head marker. Hence two markers on a dancer — a head dot for looking, a
  chest dot for facing, the chest dot parented to the rig so no lean can tilt it into looking
  like a turn. A testing obligation this decision creates.
- `ResolvedExpression` has no field for an owned channel, so the driver cannot write one from an
  emote by mistake — there is nowhere to carry it.
