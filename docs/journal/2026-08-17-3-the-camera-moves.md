# 2026-08-17 (3) — the camera moves

_Documents commit `d3cd4fb` — *a couple's handhold, solved from the bodies, and the instrument that judges it*. Landed 2026-08-18 after Ryan verified the pose in the running scene._

Ryan:

> add orbit controls to #dance

## The other half of the owed watch

The entry before this one closed step (1) of the watch that has been owed since the handhold
landed — `go home` gets you the *moment*. This is step (2), and PROGRESS has been carrying it with
the same sentence for two days: **"(2) still has no control behind it — the camera does not move,
so a side view means moving the `<Canvas camera>` by hand."**

The two steps are the same instrument. A pose is judged from a chosen angle, and the three
remaining questions each want a different one: the beau's elbow has to be read from the **front**
(is it at his shoulder's lateral offset, is it behind his body), the near-horizontal forearm from
the **side** (the thing that distinguishes today's feature from this week's twice-fixed defect is
the elbow's position along the arm, which a three-quarter view foreshortens), and Ember's undrawn
upper arm from **behind her**, which the fixed camera could not see at all. One angle answered
none of them cleanly.

## Nothing was built

`@react-three/drei`'s `OrbitControls`, which this repo already uses twice — `CharacterPreview` and
`ContactMovePreview` both mount it, both with a raised `target` and clamped distances. Same
component, same idiom, four props.

Two of the four differ from the previews on purpose:

**`maxPolarAngle={Math.PI / 2}`.** The orbit stops at the horizon through the target. This is one
clamp doing two jobs: it makes the **level** side view reachable and holdable (drag up until it
stops and you are exactly at chest height, no fiddling), and it is the same limit that keeps the
camera from ending up under the ground plane looking at the underside of a 24×24 opaque quad. The
floor is not double-sided and the dancers cast shadows onto it; from below the scene reads as an
empty grey field, which is a confusing thing for a debug instrument to be able to show you.

**Panning stays enabled**, where both previews disable it. A preview frames one character who
never leaves the origin. This scene's square *migrates* — that is what `follow drift` exists for —
and following it by hand is a thing you want to be able to do, including looking at a dancer who
is no longer the one in the middle.

`ORBIT_TARGET` is **chest height (0.9)**, not the floor and not the frame centre. Everything this
scene is looked at to judge lives in that band: the solved hold at 0.713, shoulders at 0.950, the
elbows between. Orbiting about the floor would have put "level" at the dancers' ankles and made
every low angle a look *up* at them.

## Watched

Driven from this session (Chromium, `localhost:5173`, `#dance=two-trades`).

- `go home` → `beat 0.0 / 8`, the standing couple, held.
- Horizontal drag orbits; the axis arrows swing with it, so the engine frame stays readable from
  any angle — worth checking, since the red/blue arrows are how you know which way `+x` is and
  they would be useless if they were screen-space.
- Vertical drag up walks the camera down to the horizon and **stops there**: the floor goes
  edge-on, the grid collapses to a line, and further dragging in the same direction changes
  nothing. Confirmed by dragging again from the clamp — identical frame. The clamp holds.
- Vertical drag down reaches the top-down view. Both ends behave.
- Scroll dollies, bounded.

## What this is not

It is not a **view preset**. There is still no "front" or "side" button and no way to get back to
the original three-quarter framing except by dragging or reloading, and the panel state note in
PROGRESS applies here too — the camera is not part of the URL, so a watch cannot be handed over
as a link. If the elbow watch turns out to want the *same* two angles repeatedly, that is the
argument for presets, and it should be made from having wanted them, not from here.

Steps (3) and (4) — the beau's elbow, Ember's — are still owed. Both controls they needed now
exist.
