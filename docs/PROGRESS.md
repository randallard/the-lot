# Progress & Status

_Last updated: 2026-07-26_

## Status / next

**Status:** A real, working R3F application with no dance subsystem and, until today, no
docs. The world, tutorial, NPCs, phone, chat, emotes, body/eye editors, game launching, and
backup/restore all work and have been played. Code development paused around 2026-04-06
(`609e989`); this entry resumes the repo as part of the square-dance arc.

**What just happened (2026-07-25):** the docs half of the ADR-0002 retrofit. `docs/adr`,
`docs/journal`, `docs/reviews`, this file, and a real README now exist; the root `journal/`
and `plans/` moved under `docs/` with history preserved; and **seven ADRs were backfilled**
for decisions taken between 2026-03-06 and 2026-03-28, each evidenced against the code and
the commit that introduced it. No `src/` changes were made — deliberately, so the retrofit
creates no merge surface against M4. The **CI half landed the same day** and did touch
`src/` — see [How CI landed](#how-ci-landed).

**What just happened (2026-07-26, latest):** the **arm channel** and its **contact
tracking**, over two rounds of Ryan's render notes. The new pure `src/dance/arm-pose.ts`
owns both; the driver eases the rig toward what `poseArms` returns and publishes what the
arms are touching.

- **A forearm grip is two horizontal, antiparallel forearms** along the line between the
  dancers, at one shared height, side by side, each hand at the other's elbow. Two earlier
  attempts (aim the forearm at the grip point; stand it up vertically) were both
  compromises against a constraint that doesn't exist — **these caricatures have no upper
  arms, necks or legs**, so nothing about arm placement has to satisfy anatomy. What has to
  be right is contact.
- **Contact is tracked**, per frame, in world space: every forearm as an `{ elbow, hand }`
  segment, plus the pivot, the pair's separation, and where each gripping hand is on its
  partner's forearm (`along`, and `gap` where negative means a hold). Out through
  `DanceFloor.onArms`; the debug overlay prints **min → max since the grip engaged** and the
  scene draws markers (black pivot, blue elbows, red hands). Ranges rather than instants
  because the last defect was pure drift and an instantaneous readout hid it.
- **The pose is written exactly; only the grip blend is eased.** The driver used to ease the
  rig *toward* the pose, which lagged — and a lagged local pose is an arm glued to its own
  dancer instead of to the pivot, so the pair slid and let go twice per breath. Engaging and
  releasing blend; a held grip is rigid to the last decimal.
- **Proximity tucks** the forearm on the side a dancer is passing on, far enough in that
  the hand is inside the torso — a bound that makes it provably enough rather than tuned
  by eye.
- **The 29% orbit breathing stays** — Ryan likes it. It was flagged as an engine defect
  this morning; it's a keep. Don't "fix" it.

Full reasoning, in order: [the horizontal grip and
tracking](journal/2026-07-26-the-grip-is-horizontal-and-tracked.md) (superseding the vertical
grip in [the entry before it](journal/2026-07-26-forearm-grips-and-arm-tucks.md)), then
[the grip was easing, not holding](journal/2026-07-26-the-grip-was-easing-not-holding.md) —
whose lesson generalises: **if the driver transforms what a pure function returns, the pure
function's tests do not cover the driver.** 268 tests green.

**Next: M4 — the choreography adapter.** A new `src/dance/` subsystem that drives NPCs from
the square-one engine. Everything needed to start it cold is in
[What M4 actually contains](#what-m4-actually-contains) below. **No longer blocked:**
square-one M2 landed 2026-07-25 and `square-one@0.1.0` is installed here as a pinned git
dependency — `import { applyCall, createPerformance } from "square-one"` resolves at runtime
and at the type level. See [Consuming square-one](#consuming-square-one).

**The CI + supply-chain half is done (2026-07-25).** `.github/workflows/{ci,docs-hygiene,stance-review}.yml`
and `scripts/docs-hygiene.py` are in, and all eight gates pass. Getting there took more than
copying: see [How CI landed](#how-ci-landed) for what the handover predicted correctly, what
it missed, and the two decisions it forced ([ADR-0008](adr/0008-react-hooks-rules-excepted-at-the-ref-boundary.md),
[ADR-0009](adr/0009-empty-catch-is-the-best-effort-storage-idiom.md)).

## Architecture

townage is the **world** repo of the square-dance game family planned in
`~/Development/work/square-dance-planning/` (its ADR-0003 set the repo split). It owns the
world-interaction chunks of the arc: gesture building blocks, two-couple square encounters,
full-square progression, the club layer, and the IRL club bridge. It consumes **square-one**
for choreography and owns none of it.

This repo's own decisions ([full index](adr/README.md)):

- 3D renderer: React Three Fiber over three.js — [ADR-0001](adr/0001-react-three-fiber-over-babylon.md)
- Cross-layer per-frame state: shared refs, not React state — [ADR-0002](adr/0002-shared-refs-across-the-r3f-dom-boundary.md)
- Rush navigation: one numeric enum — [ADR-0003](adr/0003-rush-mode-as-a-numeric-enum.md)
- Game state: facts stored, phase derived, UI override — [ADR-0004](adr/0004-derived-phase-with-ui-override.md)
- Games: separate deployments, URL-hash handoff — [ADR-0005](adr/0005-games-launch-by-url-hash-handoff.md)
- NPC dialogue: serverless proxy, opt-in, degrading — [ADR-0006](adr/0006-npc-dialogue-through-a-serverless-proxy.md)
- Storage: `localStorage` only, versioned backup file — [ADR-0007](adr/0007-localstorage-with-a-versioned-backup-file.md)

Inherited from the planning effort: **ADR-0002** (retrofit this repo, don't restart) and
**ADR-0006** (consume square-one as a pinned git dependency with a local link during
co-development).

## What works

Played and working:

- **The world** — white void with fog, ground plane, follow camera with cutscene zoom
  (`world/`).
- **The tutorial** — two-part bot discovery at hardcoded spawn points, rush navigation with
  a directional arrow, drag-to-assemble modal, NPC Ryan's introduction, phone hint, free play.
- **Four NPCs** — NPC Ryan plus Myco, Ember, and Sprout, at hardcoded world positions
  (`MYCO_POS`, `EMBER_POS`, `SPROUT_POS` in `world/World.tsx`), each with a personality
  config, per-game reactions, and a friendliness score that nudges on play and chat.
- **The phone** — homescreen plus Find, Messages, Settings, Games, Town Report, and per-NPC
  rank detail. Keyboard shortcuts `f`/`m`/`s` on the homescreen.
- **NPC chat** — opt-in Claude Haiku dialogue through the `api/npc-chat.ts` edge proxy, with
  structured tool-use replies, support escalation, a daily mood check, NPC "sleep" as a
  rate limit, and a full emoji fallback path for players who decline (ADR-0006).
- **Game launching and return** — Spaces Game and King's Cooking, launched by URL-hash
  handoff with session reuse for unfinished games, plus async result pickup from Vercel KV
  for games abandoned without returning (ADR-0005).
- **Emotes and animation** — `AnimationController` with a play queue, an interrupt stack
  (depth-capped at 10), 0.25s crossfade blending, and loop support; an emote panel and an
  in-game emote builder.
- **Character editors** — body shape, eye, and arm-action editors with live preview, all
  parameterised over primitive geometry (`services/body-shapes.ts`).
- **Backup and restore** — versioned export/import (`BACKUP_VERSION = "1.1.0"`) with fixed,
  dynamic, and optional key classes (ADR-0007).

**Tests: 244 pass** (19 files), as of 2026-07-26. The two `fetch-pending-results` failures
that stood here were fixed on 2026-07-25 (worklist item 1); the rest of the growth is M4's
`src/dance/` — frame, body clearance, and the arm channel.

Note: `pnpm test` currently refuses to run behind pnpm's build-verification gate
(`ERR_PNPM_IGNORED_BUILDS` on `esbuild`). Either run `pnpm approve-builds` once, or invoke
`./node_modules/.bin/vitest run` directly.

## M4 — what to check in the render

*Built 2026-07-25, **not yet visually verified**. The subsystem is in `src/dance/`;
`pnpm dev` then `http://localhost:5173/#dance`. Buttons switch call, the slider sets tempo
(30 bpm makes direction obvious), the checkbox toggles drift re-fitting, ⏸ freezes dancers
mid-move with a live `beat n.n / total` readout — pause at a beat from the Dosado table
below and compare the screen against the simulated positions.*

Gates are green — 177 tests, lint 0 errors, typecheck and build clean — and the driver's
output has been simulated frame-by-frame headlessly. **None of that validates the geometry.**
square-one's Dosado spec marks its waypoints "provisional until rendered" and this render is
the check they are stacked behind, so the list below is the actual deliverable.

**2026-07-26, before re-watching:** the head-facing marker was on the **back** of the head
(local −z; townage characters face +z — `atan2(dir.x, dir.z)` convention, eyes at
`+eyeZOnSphere`). Ryan caught it from a paused screenshot. The choreography maths was never
wrong, but every facing observation made before the fix was mirrored — re-check items 1–3
with the dot now honestly on the face. The default cast's square is modestly bigger than the
old 2.2 (~2.60 scale): pair clearance is measured on the 3D rigid silhouette (ADR-0012;
heads count, height-aware), which caught that Myco's/Ember's heads were silently clipping at
2.2 — an earlier flat-disc measurement (ADR-0011, superseded same day) had ballooned it to
~4.44 and read as dancers avoiding each other. See the
[journal entry](journal/2026-07-26-body-derived-frame-scale.md).

In order of how likely each is to be wrong:

1. **Allemande Left's turn direction.** A left arm turn must be **counterclockwise viewed
   from above**, with each dancer's *left* side toward the pivot. Highest risk item: this
   column was already wrong once in square-one's spec and corrected on 2026-07-25, and
   nothing but a render can confirm the correction. If it turns the wrong way, that is a
   square-one spec fix, not a townage one. Judge it off the **facing marker** (the dot is on
   the face since the 2026-07-26 fix), not off the arms: the arm that raises is now the one
   nearest the pivot *by construction*, so it can no longer disagree with the engine. The
   old note here — swap the anatomical mapping in `Dancer.tsx` if the right arm raises — no
   longer applies to the grip.
2. **The forearm grip itself** (new 2026-07-26, third pass — and the overlay now gives you
   numbers, so this one need not be judged by eye). Expect both left forearms **horizontal,
   antiparallel, side by side**, level with each other, holding through the turn and
   releasing half a beat before the step-out. Read the **contact panel** under the beat
   clock, which prints **min → max since the grip engaged**: only `separation` should have a
   spread. For the default cast everything else should be flat — `a hand↔pivot 0.191`,
   `a along 0.400`, `a gap −0.082`, `b along 0.000`, `b gap −0.000`: Ember's hand exactly at
   Myco's elbow, Myco's hand 40% up Ember's longer forearm, both gaps ≤ 0 (negative is a
   hold; a hand wrapping a forearm overlaps it). **Any spread outside `separation` is the
   defect**, and a positive `gap` is a hand not holding. The scene's markers say it visually:
   red hands and blue elbows should look nailed to the black pivot dot while the bodies
   swing past.
3. **The grip holds steady; the bodies breathe around it.** This is the *model*, confirmed
   by Ryan, not a compromise: the join is rigid — pinned to the pivot at a fixed radius,
   only rotating — and **the undrawn upper arm is the compliant link** that takes up the
   pair's 0.46-unit separation pulse, exactly as a real one would. So the visible gap
   between a torso and its own forearm opens and closes; the forearms themselves never
   stretch, squash, or drift off the pivot. Asserted **twice**: on the pose (*"holds steady
   and only rotates while the bodies breathe around it"*) and on the driver's own frame loop
   (*"driven frame by frame"*) — because the first version checked only the pose, and the
   render slid anyway.
4. **The arms on the passes.** Dosado and Pass Thru: the arm on the side being passed
   should slide **into the torso** as the pair closes and swing back out after — right arms
   on the Dosado's forward pass, left arms on the return, which is the call's own
   right-shoulders-then-left falling out of the geometry rather than being scripted. The
   outside arm should keep hanging free the whole time.
4b. **The orbit breathing is a keep.** `arm-turn` emits a waypoint every quarter turn and
   the stepper interpolates linearly, so the pair walks the **chords** of the orbit:
   separation oscillates 1.56 → 1.10 → 1.56 world units every two beats, a 29% radius dip.
   Ryan watched it and likes it, so it stays — do not "fix" it on discovering the
   arithmetic. (If it ever must go: waypoints every eighth turn take the dip to 7.6%.)
5. **Dosado facing.** Facing must stay *constant* for the whole call — dancers orbit each
   other face-forward and never turn. Any rotation means the frame's facing mapping is wrong.
6. **Right shoulders first** on Dosado and Pass Thru, per the definitions.
7. **Return to home.** Dosado must end exactly where it started. The simulation says it does,
   at beat 6.
8. **Pass Thru clearance** — expect it to look tight at default bodies (0.06 world units of
   daylight is correct — real dancers brush shoulders). Also flip the new **"bodies" switch**
   (default / mixed / max): `mixed` and `max` must show a visibly bigger square with everyone
   still clearing. See the size section below.

Dosado's waypoints in **engine units** (multiply by the frame's scale for world
distances — the scale is body-derived now, ~2.60 for the default cast). Every beat
listed; the 2026-07-26 render watch caught a return-leg defect hiding in a skipped
beat-5 row, so no more elided rows:

```
beat |    A engine    |    B engine    | doing
   0 | ( 0.00, -0.50) | ( 0.00,  0.50) | start, facing each other
   1 | (-0.15, -0.10) | ( 0.15,  0.10) | forward, veering into own-left lanes
   2 | (-0.15,  0.30) | ( 0.15, -0.30) | right shoulders pass
   3 | ( 0.15,  0.30) | (-0.15, -0.30) | sidestep right, crossing behind
   4 | ( 0.15,  0.10) | (-0.15, -0.10) | backing straight (half walking pace)
   5 | ( 0.15, -0.10) | (-0.15,  0.10) | left shoulders pass
   6 | ( 0.00, -0.50) | ( 0.00,  0.50) | closing diagonal onto home — beat 0→1 mirrored
```

Watched 2026-07-26 (first human eyes), fixed in square-one **twice** the same day,
both spec defects the "provisional until rendered" marker predicted. Round one:
dancers veered outward after beat 4 (backward pass re-applied its lane veer from a
displaced start; the spec table had skipped beat 5). Round two: the first fix
backed straight then side-stepped a hard 90° corner at beat 5 — Ryan called it
"straight back then correct", and the CALLERLAB definition agrees with him:
*"walking a smooth circular path … slide slightly to the left to return"* — the
closing lateral blends into the backing as the beat-0→1 veer mirrored (`pass`'s
new 3-beat `close` exit; the chain is now three blocks, 2+1+3 = 6). The table
above is the final geometry. **Re-watch the return leg**, then Dosado is done.

### Dancer size vs. lane width — immediate defect closed 2026-07-26

Passing dancers clear each other only while `scale × 0.3 ≥ r₁ + r₂` — clearance is a *pair*
property. `SHAPE_BOUNDS` allows `body.radius` up to 0.60, so at a fixed scale 2.2 the body
editor could produce dancers who physically cannot pass each other, and the engine cannot see
it — square-one works in engine units where dancers are points with no radius.

**Fixed at the transform layer ([ADR-0012](adr/0012-pair-clearance-from-the-3d-silhouette.md),
journal [2026-07-26](journal/2026-07-26-body-derived-frame-scale.md)):** `DanceFloor` derives
its frame scale from the occupants' pairwise clearance needs — `rigidParts` +
`lateralClearance` (height-aware, side-on, heads count, forward overhang doesn't) through
`scaleForGaps` — never below the default, growing when some pair needs more room.
Whole-square breathing, done coarsely; no combination the editor can produce clips
side-to-side. The debug scene grew a "bodies" switch to verify the extremes. (ADR-0011's
first cut measured a flat disc per dancer; superseded the same day when the render showed
it ballooning the square.)

**Still open, deliberately:** local breathing (engine-side, hangs on the brief's question 1),
size-derived step cadence, and hand-contact height for the 0.10–2.00 height range — whose
seed is now `gripHeight` in `arm-pose.ts`: the **mean of the two dancers' resting elbow
heights**, which is where a horizontal forearm naturally sits, asserted in
`arm-pose.test.ts` so step 3 has to replace it deliberately. Its known failure: past some
height difference the taller dancer should do nearly *all* the accommodating, because an
adult can drop their arm to a child's height and a child cannot raise theirs to an adult's.
**A second placeholder sits beside it:** `contactRadius` takes half the *shorter* forearm,
so a mismatched pair grips at the short-armed dancer's reach — right in spirit, unexamined
at the extremes. **The
design work continues in
[`~/Development/work/square-dance-planning/briefs/dancer-size-and-accessibility.md`](../../work/square-dance-planning/briefs/dancer-size-and-accessibility.md)**
— it reaches into the engine seam, and it is where representation and accessibility get
decided. Do not paper over any of it by clamping body size.

## Consuming square-one

`package.json` pins `square-one: github:randallard/square-one#v0.1.0` (planning ADR-0006).
Verified 2026-07-25: `applyCall`, `applyCallToPair`, `createPerformance` and the exported
types all resolve, and `tsc -b` passes against them.

**The one sharp edge — `allowBuilds` is keyed by commit hash.** square-one gitignores its
`dist/`, so pnpm must run its `prepare` (a plain `tsc`) after cloning. pnpm's blocked-scripts
default refuses that until it is allowed, and it will *only* accept the full
`square-one@https://codeload.github.com/.../<sha>` key — a plain `square-one: true` is
rejected. **That sha changes on every square-one tag**, so bumping the dependency is a
two-line edit here, not one.

Do not paper over this by allowing builds broadly; the individual-exception rule is the point.
If the churn becomes annoying, the fix belongs in square-one — commit its `dist/` so no build
step is needed, which makes tags drop-in. Flagged to the planning effort as a real cost of
ADR-0006's git-dependency choice.

Local co-development uses a link override instead of the pin, per ADR-0006. CI always installs
from the pin.

**⚠ The link is ACTIVE right now (2026-07-26):** `pnpm-workspace.yaml` carries an uncommitted
`square-one: link:../square-one` override so the day's engine fixes (Dosado return leg,
`Motion.grips`) render locally. Before committing anything here that depends on them:
square-one needs a **v0.2.0 tag** (minor — `grips` is new API surface), the pin and the
`allowBuilds` hash need their two-line bump, and the link override comes out. Do not commit
the link (the ADR-0006 footgun: green-against-link, red-against-pin).

## Supply chain

Settings live in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) — pnpm 11 reads them there,
not from `.npmrc`.

- **`minimumReleaseAge: 1440`** (1 day) — [pnpm's documented recommendation and its v11
  default](https://pnpm.io/settings): "in most cases, malicious releases are discovered and
  removed from the registry within an hour." Now stated explicitly rather than inherited, so
  a default change cannot move it silently. Verify with `pnpm config get minimumReleaseAge`.
- **`overrides: "brace-expansion@5": ">=5.0.8"`** — GHSA-mh99-v99m-4gvg / CVE-2026-14257
  (High, CVSS 7.5, DoS). OSV gives one range, introduced `0` fixed `5.0.8`.
  **Scoped to the 5.x line deliberately:** brace-expansion 5.x changed its export shape, so a
  blanket override throws `expand is not a function` inside `minimatch@3.1.5` on any
  brace-containing pattern — which this repo's eslint config has (`**/*.{ts,tsx}`). Measured,
  not guessed: the blanket version takes `pnpm lint` down with exit 2.
- **One `auditConfig.ignoreGhsas` entry remains**, for the residual `brace-expansion@1.1.16`.
  The reason is *not* a quarantine wait and *not* a severity judgement: **no patched version
  is compatible with `minimatch@3`'s API.** Dev-only path; nothing reaches the shipped
  bundle. `osv-scanner.toml` is deleted — one ignore, in one place, with a true reason.

### What the first attempt got wrong

Worth keeping, because it was confidently documented and still false. The comments asserted a
72-hour quarantine was blocking the fix. pnpm's actual default is 1440 minutes, the fix
cleared it on 2026-07-24, and the timed ignores were waiting for a deadline that had already
passed. The sibling repo `square-one` had the mirror-image bug — an age gate written into
`.npmrc`, where pnpm never read it, so it had no gate at all while believing it had a 7-day
one. Both were fixed together; see square-one's ADR-0011.

**The lesson both repos paid for: a supply-chain control you have not verified is not a
control.** `pnpm config get minimumReleaseAge` is one command.

## What's stubbed, dead, or unfinished

- **`board-creation` is wired but unreachable.** The phase, its resume point, and its
  `BoardCreator` UI all exist and are handled in `App.tsx` — but nothing sets it. The comment
  at the call site says "kept for potential future use". Board creation moved into the games
  themselves.
- **`docs/plans/npc-documentation-lookup.md` is unimplemented.** It designs a "booklet" for
  NPC Ryan — static markdown under `public/docs/` plus a keyword index, fetched on demand via
  tool use. There is no `public/docs/` directory and nothing in `src/` references it.
- **`docs/plans/gettcheese-tutorial-game.md` is largely superseded.** It plans an in-phone
  tutorial with a ported game engine under `src/game/`. That directory does not exist; the
  games stayed separate deployments instead (ADR-0005).
- **`@react-three/rapier` is a dependency with zero imports.** Physics was provisioned, never
  adopted (ADR-0001).
- **`src/npc/`, `src/bot-play/`, and `src/overlay/games/` are empty directories.** *They are
  not abandoned repo structure* — `git ls-files` returns nothing for all three and no commit
  in the repo's history has ever touched them. They are untracked local remnants on one
  machine, invisible to a fresh clone. Safe to delete; nothing to salvage. (Recorded because
  the M3 handoff brief flagged them as an open question — this is the answer.)
- **`FIXED_KEYS` in `backup.ts` covers 12 of the 23 `townage-` keys the code writes**, with
  no test asserting the namespace is fully accounted for (ADR-0007).
- **`BotParts.tsx` types its `rushMode` prop as `RefObject<number>`, not `RefObject<RushMode>`** —
  a small type-safety hole at the one site that writes `2` (ADR-0003).
- **Debug `console.log` calls remain** in `App.tsx`, `useGameState.ts`, and elsewhere,
  including one wrapping `setShowChatInfo` purely to print a stack trace.
- **Font rendering on Linux** — an unresolved 2026-03-06 finding. Courier New isn't installed;
  the fallback renders oddly at 12px. Deferred, no clock on it; see
  [`reviews/README.md`](reviews/README.md).

## What M4 actually contains

*This section is the M4 handover. It should be enough to start the work cold.*

A new `src/dance/` subsystem in townage, consuming square-one:

- **Frame** — the unit-square ↔ world transform (dance-floor origin, scale, orientation).
  square-one's square frame is abstract and **re-fits to actual dancer positions** as a
  square migrates, so this transform has to respect that drift rather than pin dancers to
  fixed floor coordinates.
- **Driver** — ticks square-one's performance stepper from `useFrame`, feeds the player in as
  an **externally-driven dancer**, and writes position and facing onto dancer rigs. Per
  square-one's ADR-0007 the stepper is the primary interface; ideal path data is what it
  produces with every performance coefficient turned off.
- **Blend contract with the existing animation system** — choreography owns transform and
  facing; emotes own pose. The seam is **not clean**, and the specifics matter:
  - `AnimationController.tick()` returns a `ResolvedPose` — arm rotations, head delta,
    body lean, `bodyDeltaY`, `bodyDeltaRotY`. It is pose-only. Nothing in it moves a
    character through the world.
  - But `Player.tsx` currently gives emotes a **veto over locomotion** (`else if (!isEmoting)`
    guards the movement branch) and lets them **overwrite facing** (`rotation.y` is set from
    `emoteBaseRotY + bodyDeltaRotY` while emoting). A driver that owns transform and facing
    collides with both. Resolving that is the first real design decision of M4 — and it
    deserves an ADR.
  - Grip-bearing blocks (square-one's `arm-turn`) carry hand semantics that must drive arm
    poses. This section originally said the driver should **request poses through
    `services/arm-actions.ts`**; that was **decided the other way** on 2026-07-26.
    `arm-actions` is the canned-keyframe emote system, and an engaged arm tracks live
    formation geometry — so `src/dance/arm-pose.ts` owns it, alongside transform and facing.
    The 2026-07-26 arm work added a second case that settles it: the **proximity tuck** is
    not in the engine's data *or* a canned pose, it is derived from where the other dancer
    is this frame, and an emote flinging both arms wide during a shoulder pass would put an
    arm through another dancer. Both belong in the ADR-0010 contract.
  - `bodyDeltaY` is a *visual* offset only — `positionRef` stays at ground level. The driver
    should follow that convention.
- **`<DanceFloor>`** — places N dancers, N ∈ {2, 4, 8}. Two-couple-safe: don't hard-code 8.

**Done when:** a debug scene has two NPCs looping Dosado, driven by square-one. That render
is also what **validates square-one's provisional waypoints** — its Dosado spec marks them
"provisional until rendered", so M4 is the check three calls of geometry are stacked behind.

**Before starting**, read in this order:
1. `~/Development/square-one/docs/PROGRESS.md` — is M2 (consumable package) done?
2. `~/Development/square-one/docs/adr/0007-stepper-primary-ideal-paths-derived.md` — the interface you're consuming.
3. `~/Development/square-one/docs/spec/calls/dosado.md` — the first call to render.
4. `~/Development/work/square-dance-planning/PROGRESS.md` — the cross-repo milestone table.

**Expect to write ADRs** for: the emote/choreography blend contract, and how teaching content
(which NPC teaches what, unlock ordering) is represented — the planning effort's proposal is
that it's townage data, keeping square-one pure, and it comes due at M5.

## How CI landed

*Replaces the handover section that stood here. All eight gates pass locally and in Actions:
`install --frozen-lockfile`, `lint`, `test`, `build`, `audit --audit-level=high`,
`audit signatures`, the license allowlist, and `docs-hygiene`.*

**The handover's measurements were exact** — 61 lint errors, 25 warnings, ~26 of them
`react-hooks/*`, `docs-hygiene.py` already clean, `ci.yml`'s `detect` job self-skipping the
Rust half. All verified before acting on them.

**What it missed, all in the supply-chain job it hadn't run:**

- `pnpm audit --audit-level=high` found **27 vulnerabilities (15 high, 1 critical)** — every
  one a devDependency. `pnpm update` within existing semver ranges cleared 26.
- The 27th, `brace-expansion` (GHSA-mh99-v99m-4gvg), was first handled as a timed ignore in
  `pnpm-workspace.yaml` **and** `osv-scanner.toml` — two entries because `pnpm audit` and the
  OSV scan are different tools over different databases, something only the real CI run
  revealed. **Both were wrong and have been replaced (2026-07-25, later).** The stated reason
  — waiting out "pnpm's 72-hour `minimumReleaseAge` quarantine" — was wrong twice over: the
  quarantine is **1440 minutes (1 day)**, pnpm's documented default and recommendation, and
  the fix cleared it on 2026-07-24. Nothing was ever being waited for. See
  [Supply chain](#supply-chain) for what replaced it.
- `pnpm exec license-checker-rseidelsohn` wasn't installed — the template has no
  `package.json`, so its pnpm path was never exercised. Added as a devDependency.
- The license allowlist then failed on **`@react-three/rapier`, which publishes with no
  license field and no LICENSE file**. Since ADR-0001 already recorded it as provisioned but
  never imported, it was **removed** rather than excepted. Physics returns as a deliberate
  choice when something needs it.
- Four more licenses had to be allowed, all permissive toolchain transitives: `CC-BY-4.0`
  (caniuse-lite — browser data, not code), `(MIT AND CC-BY-3.0)` (spdx-ranges), and `MIT*`
  (webgl-constants — MIT by its LICENSE file, undeclared in `package.json`). Recorded inline
  in `ci.yml`.
- `pnpm/action-setup` needs a version source. Added `"packageManager": "pnpm@11.5.3"`, which
  also pins CI to the pnpm that produced the lockfile.
- pnpm 11 no longer reads `pnpm.*` settings from `package.json`; they live in
  `pnpm-workspace.yaml` now. That's where `allowBuilds: esbuild: true` went — which is also
  what fixed `pnpm test` locally.

**The 61 lint errors resolved as 35 mechanical + 5 ordinary + 21 architectural.** The
mechanical ones were fixed. So were the 5 ordinary ones — and one of those was hiding a real
bug: `SettingsApp`'s `settingsActions` memoized on `[onOpenBodyEditor]` while closing over
`prefs`, so the keyboard shortcut for "toggle AI responses" fired against stale preferences.
The remaining 21 are `eslint-plugin-react-hooks` objecting to ADR-0002's shared-ref pattern
on purpose; they are excepted by path, per [ADR-0008](adr/0008-react-hooks-rules-excepted-at-the-ref-boundary.md).

**Deliberately deferred: `eslint-plugin-react-hooks` 7.1.1.** It arrived incidentally in the
audit-driven update and materially changes the lint surface — `refs` goes 6 → 47 and extends
to `App.tsx`, plus 6 `set-state-in-effect` and 2 `preserve-manual-memoization` errors needing
real restructuring in the game-return handler and the assembly-cutscene step machine. The
plugin is pinned to exact `7.0.1`; adopting 7.1.1 is worklist item 3, with play-testing.

## Worklist

1. ~~Fix the two failing `fetch-pending-results` tests~~ — **done 2026-07-25**.
2. **M4: `src/dance/`** — frame, driver, blend contract, `<DanceFloor>`. See above.
3. **Adopt `eslint-plugin-react-hooks` 7.1.1** (pinned at exact `7.0.1` today, per
   [ADR-0008](adr/0008-react-hooks-rules-excepted-at-the-ref-boundary.md)). Needs 6
   `set-state-in-effect` and 2 `preserve-manual-memoization` fixes in the game-return handler,
   the assembly-cutscene step machine, `World`, and `VirtualJoystick` — all behaviour-critical,
   so do it with the app running, not blind.
4. ~~Drop the `brace-expansion` ignores on/after 2026-07-26~~ — **done 2026-07-25**, and the
   premise was wrong. See [Supply chain](#supply-chain): the patch had already cleared the
   real (1-day) gate, `osv-scanner.toml` is deleted, and a **scoped** override carries the
   5.x line. One audit ignore remains, for a different and truthful reason — no patched
   version is compatible with `minimatch@3`'s API. Drop it when the toolchain stops pulling
   `minimatch@3`.
5. ~~CI + supply-chain gates~~ — **done 2026-07-25**. See [How CI landed](#how-ci-landed).
6. Delete the three untracked empty directories; tighten `BotParts`'s `rushMode` prop type;
   strip debug logging.
7. Add a test asserting every `townage-` key is accounted for in `backup.ts` — the CI license
   gate just demonstrated the value of machine-checked inventories.
8. Work down the 24 `react-hooks/exhaustive-deps` warnings. Non-blocking, but they are the
   backlog the pinned plugin is deferring, not architecture.
9. Arc chunk 1 (M5): an NPC teaches `arm-turn`, the player performs it, townage records that
   they know it. Needs the teaching-content ADR.

Deferred with reasons: physics (rapier removed — re-add deliberately when something needs it,
and resolve its missing license declaration then); the NPC documentation "booklet" plan; the
in-phone gettcheese tutorial.

## Open questions

- **Emote/choreography arbitration** — who wins on facing and locomotion when both want them?
  Due at M4, first thing.
- **Teaching-content representation** — townage data or square-one? Proposal: townage. Due at M5.
- **When does the ref-plumbing pattern break?** ADR-0002 names a promotion condition: the
  per-entity `<name>ScreenPos` refs grow linearly with the cast, and `<DanceFloor>` needs to
  place up to 8 dancers. M4 may be the event that triggers replacing them with a keyed
  registry.
- **Database / backend: deliberately not yet.** Everything is client-side (ADR-0007). The
  named trigger for the backend deliberation is the arc's **social layer** — sharing custom
  moves, sequences, and tips *between people*. Until then: versioned plain-data files.

---

_History accretes below, oldest first. See [`journal/`](journal/README.md) for the narrative
and [`reviews/`](reviews/README.md) for stance reviews._

- **2026-03-06** — Repo scaffolded. White void, two-part bot discovery, rush navigation,
  drag-to-assemble, pocket inventory, mobile joystick. R3F chosen over Babylon; the shared-ref
  pattern and the derived-phase model both established the same day. See
  [`journal/2026-03-06-session-1-white-void-and-bot-parts.md`](journal/2026-03-06-session-1-white-void-and-bot-parts.md).
- **2026-03-07 → 2026-04-06** — Undocumented at the time; reconstructed from commits. Phone
  tutorial, the NPC chat proxy and game-launch handoff (`a2f71fa`), keyframe and emote UI,
  backup/restore (`5b58561`), eye and body editors, slider and phone polish (`609e989`).
- **2026-07-25** — Docs retrofit (planning M3). `docs/` stood up, root `journal/` and `plans/`
  moved in, README replaced, seven ADRs backfilled, this file created. No `src/` changes. See
  [`journal/2026-07-25-docs-retrofit.md`](journal/2026-07-25-docs-retrofit.md).
- **2026-07-25** — CI half landed (`b8ec634`, `782fc02`). Nine gates green on `main`; 61 lint
  errors to 0; tests 163/163; 27 audit findings to one dated, self-expiring ignore;
  `@react-three/rapier` removed. ADR-0008 and ADR-0009 came out of it. See
  [`journal/2026-07-25-ci-half.md`](journal/2026-07-25-ci-half.md).
- **2026-07-26** — Body-derived frame scale (ADR-0011). `scaleForBodies()` closes the brief's
  immediate defect: the full `SHAPE_BOUNDS` radius range dances without intersecting, the
  debug scene can prove it, 186/186 tests. See
  [`journal/2026-07-26-body-derived-frame-scale.md`](journal/2026-07-26-body-derived-frame-scale.md).
