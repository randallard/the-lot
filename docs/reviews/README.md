# Stance reviews

A dated record of **deliberately re-examining our own standing decisions** against current
reality — tooling, advisories, the ecosystem, and the codebase as it now is.

## Why this exists

ADRs are immutable, which is right: the record of what you believed at the time is the
valuable part. But immutable is not the same as *correct forever*. A decision can quietly
stop being true without anyone editing a line.

townage has a live example of the shape, from before this directory existed. The
2026-03-06 session recorded a font-rendering problem on Linux, chased it through several
fixes, and closed with "we moved on rather than chase it further — something to revisit if
it bothers Ryan later." Nothing in CI could catch that, because nothing was broken. It was
simply a deferral with no clock on it. This directory is the habit that catches that kind
of thing on purpose instead of by luck.

## The cadence, and how deferral works

- The review is due **every 30 days**.
- Where CI is wired up (it isn't yet in this repo — see
  [`../PROGRESS.md`](../PROGRESS.md)), `stance-review.yml` checks the newest entry here. If
  it's older than 30 days, it opens (or reuses) an issue labelled `stance-review`, and nudges
  weekly while that issue stays open.
- **It never fails a build and never blocks a merge.** A review that blocks CI gets disabled
  the first busy week, and then you have neither the gate nor the habit.

Deferring is legitimate and expected. Record the deferral — write an entry that says
"reviewed the list, nothing to change, next look after <thing> lands." That resets the clock
honestly and leaves a trail of *why* it was deferred, which is itself worth having.

## Running one

By hand, the checklist is:

1. **Every ADR with a promotion condition** — has the condition been met? (This is why
   [`TEMPLATE.md`](../adr/TEMPLATE.md) asks for one.)
2. **Every "not yet / revisit later / good enough for now"** claim — is it still true? Check
   the tool's *current* docs, not memory.
3. **Supply chain** — has the package manager or ecosystem added controls we don't use? Are
   pinned versions still supported? New advisories in our dependency classes? townage carries
   a real dependency surface (React 19, three.js, R3F, drei, rapier) and, unlike square-one,
   ships to real users.
4. **The model behind NPC dialogue** — [ADR-0006](../adr/0006-npc-dialogue-through-a-serverless-proxy.md)
   pins a specific Claude model id in `api/npc-chat.ts`. Model ids get deprecated and
   retired on a published schedule; a stale one eventually 404s in production. This is the
   review item most likely to bite.
5. **The template itself** — has `cr-ci-cd-rust-typescript-template` moved on since the
   conventions were retrofitted here?

## Outcome

Every finding becomes **a new ADR**, never an edit to an old one. That's what makes this
compatible with immutability rather than in tension with it: the review supersedes, it
doesn't rewrite.

## Entry format

`YYYY-MM-DD-stance-review.md`:

```markdown
# Stance review — YYYY-MM-DD
- Reviewer: <name>
- Previous: <link to previous entry, or "first">

## Checked
<what you actually looked at, with sources — the checklist above, item by item.
"Checked, unchanged" is a real result and worth one line.>

## Findings
<what's stale, with evidence. Empty is a fine outcome; say so explicitly.>

## Actions
<new ADRs written (link them), issues opened, or an explicit deferral with the
condition that should trigger the next look.>
```
