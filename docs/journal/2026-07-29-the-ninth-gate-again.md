# 2026-07-29 — the ninth gate, again

*Documents commit `8d06012`. Continues from
[the pin resolves](2026-07-28-5-the-pin-resolves.md). The square-one side of the same day is
[two scanners, and a gate that had never once passed](https://github.com/randallard/square-one/blob/main/docs/journal/2026-07-29-two-scanners-10.md).*

Ryan asked whether the run was failing on GitHub. It was — here and in square-one, for two
separate reasons, and this repo had already learned one of them and unlearned it.

## We knew this on 2026-07-25

[The CI half](2026-07-25-ci-half.md) called `osv-scan` "the ninth gate" and recorded exactly
the right finding:

> It found exactly one vulnerability — the same `brace-expansion` — because osv-scanner reads
> its own config file, not pnpm's. Two ignores for one advisory, in two tools, over two
> databases.

Later the same day, while correcting the false 72-hour-quarantine reasoning, `fb6f4d2`
deleted `osv-scanner.toml` and PROGRESS.md recorded the result approvingly: *"one ignore, in
one place, with a true reason."*

The reason was true. The consolidation wasn't available. Those two files are not two records
of one decision — they are configuration for two different programs, and only `pnpm audit`
reads `auditConfig`. `osv-scan` has been red on every run from `fb6f4d2` onward.

What makes this worth an entry is that it is not a case of missing information. The correct
fact was discovered by running the thing, written down in a journal entry, and then reasoned
away eight hours later by a principle that sounded better than it fit. **A tidier
configuration was preferred to an observed one.**

## The local signal said everything was fine

`pnpm audit --audit-level=high` prints `1 high (1 ignored)`. That reads as *configured and
working* — and it was, for the tool that prints it. The disagreeing gate was the one gate
nobody could observe, and the reason nobody could observe it was itself recorded on
2026-07-25: the OSV scan is a reusable workflow that "can't be exercised from a local
checkout."

True of the workflow. False of the scanner, which is what decides the job:

```
docker run --rm -v "$PWD:/src" -w /src ghcr.io/google/osv-scanner:v2.3.8 -r ./
```

Against a clean `git archive` export: exit 1 and the brace-expansion row before, then
`Loaded filter from: /src/osv-scanner.toml` and `No issues found` after. The image is public
and the run takes seconds.

So the entry's own framing — "the reusable-workflow jobs are only observable in CI" — was the
sentence that kept the gate unobserved for three days. Correcting it here, per the
append-only rule: **the workflow is only runnable in CI; the tool it runs is not.** Before
accepting that a gate can't run locally, try to run it.

This is the mirror of 2026-07-28's lesson. There, hand-run commands were a *too-lenient*
approximation of CI and the fix was to run what CI runs. Here a gate was never approximated
at all, because it had been classified as unreachable. Same failure, opposite direction.

## The other one: links that resolve only on this machine

`docs hygiene` was failing too, and the guard now added found **eight** broken links in this
repo where CI had only ever reported one — the other seven live in the eleven commits that
have never been pushed.

All of them point outside the repository: `../../work/square-dance-planning/briefs/…` and
`../../../square-one/docs/journal/…`. On Ryan's machine every one resolves, because
`~/Development/` holds all three checkouts as siblings. `scripts/docs-hygiene.py` reported
`docs hygiene clean`. A fresh clone has no siblings, so CI saw broken links — and CI is the
one looking at the repository as it actually is.

Structurally identical to the `node_modules/square-one → ../square-one` link from
2026-07-28: **the developer's directory layout standing in for the repository.** Running what
CI runs cannot catch this one, because the command was never the difference — the checkout
was. The check had to change instead:

```python
if resolved == ".." or resolved.startswith(".." + os.sep):
    rep.error(f"{path}: link escapes the repo -> {shown} ...")
elif not os.path.exists(resolved):
    rep.error(f"{path}: broken link -> {shown}")
```

Escape tested *before* existence, so it fails on the machine where the file is sitting right
there. Existence-first is silent precisely where the link is least trustworthy.

A constraint shaped the repairs: `~/Development/work` has **no GitHub remote** — it lives on
`acer-ts`/`acer-lan`. So the planning-effort references have no URL to become. They are now
unlinked inline code, matching what `docs/PROGRESS.md` already did for the same paths at
lines 529–532. Only the square-one cross-reference became a real URL.

Four of the eight edits are in journal entries. Link syntax only — no claim, no referent, and
no date moved — but recorded here because journals are append-only and even a mechanical edit
to one should leave a trace.

## State

Nine gates green locally: lint (0 errors, 24 standing `react-hooks` warnings), 295 tests,
build clean, audit `1 high (1 ignored)`, signatures, licenses, docs hygiene, typecheck via
`pnpm build`, and now osv-scanner exit 0 against a clean export.

Nothing pushed. `main` is 11 commits ahead of `origin/main`, so the entire M4 arc — the
envelope, ADR-0010 and its enforcement, the blend resolver, the v0.2.0 consumption — has
still never run in Actions. That push is what turns this from *fixed* into *verified*, and it
is the same distinction M4 spent a week learning about renders.
