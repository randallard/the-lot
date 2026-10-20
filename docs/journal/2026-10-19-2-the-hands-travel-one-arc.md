# 2026-10-19 (2) — the twirl's hands travel one arc

🧪 Exploratory, no ADR. **Committed unverified** (Ryan: *"commit and push to local home as
unverified"*). Nobody has looked at it in a browser yet.

Ryan, re-watching the California Twirl video with both takes now filed
(`work/square-dance-planning/review2/reference/california-twirl/`): *"her hand travels in an arc
while she turns … from down and slightly in front of them up in an arc on the same plane to down and
slightly in front of them facing the other direction … her arm doesn't switch sides or cross over,
she walks around it while he holds her hand, his arm up and over."* Asked: put the hands on that
path in `#review2`, and he'll adjust the arms.

## What the motion says

square-one's twirl for a 0.9-wide pair: the arch is held for beats 0–3.5. The belle walks
**straight across** the line between their spots, turning half a circle, and is on the centre at
beat 2. The beau walks a **half circle in front of her** (0.6 out at beat 2) and ends on her spot.
So the plane is **upright, through the centre of the exchange, along the couple's facing**, and the
hands never drift sideways. This agrees with 10-12-1's "the join stays over the centre and she walks
under it", and adds the front-to-back travel and the low ends.

## What's built

- `join-arc.ts`, pure: `planJoinArc` (centre, facing and her turn table, once per span) and
  `joinArcAt` (point, height and rise at a beat). **Where on the arc is how far she has turned**,
  unsigned and unwrapped, as a fraction of her turn across the span. Peak when she's half turned,
  low again as the span ends. 4 tests on square-one's own twirl: one plane, the low ends in front
  and behind, the top as she's on the centre, monotonic.
- `DanceFloor`'s **`joinArc`** (default `false`): on a made arch (not a break) the hold becomes the
  arc point: `over` at weight 1, `height` from low (the standing hold's) to top (her crown plus a
  hand, the 10-12 low join), reach = the standing hold's `forward`, and `raised` = the rise, so the
  upper arms stand up as the hands climb. Part of the span id, so toggling re-plans. The arms solve
  onto the point as onto any hold.
- `#review2`: **🧪 hands on the arc**, on by default, a session-reducer flag (`handsOnArc`, ADR-0065)
  that re-poses a paused floor. `#review` is untouched.

## Watch for

- An arm that can't reach the arc. Short pairs at the top, or the ends if `forward` is more than an
  arm gives. Nothing sizes the figure for the arc yet.
- Beats 3.5–4: the span has ended and the hands ease from the arc's end back to the standing hold.

Suite **1090 / 38 (the same 38) / 3 skipped**, `tsc` clean, eslint 0 errors (the old `DanceFloor`
useMemo warning).
