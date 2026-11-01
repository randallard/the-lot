# Stance review — 2026-11-01
- Reviewer: Claude, for Ryan
- Previous: [2026-10-31](2026-10-31-stance-review.md)

A full pass, the day after the first, run alongside square-one's
([square-one 2026-11-01](https://github.com/randallard/square-one/blob/main/docs/reviews/2026-11-01-stance-review.md))
and after today's compliance review ([compliance 2026-11-01](../compliance/2026-11-01.md)). What's
new since 10-31: ADRs 0069 and 0070, TypeScript 6.0.3, the tsconfig flags, the strict lint pass
(81 findings left), a new template standard (ADR-1018), and another on its way (ADR-1019). The pnpm 12
deferral was evaluated, since its condition was met on 10-30.

## Checked

1. **Promotion conditions in every ADR (0001–0070).** I re-tested the ones a fact can settle:
   - **ADR-0069** (it replaced 0008), "prefer the plugin's own annotation for an externally-owned
     ref boundary if it ships one": `eslint-plugin-react-hooks`'s CHANGELOG (facebook/react,
     `packages/eslint-plugin-react-hooks/CHANGELOG.md`) for **7.1.0** lists ESLint 10 support,
     skipping non-React files, `set-state-in-effect` and ref-validation improvements, and fuller
     compiler errors. 7.1.1 restores a no-op rule. **There's no annotation, so the condition isn't
     met.** This closes the "not checked" item from 10-31. (7.1's "improved ref validation" could
     change which of the 5 files still need the exception. That gets checked when the plugin is
     bumped.)
   - **ADR-0070** (strict lint with two React-shaped options): too new to have fired. Its
     `scripts/` tsconfig condition waits on `solve-all.ts`'s Star Thru question, which is still open
     (PROGRESS, 10-31 (6)).
   - ADR-0002 / ADR-0065: `src/App.tsx` still has 50 `ScreenPos` references. The game half waits on
     0065's refactor, as recorded. **Unchanged.**
   - ADR-0003: `src/world/Player.tsx:25` `RushMode = 0 | 1 | 2`. **Unchanged.**
   - ADR-0005: `#voice-test`, `#solve-four` and the review routes are still hash routes
     (`src/main.tsx:23-27`). **Unchanged.**
   - ADR-0007 (data shared between people → the backend question): nothing is shared. **Unchanged.**
   - ADR-0010/0059, 0011/0012 (square-one drives arms or timing, breathing or footprints):
     square-one has no `src/` change since `v0.11.0`. **Unchanged.**
   - ADR-0034 (a third consumer → a workspace): `grep -l '"square-one"' ~/Development/*/package.json`
     gives the-lot and square-one only. **Unchanged.**
   - ADRs 0066–0068: 0066's lint-pass registration is in progress (0070). 0067 and 0068 are
     unchanged.
   - **Not checked one by one:** the geometry and pose conditions in ADRs 0017–0058, for the reason
     given on 10-31. They fire during the dance work, and the record shows that working.
2. **Claims checked against current sources.**
   - **The NPC model (ADR-0006, `claude-haiku-4-5-20251001`).** Anthropic's model-deprecations page
     (platform.claude.com, fetched today) lists it as **Active**, with no deprecation notice and no
     entry in the deprecation history, and "Not sooner than October 15, 2026". The page promises at
     least 60 days' notice. `claude-haiku-5-5` is Active, not sooner than 2027-10-07. **The
     deferral's trigger (a deprecation notice) hasn't fired. Stays deferred** (Ryan, 10-31: "later").
   - ADR-1010 (TypeScript 6 until the lint gate supports 7): `typescript-eslint@8.72.1` peers
     `typescript >=4.8.4 <6.1.0`, and `typescript@latest` is 7.0.2. **Still blocked.** The repo is
     on 6.0.3.
   - **The minimatch ignore (GHSA-g3hv-75wg-m249):** "retire when eslint and typescript-eslint use
     minimatch >= 11.0.1" is still literally false (`eslint@latest` uses `^10.2.6`). But every
     minimatch 3 here comes from eslint 9 (`pnpm why minimatch@3`: `@eslint/config-array@0.21.2`,
     `@eslint/eslintrc`, `eslint@9.39.5`). Every lint plugin here accepts eslint 10:
     `typescript-eslint` 8.72.1 peers `^10`, `react-hooks` 7.1.1 peers `^10`, and `react-refresh`
     0.5.7 peers `^9 || ^10` (the-lot has 0.4.26). On eslint 10, minimatch 10 → 11 is a plain
     override, which `api-standards` did today with a green CI. **There's a route to retiring the
     ignore now.**
3. **Config against the tool's recommended baseline.** `pnpm-workspace.yaml`: 1440,
   `no-downgrade` (one reasoned exclusion), `blockExoticSubdeps: true`, and `allowBuilds` with
   esbuild plus the reasoned square-one entry. The dead key stayed out. pnpm 12 accepted all of it
   (item 8).
4. **Advisories.** `pnpm audit`: 1 moderate, ignored (minimatch, above). OSV wasn't run locally
   (Docker needs the `docker` group here); CI runs it.
5. **Rigor tier.** None claimed (README), honestly, while strict lint is at 81. When the lint
   pass reaches zero and `eslint.strict.config.js` becomes the CI config, provable-lite can be
   claimed: fast-check on both reducers, the strict compiler, and strict lint. ADR-0068's Rust/WASM
   promotion hasn't arrived.
6. **Template drift** (no `template` remote; compared with `~/Development/cr-ci-cd-rust-typescript-template`
   `HEAD` `0be2f34`):
   - **ADR-1018 is missing**, `project-conventions` lacks its hunk, and `ci.yml:211` is OSV
     **v2.3.8**. Item 8 shows why that blocks pnpm 12.
   - **ADR-1019 is on its way** (written today, not yet committed in the template): an OpenAPI
     document gets linted against a vendored, pinned `api-standards` ruleset by an auto-detected
     `api-lint` job. **It applies here:** `api/npc-chat.ts` and `api/support.ts` are two `POST`
     edge functions this app serves to its own frontend, and there's no OpenAPI document (compliance
     11-01, checklist D). That's a decision for Ryan: adopt it (write `openapi.yaml` for the two),
     or deviate in a project ADR, scoped to same-origin endpoints with a single client.
   - Everything else matches what 10-31 brought in (ADRs 1000–1017, the stance-review skill, the
     issue template, docs-hygiene).
7. **Last review's deferrals.**
   - NPC model: trigger not fired (item 2).
   - **pnpm 12: its condition is met, so it was evaluated** (item 8).
   - vite 8 + vitest 5: deferred "until after the TypeScript 6 / strictness work". TypeScript 6 and
     the tsconfig flags are done, but strict lint isn't (81). **Still deferred**, for one more
     condition: the lint pass at zero.
8. **Package-manager majors: pnpm 12, evaluated.** In a throwaway worktree with `packageManager`
   set to `pnpm@12.16.1`:
   - `install --frozen-lockfile` fails, as expected when `packageManager` changes: "Cannot update
     packageManagerDependencies with frozen-lockfile". A plain `install` then succeeds, and frozen
     passes after that.
   - **The git dependency survives.** The lockfile still resolves `github:randallard/square-one#v0.11.0`
     to `https://codeload.github.com/…/tar.gz/f11da07…` (HTTPS, the same commit). `allowBuilds`
     still lets square-one's `prepare` run, and `node_modules/square-one/dist` is built.
     `pnpm-workspace.yaml` is untouched, so no key was rejected.
   - The lockfile gains **158 lines, a second YAML document** for pnpm's own packages. That's the
     ADR-1018 layout.
   - `tsc -b` passes. `pnpm lint` gives the same 0 errors and 2 warnings. `vitest run` gives 1,240
     passed, 29 expected-fail, 3 skipped. `build` passes. `pnpm audit` gives the same 1 ignored.
     `audit signatures`: 486 verified.
   - The only warning was the store location, an artefact of the worktree being on `/tmp`.

Also current, not stances: vite 8.3.5, vitest 5.0.5 (deferred above), eslint 10.14 (item 2), three
0.187, React 19.3.1, react-hooks 7.1.1, react-refresh 0.5.7, fast-check 4.10.2.

## Findings

1. **pnpm 12 is ready in both repos, but ADR-1018 has to land first.** Under pnpm 12 the lockfile
   is two documents, and OSV v2.3.8 would go blind while staying green.
2. **ADR-1019 applies to the-lot**, through the two `api/` endpoints. Adopt it or deviate.
3. **The minimatch ignore can be retired** through eslint 10 and a bounded override, ahead of its
   written condition.
4. ADR-0069's annotation condition: checked, and not met.

## Actions

None applied. These are proposals for Ryan.

- **Adopt ADR-1018** (copy it, bump `ci.yml:211` to `b1d267a… # v2.7.0`, take the skill hunk).
- **Then pnpm 12, together with square-one:** `packageManager: pnpm@12.16.1` and a plain `pnpm
  install`. Check that CI's OSV package count matches `audit signatures` (486). It's covered by
  ADR-1016's evaluation above, so no new ADR.
- **Decide ADR-1019 for `api/`:** either `openapi.yaml` for `POST /api/npc-chat` and `POST
  /api/support` plus the vendored ruleset and the `api-lint` job, or a project ADR deviating (two
  same-origin endpoints with one client; promote on a second client or a third endpoint).
- **Proposed, after the lint pass:** eslint 10 (with react-hooks 7.1.1 and react-refresh 0.5.x),
  then override minimatch 10 → 11 and drop GHSA-g3hv-75wg-m249 from both scanners in one commit.
  Re-check ADR-0069's five files under 7.1's ref validation at the same time.
- **Deferred:** vite 8 + vitest 5, until the strict lint pass is at zero. The NPC model, until a
  deprecation notice for `claude-haiku-4-5-20251001`.
- Next review: 30 days (2026-12-01), or sooner if Anthropic posts that notice or typescript-eslint
  accepts TypeScript 7.
