# Stance review — 2026-10-31
- Reviewer: Claude, for Ryan
- Previous: first

the-lot's first stance review, the day after its first compliance pass brought in the template's
standard ([compliance 2026-10-31](../compliance/2026-10-31.md)). Every "is this still true?"
check below cites the source it was checked against today.

## Checked

1. **Promotion conditions in every ADR (0001–0068).** I extracted each ADR's Consequences and
   searched them for promotion conditions and "revisit / not yet / until" claims: 66 hits across 60
   ADRs. The ones a fact can settle, I tested against the code:
   - **ADR-0002 (per-entity refs → a keyed registry once `src/dance/` places N dancers) and ADR-0008
     (the react-hooks exceptions: "do not extend the exception list" when the floor needs per-dancer
     refs): this trigger has fired, but only half of it was followed.** `DanceFloor.tsx:858-865`
     builds one rig per dancer in a keyed `useMemo` map, as ADR-0008 asked. But `eslint.config.js:59`
     still exempts all of `src/dance/**` from `react-hooks/immutability` and `purity`, on the grounds
     that it's "the same ADR-0002 mechanism in a new directory". A dry run without that line gives
     **9 errors in 5 files** (`react-hooks/immutability` ×9: DanceFloor 4, FistBumpDriver 2,
     Review2Scene 2, DanceDebugScene 1, SolveFourScene 1), and the rest of `src/dance/` passes. On the
     game side, `src/App.tsx` has 50 `ScreenPos` references (ADR-0002's own measure of growth), and
     ADR-0065 already plans the refactor that will supersede ADR-0004.
   - ADR-0003 (a third rush mode → a string union): `src/world/Player.tsx:25` is still `0 | 1 | 2`
     (off plus two modes), exactly as the ADR records. **Unchanged.**
   - ADR-0005 (a third game, or a payload change after shipping → a versioned package): `#voice-test`,
     `#solve-four` and the review routes are hash routes inside this app (`src/main.tsx:22-26`), not
     launched games. **Unchanged.**
   - ADR-0007 (data shared between people → the backend question): nothing is shared. **Unchanged.**
   - ADR-0010/0059 (square-one drives arms, expression or per-dancer timing → the channel contract
     moves), ADR-0011/0012 (square-one does breathing or footprints → the engine owns clearance):
     square-one 0.11.0 *describes* arm holds (`types.ts:65-70`, the `forearm` hold for pair solving)
     but doesn't drive arms or timing. It mentions breathing only in a comment, as something "done
     coarsely" (`calls.ts:343`). **Unchanged.**
   - ADR-0034 (a third repo consumes square-one → a workspace): only the-lot depends on it
     (`grep '"square-one"' ~/Development/*/package.json`). **Unchanged.**
   - ADR-0066/0067/0068 (accepted 10-30): too new to have fired.
   - **Not checked one by one:** the geometry and pose conditions in ADRs 0017–0058 (an elbow
     preference, a third hold style, a non-uniform scale, a hand beside a head, and so on). These fire
     during the dance work itself, and the record shows that working: ADR-0041 records ADR-0040's
     condition "fired within the hour, exactly as written". A review a month apart adds little there.
2. **Claims checked against current sources.**
   - **The NPC dialogue model (ADR-0006, `api/npc-chat.ts:73`, `claude-haiku-4-5-20251001`).**
     Anthropic's model-deprecations page, fetched today, lists it as **Active**, with retirement "Not
     sooner than October 15, 2026". That date passed 16 days ago, so a deprecation notice can now come
     at any time. The current Haiku is `claude-haiku-5-5` (Active, not sooner than 2027-10-07). It
     isn't a one-word swap. In Haiku 5.5 thinking is on by default and counts against `max_tokens`,
     which is 200 in `npc-chat.ts:74`. Structured replies use a forced `tool_choice` (`:81`, ADR-0006),
     and whether that works with thinking on needs checking against the migration guide. Its
     safeguard refusals also have no server-side fallback.
   - ADR-1010's exit trigger: `npm view typescript-eslint@latest peerDependencies.typescript` gives
     `>=4.8.4 <6.1.0` (8.72.1), so TypeScript 7.0.2 still can't be linted. the-lot is on 5.9.3; moving
     to 6.0.x is a compliance gap, not a stance question.
   - ADR-0008 says to prefer the plugin's own way of annotating an externally-owned ref boundary if
     it ships one. `eslint-plugin-react-hooks` is pinned at 7.0.1, and 7.1.1 is out (npm). **Not
     checked:** whether 7.1 adds such an annotation. I didn't read its changelog.
3. **Config against the tool's recommended baseline.** `pnpm-workspace.yaml` states
   `minimumReleaseAge: 1440`, `trustPolicy: no-downgrade` (one reasoned exclusion),
   `blockExoticSubdeps: true` and `allowBuilds` (ADR-1016). The dead key for the old square-one
   tarball was removed in `d284288`.
4. **Advisories.** `pnpm audit`: 1 moderate, ignored (GHSA-g3hv-75wg-m249, minimatch). The ignore is
   in both scanners with a retirement condition, and a weekly cloud routine (from 2026-11-02) reports
   when it can retire. Glob GHSA-3g3m-2fjr-6pw4 is fixed by override (`glob@14.0.3`). Not run locally:
   osv-scanner (CI runs it).
5. **Rigor tier.** None is claimed (`README.md:160`), honestly. ADR-0068's promotion (an invariant
   that needs proving, or a solve too slow to run live) hasn't arrived. The fast-check properties on
   the two reducers are the right rung for now.
6. **Template drift.** There's no `template` remote, so I compared against
   `~/Development/cr-ci-cd-rust-typescript-template` `origin/main` (`12f6468`):
   - ADRs 1000–1017, `project-conventions`, `stance-review`, `stance-review.yml` and
     `docs-hygiene.yml` are identical.
   - **`.github/stance-review-issue.md` is missing.** `stance-review.yml` `cat`s it, under
     `set -euo pipefail`, when it opens an issue. With no review on record, the run tomorrow
     (2026-11-01 13:00 UTC) would have failed at that step. This review keeps it from running that
     step for 30 days, but the file still has to come in.
   - **`scripts/docs-hygiene.py`** is the older version: it counts any dated file in `docs/reviews/`
     as a stance review. The template only counts `*-stance-review.md`.
   - **`ci.yml`**: the Rust jobs lack `--locked` and the Kani "require at least one proof harness"
     step. They're inert here, because they're gated on `needs.detect.outputs.rust`, which is false.
     The licence allowlist adds `MIT*`, `CC-BY-4.0` and `(MIT AND CC-BY-3.0)`, with reasons, and
     that's deliberate.
   - **`docs/reviews/README.md`** is a July copy (`07f5a63`, 2026-07-25). It calls the project
     "townage" and says the review CI "isn't wired up yet", but `stance-review.yml` exists. Its item 4
     (the NPC model) is the-lot's own and should be kept.
7. **Last review's deferrals.** This is the-lot's first review. square-one's first
   ([2026-10-29](https://github.com/randallard/square-one/blob/main/docs/reviews/2026-10-29-stance-review.md))
   deferred **pnpm 12** "to evaluate in the-lot and square-one together, when the next release of
   square-one is pinned in the-lot". That condition was met on 2026-10-30 (`1288384`, `v0.11.0`).
8. **Package-manager majors.** `packageManager: pnpm@11.5.3`; pnpm 12.17.0 is out (2026-10-30), with
   12.16.1 tagged latest. Not evaluated here. See Actions.

Also current but not stances: vite 7.3.7 → 8.3.5, vitest 4.1.12 → 5.0.5, eslint 9 → 10.14,
three 0.183 → 0.187, React 19.2.8 → 19.3.1, fast-check 4.9 → 4.10. These are version bumps, not
decisions. Vite 8 and vitest 5 are majors to take together.

## Findings

1. **The NPC model is inside its retirement window.** Haiku 4.5 has had no deprecation notice yet,
   but its "not sooner than" date has passed. Moving to Haiku 5.5 changes behaviour (thinking against
   a 200-token cap, a forced tool choice, refusals), so it's a decision, not a bump.
2. **ADR-0002/0008's trigger fired, and the lint exception grew instead.** `src/dance/**` is exempt
   from two hooks rules, but only 9 sites in 5 files need it.
3. **The stance-review workflow's issue template is missing**, so the nag would have failed when it
   first fired.
4. **pnpm 12's deferral is due**, because its condition (square-one re-pinned) was met on 10-30.
5. **Stale copies from the template:** `docs/reviews/README.md` and `scripts/docs-hygiene.py`'s
   review glob.

## Actions

None applied. These are proposals for Ryan.

- **Proposed ADR: the NPC model moves to `claude-haiku-5-5`.** It would sit beside ADR-0006, which
  stands. Before it's accepted, test the forced `tool_choice` with thinking on, the `max_tokens`
  headroom (or a low `effort`) and the refusal path. Or **defer it**, with this trigger: Anthropic
  posts a deprecation notice for `claude-haiku-4-5-20251001`. The deprecations page is the place to
  watch.
- **Proposed ADR: supersede ADR-0008's directory-wide `src/dance/**` exception** with a file list of
  the 5 files, or fix the 9 sites. Either way, record that ADR-0002's dance half was answered by the
  keyed rig map, and leave the game half to ADR-0065's refactor.
- **Small fixes, no ADR:** copy `.github/stance-review-issue.md` from the template; take the
  template's `docs-hygiene.py` review glob; replace `docs/reviews/README.md` with the template's,
  keeping the-lot's NPC-model item; optionally take the template's `--locked` and Kani guard in the
  inert Rust jobs, so a later sync is smaller.
- **Deferred: pnpm 12**, to be done jointly with square-one, as square-one's review planned. Check
  that the GitHub git dependency (HTTPS resolution) and the tarball-keyed `allowBuilds` entry survive,
  and that neither workspace file has a key pnpm 12 rejects. The next trigger is the next session
  that touches dependencies in either repo, or by 2026-11-28 at the latest.
- **Deferred: vite 8 + vitest 5**, until after the TypeScript 6 / strictness work, so only one
  toolchain is moving at a time.
- Next review: 30 days (2026-11-30), or sooner if Anthropic deprecates Haiku 4.5 or
  typescript-eslint accepts TypeScript 7.

## Applied the same day

Ryan: *"do the small fixes and commit everything"*. The template's `.github/stance-review-issue.md`,
its `scripts/docs-hygiene.py` (stance-only review glob) and its `docs/reviews/README.md` are copied in.
The README gains an "In this repo" section that keeps the NPC-model item and says how to check
template drift without a `template` remote. In `ci.yml`'s inert Rust jobs: `--locked` and the Kani
harness guard, plus the ADR-1005 note on the reusable-workflow job. The licence additions and the
SHA-pin comment stay ours. The two proposed ADRs and the two deferrals stand.
