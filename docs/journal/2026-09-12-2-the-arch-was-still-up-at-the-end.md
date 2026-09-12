# 2026-09-12 — the arch was still up at the end

Ryan, the second of his tweaks to the pose chart: *"the ending position is always hands back
down in a normal handhold."*

It was not. `#review=california-twirl/end/*` stood the couple in their exchanged places with
their joined hands **over their heads**, and the step's own `watch` text told you to expect
exactly that — *"Mirror of `arch-up` with the two bodies swapped."* Written on 09-07 because it
described what the engine emitted, which is the wrong reason for a review catalog to say
anything. **A step that asserts the defect rates it as correct**, and that is the one failure
mode this instrument exists to avoid. Found on its second day of use, by using it.

## The fix is in the engine, and it took two goes

square-one's `orbit` and `step-pivot` gripped `from: 0, to: beats`. The first fix trimmed each
block's span by half a beat, which made this cell right and broke the thing nobody had looked
at: two Twirls in a row became two arches with a hole between them. Ryan: *"hands don't always
go down in the middle of a sequence … we need a way to distinguish between the sequence ending
and dancers waiting, or the sequence continuing and the hands position blending into the next
move."* A block cannot make that distinction, so the release moved to `flattenSequence`
([square-one ADR-0026](https://github.com/randallard/square-one/blob/main/docs/adr/0026-the-dance-releases-a-hold-not-the-block.md)):
spans merge across a boundary that continues the hold, and only a span live at the **final**
beat is released.

## What this repo needed, which was almost nothing

**`DanceFloor` already did the right thing with an absent span.** The arch blend targets 0 when
no span covers the beat, and 0 is not *hands free* — `DanceFloor.tsx:1011` falls through to
`coupleHold = standing`, the standing hold, hands joined low and forward (ADR-0027). Its own
comment states the rule: *"It is the standing hold until an arch is declared, and then eases
into it."* So the release lowers the couple into the ordinary handhold with no change here:
eased over the half beat during playback, snapped during a seek, which is what the review wants
at a named beat. The thing this repo had believed and had to stop believing was in the catalog,
not the renderer.

- **`review-steps.ts`** — the `end` step's `watch` now says the arch is back *down*, and that
  the pose should be indistinguishable from `standing couple` with the bodies swapped. The
  figure's doc says the step list brackets the arch: `stand` before, `arch-up` through
  `three-quarter` inside, `end` after.
- **`review-steps.test.ts`** — the test asserting *every* Twirl beat-step sits inside the arch
  span now exempts `end`, and a new test asserts the opposite for it: `end` is **after**
  `span.to`, and `momentum.lastHand` is still a hand. That pair is what would catch the engine
  going back to gripping to the last beat, which would make the chart rate a raised arch as the
  ending position.
- `pose-review-chart.md` re-exported, since the chart carries the `watch` text.

**755 tests, the same 7 failing**, `tsc` clean, docs-hygiene clean. `src/` still uncommitted.

## ✅ The pin moved, and this time the tarball check actually ran

The new `end` test fails against v0.4.0 — correctly, since v0.4.0's arch really does cover beat
4 — so ADR-0034's relink was doing exactly what its own doc warns about: keeping a green suite on
an engine the pin does not name. square-one is released as **v0.5.0** (`6e1d3e5`, tag pushed to
`origin`) and the pin here moves to it.

🔑 **Validated with the symlink out of the way, which is the check that had never been run.**
`node_modules/square-one` was pointed at the *fetched* v0.5.0 tarball and the suite run against
it: **755 tests, 7 failing — the same seven**, `tsc` clean, lint 0 errors (25 pre-existing
warnings). The tarball GitHub serves has a built `dist/`, so the `prepare` ran as ADR-0034 assumes.

🔴 **`pnpm-workspace.yaml`'s `allowBuilds` key changes on every square-one tag** — it is keyed by
the tarball URL, and `pnpm install` stops with `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` until it is
updated. That file's own comment already says so in detail and it still cost a cycle; the hash
wanted is `git rev-parse v0.5.0^{}` in square-one, the tag's *commit*, not the tag object's. A
stale v0.3.0 key was removed at the same time, per the same comment's one-line rule.

**Also worth a look while you are in there:** `#dance`'s `2×` should now read as one continuous
arch with no dip at the join, and a looping sequence gets a release every lap — the set arrives,
settles, and lifts again. That is the engine being literal about where a dance ends; if it reads
wrong, the fix is this repo's, because this repo is what knows it is looping.
