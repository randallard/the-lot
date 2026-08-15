# 2026-08-15 (4) — the twist outlived the contact

_Documents `ed8514d`._

Ryan watched the twist:

> looks pretty good but the npc falls back to facing and the player character stays twisted

Two symptoms, one defect, and the asymmetry between them is the tell.

## What was actually happening

`FistBumpDriver` held the staged placement — twist included — right through to the frame the
envelope finished, then released ownership and returned. Nothing ever put the twist back.

After that, each component resumed its own behaviour, and they differ:

- **The NPC has a behaviour.** While hovered or talking it runs `lookAt(player)` every frame,
  which is squarely facing. So the frame after release, it snapped from turned to square.
- **The player has none.** `Player` only writes `rotation.y` when there is input, so the yaw the
  driver left behind simply stayed there until the player next walked somewhere.

Same bug, opposite appearances. Worth noting because "one of them reverts and the other doesn't"
reads like two problems and is one — and the half that *looked* correct (the NPC ending up
square) was correct by accident, arrived at by a snap.

## The fix is that squaring up is part of the gesture

Turning in is how the contact becomes possible; turning back is how it ends. People do both.
The twist now unwinds across the **withdraw**, on the same beat the arm returns to rest, so it
costs no additional time in charge of the player.

- `squareUp` — extracted from `approachTarget`, which already contained this logic for turning
  them *in*. Now both ends call it, so the heading they return to is by construction the one
  they were turned away from, for either stance.
- The driver stages a `settle` alongside `to`: the same positions with the twist taken out. You
  square up; you do not walk back.
- Through extend and hold the unwind parameter is a flat **0**, which writes the staged
  placement *exactly* — the grip's rule preserved. `easePlacement` at 0 is the identity, so
  replacing the old snap with an ease changed nothing during the contact window.

By the time ownership is released both are already square, so the NPC's `lookAt` is a no-op —
there is nothing left to snap to. There is a test asserting exactly that: the settled NPC yaw
equals `facingYaw` toward the player.

## Correcting ADR-0019, which cannot be edited

Its Consequences say a twisted pair "are no longer square to each other, which is new on screen
and is the main thing to watch." True during the gesture, and it quietly implies the state
persists. It should have said the twist is **spent and returned within the gesture** and named
the release point as the thing to get right. The decision is unaffected.

544 tests (from 539), lint 0 errors, typecheck and build clean. Not watched.
