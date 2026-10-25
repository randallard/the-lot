# 2026-10-24 (2) — the arch peaks at beat 2; each loop turns around; the spacing runs backwards

🧪 Exploratory, no ADR. **Uncommitted**, waits for Ryan's look. Claude watched it play in a
browser (`#review2=california-twirl/player-myco`, all couples off).

## The lift is a whole-call rise and fall, not one beat (corrects 10-24-1)

Ryan, after 10-24-1: *"the full arch isn't achieved at beat 1 though - the full arch is at beat
two when the belle is under it … they stop at beat one and they should keep moving into
position."* He's right. 10-24-1's `ARCH_LIFT_BEATS = 1` reached 1 at beat 1. With the arc off the
solver's arch is one fixed pose, so from beat 1 to the release (3.5) the arms didn't move.

**Now:** `ARCH_CYCLE_BEATS = 4` and `archLift(beat, from)` is a raised cosine over the call: 0
(handhold) at beat 0, 0.5 at 1, **1 at 2**, 0.5 at 3, 0 at 4. It repeats every cycle, so a span
square-one merged across two Twirls lifts and lowers once per call. That matches the twirl2
stills, `06` in particular (hands low at the waist between the two takes). With the arc on, the
hold is that times the arc's own rise. The rise peaks around beat 1.5–2, because the span ends at
3.5, so the product peaks at 2. 3 tests replace 10-24-1's 2.

## Each loop starts where the last ended (`#review2`)

Ryan: *"is it possible to have the dancers remain facing the way they are when the move ends in
review2 so we can watch first from the front and then from the back?"* A turn-under ends with the
couple **turned exactly π about their centre**. Measured on square-one's twirl: the beau goes
(−0.45, 0) to (0.45, 0) and the belle the reverse, yaw 180° → 360°. So each turned loop draws the
same figure with the couple rotated π inside its `CoupleSlot`. Its first frame is the last frame
of the loop before.

- Session: `turnAround` (default on, the 🧪 **turn around each loop** checkbox) and `turned`, which
  flips on **`wrapped`**. +1 test.
- 🔑 **The floor wraps by itself.** The screen's own `loop` path (beat ≥ end → seek 0) never
  fires in practice: the readout goes 3.98 → 0.00 without reaching 4. So the wrap is detected in
  `onBeat` as the beat jumping from the last fifth to the first fifth while playing. The first
  attempt flipped on `loop` and never turned; the polled label showed it.
- Dial readings are rig-local (`pose-dials.ts`, `worldToLocal`), so the rotation doesn't touch
  them.
- **Seen:** `turned` alternates once per loop, about every 2 s, for 12 s. The wrap is seamless:
  blue left, red right, facing the camera at 3.99, and the same at 0.27 of the turned loop.

## Open: the spacing runs the opposite way to the stills

Ryan: *"up to beat 1 the dancers are taking time to position themselves to achieve the arch, so
they create the necessary distance for their arms to make the move comfortably - see between 0
and 1 we move apart in the pictures, then back to standing distance for beat 4 … we were a bit
lazy in the pictures but that's the idea."*

Measured on square-one's twirl (0.9-wide pair), centre to centre: **0.90 at beat 0, 0.79 at 0.5,
0.70 at 1, 0.63 at 1.5, 0.60 at 2**, then back out to 0.90 at 4. The engine brings them
**closer** into the arch: she walks across the diameter and he walks a semicircle round her. It
never opens up first. The paths are square-one's (ADR-0017: the Twirl walks the Trade's paths), so
the fix is an engine change plus a pin bump. **Not touched; to discuss with Ryan.** Questions:
how far apart at beat 1 (an arm's comfortable span?), and does the beau's semicircle widen or do
both step back?
