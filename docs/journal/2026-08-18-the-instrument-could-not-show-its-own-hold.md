# 2026-08-18 — the instrument could not show its own hold, and could not name what it was showing

_Documents commit `d3cd4fb` — *a couple's handhold, solved from the bodies, and the instrument that judges it*. Landed 2026-08-18 after Ryan verified the pose in the running scene._

Ryan: *"let's fix these"* — the two defects the elbow watch turned up, listed at the tail of
[2026-08-17 (5)](2026-08-17-5-the-elbow-watch.md). Both are in the **instrument**, not the dance.
Neither changes a pose. The watch's verdict stands.

## 1. The markers were dark for a touch hold

`track.grip = grip?.hand ?? null` took its value from square-one's motion grips alone, and a
standing couple's hold is not one of those. So `grip` was `null`, the markers' `visible =
side !== null` hid every elbow and hand dot, and the control built to make elbows checkable was
dark for the one pose the elbow watch was about.

**The fix is a name, not a flag.** `poseArms` already decided this every frame —
`standingAsCouple(...) ? insideSide(...) : null` — as two exported predicates asked as one
question and then thrown away. That question is now `touchingSide(self, partner, hold)` in
`arm-pose.ts`, `poseArms` asks it, and `DanceFloor` asks the *same call* to fill a new
`TrackedArms.touch`. One function, one set of inputs — the same shape `holdReadout` already uses
to keep the panel from disagreeing with the picture. The markers read `grip ?? touch`.

**`touch` is deliberately not folded into `grip`.** They are different kinds of hold: a grip is
eased, owned, and resolved against the partner's forearm; a touch hold is written outright at the
solved point and leaves the outside arm alone. Merging them would have blended the standing pose
through `gripPose` and broken the thing being watched in order to watch it.

The black pivot dot is now drawn for a standing couple too. It is the pair's **midpoint**, which
the joined hands sit off by `hold.lateral` **by design** (ADR-0022/0023) — so the panel's table no
longer calls it "the pivot a gripping pair holds over" without saying what a touch hold does
against it. That offset is the one thing about this hold worth a reference point.

## 2. The scene wrote a hash it could not read back

`window.location.hash = ... \`#dance=${call}\`` wrote the **call** name; `danceSceneFigure` looks up
by figure **id**. Two namespaces that only coincide for the facing-pair figures. Choosing
`two-trades` rewrote the URL to `#dance=partner-trade`, which matches no id and falls back to
Dosado — every couple watch unreloadable, and a link to one showed the wrong dance.

`danceSceneHash` is now the inverse of `danceSceneFigure`, and it lives **next to it** rather than
in the scene: an inverse that lives away from its function is an inverse nobody notices has
stopped being one. `dance-route.test.ts` round-trips every entry in `DEBUG_FIGURES`, which is the
assertion that would have failed the day this was written.

## 3. Found while verifying the fix: a marker turned on while paused stayed dark

Not on the list, and it defeated fix 1 in the order anyone would actually use it. The markers were
mounted behind `{joints && …}` and their visibility was written **only inside the frame
callback** — and a paused floor runs no frame (`if (goingHome || !paused)`). So: `go home` to get
the standing couple, *then* tick joint markers, and nothing appears. The one control that produces
a nameable pose is the one that guarantees no pass is coming to paint it.

The meshes are now always mounted — five tiny spheres — and what the last pass found is kept in a
`held` ref, so the toggle can paint from it. Same reason the readout keeps spans instead of
instantaneous values: the state the panel reports about is not the state the frame happens to be
in when you look.

**Watched live**, which is the only way this one is checkable: `#dance=two-trades` → `go home` →
markers on → the black pivot, the blue elbow and the red hands appear on the paused standing
couple, and they stay put while the camera orbits to a level side view.

## 4. And the readout no longer says "hands free" about a couple holding hands

Same lie, different pane, found by fixing the first one. `holding` counts engine grips, so a
standing couple printed `hands free` while the markers next to it drew a joined hand. It now says
so: *hands joined — a standing couple, no engine grip to track*. No invented numbers — `along` and
`gap` measure a hand against a **forearm** and are genuinely unresolved for a hand-on-hand hold.
What that pane should print for a touch hold is a real question and is not answered here.

## The one to carry

All four are the same shape: **a fact the render acts on that the instrument re-derives, or
doesn't have at all.** The grip spans, the figure id, the frame's own visibility pass. Every one
was a place where "what is on screen" and "what the panel says about it" were computed from
different things — which is exactly the failure mode ADR-0017's watch and `holdReadout`'s comment
were both written against. Worth checking the remaining panes against the same question.

## State

**596 tests** (from 590), lint 0 errors and none in `src/dance/`, typecheck and build clean.
No ADR: nothing here decides anything the ADRs have not already decided. No pose changed — the
elbow watch's verdict is untouched.
