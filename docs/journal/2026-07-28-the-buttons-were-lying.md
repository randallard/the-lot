# 2026-07-28 — The buttons were lying

*Documents commit `107479f`, together with
[the previous day's entry](2026-07-27-the-arm-envelope-and-the-emote-experiment.md). The
two days' work interleaved in the same files and landed as one commit.*

The emote experiment went from "landed, waiting on a watch" to actually being watched, and
the watch immediately found that the instrument was broken rather than the thing being
measured. Three defects, all in the debug scene and its three emotes, none in the
arbitration the scene exists to test. Worth writing down because two of the three were
*invisible*: they looked exactly like a passing result.

## 1. The buttons were switches, not triggers

`fire()` was a toggle — press to start, press again to stop — over emotes marked
`loop: true`. Two things went wrong with that.

The visible one: a button stayed lit, and the emote ran forever. That is not what an emote
is. These are fired by hand to be looked at once.

The one that actually cost time: pressing a second emote while the first was looping did
**nothing at all**, indefinitely. `AnimationController.play()` *queues* behind whatever is
current, and an infinite loop never yields, so the second emote sat in the queue and was
never reached. From the chair this reads as "the button doesn't work sometimes" — the
symptom the session opened with.

Both fixed at the source rather than in the handler: the three debug emotes are now
`loop: false`, and `fire()` calls `interrupt(emote, { resume: false })`. A hand-fired debug
button means *show me this now*, so the press takes over. The highlight is momentary and
releases itself on a timer set to the emote's own duration.

`play()`-queues-behind-current is correct behaviour for the controller and stays. It is the
wrong verb for a debug button, that's all.

## 2. Spin did nothing, and doing nothing was the correct answer

`spin` was 360° of `bodyDeltaRotY`, and `DanceFloor` drops that channel on purpose: facing
belongs to the choreography, and one dancer spinning is one dancer out of the square. So
the emote passed its test perfectly and looked identical to an emote that was never wired
up.

**A dropped channel and an absent feature look the same on screen.** That is the real
lesson, and it applies to every "owned" channel ADR-0010 is going to name.

So `spin` now spins the parts it is *allowed* to spin: the head goes all the way round, and
both arms sweep a full circle. The body track stays exactly as it was. The assertion is now
legible — a dancer who turns their head and windmills their arms while staying square-on is
the pass, and a dancer whose whole body comes round is the failure. Two visibly different
pictures instead of one.

The arms needed a detail. An arm reaches the dance layer as an **aim**: the resting hang,
straight down, rotated by the emote's euler. Yaw alone spins that hang about its own axis
and moves nothing — the first attempt at an arm spin was as invisible as the body one. They
are tilted out on Z first and then carried round on Y, with mirrored tilts and a shared
sweep, so the pair travels together like a propeller.

## 3. Look around turned a featureless ball

`Dancer` had the head sphere and the black facing marker as **siblings**, both parented to
the dancer rig, and `expression.head` pointed at the sphere alone. So a head turn rotated a
sphere — which is indistinguishable from not rotating a sphere — while the one feature that
could show the turn stayed put.

The head sphere and the marker now live in one group, pivoting on the head center, and
`expression.head` is that group. `DancerExpressionRigs.head` is a `THREE.Group` rather than
a `THREE.Mesh` accordingly.

Note this is a *rendering* bug, not an arbitration one. `DanceFloor` was writing the head
rotation correctly the whole time, on every frame, through every call. Nothing about the
free-channel logic was wrong.

## Carried, not fixed: the player has the same head

`Player.tsx` splits the head the same way — `headMeshRef` takes the rotation, and
`eyesGroupRef` gets only the position offsets, never a rotation. So an emote's head turn
does not turn the player's face either. Left alone deliberately: `Eyes` positions both eyes
absolutely from `headY` and the head radius, so grouping them under a rotating pivot is a
real change to how the cast is assembled, and this session was about the dance scene. It is
the same defect and it will want the same shape of fix.

## Gates

266 tests pass, lint clean, typecheck clean. No test changed — every one of these is either
a debug-only asset or a change to how a rig is nested, and the suite asserts on the pose
arithmetic, which was right all along. That is a fair outcome here, but it is also the
reason all three survived to be found by eye: **the scene that exists to be watched is not
itself under test.**

## Next

Unchanged, and now actually possible: watch the experiment — wide arms, spin, look around,
against each of the debug calls, mid-grip and clear — and write **ADR-0010** from what it
shows.

---

## Later the same session: the player's head too

This reverses the "carried, not fixed" section above — Ryan called it, and it was the right
call. Leaving one of the two characters with a face that doesn't turn would have meant every
future emote getting judged against whichever body it happened to be tried on.

It also turned out smaller than the section above estimated. `Eyes` positions the eyes
*absolutely*, from `headY` and the head radius — but `headY` is a **prop**, so passing
`headY={0}` and hanging the whole thing off a group parked at the head center gives head-local
coordinates with no change to `Eyes` at all. The other three call sites are untouched.

So `Player` now has the same shape as `Dancer`: one `headGroupRef` holding the sphere and the
eyes, with position, rotation and scale written once to the pivot they share. `headMeshRef`
and `eyesGroupRef` are both gone — there is nothing left that wants a head part on its own.

Two latent bugs fell out with it, neither of which anyone had noticed:

- **The eyes never scaled with the head.** `headRadiusDelta` scaled the sphere and left the
  face at its old size, floating at the old radius. An emote that inflates a head would have
  sunk the eyes into it.
- **The eyes never tracked the body.** The head *mesh* took its Y from `pos.headY` recomputed
  from `animShape` each frame, so `bodyHeightDelta` moved it; the eyes group took only the
  head offsets, and `Eyes` got a `pos.headY` computed once at render from the **base** shape.
  So an emote that stretched the body would have lifted the head off the face.

Both are the same bug as the marker, and they have the same fix, which is the argument for
the fix being a *nesting* change rather than three more transform writes: parts of one thing
should be children of one thing.

Neither is covered by a test, and neither is easy to cover — this is `@react-three/fiber`
scene construction, and the suite tests pose arithmetic. Consistent with the point at the end
of the section above: what the scene *looks like* is not under test anywhere in this repo.

**Not verified by eye.** Typecheck, lint, build and 266 tests are clean, and the nesting is
straightforward, but no one has watched a player head turn yet — the player's emotes come
from `localStorage` and none of the three debug emotes are reachable outside `#dance`. Worth
a look with a saved emote that has a head track.

---

## The watch, at last — and one thing it couldn't see

Ryan ran it. **Wide arms and look around both pass.** The arms swing free and draw in
during the pass, and the question the whole experiment was built to answer — *does a
folding arm read as intent or as a glitch* — came back **intent**. So the envelope stays a
hard clamp, and the proximity-easing fallback contemplated on 2026-07-27 is not needed.
That is a feature deleted before it was written, which is the cheapest kind. Look around
plays untouched, mid-grip included.

**Spin came back half-answered: head good, arms good, "don't know if the body is turning —
probably not."**

That "don't know" is the interesting result, and it is a defect I introduced this morning.
A dancer's only facing indicator was the marker on the head. Spin now turns the head. So
the one instrument for reading facing was the one the emote had taken over — the body
could have been doing anything.

The fix names the thing properly: **head facing and body facing became two different
questions the moment heads could turn**, so there are now two markers. Head dot = where the
dancer is *looking*, and an emote owns it. Chest dot = where the dancer is *facing*, and
the choreography owns it. The chest marker hangs off the rig rather than the body mesh, so
it reports yaw alone and an emote's lean can't tilt it into looking like a turn.

**This is an ADR-0010 finding, not just a debug-scene fix.** The draft channel list had
"facing" as a single owned channel. It is two, with different owners, and a contract that
says "facing is owned by the choreography" would forbid a dancer glancing at their partner
— which is the sort of thing the whole expression layer exists to allow.

The general form, which is worth stating in the ADR: **every owned channel needs an
indicator that the expression layer cannot move.** Otherwise "the emote was correctly
ignored" and "the emote was ignored because nothing is wired" stay indistinguishable — the
same lesson as the spin body track earlier today, arriving a second time from a different
direction.

## And the panel got out of the way

The contact readout — the min→max grip-drift panel — rewrites every frame and changes
height with the number of tracked rows, so the emote buttons *moved under the cursor* while
you were trying to fire one at a chosen moment. It is now behind a checkbox, **off by
default**, and moved to the bottom of the column so it is the only element with nothing
clickable below it. Its span map clears on toggle, so switching it back on doesn't resurrect
history from before it was hidden.

Worth noting for whatever debug UI comes next: a readout that updates every frame does not
belong above a control. This panel has been in the way since the grip watch and nobody
named it until it collided with a *timing*-sensitive interaction.

---

## The chest marker was sized off the wrong thing

Ryan, on the marker added an hour earlier: *"the body facing doesn't show up on all body
types or maybe on all moves either."* Correct, and the cause is a small embarrassment.

I sized it `body.radius * 0.16`. `body.radius` is the dimension the cast varies **most** —
`SHAPE_BOUNDS` runs 0.1 → 0.6, and the debug scene's own size casts deliberately exercise
both ends. So on a thin body the marker came out at 0.016 world units, against joint markers
of 0.035–0.045 and a head dot of ~0.13. A couple of pixels from a camera 10 units away. It
scaled itself away on exactly the bodies it was needed on.

It now has a floor: `max(body.radius * 0.16, 0.07)`. Proportional on wide bodies, legible on
thin ones. It also sits at chest height on the cylindrical section rather than up at the
shoulder, and is offset to stand proud of the widest point of the torso by a fixed fraction
of its own radius, so no combination of radius and height can swallow it.

**The general error is worth keeping**, because this repo has now made it twice in a day: a
debug annotation sized as a *proportion of the thing it annotates* disappears exactly when
the thing gets small — and "small" is half the range the size casts exist to test. The joint
markers got this right by accident, being hard-coded world units.

**Still not fully solved, and worth saying plainly:** the marker is a dot on the front, so
from directly behind a dancer you see no dot at all. That reads as "facing away" only if you
already trust the marker is there. If the spin re-watch is still ambiguous at some angles,
the fix is a second marker in a different shade on the back, or a forward-pointing cone
visible in silhouette from the side. Not built yet — one dot may well be enough now that it
is visible at all.

## And the puff-up is a channel now

`bodyRadiusDelta` / `bodyHeightDelta` / `headRadiusDelta` were carried at the end of the
2026-07-27 entry as "still open, found on the way". They are now a **named `limited`
channel** in the ADR-0010 list rather than a loose worry, at Ryan's call.

The reason it belongs there rather than in a backlog: ADR-0012 sizes the square from the 3D
rigid silhouette and measures it **once at mount**. An emote that puffs a dancer up mid-pass
inflates the exact quantity the spacing was derived from, and no arm logic catches it,
because it is not an arm. Same shape of answer as the arms — constrained while close, free
when there is room — so a dancer can inhale anywhere except in the gap.

Filing it as a channel rather than a bug is the point. A bug gets fixed once; a channel gets
a rule in the contract, and the next delta anyone adds to `ResolvedPose` has somewhere to be
classified.

## The re-watch: the body stays straight

With a marker big enough to see, Ryan re-fired spin: **the body stays straight.** So
`bodyDeltaRotY` is confirmed dropped for a driven dancer on the screen rather than only in
the code, and item 3b is fully verified — all three emotes behave as the contract wants.

Which closes the experiment, and with it the only thing blocking **ADR-0010**. It took two
instruments to get one answer: the emote had to be given channels it was *allowed* to move
before "correctly ignored" became distinguishable from "not wired up", and the body needed a
facing indicator the emote couldn't touch. Both of those are the same idea, and it is the
idea the ADR should open with.
