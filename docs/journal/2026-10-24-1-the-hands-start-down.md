# 2026-10-24 (1) — the twirl starts in the handhold; the hands lift over beat 1

🧪 Exploratory, no ADR (prototype phase). **Uncommitted**, waits for Ryan's look. Looked at in a
browser by Claude on `#review2=california-twirl/player-sprout`, with the arc both on and off.

Ryan, with a new beat-counted set of stills
(`work/square-dance-planning/review2/reference/twirl2/`, `01` = start, `02` = beat 1, `04`/`09`
= beat 2, `06`/`11` = beat 4): *"in our review2 (and probably elsewhere) the move starts with hands
raised - they should start down in a handhold … the important thing is to get it fixed now."* This
was 10-12-1's plan item 4, *"the lift happens during the turn"*, which was never built.

## Why it started raised

square-one declares the Twirl's arch from **beat 0** (`{"grip":"arch","from":0,...}`), and
`DanceFloor` targeted the arch blend at **1** anywhere inside the span. The only exceptions were
"go home" and `#review`'s `stand` step, which asks for `arch: "down"` by name. So a seek to 0, the
loop wrapping back to 0, and every floor that isn't a review step all drew beat 0 inside the arch.
With 🧪 hands on the arc on, `joinArc` didn't read the blend at all (`over` weight 1, `forward`
0), so the inside forearms stood straight up at beat 0. Off, the solver's arch was fully up.

## What changed

- `turn-under.ts`: **`ARCH_LIFT_BEATS = 1`** and **`archLift(beat, from)`**, a half cosine from 0
  at the span's start to 1 one beat later. It leaves the handhold and arrives at the arch with zero
  slope, like `duckProfile`. 2 tests.
- `DanceFloor`: the arch blend's target inside a span is `archLift(beat, archSpan.from)` instead of
  `1`. "Go home" and `arch: "down"` are unchanged. The way down is still the release's (square-one
  ADR-0026).
- `DanceFloor`, the `joinArc` hold: lerped from the standing hold by `under.blend` (height,
  forward, `raised`, `over.weight`), so beat 0 is exactly the handhold in both modes.

It lives in `DanceFloor`, so it reaches every floor: `#review2`, `#review`, the debug scene and the
game's dance.

**Seen on screen:** beat 0 is hands low and joined between them, arc on and off. At beat 0.4 the
hands are about at shoulder height, at 0.8 about head height, and turning under by 1.2. Suite: the
same 38 failures before and after (diffed by name), +2 passing.

## Open

- **`#review`'s `arch-up` step** (`review-steps.ts`, beat 0, *"lifted clear of the taller
  crown, both dancers still on their spots"*) now draws the same thing as `stand`. The stills say
  that pose doesn't exist; 10-12-1 said whether it survives would be decided by the lift. Drop it,
  or move it into the lift (beat 0.5)? Ryan's call.
- **The engine still says `from: 0`.** The-lot now reads that as "the lift starts here". If the
  engine should say it instead (a lift phase in the span), that's a square-one change plus a pin
  bump.
- **With the arc on, the height by beat 1 is `archLift` × the arc's own rise**, and the rise is
  paced by her turn. `02` shows the hands well up at beat 1. If they look low there, it's the
  pacing to tune, not the start.
- There's no beat-3 still in twirl2 (Ryan: an oversight).
