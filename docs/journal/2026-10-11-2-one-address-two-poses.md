# 2026-10-11 (2) — one address, two poses

Ryan re-read the verdict box on `#review=california-twirl/under-arch/player-ember` after
[this morning's rewrite](2026-10-11-1-the-solid-is-its-own-corners.md): *"there are 4 rules
broken, they're all correct."* Then: *"that's way different now — forearms aren't even close now
for some reason."* Then, after a refresh: *"things went nuts — they got way closer and now behave
like pass-by where the arms squeeze in."*

Three pictures from one address. Nothing in the pose path had changed between them.

## It is ADR-0037's coin flip, and the review never called it

An arch a pair cannot simply make is answered one of two ways, drawn per execution: **reshape**
(one torso grows, the other shrinks, the hold survives) or **break** (they let go). Only `lazy-l`
forces one. `full-l`, `duck-under` and `casual` leave `drawAccommodation()` alone — so every load
of "the L" tossed a coin. `DanceFloor`'s own comment says forcing the draw *"is what makes a
review cell reproducible"*; it was only ever forced for one style of four.

For `player → ember`, computed through `sizeArch` and `planArch` with every dial off:

| draw | room the pass is built for | torso | hands |
|---|---|---|---|
| reshape | **0.818** | player +0.466, Ember −0.466 | gap 0.000 |
| break | **0.576** | none | gap 0.825 |

Standing width 0.900 and hands-free passing width 0.550 either way.

🔑 **That is why they got closer: the break is now the *tighter* figure.** Until 09-30 a break
wanted the most room of anything (0.951 of the couple's width on the shipped cast). 09-30's
`stopClearOf` made a broken hand stop short of the other dancer instead of being given room —
which was the point — and the room a break asks for fell to barely more than two bodies passing
hands-free (0.576 against 0.550). So a break is now danced almost as a Partner Trade, and at that
range `constrainArm` folds the free arms in exactly as it does on a pass. That is what Ryan saw.
Nobody decided a broken turn-under should be a close pass; it fell out of 09-30.

The first screenshot (10-10) was the reshape draw. The third (after a refresh) was the break
draw, and the checker's own numbers match the plan: hands 0.874 apart measured against 0.825
planned, torso 0.000. 🔴 The **second** — hands apart, torso 0.000, but *not* close — I cannot
account for from the code. The dev server was hot-reloading `DanceFloor.tsx` under that page, and
a refreshed module re-tosses the sizing while the cached plan keeps the old draw, which would
give exactly a break posed at a reshape's distance. Likely, not shown.

## What changed

- **A 🧪 coin flip control** on the review page: `toss` / `reshape` / `break`, and what is on
  screen (read back off the floor). `DanceFloor` takes `accommodation?`, which outranks the
  style. Calling it remounts the floor, because the plan is cached per execution.
- **The contact rule follows the style, not the draw.** It was asked only when the draw was a
  reshape, so "the L" landing on a break — the one pose that rule should be loudest about — was
  the pose it said nothing on. A style that keeps contact is now owed joined hands however the
  coin lands.

## Open, for Ryan

1. ~~Should "the L" and "duck" toss at all?~~ Answered the same day: no. See below.
2. **Is a broken turn-under meant to be a close pass?** It is one now, by accident of 09-30.
3. Under authored poses both questions may dissolve: a pose Ryan drags is of one style at one
   distance, and nothing tosses.

## And then the squeeze came out

Ryan, on the close pass: *"I don't like the squeeze anymore — can you remove that altogether —
make a note of it so we can find it easily if we want it back or save it off somehow but I don't
want it used in the pass by either."*

**No ADR** — Ryan: *"we're still experimenting with this other stuff so still no adrs for
this."* **`FOLD_FREE_ARMS = false` in `arm-pose.ts`** is the whole change and the whole way back: `constrainArm`, `reachAllowance`
and `PERSONAL_SPACE` are still there and still unit-tested; `poseArms` just does not call the
fold. Search `FOLD_FREE_ARMS` or "the squeeze".

🔴 **It was doing a job on the accepted figures.** With it off, the two dancers' arms pass
through each other on **Dosado** and **Pass Thru** (`arm-geometry.test.ts`). Those two cases and
the test of the fold itself are skipped on the flag, so they return with it; the Allemande's case
still runs. The Dosado's 08-21 acceptance was of the folded pass.

It also was the only thing limiting an *emoting* dancer's free arm against a partner (ADR-0010's
arm row). The floor is the one limit left.

## ADR-0010, split

Switching the fold off left ADR-0010 saying something no longer true in one row of its table,
and the convention has no status for "partly superseded". Ryan: *"supersede 10 with individual
adrs for the remaining accepted parts of it."* So ADR-0010 is `Superseded by` six, one decision
each, restating what still stands and nothing new:

| ADR | decision |
|---|---|
| 0059 | emote and choreography share a dancer by channel — owned, limited or free |
| 0060 | a channel is limited exactly when it feeds the silhouette (`rigidParts`) |
| 0061 | the choreography owns position, body facing and a gripped arm |
| 0062 | head facing, forward lean and the bob are the emote's |
| 0063 | an unclassified expression channel is owned |
| 0064 | the contract governs engine-driven dancers only |

🔴 **The ungripped arm is the one row with no ADR now**, on purpose, until the experiment
settles. `CHANNELS` still calls it `limited`; the floor is all that limits it. ADR-0060 records
that ADR-0010's *"decided but not enforced"* for the silhouette channels stopped being true the
day it was written.

## The L and the duck no longer toss

Ryan: *"yes lets remove the flip for the L and duck."* `accommodationFor` returns `RESHAPE` for
`full-l` and `duck-under`, `BREAK` for `lazy-l`, and still `null` — toss — for `casual`, which
has no pose to be reproducible about yet. So three of the four styles now show one pose per
address. No ADR, same reason. This reverses a deliberate line in `turn-under.ts` (*how a pair
reach each other is a different question from how an arm goes over a head*); the doc there now
says why it was reversed. The 🧪 coin flip control still outranks the style, so the break can
still be stood up on an L cell to look at.

## State

Suite 932 passing / 38 failing (the same 38) / 3 skipped on `FOLD_FREE_ARMS`; `tsc -b` clean,
eslint 0 errors. Uncommitted: `DanceFloor.tsx`, `DanceReviewScene.tsx`, `arm-pose.ts`,
`arm-geometry.test.ts`, `turn-under.ts` and its test, ADRs 0059–0064, ADR-0010's status line,
the ADR index, this entry, PROGRESS. The coin-flip
control and the squeeze being off are both unwatched.
