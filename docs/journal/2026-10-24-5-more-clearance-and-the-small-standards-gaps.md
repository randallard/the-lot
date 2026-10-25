# 2026-10-24 (5) — 6 cm of clearance round the heads, and the small standards gaps

🧪 Exploratory, no ADR. **Uncommitted**, with the rest of today.

## Clearance

Ryan watched the ryan → ryan bundle from [10-24-4](2026-10-24-4-the-whole-move-test-run.md):
*"pretty good but there is still a little bit of clipping … the arms / hands could be farther
from the head when the belle turns under."*

The clearance was `WEIGHTS.margin` in `src/dance/whole-move.ts`: **2 cm**, with no way to change
it from the command line. `scripts/whole-move/solve.ts` now takes `--margin=<m>` (the default is
still `WEIGHTS.margin`) and prints how close anything comes to either head. It measures this on
the samples and **halfway between them**, because playback eases from keyframe to keyframe and a
clean pair of samples can still clip in between.

| ryan → ryan | 2 cm (1500 it) | 6 cm (3000 it) |
|---|---|---|
| closest to a head, on samples | 1.8 cm (her head / his hand, t 0.175) | **5.7 cm** |
| closest to a head, halfway between | **0.6 cm** (his head / her upper arm, t 0.988) | **5.5 cm** |
| max jump | 23° | 26° |
| max stretch | 1.53× | 1.60× |
| beau's step out | 20 cm | **26 cm** (1.40 m apart at beat 4, against the floor's 1.14) |

The 0.6 cm between samples is probably the brushing Ryan saw. The 6 cm run keeps clear everywhere
it's measured, and it pays for that with a little more stretch and a wider step out, mostly at the
end. 🔑 The capsules stand in for the drawn mesh. If the drawn head or hands are bigger than the
capsules, there could still be visible contact the checker misses; Ryan's eye is the test.

`scripts/whole-move/ryan-ryan-california-twirl.solved.json` is the 6 cm, 3000-iteration bundle.
The 2 cm one Ryan loaded is no longer in the tree (it was never committed). Loading the new one
writes over the same 41 keyframes on `ryan-ryan`.

## The small standards gaps ([compliance 2026-10-24](../compliance/2026-10-24.md))

- **`timeout-minutes`** on every job: 15 minutes, 30 for `rust-proofs` (the template's values).
  `osv-scan` has none, because it calls a reusable workflow and GitHub rejects the key there.
- **`pnpm-workspace.yaml`:** the stale `square-one@…1f0ee7ae…: set this to true or false` key is
  gone. `trustPolicy: no-downgrade` and `blockExoticSubdeps: true` are set explicitly.
  `trustPolicy` rejected **`semver@6.3.1`** at first. That version is npm's own backport of the
  ReDoS fix, published from 6.x after 7.x had provenance, and it comes in via `@babel/core` on the
  dev path. It now has a one-version `trustPolicyExclude` with the reason and a retirement
  condition. `pnpm install --frozen-lockfile` passes and the lockfile is unchanged.
- **`LICENSE-MIT` + `LICENSE-APACHE`**, copied from square-one (Ryan Khetlyr, 2026), and
  `"license": "MIT OR Apache-2.0"` in `package.json`.
- **`.env.example`**, listing the six keys the code reads (`import.meta.env` / `process.env`),
  all blank.

## Found on the way: 24 tests were already failing

`npx vitest run`: **38 failed / 1100 passed**. 24 of them are in `arch.test.ts` and
`arm-pose.test.ts`, and they fail **at HEAD too** (checked in a throwaway worktree of `HEAD` that
shares node_modules, and therefore the local square-one link). So they predate today and aren't
from this change. The other 14 are spread over 7 files and weren't bisected. Nothing in PROGRESS
mentioned them. Cause not looked into. For those 24, the uncommitted work is ruled out, because
HEAD doesn't have it. That leaves the local square-one link (`link-engine` points at
`../square-one`, which is at `675df7c`) as the first suspect.
