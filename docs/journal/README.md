# Dev journal

A dated, narrative worklog — the *story over time* that the other docs don't capture:
commit messages are per-commit, [`../adr/`](../adr/README.md) is per-decision, a changelog
would be per-release. This is the running "what we did and why, in order."

## Convention

- One file per entry: `YYYY-MM-DD-kebab-title.md`. Multiple entries in a day get a `-1`, `-2`
  suffix.
- Each entry names the **commit(s) it documents** by short hash, once one exists.
- Entries are **append-only**: correct a mistake in a later entry, don't rewrite an old one.
  Same reasoning as ADR immutability — the record of what you believed at the time is the
  valuable part.

## Journaling with commit hashes (the self-reference rule)

A commit **cannot contain its own hash** (the hash is derived from the content). So a journal
entry references the **work commit it documents**, and is itself landed in a **follow-up
commit**:

```
commit A  ── the work
commit B  ── "journal: document commit A"   (entry references A's hash)
```

This keeps referenced hashes real and stable, with no history rewriting. (Alternative for pure
annotation without a file: `git notes add <commit>`.)

## What's worth an entry

Not every commit. Write one when there's reasoning a future reader would otherwise have to
reconstruct:

- A session where something surprised you, or the first approach was wrong.
- Anything discovered by *running* the thing that the tests didn't catch — those are the
  entries you'll reread. In a 3D game that's most of the interesting failures: an arrow that
  never appears, a hitbox too small to click, a font that renders differently at 12px.
- A decision that isn't big enough for an ADR but that you'd otherwise forget the reason for.
- The narrative around an ADR: the ADR says what was decided, the journal says how you got
  there.

Terse and first-person is fine. This is a lab notebook, not a report.

## A note on the early history

Entries before 2026-07-25 predate this convention. `2026-03-06-session-1-white-void-and-bot-parts.md`
was written as `journal/2026-03-06.md` at the repo root and moved here unchanged during the
docs retrofit — its content is the record of that session and stays as written.
