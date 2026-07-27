# 2026-07-26 — forearm grips stand up, passing arms tuck in

*Second entry for the day; the first is
[body-derived frame scale](2026-07-26-body-derived-frame-scale.md). Session continues from
the grip-channel plumbing that landed earlier the same day. Documents `028541e`.*

Ryan watched the render and reported two arm defects, both real:

1. **Dosado.** "I'd rather the arms clipped into their dancer's body on contraction so
   that there's no crossover when the dancers pass shoulder to shoulder — right now the
   arms stay at shoulder width."
2. **Allemande Left.** "The arms are supposed to be in a forearm grip, each hand next to
   the other dancer's upper end of forearm and forearms side by side." What rendered was
   two arms sticking out sideways at each other.

Both are now fixed in `src/dance/arm-pose.ts` (new, pure) with the driver reduced to
easing the rig toward what it returns.

## Why the first grip looked wrong

The first cut aimed each engaged forearm at the shared grip point: the pair midpoint at
averaged elbow height. The aim maths was fine and the pose was still wrong, because of
where the shoulder actually is during an arm turn.

`arm-turn` puts the pivot **on the named side** — facing is tangential to the orbit, so
the gripping shoulder is the near one. At the default cast's scale the pair orbit
`2 × ORBIT_RADIUS = 0.6` engine units apart, which is 1.56 world units, so each dancer's
centre is 0.78 from the pivot while their shoulder is already 0.36–0.46 out laterally
toward it. The shoulder is therefore only ~0.32 short of the pivot, and "aim from the
shoulder at a point 0.32 away and 0.09 lower" resolves to **very nearly horizontal**. Hence
arms pointing across at each other. Aiming was never going to produce a forearm grip.

## What a forearm grip is, on this rig

Two forearms stood **vertically, side by side**, touching, each dancer's hand at the top of
their own forearm and therefore against the upper end of their partner's. So:

- **The group is translated, not aimed.** `Dancer`'s arm group holds a *forearm* and a
  hand and **no upper arm** — `computePositions` leaves `upperArmLength` as an invisible
  gap between shoulder and elbow. An elbow the rig does not have is exactly what a real
  forearm grip bends, so sliding the whole group to where a bent arm would put it is
  legitimate, and nothing is drawn between shoulder and elbow to betray it.
- **`pitch = −π`** flips the group about its own x axis so the forearm rises from the
  group's origin with the hand on top. The sweep from the resting hang carries the hand
  forward rather than backward, which is how an arm is raised.
- **Half a forearm off the pivot, back toward its own shoulder.** Both forearms cannot
  occupy the pivot. Each nudges to its own side of it by its own half width, so the pair
  sits side by side along the line between the dancers, touching. Verified: the two axes
  end up `halfA + halfB` apart, to within a percent (the residual is the pair not being
  exactly diametrically opposed between waypoints — see the orbit note below).

## The grip height rule changed, and the old one was worse than it looked

The height where the hands meet has to be **one shared number** — that is what makes a
grip a grip — and every choice of it strains someone in a mixed pair. The rule was the
mean of the two **resting elbow** heights. That is a defensible number for where forearms
*cross* and a bad one for where hands *meet*, because this rig draws the forearm hanging
below the hand: for the debug cast it put tall Ember's entire forearm down at 0.25–0.77
world height with their shoulder at 1.43 — a forearm detached from the dancer and floating
by their hips.

It is now the mean of each dancer's **natural grip height**: where their hand lands with
the forearm stood up from an elbow left at its resting height. Same shape of rule (a mean,
with the asymmetry still deferred), stated in the quantity that matters. For the debug
cast, simulated over the whole call:

| | forearm span | own shoulder | hand |
|---|---|---|---|
| Myco (squat) | 0.98 → 1.22 | 0.95 | 1.34 |
| Ember (tall) | 0.74 → 1.26 | 1.43 | 1.34 |

The forearms overlap vertically over Myco's whole length — genuinely side by side — and
read as the short dancer reaching up and the tall one reaching down. **Still a placeholder
with a known failure mode**, and still [step 3 of the size
brief](../../../work/square-dance-planning/briefs/dancer-size-and-accessibility.md): past
some height difference the taller dancer should do nearly *all* the reaching, because a
child cannot raise their arm to an adult's. The unit test asserts the current rule so step
3 has to change it deliberately.

## The tuck

Nothing in the engine says "pull your arms in" — the arms are the one part of a dancer
that ADR-0012 deliberately leaves out of spacing, because real dancers brush arms and arm
contact is the tactile channel. But *free-hanging* arms at shoulder width are wider than
the lane: the debug pair's closest pass is 0.78 world units, against a `lateralClearance`
of 0.71 — and resting arms need **1.03** (`0.46 + 0.11` plus `0.36 + 0.10`). They cross
over. That is Ryan's report, as arithmetic.

So proximity poses the arms too:

- **How close** — `tuckNearness`, smoothstepped between 2.0× and 1.15× the pair's own
  clearance, so big dancers start narrowing sooner in absolute terms, which is when they
  need to.
- **Which arm** — `tuckExposure`, from the partner's bearing in the dancer's local space.
  Only the arm on the side they are passing comes in; the outside arm keeps hanging, which
  is both what dancers do and what keeps the tuck from reading as "put your arms away".
- **How far** — far enough that the arm's *widest* part, usually the hand, sits inside the
  torso radius. That bound is what makes the tuck **provably** enough rather than
  tuned-until-it-looked-fine: `lateralClearance` is never less than the two body radii
  (every torso spans the same body centre), so two arms hidden inside their torsos cannot
  reach each other at any distance the square is allowed to pass at. Tested over the whole
  cast, pairwise.

On the Dosado this falls out as: right arms tuck on the forward pass (beats 1–2), left arms
on the return (beats 3.5–5), matching the call's own right-shoulders-then-left. Nothing is
hard-coded per call — it comes from where the partner actually is.

## Tests

`arm-pose.test.ts` (35) covers the poses in isolation. `arm-geometry.test.ts` (15) drives
the **real** engine, frame and pose code over every call at quarter-beat resolution and
asserts the geometry a screenshot cannot give: no two arms of the two dancers ever occupy
the same space at overlapping heights, forearms in a grip are touching and vertically
overlapping, both hands land at one height, the grip uses the hand the engine named, and
the hands-free calls never engage one. 194 → 244 tests, lint 0 errors, typecheck and build
clean.

The per-frame arm decision moved out of `DanceFloor` into `poseArms` for this: the driver
now sets two `Placement`s and eases the rig toward the returned poses, and the test drives
the same function the render does rather than a copy of its arithmetic.

## Found while measuring: the arm turn walks a polygon, not a circle

Worth a look during the watch, and **not** fixed here because it is engine geometry.
`arm-turn` emits a waypoint every quarter turn and the stepper interpolates between
waypoints linearly, so the pair walks the **chords** of their orbit: their separation
oscillates 1.56 → 1.10 → 1.56 world units every two beats, a 29% radius dip
(`cos 45° = 0.707`), exactly as linear interpolation predicts. The grip itself is
unaffected — both dancers cut the corner symmetrically, so the joined forearms stay
together at the midpoint — but the dancers should visibly breathe in and out through the
turn. A waypoint every eighth turn would take the dip to 7.6%; arc interpolation would
remove it. square-one's call to make.

## One consequence for the pending ADR-0010

The blend contract now has a third input beyond transform and facing: **the tuck is
choreography's, not the emote layer's.** It is not a canned pose and not an engine
instruction either — it is derived from live formation geometry, the same way facing is.
An emote that wanted to fling both arms wide during a shoulder pass would put an arm
through another dancer, which is precisely the class of thing a square cannot let one
dancer decide alone.

## Anatomical mapping: the old note is now moot for the grip

PROGRESS previously said that if the *right* arm raises on an Allemande Left, the fix is a
one-line swap of the anatomical mapping in `Dancer.tsx`. That check no longer bites: the
grip pose puts the forearm at the pivot, and the arm it poses is the one the engine names,
whose group is on the side the pivot is on — so the arm that raises is always the near one
by construction. What is still worth watching is whether the pivot is on the dancers'
**left** at all, i.e. whether Allemande Left turns CCW. That is a square-one question and
still the highest-risk item on the list.
