# 2026-10-28 (7): the draw budget, measured (step 6)

🧪 Exploratory, no ADR. **Measurement only, no code change.** Two temporary probes were added and
removed: a timer round `DanceFloor`'s `useFrame`, and a hook exposing the three.js scene in
`#review2`. Both files were restored from git.

Ryan, on (6): *"I like it the way it is - let's do 6"*. So the lady stays ahead in the Courtesy
Turn, added here as a body-sized offset over the engine's level turn. Step 6 of the brief: stand
about 20 couples up on bakes; measure the frame time and the clearance between couples; skip
`arm-pose.ts` under a bake once that's measured.

`#review2` already is that floor: 25 couples (every pairing) on bakes, or 25 sets of four (100
dancers) for Right and Left Thru. Measured in Chromium on this machine, whose GPU is integrated
(*ANGLE, Mesa Intel RPL-S*). "JS" is each animation frame's callback (every `useFrame` and the
render submission); "gap" is the time between frames.

## Frame time

| scene | dancers | draw calls | JS p50 / p95 | gap p50 / p95 |
|---|---|---|---|---|
| Twirl, 1 couple shown (24 hidden, still posed) | 2 | 75 | 4.4 / 6.9 ms | 17.8 / 19.6 ms |
| Twirl, 25 couples, bakes on | 50 | 993 | 5.2 / 8.1 ms | 18.2 / 35.1 ms |
| Twirl, 25 couples, bakes off (`arm-pose` only) | 50 | | 4.7 / 7.2 ms | 18.0 / 35.2 ms |
| Right and Left Thru, 25 sets (most off-screen, culled) | 100 | 444 | 4.3 / 6.8 ms | 18.0 / 35.0 ms |

`DanceFloor`'s own per-frame work, 25 couples: **3.33 ms** with bakes off, **4.08 ms** with bakes
on, about 0.15 ms a couple. With bakes on the floor still runs every `arm-pose` rule and then draws
the bake over it.

What it says:
- **The frame is paced by the GPU, not by posing.** The gap sits at about 18 ms (about 54 fps)
  whatever the posing does. It drops frames (35 ms at p95) only when the whole crowd is drawn,
  about a thousand draw calls with shadows; with one couple shown, p95 is 19.6. The JS is a
  third of the frame and barely grows with the crowd.
- **Skipping `arm-pose.ts` under a bake** would save up to about 3 ms of CPU for 25 couples and
  make nothing smoother here. It also isn't free: the floor tracks its own arms under a bake on
  purpose, so a call with no bake picks up where the floor would have been (`DanceFloor`'s
  comment at `applyBaked`), and skipping would need a re-sync at every bake's end. **Left as
  is.** Worth doing when the CPU is the limit (a phone, or a solve in the same thread).
- **The lever for 5 squares is draw calls:** about 20 a dancer with shadows. Merging or
  instancing each dancer's parts, or cheaper shadows, are the candidates. Not measured further.

## Clearance between couples

How far each couple's bodies and arms reach from its slot: every visible mesh's bounding sphere,
measured every frame over the whole figure.

**Twirl** (radius in metres, standing → over the figure):

| couple | standing | twirl | | couple | standing | twirl |
|---|---|---|---|---|---|---|
| ember–ember | 1.89 | **2.47** | | ryan–ryan | 1.28 | 1.54 |
| myco–ember | 1.47 | 2.15 | | player–player | 0.75 | 1.59 |
| ember–ryan | 1.50 | 2.05 | | sprout–myco | 0.96 | 1.14 |
| myco–myco | 1.10 | 1.85 | | sprout–player | 0.74 | 0.95 |
| ember–myco | 1.46 | 1.84 | | sprout–sprout | 0.53 | **0.78** |

**Right and Left Thru**, a set of four (standing → over the figure): widest ember–ryan 2.24 →
**2.65**, ember–myco 2.07 → 2.58, ember ×4 2.13 → 2.55, ryan ×4 1.84 → 2.47; narrowest sprout ×4
1.14 → **1.28**.

What it says:
- **A twirl grows a couple's reach by up to 0.84 m** over standing (player ×4, 0.75 → 1.59; ember
  ×4 +0.58). Two ember couples need **4.9 m** centre to centre to be sure of not touching;
  `#review2`'s default spacing is 3.0 m. These are bounds (any direction, any moment), not
  measured contacts.
- **A full square** puts four couples a side apart. With these reaches, ember's couples need a
  square of about 5 m, sprout's about 1.6 m. How big a square is, and whether neighbouring
  couples dance in step or must clear each other, is the engine's S3 (the squared set) and the
  first thing a 5-squares floor has to lay out.

## Next

- Step 7 (headless path capture, a step-out cap, `solve-all` over the other figures), or the
  draw-call work, as Ryan picks.
- S3, the squared set, in square-one, with these reaches as its spacing inputs.
