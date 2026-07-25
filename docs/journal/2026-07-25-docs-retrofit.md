# Docs retrofit — 2026-07-25

Documents commit `07f5a63`.

Milestone M3 of the square-dance arc, done on waed-7561 while square-one's engine core (M1)
ran on the primary machine. Docs half only — **no `src/` changes**, deliberately, so this
creates no merge surface against M4.

## What landed

`docs/{adr,journal,reviews,plans}/` and `docs/PROGRESS.md`, matching square-one's shape. The
root `journal/` and `plans/` moved under `docs/` with `git mv` (pure renames, history intact);
the 2026-03-06 entry gained a kebab title. The stock Vite README — untouched since scaffolding
— became a real one. Seven ADRs backfilled.

## On backfilling ADRs from a codebase

The brief asked for three ADRs: R3F over Babylon, the shared-ref pattern, and rush mode as a
numeric enum. All three are in the 2026-03-06 journal's "Technical decisions" section, which
reads almost like pre-written ADR context.

Writing them turned up four more that had never been written down anywhere — the derived-phase
model, the URL-hash game handoff, the NPC dialogue proxy, and `localStorage`-plus-backup. Each
is a real decision with real alternatives and real costs, and each was invisible outside the
code. That ratio is the argument for doing this at all: **more than half the architecture had
no record**, and the half that did was recorded as a side effect of one narrative journal entry
rather than on purpose.

The instruction that mattered most was *read the code before writing each one; the journal
records intent, the code records what actually happened*. Every place they diverged was worth
writing down:

- The journal says R3F was picked partly because "drei/rapier provide what we'd need later."
  Four months on, drei is imported in exactly two files and **`@react-three/rapier` is imported
  in none**. Half the stated rationale is still untested. An ADR written from the journal alone
  would have recorded that as a benefit; written from the code, it's a loose end.
- The derived-phase decision is genuinely good — `derivePhase` is four branches and cannot
  contradict the facts it reads. But `PhaseOverride`, the "transient UI states" escape hatch,
  has grown to **19 variants** against `DerivedPhase`'s four, and now carries every phone
  screen. It behaves like a router, not an override. The clean part of the decision is the
  small part, and the ADR says so.
- `RushMode` is typed `0 | 1 | 2` — but the one site that writes `2` (`BotParts.tsx`) declares
  its prop as `RefObject<number>`, so the type doesn't hold where it matters most.
- `backup.ts` enumerates 12 keys; the code writes 23. Nothing checks.

None of that is a criticism of the code — it's four months of fast, working development. It's
the point of the exercise: these are exactly the facts that evaporate.

## Two things the brief got wrong

**The empty directories aren't abandoned structure.** The brief flagged `src/npc/` and
`src/bot-play/` as empty and asked which they were. `git ls-files` returns nothing for either,
and `git log --all` shows no commit has ever touched them. They're untracked local remnants on
this machine — invisible to a fresh clone, nothing to salvage. (There's a third the brief
missed, `src/overlay/games/`, same story.) A question about repo structure turned out to be a
question about one working copy.

**The template is not `local-only`.** The brief said `cr-ci-cd-rust-typescript-template` won't
sync and must be cloned from GitHub. On waed-7561 `gr status` reports it `linked`/`ok`, present
and current. Whatever the primary machine sees, it isn't universal — worth checking before
repeating that instruction in the next brief.

## Test baseline

160 of 162 pass. Two fail in `fetch-pending-results.test.ts` — both in the async-result pickup
path, both failing before any of this started. Recorded in PROGRESS rather than fixed: fixing
them is a `src/` change, and this was the docs half.

Also: `pnpm test` won't run behind pnpm's `ERR_PNPM_IGNORED_BUILDS` gate on esbuild.
`./node_modules/.bin/vitest run` works. Noted in PROGRESS so the next person doesn't lose ten
minutes to it.

## On the coordination protocol

M3 was the bootstrap exception — the one task whose brief *had* to live in the effort dir,
because creating the-lot's docs was the work. The open question was whether the resulting
`docs/PROGRESS.md` can hand over M4 with no brief at all.

I wrote it to try. The "What M4 actually contains" section carries the subsystem breakdown
from the effort dir, plus the townage-side specifics only the code knows — and the sharpest of
those is one the effort dir had wrong by omission. Its notes say `AnimationController` is
pose-only and nothing drives locomotion, which is true. What that misses is that emotes
currently hold a **veto** over locomotion (`else if (!isEmoting)` in `Player.tsx`) and
**overwrite facing** while playing. So M4's blend contract isn't "add a driver alongside the
pose system" — it's an arbitration problem with an existing owner, and it's the first design
decision of the milestone rather than a detail inside it.

That's the case for the protocol working, and it's a stronger case than "the docs are
complete": the repo's own docs know something about the repo that the cross-repo map
structurally can't.

## Next

M4, blocked on square-one M2 shipping a consumable package. The CI half of the ADR-0002
retrofit is still open and parallelizable — there's no `.github/` in this repo at all.
