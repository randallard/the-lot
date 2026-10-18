# 2026-10-18 (1) — a posing screen beside the review

Ryan: the moves review *"is not going well and I need to have more control over positioning the
characters and their arms."* `#review` grew into a bench of solver dials, and the 10-10 change
(Ryan poses, the rules check) needs a screen built for authoring. So: **`#review2`**, beside it and
not replacing it. The plan lives in `work/square-dance-planning/review2/`. The decision is that
effort's ADR-0001: controls first, real only where the floor already gives it.

## What's in it

`Review2Scene.tsx`, addressed `#review2=<figure>/<beau>-<belle>` (`review2-route.ts`). No step in
the address: the screen is about the whole move, and where you are along it is the scrubber's.

- **Real:** the pairing selects; play/pause through the floor's `paused`; step ±1/10 and scrub
  through `seek` (the beat is `t × figure.beats`); the playhead off `onBeat`; a click names the
  mesh hit and lights it.
- **Record only, and says so:** the part modal's dials and its linked parts; couple distance
  (Shift+↑/↓); keep-the-shape; keyframes and their detail; draft playback.

## The one change outside the new files

`Dancer.tsx`'s meshes now carry `name`s: `dancer` on the rig, and `torso`, `head`, `forearm-left|right`
and `hand-left|right`. The click handler climbs to the `dancer` group and reads beau/belle from its
index among its siblings, which is render order. That's fine for two dancers and worth checking the
first time it's clicked. The upper arm is undrawn (ADR-0017), so there is nothing to click. It is
reachable only as a linked part.

🔴 Not looked at in a browser yet.

## Later — the first walk

Ryan walked it. The dancer naming is right, play loops, and Shift+↑/↓ is fine. Three changes from it:

- **One pairing list**, `#review`'s 25 in matrix order (`beau → belle`), with the ⇄ swap kept.
- **The modal sits beside the couple.** `placeModal` projects both dancer groups' `Box3` corners
  through the click's camera and seats the card just outside them on the clicked side. It falls
  back to the other side, then into the window. Placed in a layout effect from the card's own
  height, once per click and on resize.
- **`Explain`**: a hover popover for every 🧪 label (`position: fixed`, so the modal's scroll
  can't clip it).

## Evening — absolute dials, an event log, the drawer

Ryan answered the effort's seven questions (`work/square-dance-planning/review2/journal/2026-10-18.md`).
What changed here:

- **`pose-dials.ts`**: the dial catalogue moved out of the scene, and every aspect is now
  **read off the drawn rig** (`readRigs`). Torso and head rotations come off their meshes. The arm
  is measured from the shoulder group, elbow group and hand mesh world positions in the rig's frame:
  upper arm raised-from-hanging and raised-toward, elbow bend, forearm pitch (0 = level, which is
  the L) and heading, and both lengths. Couple width is the distance between the two rigs. A
  `RigReader` inside the canvas samples it about 7 times a second and only re-renders on change.
- **`pose-events.ts`**: keyframes as an append-only event log, reduced over the event set. Per
  figure there is a draft, general (apply to all) and per-pairing overrides. Review flags are
  custom or stale. Bundle in/out.
- **`pose-store.ts`**: branching-video's `event-store.ts`/`files.ts`, contract unchanged
  (IndexedDB `townage-pose`). It is not in `services/backup.ts` (localStorage only); Save/Load is
  its backup.
- The scene: the drawer, `/only` in the hash, keep-the-shape removed, and edits that belong to a
  moment (arriving on a keyframe loads its set values; leaving drops unkept ones with a notice).

1055 passed, the same 38 failing. Not looked at in a browser.

## Night — a rule about state, ADR-0065

Ryan: *"this is a lot to keep in line."* He was right. The keyframes were fine: one event log,
everything derived. Around them were ~16 `useState`s and 5 refs. The moment along the move
existed three times (`t`, `tRef`, the floor's clock), and whether you're on a keyframe was
derived from the playhead by an `arrive()` with four callers. That's how reload-on-a-keyframe
breaks.

He remembered derived state biting in spaces-game's tutorial work. The commits say so:
`045e66c` "hybrid state management". After it, `derivePhase` skipped round 5's results screen
and the stats never updated (`ce9ea0c`), and "Round 6 of 5" (`275f235`). The tutorial's own bug
(`182ee81`) was the other half: a stale copy. And this repo's **ADR-0004** is that hybrid, adopted
on purpose. Its Consequences already say `phaseOverride` is "the larger half … behaves like a
route", with a promotion condition nobody pulled.

**ADR-0065** states the general rule. There are three kinds of state with one owner each:
- managed facts;
- managed position, which is never derived and never in two places;
- derived values.

A screen's transitions go through one pure reducer, and there's no state library. Applied to
`#review2` next. The game refactor is planned now rather than waiting on 0004's trigger, and it
will supersede 0004. A matching **State** section is drafted into the template's
`project-conventions` skill (uncommitted, for Ryan).

## Later — the session reducer (ADR-0065 applied)

`review2-session.ts` is a pure `(Session, Action) → Session` with 18 named actions and 9 tests.
The screen dispatches to it.

- **`t` has one owner.** The floor's clock is a ref the playhead reads, and it's handed to the
  reducer on `pause`, `step` and `loop`. `tRef` is gone.
- **Edits remember their moment and scope** (`Edits.at`, `.scope`). "Which keyframe am I on"
  (`keyframeHere`) and "what's set here" (`setHere`: the keyframe's set values, your edits over
  them, `null` to un-set one) are derived by comparing. `arrive()` and its four callers are gone,
  and reload-on-a-keyframe works, because the comparison matches as soon as the events arrive.
  Leaving a moment with unkept edits drops them with a notice, inside the reducer.
- Dials are disabled while playing ("pause to dial"). Setting a keyframe while playing pauses
  there first.
- The `useState`s left in `Review2Scene` are the URL mirror, the store handle and its events, the
  rig readings, and the modal's measured placement: facts, measurements, and the URL, as ADR-0065
  says. Plus the `Explain` popover's own hover.

1064 passed, the same 38 failing. Not looked at in a browser; no behaviour change intended beyond
the reload fix and pause-to-dial.

## Later still — the whole cast on the floor, in a disk

Ryan: all the couples on the floor around the selected one, in a filled disk. Changing focus
moves the camera there and re-forms the disk around it, with the couples that have to move
fading out and back in. A dial for the spacing, on Ctrl+↑/↓.

- **`couple-disk.ts`** (pure, 5 tests). Couples stand on hex-lattice points.
  - `diskSlots` is the nearest *n* points as whole rings. A partly-needed last ring is taken
    evenly round it, so 25 is centre + 6 + 6 + 6 + every other of the √7 ring, and stays round.
  - `refocus` keeps the new focus where it stands and keeps every couple already inside the new
    disk. Only the ones left outside move, nearest-first into the empty points.
- **The layout is managed state** (ADR-0065). Who stands where depends on the order focus changed
  in, so it can't be derived from the focus alone. It lives in the session reducer (`layout`,
  `spacing`) and changes on `retarget` and `spacing`.
- **The scene.** 25 `DanceFloor`s, one per pairing, each in a `CoupleSlot` group named
  `couple:<id>`, all on the same `paused` and `seek`. Only the focus couple gets `onBeat`, and
  only its rigs are read for the dials.
  - A lattice-point change fades a couple out, moves it, and fades it in (0.35 s each way; its
    materials go transparent only while fading).
  - A spacing change just moves everyone.
  - `FollowFocus` glides the orbit camera's target and position together, so the viewing angle
    is kept.
  - A blue ring marks the focus spot, and every couple carries a small `beau → belle` label.
  - Clicking another couple focuses it instead of opening its dials.
- Spacing runs 1.5–8 m, starting at 3, in 0.25 m steps.

1071 passed, the same 38 failing. Not looked at. 🔴 25 floors posing every frame while playing is
the obvious performance risk; paused floors write nothing.

## Accepted and locked

Ryan: couples with their own keyframes should be marked in the drawer *and* the pairing list,
and *"I'd like to be able to mark couples as accepted at their timeline in the drawer, maybe
locked so even apply to all doesn't apply to them."*

- **`locked` / `unlocked` events** (2 more tests).
  - Locking freezes a copy of the couple's timeline as it stands (general plus its own), so a
    later `applied` passes it by.
  - The reducer skips any edit to a locked couple's own keyframes, including from another device
    or an old bundle.
  - Unlocking returns to the live timeline, which may have moved on; `lockedBehind` says so.
  - `reviewFlag` gains `locked`.
- **On screen.** Each drawer row has 🔒 accept / 🔓 unlock, and the rows are tinted: green
  locked, warm custom.
  - The pairing list prefixes `🔒` / `✎` / `⚠`.
  - A highlighted locked couple is read-only: dials, set keyframe and the keyframe card's edit
    buttons are off, with a note to unlock it in the drawer.
  - The drawer header says how many couples apply to all will skip.

1073 passed, the same 38 failing. Not looked at.

## No draft: every couple, straight away

Ryan: changes *"should apply to all (except locked) if no couple is highlighted."* So the draft
and the apply-to-all button are gone.

- With nothing highlighted, a keyframe edit is scope `all`: it lands in general at once and
  reaches every couple that isn't locked.
- `appliedAt` became `generalChangedAt`. Any change to general sets it, which drives ⚠ stale on
  custom couples and "every couple's changed since" on locked ones.
- `draft` and `applied` are still folded, so the IndexedDB log from earlier today still reads,
  but nothing writes them.
- The play mode `"draft"` was renamed `"keyframes"` so the old word doesn't linger.

2 more tests; 1075 passed, the same 38 failing.
