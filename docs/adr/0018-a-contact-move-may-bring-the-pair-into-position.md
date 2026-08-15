# ADR-0018: A contact move may bring the pair into position, and being chosen is the consent
- Status: Superseded by [ADR-0021](0021-being-moved-needs-a-live-yes.md)
- Date: 2026-08-15
- Deciders: Ryan, Claude

## Context

Ryan watched the fist bump after ADR-0017 landed and the verdict was that it *"requires way
too close of a position"*.

Two things are true at once, and separating them matters.

**The reach really is short, and honestly so.** ADR-0017 replaced a limit that was
`handReach + handReach` — a straight arm each, ignoring both the climb to the contact height
and the reach across the body's own midline — with one that counts them. For the default
player↔NPC pairing that took the limit from **1.215 to 0.917**, a quarter. It is the right
number for a rigid arm on a torso that cannot twist, and loosening it again would be going
back to a number that was wrong in a flattering direction.

**But the pair were never meant to line themselves up.** Auto-positioning was Ryan's, recorded
on 2026-07-30, and has been item 2 of the next-action list ever since: *"a move may bring both
bodies into position when accepted by both parties."* It was deferred pending its own ADR
because it splits the availability predicate and because "accepted by both parties" implies an
offer/response handshake that does not exist. That deferral is what the watch ran into. The
geometry got more honest while the thing that was supposed to absorb the honesty stayed
unbuilt.

**The blocker dissolves for the case that actually exists.** The handshake is needed when both
participants are players. Today one of them is an NPC, and an NPC's consent is already
modelled — `ComfortPreferences`, threaded through `availability` since ADR-0016 precisely so
it would not have to be retrofitted. The player's consent is the wheel: a move that only ever
runs because someone picked it off a menu has been chosen, and being chosen is what consent to
be moved looks like from the choosing end.

## Decision

A contact move carries an **`approach`** — `"none" | "turn" | "turn-and-step"` — saying how far
it may move the pair to make itself possible. The built-in fist bump is `"turn-and-step"`.

The split this rests on: **the stance says what relation the move needs; the approach says
whether the move will produce it rather than only test for it.** So a move that approaches is
asked a weaker question by `availability`:

- The **facing** half of the stance check is dropped outright, because turning them is exactly
  what the approach is about to do.
- The **distance** half is widened to `offerReach` — where the approach stages them, plus
  `APPROACH_STEP` (1.5 world units, total across both). Measured from the staged separation
  rather than from the reach limit, so the gap actually closed is never more than the budget.
- **Consent is not geometry and is not relaxed.** Muted tags and `allowsTransfer` gate an
  approaching move exactly as before.

`approachTarget` is pure and produces the two destination placements. Separation is **clamped
into a comfortable band, not set**: a pair already standing well are only turned, so the nudge
nudges and otherwise keeps out of the way. The walk is split evenly, because who reaches
further is already `contactFraction`'s job and making them also walk further would count the
same asymmetry twice.

The driver freezes both placements at the start of a bump and eases toward them over
`APPROACH_SECONDS`, then **snaps** and plays the envelope. While it does, it owns both bodies
through `playerBodyDriven` / `npcBodyDriven` — ADR-0010's owned-channel contract applied to
placement, the same shape `drivenArms` already has one level down.

**Being chosen is the consent to be moved.** A move never approaches on its own initiative; it
approaches because someone selected it off the wheel, and the NPC's half is their comfort
preferences. The offer/response handshake stays owed for the day both participants are people.

## Alternatives considered

**Loosen the reach instead.** Add a torso-twist allowance to `axialReach`, or go back to the
flat `handReach + handReach`. Rejected: the tight number is the true one, and the complaint is
about *positioning*, not about how far an arm goes. Buying comfort by making the geometry lie
would also quietly undo the thing ADR-0017 was for.

**Author the fist bump as `outOfRange: "reach"`.** Already implemented, and it would offer the
bump from any distance. It also reproduces the original screenshot — arms floating in a gap —
which is the defect ADR-0016 exists to make authored rather than accidental. Wrong tool: that
field is about what happens when a move is performed out of range, not about getting into
range.

**Move only the player.** Simpler, and it avoids writing an NPC's transform from outside. It
also makes the NPC a prop rather than a participant, and Ryan's original note said *both*
bodies. Rejected, though it is what `"turn"` degenerates to when the pair are already at a good
distance.

**Wait for the offer/response handshake.** The rigorous version, and the reason this sat
deferred for two weeks while the thing it was supposed to fix got worse. The handshake is real
work that is only needed for player↔player, and building it first would have held a fix for a
watched defect behind a feature nothing yet requires.

## Consequences

- **The bump is offered from roughly 2.2 world units instead of 0.92, and facing no longer
  matters at all.** That is the change Ryan asked for, and `APPROACH_STEP` is the dial if it is
  still not forgiving enough.
- **The move takes control of the player for `APPROACH_SECONDS` plus the envelope** — about
  1.25s. Input is ignored for the whole gesture rather than only the step, because handing the
  controls back at the moment the fists meet lets the player walk out of a contact they are
  still in. This is the first thing in the game that moves the player without them steering,
  and it is the part most worth watching for how it *feels*.
- 🔴 **A stuck ownership flag would freeze the player permanently**, which is a far worse
  failure than a dropped bump. Released on the frame a bump ends *and* on unmount, since the
  ending frame is not guaranteed to run.
- **The arms stay at rest through the approach.** Reaching while still walking in is the
  detached-arm screenshot with extra steps.
- **The staged pair satisfy the predicate they were staged for**, asserted rather than assumed:
  an approach that produced a stance the move would still refuse is an approach that walks you
  somewhere useless.
- **`approach` is optional in the type and defaulted through `approachOf`.** Moves authored
  before this field exist in `localStorage`, and a stored move silently gaining the ability to
  move its participants is not a migration anyone consented to. Absent means `"none"`.
- **Promotion condition.** When both participants can be players, "chosen from the wheel" stops
  being sufficient — the other person has not chosen anything. That is the offer/response
  handshake, and it is a new ADR, not a widening of this one. The same threshold applies to any
  move that approaches *without* being selected, which nothing does today and which this ADR
  does not authorise.
- **Not addressed:** an NPC who is walking somewhere gets frozen for the duration rather than
  pausing gracefully, and the approach ignores anything in the way — there is no obstacle test,
  so a nudge can step a pair through scenery. Acceptable while the step is bounded at 1.5 units
  on open ground; a real navmesh is a different feature.
