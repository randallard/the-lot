# 2026-10-26 (3) — exact gradients, and the solve in a web worker

🧪 Exploratory, no ADR. Step 2 of the reordered plan
(`work/square-dance-planning/briefs/solve-the-whole-move.md`, "Order, revised 2026-10-26"):
make the solver fast enough for the browser, and measure it.

## What was built

- **`frameCostGrad`** (`whole-move.ts`) returns `frameCost`'s cost and its exact gradient.
  - Every term's derivative is taken with respect to the shapes' end points, then carried back
    through `toFloor` and `armPoints` to the dials and the beau's step.
  - A clearance term's derivative is the direction between the two capsules' closest points. The
    closest points are a minimum, so moving along them doesn't change the distance to first order.
  - Flat typed arrays, with no allocation in the loop. What doesn't change during a solve (what's
    held, which pairs may touch, each sample's targets) is worked out once (`planOf`).
  - `frameCost` stays as the readable statement of the terms. The test holds `frameCostGrad` to it.
- **`solve` options:** `gradient: "exact" | "numeric"` (exact is the default), `rateEnd` (the step
  falls geometrically), `jitter` (noise on each step, falling with it) and `seed`.
- **`SCHEDULE` and `solveBest`:** the schedule below, and the best of N seeds.
- **`whole-move-twirl.ts`:** the twirl's `Move` and its start, lifted out of `solve.ts` so the
  script and the browser build the same problem. It gives byte-identical keyframes to before.
- **`whole-move.worker.ts` + `whole-move-client.ts`:** `solveInWorkers(move, options, tries)` runs
  each seed in its own worker and keeps the cheapest.
- **`solve.ts` flags:** `--gradient`, `--tries`, `--seed`, `--rate`, `--rate-end`, `--jitter`.
  `numeric` runs exactly as before 10-26.

## Exact vs numeric: the same gradient, a different valley

- **The gradient is right.** On the twirl's own poses, `frameCostGrad` matches central differences
  to 2e-8 relative. On random overlapping poses (every term active) it matches to 1e-4, which is
  rounding.
- **It's 87× faster:** 3,000 iterations take **0.5 s against 43.5 s**.
- **But plain Adam with it settled worse:** cost 159 and a worst jump of 31° on every step size
  tried, against the numeric run's 148 and 26°.
  - **Why:** Adam scales each variable's step by that variable's own gradient size. Central
    differences leave a little rounding and kink noise on variables whose true gradient is zero. A
    free arm sitting exactly at its pitch limit, for example, shows −1e-4 where the exact gradient
    is 5e-15. Adam had been turning that noise into full-sized steps, and that shake carried the
    numeric run into a better valley.
- **So the shake goes back in on purpose (`SCHEDULE`):** 6,000 iterations, with the step falling
  from 0.04 to 0.001 and noise of half a step on top. Constant noise just makes a mess (cost
  4,445 at a full step), so the noise falls away with the step and the run settles.

## Measured (ryan → ryan twirl, 6 cm margin)

Over 8 seeds, none clip. The results fall into two valleys:

| seeds | cost | worst jump | beau's step-out |
|---|---|---|---|
| 1, 3, 5, 6, 8 | 137–138 | 17–23° | 21–29 cm |
| 2, 4, 7 | 147–162 | 27–30° | 28 cm |
| *the committed solve (numeric, 10-24)* | *148* | *26°* | *26 cm* |

The best of 4 reaches the good valley about 98% of the time. With the default
(`solve.ts` with no flags), it picks seed 3: **cost 137, worst jump 20.5°, step-out 20.5 cm,
nothing nearer a head than 5.2 cm.** Ryan's 150° keyframe test (10-26-2) still lands at 152.5°.

| where | what | time |
|---|---|---|
| node | one seed | 1.4 s |
| node | best of 4, one after another | 5.4 s |
| Chromium, main thread | one seed | 1.43 s |
| Chromium, 4 workers | best of 4, side by side | **1.6 s wall** |
| Chromium, 8 workers | best of 8 (found 17.4° worst jump) | 1.8 s wall |

The browser gives the same costs as node, seed for seed. The machine has 32 cores.

## What it means for the north star

- **One couple's twirl now solves in the browser in about 1.5 s,** off the main thread, so the
  page keeps drawing.
- **That isn't live for five squares.** 20 couples at 1.4 s a seed is about 28 core-seconds:
  roughly 3.5 s on 8 cores at one seed each, against a budget of a beat or two (1–2 s). This is
  what the brief expected, and it's why step 3 (a small model, with the solver as teacher and
  polisher) is next. A polish started from a good guess needs far fewer than 6,000 iterations,
  and that's the number to measure there.
- **Solving per dancer at onboarding time is already fine:** seconds, in the background.

## Not done

- **The committed solve and its bake weren't regenerated.** The new solver's twirl is smoother
  (20.5° against 26°), but it's a different-looking twirl, and Ryan should see it first. It's
  written to `scripts/whole-move/ryan-ryan-california-twirl.exact.json` for 📂 load.
- **There's no button in `#review2` yet.** The worker is reachable from code (and from the console,
  as measured). A "solve this pairing here" button needs the live paths read off the floor
  rather than from a captured file.
