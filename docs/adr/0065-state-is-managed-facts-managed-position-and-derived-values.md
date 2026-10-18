# ADR-0065: State is managed facts, a managed position, and derived values — and a screen's transitions go through one pure reducer

- Status: Accepted
- Date: 2026-10-18
- Deciders: Ryan, Claude

## Context

[ADR-0004](0004-derived-phase-with-ui-override.md) settled half of this for the townage game:
*store facts, derive the phase*, with a UI-only `phaseOverride` for what no fact implies. Its
own Consequences say where that went: the override became "the larger half", with 19 variants
that "behave like a route, not an override", and a promotion condition to "split routing out from
phase".

The same split arrived at a second screen without anyone reading 0004. `#review2`
(`Review2Scene.tsx`, 2026-10-18) has an event-log store whose keyframes are all **derived**, which
is right. Around it are ~16 separate `useState`s and 5 refs, with nobody owning them:

- **Where you are along the move** exists three times: `t`, `tRef` and the floor's own clock.
  They're kept in step by hand.
- **Whether you're standing on a keyframe** is derived from the playhead matching a time, by a
  function called from four places. Reloading on a keyframe doesn't load it, because the keyframes
  arrive after the check ran.

Ryan asked whether derived state had got us into trouble before, and it had, in spaces-game,
which this repo's ADR-0004 was modelled on:

- `derivePhase` skipped `round-results` after round 5, so the stats update that lived on that
  screen never ran (`ce9ea0c`).
- A derived `currentRound` produced "Round 6 of 5" (`275f235`).

Each time the data was right and the *position in the flow* was computed from it wrongly. The
tutorial's lost-preferences bug (`182ee81`) was the opposite case: a stored copy that went stale.

So there are two lessons, and they apply to every screen, not only the game:

- Deriving **facts about the data** is safe.
- Deriving **where the user is** is not. Neither is keeping a second copy of a fact.

## Decision

Every piece of state belongs to exactly one of three kinds, with one owner each:

1. **Managed facts**: what the user made or the game recorded. Stored once, in the form it was
   made (an event log where history or merging matters, a document otherwise), and never copied.
2. **Managed position**: where the user is. The route, the screen, the moment along a move, what's
   selected. Always stored explicitly, in the URL when a link should reopen it, otherwise in the
   screen's reducer. **Never derived from facts**, and never kept in two places.
3. **Derived values**: everything else, computed by pure functions of 1 and 2. Never stored, so
   never stale.

And **a screen with more than a handful of managed values keeps them in one pure reducer**
(`useReducer` over a pure `(state, action) → state` module beside the screen) with named actions.
Every transition lives in one file and is unit-tested without a browser. A clock or a canvas the
screen doesn't own (the floor's performance clock) is read into the reducer at defined moments
(pause, a seek) and never mirrored continuously.

**No state library.** React's `useReducer` and the URL are enough, and the template's functional
core / imperative shell already says the reducer is core.

Applied now to `#review2`. The townage game's own state (`App.tsx` + `src/state/`) is planned
next, as the work ADR-0004's promotion condition asks for. That work supersedes ADR-0004. Until it
lands, 0004 stands.

## Alternatives considered

- **Leave it per screen, as now.** That works until a screen grows, and every growing screen has
  then rediscovered the problem. `#review` has 30 `useState`s and `App.tsx` 31.
- **A state library (zustand, XState, Redux Toolkit).** XState in particular would model the game's
  flow well, and ADR-0004 kept it as the answer "if the tutorial ever grows a genuinely
  graph-shaped structure". The rule here doesn't need one. Revisit when the game refactor happens,
  if its routes turn out graph-shaped.
- **Derive position too, as ADR-0004 does for the game's four phases.** That's fine where the
  position really is implied by the facts (two parts collected *is* assembled). The rule says
  don't when it isn't, and spaces-game's bugs are what "isn't" looks like.

## Consequences

- `#review2` is refactored into a `review2-session.ts` reducer, and `t` gets one owner. Dial
  edits record the moment they belong to, so "do these apply here" and "which keyframe am I on"
  are derived by comparing. The four-caller `arrive()` goes away, and so does the
  reload-on-a-keyframe bug.
- The game refactor is now on the plan rather than waiting on a trigger. It moves routes out of
  `phaseOverride` (a real back stack for the phone screens) and supersedes ADR-0004.
- `#review` is left as it is. It's being kept as the rating instrument and is not growing.
- More files per screen (a reducer and its tests). That's the point, and it's the cost.
- The rule is offered to the template's `project-conventions` skill as a **State** section, so new
  projects start with it instead of relearning it.
- **Promotion condition:** if a reducer starts needing to know about another screen's state, the
  layers are wrong for that pair. Revisit with a shared store, and decide it in a new ADR.
