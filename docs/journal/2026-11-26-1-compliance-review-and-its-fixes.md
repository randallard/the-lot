# 2026-11-26 (1): compliance review, and its fixes

The template was synced from `data` first (`5dc34f5`), then this repo was reviewed alongside square-one
and the square-dance-planning effort ([note](../compliance/2026-11-26.md)). The result: mostly
compliant, with 3 small gaps, all docs. The 5 gaps from 11-01 (2) are closed. Ryan: *"go with all your
suggestions"*.

- **`project-conventions` `SKILL.md:240`:** ADR-1024 came in on 11-22 without the skill's one-line
  change (`deny.toml`'s `[bans]` `deny` list). Copied from the template; `diff` is now empty.
- **The 11-22 (3) docs** (PROGRESS and [the playtest-splits journal](2026-11-22-3-the-playtest-splits.md))
  were never committed. They go in with this entry. `main` was fast-forwarded to `origin/main` first
  (`13dfaaa`, 8 Renovate merges, CI green).
- **ADR-0076 and journal 11-22 (1)** (the daily Railway check) exist only on waed-7561, where they
  were written. ADR numbering here jumps from 0075 to 0077 until they're pushed from there. They're
  uncommitted on branch `daily-check`, together with the code ADR-0076 describes
  (`.github/workflows/daily-check.yml`, `scripts/daily-check/`), so they wait for Ryan's local check
  of that code rather than going home alone. When they do, README, PROGRESS and `docs/adr/README.md`
  need merging with #33's edits.
- **Kiro:** the template's `.kiro/agents/project.json` stays out. Ryan: *"These projects never use
  Kiro - Kiro is only for court work"*. Template drift checks can skip `.kiro/` here.

No code change.
