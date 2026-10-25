# 2026-10-24 (4) — the whole-move test run: a twirl with no clipping, solved

🧪 Exploratory, no ADR. **Uncommitted** with the rest of today. Brief:
`work/square-dance-planning/briefs/solve-the-whole-move.md`. Ryan: *"write the brief, then start
the test run"*, and on move descriptions, *"phases with timing should be something we can infer -
that and hands joining … get a close approximation then add the information as we discover
gaps."*

## What's built

- **`src/dance/whole-move.ts`** (pure, +5 tests in `whole-move.test.ts`):
  - A forward model of the drawn rig in `#review2`'s own dials. Checked against the live scene:
    within 8 mm at every joint, which is the dials' rounding.
  - Capsule and sphere collidables, including the **undrawn upper arm**.
  - The objective: no clipping (between dancers, and limbs against one's own head and torso), held
    hands meet, an optional arch plane, smoothness on every variable, stretch, free arms rest,
    held arms low (gravity), the shoulder's range, and the beau stepping out (along the line from
    her, sideways costs 25×).
  - `solve`: Adam over all samples at once, with per-sample central differences and exact
    smoothness gradients.
  - `metrics`: clipping, hold gap, jump between samples, stretch, step. The same numbers for the
    floor's pose and the solver's.
  - Two-bone IK (`reachArm`, `startOnPath`) for the starting shape, and dials both ways (`toDials`,
    `fromDials`).
- **`scripts/whole-move/solve.ts`**: `npx vite-node scripts/whole-move/solve.ts [paths.json]
  [iterations]` writes `<pairing>-<figure>.solved.json`, a `townage-pose-events` bundle with 41
  keyframes scoped to the pairing, for `#review2`'s 📂 load.
- **`scripts/whole-move/ryan-ryan-twirl.paths.json`**: the floor paths, captured from the live
  `#review2` (`readRigs` at t = i/40).

## The result, ryan → ryan, California Twirl (3000 iterations, 44 s)

| | the floor today | solved |
|---|---|---|
| samples clipping > 1 cm | 35 / 41 | **0** |
| worst clip | 19 cm (her held forearm through her own head, t 0.625) | **0** |
| biggest jump between samples | 122° (beau's right forearm, t 0.375) | **23°** (her forearm, t 0.95) |
| max stretch | 2.38× | **1.48×** |
| held hands apart beyond a clasp | 6.9 cm | **0.9 cm** |
| beau's step out | – | **≤ 15 cm** (1.00–1.06 m apart over beats 1–3, against the floor's 0.91) |

The joined hands are at 0.65 m at beat 0, 1.18 at 0.4, 1.53 at 0.8, **1.72 over her crown at
beat 2** (13 cm above it), 1.51 at 3.2, and 0.58 at 4. Nothing asked for that timing; it falls
out of her head crossing the arch's plane. They rise earlier than in the twirl2 stills because
NPC Ryan's head (0.68 m across) reaches the plane at beat 0.8.

## What it took: four attempts, and the lesson in them

1. **Arms start at rest, a fading pull on the hands, everything else free.** No clipping, but the
   hands stayed at 0.80 m and went **round** her. The upper arm wasn't a collidable (it isn't
   drawn), so her arm passed through her own body.
2. **The upper arm collides; there's a shoulder range.** The hands still went round. The beau
   walked up to 48 cm round her to keep her hand in front.
3. **The beau steps out only along the line from her, and the arch keeps to its plane** (the 10-19
   reading: *"up in an arc on the same plane"*). The hands kept to the plane, but passed beside
   her at shoulder height, squeezing past her neck at 1.6 cm (clipping was cheaper than lifting).
   Stiffer clipping made it worse: a 179° flip.
4. 🔑 **The start has the right shape**: the held hands placed by IK on an arc over the exchange,
   elbows out. Then the solve runs with **no guide at all**. That converged to the table above.

🔑 **A local optimiser can refine a shape but can't discover one.** Over the head and round the
side are separate valleys, and every path between them goes through her body. Timing, heights,
spacing and smoothness were inferred. The **topology** (the hands go *over* the turner) had to
come from the move. Here it came from two facts: the engine says the grip is an arch, and the
10-19 reading says arches stay in one plane. That's the piece of a move description that can't be
inferred. It's also where a learned model (or a search over starting shapes) would earn its keep.

## Not modelled yet (the gaps)

- **Elbow hinge direction**: nothing stops an elbow bending backwards; not checked visually yet.
- **No duck**: `torso.length` doesn't move the head or shoulders. Head tilt and torso lean aren't
  variables.
- **Beat 0 is high**: 0.65 m against the stills' low handhold. Gravity is weak at the ends and
  nothing says where a standing handhold sits.
- **The end drops fast** (the 23° jump at t 0.95). The plane stops at 3.5 beats and the hands fall
  to the ordinary hold in half a beat.
- **Speed**: 44 s per pairing × move offline. Fine for baking the cast's 25; too slow for a
  live button.

## Seen

In `#review2` by painting the solved keyframes straight onto the rigs (nothing written to the pose
store), floor vs solved at beats 0–3. The hands go over her head and the beau's arm is up and
over. NPC Ryan's heads hide most of it from every angle. **Ryan hasn't watched it play yet.**
Loading the bundle with 📂 load adds 41 keyframes to `ryan-ryan` in his saved pose store, so that
waits for his say.
