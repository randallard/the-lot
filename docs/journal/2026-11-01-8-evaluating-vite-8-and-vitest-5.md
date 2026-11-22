# 2026-11-01 (8): evaluating vite 8 and vitest 5

Ryan: *"evaluate vite 8 and vitest 5 in the-lot"*. The 11-01 stance review deferred them until the lint
pass reached zero, and it has. This was a trial in a throwaway worktree at `f51131a`: **nothing here is
adopted, and the repo is unchanged apart from these notes.**

## The trial

`vite` 7.3.7 → 8.3.5, `vitest` and `@vitest/coverage-v8` and `@vitest/ui` 4.1.12 → 5.0.5,
`@vitejs/plugin-react` 5.2.0 → 6.1.2. All support Node 26. One source line had to change:
`src/test/setup.ts` imports `@testing-library/jest-dom/vitest` instead of `@testing-library/jest-dom`.
Without it, vitest 5 loses jest-dom's matcher types: 13 type errors and 13 lint errors in three overlay
test files. The tests themselves still passed.

| | vite 7 + vitest 4 | vite 8 + vitest 5 |
|---|---|---|
| Lint, `tsc -b` | pass | pass, with the line above |
| Tests | 1241 passed, 29 expected fail, 3 skipped | the same |
| Test run | 14.73s | 14.73s |
| `vite build` step | 3.60s | 0.72s |
| Whole `pnpm build` | 8.7s | 5.6s |
| JS, raw | 10.42 MB | 10.23 MB |
| JS, gzip | 1.305 MB | 1.262 MB |
| JS files | 26 | 26 |
| Packages with verified signatures | 479 | 468 |
| `pnpm audit` | clean | clean |

The build moves to Rolldown, the source of the speed. The licence summary has nothing new outside the
allowlist's kinds, though I only read the summary and didn't run CI's `--onlyAllow` check.

**In a browser:** headless Chromium with software WebGL loaded `/`, `#review`, `#review2` and `#voice-test`
from each build. Both had the same canvas and button counts and no console errors. One `#review2` load on
the old build came back short, and repeat loads matched; that's timing in the probe, not a difference.

## Not checked

- **How it looks, or any interaction.** The probe only loads pages. Rolldown's minifier is new here, so
  a playtest should cover the dance screens, the solver's worker and the baked moves.
- The dev server: `vite`, the voice-results middleware, `.ts.net` allowed hosts and HMR.
- Coverage (`@vitest/coverage-v8` 5) and `@vitest/ui`.
- CI and OSV.
- Whether `allowBuilds: esbuild` is still needed. esbuild is still in the lockfile, and its comment says
  vite needs it.

## Recommendation

Adopt, but after the playtest already owed, so that a visual problem has one possible cause. It's a small
change with a real build speedup, and branching-video already runs vite 8.3.5 and vitest 5.0.5.
