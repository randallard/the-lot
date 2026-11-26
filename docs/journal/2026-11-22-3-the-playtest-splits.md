# 2026-11-22 (3): the playtest splits — the dance screens first, the game to its own effort

The 11-01 playtest (the lists in journals [11-01 (2)](2026-11-01-2-the-lint-pass-reaches-zero.md),
[(3)](2026-11-01-3-the-cast-registry.md) and [(6)](2026-11-01-6-eslint-10.md)) was finally due, with
the dev server up and open on the phone through Tailscale. Ryan:

> the game needs work - create a new effort and point to it from progress in the-lot - we need to
> re-enable railway for the games and work on the tutorial and to fist bump but for now we're going
> to work on the dance screens - save the game testing list and note that we might want to start
> from scratch on the initial flow

Then, before #32 moved: *"I do want to test the dance screens first - just update the docs and
create that effort - don't unblock #32 yet"*.

- **The game work** is now its own effort, `work/the-lot-game`
  (`~/Development/work/the-lot-game/PROGRESS.md`, not in this repo), parked until the dance screens are done. It
  covers the Railway agent servers (both 404 "Application not found" since 11-21, found by
  ADR-0076's daily check on the other machine), the tutorial, the fist bump, and possibly
  rebuilding the initial flow from scratch. The game half of the 11-01 list is copied there,
  unchecked.
- **The dance screens' half stays here** and comes next: `#review` (ratings load, "clear"),
  `#solve4` and the solved floor (all four dancers), `#review2` (top panel and opacity remembered),
  and `#voice-test` ("save to dev machine").
- **vite 8 + plugin-react 6 (#32)** now waits on the dance half only. It still gets its own playtest
  after it merges.

No code changed.
