# 2026-10-27 (7): a wait between calls

🧪 Exploratory, no ADR. Follows 10-27-4's "not done": a wait in the middle of a chain.
Committed here and in square-one (Ryan: *"commit both"*).

Ryan's rule, from 10-27-4: *"during the chain they don't go all the way to hand hold between moves
but if there's a beat or more after the next call should be called then they go to handhold"*.
The engine's sequences had no gaps, so it couldn't happen. Ryan chose to put the wait **in the
engine** (square-one), not as a splice on the floor, so the engine's timing and hold spans say
what's drawn, and a live caller can leave a gap through the engine.

## square-one (uncommitted; [its journal 25](../../../square-one/docs/journal/2026-10-27-a-wait-between-calls-25.md))

- **`danceCoupleSequence(calls, couple, shapeAt, waits)`:** beats waited before each call.
- **`flattenSequence`:** the dancers stand still through the gap.
- **`WAIT_BEATS` (1):** a gap of a beat or more releases the hold before it (ADR-0026's
  end-of-dance release). A shorter gap merges the spans, and the arch carries on.

## Here

- **`useDancePerformance` takes `waits`** and passes them to the engine. `DanceFloor` inherits
  it.
- **A figure can list `waits`** (`dance-route.ts`). There are two new figures:
  `#dance=two-twirls-wait` (2 beats between the twirls) and `#dance=two-twirls-half` (half a beat).
  The debug scene, review 1 and `#review2` all pass a figure's waits.
- **`joinChain`: a `ChainCall` has `wait`.** A wait of `WAIT_BEATS` or more is a waiting boundary,
  the same code as the sequence's start and end. The call before eases into the standing couple,
  and the call after rises out of it. Under a beat, it's the ordinary join with the arch held.
- **During the wait** the floor samples the previous call's bake past its end, which clamps to
  its last keyframe: the standing couple.

## Checked

- **Tests:** `chain-join.test.ts` "waits a beat or more in the standing couple, and flows on
  through less". The full suite has the same 38 known failures.
- **In Chrome, NPC Ryan / NPC Ryan:**
  - `two-twirls-wait`, paused at beat 4.8 of 10 (mid-wait): standing, hands down in the handhold.
  - `two-twirls-half`, paused at 4.1 of 8.5 (in the gap): the joined hands up between them.
  - No console errors.
- **Myco / Ember** showed hands down in the half-beat gap too. That couple already dips 48 cm at a
  plain join (10-27-6's still-open list); it isn't the wait.

## Not done

- **square-one isn't released.** v0.6.0 and the pin move wait for Ryan. Until then this works only
  with the co-development link (`scripts/link-engine.mjs`); CI's pinned v0.5.0 has no `waits` or
  `WAIT_BEATS`.
- **Arch spans are matched to twirls by ordinal** (`DanceFloor`, the accommodation lookup). With a
  wait, two twirls give two spans, which is still in order. A Trade then a Twirl already matches
  the wrong index there (a pre-existing gap); matching by the call whose span contains the arch
  would fix both.
- **The live caller** is where waits will really come from: the gap between when a call should
  be called and when it is.
