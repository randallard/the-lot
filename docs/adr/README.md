# Architecture Decision Records (ADRs)

Significant decisions for **townage**, one file per decision, with the context and
consequences — so the *why* survives, not just the *what*.

The recognized practice is the **ADR** (Michael Nygard, 2011), commonly written with the
**MADR** (Markdown Any Decision Records) template. We use a MADR-lite form.

## Conventions

- Files: `NNNN-kebab-title.md`, zero-padded, monotonically increasing.
- Status values: `Proposed` · `Accepted` · `Superseded by ADR-XXXX` · `Deprecated`.

### One decision per file

An ADR records **one** decision. If your file has a numbered list of decisions in it, you have
written a policy document, not an ADR — split it.

The test: **if you can't supersede one part of it, it's too big.** A file bundling eleven
decisions can never be superseded, because a new ADR replacing it would throw out the ten that
were fine. So the only available move becomes editing it in place — which is how bloat quietly
destroys immutability. These are not two separate failures; the first causes the second.

### Immutable in substance

To change a decision, write a **new** ADR that supersedes the old one, and flip the old one's
status to `Superseded by ADR-XXXX`. Don't rewrite history.

Precisely what that allows and forbids:

| Part of the file | Mutable? |
|---|---|
| The `- Status:` line | ✅ that's what it's for |
| The index table in this README | ✅ it's an index |
| Typo / broken-link fixes | ✅ |
| `## Context`, `## Decision`, `## Consequences` | ❌ **frozen once Accepted** |
| Adding a new decision to an existing ADR | ❌ **write a new ADR** |
| "Amended on <date>" blocks | ❌ that's an edit wearing a hat |

If you find yourself writing "amended" inside an accepted ADR, stop: what you have is a new
decision, and it deserves its own number and its own supersession link.

### Superseding

1. Write `NNNN-new-title.md` with the new decision. In its Context, say what it replaces and
   **why the old reasoning stopped holding** — that's the valuable part, and it's the thing
   an in-place edit destroys.
2. In the old ADR, change only the Status line to `Superseded by [ADR-NNNN](NNNN-new-title.md)`.
3. Update the index below.

A superseded ADR stays in the repo, unedited, forever. Someone reading the new one needs to see
what was believed before and what changed.

### A note on the backfilled ADRs

ADRs 0001–0007 were written on 2026-07-25, during the docs retrofit, about decisions taken
between 2026-03-06 and 2026-03-28. Their `Date:` line names both the record date and the
decision date, with the commit that introduced the decision.

They were reconstructed from two sources: the 2026-03-06 session journal, which records
*intent*, and the code, which records *what actually happened*. Where the two disagree, the
ADR says so. Each one names the files and commits it was evidenced against, so a future
reader can check the reconstruction rather than trust it.

They are otherwise ordinary ADRs — immutable in substance, superseded rather than edited.

## Template

Copy [`TEMPLATE.md`](TEMPLATE.md).

```markdown
# ADR-NNNN: <title>
- Status: Proposed | Accepted | Superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Deciders: <names>

## Context
<forces at play, constraints, what makes this non-obvious>

## Decision
<what we chose, stated plainly — ONE decision>

## Consequences
<results, good and bad; what this commits us to>
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0000](0000-record-architecture-decisions.md) | Record architecture decisions (use ADRs) | Accepted |
| [0001](0001-react-three-fiber-over-babylon.md) | React Three Fiber as the 3D renderer, over Babylon.js | Accepted |
| [0002](0002-shared-refs-across-the-r3f-dom-boundary.md) | Shared refs carry per-frame state across the R3F/DOM boundary | Accepted |
| [0003](0003-rush-mode-as-a-numeric-enum.md) | Rush mode is one numeric enum, not a set of boolean flags | Accepted |
| [0004](0004-derived-phase-with-ui-override.md) | Game state stores facts; the phase is derived, with a UI-only override | Accepted |
| [0005](0005-games-launch-by-url-hash-handoff.md) | Games are separate deployments, integrated by a compressed URL-hash handoff | Accepted |
| [0006](0006-npc-dialogue-through-a-serverless-proxy.md) | NPC dialogue goes through a serverless proxy, opt-in, and degrades without it | Accepted |
| [0007](0007-localstorage-with-a-versioned-backup-file.md) | Browser `localStorage` is the only store; a versioned backup file is the escape hatch | Accepted |

## Decisions this repo inherits

townage is one repo in the square-dance game family planned in
`~/Development/work/square-dance-planning/`. Two of that effort's decisions bind this repo and
are recorded there, not here:

- **ADR-0002 — retrofit the-lot, don't restart.** Why townage keeps its code and gains the
  standards in place, which is what these docs are.
- **ADR-0006 — townage consumes square-one as a pinned git dependency**, with a local link
  during co-development. That lands with the choreography adapter (milestone M4).
