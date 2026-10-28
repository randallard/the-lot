# 2026-10-27 (2): reach or break, a coin flip

🧪 Exploratory, no ADR. It follows 10-27-1's question: what should a twirl whose arms stretch more
than 2× become? Ryan: *"I want it to be a coin flip between reach or break but settable in review2
when we want to check them"*.

## What was built

- **A break in the solver** (`twirlMove(…, "break")`):
  - The hands reach for each other at `BREAK_HOLD` (0.02) of a hold's pull, but they aren't owed
    contact (`Hold.weight`; `metrics` doesn't count a weak hold's gap). This is Ryan's 10-13
    *"shows a bit of effort towards it"*.
  - Nobody changes height, and the arms start at rest.
  - The paths come from the engine sized for a break (`BREAK_SIZING`). That only sometimes
    changes them: every couple starts at the same handhold width, and the beau bows out mid-call
    only as far as the room needed. On the stock cast, break and held paths match for most
    couples. Ember → ryan's break bows out to 171 cm against 114 held. Myco → ryan and myco → myco
    already bow to 171 / 162 cm when held, because the floor's own held sizing gives up to a
    break's room for them.
- **The bake chooser** (`chooseBake`, `baked-tracks.ts`). For each execution of a twirl:
  1. A called accommodation (`#review2`'s setting) or a forced one (a turn-under style) takes the
     bake solved for it. If there's none, the floor poses that accommodation itself.
  2. Otherwise, a **clean held solve within `REACH_LIMIT` (2×) always holds**: no toss.
  3. Any other held solve (a reach past 2×, or one that clips or leaves the hands apart) is
     **tossed for against the break bake**, with ADR-0037's `drawAccommodation`.

  The bake's sizing then sizes the figure, as before. A bake now records `stretch` and `clean`.
- **`DanceFloor`** chooses through `chooseBake`, with the called or forced accommodation.
- **`#review2`:** a 🧪 twirl selector (🎲 coin flip / reach / break) applies to every couple. It's
  in the session reducer (`accommodation`) and in each floor's `key`, because a floor's plan is
  cached per execution.
- **`scripts/whole-move/bake-pair.ts <beau> <belle> [meet|duck]`** solves and bakes one couple
  both ways, straight to `src/dance/baked/` (no bundle in between). `try-grow.ts` takes `break`.

## Finding: every stock couple breaks cleanly; only five hold cleanly

All 25 stock couples were baked both ways (margin 6 cm, best of 4).

- **Breaks:** all 25 are clean. The worst clipping is 0.1 cm, stretch 1.21–1.73×, the worst jump
  27°, and the hands end 14–90 cm apart at their nearest and furthest. That includes
  sprout → ember and myco → ember, whose held solves fail outright (180° flips, 3.5 cm clipping).
- **Held:** five couples are clean within 2× and always hold: ryan → ryan, ember → ryan,
  player → ryan, player → sprout and sprout → sprout. The other 20 toss.
- **Four of those 20 stretch less than 2× but aren't clean:** ryan → player clips 3.0 cm,
  ember → ember clips 3.8 cm, and player → player and ember → sprout leave the hands about 2–3 cm
  apart with 100°+ flips. A stretch-only rule would have shown them every time, so a held solve
  that isn't clean is tossed for too. That widens Ryan's rule slightly, and he should know.
- **The beau steps far in some breaks:** 52–66 cm (myco → ryan, ember → ryan, sprout → ryan,
  player → ryan, myco → myco). The weak pull draws his step toward her as well as his arm. Worth a
  look in `#review2` (break), and `w.step` can hold it back if it reads wrong.

## Not done

- **The bakes weigh 3 MB:** 52 files of indented JSON, imported eagerly. Writing them compact, or
  as a solve library loaded on demand (with the 10-26-4 polish), is the shipping step.
- **Duck bakes** exist for ryan → ryan only. Any other `DUCK_UNDER` belle gets the meet bake.
- **The reach is drawn as arm stretch.** The floor's own reach lengthens the forearm (ADR-0048,
  which superseded ADR-0040); the solver stretches both segments, at a cost. They look
  different, and that's for Ryan's eye.
