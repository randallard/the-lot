# 2026-10-31 (3): compliance, the first stance review, and ADR-0069

Standards work, between dance sessions. Ryan asked for a compliance check of the-lot and
square-one, then for the small gaps to be fixed, the first stance review, its small fixes, and
the hooks exception narrowed.

## Compliance ([note](../compliance/2026-10-31.md))

The 10-30 gaps are mostly closed. Fixed today, in `d284288`:
- `pnpm-workspace.yaml`'s dead `allowBuilds` key for v0.10.0's tarball had come back in
  `1288384`, with pnpm's suggestion text as its value. Removed.
- PROGRESS's Standards line still waited on ADRs 0066–0068, which were accepted in `d5c4404`.

The minimatch ignore (GHSA-g3hv-75wg-m249) stays: no 3.x or 10.x fix, and eslint 10 needs 10.x
too. A weekly cloud routine (Mondays, from 2026-11-02) reports when it can retire.

## The first stance review ([review](../reviews/2026-10-31-stance-review.md))

- **The NPC model** (`claude-haiku-4-5-20251001`) is Active, but past its "not sooner than
  2026-10-15" retirement date. Ryan: *"we'll worry about haiku later."* So the trigger is a
  deprecation notice on Anthropic's model-deprecations page. Moving to `claude-haiku-5-5` isn't a
  one-word change. Thinking is on by default and counts against the 200-token `max_tokens`. The
  structured replies force `tool_choice`. Refusals have no server-side fallback.
- **The stance-review workflow** `cat`s `.github/stance-review-issue.md`, which was missing, so
  the first nag (2026-11-01) would have failed. Copied in from the template (`9c79e95`), along
  with the stance-only review glob in `docs-hygiene.py`, the template's reviews README (plus an
  "In this repo" section), and `--locked` and the Kani guard in the inert Rust jobs.
- **pnpm 12** is due, jointly with square-one: square-one's 10-29 review deferred it until the
  re-pin, which happened 10-30. Vite 8 and vitest 5 wait until after the TypeScript 6 and
  strictness work.

## ADR-0069: the hooks exception names five dance files

ADR-0008's promotion condition said not to extend the exception list when the dance floor got a
variable cast. `291a44c` (07-25) added `src/dance/**` anyway, citing ADR-0011, and no ADR recorded
it. Without that line, lint gives 9 `react-hooks/immutability` errors in 5 files. All nine are
three.js or ref writes from a frame loop, the ADR-0002 mechanism. Ryan: *"narrow the lint
exception to the 5 files."*
[ADR-0069](../adr/0069-the-react-hooks-exception-names-the-dance-files-that-write-from-a-frame-loop.md)
supersedes ADR-0008 with the file list and carries over its pin and promotion conditions.
`pnpm lint`: 0 errors and the same 25 warnings as before. `tsc -b` is clean.

## Next

- Ryan looks over ADR-0069 and the `eslint.config.js` change, then commits.
- pnpm 12, with square-one, by 2026-11-28.
- Still to take for provable-lite: TypeScript 6.0.x, then the tsconfig flags (179 errors in the
  dry run), then lint `strictTypeChecked` (2,756 findings in the dry run).
- Haiku: when Anthropic posts a deprecation notice for 4.5.
