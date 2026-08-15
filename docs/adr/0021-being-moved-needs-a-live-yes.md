# ADR-0021: Being moved needs a live yes, so the approach is narrowed to NPC receivers
- Status: Accepted
- Date: 2026-08-15
- Deciders: Ryan, Claude
- Supersedes: [ADR-0018](0018-a-contact-move-may-bring-the-pair-into-position.md)

## Context

ADR-0018 decided that **being chosen off the wheel is the consent to be moved**, on the
reasoning that the handshake for "accepted by both parties" is only needed when both
participants are players, and today one is always an NPC.

Ryan pressed on exactly the right seam: *"does this mean if another player character chooses
my player character off the wheel, say, to fist bump me, I can't decline?"*

Reading the code rather than the ADR's summary of itself: **partly.** `availability` does
consult the receiver's `ComfortPreferences` and refuses with `"muted-by-b"` — so there is a
receiver-side veto. But it is a **standing preference set in advance**. There is no
offer/response anywhere; `handleWheelSelect` sets `bumpRequest.startedAt` and it is
happening. So a second player could pre-mute a whole category and still not decline *this*
bump — and `playerBodyDriven` would claim their avatar and walk and turn it for ~1.25s on
somebody else's click.

ADR-0018 named that as a promotion condition. A promotion condition is a note, and a note is
not a guard. The reasoning was sound for the shipping arrangement and unsound one line past
it, with nothing in the code marking where the line is.

## Decision

**A move may move a participant only when that participant's standing preferences are the
whole of their consent.** Everything else about ADR-0018 stands.

`ComfortPreferences` gains a required `consent: ConsentMode`:

- **`"standing"`** — these preferences are all there is. True of a character the game plays:
  an NPC cannot be asked in the moment, so acting on what it declared in advance is not a
  shortcut, it is the complete answer.
- **`"live"`** — this participant can be asked, and for anything that moves them they must
  be. No mechanism exists to ask, so such a move is **refused** rather than performed on a
  preference that was never meant to carry that weight.

`availability` refuses with `"needs-live-consent"` when the move approaches and the
**receiver** is `"live"`. The guard is on the receiver alone: the chooser picked the move off
a wheel, and choosing is their live answer.

**The line is at being *moved*, not at being *touched*.** A move with `approach: "none"`
writes nobody's placement, so ADR-0016's standing preferences remain the whole question there
and are not narrowed. This ADR only takes back the part of ADR-0018 that moves a body.

Deliberately **not** phrased as "player vs NPC", though today it lines up with that exactly.
The property the decision turns on is whether a live answer is *available* — a cutscene
character or a replay ghost is `"standing"` too, and asking about avatars would miscategorise
them.

## Corners this guards against, and one it turns out we already avoided

Ryan asked whether deferring player↔player could build us into a corner. Three answers.

- 🔴 **The one being guarded: a default that fails open.** `OPEN_TO_EVERYTHING` is now
  `"live"`, so a caller who builds preferences without thinking about consent gets the
  refusal rather than the shortcut, and `consent` is **required** rather than optional so
  every construction site has to say which it is. When the field was added, four fixtures
  stopped compiling and no production code did — which is the shape you want.
- 🔴 **The one named but not fixed: ownership has no owner.** `playerBodyDriven` is a
  `RefObject<boolean>` — ADR-0010's channel contract, applied to placement by ADR-0018. A
  boolean can say *that* something owns your body and not *what*, so with two people two
  remote moves could each claim you and either one's release would clear the other's claim.
  This is the expensive one, because the contract is now used at two levels (arms, bodies)
  and every driver would have to change. Not fixed here: it is unreachable while the guard
  above holds, and fixing it needs the handshake it is waiting on.
- ✅ **The one we are not in, and it was luck plus an earlier decision.** `approachTarget` is
  **pure and returns targets**; the driver applies them. In a networked world a client cannot
  write another player's avatar — it proposes and the owner applies — and that is exactly the
  shape this already has. ADR-0016's insistence that the geometry stay pure so the editor and
  the runtime share it turns out to have bought the multiplayer seam for free.

## Consequences

- **Nothing shipping changes.** The built-in bump is a player choosing something to do with
  an NPC; the driver passes `NPC_OPEN_TO_EVERYTHING` for the receiver and the guard is silent.
  552 tests, and the only ones that moved were fixtures.
- 🔴 **The guard is itself unexercised in render.** Nothing sets a `"live"` receiver, because
  there is no second player. By this repo's standing rule that is not a seam — but it is a
  *refusal*, so its failure mode is refusing too much rather than too little, which is the
  right direction for the one control standing between a stranger and your avatar.
- **`availability`'s `prefsB` now defaults to `NPC_OPEN_TO_EVERYTHING` while `prefsA` defaults
  to `OPEN_TO_EVERYTHING`.** Asymmetric, and it is the shipping arrangement written down: `A`
  chose, `B` is being done to. A caller with two people passes both explicitly and meets the
  guard.
- **Promotion condition.** This is lifted by building the offer/response handshake, at which
  point `Availability` needs a third state (it is a boolean today) and `BumpRequest` needs a
  lifecycle (it is `{ startedAt }` today). Both are contained — one predicate, one driver, one
  caller — and neither is worth building before there is a second player to hand the offer to.
