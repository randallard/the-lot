# 2026-10-18 (2) — a dial moves the picture

After `2ba0189`/`9a52252` (the posing screen, committed and pushed). Ryan: *"add a checkbox to
keyframe detail view so we can deactivate for individual couple while troubleshooting — then
write it up so moving the dial updates in the view."*

## Moving a dial now moves the dancers

- **`applyToRigs`** (`pose-dials.ts`) is the inverse of `readRigs`. It writes dial values straight
  onto the drawn rig: mesh rotations, the elbow group's position out of the shoulder (upper arm
  raise / toward / length), the elbow group's rotation (forearm pitch / heading), the forearm
  and hand scaled along it (length), the hand's Euler, and the rig's floor position and facing.
  Couple width goes last, moving both dancers about their middle. 4 round-trip tests, including
  the L: upper arm straight out to the side, forearm level and forward, reads 90° at the elbow.
- **It moves the picture, not the solver.** You get exactly what you dial, on top of the posed rig,
  with no rule keeping anything else right. The shoulders don't follow a torso lean, and a hold
  can come apart. That's deliberate for a posing tool, and it's the honest state of it.
- **Elbow bend is a readout.** It's fixed by where the upper arm and forearm point, so it no
  longer has a slider.
- **`PoseOverride`**, one per couple, is mounted after that couple's `DanceFloor` (and keyed on
  the figure, so a remount can't put it first). Its frame callback runs after the floor's. A
  paused floor writes nothing, so the override holds. When the values change, the screen
  dispatches `repose`, which re-seeks every floor to restore the solver's pose before the new
  values go on.
- **What each couple wears** is derived in the screen (`overrides`), paused only: its own
  keyframe at this moment, plus the unkept edits where they'd land if kept. That's the
  highlighted couple alone; or, with nothing highlighted, every unlocked couple without its own
  keyframe here. So with nothing highlighted, dragging a dial shows the change on every couple
  it's about to reach.

## The troubleshooting switch

The keyframe card has **"active on X → Y"**: a per-couple, per-keyframe off switch held in the
session reducer (`mute`, `muted`). It's session only and never saved, because it's for seeing a
couple without one keyframe, not a decision about its timeline. "Hide for this couple" is that
decision. A muted keyframe drops out of that couple's view and, on the focus couple, out of the
dials.

## Not yet

- **Playing the keyframes.** Play still shows the solver, and overrides apply only while paused.
  The next step is easing between keyframes: each couple's own timeline, with the solver before
  the first keyframe and after the last.

1080 passed, the same 38 failing. Not looked at in a browser. Uncommitted.

## Then: playing the keyframes

Ryan: *"go ahead with playing the keyframes."*

- **`sampleTrack`** (`pose-dials.ts`, 3 tests) gives a couple's pose at `t` from its keyframes.
  Each value eases **linearly** between the keyframe before and the one after, and angles go the
  short way round (+170° → −170° passes 180°). It returns `undefined` before the first keyframe
  and after the last, which leaves the solver playing there.
- **Per couple.** With *play: my keyframes* on, the screen builds a track for every couple from its
  own `pairingTimeline` (its own keyframes over everyone's, or its locked copy), less what it hides
  and what's muted for it.
  - `PoseOverride` samples the track at the floor's clock every frame (the focus floor's `onBeat`
    keeps it current, paused or playing) and writes it after the solver.
  - Any dial values set at this moment go on top while paused.
  - Paused between keyframes, the dials read the eased pose, so between keyframes a dial shows what
    the draft is doing.
- **Repose key** now includes the mode, the event count and the mutes, so leaving keyframe mode or
  deleting a keyframe puts the solver back.
- **The bottom timeline** shades the focus couple's keyframed stretch in keyframe mode.

⚠️ **Expect a jump** where a couple's keyframes start and stop: keyframes and solver switch
outright, with no blend. Keyframes at 0% and 100% make the whole move the couple's own. A blend
into and out of the solver would need the solver's pose read while overriding it. That's possible
while playing (the floor re-poses every frame) but not while paused, so it's left until it's wanted.

1083 passed, the same 38 failing. Not looked at. Uncommitted.

## Then: eased, and blended at the edges

Ryan: *"blend the edges and ease in and out."*

- **Ease in and out.** Between two keyframes the blend is now `ease(u) = u²(3 − 2u)`
  (smoothstep), so a couple slows leaving a keyframe and slows arriving at the next.
- **Blend the edges.** Over the `EDGE_BLEND` (a tenth of the move) before a couple's first
  keyframe, its pose blends from the solver's into the keyframe, and over the tenth after its last
  it blends back. Further out the solver plays. That's continuous at the keyframe itself: no pop.
- **Where the solver's pose comes from.** `PoseOverride` reads it off the rig **before** writing
  over it:
  - every frame while playing, because the floor re-poses every frame;
  - while paused, on the frame of each seek, because the floor poses once and then holds. Every
    scrub, step and repose is a seek, so the cached pose is always the one at `t`.
- **`mixPoses`** (pure, angle-aware) does both blends. `sampleTrack` takes the solver pose as an
  optional third argument and keeps the old behaviour without it.
- **The timeline band** in keyframe mode now fades in over the blend-in stretch and out over the
  blend-out stretch.

8 dial tests (5 new or changed); suite 1084 passed, the same 38 failing. Not looked at in a
browser. Committed with the rest of today's dial and keyframe work.
