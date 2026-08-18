# 2026-08-17 (2) — a way back to beat zero

_Documents commit `d3cd4fb` — *a couple's handhold, solved from the bodies, and the instrument that judges it*. Landed 2026-08-18 after Ryan verified the pose in the running scene._

Ryan:

> can you give me a button for go home that takes whatever move is selected and just goes
> to the start of it, for now
>
> also when it goes to the start of that move it should be paused, don't play automatically
> after go home is clicked

## What this is actually for

The entry above this one left a watch owed and named why it could not be taken: *"the standing
couple only exists at beat 0/8 of the loop, so it needs a pause at the right moment."* The
workaround on record was **drop the tempo to 30 bpm and try to catch it**, which is an instrument
asking the operator to have good reflexes. The moment being judged is not "somewhere near the
start", it is the figure's **first beat** — the standing couple, the pose ADR-0022's three numbers
solve for. Anything that lands nearby is a different pose that looks like it.

So this is a small button and it is not a small thing: it is the difference between the scene
being able to show a *named* moment and only being able to show a moment that went past.

## Three pieces, and only one of them was interesting

**`useDancePerformance.home()`** — a fresh performance and `sample()`, which is the same seeded
restart the loop already uses rather than a `tick(-beat)` the stepper would not honour anyway.
Returns the beat-0 states rather than just resetting, because the caller needs something to pose
against in the same frame.

**`DanceFloor`'s `home` token** — and this is the piece that had a way to be quietly wrong. The
frame loop's whole body sits inside `if (!paused)`, which is correct for a pause and exactly wrong
for a rewind: reset the clock while paused and the readout says `beat 0.0` while the dancers stand
where the interrupted move left them. **A number and a picture disagreeing, again** — the third
time this week, and the first time it was anticipated rather than found. A home request therefore
outranks the pause and buys exactly one pass.

Two details inside that pass:

- `dt` is **0**. Going home is a cut, not a move.
- `ease` is **1**, not the `dt * 10` the pass would otherwise compute — which from a zero `dt` is
  zero, leaving the grip blend precisely where the interrupted move left it. Beat 0 of a figure
  that does not start joined would have been drawn with hands still holding. Same defect as the
  one above in miniature: the state that gets rewound is not only the clock.

**The button** pauses as half of what it means, not as a side effect. A scene that ran on from
beat 0 would hand you the frame you asked for and take it away again. It also stops any emote in
flight, for the same reason: at beat 0 what should be on screen is the figure's own starting pose,
and an emote mid-flight is still folding an arm somewhere while you judge it.

## Watched, both formations

Driven from this session (Chromium, `localhost:5173`). Couple figure `#dance=two-trades`: played
to beat 0.6 with the belle part-way through her trade, clicked **go home** → `beat 0.0 / 8`, the
button flipped to `▶ play`, the couple standing joined-hands at the top of the loop, and it
**stayed** there across later frames. Facing pair `#dance` (Dosado, 6 beats): same, and it lands
on the two dancers facing each other down the +y axis with both arms hanging at rest — no emote
residue, which is the `ease = 1` line doing its job.

Three tests on `home()` cover what the eye cannot: that it returns the same state the first
`advance` did, that reading it twice does not creep the clock, and that a couple *sequence* comes
home to the top of the **first** call rather than the current one.

## What this does not do

It goes to the start of the **selected** figure only — Ryan's "for now". There is no step-a-beat,
no scrub, and no way to ask for the top of the *second* call in a sequence. If the watch wants a
moment other than beat 0, that is the next thing.
