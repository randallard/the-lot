# 2026-11-01 (1): OSV v2.7.0, pnpm 12, and an OpenAPI contract for `api/`

Ryan: *"apply 1018 then pnpm 12 in both, and commit everything, do write open api.yml"*, after the
11-01 [compliance review](../compliance/2026-11-01.md) and
[stance review](../reviews/2026-11-01-stance-review.md). square-one did the same this morning (its
journal 34), and its CI on pnpm 12 is green, with OSV reading 316 packages.

## `3e1c978`: standards

- **ADR-1018.** OSV-Scanner v2.3.8 → v2.7.0. pnpm 12's lockfile is two YAML documents, and v2.3.8
  reads only the first (pnpm's own), so it had to move first. `ci.yml` was rebuilt from the
  template, and this repo's lines were put back: the four licence additions (with PSF-2.0, new in
  the template), the SHA-pin wording on the OSV call, and the gitleaks note.
- **ADR-1019** (HTTP APIs, new in the template today). The two edge functions had no contract
  (compliance 11-01, checklist D), and Ryan chose to write one rather than deviate.
  `openapi.yaml` describes them as they are, read from the handlers and their callers:
  - `POST /npc-chat` (with its `OPTIONS` preflight) takes either `messages` or
    `gameResults` plus `context`, with `useTool` and `useEscalate`. It returns `dialogue`,
    `continues`, `defaultReply`, `defaultAction` and `escalate`.
  - `POST /support` takes `email`, `message` and `npcId`, and returns `{ok: true}`.
  - Errors are `{error}` with 400, 405, 500 or 502. The client's health check relies on 405.
  - The server base is `/api`.
  - Fields the server ignores (`npcId` and `rounds` on chat) are documented as such.
- `scripts/vendor-api-standards.sh v0.1.0` vendored the ruleset (`.spectral/`, sha256
  `464134a2…`). The first lint gave 8 errors and 3 warnings. **Fixed in the document:** the `/api`
  prefix (moved to `servers`) and `info.contact`. **Recorded as scoped overrides** in
  `.spectral.yaml`, each with a reason and a revisit condition:
  - unversioned paths (one client, deployed with the server);
  - non-plural names (neither is a collection);
  - **no auth** (anonymous by design, but **anyone can call npc-chat and spend Anthropic
    credit**: revisit on abuse or a cost spike);
  - plain-JSON errors (RFC 9457 is a small handler change, but it waits for a playtest of the
    chat and support paths, which have no UI tests).

  Spectral 6.17.0 with `--fail-severity=warn` now gives no results. CI's new `api lint` job
  runs the same check.

## The next commit: pnpm 12.16.1

The lockfile gains a second document (158 lines). The square-one git dependency still resolves
to `f11da07` over HTTPS, and `allowBuilds` still runs its `prepare`. A frozen install, `tsc -b`,
lint (0 errors, 2 warnings, as before), 1,240 tests, the build, `pnpm audit` (1 ignored,
unchanged), `audit signatures` (486) and the licence allowlist all pass. A frozen install refuses
the `packageManager` change on its own, which is expected: the move is a plain `pnpm install`.

## To check in CI

The OSV package count should be about 486, not pnpm's own handful. The `api lint` job should run
and pass, which will be ADR-1019's first run on a real runner.

## Still open

- The lint pass: 81 strict findings (`src/dance/`, `api/support.ts`, `src/world/`), then swap
  the configs.
- The PICK UP block below still names 10-31 (2) (compliance 11-01, gap 2).
- RFC 9457 errors, and some limit on npc-chat.
- eslint 10, then a minimatch 10 → 11 override, which retires GHSA-g3hv-75wg-m249 (stance
  review 11-01).
