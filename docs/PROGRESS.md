# Progress & Status

_Last updated: 2026-07-25_

## Status / next

**Status:** A real, working R3F application with no dance subsystem and, until today, no
docs. The world, tutorial, NPCs, phone, chat, emotes, body/eye editors, game launching, and
backup/restore all work and have been played. Code development paused around 2026-04-06
(`609e989`); this entry resumes the repo as part of the square-dance arc.

**What just happened (2026-07-25):** the docs half of the ADR-0002 retrofit. `docs/adr`,
`docs/journal`, `docs/reviews`, this file, and a real README now exist; the root `journal/`
and `plans/` moved under `docs/` with history preserved; and **seven ADRs were backfilled**
for decisions taken between 2026-03-06 and 2026-03-28, each evidenced against the code and
the commit that introduced it. No `src/` changes were made — deliberately, so the retrofit
creates no merge surface against M4.

**Next: M4 — the choreography adapter.** A new `src/dance/` subsystem that drives NPCs from
the square-one engine. Everything needed to start it cold is in
[What M4 actually contains](#what-m4-actually-contains) below. It is blocked on square-one
milestone M2 (a consumable package with real `exports` and a v0 tag) — check
`~/Development/square-one/docs/PROGRESS.md` for whether that has landed.

**Also open, and parallelizable — handed to waed-7561 2026-07-25:** the **CI + supply-chain
half** of the retrofit. There is no `.github/` in this repo at all. It does not block M4, but
it is **not a copy job**: `pnpm lint` currently fails with 61 errors, and ~26 of those are
`eslint-plugin-react-hooks` v7 objecting to ADR-0002's deliberate shared-ref pattern. Full
handover in [What the CI half actually contains](#what-the-ci-half-actually-contains).

## Architecture

townage is the **world** repo of the square-dance game family planned in
`~/Development/work/square-dance-planning/` (its ADR-0003 set the repo split). It owns the
world-interaction chunks of the arc: gesture building blocks, two-couple square encounters,
full-square progression, the club layer, and the IRL club bridge. It consumes **square-one**
for choreography and owns none of it.

This repo's own decisions ([full index](adr/README.md)):

- 3D renderer: React Three Fiber over three.js — [ADR-0001](adr/0001-react-three-fiber-over-babylon.md)
- Cross-layer per-frame state: shared refs, not React state — [ADR-0002](adr/0002-shared-refs-across-the-r3f-dom-boundary.md)
- Rush navigation: one numeric enum — [ADR-0003](adr/0003-rush-mode-as-a-numeric-enum.md)
- Game state: facts stored, phase derived, UI override — [ADR-0004](adr/0004-derived-phase-with-ui-override.md)
- Games: separate deployments, URL-hash handoff — [ADR-0005](adr/0005-games-launch-by-url-hash-handoff.md)
- NPC dialogue: serverless proxy, opt-in, degrading — [ADR-0006](adr/0006-npc-dialogue-through-a-serverless-proxy.md)
- Storage: `localStorage` only, versioned backup file — [ADR-0007](adr/0007-localstorage-with-a-versioned-backup-file.md)

Inherited from the planning effort: **ADR-0002** (retrofit this repo, don't restart) and
**ADR-0006** (consume square-one as a pinned git dependency with a local link during
co-development).

## What works

Played and working:

- **The world** — white void with fog, ground plane, follow camera with cutscene zoom
  (`world/`).
- **The tutorial** — two-part bot discovery at hardcoded spawn points, rush navigation with
  a directional arrow, drag-to-assemble modal, NPC Ryan's introduction, phone hint, free play.
- **Four NPCs** — NPC Ryan plus Myco, Ember, and Sprout, at hardcoded world positions
  (`MYCO_POS`, `EMBER_POS`, `SPROUT_POS` in `world/World.tsx`), each with a personality
  config, per-game reactions, and a friendliness score that nudges on play and chat.
- **The phone** — homescreen plus Find, Messages, Settings, Games, Town Report, and per-NPC
  rank detail. Keyboard shortcuts `f`/`m`/`s` on the homescreen.
- **NPC chat** — opt-in Claude Haiku dialogue through the `api/npc-chat.ts` edge proxy, with
  structured tool-use replies, support escalation, a daily mood check, NPC "sleep" as a
  rate limit, and a full emoji fallback path for players who decline (ADR-0006).
- **Game launching and return** — Spaces Game and King's Cooking, launched by URL-hash
  handoff with session reuse for unfinished games, plus async result pickup from Vercel KV
  for games abandoned without returning (ADR-0005).
- **Emotes and animation** — `AnimationController` with a play queue, an interrupt stack
  (depth-capped at 10), 0.25s crossfade blending, and loop support; an emote panel and an
  in-game emote builder.
- **Character editors** — body shape, eye, and arm-action editors with live preview, all
  parameterised over primitive geometry (`services/body-shapes.ts`).
- **Backup and restore** — versioned export/import (`BACKUP_VERSION = "1.1.0"`) with fixed,
  dynamic, and optional key classes (ADR-0007).

**Tests: 160 of 162 pass** (15 files). Two fail in
`src/services/fetch-pending-results.test.ts` — *"returns results from API response"* and
*"sends DELETE to clean up consumed results"*. Both are in the async-result pickup path
(ADR-0005) and were failing before the docs retrofit began; the retrofit touched no `src/`.
Worth fixing before M4 so the suite is a clean baseline.

Note: `pnpm test` currently refuses to run behind pnpm's build-verification gate
(`ERR_PNPM_IGNORED_BUILDS` on `esbuild`). Either run `pnpm approve-builds` once, or invoke
`./node_modules/.bin/vitest run` directly.

## What's stubbed, dead, or unfinished

- **`board-creation` is wired but unreachable.** The phase, its resume point, and its
  `BoardCreator` UI all exist and are handled in `App.tsx` — but nothing sets it. The comment
  at the call site says "kept for potential future use". Board creation moved into the games
  themselves.
- **`docs/plans/npc-documentation-lookup.md` is unimplemented.** It designs a "booklet" for
  NPC Ryan — static markdown under `public/docs/` plus a keyword index, fetched on demand via
  tool use. There is no `public/docs/` directory and nothing in `src/` references it.
- **`docs/plans/gettcheese-tutorial-game.md` is largely superseded.** It plans an in-phone
  tutorial with a ported game engine under `src/game/`. That directory does not exist; the
  games stayed separate deployments instead (ADR-0005).
- **`@react-three/rapier` is a dependency with zero imports.** Physics was provisioned, never
  adopted (ADR-0001).
- **`src/npc/`, `src/bot-play/`, and `src/overlay/games/` are empty directories.** *They are
  not abandoned repo structure* — `git ls-files` returns nothing for all three and no commit
  in the repo's history has ever touched them. They are untracked local remnants on one
  machine, invisible to a fresh clone. Safe to delete; nothing to salvage. (Recorded because
  the M3 handoff brief flagged them as an open question — this is the answer.)
- **`FIXED_KEYS` in `backup.ts` covers 12 of the 23 `townage-` keys the code writes**, with
  no test asserting the namespace is fully accounted for (ADR-0007).
- **`BotParts.tsx` types its `rushMode` prop as `RefObject<number>`, not `RefObject<RushMode>`** —
  a small type-safety hole at the one site that writes `2` (ADR-0003).
- **Debug `console.log` calls remain** in `App.tsx`, `useGameState.ts`, and elsewhere,
  including one wrapping `setShowChatInfo` purely to print a stack trace.
- **Font rendering on Linux** — an unresolved 2026-03-06 finding. Courier New isn't installed;
  the fallback renders oddly at 12px. Deferred, no clock on it; see
  [`reviews/README.md`](reviews/README.md).

## What M4 actually contains

*This section is the M4 handover. It should be enough to start the work cold.*

A new `src/dance/` subsystem in townage, consuming square-one:

- **Frame** — the unit-square ↔ world transform (dance-floor origin, scale, orientation).
  square-one's square frame is abstract and **re-fits to actual dancer positions** as a
  square migrates, so this transform has to respect that drift rather than pin dancers to
  fixed floor coordinates.
- **Driver** — ticks square-one's performance stepper from `useFrame`, feeds the player in as
  an **externally-driven dancer**, and writes position and facing onto dancer rigs. Per
  square-one's ADR-0007 the stepper is the primary interface; ideal path data is what it
  produces with every performance coefficient turned off.
- **Blend contract with the existing animation system** — choreography owns transform and
  facing; emotes own pose. The seam is **not clean**, and the specifics matter:
  - `AnimationController.tick()` returns a `ResolvedPose` — arm rotations, head delta,
    body lean, `bodyDeltaY`, `bodyDeltaRotY`. It is pose-only. Nothing in it moves a
    character through the world.
  - But `Player.tsx` currently gives emotes a **veto over locomotion** (`else if (!isEmoting)`
    guards the movement branch) and lets them **overwrite facing** (`rotation.y` is set from
    `emoteBaseRotY + bodyDeltaRotY` while emoting). A driver that owns transform and facing
    collides with both. Resolving that is the first real design decision of M4 — and it
    deserves an ADR.
  - Grip-bearing blocks (square-one's `arm-turn`) carry hand semantics that must drive arm
    poses, so the driver has to **request poses through `services/arm-actions.ts`** rather
    than bypass the animation system.
  - `bodyDeltaY` is a *visual* offset only — `positionRef` stays at ground level. The driver
    should follow that convention.
- **`<DanceFloor>`** — places N dancers, N ∈ {2, 4, 8}. Two-couple-safe: don't hard-code 8.

**Done when:** a debug scene has two NPCs looping Dosado, driven by square-one. That render
is also what **validates square-one's provisional waypoints** — its Dosado spec marks them
"provisional until rendered", so M4 is the check three calls of geometry are stacked behind.

**Before starting**, read in this order:
1. `~/Development/square-one/docs/PROGRESS.md` — is M2 (consumable package) done?
2. `~/Development/square-one/docs/adr/0007-stepper-primary-ideal-paths-derived.md` — the interface you're consuming.
3. `~/Development/square-one/docs/spec/calls/dosado.md` — the first call to render.
4. `~/Development/work/square-dance-planning/PROGRESS.md` — the cross-repo milestone table.

**Expect to write ADRs** for: the emote/choreography blend contract, and how teaching content
(which NPC teaches what, unlock ordering) is represented — the planning effort's proposal is
that it's townage data, keeping square-one pure, and it comes due at M5.

## What the CI half actually contains

*This section is the handover for the trailing half of the ADR-0002 retrofit. It should be
enough to start the work cold. Measured against this repo on 2026-07-25 — the numbers below
are real, not estimates.*

Copy from `~/Development/cr-ci-cd-rust-typescript-template`: `.github/workflows/{ci,docs-hygiene,stance-review}.yml`
and `scripts/docs-hygiene.py`.

**The workflows need no adaptation.** `ci.yml` opens with a `detect` job that sets
`rust`/`ts` outputs, and every downstream job is gated on it — so in a TypeScript-only repo
the Rust gates, Kani proofs, and `cargo-deny` all self-skip. Don't edit them to remove the
Rust half; that's the template working as designed.

**`docs-hygiene.py` already passes here.** Run against this repo it reports *"docs hygiene
clean"* with one warning (no stance review recorded yet — expected, `docs/reviews/README.md`
explains the cadence). This gate can land green immediately.

**`ci.yml`'s `ts-gates` job will not.** It runs `pnpm install --frozen-lockfile`, `pnpm lint`,
`pnpm test`, `pnpm build`, and the first three all have problems today:

1. **`pnpm lint` fails: 61 errors, 25 warnings** (`eslint .` exits 1). The breakdown is the
   important part:

   | Count | Rule | |
   |---|---|---|
   | 24 | `no-empty` | mechanical |
   | 13 | `react-hooks/immutability` | **architectural** |
   | 6 | `react-hooks/refs` | **architectural** |
   | 4 | `react-hooks/set-state-in-effect` | **architectural** |
   | 2 | `react-hooks/purity` | **architectural** |
   | 1 | `react-hooks/preserve-manual-memoization` | **architectural** |
   | 11 | `no-unused-expressions`, `no-unused-vars`, `no-explicit-any`, `no-non-null-asserted-optional-chain`, `react-refresh/only-export-components` | mechanical |
   | 25 | `react-hooks/exhaustive-deps` | warnings, non-blocking |

   The ~26 `react-hooks/*` errors are **not incidental** — they are `eslint-plugin-react-hooks`
   v7's compiler-aligned rules objecting to the shared-ref pattern this repo adopted on
   purpose ([ADR-0002](adr/0002-shared-refs-across-the-r3f-dom-boundary.md)). Mutating
   `out.current!` inside `useFrame` *is* the pattern; the linter calls it modifying a hook
   argument. So this is a decision, not a cleanup, and it needs an ADR either way:
   - narrow rule exceptions for the ref-plumbing boundary (keeps ADR-0002, documents the
     tension), or
   - change the pattern (supersedes ADR-0002 — expensive, and M4 is not the moment).

   **Do the mechanical 35 first and land CI with the `react-hooks` rules explicitly
   configured**, so the gate goes green without pretending the question is settled.
   Note this is live evidence for the repo's open question *"when does the ref-plumbing
   pattern break?"* — the tooling is already answering it.

2. **`pnpm test` fails: 2 of 162 tests**, both in `src/services/fetch-pending-results.test.ts`,
   both pre-existing and unrelated to any of this. Worklist item 1 — fix before CI lands, or
   CI is red on arrival for a reason nobody introduced.

3. **`pnpm install --frozen-lockfile` will likely hit pnpm's build-verification gate** —
   `ERR_PNPM_IGNORED_BUILDS` on `esbuild`, the same gate that stops `pnpm test` locally. Add
   `pnpm.onlyBuiltDependencies: ["esbuild"]` to `package.json` so CI and local behave the same.
   (`"test": "vitest"` is fine unchanged — vitest detects CI and runs once rather than watching.)

`stance-review.yml` needs no code changes; it only opens/bumps an issue monthly and never
gates, so it can land as-is (`issues: write` permission is already declared in the workflow).

**Done when:** all three workflows are committed, a push to `main` runs them, and the CI run
is green — with any suppressed lint rule justified in an ADR rather than silently disabled.

**Out of scope:** `src/dance/` (that's M4), and superseding ADR-0002.

## Worklist

1. **Fix the two failing `fetch-pending-results` tests** — clean baseline before M4 *and*
   before CI, which runs them.
2. **M4: `src/dance/`** — frame, driver, blend contract, `<DanceFloor>`. See above.
3. **CI + supply-chain gates** — the trailing half of the retrofit. No `.github/` exists yet.
   Parallelizable onto another machine; due before the arc's M6. See
   [What the CI half actually contains](#what-the-ci-half-actually-contains) — it is not a
   copy job; `pnpm lint` currently fails 61 errors and ~26 of them are ADR-0002's pattern.
4. Delete the three untracked empty directories; tighten `BotParts`'s `rushMode` prop type;
   strip debug logging.
5. Add a test asserting every `townage-` key is accounted for in `backup.ts`.
6. Arc chunk 1 (M5): an NPC teaches `arm-turn`, the player performs it, townage records that
   they know it. Needs the teaching-content ADR.

Deferred with reasons: physics (rapier is installed but unused — adopt it when something
needs it, not before); the NPC documentation "booklet" plan; the in-phone gettcheese tutorial.

## Open questions

- **Emote/choreography arbitration** — who wins on facing and locomotion when both want them?
  Due at M4, first thing.
- **Teaching-content representation** — townage data or square-one? Proposal: townage. Due at M5.
- **When does the ref-plumbing pattern break?** ADR-0002 names a promotion condition: the
  per-entity `<name>ScreenPos` refs grow linearly with the cast, and `<DanceFloor>` needs to
  place up to 8 dancers. M4 may be the event that triggers replacing them with a keyed
  registry.
- **Database / backend: deliberately not yet.** Everything is client-side (ADR-0007). The
  named trigger for the backend deliberation is the arc's **social layer** — sharing custom
  moves, sequences, and tips *between people*. Until then: versioned plain-data files.

---

_History accretes below, oldest first. See [`journal/`](journal/README.md) for the narrative
and [`reviews/`](reviews/README.md) for stance reviews._

- **2026-03-06** — Repo scaffolded. White void, two-part bot discovery, rush navigation,
  drag-to-assemble, pocket inventory, mobile joystick. R3F chosen over Babylon; the shared-ref
  pattern and the derived-phase model both established the same day. See
  [`journal/2026-03-06-session-1-white-void-and-bot-parts.md`](journal/2026-03-06-session-1-white-void-and-bot-parts.md).
- **2026-03-07 → 2026-04-06** — Undocumented at the time; reconstructed from commits. Phone
  tutorial, the NPC chat proxy and game-launch handoff (`a2f71fa`), keyframe and emote UI,
  backup/restore (`5b58561`), eye and body editors, slider and phone polish (`609e989`).
- **2026-07-25** — Docs retrofit (planning M3). `docs/` stood up, root `journal/` and `plans/`
  moved in, README replaced, seven ADRs backfilled, this file created. No `src/` changes. See
  [`journal/2026-07-25-docs-retrofit.md`](journal/2026-07-25-docs-retrofit.md).
