# 2026-10-27 (4): calls chain

🧪 Exploratory, no ADR. Step 4 of the reordered plan
(`work/square-dance-planning/briefs/solve-the-whole-move.md`: "standard formation poses at each
call's start and end; two calls back to back"). Ryan, on 10-27-3's comparison: *"let's leave it and
move to the next step"*. The 🧪 solved checkbox stays in `#review2`, uncommitted.

## The problem: every bake popped at both ends

A bake is solved for one call on its own, and nothing said where a call starts or ends:

- **ryan → ryan meet:** the beau's held arm started at raise 70° / toward 17°, with the arch
  already up, and ended at 37° / 114°. Against the floor's standing couple that's 163° off at the
  start and 147° at the end.
- **Two twirls in a row** (`#dance=two-twirls`) snapped 154° at the join.

## First attempt: every call starts and ends in the handhold. Wrong.

The brief said "a standard pose for its formation" at every call's start and end, so the first
build pinned every bake's ends to the standing couple (`standingFrame`, below) and re-baked all
51. It worked as engineering: the join went from 152° to 0°, and the hard couples lost nothing.

Ryan: *"during the chain they don't go all the way to hand hold between moves but if there's a
beat or more after the next call should be called then they go to handhold right?"* Right, and
it was already written down:

- **square-one ADR-0026** (from Ryan's 09-12 note): adjacent holds on the same hand **merge**
  across a boundary, so two twirls are one unbroken arch and the hands never dip at the join. Only
  the dance's **last** hold lets go, half a beat early (`HOLD_RELEASE_BEATS`), and the couple
  finish **waiting** in the ordinary handhold.
- **square-one's flow spec**, F1 (the end of one call is where the next begins) and F2 (the hand
  needed next is free at the end of the last action).
- **The pose chart** (`work/square-dance-planning/pose-review-chart.md`): a Partner Trade ends
  "hands free — which is what lets a Trade flow into anything".
- **the-lot 09-12-2:** the floor already draws this. With no arch span, it eases into the
  standing hold.

So the pinned bakes were reverted to the committed, free-ended ones. The pins stay as an option
(`bake-pair.ts --home`), and the standing couple became the pose a couple **settles into** when
they're waiting.

## What was built

- **`chain-join.ts`, `joinChain`:** for the calls of a sequence and their chosen bakes, it
  re-solves a 10-sample (one-beat) window at each of a bake's ends:
  - **Into the next bake:** one window over the join, from the last beat of one call to the first
    beat of the next, with the hands held across it. The next call's path is turned and moved
    onto where the last one ended (`placeOnto`). The join pose both bakes then share is solved,
    starting from halfway between where each bake has it.
  - **The sequence's start and end, or beside a call with no bake:** a window from the standing
    couple into the bake, or out of it into the standing couple. That's waiting, and it's what
    the floor draws there itself.
  - **How a window is solved:** the bake is shifted onto the pinned pose, with the shift eased
    out across the window so the bake's own motion carries through. Then a 1000-iteration polish
    runs with the outer samples frozen (`SolveOptions.frozen`), so it meets the untouched part of
    each bake exactly. Angles that go round are unwrapped first: a standing pose and a bake can
    name nearly the same heading 360° apart. A break's window keeps the break's weak hold.
- **`DanceFloor`:** the `bakes` memo joins the chosen bakes (`couplePaths` for each call's paths).
  `#review2` and review 1 dance one call, so it starts and ends waiting. `#dance=two-twirls` flows
  through the join.
- **From the first attempt, kept:**
  - `standingFrame` / `standingTargets` (`whole-move-twirl.ts`): the floor's standing couple in
    the solver's terms. The hands go where `touchHold` holds them (the taller dancer's waist,
    ADR-0046, a little in front, ADR-0027), the hand centres a clasp apart, the upper arms hang
    back, and the free arms rest.
  - `twirlMove(…, home)` and `Move.home` pin a single solve's ends to it.
  - **Held forearms may touch** (`exempt`, `planOf`). Their wrists are only a clasp apart, so no
    margin between them can hold; with 6 cm, the solve pried the hands open in the handhold.
- **Scripts:**
  - `try-chain.ts <beau> <belle> [calls] [--break] [--trace] [--iters=]`: a couple's twirl N
    times, before and after the join, measured over the whole chain.
  - `try-home.ts`: one solve with free ends and with pinned ends.

## Result (two twirls in a row, the whole chain measured)

| couple | worst jump, as baked → joined | clip | hands | ends against the standing couple | time |
|---|---|---|---|---|---|
| ryan → ryan | 154° (the join) → **28°** | 0 | 0.6 → 1.2 cm | 163° / 147° → **0° / 0°** | 247 ms |
| ryan → ryan, break | 27° → **19°** | 0 | 0 | 165° / 159° → 0° / 0° | 235 ms |
| myco → ryan | 107° → 34° (mid-call) | 0 | 2.2 cm, unchanged | 78° / 153° → 0° / 0° | 264 ms |
| player → ember | 141° → 63° (mid-call) | 3.5 cm, unchanged | 2.6 cm, unchanged | 139° / 170° → 0° / 0° | 254 ms |
| sprout → sprout | 166° → 24° | 0 | 1.5 cm, unchanged | 152° / 128° → 0° / 0° | 266 ms |
| ember → ryan | 105° → 28° | 0 | 0.6 cm, unchanged | 145° / 124° → 0° / 0° | 273 ms |

- **The join is gone as a jump on every couple tried.** The worst jumps left are the bakes' own,
  mid-call, where they were before.
- **The polish length mattered.** At 300 iterations the hands came down into the handhold 4.8 cm
  apart. At 600, 2.3 cm. At 1000, 1.2 cm.
- **About 80 ms a window,** on the main thread, when the floor plans a sequence. Fine for `#dance`.
  Live calling with 5 squares wants it in the worker.

## Not done

- **A wait in the middle of a chain.** The engine's sequences have no gaps: a call follows the
  last on the beat, and only the end of the dance waits. Ryan's rule, a beat or more before the
  next call is called and they settle into the handhold, needs the engine (or the live caller) to
  say when there's a gap. When it can, a gap is a waiting window: the same code as the end of a
  sequence.
- **A call with no bake beside one with a bake** (`#dance=trade-twirl`) joins at the standing
  couple. That's what the floor draws as the twirl's arch begins, but a Trade ends hands free, so
  the twirl's first beat may be better starting from free hands. Watch it.
- **Other formations.** Only the couple's standing pose exists. Waves, lines and stars each want
  their own waiting pose, which is formation recognition (square-one's S2), as ADR-0026 says.
- **Against the drawn floor, to the degree.** `standingFrame` places the hand centres; the floor
  tucks the inside shoulder in (ADR-0049) and places the wrist. Expect a few centimetres where
  the floor hands over to the bake.
