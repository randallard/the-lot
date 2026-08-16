# 2026-08-15 (7) — a note is not a guard

_Documents `959d4f6` (ADR-0021) and `c62aa9b` (the build)._

Ryan, reading back over the day's ADRs:

> does this mean if another player character chooses my player character off the wheel, say,
> to fist bump me, I can't decline?

## The answer required reading the code, not the ADR

ADR-0018's own Consequences say consent "is not relaxed", and that is true as far as it goes:
`availability` consults **both** participants' `ComfortPreferences` and refuses with
`"muted-by-b"` → *"they'd rather not"*. There is a receiver-side veto.

It is a **standing preference set in advance**. There is no offer/response anywhere —
`handleWheelSelect` sets `bumpRequest.startedAt = performance.now()` and it is happening. So
a second player could pre-mute a whole category and still not decline *that* bump, while
`playerBodyDriven` claimed their avatar and walked and turned it for ~1.25s on somebody
else's click.

I had written that gap into ADR-0018 myself, as a promotion condition. **A promotion
condition is a note, and a note is not a guard.** The reasoning was sound for the shipping
arrangement and unsound one line past it, with nothing in the code marking where the line
was. That is the same failure this subsystem keeps producing in other clothes: something
true, believed to be safe, with no mechanism holding it true.

## The narrowing

`ConsentMode` on `ComfortPreferences` — `"standing"` (all there is; an NPC cannot be asked)
or `"live"` (can be asked, and must be for anything that moves them). `availability` refuses
with `"needs-live-consent"` when the move approaches and the **receiver** is live. Receiver
alone: the chooser picked it off a wheel, and choosing is their live answer.

Two choices worth keeping:

- **The line is at being *moved*, not at being *touched*.** A move with `approach: "none"`
  writes nobody's placement, so ADR-0016's standing preferences remain the whole question
  there. This takes back only the part of ADR-0018 that moves a body.
- **Not phrased as "player vs NPC"**, though today it lines up exactly. The property is
  whether a live answer is *available*; a cutscene character or a replay ghost is
  `"standing"` too, and asking about avatars would miscategorise them.

The field is **required**, not optional, and `OPEN_TO_EVERYTHING` is now `"live"` — so the
default fails toward refusing. Adding it broke four test fixtures and no production code,
which is the shape you want from a field that has to be thought about.

## The corner analysis Ryan asked for

He also asked whether deferring player↔player could build us into a corner. Three answers,
and the third is the pleasant one.

- 🔴 **Guarded now: a default that fails open.** Covered above.
- 🔴 **Named, not fixed: ownership has no owner.** `playerBodyDriven` is a
  `RefObject<boolean>` — ADR-0010's channel contract applied to placement. A boolean can say
  *that* something owns your body and not *what*, so with two people two remote moves could
  each claim you and either release would clear the other's claim. This is the expensive one:
  the contract is now used at two levels, so retrofitting an owner id touches every driver.
  Unreachable while the guard holds, and fixing it needs the handshake it is waiting on.
- ✅ **The one we are not in, and it was bought by an earlier decision.** `approachTarget` is
  **pure and returns targets**; the driver applies them. In a networked world a client cannot
  write another player's avatar — it proposes and the owner applies — which is exactly the
  shape this already has. ADR-0016 insisted the geometry stay pure so the editor and the
  runtime could share it. That reason had nothing to do with multiplayer, and it bought the
  multiplayer seam anyway.

Worth noticing as a pattern: the decision that saved us here was made for a completely
different reason, and the thing that nearly cost us was a note I wrote acknowledging the
exact risk. Documented awareness is not a control; a shape that refuses is.

552 tests (from 545), lint 0 errors, typecheck and build clean. Nothing shipping changes —
the built-in bump is a player choosing something to do with an NPC, and the guard is silent.

🔴 **The guard is itself unexercised in render**, since nothing sets a live receiver. By this
repo's own rule that is not a seam. It is a *refusal*, so it fails toward refusing too much
rather than too little, which is the right direction for the one control standing between a
stranger and your avatar — but it has never actually stopped anything.
