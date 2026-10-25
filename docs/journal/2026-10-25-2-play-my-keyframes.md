# 2026-10-25 (2) — the flicker is the play mode, not the rendering

🧪 No code change. Follows [10-25-1](2026-10-25-1-the-keyframes-were-not-being-drawn.md).

After 10-25-1's fixes, Ryan still saw the engine's pose while playing and scrubbing. The solved pose
only *"flicker[ed] in"* at single spots (35%, 57%), and was gone a step either side.

**Cause:** the play dropdown was on **"play: the move as solved"** (`mode = "solver"`). In that
mode `tracks` is empty (`Review2Scene.tsx:480`), so no keyframe plays. The only keyframe drawn is
the one **exactly at** the paused moment (`overrides`, `sameMoment`), shown as the editable pose
there. The solve put a keyframe every 2.5%, so 35% and 57.5% landed on one and 36.6% didn't. My
10-25-1 checks seeked by script to exact keyframe moments (0.25, 0.375, 0.5, 0.75), so they took
the same path and missed this.

**Fix: choose "play: my keyframes".** Checked in a browser in that mode. Scrubbed off a keyframe to
36.6%, the beau's held arm draws raise 169° and the couple width is 103 cm, which are the solve's
values, not the engine's 149° and 92 cm. Playing through, the solve's values (width 102–126 cm)
are held from 44% round to 2%.

**Naming trap, worth fixing later:** "the move as solved" means **square-one's engine**, not the
whole-move solver (`whole-move.ts`). With both in play, the label reads as the opposite of what
it does. Something like "play: the engine's move" would fix it.

10-25-1's three faults were real: before them, "my keyframes" would also have drawn nothing
(no dancers found), drawn the hand off the forearm's axis, and taken the hand's turn from the
floor.
