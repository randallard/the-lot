# ADR-0000: Record architecture decisions (use ADRs)
- Status: Accepted
- Date: 2026-07-25
- Deciders: Ryan

## Context
townage went from empty repo to a working 3D world in about a month (`be7b4a7` on
2026-03-06 through `609e989` on 2026-04-06) with no architecture record at all. The README
was still the stock Vite scaffold. Real decisions were made along the way — the render
stack, how state crosses the R3F/DOM boundary, how games are launched, where player data
lives — and every one of them survived only as code plus one long session journal.

That is a working arrangement right up until the moment someone needs to change one of
them. The code shows what was chosen; it does not show what was rejected, or what
constraint forced the choice. Six months on, the predictable failure is re-litigating a
settled question, or quietly reversing it without noticing the original reason.

The trigger for fixing it now is that townage is about to consume **square-one**, the
square-dance engine, via a new `src/dance/` choreography subsystem. That work will generate
architectural decisions — the world transform, the driver's contract with the existing
animation system, how the player is fed in as an externally-driven dancer — and they need
somewhere to live *before* they are written, not after.

Commit messages are per-commit and too granular. A changelog is per-release and aimed at
players. Neither carries reasoning.

## Decision
Record significant decisions as **ADRs** (Michael Nygard's Architecture Decision Records, in
a MADR-lite form) under `docs/adr/`, one decision per file, following the conventions in
[`README.md`](README.md).

Pair them with a dated narrative worklog in [`docs/journal/`](../journal/README.md): ADRs are
per-decision, the journal is the story over time.

## Consequences
- The *why* survives long gaps and a cleared context window. That matters more here than in
  a repo with continuous attention — townage is worked on in bursts, from more than one
  machine.
- Superseded decisions stay readable, so "we already tried that, here's what happened" is
  answerable from the repo.
- ADRs 0001–0007 are **backfilled**: written on 2026-07-25 about decisions taken between
  2026-03-06 and 2026-03-28, reconstructed from the code and the session journal. They are
  honest about that. Where the journal's stated intent and the shipped code disagree, the
  ADR says so rather than smoothing it over.
- Costs discipline: a decision made in chat and never written down is invisible to every
  future reader. There is no `docs-hygiene` CI job in this repo yet to enforce even the
  mechanical parts (index accuracy, valid statuses, resolvable supersession links) — that is
  the trailing half of the retrofit, tracked in [`../PROGRESS.md`](../PROGRESS.md). Until it
  lands, all of it is on us.
- One decision per file means more files. That's the point — it's what keeps supersession
  possible.
