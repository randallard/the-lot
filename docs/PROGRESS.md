# Progress & Status

_Last updated: 2026-08-22_

## Status / next

**▶ RIGHT NOW (2026-08-22, eleventh chunk) — ✅ WATCHED AND ACCEPTED. `#dance` PICKS ITS OWN CAST,
AND IT FOUND SEVEN THINGS ON ITS FIRST DAY.** **708 tests, lint 0 errors, build clean,
`docs-hygiene` clean.** Ryan, on the whole of it: *"ok I've reviewed — mark all as passed."*
**Nothing is waiting on his eyes.**

Every character the game has is selectable in either place — the four NPCs and **the player** —
and the pairing was a hard-coded `[MYCO_DEFAULTS, EMBER_DEFAULTS]` until now.

- 🔑 **Colours are positional and stay that way.** `DanceFloor` paints occupant 0 and occupant 1
  from `DEBUG_COLORS`, never the character's own `bodyColor`, so the beau is the beau's colour
  whoever is standing there. That is what makes a swap a *controlled* change: one thing moves, and
  it is the body.
- 🔑 **The size cast became a modifier rather than a cast.** `mixed` / `max` used to name Myco and
  Ember and build whole shapes; they now override the **body radius** of whoever is selected, so
  the frame-scale watch (ADR-0012) is available on every pairing instead of one.
- 🔑 **One roster, two pickers.** `castRoster()` moved out of `ContactMoveBuilderModal` into
  `config/npcs.ts` beside `NPC_CONFIGS`, with `PLAYER_ID`. The player is not an NPC and has no
  config row, so every picker has to splice them in by hand — and a roster that disagrees between
  two pickers is a bug you find by noticing a name is missing from one of them. 4 tests on it.
- 🔴 **The scene now reads `getBodyShape`, not the authored constants**, so a body-editor edit
  shows up on the dance floor. That is the point of a picker, and it is also the one way this scene
  can disagree with a number quoted in an ADR — those were all measured on the *defaults*. With
  nothing saved the two are identical. The hold readout is solved from the same shapes the floor
  poses, so the panel still cannot disagree with the picture.
- 🔑 **The player is a body shape like any other in here.** `Dancer` seats every occupant at
  `NPC_BODY_CENTER_Y` and every dance measurement reads the same constant, so the rig-origin trap
  `ArmMetrics.rigOriginY` warns about cannot be sprung inside `DanceFloor`. What the player brings
  is proportions, which is what is being watched.

✅ **"GO HOME" LANDS ON THE STANDING COUPLE AGAIN.** Ryan: *"when I'm in california twirl and click
'go home' they go to the arch, and 'go home' for the partner trade goes to hands down."*

🔴 **square-one declares a Twirl's arch from beat 0** — `{"grip":"arch","from":0,"to":4}` — because
the hands are joined and raised for the whole call. A home pass snaps the grip blend to its target,
so "go home" landed *inside* the arch: the one pose the button exists to let you look at, replaced
by the pose the call moves into. The blend targets **0** on a home pass now, which is what the pair
actually are at the top of the loop — hands joined, low and forward (ADR-0027) — with the arch as
the thing the first beats lift them into. It is the blend's own resting value on a fresh mount, so
this is the home pass agreeing with the first frame of a performance rather than a new rule.

🔴 **The Partner Trade was never broken, and the instrument was lying.** Measured at beat 0 after a
home pass: `separation 1.1400` — exactly the stance — and `touches: ["right", "left"]`. The hands
are joined. What said otherwise was the contact readout's **static JSX placeholder**, which read
`hands free`: a *claim*, sitting there until a frame overwrites it, and indistinguishable from a
measurement. It now reads `waiting for a frame…`, and the real "hands free" line reports the
separation and the stance width beside it.

🔑 **The lesson is the one the day keeps teaching, one layer out.** A comment that asserts an
invariant nobody checks becomes false silently; a **placeholder that asserts an answer** does the
same thing to whoever is looking at the screen. Both of us read that pane and believed it, and it
cost most of an afternoon — including a false hypothesis about `standingAsCouple` that a test of the
real pipeline later refuted outright (it returns **true** at beat 0, separation delta 0.0000).

🔴 **And a browser tab that is not in the foreground runs no frames**, so the pane stays on its
placeholder and every reading taken from it is stale. That is what made the first round of
diagnosis unreliable; `requestAnimationFrame` count was the tell.

✅ **AND THE "FLAKEY" HOLD WAS ONE NUMBER WITH TWO MEANINGS —
[ADR-0045](adr/0045-a-couples-width-is-the-one-they-are-dancing-at.md).** Ryan: *"myco and ember
look fine but not the player and ember … maybe we have too many states stacking here."*

🔴 **Not stacked state, and not flakey — deterministic, on exactly five of twenty orderings.**
`TouchHold.width` means *how far apart these two are standing*, and ADR-0040 gave it a second
meaning: a pair who **reach** dance the call at `ArchSizing.width`, wider, while their resting
handhold goes on reporting the narrower stance it was solved for. The floor placed them at one
width and asked `standingAsCouple` about the other; past `TOUCH_TOLERANCE` the predicate says *"not
a couple"*, the hold is never posed, and both dancers' arms hang.

| lost the hold | reached | rests at | dances at |
|---|---|---|---|
| ember / myco · ember / ryan | 0.31 | 0.820 | 1.140 |
| ember / player | 0.12 | 0.610 | 0.900 |
| player / sprout · sprout / player | 0.09 · 0.06 | 0.473 | 0.676 · 0.656 |

**The pairs whose reach stayed inside the tolerance kept it** — myco/sprout at 0.03 — which is
exactly why it read as intermittent. *"Myco and sprout are kind of holding hands"* is 0.03 of arm
being small enough to sneak under a 35% tolerance.

🔑 **The hold is solved on the bodies dancing the call now**, so on a reaching pair its `width`
equals `ArchSizing.width` **by construction** — `reachForIt` picked the extension *by* solving
`touchHold` on those same lengthened arms. The stance, the figure and the engine's placement go back
to being three readings of one number.

🔴 **The happy-path test would pass without the fix**, so the guard is its counter-assertion: asking
with the *resting* width loses exactly those five, and every one is a pair who reached.

🔑 **Three of today's five findings are the same shape.** `PERSONAL_SPACE` claiming to be the
frame's margin, `archLateral` claiming the arch sits above both crowns, and `TouchHold.width`
claiming to be where the pair stand. **A name keeps its old meaning while the thing it names
moves**, and nothing catches it — only asking the question on a case the old meaning cannot cover.
Which on this cast means a pairing nobody could stand up until the picker existed.

**✅ THE WATCH IS CLOSED — every item, accepted 2026-08-22.**

1. ✅ **Ember as beau with Myco** — the dearest reach on the cast at 0.310, with the reshape half
   also trading torsos hard (ADR-0042's higher aim). Accepted.
2. ✅ **Myco with Sprout** — reaching 0.030, holding on rather than letting go, and **Sprout's
   torso stretching upward from where it already sits** (ADR-0043).
3. ✅ **The default pair's join at 1.972**, up from 1.901, now that it rises as far as the two of
   them can lift it.
4. ✅ **The cast picker itself** — the beau keeps the beau's colour through every swap, and every
   pairing holds hands at beat 0 (ADR-0045).
5. ✅ **"Go home" lands on the standing couple** in both figures.

✅ **THE PICKER'S FIRST FINDING IS FIXED — [ADR-0039](adr/0039-a-hand-is-charged-against-the-other-dancer.md).**
Ryan, on being told Myco and Sprout would let go and stand wide: *"no, that doesn't make any sense…
they should not have to stand wide."* He was right, and `archClearance` carried two conflations.

🔑 **A hand was charged against its own owner.** `2 × max(sideExtentAt(beau, h), sideExtentAt(belle, h))`
says every hand must clear **both** bodies. A joined hand hangs off a shoulder; it does not have to
clear the dancer it is attached to. On Ember-as-beau with Myco the join sits at 1.640, level with
**Ember's own head**, and the pair paid `2 × (0.434 + 0.110)` for Ember's hand clearing Ember.

🔑 **And it measured from the couple's midpoint**, ignoring the join's lateral — ADR-0038's deferred
promotion condition, now due. Each hand is charged against the *other* dancer, at its own height, its
own lateral and its own hand's radius.

🔴 **It corrects in both directions, which is the sign it was two bugs.** The default pair's reshape
goes **0.193 → 0.281** (it had been *under*-charged — the join leans 0.050 toward the belle and
nothing counted it) and the break goes **0.951 → 0.905**.

🔴 **And ADR-0036's witness weakened with it.** The margined request was 1.046, over square-one's cap
— the regression in one line. It is now **0.996**: a near miss. The decision stands on the margin
already being in there three times, not on this pair overflowing, and the test says what is true with
the history beside it. **A decision evidenced by one number is one correction away from looking
unmotivated.**

✅ **AND THE LAST RESORT IS NOW REACHING, NOT LETTING GO —
[ADR-0040](adr/0040-a-pair-reach-before-they-let-go.md).** Ryan: *"can we have last resort be
extending the upper arm?"* Measured against the head first, and the arm wins on every count.

| lever | rescues | Myco/Sprout |
|---|---|---|
| head radius | 4 of 9 | **never** |
| **upper arm** | **7 of 9** | **0.030** |

🔑 **The arm buys reach one-for-one and distorts nothing that is drawn.** `handReach = spacing +
forearm.height + handForearmGap + handRadius`, so extending by `e` adds exactly `e` and leaves
`forearmSpan` — the part with a mesh on it — alone. What lengthens is the shoulder-to-elbow gap this
cast does not render.

🔑 **And it is the only lever that widens the couple**, because `touchHold` solves the standing
width from how far two people reach across to each other. That is what answers a pair whose *bodies*
will not pass at the width their handhold gave them — which a torso trade cannot, since it moves
shoulders vertically.

🔑 **The extension belongs to the pair, not the draw** — solved so **both** accommodations fit, so
the couple stand in one place whichever way the coin lands and the per-execution difference stays in
the torsos and the bow, where a watcher reads it as the dancers rather than the dance.

**Myco with Sprout stand at 0.774 instead of 1.572** — a 5% widening where the old answer was 113%,
and they keep hold. The cast now goes **11 dancing at their own width, 7 reaching, 2 letting go**,
from 11 / 0 / 9.

🔴 **The head lever is one-sided or it is worse than nothing**, and that is worth keeping: *trading*
it costs more every time (0.086 → 0.097, 0.144 → 0.156, 0.175 → 0.187), because growing the beau's
head widens the thing his partner's hand has to get past. The torso is the opposite — growing the
beau helps there.

✅ **AND THE JOIN NOW RISES — [ADR-0041](adr/0041-the-join-rises-as-far-as-the-pair-can-lift-it.md).
NOBODY ON THE CAST LETS GO ANY MORE.** Ryan: *"yea allow the join to raise above belles crown."*

`archLateral` has documented the arch as sitting *"above both crowns by construction… so there is no
body to be inside of"* since it was written. 🔴 **That was an assertion the code did not maintain** —
the join sat at the **belle's** crown plus headroom, which with Ember as beau is 1.640 against a head
spanning 1.275 to 2.155. The joined hand and Myco's arm were inside it.

**Three heights, and the answer is the middle one floored by the first:** `lo` = the belle's crown
plus headroom, since she walks under it; `hi` = clear of the taller of them, where nobody's head is
beside it; `both` = as high as the pair can actually get it. **It rises when it can and not
otherwise**, which is why every pair who could already dance an arch still dances at their own width
with no arm taken.

🔑 **And it composes with the reach.** Lengthening the upper arm raises `both`, so a pair who could
not lift the join clear of the tall one's head reach until they can. **Ember with Myco takes 0.310 of
arm, lifts the join to 1.944, and holds on.**

**The cast now goes 11 dancing at their own width, 9 reaching, 0 letting go** — from 11 / 0 / 9 this
morning. ADR-0037 part 3 is still the terminal case and still reachable; nobody this cast can field
reaches it.

🔴 **Unconditionally raising the join to clear both crowns was tried first and rejected on
measurement.** It charged the whole cast for two pairings — and put a **hairline break in the default
pair's reshape**, because growing the beau to reach the join also raises his crown, so past the
crossover he chases his own head and 0.009 is left over. A rule that makes the shipped figure worse
to fix two edge pairings is the wrong rule; the suite now guards that pair explicitly.

🔴 **ADR-0040's promotion condition fired within the hour, exactly as written.** Its counts (7 of 9,
two letting go) stand as what was true when it was taken — an accepted ADR is not corrected in place,
and ADR-0041 is the re-measurement it asked for.

🔴 **Ember as beau costs 0.310 of upper arm — the dearest reach on the cast**, very nearly doubling a
0.33 undrawn segment, and they widen 0.820 → 1.140. **If that reads as a limb stretching rather than
a dancer reaching, that is the number to argue with**, and the answer would be to let the *reshape*
work on the short dancer rather than buying it all with arm.

✅ **AND IT IS DERIVED, NOT FITTED — CHECKED ON BODIES NOBODY HAS AUTHORED.** Ryan: *"these aren't
static right? when new characters with different dimensions are added they will fall somewhere in
between and be accommodated?"* Turned into an assertion rather than an answer.

**8000 sizings over 4000 random pairs drawn across the whole of `SHAPE_BOUNDS`**, including
combinations no designer would choose:

| outcome | share |
|---|---|
| dance at their own width | **71%** |
| reach | **28%** |
| let go | **1%** |
| **hand the engine a figure it cannot deliver** | **0** |

🔑 **Every number the machinery uses is read off the two bodies** — crowns, reaches, side extents,
the handhold's own width — and every lever is bounded by the **shape editor's** range rather than by
anything the dance knows. Arm taken ran 0.01 to 1.33 with a median of 0.26, all inside the slider.
A 300-pair deterministic version of the sweep is now in the suite, asserting the one invariant that
matters — `wanted < width`, always — and that all three branches are still reachable, so it stays a
test of the cascade rather than of its first case.

✅ **AND THE RESHAPE HAS ITS SECOND AIM —
[ADR-0042](adr/0042-the-reshape-aims-at-whichever-height-costs-less.md).** The gap the generality
check turned up: `planArch` sized the torso trade from the **beau's** shortfall against the belle's
crown, and a short-armed *belle* got no reshape at all — her two draws produced identical plans, so
the coin was flipped and both faces were the same.

🔑 **The cancellation is real geometry, not an omission.** Her constraint is `reachUp ≥ crownBelle +
clear − shoulderBelle`, and `d` cancels: shrinking her lowers the target and her shoulder together.
What was missing is a **second height worth aiming at** — ADR-0041's `hi`, clear of the taller of the
two. Aiming there does have a lever, and it points the other way: **a taller beau is answered by a
negative `d`**, where he shrinks and she grows, so his crown comes down to meet the reach she gains.

🔴 **Aiming high whenever the beau is taller was implemented first and measured worse.** It cost
three shipped pairings: Myco/Sprout and Ryan/Sprout went 0.030 of arm to 0.040, and **Ember/Sprout
went from dancing comfortably to needing 0.190**. Chasing a clear join costs more deformation *and*
more room than accepting the low join and letting the hold break.

🔑 **So it is chosen, not applied** — ADR-0038's rule (*an accommodation has to beat the alternative
it was chosen over*) applied to *which* reshape. **Five of the twenty shipped orderings take the
higher aim**, and about one in five of 4000 random pairs. It cannot lose: the aim only touches a
reshape, only when the alternative measured larger, and `LOW` wins ties.

🔴 **It did not make Ember-as-beau cheaper, and that is worth being clear about.** They still take
0.310 of arm, because `armDelta` is solved so *both* accommodations fit and the **break** sets that
floor. What improves is the reshape half's picture — the join clears both heads instead of sitting
in one.

✅ **AND THE RESHAPED TORSO IS DRAWN AT LAST.** Ryan, watching Sprout grow: *"his head just pops
up with his shoulders, leaving his body the same on the ground."*

🔴 **The torso mesh's scale was dividing the resolved height by the *reshaped* height — the same
number — so it came out exactly `1` for the whole of every reshape.** The head group and the
shoulders follow model heights and were right; the body was the one part nothing moved. The divisor
has to be the shape the **geometry was built from**, which is what `Dancer` is handed, not the shape
the dancer is wearing. Live since the channel was wired up, and invisible because the two numbers
were always equal at the moment anyone looked.

🔑 **And a capsule is not a box.** Scaling Y by `h'/h` stretches the two hemispherical caps as well,
so the mesh's top lands at `(h/2 + r)·h'/h` while every measurement puts the shoulders at
`h'/2 + r` — radius **unscaled**. On Sprout grown by 0.735 that is **0.245** of torso standing proud
of the arms hanging off it. `bodyMeshScale` scales by the ratio of *half-extents* instead, which
puts the top and bottom exactly where `computePositions` says they are; the caps stretch with the
barrel, which is what a stretching torso looks like and is why this is a scale rather than a
geometry rebuilt every frame. Its own module, so it is testable without a renderer — 4 tests, one of
which pins the drawn top to `shoulderY` across four deltas and two casts.

✅ **AND A BODY NOW GROWS FROM WHERE IT STANDS —
[ADR-0043](adr/0043-a-body-grows-from-where-it-stands.md).** Ryan: *"I really want the bottom to stay
where it starts when the rest grows taller — same with all the characters, Ember's body when it
shrinks should still start below the floor."*

`computePositions` centres a body on `bodyCenterY`, so a height change of `d` moved the top up by
`d/2` and the bottom **down** by `d/2` — a body growing in both directions from its middle, which is
not what growing looks like. A dancer stands on something.

🔑 **The second half of Ryan's sentence is what names the rule.** This is *not* "put everybody's feet
on the ground" — the cast sits at wildly different heights (Myco's underside 0.05, Sprout's 0.25,
Ember's **−0.425**) and that stays true. What must not happen is a body changing size and taking its
own underside with it.

🔑 **Done as a rig origin, not by re-centring the body.** `ArmMetrics.rigOriginY` already means *"the
world Y of the group these local coordinates are measured in"*, and every height comparison in the
dance goes through it. Teaching `computePositions` to anchor at the feet would put the offset in a
function that has no idea what the dancer's *resting* height was.

🔑 **`standingLift` takes the two shapes, not the delta** — `growBody` clamps to the editor's bounds,
so what a caller asked for and what a body took differ whenever a slider runs out. Ember asked 0.735
takes 0.59; lifting by half the *request* would float her off her own feet by 0.0725. The signature
makes that unwritable.

**And a reshape now buys twice as much.** The grower's shoulder rises `d/2` inside the rig with the
rig rising `d/2` under it, so a pair close a gap at **`2d`** per unit of trade and `planArch` asks
for half the deficit. **Every reshape costs half the deformation it used to**: Myco with Ember trades
0.364 where it traded 0.729, and Sprout with Ember settles symmetrically at 1.037/0.673 where it used
to be pinned against **both** ends of the slider.

🔴 **No outcome changed** — still 11 dancing at their own width, 9 reaching, 0 letting go, identical
arm deltas. What changed is how a body gets there. 🔴 **And the bounds test needed a new subject**,
which is the honest signal of the above: Sprout with Ember was *the* example of a reshape clipping at
the editor's floor and no longer clips at all.

🔴 **Six in-repo call sites were measuring a reshaped dancer standing in the wrong place** — bare
`armMetrics(growBody(...))`. `wearing()` is exported now so a test measures a dancer the way the
dance does.

✅ **AND THE UPSTREAM CAUSE IS CLOSED —
[ADR-0044](adr/0044-standing-and-passing-use-one-margin.md).** 🔴 **I had this wrong all day.**
`touchHold` *does* floor the couple's width at the room their bodies need — `placeHold` has had
`lateralClearance(...) + PERSONAL_SPACE` in its `bodies` term the whole time. The defect was
narrower and more familiar: **two spellings of one rule.**

| | formula | |
|---|---|---|
| **standing**, `placeHold` | `clearance + PERSONAL_SPACE` | +0.06, additive |
| **passing**, the figure | `CLEARANCE_MARGIN × clearance` | ×1.1, multiplicative |

They are equal at a clearance of exactly **0.600**, and above it the stance is the smaller number —
so a pair stand closer than they can pass. 🔴 **And `PERSONAL_SPACE`'s own comment described the two
as the same number** (*"deliberately the same 0.06 the default frame scale leaves between passing
bodies"*), which was true when written and stopped being true when the frame's margin became a
multiplier. The couple's standing floor had been written from that sentence. **Third time today a
comment asserted an invariant the code had quietly stopped maintaining** — after `archLateral`'s
"above both crowns by construction" and `gripHeight`'s note about the averaged hold.

Ryan: *"ok do x1.1 everywhere."* One `passingWidth(clearance)` in `frame.ts`, called by both.
`PERSONAL_SPACE` keeps its other two callers and loses this one — its job is *daylight a limb keeps
before it folds*, which is not a question about where two people stand.

🔴 **The honest cost of choosing the multiplier:** below the crossover it is the *smaller* margin, so
Sprout with the player goes 0.490 → **0.473** and the smallest pairing on the cast keeps 0.043 of
daylight where it kept 0.06. Myco with Sprout goes 0.737 → **0.745**; sixteen stances did not move at
all. **If the small end ever looks cramped, the alternative to reach for is additive-everywhere, not
a third constant** — that is written into the ADR rather than left as a shrug.

**No outcome changed** — still 11 / 9 / 0 with the same arm deltas. What changed is where a couple
stands before the arch asks them for anything, and **Myco with Sprout now stand on exactly what they
need to pass**, so every unit of their reach is the arch's. Their overshoot went 1.62 → 1.07 →
**1.05** across the day's three corrections, which is what a number looks like when three separate
things were inflating it.

✅ **THE PIN IS MOVED AND THE TAG IS OUT.** square-one **v0.4.0** is on `origin`, the pin follows it,
and the-lot was verified **against the published tarball** rather than the symlink —
`SQUARE_ONE_NO_LINK=1`, then a real fetch of the v0.4.0 tarball: typecheck, 665 tests and the build
all green with `ShapeAt` resolving out of `dist/sequence.d.ts`. That is the check this morning's
finding said nobody had run since the pin went stale, and it is the one that closes it.

🔴 **`allowBuilds` had two dead keys and one of them was pnpm's suggestion text pasted in as a
value.** `square-one@…660fe332: set this to true or false` — v0.2.0's URL, carrying the literal
instruction where a boolean goes. YAML reads it as a string and pnpm ignores it, so it survived two
bumps: **nothing fails when a key nobody fetches is wrong.** One line now, for the tag the pin
actually names.

---

**▶ 2026-08-22, earlier — ✅ THE WATCH IS CLOSED. 🔴 AND THE ENGINE THIS RUNS ON IS NOT THE ONE
IT PINS.** Ryan: *"I watched two twirls and it looks good with both the resize and the break
accommodations."* That closes the tenth chunk's verify and every render watch in the effort.
**Nothing on screen is waiting.** **637 tests**, lint 0 errors, build clean, `docs-hygiene` clean.

🔴 **`package.json` pins `github:randallard/square-one#v0.3.0`, and `src/dance/DanceFloor.tsx` and
`src/dance/useDancePerformance.ts` both import `ShapeAt` — which square-one added in its ADR-0025,
*after* that tag.** `git show v0.3.0:src/sequence.ts` has no mention of it. The suite is green here
because [ADR-0034](adr/0034-the-engine-relinks-itself-when-a-sibling-checkout-exists.md) relinks
the engine to the sibling checkout whenever one exists, and `link-engine` prints the mismatch on
every install:

```
link-engine: linked → /home/ryankhetlyr/Development/square-one
link-engine:   pinned github:randallard/square-one#v0.3.0  ·  local 0.3.0
```

**A fresh clone or CI resolves the pin and gets a package with no `ShapeAt` in it.** These 16
unpushed commits have never been built against the pinned tarball.

🔑 **The co-development link is doing exactly what it was built for, and that is what hid this.**
On 08-21 the tag was validated end to end — the suite ran green against the *published* tarball
rather than the symlink, deliberately. One chunk later the code moved past the tarball and the
link covered the gap silently. **The convenience and the check are the same mechanism, so the
check is only as good as the last time somebody turned the convenience off.** ADR-0034's promotion
condition should become a gate: fail when the pinned version does not satisfy what the source
imports, rather than trusting a line of install output.

▶ **The fix is a square-one `0.4.0` and a pin bump here.** Its `main` is eight commits past v0.3.0
with `turn-under` deleted (breaking) and `ShapeAt` added (additive). **Ryan pushes the tags.**

**🔴 Open, after that:**

1. **Should the beau's bow carry more of the difference between the two accommodations?** New, and
   Ryan's to judge — see the tenth chunk below. 0.897 against 0.952.
2. **To discuss:** the standing touch-hands handhold has no accommodation (the third hold, and its
   hands meet *in front of* the pair rather than between them); `arm-turn`'s quarter-turn sampling;
   the hold's `forward` still 0.320 on the default cast, flagged 2026-08-17.
3. **`archClearance` measures from the couple's midpoint** — still open deliberately, see below.
4. **Two couples in `#dance`** — planning ADR-0011's S2, and the real prerequisite for Star Thru.
   `applyCallToPair` cannot express a formation change. ADR-0037's own promotion condition lands in
   the same place: a call that legitimately changes the formation is not an accommodation.

---

**▶ 2026-08-21, tenth chunk — ✅ THE ARM IS SWEPT TO ITS OWN HAND, AND THE DEFAULT PAIR
KEEP HOLD.** [ADR-0038](adr/0038-the-arm-holding-the-arch-up-is-in-the-gap-too.md) — the ADR the
ninth chunk owed, now written, plus the two over-corrections it shipped with.
**637 tests, lint 0 errors, build clean, `docs-hygiene` clean.** ✅ **Watched and accepted 2026-08-22.**

🔑 **Two things were wrong with the ninth chunk's sweep, and they pulled the same way.**

1. **A mirror lost a sign.** `armSweepClearance` flipped the problem into each dancer's own frame
   and carried the join's lateral across without negating it, so the belle's arm was measured
   reaching for a point on the **wrong side of the midpoint**. The reshape fell **1.055 → 1.023**
   on that alone. A matched pair has a lateral of zero and cannot catch it; everything is written
   in the couple's frame now, with a `-1`/`+1` side.
2. **Both arms ran to the join, and under a break neither short one gets there.** The model
   charged for an arm longer than its owner has. `reachToward` stops a hand at `handReach`
   **along the line to the target** — short *across* as well as up — `ArchPlan.hands` carries a
   point per dancer instead of a height, and `DanceFloor` poses to the same point.

| myco/ember | hands need | arms need | bodies need | dances at | ÷ width |
|---|---|---|---|---|---|
| reshape | 0.220 | **1.023** | 0.781 | **1.140 — keeps hold** | 0.897 |
| break | **1.085** | 1.032 | 0.781 | **1.140 — keeps hold** | 0.952 |

🔴 **The break was standing at 2.368 and is back to 1.140.** Its arm cost went 1.184 → 1.032, back
under `archClearance`, and 1.085 fits inside the couple's own width.

🔴 **The cost, and it is Ryan's to judge: ADR-0037's two Twirls are much closer together again** —
0.897 against 0.952, where ADR-0037 left them at 0.685 against 0.951. Honest rather than a
regression: **the arm is in the gap under both accommodations and only the hand was ever cheap up
there.** The draw still shows plainly in the reshaping torsos; it barely shows in the beau's bow.
Wanting the bow to carry the difference again is a new question about what a reshape should cost.

🔑 **`reachCeiling` is not deleted and should not be** — it answers *"how high can this hand get if
it must arrive over the join"*, which is the right question while a hold is being **planned** and
the wrong one once the answer is "not that high". Released from the midpoint, the short hand comes
back toward its owner and lands slightly **higher**: 1.635 against 1.631.

🔴 **`docs-hygiene` had been red since `cb6b1b4`** — ADR-0030's supersede note was written as bold
text plus a trailing sentence, which the status parser rejects. The reasoning already lives in
ADR-0037's Context; the status line is plain again.

**✅ THE WATCH IS CLOSED — `#dance=two-twirls`.** Ryan, 2026-08-22: *"I watched two twirls and it
looks good with both the resize and the break accommodations."* The belle's arm reads clear of the
beau's head on the reshape side, and neither Twirl stands the pair at arm's length and beyond —
half of all executions used to.

🔴 **Still open, deliberately: `archClearance` measures from the couple's midpoint**, which is no
longer where a broken hold's short hand is. Conservative on the term that binds (the tall
partner's body at the low hand's height); the term it under-charges is the hand against its
**own** body, which is zero on the shipped cast because a hand that falls short still ends above
its owner's own crown. Folding it in would put two decisions in one ADR. Revisit on a cast where a
short hand lands *beside* its owner's head.

See [`journal/2026-08-21-11-the-arm-that-does-not-reach-the-join.md`](journal/2026-08-21-11-the-arm-that-does-not-reach-the-join.md).

---

**▶ 2026-08-21, ninth chunk — 🔴 THE GAP HAS A FOURTH THING IN IT: THE ARM.**
Ryan, on the two Twirls: *"yeah they look different but now the short side is clipping the belle's
arm into beau's head."* **630 tests, lint 0 errors, build clean.** ✅ **The over-correction this
shipped with is closed by the tenth chunk above**, and ADR-0038 is written.

🔑 **square-one's ADR-0018 found the third thing in the gap — a joined *hand* between two heads —
and measured the room at the hand's height.** That is the right question for a hand and the wrong
one for the arm holding it up. Under a reshape the join rides clear above both crowns, so the
cross-section at its height is literally **zero** and the figure was sized by the bodies alone.
The belle's arm runs from her shoulder up to that join, and on the way it passes exactly where his
head is.

🔑 **Solved, not measured, because the arm slopes** — it starts `restX` out at a shoulder and ends
at a hand between the two of them, so where it sits laterally depends on the height you ask about,
and both endpoints move when the pair move apart. `armSweepClearance` bisects on the separation.
The cheap version — "add the arm's width at the join's height" — is conservative in the wrong
place and would have dragged the reshape back up to the break's number, undoing ADR-0037.

---

**▶ 2026-08-21, eighth chunk — ✅ THE FIGURE IS SIZED TO THE ACCOMMODATION DRAWN, AND A PAIR WHO
LET GO ARE NOT HELD TO A HANDHOLD'S WIDTH.**
[ADR-0037](adr/0037-the-figure-is-sized-to-the-accommodation-drawn.md), superseding ADR-0030.
Ryan, on the pair who cannot make an arch at all: *"so do what we did with the california twirl —
sometimes myco gets smaller and sprout gets bigger, and sometimes they just reach as far as
possible but don't connect — **make this a rule**."* **630 tests, lint 0 errors, build clean.**
🔴 Held for Ryan's verify.

🔑 **The two accommodations want wildly different room, and the figure was always sized to the
worse one.**

| accommodation | room needed, as a fraction of the couple's width |
|---|---|
| **reshape** | **0.193** — the joined hand rides high above the crown, where a head is narrow |
| **break** | **0.951** — the hand never gets up, so it sits low, where a head is widest |

**Five times.** ADR-0030's reason was sound when written — the motions were built before the coin
was flipped — and the fix was to flip the coin first. square-one's ADR-0025 adds a per-call shape
override so each execution's figure follows its own draw, and the pose reads the same draw instead
of making a second one.

🔴 **That immediately exposed a live defect.** `archClearance` measures what must fit at the
**hand's height**, and a reshape's hand costs almost nothing — so unfloored, a **reshaped Twirl
passed closer than a Partner Trade** out of the same two people. **A hold cannot make a pass
cheaper than no hold.** It was hidden because the break always bound: taking the worst of two
answers conceals a wrong one.

🔑 **And when neither fits, the pair let go — and are then not held to a handhold's width.** They
stand at **twice** the room they need, which is exactly where the beau's arc delivers it **on its
own radius with no bow at all** (square-one ADR-0014's relationship, used backwards).

| pair | drew | dances | stands | ratio |
|---|---|---|---|---|
| myco/ember | reshape | reshape | 1.140 (handhold) | **0.685** — was 0.951 every time |
| myco/ember | break | break | 1.140 (handhold) | 0.951 |
| myco/sprout | either | **break** | **2.393 — let go, widened** | 0.500 |
| ember/sprout | either | **break** | 1.160 — let go | 0.500 |

🔴 **`sizeArch` exists because this logic had been copied into a test helper three times and was
wrong there twice** — once omitting the arch clearance, once omitting its floor. There is one
implementation now and the suite calls it.

**⚠️ THE WATCH — `#dance=two-twirls`.** 🔴 The two Twirls should now look **different from each
other**, which is what ADR-0028's per-execution draw has claimed since it was written and could
not deliver. Half the time the beau bows markedly less than before. A cast with Sprout in it would
show the let-go case, standing well wide — not currently in `#dance`.

---

**▶ 2026-08-21, seventh chunk — 🔴 THE CALIFORNIA TWIRL'S BEAU WAS SPRINTING, AND IT WAS THE
MARGIN.** Ryan: *"most moves look great — almost all — all except california twirl … the
beau is going way too far out now."*
[ADR-0036](adr/0036-the-arch-clearance-carries-its-own-margin.md). **631 tests, lint 0 errors,
build clean.** ✅ **WATCHED AND ACCEPTED** — *"that all looks good."* The beau's arc peak went
**0.855 → 0.657** world against a couple standing 1.140 apart, and his path over the four beats
**4.366 → 3.371**.

✅ **And that closes ADR-0035's watch too, which was "everything".** Every figure has now been
seen and accepted **at the single scale**: the Dosado, both Trades, both Twirls, Trade-plus-Twirl,
and Allemande Left with its accommodation. Nothing on screen is waiting on Ryan.

🔑 **ADR-0035 applied `CLEARANCE_MARGIN` to both clearances and the arch did not need one.**
square-one bows the beau's arc to meet `archClearance`, and a request **at or above the couple's
own width cannot be delivered at any bow** — the two are exactly that far apart at both ends of
the call. The engine caps the bow there and returns it.

| arch ÷ couple width | |
|---|---|
| what ADR-0018 measured and Ryan accepted | **0.951** — inside the cap, only just |
| with the margin applied | **1.046** — outside: capped, maximum bow |

🔴 **The ratio is scale-invariant, so the tighter square did not cause this.** The margin alone
did, and 0.951 left so little headroom that 10% was more than enough to spend it.

🔑 **The margin belongs to the measurement that lacks one.** `lateralClearance` is a bare touching
distance. `archClearance` already carries margin three times over — `headroom`'s hand of daylight,
`ARCH_OVERSHOOT`, and taking the **worse** of the two accommodations.

🔴 **The guard found a second, older instance, still open.** Myco with Sprout wants **1.62** of
their handholding width and has been **capped in silence since the field existed** — ADR-0018
measured one pairing and nobody checked the rest. Structural: a couple's width comes from the
handhold, so a short-armed pair stands narrow while two heads with a hand between them want as
much room as anyone's. Fixing it means letting a couple stand wider for the call, which changes
what a couple *is*. **Ryan's decision.**

🔑 **An unsatisfiable clearance looks exactly like a working figure** — the sibling of ADR-0020's
*"a shape a call does not read is silently ignored"*. Both are warned about at the fields
themselves now.

---

**▶ 2026-08-21, sixth chunk — ✅ THE SQUARE NO LONGER GROWS FOR ITS WIDEST PAIR.**
[ADR-0035](adr/0035-the-square-does-not-grow-for-its-widest-pair.md). **628 tests, lint 0 errors,
build clean.** 🔴 **This is the one change today that moves everything on screen** — the watch
below is the point of it.

🔑 **The floor was carrying a second copy of the accommodation.** `scaleForGaps` grew the whole
frame until square-one's fixed lane happened to fit the widest pair — *"the neediest pair sets the
spacing for everyone, even in moves that don't involve them"*, in `frame.ts`'s own words. It was
the only lever available while the engine's figures were fixed. square-one's ADR-0020 and ADR-0023
ended that this morning, and the floor kept doing it anyway.

`scaleForGaps`, `minScaleForGap`, `minScaleForPair`, `minScaleFor` and the hand-copied
`ENGINE_LANE_OFFSET` are **deleted**. `SCALE_MARGIN` survives as **`CLEARANCE_MARGIN`** — the
rename is the decision in miniature: it was never about scale, it was about `lateralClearance`
returning the distance at which nothing *touches*.

| | before | after |
|---|---|---|
| facing pair stands | 2.603 world | **2.200** |
| pass opens to | 0.781 world | **0.781** — unchanged |
| clearance in engine units | 0.273 (**below** the figure's 0.3, so floored and inert) | **0.355** — the lane genuinely widens |
| `gripRadius` in engine units | 0.274 (below `ORBIT_RADIUS`) | **0.324** (above it) |

🔑 **The engine's body measurements finally bind.** At the old scale the cast's clearance divided
to *below* the figure's own, so ADR-0021 floored it and the lane never moved — the seam had been
open for a day and doing nothing.

🔴 **`gripRadius` flipped sign**, and its test now asserts the opposite of what it did this
morning. Nothing about the arms changed; the frame did. **The number was never a fact about the
cast alone**, which is exactly why ADR-0021 refuses to clamp it in either direction.

🔴 **Two calibrated thresholds rotted, and both were world distances.** The arm-geometry "breathes
at the bodies" range fell 0.46 → 0.387 against a flat `0.4`, with the property unchanged. Both are
expressed against `DEFAULT_SCALE` now. **A test that hard-codes a world distance is pinned to a
frame it does not name.**

✅ **WATCHED AND ACCEPTED**, after ADR-0036 fixed the one figure this chunk broke. Every scene
re-checked at the single scale.

---

**▶ 2026-08-21, fifth chunk — ✅ ALLEMANDE LEFT WATCHED AND ACCEPTED; THE DOSADO PASSED BY TOO
FAR.** Ryan: *"checked allemande left — looks good"*, then *"dosado pass by too far
though — should watch body / head size and pass by just enough to clear and slide to the right far
enough to step back."* **637 tests, lint 0 errors, build clean.** 🔴 Held for Ryan's verify.

✅ **The forearm accommodation is watched.** ADR-0033's reshape/break on an arm turn — the first
time either style had been applied to anything but an arch — reads right. That watch is closed.

🔴 **Two causes for the Dosado, and one of them was here.** The facing-pair path passed only
`gripRadius`, so a Dosado and a Pass Thru — which a *facing pair* dances, never a couple — were
still sized at the body-agnostic figure. `useDancePerformance` passes `clearance` down that path
now too. The couple path has had it since ADR-0031; this is the same omission one formation over.

🔴 **The other was square-one's, and older:** `pass` walked a flat **0.80** that nobody could
derive, so the pair finished **1.562 world units** past each other against the **0.710** their
heads and torsos take to clear. Fixed in its
[ADR-0023](https://github.com/randallard/square-one/blob/main/docs/adr/0023-a-pass-walks-just-far-enough-to-clear.md)
— `lane` and `close` now walk `(separation + clearance) / 2`. **2.083 → 1.692 world walked,
1.562 → 0.781 past.**

🔑 **The distance is forced by the beat after it.** During the `slide` the two dancers **swap
lanes**, each crossing the other's `x`, so nothing lateral holds them apart and the whole gap is
the one they walked out — it must be the clearance and need be no more. *"Slide to the right far
enough to step back"* is the same number from the other side, and `slide.distance` has been that
clearance since square-one's ADR-0020.

✅ **WATCHED AND ACCEPTED** — Ryan, `#dance=dosado`: *"dosado looks good."* The walk is a fifth
shorter and the pass half as far past, and "just enough to clear" reads right. **Every pair call
is now watched at its body-derived size**: Dosado, Pass Thru's lane, and Allemande Left's grip.
🔴 Still owed: the **two-trades / two-twirls** watch, which is the couple calls' bow.

---

**▶ 2026-08-21, fourth chunk — ✅ THE FOREARM HOLD IS A REACH A PAIR CAN FAIL, AND IT NOW GETS
THE SAME TWO ACCOMMODATIONS.** ✅ **Watched and accepted** — see the top of this file. Plus the pin bump to square-one **v0.3.0** and the
last measurement across that seam. [ADR-0033](adr/0033-the-forearm-hold-is-a-reach-a-pair-can-fail.md).
Journal *[the hold nobody asked about](journal/2026-08-21-10-the-hold-nobody-asked-about.md)*.
**637 tests** (from 627), lint 0 errors, build clean. **Landed — `5b21918`.** 🔴 Still awaiting
Ryan's verify in the running scene.

🔴 **The finding: two of the three shipped pairings cannot make the hold they were being posed
in.** A joined forearm lies horizontal at one shared height, so each dancer's elbow has to be
*at* it — and the elbow hangs off the shoulder on an upper arm of fixed length. `gripHeight`
averages the two resting elbows and `gripPose` put both forearms there, with nothing asking.

| pair | elbows | mean | shortfall | break gap → reshape gap |
|---|---|---|---|---|
| Myco / Ember | 0.620, 1.095 | 0.857 | **0.238** | 0.238 → **0.036** |
| Ember / Sprout | 1.095, 0.650 | 0.873 | **0.222** | 0.245 → **0.033** |
| Myco / Sprout | 0.620, 0.650 | 0.635 | 0.015 | 0.015 → 0.002 |

🔑 **The reshape has a property here the arch's version cannot claim.** Growing the *lower*
dancer by `d` and shrinking the higher by `d` moves their elbows `±d/2`, closing both gaps to
the mean **and leaving the mean exactly where it was** — the hold is made reachable without
being relocated.

🔴 **The first implementation was inverted and looked fine.** Signed by whose *shortfall* was
larger rather than by whose *elbow was lower*, it grew the taller dancer and drove her elbow
further from the line: **0.511** apart where a break gave 0.238. Pinned now by a test asserting
a reshape never finishes further apart than a break — **an accommodation has to beat the
alternative it was chosen over, and nothing in the suite was comparing them.**

🔑 **`gripRadius` is supplied at last** — square-one's ADR-0020 added it and nothing fed it. Read
out of the pose rather than invented, and it comes out **smaller** than the engine's own
`ORBIT_RADIUS` on every shipped pairing (0.205–0.274 engine against 0.300). That is ADR-0021's
one unfloored measurement doing real work: this cast dances a tighter Allemande than the
body-agnostic figure, and flooring it would draw one they cannot reach. `applyCallToPair` takes
a shape now too, because Allemande Left is danced by a *facing pair* and passing bodies only
down the couple path would have missed the one call the measurement exists for.

🔴 **The `allowBuilds` comment in `pnpm-workspace.yaml` was wrong, and had been.** It claimed the
entry was keyed by package name *"rather than the tarball URL pnpm suggests — that URL embeds the
commit hash and would need editing on every square-one tag"*, while the line beneath it was the
URL with v0.2.0's hash. The local symlink meant pnpm never fetched the tarball, so nobody found
out. Bumping the pin fetched it and the install stopped; `square-one: true` was tried and
rejected. **This line changes on every square-one tag** — the comment says so now.

🔑 **The suite ran green against the published tarball**, not the symlink, which is the tag
validated end to end.

**⚠️ Owed — reconciled 2026-08-21.** 🔴 This list had drifted: three of its entries were already
done. Ryan asked for the short list and four of thirteen items across the three repos turned out to
be finished. A stale backlog costs more than an empty one, because it is read as the current state.

**✅ Closed today** — every render watch (`#dance=two-trades`, `#dance=two-twirls`, the elbow
watch, and **where the join sits**: all *"looks good"*), the Allemande Left accommodation watch,
the Dosado, the co-development link ([ADR-0034](adr/0034-the-engine-relinks-itself-when-a-sibling-checkout-exists.md)),
and both engine-side measurements now crossing the seam.

**🔴 Still open here:**

1. ✅ **The frame-scale hack is retired** — ADR-0035, at the top of this file. Wants the render
   watch named there.
2. **The standing touch-hands handhold has no accommodation.** Third hold; its hands meet *in
   front of* the pair rather than between them, so it is a third plan and not a third caller of
   ADR-0032's two. To discuss.
3. **The hold's `forward` is still 0.320** on the default cast — flagged 2026-08-17 and untouched
   through six chunks. To discuss.
4. 🔴 **Local and CI install differently on purpose** (ADR-0034). `SQUARE_ONE_NO_LINK=1 pnpm test`
   is the command that checks this repo against the published tag; a bug that only reproduces
   there will not reproduce locally.

---

**▶ 2026-08-21, third chunk — ✅ THE TWO STYLES OF ACCOMMODATION ARE NO LONGER THE ARCH'S.** Ryan: *"I want to make sure we remember the two different styles of accommodation for
the reach in california twirl."*
[ADR-0032](adr/0032-the-accommodation-belongs-to-the-hold-not-to-the-arch.md). **627 tests
unchanged, lint 0 errors, typecheck clean — a pure refactor, and asserted as one.** 🔴 Held for
Ryan's verify.

🔑 **They were never about arches.** `reshape` / `break`, the even-odds per-execution draw, and the
torso reasoning behind the reshape all answer *these two people cannot reach the thing the call
says they are holding — what do they do?* That question belongs to a **hold**, and the arch was
just the first one to ask it. All of it now lives in `accommodation.ts`; `arch.ts` keeps
`planArch`, `archClearance`, `crownOf`, `reachCeiling`, `archLateral` and builds on top. The
`ARCH_` prefix went with the move.

🔑 **A hold added later must answer *which of these two* and keep the draw** — never a third
silent fallback, and never one of them as the default. Neither is the fallback; they are two
things dancers of mismatched size actually do.

🔴 **The forearm hold still has no accommodation, and that is the next step.** `DanceFloor` finds
the accommodation with `g.grip === "arch"`, so an Allemande Left's joined forearms get none —
`gripPose` poses the hold and nothing asks whether two dancers of different arm lengths can reach
it. It pairs with square-one v0.3.0's **`gripRadius`**, the field its ADR-0020 added that nothing
supplies, and which is exactly the question *how far apart do two joined forearms hold this pair?*

🔴 **And `fist-bump.ts`'s `gripHeight` still carries the deferred note** — *"past a big enough
height difference the taller dancer does nearly all the accommodating."* ADR-0028 said that fact
had arrived somewhere it could not be deferred. It is still deferred everywhere but the arch.

---

**▶ 2026-08-21, second chunk — ✅ A PARTNER TRADE IS PASSED THE CLEARANCE ITS BODIES NEED, AND
THE ARC IT WALKS IS FINALLY THE ARC THAT WAS SOLVED.** Ryan: *"I looked at `#dance=two-trades` and
it's still too tight — if we're generalizing correctly it should be like `#dance=two-twirls`."*
[ADR-0031](adr/0031-the-hands-free-clearance-is-passed-too.md) here; square-one's ADR-0020,
ADR-0021 and ADR-0022. Journal *[the Trade was the half that never got the
number](journal/2026-08-21-9-the-trade-was-the-half-that-never-got-the-number.md)*. **627 tests**
here (from 626), **223** in square-one (from 193); lint 0 errors, build clean in both. **Landed —
`dbfed4f` here, `8d436cd` in square-one (released as v0.3.0)** — and still awaiting Ryan's verify
in the running scene.

🔴 **Half of it was here: the number was measured, and never passed.** This module has computed
`lateralClearance` since ADR-0012 and has passed the **arch** clearance since ADR-0030. The
hands-free one was withheld on purpose — *"a look, not a number"* — and two days later the arch
landed beside it, leaving two figures that walk the **same two paths** (square-one ADR-0017)
bowing differently for a reason neither figure has. **A withheld number is a decision with an
expiry date, and nothing in the code carries the date.**

🔴 **The other half was in the engine, and it was older than the couple work.** square-one solves
the beau's bow against the **arc**; the dancers walk a **polyline**, because `orbit` marked a
waypoint every 45° and `sampleMotion` runs straight lines between them. The chords sag 7.6% of the
radius inside the curve, so a Trade solved to exactly 0.710 delivered **0.670**. Fixed at the
sampling — 7.5°, where the sag is under the engine's own rounding — rather than by bowing wider to
hide it.

| the Trade's closest approach, world units | |
|---|---|
| before, half the couple's width | 0.554 |
| clearance passed, 45° sampling | 0.670 |
| **clearance passed, 7.5° sampling** | **0.709** — against 0.710 wanted |

🔑 **Every instrument in both repos was blind the same way.** They all pair the two dancers at
their shared **waypoint beats**, and the sag lives strictly between those marks — so more tests of
that kind would not have found it. The new guard runs `sampleMotion`, which is what a consumer
uses. **Measure with the thing the consumer uses.**

🔑 **The tripwire fired, and so did the finding it protected.** Three tests here asserted the
shortfall; one said of itself it was written *"so this test fails loudly the day somebody fixes it
properly."* The one worth recording claimed wide bodies were **structurally** unable to dance a
Trade at handholding distance — *"no amount of work on this side fixes that… that is a decision
about the figure and it is Ryan's."* Both halves were true, and the branch it named is what
happened: `cast([0.6, 0.6])` went **0.819 → 1.197** against 1.200 wanted. A pinned finding that
names the decision that would overturn it is worth more than a passing test.

**▶ THE WATCH THIS CHUNK IS WAITING ON — `pnpm dev` → `#dance=two-trades`, then
`#dance=two-twirls`.** 🔴 The Trade bows **less** than the Twirl, and it should: same bodies, but
the Twirl has a joined hand up between two heads. The beau's path over the four beats runs
**1.789** world with no bodies → **2.033** for a Trade → **3.387** for a Twirl. If the Trade now
reads right, the generalisation is landed; if he reads as hurrying, that is the same sprint
question two-twirls has carried since 08-19, at 14% rather than 89%.

**⚠️ Owed.** (1) The watch above, both scenes. (2) 🔴 **The frame scale still derives from the
engine's fixed lane** — `minScaleForGap` divides by a hand-copied `ENGINE_LANE_OFFSET` — so one
wide pair still pushes the whole square apart in every call. square-one's ADR-0020 makes the pair
calls able to hold their own accommodation instead; that is a separate change, a separate watch,
and it needs a square-one **tag** first (this package's dependency is `#v0.2.0`). (3) Re-take the
**elbow watch**. (4) 🔴 **Where the join sits** — the arch sits between the two inside shoulders
while the belle passes through the couple's centre, so she may not pass *under* the joined hands;
the wider arcs make this a better watch than it was. (5) 🔴 The hold's `forward` is still **0.320**
on the default cast, flagged 2026-08-17 and untouched.

---

**▶ 2026-08-19 — ✅ THE ARCH'S PASS NEEDS A HAND'S ROOM BETWEEN TWO HEADS, AND IT HAS IT.** Ryan, on a break: *"the beau's hand clips through the belle's head — it shouldn't push
into the beau's own head either though."*
[ADR-0030](adr/0030-the-arch-clearance-is-measured-from-the-worse-accommodation.md). Journal
*[the hand in the gap](journal/2026-08-19-8-the-hand-in-the-gap.md)*. **Committed — `9ce307e`
here, `b3a02eb` in square-one — and still awaiting Ryan's verify.** **626 tests** here (unchanged
— this is one measured number through an existing seam), **193** in square-one (from 176); lint 0
errors, build clean.

🔴 **The finding: the gap has a third thing in it.** Hands free, two dancers must clear each
other. Hands joined and raised, there is a **joined hand up between their heads** — where a head is
widest — belonging to neither of them, so neither one's width accounts for it. Against a couple
standing **1.140** apart:

| what has to fit through the gap at the pass | wants |
|---|---|
| two torsos, side by side | 0.520 |
| two heads | 0.710 |
| two heads with a joined hand between them | **1.084** |
| what the figure delivered before this | 0.570 |

`archClearance()` plans **both** accommodations, grows each dancer by that plan's own delta,
measures each hand at its own height (`sideExtentAt` narrows a head toward its poles) and takes the
worst — the figure is sized before the coin is flipped, and the **break** usually binds because its
beau never gets his hand up. `DanceFloor` divides by the frame scale and passes it through the same
seam `coupleWidth` uses. square-one's ADR-0018 bows the beau's arc out to meet it. **We measure;
the engine chooses the path.**

**Measured end to end.** Worst penetration 0.175 → none, both accommodations. In the reshape the
beau's own head was grazing at 0.001 and now clears by **0.194**. Pass separation **0.570 → 1.314**,
and the pair never come closer than the 1.140 they stand at.

**▶ The watch this chunk was waiting on — `#dance=two-twirls`.** 🔴 The beau's arc peaks at
**1.152× the couple's width** where it peaked at 0.5×, in the same 4 beats. Whether he reads as
*sprinting* is the one number a render decides. Still open, and now with a second subject — see
the top of this file.

**And the second Twirl had lost the bow.** Ryan: *"it looks like the first california twirl is good
but the second still has the smaller path."* Twirl #1 passed at 0.333 engine units, #2 at **0.167**
— the bare radius. square-one's `reformCouple` dropped both clearances at the call boundary; fixed
there (its ADR-0019), nothing changed here. 🔑 **Our own harness missed it because it walked one
call.** Every number in it was right; Ryan was watching a **sequence**. Sibling of this month's
recurring shape — *is the thing I measured the thing on screen?*

🔴 **The hands-free `clearance` is deliberately still not passed.** The same seam would close the
head overlap pinned since square-one's ADR-0014 (0.570 delivered against 0.710 wanted) and would
also bow a Partner Trade Ryan has already watched and accepted. A look, not a number — flagged on
`useDancePerformance`'s `archClearance` doc.

**⚠️ Still owed, unchanged:** the **elbow watch** re-take. 🔴 The hold's `forward` is still **0.320**
on the default cast, flagged on 2026-08-17 and untouched. 🔴 And **where the join sits** — the
pair's midpoint bulges forward at the pass while the belle passes through the couple's centre, so
she may not pass *under* the joined hands at all. Left alone on purpose until someone looks; the
much wider arc makes it a better watch than it was.

---

**▶ 2026-08-18, and the premise this one is built on — ✅ THE ARCH IS DRAWN, AND WHEN THE BODIES
CANNOT MAKE ONE THEY EITHER RESHAPE OR LET GO — DRAWN AT RANDOM PER EXECUTION.** Ryan: *"can we make the duck
shrink the torso? actually I want two options that happen randomly each time a move like this is
executed — sometimes the torsos grow/shrink each a little more than necessary to accommodate, and
sometimes the arms just reach as far as they can and the hold breaks to accommodate."*
[ADR-0028](adr/0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md), and
[ADR-0029](adr/0029-a-shoulder-follows-the-torso-it-hangs-from.md) for the shipped defect it
uncovered. Journal *[the arch nobody can reach](journal/2026-08-18-7-the-arch-nobody-can-reach.md)*.
**LANDED in `9041d70`**, which Ryan verified in the running scene before saying to commit it:
*"looks pretty good."* **626 tests** (from 605), lint 0 errors, typecheck and build clean.

🔴 **The premise: on the cast that is on screen the arch is impossible.** Ember's crown is at
**2.155**; Myco's shoulder is at 0.950 with a 0.690 arm, so with the arm dead vertical he reaches
**1.640**. Three of the six pairings in the repo cannot make an arch at all, including the default
one. This is `gripHeight`'s long-standing note — *"the taller dancer does nearly all the
accommodating"* — arriving somewhere it cannot be deferred.

**Watched and accepted, and still the things to keep an eye on** — `pnpm dev` →
`#dance=two-twirls` (and `#dance=trade-twirl` for the pair):
- **The reshape is big.** The beau's torso goes **0.30 → 1.03** and the belle's **1.41 → 0.68** —
  they roughly swap stature for four beats. Accepted as it stands; if it ever reads as too much
  the dial is `ARCH_OVERSHOOT`, and past that, whether the arch has to clear the crown at all.
- **The break** should read as the tall belle holding her hand over her own head while the short
  beau cannot follow, and her turning under her own hand.
- The debug line names which one was drawn: `arch — reshape (torso a +0.729, b −0.729)`.

🔴 **Still unresolved, and it is a question about a picture: where the join sits.** The arch sits
between the two inside shoulders like a standing hold — but the pair's midpoint bulges forward to a
quarter of the couple's width at the pass while the belle passes through the couple's *centre*, so
she may not pass **under** the joined hands at all. Left alone on purpose until someone looks.

**⚠️ Owed at the time:** the **elbow watch** re-take, then the **clearance watch** — which now
covers both couple calls at once, because after square-one's ADR-0017 they walk the same paths.
And 🔴 the hold's `forward` is still **0.320** on the default cast, flagged on 2026-08-17 and
untouched. *The clearance watch is what 2026-08-19 turned into ADR-0030; the current owed list is
at the top of this file.*

---

**Earlier the same day, and landed in the same commit — ✅ THE CALIFORNIA TWIRL'S PATHS ARE FIXED
IN THE ENGINE (square-one `bd93203`), AND THE ARCH WAS DECLARED BUT NOT YET DRAWN.** Ryan, watching both couple calls: *"partner
trade looks good — california twirl beau might be same path but raise arm and have belle duck under
the two held hands — belle's path might be the same as partner trade too — but she needs to start
the turn to the left, ccw, and make it only a 180 degree turn — the way it's running now the belle
is doing 540 degree turn cw."* **The engine work is all in square-one**
([ADR-0017](https://github.com/randallard/square-one/blob/main/docs/adr/0017-a-california-twirl-is-a-partner-trade-holding-on.md)):
the Twirl was a rigid rotation of the pair about their joined hands with the belle taking a whole
extra turn beneath a fixed arch, and it is now the **Partner Trade's own two chains with a `hold`
on them** — the same paths, waypoint for waypoint, and the joined hands are the only difference
between the two calls. Journal
*[the Twirl was a Trade](journal/2026-08-18-6-the-twirl-was-a-trade-and-the-arch-is-a-hold.md)*.
**605 tests**, lint 0 errors, typecheck and build clean. square-one at 176 tests, also clean; both
working trees **uncommitted**.

🔴 **What Ryan will see, and what he will not.** `#dance=two-twirls` — the belle turns 180° CCW
instead of 540° CW, and the beau walks the arc he walks in a Trade. **No arch.** A Twirl renders
exactly as the Partner Trade it is now geometrically identical to, and `#dance=trade-twirl` has two
halves that look the same. That is the honest state of it and the readout says so:
`arch declared by the call — raised handhold not drawn yet`.

🔴 **The decision this side is owed, and it is a decision rather than a fallback.** Every hold this
module can pose is built on [ADR-0027](adr/0027-the-upper-arm-hangs-and-the-hands-come-forward.md)
— *the humerus of a hanging arm stays in the plane of its own shoulder* — which is the right
anatomy for a couple standing hand in hand and **exactly false of an arch**. `touchPose` already
falls back to `reachPose` for a hand above the shoulder, so an arch drawn today would be drawn by
`ELBOW_SWING` and `ELBOW_BACK`: the preference constants ADR-0027 was written to stop relying on.
Routing it to `gripPose` instead would draw an **Allemande**. So the frame loop splits the engine's
spans by style, `TrackedArms` gains an `arch` field beside `grip` and `touch`, and nothing is posed.

**Three questions, in order, for the next round:**
1. **The raised-arm anatomy** — what breaks the tie on the elbow's circle when the hand is above the
   shoulder. Same shape of question ADR-0027 answered for the hanging arm; everything else follows.
2. **Where the join sits.** A couple's hands meet between their inside shoulders. An arch the belle
   *walks under* wants the join over her path — and in this figure the pair's midpoint bulges
   forward to a quarter of the couple's width at the pass while she passes through the centre, so
   the two are not the same point. Worth **watching** before solving.
3. **The height**, which is the easy part: `bandedHeight` already clamps a target into what both
   arms can reach given what they have spent sideways and forward, and `placeHold` already asks
   `sideExtentAt` for the corridor at the hold's own height — the head, at head height. Point the
   same solve at a different target.

**⚠️ Still owed from yesterday, unchanged:** the **elbow watch** re-take (placement, both free arms,
both hands and the whole hold's forward offset have all moved), then the **clearance watch** — which
now covers both couple calls at once, because they walk the same paths.

---

**Earlier the same day — ✅ THE UPPER ARM HANGS, AND THE JOINED HANDS COME FORWARD (2026-08-18) —
LANDED in `d3cd4fb`,** which Ryan verified in the running scene before saying to commit it. Two
days of the S1 couple work went in with it: six ADRs (0022–0027) and the debug scene that judged
them. Ryan: *"they should be held a little forward from where they are, as if the upper
arm is relaxed and hanging straight down."* The hold had **no forward axis at all** — its `z` was
zero, the plane through both dancers' centres, and `touchPose` reached it by swinging each elbow
*backward* out of that plane. So the upper arm was never relaxed. Ryan's sentence is the derivation:
a hanging upper arm pins the elbow below its own shoulder, the forearm's length is then committed to
`across` and to the height, and **whatever is left goes forward**.
[ADR-0027](adr/0027-the-upper-arm-hangs-and-the-hands-come-forward.md) supersedes ADR-0025 — which
carried a promotion condition saying exactly this would need it. Journal
*[the upper arm was never relaxed](journal/2026-08-18-5-the-upper-arm-was-never-relaxed.md)*.
**600 tests**, lint 0 errors, typecheck and build clean. **Stance, height, lateral and every
clearance unchanged on all three casts.**

🔴 **One thing for Ryan to judge:** `forward` comes out **0.320** on the default cast, which is about
one torso radius — so the hands sit at the front surface of the beau's belly and his forearm is 3°
*above* horizontal. Cause: her waist (0.713) is essentially at his hanging elbow (0.620), so almost
all his spare forearm has nowhere to go but forward. That is his mechanism followed exactly; if it
reads thrust-out, the dial is the decision that *her* waist sets the height, not a fudge on
`forward`.

**Earlier the same day — ✅ THE JOINED HANDS TOUCH, FOR REAL, AGAINST THE MESH THAT IS DRAWN** (same commit). Ryan: *"looks better — the hands could still be closer to actually
touching."* They **were** touching, in the model, and a test asserted exactly that and passed: the
two hand centres were `handRadius + handRadius` apart, tangent spheres. But `handRadius` is the
radius of the sphere a hand is *made from*, and what is **drawn** is that sphere flattened to
`flattenZ` and rotated — Myco's open hand is 0.110 across and **0.025 thick** — so on a forearm
aiming 77% forward his hand reached 0.073 up instead of 0.110 and the drawn hands sat **0.0415
apart**. The geometry layer now asks the renderer's own mesh how far a hand reaches in a direction:
[ADR-0026](adr/0026-a-hand-is-the-ellipsoid-that-is-drawn.md). Palms land on the contact plane to
1e-9 in the suite and 7e-6 when independently sampled from the real mesh transform; stance, height,
lateral and every clearance unchanged on all three casts. Journal
*[the hands were tangent spheres](journal/2026-08-18-4-the-hands-were-tangent-spheres-that-are-not-drawn.md)*.
**599 tests**, lint 0 errors, typecheck and build clean.

**Earlier the same day — ✅ THE FREE ARM HUNG FROM THE SHOULDER, AND THE JOINED HANDS MOVED TO THE
MIDDLE.** Ryan, last: *"verify that the other forearm is set by the
character customization — they seem really high but maybe that's just the way it is."* It was not
set by the customization and it was not just the way it is: `proposeArms` wrote the **shoulder**
into a field that names the **elbow**, so every un-gripped arm in the dance had a zero-length
upper arm and hung one whole `elbowReach` — 0.330 — too high. The belle's free hand was coming out
*above* the couple's joined hands. Fixed, watched live, two tests through `resolveExpression`
(the seam nothing tested). Journal
*[the free arm hung from the shoulder](journal/2026-08-18-3-the-free-arm-hung-from-the-shoulder.md)*.
**599 tests**, lint 0 errors, typecheck and build clean. No ADR — it restores ADR-0017.

Before it, the same day: Ryan, looking at the standing couple through the
just-repaired joint markers: *"they can move to the horizontal middle between the dancer's shoulders — vertical level should
be at the belle's waist — the body / head disproportion might affect this but that's the general
rule."* The hands were sitting on **her inside shoulder**, which is where ADR-0022's "her arm
hangs and the beau covers the daylight" put them by definition. They are halfway along that gap
now: [ADR-0025](adr/0025-the-joined-hands-hang-between-the-shoulders.md) supersedes ADR-0023, the
lateral stops being an opinion about whose arm works and becomes a landmark, and the stance and
the height do not move on any cast. Journal
*[the hands move to the middle](journal/2026-08-18-2-the-hands-move-to-the-middle.md)*.
**597 tests**, lint 0 errors, typecheck and build clean.

Before it, the same day: the four **instrument** defects the elbow watch turned up are fixed and
watched live — the joint markers draw a touch hold, the URL round-trips the figure, a marker
switched on while paused paints itself, and the readout no longer calls a couple holding hands
"hands free". Journal
*[the instrument could not show its own hold](journal/2026-08-18-the-instrument-could-not-show-its-own-hold.md)*.
**Fixing the instrument is what made the pose visible enough to correct**, in that order and
within the hour.

**Next, and owed:** ⚠️ **re-take the elbow watch on the new placement.** Both elbows passed on
2026-08-17 against a hold 0.210 toward the belle; it is 0.050 now, the beau's across dropped
0.320 → 0.160 and the belle's rose 0.000 → 0.160, so her arm is doing something it was not.
Nothing looked wrong on any of the three casts, but the four-step watch is against the old pose.
Then the *clearance* branch — the Partner Trade's pass, which is still a collision.
`pnpm dev`, `#dance=two-trades`, `go home`, joint markers on.

Behind that, the handhold itself: Ryan, on "this pairing cannot hold hands naturally": *"try again
with the body spacing and arm positions — I want it to work with no new limitations — the movement
should accommodate the body size."* He was right and the limitation was self-inflicted. Then, on
the first look: *"the gent's job is to make the belle's job easier, even if she's taller."*
[ADR-0022](adr/0022-a-couples-handhold-is-solved-for-the-pair.md), journal
*the hands were never at the midpoint*.

- 🆕 **The debug panel has a `go home` button, and it is what the owed watch was missing**
  (2026-08-17). Ryan: *"a button for go home that takes whatever move is selected and just goes to
  the start of it … and it should be paused, don't play automatically."* The standing couple only
  exists at beat 0 of the loop, and the standing instruction for reaching it was *drop to 30 bpm
  and try to catch it* — an instrument asking for good reflexes. It now stands the square at beat
  0 of the selected figure and holds it there, emote in flight dropped. **Watched live in both
  formations**; `#dance=two-trades` and `#dance` (Dosado) both land on their start and stay.
  Journal *a way back to beat zero*. The interesting part: a paused floor writes **nothing**, so a
  rewind under the pause would have moved the clock and left the dancers mid-move — the number and
  the picture disagreeing for the third time this week, and the first time it was expected. No
  ADR; this is a scene control, and the panel's own table documents it.
- 🆕 **The render watch is inside the session now.** The Chrome browser tool is connected to this
  machine's Chromium, so the scene can be driven and screenshotted from here rather than handed to
  Ryan and waited on. **First reading, taken live:** the panel's solved hold matches the code
  exactly — stance **1.140**, hands **0.713**, off-mid **0.210 toward the belle**, beau **68%**
  across 0.320, belle **69%** across 0.000. That is the numbers confirmed *in the running app*,
  which is one step further than a green suite and still **not** the thing that matters.
- 🔴 **The handhold was never checked against a body, and the square shrank as the bodies grew**
  (2026-08-17). Found by Ryan the first time the new camera was pointed at `bodies: mixed`:
  *"note with different body sizes go home should update so that the handhold is between the beau
  and the belle as comfortably as possible … never pushed into the body of either — we want the
  square to accommodate."* It did not. `mixed` stood at **0.820** — narrower than the default
  cast at twice the size — with the joined hands **0.140 inside the beau's chest**; `max` stood
  with the two torsos exactly **flush** and the hands 0.240 inside the belle.
  [ADR-0023](adr/0023-the-bodies-bound-the-handhold.md) supersedes ADR-0022: the stance is
  floored by ADR-0012's own `lateralClearance` (height-aware, counts heads) plus `PERSONAL_SPACE`
  and by a corridor wide enough for the hands, and the hold is **clamped into that corridor**,
  which outranks the preference about whose arm reaches.
  [ADR-0024](adr/0024-the-dance-hangs-an-arm-outside-its-own-body.md) is the other half — the
  editor stays free to build any body, and the *dance* hangs an arm outside the torso it is
  attached to. Journal *the hold was never checked against a body*. **590 tests** (from 571),
  lint 0 errors, typecheck clean. **Watched on all three casts:** default unchanged (1.140 /
  0.713 / 0.210, clear 0.306/0.030), `mixed` 1.070 with clear 0.000/0.150, `max` 1.640 with clear
  0.276/0.000. Nobody's hand is inside anybody, asserted both ways round.
  - The one to carry: `lateralClearance` **already existed** and is what every other spacing
    decision goes through. `touchHold` used a sum of two radii because the thing in front of me
    was arms, and the body number already sitting in `ArmMetrics` was closer to hand than the
    house answer one import away. Not a missing idea — a local answer to a question that was
    already settled elsewhere.
  - Fell out of it: four **shipped** pairs (every one involving Sprout) overshot their arms by
    0.06% once the hold could no longer sit exactly under a shoulder, because the reachable
    height band was cut from the vertical alone. Third instance this week of *one number standing
    in for a constraint with two axes*. The band is re-cut as a bounded fixed point now.
- 🆕 **The camera moves** (2026-08-17). Ryan: *"add orbit controls to #dance."* drei's
  `OrbitControls`, the same component `CharacterPreview` and `ContactMovePreview` already mount,
  targeted at chest height (0.9) so "level" is level with the joints being judged. Tilt is clamped
  at the horizon through that target, which buys the level side view *and* rules out the camera
  going under the opaque floor; panning stays on, unlike the previews, because this square
  migrates. **Watched live:** orbit, the horizon clamp (re-dragging from it changes nothing), the
  top-down end, and scroll dolly. Journal *the camera moves*. No ADR — a scene control, documented
  in the panel's own table. The **figure** is in the URL and round-trips now, but still **no view
  presets and no camera state**, so a watch can be linked to but not framed by the link.
- ✅ **The render watch is taken, and both elbows pass** (2026-08-17). All four steps, on the
  default cast: paused on the standing couple with `go home`, orbited to front, rear-quarter, side
  and plan views. Journal *the elbow watch, taken*.
  - **The beau's elbow** sits at exactly his shoulder's lateral offset (dx **0.000**), 0.155
    behind his body, and inboard of his hand (0.460 against 0.780), with the undrawn upper arm at
    exactly its natural 0.330. The **plan view** is what answers "behind the body" — that question
    wants a view from above, not the side, which is worth knowing next time.
  - **His 81° forearm reads exactly like the defect it is not.** Standing instruction for anyone
    watching this pose: the elbow is the test, the forearm angle is not.
  - **Ember's forearm does read as detached** from behind — floating clear of her back, her hand a
    separate pebble below the tapered tip. **But her free arm looks identical**, so it is
    ADR-0017's undrawn upper arm plus her authored shape (0.10 → 0.025 taper, 0.015 wrist gap,
    0.07 hand), not anything touch hands did. Changing it is a body-shape decision affecting every
    dancer standing still.
  - **The hands visibly meet**, hers above his, confirmed from three angles.
- ✅ **The upper arm was never relaxed, and `forward` is what was left over** (2026-08-18). Ryan:
  *"they should be held a little forward … as if the upper arm is relaxed and hanging straight
  down."* [ADR-0027](adr/0027-the-upper-arm-hangs-and-the-hands-come-forward.md) supersedes
  ADR-0025; journal
  *[the upper arm was never relaxed](journal/2026-08-18-5-the-upper-arm-was-never-relaxed.md)*.
  - **`TouchHold` had three numbers and needed four.** Its `z` was zero, and `ELBOW_BACK` — which
    went in on 08-16 to stop an arm reading as *pointing at the belle* — was the only place an elbow
    could go once the hand was pinned to that plane. Right fix for that, papered over this.
  - **The derivation is Ryan's own sentence:** `forward² = forearmSpan² − across² − (handY −
    elbowY)²`, with the elbow hanging. The hold takes the **shorter** of the two dancers' answers;
    the other's elbow folds back, which is what an elbow is for.
  - 🔑 **`touchPose` needed no change, which is the check that the reading is right.** Its
    further-back-of-two-solutions rule *is* the vertical elbow at the exactly-relaxed hand position,
    to 1e-16. And it surfaced as a **failing test whose failure was the feature landing**: "expected
    −1.4e-16 to be less than −0.01".
  - default `forward` **0.320** (beau's upper arm 0.00° off vertical, belle folded 25.8°); `max`
    **0.306** with the roles swapped; `mixed` **0.000**, honestly, because the beau has no spare arm
    there at all. Reaches rise — beau 50→67%, belle 71→79% — and nobody passes 100%.
  - **The promotion condition ADR-0025 left open is resolved, not deferred.** The corridor stays
    side-to-side at `z` 0 and that is *provably conservative* in front: a capsule's half-width at
    offset `z` is `sqrt(r² − z²)`, strictly narrower. No 3D corridor needed.
  - 🔑 **A mechanism is a better instruction than a target.** "A little forward" alone is a constant
    to guess; "as if the upper arm is relaxed" has an answer in it — derived, testable, and
    different per cast. Worth asking for the mechanism whenever a look note arrives.
- ✅ **The joined hands were tangent *spheres*, and the spheres are not what is drawn**
  (2026-08-18). Ryan: *"looks better — the hands could still be closer to actually touching."*
  [ADR-0026](adr/0026-a-hand-is-the-ellipsoid-that-is-drawn.md); journal
  *[the hands were tangent spheres](journal/2026-08-18-4-the-hands-were-tangent-spheres-that-are-not-drawn.md)*.
  - **They were touching, and that was the problem.** Centres exactly `0.110 + 0.070 = 0.180`
    apart, asserted by a test that passed. `handRadius` is the sphere a hand is *made from*;
    `Dancer` draws it scaled `[1,1,flattenZ]` and rotated, so Myco's hand is **0.110 across and
    0.025 thick** and its reach is a question per direction.
  - **The worst direction was the one in use:** the beau's forearm aims **77% forward** (the elbow
    swings back, ADR-0017), which turns his thin axis most of the way to vertical — 0.073 of rise,
    not 0.110. Drawn surfaces spanned 0.1385 of 0.1800. **Gap 0.0415.**
  - `handDrawnMap` (in `body-shapes`, beside `handRotations`, where the renderer's numbers live) +
    `handRiseAlongUp` (in `arm-pose`, still free of three). The frame change is the whole trick:
    `(aimX, −aimY, aimZ)`, because the group's rotation is the *minimal* one from `DOWN` to `aim`
    and running up back through its inverse cancels every trig term.
  - 🔑 **Each dancer puts their own palm on the plane, so neither needs the other's hand.** The
    stack is two independent local facts that agree, not a pair quantity — the sturdiest kind of
    agreement.
  - **Third fixed point of the week:** lift and aim are each other's inputs, so `settleTouch`
    iterates (≈×10 a pass, bounded at 16 — six passes left 3.4e-8 on the table). `poseArms`
    re-settles against the **live** placements, because the pair breathe.
  - 🔑 **The test asserted the implementation back to itself** — "the centres are `handRadius +
    handRadius` apart" is what the solve computes. The replacement asserts the **drawn palms land
    on the contact plane**: a statement about the world, which can fail for the reason we care
    about.
  - 🔴 **Accepted cost:** the pose solve now depends on cosmetic hand authoring (`flattenZ`, the
    hand's `rotation`) — an inversion of ADR-0024's line, and the opposite of what the dance does
    with `head.rotation`. Ryan chose it over the alternative (draw held hands as plain spheres):
    a hand is the thing that *holds*, so how it is drawn is load-bearing in a way a head tilt is
    not.
- ✅ **The free arm hung from the shoulder — every one of them an upper arm too high**
  (2026-08-18). Ryan: *"verify that the other forearm is set by the character customization — they
  seem really high."* Journal
  *[the free arm hung from the shoulder](journal/2026-08-18-3-the-free-arm-hung-from-the-shoulder.md)*.
  No ADR: it restores [ADR-0017](adr/0017-an-arm-is-two-segments-with-a-pinned-shoulder.md).
  - **Measured, default cast:** the beau's free elbow was drawn at **0.950** where his body puts
    it at 0.620; the belle's at **1.425** against 1.095. The tell that it is a bug and not a look
    — her free hand landed at 0.820, *above* the joined hands at 0.713.
  - **One line.** `proposeArms` wrote `target.y = m.restY` — the shoulder — into a field that names
    the **elbow**. A zero-length upper arm, so the drawn forearm hung off the shoulder itself. The
    elbow is now `elbowReach` down the swing, which is `restPose` exactly at zero rotation and
    ADR-0017's pinned shoulder away from it (an emote used to pivot the forearm about the
    shoulder *point*).
  - 🔑 **Two definitions of "a resting arm", and the wrong one was the live one.** `restPose` has
    always been right and is **unreachable from a dance floor**: `resolveExpression` always builds
    a proposal, even for `NEUTRAL_POSE`, so `poseArms`' fallback never runs. Worth looking for
    elsewhere — a correct function kept beside the path that actually executes.
  - 🔑 **Why 597 tests missed it.** The contact readout prints `upper arm` **only for a gripped
    hand**, so a free arm's 0.000 was never on screen — a pane's *filter* hiding a defect, the
    third time this week. And every arm test drives `poseArms` directly, which is the path that
    reaches the correct `restPose`; nothing tested the seam the dance uses. Both new tests go
    through `resolveExpression`.
  - Blast radius is `DanceFloor` alone — `resolveExpression` has one caller — so the character
    preview and the free-roaming player and NPCs are untouched.
- ✅ **The joined hands hang halfway between the two inside shoulders** (2026-08-18).
  [ADR-0025](adr/0025-the-joined-hands-hang-between-the-shoulders.md) supersedes ADR-0023; journal
  *[the hands move to the middle](journal/2026-08-18-2-the-hands-move-to-the-middle.md)*.
  - **What it was doing:** `lateral` was 0.210 toward the belle on the default cast, and that
    number is `width / 2 − belle.restX` — **her inside shoulder, exactly**. ADR-0022's rule did
    not put the hands near her shoulder as a side effect; it defined her share of the gap as zero
    and so put them *on* it. Ryan's "move to the middle" is the precise correction.
  - **The rule is now one line** — `(beau.restX - belle.restX) / 2` — and it deleted a `daylight`,
    a `beauSpan` and a `belleSpan`. It is **independent of the stance**, because both shoulders
    move with the width, and it is the one point where the two dancers reach the *same distance*
    across, so the old rule's shortage case cannot arise.
  - **Stance and height did not move on any cast.** default 1.140 / 0.713 (lateral 0.210 →
    **0.050**, both across 0.160, clear 0.146/0.190, reaches 55%/71%); `mixed` 1.070 / 0.670
    (lateral 0.175, both hands hang straight down, beau still at 100% for the reason ADR-0023
    recorded); `max` 1.640 / 0.903 (lateral 0.005, clear 0.171/0.105, reaches 68%/90%).
  - 🔑 **`max` is where the rule earns its place:** the hold used to be clamped *flush* against
    the belle's surface there (clear 0.276/**0.000**) — the preference walked it into her and
    ADR-0023's clamp caught it. It lands between the two bodies now and **the clamp binds on none
    of the three casts**. The bound is still there and still outranks the landmark — that is what
    Ryan's "the body / head disproportion might affect this" is — but it has stopped being what
    decides the pose on the bodies we ship.
  - **Equal distance is not equal effort**, and the panel says so now: the `across` figures should
    match, the percentages need not. On `max` the belle spends 90% against the beau's 68% for the
    same 0.115. The old rule bought him a lower number by *placing* the hold to manage effort;
    effort is a consequence now, and `touchReach` / `upperArmStrain` report it.
  - ⚠️ **The elbow watch's verdict is against the old placement** and is owed again — see the
    "Next" line above.
- ✅ **Four instrument defects, all found by using it, all fixed** (2026-08-18). Ryan: *"let's fix
  these."* Journal
  *[the instrument could not show its own hold](journal/2026-08-18-the-instrument-could-not-show-its-own-hold.md)*.
  **No ADR** — nothing here decides anything the ADRs have not decided already.
  - **The joint markers were dark for the touch hold.** `track.grip` came from square-one's motion
    grips and a standing couple's hold is not one, so every elbow and hand dot was hidden for the
    exact pose the elbow watch is about. `poseArms` already made this decision every frame and
    threw it away; it is now **`touchingSide(self, partner, hold)`** in `arm-pose.ts`, asked by the
    pose *and* by `DanceFloor` to fill a new `TrackedArms.touch`, so the markers cannot point at a
    hold the render did not draw. The markers read `grip ?? touch`.
    - **`touch` is not folded into `grip` on purpose.** A grip is eased, owned, and resolved
      against a forearm; a touch hold is written outright and leaves the outside arm alone.
      Merging them would blend the standing pose through `gripPose` — breaking the thing being
      watched in order to watch it.
    - The black pivot dot now shows for a standing couple too. It is the pair's **midpoint**, and
      the joined hands sit off it by `hold.lateral` *by design* (ADR-0022/0023); the panel's table
      says so now instead of promising a dot the hands are nailed to.
  - **The scene wrote a hash it could not read back.** `#dance=<call>` against a loader that
    matches on figure **id** — so `two-trades` rewrote to `#dance=partner-trade` and reloaded as
    Dosado. **`danceSceneHash` is now the inverse of `danceSceneFigure`**, living next to it, and
    `dance-route.test.ts` round-trips every figure. An inverse that lives away from its function is
    an inverse nobody notices has stopped being one.
  - 🆕 **A marker switched on while paused stayed dark** — found while verifying the first fix, and
    it defeated it in the order anyone would actually use the scene. Visibility was written only
    inside the frame callback, and **a paused floor runs no frame**; `go home` pauses, so the one
    control that produces a nameable pose guaranteed no pass was coming to paint the markers. The
    meshes are mounted unconditionally now and what the last pass found is kept in a `held` ref, so
    the toggle paints from it.
  - 🆕 **The readout said "hands free" about a couple holding hands** — `holding` counts engine
    grips. It now says *hands joined — a standing couple, no engine grip to track*. No invented
    numbers: `along` and `gap` measure a hand against a **forearm** and are genuinely unresolved
    for a hand-on-hand hold. **What that pane should print for a touch hold is still open.**
  - **The one to carry:** all four are the same shape — *a fact the render acts on that the
    instrument re-derives, or does not have at all.* Worth checking the remaining panes against it.
- **Panel state does not survive a reload** — tempo and joint markers are component state, so the
  scene comes up at 120 bpm with markers off however it was left. The **figure** does survive now.
  `go home` is the reliable way back to the standing pose; the 30 bpm crawl was only ever a way of
  catching it.

- 🔴 **"The band is empty" was measuring the midpoint, not handholding.** The joined hands had
  been pinned to the couple's centre since the day this was written, by nothing — the engine's
  `insideHands` says `couple.center`, which is body-agnostic for the same reason `COUPLE_WIDTH`
  is, and unlike the width nobody had asked the side that owns bodies for a better answer. Pin
  the hands there and *one* number (the shared height) has to absorb every difference between
  two bodies, so every mismatch becomes a clamp, and two clamps on one number make an empty
  band. `touchHold` returns three numbers instead: **stance, height, and how far off the
  midpoint**.
- **The hold is placed for the belle, and the beau reaches.** Ryan, watching the first version:
  *"the gent's job is to make the belle's job easier, even if she's taller … even if it looks
  awkward — maintain opinionation that way."* So the height is **her waist, full stop** (0.713
  here, clamped only where an arm physically cannot reach), and the hands sit under **her own
  inside shoulder** — her arm hangs to them, he covers all the daylight. Default cast: hold
  **0.210** toward the belle, she spends **69%** of her reach at 30° off vertical, he spends
  **68%** at **81°**, both at zero strain. On two *identical* bodies the hold is still off centre
  toward her, 91% him against 53% her.
- 🔴 **The change I made without being asked is the one that was wrong.** The first version took
  the *lower* of the two waists, reasoning that the taller dancer can drop their arm and the
  shorter cannot raise theirs — true, prettier (both forearms hang at 15°, both dancers at 94%),
  and answering a question nobody asked. **The beau's position is the one that accommodates;
  that is what taking that side means.** A geometric answer to a question about a role, and the
  nicer picture was the tell rather than the evidence. Same correction removed the equal-reach
  split: the last machinery in here solving for fairness instead of for the dance.
- **`TOUCH_COMFORT` is deleted and the stance is unchanged.** The comfort ceiling was the second
  clamp; without it an arm that has to hang straight hangs straight, which is what the taller
  dancer's arm does in every mismatched pair. Width is now `2 × (max shoulder + max hand radius)`
  = **1.140**, the same number, with the eyeballed `TOUCH_INBOARD = 0.11` replaced by the joined
  hands' own radius. So **the Trade's pass stays 0.342** and the clearance decision is untouched.
- **The elbow is closed at the source rather than counterweighted.** `touchPose` keeps the
  humerus in the plane of its own shoulder — nobody lifts an elbow sideways to hold a hand —
  which cuts the elbow's circle to two points and takes the one further back. **No constant
  appears in it.** Both of the default cast's arms stay in the plane; a straighter one (SPROUT
  reaching a tall belle's waist) needs its elbow clear of it and `reachPose` picks that up. The
  split is the inverse of how `ELBOW_SWING`/`ELBOW_BACK` were tuned, and the right way round —
  the straighter the arm, the smaller the elbow's circle and the less a preference can get wrong.
- 🔴 **Two measurement slips found, and they were the same slip.** Yesterday's "Myco 38% /
  Ember 79%" was measured to the **contact point**; each hand centre is half a hand off it, and
  to the hands that pose was 53%/72%. The same error then did real damage — splitting the
  daylight on the contact handed Sprout reach-across her 0.300 arm did not have and sent her
  hand 0.043 past the end of it. One definition now, `touchReach`, used by the tests *and* the
  panel.
- 🔴 **The beau's near-horizontal forearm is now a feature, and it will look exactly like the
  defect fixed twice this week.** The distinction is the *elbow*, not the forearm angle: the old
  defect was an elbow outboard of its own hand, which `touchPose` makes structurally impossible
  and a test asserts. Check the elbow before believing the forearm. `WAIST_OF_SHOULDER = 0.5`
  (its own doc says a legged figure wants ~0.73) is the one dial that would move the hold's
  height without touching the opinion.
- **The whole cast is asserted pairwise now**, both ways round: nobody's hand goes past the end
  of their arm and nobody stands inside anybody.

**▶ PREVIOUSLY (2026-08-16) — partner up, rebuilt from a body that is finally where it claims to
be. Superseded in part by the entry above; the torso fix and the stance stand.** Ryan: *"we
should finalize 'partner up' —
that look is a bit off — the stance could be a little farther apart and have the reach
accommodate the handhold better — the hands should be at the belle's waist height — let's
see if that fixes the arm angle."* **562 tests** (from 560), lint 0 errors, typecheck and
build clean. `pnpm dev`, `#dance=two-trades`, and look at the standing couple.

- 🔴 **First: a dancer's torso was drawn half a world unit low, and had been all along.**
  `Dancer.tsx` seated the body capsule at the rig origin while *every other height in the
  same component* — the shoulders the arms hang from, the head, the chest marker — came
  from `computePositions(shape, NPC_BODY_CENTER_Y)`. `Npc.tsx` has always placed the same
  capsule at that constant; the dance rig was written from scratch and the offset did not
  come with it. So heads and arms floated clear of their torsos, and Ember's body was
  mostly under the floor. **All 560 tests passed before and after the fix**, which is the
  tell: everything that *reasons* about a dancer (`armMetrics`, `silhouetteMetrics`,
  `rigidParts`, the frame scale) reads the constant and was right the whole time. Only the
  picture was wrong. Nothing but looking could have found it.
- **The stance is now computed here, not taken from the engine.** `coupleStandingWidth`
  sets it from the two dancers' shoulders: **1.140** world units, up from 0.868. That is
  square-one's own instruction being followed — its `COUPLE_WIDTH` doc says a third is the
  *body-agnostic default* and a consumer with bodies should compute this and pass it to
  `partnerUp`. The ADR-0004 seam, used rather than admired.
- **Why the arms looked wrong:** at 0.868 the couple was **narrower than Myco's own
  shoulders** (0.920 across), so each dancer's inside shoulder sat *over* the joined hands
  and both arms hung dead vertical. There was no handhold shape because there was no room
  for one.
- **The hands are carried at the belle's waist** (`waistY`, new in `body-shapes` — half
  the shoulder height, because a legless capsule's waist is its own middle). Was the mean
  of the two dancers' *hanging* hands, which landed at 0.375 — **below Ember's hanging
  hand** — so Ember came out **113% extended**, the undrawn upper arm stretching to reach
  a height beneath it.
- 🔴 **The belle's waist alone was not enough either, and the cast is why.** Shoulders at
  0.950 and 1.425 differ by more than the slack in either arm, so with Myco as the belle
  her waist is 0.973 from Ember's shoulder against an arm of 0.935 — over-extended again,
  by the same mechanism. `touchHeight` therefore takes the belle's waist as a **target**
  and raises it to whatever the shorter reach can manage. What two people of very
  different heights actually do.
- **Result, as numbers.** In the scene (belle = Ember) the hands land at 0.713, her waist
  exactly, no clamp needed: **Myco 38% extended at 25° inward, Ember 79% at 16°** — against
  83%/−3° and 113%/4° before. Reversed, the clamp lifts the hands from 0.475 to 0.562 and
  nobody exceeds 95%.
- **And it moved clearance for free:** a wider couple widens the Trade's pass in step, from
  **0.260 to 0.342** world units. Still short of the 0.710 needed — see the clearance
  decision in `work/square-dance-planning/PROGRESS.md` — but a third of the way there
  without touching the lane.
- 🔴 **Then Ryan, on the first look: *"see the beau's arm is pointing at the belle though?"***
  He was right and the cause was in the elbow solve, not the handhold. `reachPose` breaks the
  elbow's one degree of freedom with a preference of `(sign × ELBOW_SWING, −1, 0)` — "mostly
  down, a little out". That vector is then **projected onto the plane perpendicular to the
  shoulder→hand axis**, and a couple's joined hands put the hand nearly *below* the shoulder,
  so the axis is near-vertical, the elbow's circle is near-horizontal, and the `−1` is almost
  entirely parallel to the axis. Projection deletes it. What survived was "out", with a
  *positive* y residual: the beau's elbow landed at **x 0.790 against a joined hand at
  0.570** — the undrawn upper arm dead horizontal, the elbow outboard of the hand it was
  holding with.
- **`ELBOW_BACK` is the fix**, weighted by how folded the arm is. Backward is the one
  direction always perpendicular to a vertical axis, so it cannot be projected away; and a
  nearly straight arm has almost no circle to choose on, so the weighting makes this free for
  the fist bump (render-validated 2026-07-26, and its tests are unchanged). The beau's elbow
  now sits at **(0.565, 0.868, −0.302)** — above the hand, below the shoulder, behind the
  body. A real folded elbow.
- ✅ **CLOSED 2026-08-17 — and the diagnosis was wrong.** This bullet said the beau's arm stayed
  folded whatever the height, that with a comfort ceiling as well as a floor **the band is
  empty**, and that this pairing therefore could not hold hands naturally — a cast problem or a
  special arm rule. It was neither: the empty band came from holding the hands at the couple's
  *midpoint*, which left one number to absorb two bodies' worth of difference. See the entry at
  the top and [ADR-0022](adr/0022-a-couples-handhold-is-solved-for-the-pair.md). Kept here
  rather than deleted, because the shape of the mistake is the useful part: an arithmetic proof
  of impossibility is only as good as its unstated premises, and this one had three.

**▶ ALSO — the debug panel is docked, not floating (2026-08-16).** Ryan: *"let's doc the
panel to the left."* It sat `position: absolute` over the canvas, putting the controls on top
of the one thing they exist to let you look at. Now a flex row: a 320px column, its own
scroll, canvas taking the rest. Every control is also documented in `DanceDebugScene.tsx`'s
module doc — a table of what each dial is for — since this scene is the project's only
instrument for the defects tests cannot see, and an undocumented instrument gets used for
less than it can do.

**▶ WATCH THIS FIRST: Partner Trade lost its sway, and two beats with it (2026-08-16).** Ryan,
on `#dance=two-trades`: *"I'm wondering about the sway when just standing — it seems 2x too
wide and 2X too slow."* **The fix is entirely in square-one** — its `ADR-0013`
(`docs/adr/0013-the-trade-lane-rides-inside-the-arc.md`) and its fourteenth journal entry, both
in the sibling checkout. Unlinked because square-one has no public remote and this repo's docs
gate rejects a relative link that resolves outside the repo root — the same rule ADR-0012
follows. This repo changed one comment. **560 tests still pass**, lint 0 errors, typecheck
clean. **Watched and accepted** — Ryan: *"looks ok — a step in the right direction."*

- 🔴 **There is no idle animation in this repo, and that was the finding.** The sway was
  square-one emitting it: the Trade's own `slide` blocks, two beats of pure lateral translation
  at each call boundary with facing, depth and separation all constant. Worth remembering the
  next time something on the floor looks alive — if it moves and nothing here moves it, the
  engine means it.
- **What to look for now.** The figure is **8 beats, not 12** (Partner Trade is 4 per
  CALLERLAB, not 6), so the whole thing runs a third quicker. The couple should never translate
  without also turning; at the join between the two Trades they pass straight through their
  standing spots at full rotation rather than pausing there.
- **New thing to judge:** dancers now **crab up to ~19° (the belle; ~15° for the beau)** off the circle's tangent while bowing
  out to pass, because facing is solved from actual velocity rather than from the arc. That is
  correct — they are walking where they are pointed — but it is the part that has never been
  looked at, and the chest dot is where to judge it.
- 🔴 **The pass is still a collision and this did not change it.** At the default cast the two
  dancers cross **0.260** world units apart where the frame scale says they need **0.710**.
  Visible as interpenetrating bodies at the middle of every Trade. `TRADE_LANE` is a proportion
  of the couple's width with nothing about bodies in it — square-one's next ADR, most likely
  wanting a render watch of its own.
- **`TOUCH_TOLERANCE`'s docstring** was the one code change here: it described the Trade as
  stepping dancers onto lanes and back, which is no longer the mechanism. The tolerance itself
  is unchanged and still covers the bowed path.

**▶ S1 is wired in, and the couple holds hands (2026-08-15).** Ryan: *"they should hold
hands — we say touch hands — beau right palm up and belle's left palm down — making sure hands
in open position — so the characters need to be a bit closer together when partnered up."*
square-one narrowed the couple ("a bit" was a factor of three, measured against this repo's own
frame scale); this repo poses the hands. Narrative in
[the eighth journal entry](journal/2026-08-15-8-a-couple-holds-hands.md). **560 tests**.

- **Decided from the live placements, not a formation flag.** `standingAsCouple` asks whether
  these two are close enough and pointed the same way — the shape `reachAllowance` and
  `constrainArm` already use. A renderer that had to be *told* which formation it was drawing
  is one that could be told wrong; the heading check is what stops the pose firing on a
  Dosado's closest moment.
- **`touchHeight` is the mean of the two dancers' own hanging hands**, so nobody lifts
  anything — which is what makes touch hands a *resting* formation rather than a held pose.
- **Who is underneath is anatomical:** the dancer whose inside hand is their **right** is the
  beau, and the beau's palm is up. Phrased in body terms because square-one's characters face
  `+y` and townage's face `+z` — the two repos disagree about which way `+x` points, and a
  coordinate rule would not survive that.
- 🔴 **A units bug written and caught in the same pass:** `COUPLE_WIDTH` is an *engine* unit and
  every placement the arm layer sees is *world*. Comparing them directly would have joined no
  hands and **said nothing about why** — an absence, not a wrong number. Same class as the
  rig-frame defect ADR-0017 chased.
- 🔴 **Palm rotation is not implemented.** The hands stack by their radii, which reads as under
  and over, but the hand mesh orientation is static per side; a literal palm-up/palm-down needs
  a per-frame hand-orientation channel. Flagged rather than faked.

**▶ How to watch it (2026-08-15).** Planning ADR-0011's S1 — a **couple**
dancing a **sequence** — is reachable in the debug scene. `pnpm dev`, then:

| hash | what it dances |
|---|---|
| `#dance=two-trades` | 2× Partner Trade — a **zero** |
| `#dance=two-twirls` | 2× California Twirl — a **zero** |
| `#dance=trade-twirl` | Partner Trade then California Twirl — the confirmed **equivalence**, danced |

The three M4 calls are still there (`#dance`, `#dance=pass-thru`, `#dance=allemande-left`) and
all six are buttons in the panel.

🔴 **THE SQUARE-ONE LINK IS ACTIVE AND UNCOMMITTED.** `package.json` still pins
`v0.2.0`; `node_modules/square-one` is a symlink to the local checkout, which is where every
S1 API lives (`partnerUp`, `applyCallToCouple`, `danceCoupleSequence`, `flattenSequence`).
Planning ADR-0006 allows this for co-development and names it a **known footgun**: work can
pass locally against a link and fail from a clean install. **A fresh `pnpm install` will
silently revert to v0.2.0 and the sequence figures will stop building.** Finishing the loop
means tagging square-one, pushing it, and bumping the pin — the same sequence the 2026-07-28
release entry describes.

- **`useDancePerformance` gained a `sequence` option.** When set, the pair is a **couple** and
  the calls are danced in order. Different *formation*, not different length: a facing pair
  points opposite ways and a couple points the same way, which is why square-one composes each
  side of a couple from its own chain rather than deriving one dancer from the other.
- **`DanceFloor` needed no change at all** — it already spreads `...performanceOptions` into
  the hook, so the new option arrived for free. Worth noting as a seam that held.
- **`dance-route` now serves `DebugFigure`s** rather than bare call names, since a figure is
  either one call by a pair or a sequence by a couple.
- **Verified through the real stepper** before handing over: all three sequences run to `done`
  and end on the couple's own starting spots — `a(−0.50, 0)@90 b(0.50, 0)@90` — so all three
  are zeros, the mixed one included.

**What to watch.** The two zeros should return the pair to their exact starting spots, and the
mixed figure should too *while looking different on the way*. 🔴 California Twirl's intermediate
path is marked **provisional until rendered** in its spec — `moves.md` says the beau "stays in
place or steps through", which is loose, and the rigid-rotation reading is the one consistent
with the end state. `dosado.md` carried the same marker before its watch caught two defects.

---

**ADR-0018 is narrowed, and superseded (2026-08-15, seventh pass).** Ryan, reading back over
the day: *"does this mean if another player character chooses my player character off the
wheel, say, to fist bump me, I can't decline?"* Reading the code rather than ADR-0018's
summary of itself: **partly**. `availability` does consult the receiver's preferences and
refuses with `"muted-by-b"` — but that is a **standing** preference. There is no
offer/response anywhere, so a second player could pre-mute a category and still not decline
*that* bump while `playerBodyDriven` walked and turned their avatar for ~1.25s.
[ADR-0021](adr/0021-being-moved-needs-a-live-yes.md) supersedes
[ADR-0018](adr/0018-a-contact-move-may-bring-the-pair-into-position.md). Narrative in
[the seventh journal entry](journal/2026-08-15-7-a-note-is-not-a-guard.md). 552 tests, gates
green. **Nothing shipping changes.**

- 🔴 **The lesson: a promotion condition is a note, and a note is not a guard.** I had written
  this exact gap into ADR-0018 myself. The reasoning was sound for the shipping arrangement
  and unsound one line past it, with nothing in the code marking where the line was.
- **`ConsentMode` on `ComfortPreferences`** — `"standing"` (all there is; an NPC cannot be
  asked) or `"live"` (can be asked, and must be for anything that moves them). `availability`
  refuses with `"needs-live-consent"` when a move approaches and the **receiver** is live.
  Receiver alone: choosing is the chooser's live answer.
- **The line is at being *moved*, not *touched*** — `approach: "none"` writes nobody's
  placement, so ADR-0016's standing preferences still govern there.
- **Required field, and `OPEN_TO_EVERYTHING` is now `"live"`**, so the default fails toward
  refusing. Adding it broke four test fixtures and no production code.
- **The corner analysis Ryan asked for**, recorded in the ADR: the fail-open default
  (guarded); 🔴 **ownership has no owner** — `playerBodyDriven` is a boolean, so with two
  people two claims cannot be told apart, and retrofitting an owner id touches every driver
  (named, not fixed, unreachable while the guard holds); and ✅ **the corner we are not in** —
  `approachTarget` is pure and returns targets rather than applying them, which is exactly
  what a networked client needs. ADR-0016 made the geometry pure for editor/runtime parity and
  bought the multiplayer seam by accident.
- 🔴 **The guard is unexercised in render** — nothing sets a live receiver. Not a seam, by this
  repo's rule. It is a refusal, so it fails toward refusing too much, which is the right
  direction for the one control between a stranger and your avatar.

---

**✅ WATCHED AND ACCEPTED (2026-08-15).** Ryan, at the end of the day's five passes: *"ok that
looks good, and the allemande left looks good."* Everything below this line was built today and
carried a 🔴 unwatched flag; it no longer does. Read this section first if you are picking the
repo back up — the rest of it is the day's narrative, newest first.

**What the watch confirmed, item by item:**

- ✅ **The fist bump, end to end.** The approach walks the pair in, the twist turns the working
  shoulder toward the partner and unwinds as the hand comes away, and the fists meet head on
  with straight wrists at shoulder height. ADR-0018, 0019 and 0020 are render-validated.
- ✅ **The dance floor's grip is unchanged, and this is the load-bearing one.** ADR-0017's watch
  list said a Dosado or an Allemande that looked different would be a rig-split bug rather than
  a design change — the split was meant to be *the same pixels by construction*. **The Allemande
  Left looks right**, so the two-group rig, the elbow-naming of `ArmPose`, and every call site
  that had to be converted are confirmed against the one render that was already validated back
  on 2026-07-27. That is the strongest single result of the day: a five-file rig change with no
  visible effect where it was supposed to have none.
- ✅ **Reach is comfortable now.** It rose three times over the day (0.917 → 1.427 → 1.605) and
  the last word is that the staging distance reads right. `APPROACH_FRACTION` stays the dial.
- ✅ **Being moved by a gesture reads acceptably.** The first thing in the game that moves the
  player without them steering, and it was not raised again after the pass that introduced it.

**What the watch did *not* exercise, stated plainly:**

- 🔴 **`aim: "natural"` — and therefore `reachPose`, `ELBOW_SWING`, and the whole two-bone
  solve — is shipped and unexercised.** Nothing authored uses it: the built-in bump is
  `"along-axis"`, and it is the only contact move that exists. It is tested and typechecked,
  and by this repo's own standing rule *an unexercised seam is not a seam*. ADR-0020 carries the
  promotion condition; the honest reading today is that its render is unverified, not that it
  works. The first move that wants a bent arm — a hand on a shoulder, a palm on a back — is
  what will actually check it.
- 🔴 **The approach ignores obstacles** and an NPC mid-walk freezes rather than pausing. Neither
  came up, because neither was set up.
- 🔴 **`gripHeight`'s unequal-pair rule** is untouched and still open (step 3 of the dancer-size
  brief). `mean-shoulder` sidestepped it for the bump rather than answering it.

**Next:** the queue behind this is the `externallyDriven` player seam — implemented in
square-one, declared in `useDancePerformance.ts` and never called, so the player has never been
in a square — then teaching `arm-turn`. Both predate today.

---

**The fists meet like a punch now (2026-08-15, fifth pass) — 🔴 unwatched.** Ryan: *"in life,
the forearm lines up like a punch to punch fists with a straight wrist — these are coming in at
a real angle."*
[ADR-0020](adr/0020-the-forearm-aims-along-the-contact-axis.md). Narrative in
[the fifth journal entry](journal/2026-08-15-5-a-punch-that-stops.md). 545 tests, gates green.

- **The angle was the solve working, not failing.** `reachPose` pins the elbow one *rigid*
  upper arm from the shoulder, so both ends of the forearm are fixed and its direction is
  whatever that demands. "Always plausibly attached" and "straight wrist" are competing goals,
  and ADR-0017 chose the first this morning without noticing it was choosing.
- 🔴 **It also retires an answer given too quickly.** Asked whether the upper arm was
  restricted, I measured *maximum reach*, found `handReach = upper + forearm` used in full, and
  said no. True, and a narrower question than the one asked — the rigid upper arm was not
  capping reach, it was dictating the forearm's angle. The failure mode worth naming: picking
  the reading of a question that a measurement already to hand can settle.
- **The aim is authored** (`aim: "along-axis" | "natural"` on the constraint, editor control,
  absent means along-axis). `punchPose` is `gripPose` with radius = the hand's own and
  separation 0 — exactly what `bumpPose` was before this morning; `bumpPose` survives as
  `"natural"`.
- **And the height moved with it, because they are one decision.** A level forearm is only
  attached if the shoulder can reach down to it. At `mean-elbow` the player's elbow lands
  *inside their own torso* and the undrawn link needs 0.443 against a natural 0.220; at
  `mean-shoulder` it needs 0.232. Reach rises 1.427 → 1.605 as a side effect.

  | rule | player strain | NPC strain | max separation |
  |---|---|---|---|
  | mean-elbow | **0.223** | 0.084 | 1.427 |
  | mean-shoulder | **0.012** | 0.062 | 1.605 |

- 🔴 **`upperArmStrain` is nonzero by design now**, where ADR-0017 introduced it as a quantity
  that should read zero. Still the right instrument — it now measures how well the authored
  height suits the authored aim, which is the coupling ADR-0020 exists to name.
- **The handedness guard has now been rewritten by three consecutive ADRs** — invisible in the
  pose, then visible, now visible one level down at `elbowLocal`. It is tracking *where the
  handedness fact lives*, and the fact keeps moving. Worth restating the reason each time,
  because the version that goes wrong is rewriting it to match whatever the code does.

**Add to the watch list:** contact has moved up to shoulder height, which is a visible change to
where a bump happens. And reach has risen for the third time today — if it now reads as *too*
far apart, `APPROACH_FRACTION` is the dial rather than any of the geometry.

---

**The twist now unwinds too (2026-08-15, fourth pass) — 🔴 unwatched.** Ryan on the twist:
*"looks pretty good but the npc falls back to facing and the player character stays twisted."*
Two symptoms, **one defect**, and the asymmetry is the tell — the driver held the staged
placement to its last frame and dropped it, and afterwards each component resumed a different
behaviour. The NPC has one (`lookAt(player)` while hovered) so it **snapped** square; the player
has none, so the yaw the driver left behind just **stayed**. The half that looked right was
right by accident. Narrative in
[the fourth journal entry](journal/2026-08-15-4-the-twist-outlived-the-contact.md).

- **Squaring up is part of the gesture.** The twist now unwinds across the **withdraw**, on the
  same beat the arm returns to rest, so it costs no extra time in charge of the player.
- `squareUp` is extracted from `approachTarget`, which already held this logic for turning them
  *in* — so the heading they return to is by construction the one they were turned away from,
  for either stance. The driver stages a `settle` beside `to`: same positions, twist removed.
  You square up; you do not walk back.
- **Through extend and hold the unwind parameter is a flat 0**, which writes the staged
  placement exactly. `easePlacement` at 0 is the identity, so replacing the old snap with an
  ease changed nothing inside the contact window — the grip's rule is intact.
- By release both are already square, so the NPC's `lookAt` is a no-op. A test asserts the
  settled NPC yaw *equals* `facingYaw` toward the player, which is the "nothing left to snap"
  property stated as an equality rather than hoped for.
- 🔴 **Correcting [ADR-0019](adr/0019-a-move-may-turn-a-body-past-facing-so-the-shoulder-leads.md),
  which is accepted and immutable:** its Consequences say a twisted pair "are no longer square
  to each other … the main thing to watch", which is true during the gesture and quietly implies
  the state persists. It should have said the twist is **spent and returned within** the gesture,
  and named the release point as the thing to get right. The decision is unaffected.

544 tests (from 539), gates green.

---

**The body twists now (2026-08-15, third pass) — 🔴 unwatched.** Ryan watched the nudge and
sent a screenshot of two characters almost torso to torso: *"we need the body to twist — that
reach is too limited — in a real life fist bump there is a turn towards a person sometimes …
also maybe the upper arm is restricted so it can't reach out?"*
[ADR-0019](adr/0019-a-move-may-turn-a-body-past-facing-so-the-shoulder-leads.md). Narrative in
[the third journal entry](journal/2026-08-15-3-the-lateral-cost-was-a-choice.md). 539 tests
(from 526), gates green.

- **It is not the upper arm, and measuring said so.** `handReach` is exactly `upper + forearm`
  (player: 0.220 + 0.325 = 0.545) and `reachPose` straightens all the way. What eats the arm is
  the two terms `axialReach` subtracts: the **rise** to the contact height (0.380) and the
  **lateral offset** (0.250), leaving 0.300 to travel.
- **Turning inverts the lateral term's sign, which is the whole decision.** A pair facing each
  other bump with the arm on the far side from the hand it meets, so each spends reach crossing
  their own midline. Turn `t` toward the partner and the shoulder swings to `restX·cos t`
  across and `restX·sin t` **along** — the cost shrinks and the shoulder starts closer.

  | | square on | 20° | 35° | 90° | old flat limit |
  |---|---|---|---|---|---|
  | max separation | 0.917 | 1.198 | **1.427** | 1.909 | 1.215 |

  At 35° the pair reach further apart than the flat `handReach + handReach` that preceded any of
  this — which is what makes twisting a **fix** rather than a partial walk-back of ADR-0017.
- **A budget, not a pose.** `twistFor` gives the smallest twist that reaches and **zero when
  they can reach squarely**, so a close-up bump still reads square-on. The solve is the law of
  cosines, not a search, and a test pins it as the exact inverse of `axialReach`.
- **Twist is derived from placements, never plumbed** (`twistOf`). A pair angled toward each
  other reach further whether an approach turned them or the player just stopped at an angle —
  the same "make the wrong thing inexpressible" move as ADR-0017's rig split.
- **A defect in yesterday's code, one day old:** `offerReach` passed a single twist to a
  `maxSeparation` that had just become per-side, so the second character was measured square-on
  and the radius came out 0.27 short. Caught by the test pinning the offer radius to the staging
  arithmetic — the same check that caught the step-budget overshoot. **When two numbers are one
  promise seen from opposite ends, assert them against each other, not each against a
  constant.**
- **Staged separation goes from about 0.73 to about 1.14** (combined body radii 0.45), and the
  offer radius to about 2.64.

**Add to the watch list:** a twisted pair are no longer square to each other, which is new on
screen; 35° was chosen by arithmetic, not by eye, and the slider is in the editor. And 🔴 **the
rise is now the biggest single term and is still a placeholder** — the player spends 0.38 of a
0.545 arm getting down to the contact height, because `gripHeight` means two elbows and the
player's rig stands 0.25 higher. That is step 3 of the dancer-size brief, and the likeliest
reason a bump reads as an arm *dangling toward* rather than *reaching out*.

---

**The bump now brings you into position (2026-08-15, after the watch) — 🔴 also unwatched.**
Ryan watched the arm work below and reported the bump *"requires way too close of a
position — I thought we talked about nudging"*. Both halves right, and they are two problems.
[ADR-0018](adr/0018-a-contact-move-may-bring-the-pair-into-position.md): a move carries an
`approach`, and **being chosen off the wheel is the consent to be moved**. Narrative in
[the second journal entry](journal/2026-08-15-2-the-nudge-that-was-decided-and-never-built.md).
526 tests (from 507), lint 0 errors, typecheck and build clean.

- **The reach really did get shorter, and honestly so.** Measured: player↔Ryan went **1.215 →
  0.917**. The player's arm is 0.545 long and spends **0.38 climbing down** to the mean-elbow
  contact height and **0.25 crossing its own midline**, leaving 0.300 to travel. The climb is
  `gripHeight`'s known unequal-pair placeholder surfacing as a *reach* cost — the player's rig
  sits 0.25 higher than an NPC's — and it is still open.
- **The fix is positioning, not geometry.** Loosening `axialReach` would buy comfort by making
  the number lie again. `outOfRange: "reach"` was the other tempting wrong answer: already
  implemented, and it reproduces the original floating-arms screenshot.
- **Auto-positioning had been item 2 of the next-action list since 2026-07-30** — Ryan's, and
  deferred pending an offer/response handshake for "accepted by both parties". **That blocker
  dissolves for the case that exists:** the handshake is needed when both participants are
  players; today one is an NPC whose consent is already `ComfortPreferences`, and the player's
  is the wheel press.
- **What it does.** `approach: "none" | "turn" | "turn-and-step"`, optional and defaulted
  through `approachOf` so stored moves do not silently gain the power to move people.
  `availability` asks a move that approaches a *weaker* question — facing dropped entirely,
  distance widened to `offerReach` — while **consent is not relaxed**. For the default pairing
  the offer radius goes **0.92 → ~2.2** and facing stops mattering.
- **Placement is now an owned channel**, `playerBodyDriven` / `npcBodyDriven`, the same
  contract `drivenArms` has one level down.
- **One defect the tests caught, and it was mine:** `offerReach` started as
  `maxSeparation + APPROACH_STEP`, which overshoots the promised budget by the width of the
  comfortable margin, because the approach stages the pair at 0.8 of reach. Measured from the
  staged separation now, with a test that walks the offer range and asserts nobody is asked to
  move further than `APPROACH_STEP` in total.

**Add to the watch list:** this is the first thing in the game that **moves the player without
them steering** — input is ignored for the whole gesture (~1.25s), not just the step, because
handing the controls back when the fists meet lets you walk out of a contact you are still in.
Whether that feels right is the question. Also: the approach ignores obstacles (bounded at 1.5
units, so a pair can be stepped through scenery), and an NPC mid-walk freezes rather than
pausing gracefully.

---

**The shoulder decision is taken and built (2026-08-15) — and it is 🔴 unwatched.**
[ADR-0017](adr/0017-an-arm-is-two-segments-with-a-pinned-shoulder.md): an arm is **two
segments** — a pinned shoulder, a free elbow, and an undrawn compliant link between them.
Narrative in [the journal](journal/2026-08-15-the-shoulder-was-never-there.md). 507 tests
(from 477), lint 0 errors, typecheck and build clean.

- **What the −0.34 actually was.** `bumpPose` placed the arm group's origin `handRadius +
  handReach` back from the contact point while the body stands `separation × contactFraction`
  back from it. Those agree at one separation and nowhere else, so the whole arm slid along
  the axis to make up the difference — at half reach the forearm's near end sat inside the
  torso. All three measured offsets fall out of one formula; there was nothing to tune.
- **The third option Ryan chose.** The old framing had two ways out (the height gives, or the
  fists interpenetrate) because a *one-segment* arm leaves direction as the only free
  parameter. The arm groups draw a forearm and a hand and nothing between shoulder and elbow,
  so a nested group makes the elbow free and turns it into two-bone IK. **ADR-0016's authored
  vertical rule stays authoritative** — that is the point of picking this one.
- **The rig split is the load-bearing half.** The solve alone would render correctly through
  the old single group, because `origin = elbow − elbowReach · aim` encodes any elbow. That
  was rejected on purpose: it leaves the shoulder as a value that happens to come out right.
  The outer shoulder group now carries **no ref**, so a driver cannot move a shoulder at all.
  Same reasoning as the `CHANNELS` record and the `ResolvedExpression` shape — make the defect
  inexpressible, don't remember not to write it.
- **The generalisable lesson, and it is a fourth variant of this repo's running theme:** *a
  quantity that nothing draws and nothing measures is not a quantity the model has.* The
  earlier three were about tests missing what the code did; this one is about the model not
  having the concept. `arm-pose.ts` had said since M4 that it "does not model reach or
  attachment" — written as a modest concession to caricature anatomy, and read by the code as
  a licence to put a shoulder at the partner's feet.
- **Two tests now assert the opposite of what they did**, both because the property genuinely
  inverted. "aims both arms horizontally" is gone — a horizontal forearm was what forcing the
  arm along the contact axis produced, and forcing it is what dragged the shoulder off the
  body; what replaces it is that the arm is *attached* at every reach. And "does not move the
  contact point — which is why this hides" asserted that handedness made no difference to the
  pose, which was true and was exactly how "it was driving the left arm" stayed invisible.
- 🔴 **Reach is measurably shorter, and this is the first thing to watch.** The old
  `maxSeparation` was `handReach + handReach`, ignoring both the climb to the contact height
  and the reach across the body's own midline; `restX` runs to 0.46 on the wider bodies. Some
  pairs that used to be offered a bump will now be told to move closer. If it feels fussy the
  answer is a torso-twist allowance in `axialReach`, not the old flattering number.
- **New instrument:** `TrackedArms.upperArm` per side per frame, printed min → max in the
  dance debug overlay. A grip *should* breathe there (it is pinned to the pair's pivot and the
  bodies breathe); a reach should not.

**Next: watch it, then auto-positioning.** The watch list is below under
[What to watch](#what-to-watch-2026-08-15). Item 2 of the old next-action list —
auto-positioning, and its own ADR — is untouched and now first in the queue behind the watch.

### What to watch (2026-08-15)

1. **The bump at close range.** The forearm's near end should be outside the torso at every
   distance the wheel offers, and the elbow should read as bent rather than as an arm shoved
   backwards. This is the defect the ADR exists for.
2. **The fists still meet at the authored height**, and meet each other — the height rule is
   supposed to be untouched, so anything that moved is a regression rather than a trade.
3. **Does the wheel now say "too far away" too often?** The reach correction is real and
   deliberate; whether it is *comfortable* is a judgement only a watch can make.
4. **The elbow's swing direction.** `ELBOW_SWING` is 0.6, tuned by eye and by arithmetic
   rather than by watching. Elbows should go out and down; if they read as sticking out too
   far, that constant is the dial.
5. **The dance floor's grip is meant to look identical.** `gripPose` is unchanged in what it
   draws — same pixels, by construction — so a Dosado or an Allemande that looks different is
   a rig-split bug, not a design change.



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

**Where this stands right now (2026-07-28) — read this first if you are picking the repo
back up.**

- **Committed:** everything through the **arm envelope, the expression layer, and the
  watch that verified them** — `107479f` (dance + player), on top of `028541e` (arm
  channel) and `b9b4fe3` (journal). 266 tests, lint 0 errors, typecheck and build clean.
  See the journal entries for
  [2026-07-27](journal/2026-07-27-the-arm-envelope-and-the-emote-experiment.md) and
  [2026-07-28](journal/2026-07-28-the-buttons-were-lying.md).
- **The debug scene now actually works (2026-07-28).** The first attempt at the watch found
  three defects in the instrument, none in the arbitration: the emote buttons were looping
  toggles that queued (so a second press did nothing, forever); `spin` used only the
  channel `DanceFloor` deliberately drops, so passing and being unwired looked identical;
  and the head sphere and its facing marker were siblings, so a head turn rotated a
  featureless ball. All three fixed — one-shot emotes fired with `interrupt`, `spin` now
  also turns the head and sweeps the arms, and the head is one pivoting group.
- **Uncommitted and *unverified*:** `package.json` and `pnpm-workspace.yaml` carry the
  bumped square-one pin. square-one is tagged `v0.2.0` **locally and not pushed**, so
  nothing has installed from the pin — see [Consuming square-one](#consuming-square-one)
  for the exact finishing sequence. The link override is still active and must not be
  committed.
- **ADR-0010 is written and accepted (2026-07-28)** —
  [the emote/choreography channel contract](adr/0010-emote-choreography-channel-contract.md),
  the last thing M4 owed. Written *after* the render was watched, on purpose.
- **The `limited` silhouette channels are enforced (2026-07-28)** —
  `src/dance/silhouette-limit.ts`, pure and tested, called once per dancer per frame.
  A dancer may inflate by their **share of the live slack** (the room between what the
  pair needs at rest and what they have this frame, split by body radius) — the arm
  envelope's model, deliberately, because it is the same problem. Zero cost when there is
  room; shrinking is never limited. 19 new tests, 285 total.
  - **Correcting the ADR, which cannot be edited:** its Consequences say these channels
    were "applied unclipped". For *dancers* they were not applied **at all** — `Dancer`
    built geometry at mount and `DanceFloor` never wrote a scale, so they were silently
    behaving as `owned`. True only of `bodyLeanZ`, and of the player (out of scope). The
    decision is unaffected; see
    [the journal entry](journal/2026-07-28-3-enforcing-the-limited-channels.md).
  **Watched and verified** (Ryan, 2026-07-28) via the **puff up** emote: the squeeze reads
  as a breath, not a stutter. So the hard clamp holds for a second channel — no easing, no
  proximity ramp. **Every channel ADR-0010 names is now classified, implemented, and
  verified on screen.**
- **The arbitration is consolidated (2026-07-28)** — `src/dance/expression-channels.ts` is
  now the one place ADR-0010's contract is *decided*; `arm-pose.ts` and
  `silhouette-limit.ts` remain the mechanisms. The ADR's fail-safe rule is structural
  rather than remembered: `CHANNELS` is `Record<keyof ResolvedPose, Channel>`, so a new
  channel breaks the build until classified, and `ResolvedExpression` has **no field for an
  owned channel**, so a spin has nowhere to arrive from. Behaviour unchanged — the 285
  pre-existing tests pass untouched. **M4's ADR work is closed.**
  - Found while proving that safeguard fires: **the typecheck gate had not been running at
    all.** See the boxed warning under [Tests](#-typechecking-tsc--b-never-tsc---noemit).
- **The square-one release is finished (2026-07-28, `1976f7f`)** — tag pushed, pin resolved
  from the tarball for the first time, link override out, all gates re-run against a real
  install. The working tree is **clean**: nothing is uncommitted and nothing here behaves
  differently from a fresh clone.
- **CI on GitHub was red, and is now green (2026-07-29).** Pushed as `8d06012` + `a501c5e`;
  run `30486706020` passes every job, `osv-scan` included — its log reads `Loaded filter
  from: /github/workspace/osv-scanner.toml` … `No issues found`. **This is also the first
  time the M4 arc has ever run in Actions**: the push carried 13 commits, and CI tests the
  resulting tree rather than each commit, so what is verified is today's `main`. Two causes,
  both invisible locally, both now caught locally:
  - **`osv-scan`** had failed on every run since `fb6f4d2` (2026-07-26) because
    `osv-scanner.toml` was deleted; `auditConfig` in `pnpm-workspace.yaml` only ever
    governed `pnpm audit`. Restored, with the reasoning duplicated on purpose and each
    file pointing at the other. Verified by running the scanner's own container against a
    clean export — see [Two scanners is not duplication](#two-scanners-is-not-duplication).
  - **`docs hygiene`** failed on links like `../../work/square-dance-planning/…` that
    resolve only on a machine with sibling checkouts. `scripts/docs-hygiene.py` now rejects
    any link escaping the repo root *before* testing existence, so it fails here too and
    not only in a fresh clone. Eight such links fixed in this repo — the planning effort
    has no public remote, so those are now unlinked inline code; the two square-one
    cross-references became GitHub URLs.
  - ~~**`main` is 11 commits ahead of `origin/main`.**~~ **Pushed 2026-07-29.** `main` and
    `origin/main` agree, and the local container run of osv-scanner matched CI's log line for
    line (468 packages, one advisory filtered) — which is the evidence that the local check
    now stands in for the remote one.
- **Controls decided (2026-07-29) —
  [ADR-0014](adr/0014-radial-wheel-for-emotes-and-taught-moves.md) and
  [ADR-0013](adr/0013-pointer-events-with-capture-for-new-pointer-input.md).** A held pointer on
  an NPC opens a radial wheel of emotes / greetings / moves, marking-menu style so a flick
  selects without waiting for it; its items *are* the taught things, so learning something is
  what puts it there. Input is Pointer Events with capture per `SliderRow.tsx`, branching on
  `e.pointerType` — which also fixes a latent hybrid-device bug in the
  `"ontouchstart" in window` pattern. Nothing built yet; it's M5 scope because the wheel is how
  the fist bump gets initiated.
- ~~**The player's head fix is unwatched.**~~ **Closed 2026-07-29** — watched, found wrong,
  fixed, and watched again. See the 2026-07-28 entry below for what it was.
- **The fist bump was watched (2026-07-30), and it turned the work toward an editor.**
  `FistBumpDriver` is committed and wired to the wheel; Ryan watched it and sent two
  screenshots. **Far apart and facing away:** the forearms and hands *detach* and float in the
  gap. **Close together:** the fists do not read as meeting, and read as sitting at different
  heights. Rather than tune the constants again, the response is to make the move **authored**
  — [ADR-0016](adr/0016-contact-moves-are-authored-constraints-not-keyframes.md).
  - **The detachment is not a defect, and this is the reframe that matters.**
    [`arm-pose.ts`](../src/dance/arm-pose.ts) already says it "does not model reach or
    attachment," written as a concession to caricatures with no upper arms. Ryan's reading is
    that it is an *affordance* — these are avatars, and the arc wants a fist lobbed across the
    floor and dancers trading heads. So the wrong thing about the floating arms is that
    **nothing authored the detachment**. An unhandled case and a deliberate absurdity look
    identical on screen and are opposites in the model.
- **The first cut is built (2026-07-30) and is 🔴 unwatched.** ADR-0016's schema, resolver,
  editor and predicate all landed — 470 tests (from 421), lint 0 errors, typecheck and build
  clean. Full narrative in
  [the second journal entry](journal/2026-07-30-2-the-fists-were-never-in-the-same-frame.md).
  - **`src/dance/contact-move.ts`** is the schema and the resolver. `resolveRole` is what both
    the editor and `FistBumpDriver` call — the property ADR-0016 turns on — and a test asserts
    the authored fist bump produces the same pose the hardcoded one did.
  - **The wheel wedge greys out with a reason on it** ("too far away", "face them") instead of
    vanishing. Closes the unwired `canBump` the M5 handover flagged.
  - **`ContactMoveBuilderModal` + `ContactMovePreview`**, reachable from the body editor's row
    of tools. Storage in `services/contact-moves.ts`, registered in `backup.ts`, deliberately
    **not** keyed by character.
  - 🔴 Gated and unimplemented, by design: `attach: "free"` and `exit: "transfer"` (the lobbed
    fist, the traded head) resolve as `rigid`/`return`; `"lean"` behaves as `"reach"`; one
    constraint per move is read though the schema holds a list.
- **Three defects the build turned up, all now fixed, none of which a green suite had caught.**
  - 🔴 **The height defect was misdiagnosed this morning, including in ADR-0016's
    Consequences** — which is accepted and immutable, so the correction is in the journal.
    It is **not** `gripHeight`'s unequal-pair placeholder. `elbowY` is measured in each
    character's own group and the two groups sit at different world heights (`Player` at
    `BASE_Y` 0.75, `Npc` at 0), so `gripHeight` averaged across frames and both sides wrote the
    result as a *local* Y — putting the fists exactly 0.75 apart **between identical bodies**.
    `armMetrics` now takes `rigOriginY`, `gripHeight` answers in world, `localHeight` names the
    conversion. The placeholder is still open and still unfixed.
  - **`handRadius` was always the open hand**, so a fist bump was solved at the wrong size —
    and `Npc.tsx`/`Player.tsx` *drew* the open hand too, so it would also have looked wrong
    after the maths was fixed. Both now carry the authored pose.
  - **Two opposite arm-side conventions live in this repo**: `Dancer.tsx` puts the right arm at
    `-forearmX`, `Player.tsx` and `Npc.tsx` at `+forearmX`. Nothing had ever posed both from
    one code path. `RigHandedness` is now declared by the caller.
- **It was watched (2026-07-30), and found two more defects — both now fixed.** 477 tests,
  lint 0 errors, build clean. Narrative in
  [the third journal entry](journal/2026-07-30-3-the-watch-two-defects-and-a-naming-bug.md).
  - ✅ **The predicate works.** The wedge greys out and states its reason, both for facing
    away and for too far apart. The first screenshot is now unreachable.
  - **The arm was inside out.** `gripPose` reads `dir` as pointing toward the *partner*;
    `bumpPose` handed it the direction toward *self*, mirroring the arm about the contact
    point. The shoulder was placed at the partner's feet (origin z +0.75 to +1.02, should be
    ≈0) with the aim reversed. It passed every test in the file because they all measure the
    **hand**, which was correct — the hand is the fixed point of that mirror. Fixed by
    negating both the direction and the radius; new tests measure origin and aim.
  - **It was driving the left arm.** 🔴 **This corrects the "two opposite conventions"
    finding in the previous entry** — it is a *naming bug*, not a convention, and the earlier
    write-up legitimised it. Yaw 0 faces +z, so the anatomical right hand is at −x.
    `Dancer.tsx` is correct; `Player.tsx`, `Npc.tsx` and `Eyes.tsx` all name their **+x** side
    "right", which is the character's left. The naming is **left alone on purpose** — it is
    self-consistent with `CharacterPreview`, so every authored emote's "R arm" already means
    the +x arm and renaming would mirror existing content. `World` maps around it instead.
- **Next action: 🔴 a decision, then auto-positioning.**
  1. ~~**The shoulder still slides back** at bump range~~ — **decided and built 2026-08-15,
     see the top of this file.** Ryan took a third option the framing below had missed: the
     arm becomes **two segments** ([ADR-0017](adr/0017-an-arm-is-two-segments-with-a-pinned-shoulder.md)),
     so the authored vertical rule survives intact and ADR-0016 is not superseded. The
     original write-up is kept because its diagnosis was exact and its framing is instructive:
     origin z −0.34 / −0.21 / −0.07 at half / ¾ / full reach, where it should be ≈0.
     `arm-pose` places the arm relative to the **contact point**, not the shoulder, and its
     "the undrawn upper arm takes up the difference" bet goes *negative* at bump range. Also
     `maxSeparation` ignores the two hand radii, so "full reach" is short by `handRadius`
     (fixed, along with two larger omissions). **With a rigid arm pinned at a real shoulder
     the only free parameter is direction** — true, and the word doing the work is *rigid*.
  2. ~~**Auto-positioning**~~ — **built 2026-08-15 as
     [ADR-0018](adr/0018-a-contact-move-may-bring-the-pair-into-position.md), see the top of
     this file.** The original note, which was right and is what got built:
     (Ryan, 2026-07-30): a move may bring both bodies into position when
     accepted by both parties. Fits the schema as
     `approach: "none" | "turn" | "turn-and-step"`, and answers the question `facingYaw` has
     been parked on since M5. Wants **its own ADR**: it splits the availability predicate
     ("could they get there" vs "are they there"), and "accepted by both parties" needs an
     offer/response handshake that does not exist yet.
  - Two smaller M4 leftovers still owed: an ADR extending ADR-0008's react-hooks exception to
    `src/dance/**` (owed since the M4 handover, and `src/dance/` has grown a lot since), and
    sending `docs-hygiene.py`'s escape guard upstream to the template.
- **The player's head is fixed too (2026-07-28).** `Player.tsx` had the same split head as
  `Dancer` did, so an emote's head turn did not turn the *player's* face either. It now has
  the same single `headGroupRef` holding the sphere and the eyes, with position, rotation
  and scale written once to the shared pivot; `Eyes` is unchanged and its other three call
  sites are untouched. Two latent bugs went with it — the eyes never scaled with
  `headRadiusDelta`, and never tracked `bodyHeightDelta`, so an emote that inflated or
  stretched a character would have separated the face from the head.
  **Watched 2026-07-29 — and it was wrong.** The fix put the eyes inside the head group, which
  is right, but the group also carried `animShape.head.rotation`, and `mergeAnimation` defines
  that as `shape.head.rotation + headDeltaRotation`. `PLAYER_DEFAULTS`' base is
  **`[-180, -91, -93]`**, so the player's face sat 91° round the side of their head. That field
  had only ever been applied to a bare sphere, where it is invisible unless the head is
  low-segment and faceted, so its stored values were tuned as decoration and mean nothing about
  facing — moving the eyes into a group carrying it turned harmless junk data into a visible
  defect. **The group now carries the emote's head turn only; the base stays on the sphere
  mesh**, which is the split [`Dancer.tsx`](../src/dance/Dancer.tsx) already had. `Npc.tsx` was
  never affected: its `<Eyes>` is still a sibling of the rotated mesh.
  - **The lesson, and it is the reason that claim stayed open for a day:** a fix that is
    reasoned, typechecked and green is still a claim. This one was all three and still put a
    face on the side of a head.

**What just happened (2026-07-27):** the tuck became an **envelope**, and dancers gained an
expression layer so the ADR-0010 arbitration could be *watched* rather than argued.

- **`reachAllowance` + `constrainArm`** replace the tuck. Each dancer may reach toward
  their partner as far as their proportional share of the live gap; any arm pose — resting
  or mid-emote — folds by however much its furthest point trespasses. The two allowances
  sum to the separation, so arms can touch and cannot overlap; and at the closest permitted
  distance a share resolves to exactly the dancer's own body radius, which *is* the old
  fixed tuck. `tuckPose`, `tuckNearness`, `tuckExposure` and the `tuckX` metric are gone.
- **A grip is a placement, a fold is a limit** — the distinction Ryan drew, and the
  load-bearing half of the coming ADR. A gripped hand is owned outright; every other arm
  keeps playing whatever the emote wants, folded only where it trespasses.
- **`Dancer` + `DanceFloor` take an expression layer** (`controllers`): arms as a proposal,
  head/lean/bob applied straight through, and `bodyDeltaRotY` **dropped** — a spin emote
  may not turn a dancer in a square.
- **Allemande Left's CCW turn is verified** (Ryan, 2026-07-27) — the watch list's
  highest-risk item, now render-validated.

**What happened before that (2026-07-26):** the **arm channel** and its **contact
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
and `scripts/docs-hygiene.py` are in, and all nine gates pass (the ninth, `osv-scan`, only
truly since 2026-07-29 — see [How CI landed](#how-ci-landed)). Getting there took more than
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

**Where it runs: Vercel, as `townage.app`, deployed by Vercel's Git integration on push to
`main`.** Not GitHub Pages, and not by GitHub Actions — CI going green says the gates passed,
not that the site shipped. The `deploy to Pages` job is the template's opt-in Pages path with
`vars.DEPLOY_PAGES` unset, so it is **skipped by design**; it renders as a slashed circle that
looks like a failure and is not one. Enabling it would stand up a second deployment of the same
app, which is the arrangement [ADR-0005](adr/0005-games-launch-by-url-hash-handoff.md)
deliberately does not have. `ANTHROPIC_API_KEY` and the Vercel KV binding are project settings,
not repo state. Recorded here 2026-08-15 after the skipped job was misread as a stopped
build — the fact was implied by `api/` and by ADR-0005's aside, and stated plainly nowhere.

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

**Tests: 295 pass** (21 files), as of 2026-07-28. The two `fetch-pending-results` failures
that stood here were fixed on 2026-07-25 (worklist item 1); the rest of the growth is M4's
`src/dance/` — frame, body clearance, the arm channel, and the ADR-0010 expression
channels (`expression-channels.ts`, `silhouette-limit.ts`).

### ⚠ Typechecking: `tsc -b`, never `tsc --noEmit`

`tsconfig.json` is **solution-style** — `"files": []` plus references to `tsconfig.app.json`
and `tsconfig.node.json`. So `tsc --noEmit` against it typechecks **nothing at all** and
exits 0, which looks exactly like success. `npm run build` (`tsc -b && vite build`) is the
real gate; `npx tsc -b --force` is the standalone one. Running `vite build` on its own does
**not** typecheck either — esbuild strips types without reading them.

Found 2026-07-28, after several sessions of reporting "typecheck clean" from the vacuous
command. Nothing was actually broken — `tsc -b --force` passes on the whole tree — but the
gate had not been run.

**CI was never affected.** `.github/workflows/ci.yml`'s *ts fast gates* job runs
`pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm build` is `tsc -b && vite build`. The hole
was in hand-run commands only. The safest local habit is simply to run what CI runs.

Note: `pnpm test` used to refuse to run behind pnpm's build-verification gate
(`ERR_PNPM_IGNORED_BUILDS` on `esbuild`). It runs fine as of the 2026-07-28 reinstall.
`CI=true pnpm test` forces a single run rather than watch mode.

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

1. ~~**Allemande Left's turn direction.**~~ **VERIFIED 2026-07-27** — Ryan watched it: the
   turn is counterclockwise viewed from above, each dancer's left side toward the pivot.
   This was the list's highest-risk item (the column had been wrong once in square-one's spec
   and corrected on 2026-07-25, with nothing but a render able to confirm the correction), so
   the correction is now render-validated rather than argued. Judged off the **facing
   marker**, not the arms — the arm posed is the one nearest the pivot by construction, so it
   cannot disagree with the engine either way.
2. **The forearm grip itself** (new 2026-07-26, third pass — and the overlay now gives you
   numbers, so this one need not be judged by eye). Expect both left forearms **horizontal,
   antiparallel, side by side**, level with each other, holding through the turn and
   releasing half a beat before the step-out. Read the **contact panel** under the beat
   clock, which prints **min → max since the grip engaged**: only `separation` should have a
   spread. For the default cast everything else should be flat — `a hand↔pivot 0.191`,
   `a along 0.400`, `a gap −0.082`, `b along 0.000`, `b gap −0.000`: Ember's hand exactly at
   Myco's elbow, Myco's hand 40% up Ember's longer forearm, both gaps ≤ 0 (negative is a
   hold; a hand wrapping a forearm overlaps it). **Any spread outside `separation` is the
   defect**, and a positive `gap` is a hand not holding. The **joint markers** checkbox says
   the same thing visually — red hands and blue elbows should look nailed to the black pivot
   dot while the bodies swing past. Off by default: a debugging aid, not part of the dance.
3. **The grip holds steady; the bodies breathe around it.** This is the *model*, confirmed
   by Ryan, not a compromise: the join is rigid — pinned to the pivot at a fixed radius,
   only rotating — and **the undrawn upper arm is the compliant link** that takes up the
   pair's 0.46-unit separation pulse, exactly as a real one would. So the visible gap
   between a torso and its own forearm opens and closes; the forearms themselves never
   stretch, squash, or drift off the pivot. Asserted **twice**: on the pose (*"holds steady
   and only rotates while the bodies breathe around it"*) and on the driver's own frame loop
   (*"driven frame by frame"*) — because the first version checked only the pose, and the
   render slid anyway.
3b. ~~**The emote experiment**~~ — **WATCHED AND FULLY VERIFIED 2026-07-28.** Three
   buttons — **wide arms**, **spin**, **look around** — fire on both dancers at once,
   mid-call, through a real `AnimationController`. Each aims at one channel of the
   pending ADR-0010 contract. What Ryan saw:
   - ~~**wide arms**~~ → **VERIFIED.** The arms swing freely and draw in during the
     pass, and — the part no test could answer — **the fold reads as intent, not as a
     glitch.** So the envelope stays a hard clamp; the proximity easing contemplated as
     a fallback is **not needed** and should not be built.
   - ~~**spin**~~ → **VERIFIED**, in two passes. Head turns all the way round and the
     arms sweep the full circle; **the body stays straight.** The first pass could not
     answer the body question at all, and the reason is worth keeping: the dancer's only
     facing indicator was the head marker, and spin now owns the head, so there was
     nothing left to read body facing off. The **chest facing marker** was added to close
     that, then resized when it turned out to scale away on thin bodies. `bodyDeltaRotY`
     is confirmed dropped for a driven dancer — on the screen, not just in the code.
   - ~~**look around**~~ → **VERIFIED.** Plays untouched, including mid-grip. The
     control behaves as a control.

   **The head/body facing split is a finding, not just a fix.** Once an emote can turn a
   head, "which way is this dancer facing" is two questions with two answers, and the
   debug scene now has a marker for each: head dot = where they are looking (emote-owned),
   chest dot = where they are facing (choreography-owned). ADR-0010 should name them as
   separate channels rather than treating "facing" as one thing.
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
`~/Development/work/square-dance-planning/briefs/dancer-size-and-accessibility.md`**
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

**✅ The release is finished (2026-07-28, `1976f7f`).** square-one's `v0.2.0` tag is pushed
(Ryan), the pin resolved for the first time, and the link override is out. Verified against
the resolved tarball rather than the sibling checkout: `node_modules/square-one` points at
`.pnpm/square-one@https+++codeload.github.com+…+660fe33`, the remote tag dereferences to that
same commit, and the `allowBuilds` key did its job — pnpm ran square-one's `prepare`
(`tsc -p tsconfig.build.json`) on install, which is the whole reason that key exists.

Gates from that real install: `tsc -b` clean, eslint 0 errors, 295 tests, `vite build` clean,
audit 1 high ignored. `package.json` and `pnpm-workspace.yaml` are now the repo's real
dependency state rather than work in progress.

**The sequence, for the next bump.** Tag and **push** square-one first — pnpm cannot resolve
a tag that isn't on the remote, so a local tag leaves the pin unverifiable. Then bump the pin
*and* the `allowBuilds` sha (two lines), remove any link override, `pnpm install`, re-run the
gates, and commit `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` **together** —
they only mean anything as a set. **Never commit the link.** While it is in place the pin is
inert and every green gate here proves nothing about a fresh clone: ADR-0006's footgun,
green-against-link and red-against-pin. This release sat half-done for a day for exactly that
reason, and the three files were held back through six commits of M4 work to keep it honest.

## Teaching content is ours

*Decided 2026-07-29 by the planning effort's **ADR-0008**
(`square-dance-planning/adr/0008-teaching-content-is-townage-data-engine-stays-pure.md`) —
cross-repo, so it lives there. Nothing is built yet; this section records the seam so M5 can
start cold.*

**This repo owns** which NPC teaches what, unlock ordering, difficulty, lesson prose and voice,
whether a performance counts, and the record that a player knows something. **square-one gains
no teaching metadata at all** and is never told anything is being taught.

- **Follow the existing pattern, don't invent a second one.** `src/config/game-knowledge.ts` +
  `src/config/npcs.ts` already do exactly this for King's Cooking and Spaces Game: a canonical
  subject list, per-subject knowledge as prose in skill tiers, and
  `getGameKnowledge(npcId, skillLevel)` dispatching on NPC config. Teaching a gesture is the
  same kind of object. The learned-record side follows `npc-records.ts` /
  `npc-kings-chess-records.ts` under [ADR-0007](adr/0007-localstorage-with-a-versioned-backup-file.md).
- **Prerequisite ordering is *derived*, not annotated.** A call's block chain already states
  what must be known first, so read it out of composition rather than asking square-one for a
  prerequisite field. Difficulty and tiering are ours, because they are tuning judgments about
  this game rather than facts about square dance.
- **A taught thing is a tagged union**, so non-engine gestures have a home:
  `{ kind: "block", block, params }` for choreography square-one drives, and
  `{ kind: "gesture", gesture }` for townage-native two-body gestures. One progression orders
  both, since ordering is ours.

**The fist bump is why the union exists.** It is *not* an emote — `Emote`/`ResolvedPose` in
`src/services/emotes.ts` is single-character by construction, every field one body's own
rig-local pose, with no partner reference and no world space — and it is *not* a square-one
block, having no travel and not being square dance. But `src/dance/arm-pose.ts` already holds
the machinery it needs: a general two-body contact vocabulary (`gripHeight(a, b)`,
`contactRadius(a, b)`, `contactSeparation(a, b)`, `reachAllowance(me, them, separation)`,
`PERSONAL_SPACE`) built for the Allemande grip. Authored two-body contact gestures are the
piece that does not exist yet, and the fist bump is their first user.

### M5 order: the fist bump comes first

*Planning **ADR-0009** (Ryan, 2026-07-29) —
`square-dance-planning/adr/0009-fist-bump-proves-player-contact-before-the-square.md`. It
corrects a sequencing observation in ADR-0008, whose own decision is unaffected.*

**Lead with a player↔NPC fist bump.** Teaching `arm-turn` first bundles two unknowns into one
milestone — whether the player can make contact with another character at all, and whether the
player can occupy a slot in an engine-driven square. The fist bump isolates the first and drops
the second: no engine, no square, no beat clock. It is the **de-risking step** for the
player-in-a-square problem rather than a detour from it.

Nearly everything it needs is already here:

- **`src/dance/arm-pose.ts` is driver-agnostic by design** — "the driver hands over floor
  positions and headings and eases its rig toward what comes back", and its only import is
  `services/body-shapes`. Two characters with positions and headings satisfy it.
- **`src/world/World.tsx` already computes player↔NPC distance every frame**, with
  `NPC_APPROACH_DIST` / `NPC_WALK_AWAY_DIST` and an approached-and-standing-still detector that
  fires a callback. That is the trigger.
- **`src/world/Player.tsx` already renders an arbitrary `ArmPose`.**
- **`services/body-shapes.ts` sizes both**, so reach and clearance across mismatched bodies are
  computable today.

**The new work is the gesture itself, and don't over-read the reuse:** `gripPose` is the
*forearm* grip — two horizontal antiparallel forearms, each hand at the other's elbow. A fist
bump is hand-to-hand and needs its own pose function. Reusable are `ArmMetrics`,
`contactSeparation`, `reachAllowance` and `PERSONAL_SPACE`. Two contact kinds in one module is
also the point to review that module's shape; it was written for one.

**Watch it before believing it.** Contact has been wrong by eye three times in this repo while
tests stayed green — the sliding grip most recently. Reuse the contact panel's min → max
instrumentation rather than judging by camera angle.

**The radial wheel is M5 scope too**, because it is *how* the player initiates the fist bump —
[ADR-0014](adr/0014-radial-wheel-for-emotes-and-taught-moves.md). Held pointer on an NPC opens a
circle of emotes / greetings / moves; release at centre or outside cancels. Marking-menu model
(Kurtenbach 1993): the wheel is shown after the hold, and a directional flick selects without
waiting, so novice and expert use one gesture. **Its items are taught things** — planning
ADR-0008's union — so learning something is what puts it on the wheel, and filtering by "what's
possible with this NPC right now" keeps the list under the ~8-item practical ceiling without
submenus.

Two things that constrain the build:

- 🔴 **`VirtualJoystick` occupies the natural gesture area** (`position: fixed; bottom: 40;
  left: 40`, 120 px, `zIndex: 5`), which is why the wheel opens *on a character* rather than
  anywhere on screen.
- **Input follows [ADR-0013](adr/0013-pointer-events-with-capture-for-new-pointer-input.md)** —
  Pointer Events with `setPointerCapture`, per `SliderRow.tsx`, branching hold duration on
  `e.pointerType` (~500 ms for touch, immediate for a right-click) rather than on the
  `"ontouchstart" in window` boolean, which is wrong on hybrid devices.

`EmotePanel` stays as the browse-everything surface, and its existing digit bindings (1–9, 0)
become the wheel's keyboard path and expert shortcut — worth extracting rather than copying.

### Built so far: the wheel is live on the main NPC (2026-07-29)

Following M4's pattern — pure module and tests first, driver second, watch third. **91 new
tests, 386 total**, lint 0 errors (no new warnings), build clean.

**✅ Watched and working (Ryan, 2026-07-29).** `pnpm dev`, walk up to Ryan-the-NPC, and **hold**
on him (or right-click). The wheel opens at the press point with the player's own emotes; drag
to a wedge and release to play it, or release in the centre to cancel. A short **tap** still
opens chat, untouched.

**The watch found four defects, and no test would have caught any of them.** Worth listing,
because three were invisible to the suite by construction and the fourth was legible in a
screenshot before anyone described it:

1. **iOS answered the hold with its own long-press.** Safari put up the selection loupe and a
   Copy / Look Up / Translate bar instead of the wheel. `-webkit-touch-callout: none` was on the
   *wheel*, which does not exist until the hold completes — the hold happens on the **canvas**.
   Moved there, scoped so DOM text stays selectable.
2. **The hold's click fell through to chat.** A click always follows `pointerdown` +
   `pointerup` on the same target, so the NPC opened chat behind the wheel on a selection *and*
   on a cancel. `useWheelGesture` now exposes `consumeClick()`, which `App` checks before
   delegating to `handleNpcClick`.
3. **A one-item wheel drew a stray line, not a ring.** With a single wedge the bounds run −π to
   +π and the endpoints coincide, so the annulus-sector path degenerates. A full circle is now
   its own path. This would have fixed itself on the second emote — the kind of defect that
   hides for months.
4. **Nothing opened at all with no emotes saved**, which is indistinguishable from a broken
   gesture. An empty wheel now opens with one disabled "no emotes yet" wedge.

**Not in the wheel yet: the fist bump.** Deliberately — it has no driver, and a wedge that
selects and does nothing is exactly the `spin` channel's failure, which passed its test for a
week by being unwired. It joins when it can actually run.

- **[`src/dance/fist-bump.ts`](../src/dance/fist-bump.ts)** (31 tests). Contact geometry and a
  seconds-based envelope (extend 0.25 / hold 0.35 / withdraw 0.3). No square-one import, no
  beat clock — ADR-0009's "touches no engine" holds literally.
  - **ADR-0014's cost estimate was wrong, in our favour.** It predicted a new pose function
    because `gripPose` is the *forearm* grip. But `gripPose` is parameterised by `radius` and
    `separation` and places everything from the pivot, so a fist bump is the same function with
    `radius` = the character's own `handRadius` and `separation` = 0. Asymmetric hands then fall
    out correctly: hand centres end up exactly `a.handRadius + b.handRadius` apart, which is
    what touching means. Asserted across every pair in the cast.
  - **The contact point splits the gap by *reach*, not body radius** — deliberately unlike
    `reachAllowance`. Sharing a lane is a question about torsos; meeting in the middle is a
    question about arms. The consequence is that the dancer-size brief's rule *falls out*: the
    longer-armed character covers more of the distance, so a child and an adult meet close to
    the child. `gripHeight` is still the shared placeholder for height.
  - The hold is written exactly rather than eased, on the sliding-grip lesson: easing *through*
    a contact window is how a defect looks right and measures wrong.
- **[`src/overlay/wheel-geometry.ts`](../src/overlay/wheel-geometry.ts)** (19 tests). Wedge 0
  straight up, clockwise, so digits 1–9/0 map in reading order. Dead zone cancels; selection is
  unbounded outward.
- **[`src/overlay/useWheelGesture.ts`](../src/overlay/useWheelGesture.ts)** (21 tests). The
  ADR-0013 piece: Pointer Events with capture on the pressed element, `pointerId` filtering so a
  second finger is ignored, `pointercancel` resetting, and `contextmenu` suppressed so a
  right-click drag is possible. Hold defaults to 500 ms (Android's long-press timeout and iOS's
  `minimumPressDuration`) and is a prop, per ADR-0015's adjustable-hold requirement.
  - **A short tap deliberately does nothing here**, so an NPC's existing tap-to-chat still
    works. Only a hold opens the wheel — the wheel coexists with the current tap meaning rather
    than taking it.
  - ~~🔴 **The non-dragging path is not wired.**~~ **Done 2026-07-29** — see `WheelButton`
    below. Tapping the NPC was spoken for by chat, so the opener is a button instead.
- **[`src/overlay/InteractionWheel.tsx`](../src/overlay/InteractionWheel.tsx)** (17 tests). SVG
  annulus sectors, active wedge highlighted, digit hints, disabled wedges greyed and out of the
  tab order. In `drag` mode it is `pointerEvents: none` decoration — the opener owns the
  gesture, and a wedge that also handled clicks would fire twice. In `sticky` mode each wedge is
  a real button answering click, Enter and Space.

**ADR-0014 was contradictory, and [ADR-0015](adr/0015-radial-wheel-dead-zone-cancels-selection-unbounded.md)
supersedes it.** Found by implementing it, within the hour of accepting it: ADR-0014 said cancel
"at the centre **or outside the ring**" while also requiring a marking menu's directional flick,
and **a flick goes outside the ring** — so the expert gesture would always have cancelled, and
only for the users who had learned the directions. ADR-0015 resolves it in favour of the flick:
the dead zone cancels, selection is unbounded outward, and aborting means coming *back* to the
dead zone (which still satisfies WCAG 2.5.2). Everything else in ADR-0014 carried forward
unchanged. **The ring is now purely visual** — a drag beyond the artwork still selects, and that
is not a bug to fix.

**How it is wired.** `App` owns one `useWheelGesture` (only one wheel can be open at a time) and
renders `InteractionWheel` in the DOM overlay; the handlers are threaded `App → World → Npc` and
spread onto the NPC's existing hitbox mesh, next to its `onClick`.

- **The event type is structural for this reason.** The thing pressed is a **mesh**, so R3F's
  `ThreeEvent` arrives rather than a DOM event — same pointer fields, but capture lives on
  `target` instead of `currentTarget`. `WheelPointerEvent` names only what is used and
  `capturePointer` takes whichever handle offers the method, so one hook serves a DOM button and
  a 3D character.
- **`showKeyHints` asks the gesture, not the device.** The wheel records the `pointerType` that
  opened it, so hints show for a right-click and not for a thumb — ADR-0013's per-interaction
  argument applied to rendering, and the reason this did not become a fifth
  `"ontouchstart" in window` check.

- **[`src/overlay/WheelButton.tsx`](../src/overlay/WheelButton.tsx)** (6 tests). ADR-0015's
  **non-dragging path**, and the accommodation a long press most needs: WCAG **2.5.7** (AA) and
  **2.5.1** (A) both require a single-pointer alternative to hold-and-flick, and a fixed
  long-press is the part of this design most hostile to tremor. Third in the button row
  (pocket 40, emotes 104, this 168), opening the wheel in `sticky` mode — it stays up with no
  pointer held and a wedge is chosen by tapping it.
  - **Centred on the viewport, not on the button.** The wheel is ~240 px across, so a corner
    anchor would put half its wedges off-screen — and the flick that would forgive that is
    exactly what this path exists to avoid needing.
  - **Renders on every device, unlike its neighbours.** `PocketButton` and the emote button
    hide behind `"ontouchstart" in window`, which is fine for a convenience control and wrong
    for this one: a mouse user who cannot hold a button down needs it as much as a thumb does.
    A real `<button>`, so Enter and Space work for free.
  - Key hints now show unless the wheel was opened **by touch**, so the sticky path — the one a
    keyboard user reaches for — shows the digits.

**Still to build, in order:**

1. **Drive both characters' arms through a bump.** The real integration: `Player.tsx` and
   `Npc.tsx` each own their rig and read `AnimationController` independently, so something has
   to hold the shared bump state and hand each of them a world-space arm pose for its duration.
   This is the piece with no precedent — `DanceFloor` does it for dancers, but the player has
   never been on either side of a contact.
2. **Add the fist-bump wedge**, once step 1 makes it do something. `canBump` from
   `fist-bump.ts` greys it out when the player is too far to reach.
3. **Watch it.** Contact has been wrong by eye three times here with green tests behind it.
4. **Anchor the sticky wheel to a chosen NPC.** It is viewport-centred today, which is fine
   while every wedge is a player emote. The moment the wheel carries NPC-specific items — the
   fist bump — the sticky path needs to know *who*, or it becomes a second-class route to a
   subset of the wheel, which is precisely what 2.5.7 forbids.

🔴 **Still true, just deferred: `externallyDriven` has never run.** It is the seam by which the
player participates in a square instead of being driven by the engine. square-one implements it
(`src/stepper.ts`) and property-tests it (`test/properties.test.ts:330`); this repo declares it
at [`useDancePerformance.ts:32`](../src/dance/useDancePerformance.ts) and passes it through to
`createPerformance` — **and no caller has ever supplied it.** All of M4's contact machinery was
validated dancer↔dancer inside `DanceFloor`, with the player out of scope by
[ADR-0010](adr/0010-emote-choreography-channel-contract.md). This is the same shape as the
inert pin above, the `spin` channel that passed its test by doing nothing, and `osv-scan`
running for three days without ever passing: **an unexercised seam is not a seam.** ADR-0009
defers it; it does not answer it. It stays the gate in front of `arm-turn`.

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
  bundle.
- **The same ignore is also in [`osv-scanner.toml`](../osv-scanner.toml), and has to be**
  (restored 2026-07-29). `auditConfig` governs `pnpm audit` only; the `osv-scan` CI job runs
  osv-scanner with `fail-on-vuln: true`, and osv-scanner reads its own config. Two scanners,
  two formats, one posture — each file points at the other. **Correcting this section's
  earlier claim:** it said `osv-scanner.toml` was deleted so there would be "one ignore, in
  one place, with a true reason." The reason was true and the consolidation was not
  available — it deleted the config the OSV job actually reads, and that job went red on
  every run from `fb6f4d2` (2026-07-26) until 2026-07-29. See
  [Two scanners is not duplication](#two-scanners-is-not-duplication).

### What the first attempt got wrong

Worth keeping, because it was confidently documented and still false. The comments asserted a
72-hour quarantine was blocking the fix. pnpm's actual default is 1440 minutes, the fix
cleared it on 2026-07-24, and the timed ignores were waiting for a deadline that had already
passed. The sibling repo `square-one` had the mirror-image bug — an age gate written into
`.npmrc`, where pnpm never read it, so it had no gate at all while believing it had a 7-day
one. Both were fixed together; see square-one's ADR-0011.

**The lesson both repos paid for: a supply-chain control you have not verified is not a
control.** `pnpm config get minimumReleaseAge` is one command.

### Two scanners is not duplication

*2026-07-29. The second half of the same lesson, and it cost three days of red CI.*

The 2026-07-25 CI work had already learned the right thing and written it down — "osv-scanner
reads its own config file, not pnpm's. Two ignores for one advisory, in two tools, over two
databases" ([journal](journal/2026-07-25-ci-half.md)). Later the same day, fixing the false
quarantine reasoning, `osv-scanner.toml` was deleted in `fb6f4d2` on the principle that one
advisory deserves one ignore in one place. That principle is good and did not apply: the two
files are not two records of one decision, they are configuration for two different programs.
Only `pnpm audit` reads `auditConfig`.

The cost was invisible because of *where* it failed. `pnpm audit --audit-level=high` kept
reporting `1 high (1 ignored)` locally, so the local signal said the posture was configured.
The OSV job is a reusable workflow that can't be exercised from a checkout, so nobody saw it
disagree. the-lot's `osv-scan` went red on every run after `fb6f4d2`; square-one, which never
had an `osv-scanner.toml` at all, has failed `osv-scan` on **every run in its history**.

**That "can't be exercised locally" claim was itself wrong, and that's the durable lesson.**
The reusable workflow can't run locally, but the *scanner* can, and it is what decides the
job. Reproduced before fixing and verified after, against a clean `git archive` export so
`node_modules` couldn't change the answer:

```
docker run --rm -v "$PWD:/src" -w /src ghcr.io/google/osv-scanner:v2.3.8 -r ./
```

Before: exit 1, the brace-expansion finding. After: `Loaded filter from: /src/osv-scanner.toml`,
`No issues found`, exit 0. **A gate you believe is unrunnable locally is worth ten minutes of
trying anyway** — the container the job pulls is usually just a container.

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

**Both ADRs this section expected are now written.** The emote/choreography blend contract
became [ADR-0010](adr/0010-emote-choreography-channel-contract.md) (2026-07-28). Teaching
content was decided **2026-07-29** in the planning effort's **ADR-0008**
(`square-dance-planning/adr/0008-teaching-content-is-townage-data-engine-stays-pure.md`) —
cross-repo, so it lives there per that effort's ADR-0007. See
[Teaching content is ours](#teaching-content-is-ours) below for what this repo now owns.

## How CI landed

*Replaces the handover section that stood here. All eight gates pass locally and in Actions:
`install --frozen-lockfile`, `lint`, `test`, `build`, `audit --audit-level=high`,
`audit signatures`, the license allowlist, and `docs-hygiene`.*

*Corrected 2026-07-29: there is a **ninth** gate, `osv-scan`, and it was red from `fb6f4d2`
until 2026-07-29 while this section said all gates passed. It is counted, runnable locally,
and green as of the `osv-scanner.toml` restore — see
[Two scanners is not duplication](#two-scanners-is-not-duplication).*

**The handover's measurements were exact** — 61 lint errors, 25 warnings, ~26 of them
`react-hooks/*`, `docs-hygiene.py` already clean, `ci.yml`'s `detect` job self-skipping the
Rust half. All verified before acting on them.

**What it missed, all in the supply-chain job it hadn't run:**

- `pnpm audit --audit-level=high` found **27 vulnerabilities (15 high, 1 critical)** — every
  one a devDependency. `pnpm update` within existing semver ranges cleared 26.
- The 27th, `brace-expansion` (GHSA-mh99-v99m-4gvg), was first handled as a timed ignore in
  `pnpm-workspace.yaml` **and** `osv-scanner.toml` — two entries because `pnpm audit` and the
  OSV scan are different tools over different databases, something only the real CI run
  revealed — and correctly so; the `osv-scanner.toml` half was later deleted on a
  consolidation that did not hold, and is back. **Both were wrong and have been replaced
  (2026-07-25, later).** The stated reason
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
2. **M4: `src/dance/`** — frame, driver, `<DanceFloor>`, the arm channel. Built and mostly
   watched. What's left, in order:
   1. **Watch the emote experiment** (M4 list item 3b) — the one thing blocking the ADR.
   2. ~~**Write ADR-0010**, the emote/choreography blend contract~~ — **done 2026-07-28**,
      [`0010-emote-choreography-channel-contract.md`](adr/0010-emote-choreography-channel-contract.md).
      Three channel kinds — **owned** (dropped), **limited** (clipped by trespass),
      **free** (untouched) — with the full per-channel table in the ADR, which is the
      authority; don't re-summarise it here, it has already drifted once.

      The two things the writing itself changed, both worth knowing without opening it:
      - **Body facing and head facing are separate channels with different owners.** The
        choreography owns the body; the emote owns the head. "Facing is owned" would
        forbid a dancer glancing at their partner.
      - **"Lean is free" was wrong.** `rigidParts` counts `sin(|leanZ|) · height/2` as
        lateral reach, so a *sideways* lean is silhouette and is `limited`. Only the
        forward/back lean is free. That produced the ADR's actual load-bearing rule: **a
        channel is `limited` exactly when it feeds `rigidParts`** — derivable rather than
        a matter of taste, and it settled the silhouette deltas as a side effect.

      The player's case is deliberately **out of scope**; see the planning effort's
      `square-dance-planning/briefs/breakdown-is-the-feature.md`.
   3. ~~**Finish the release**~~ — **done 2026-07-28** (`1976f7f`). Tag pushed, pin
      resolved from the tarball, link dropped, gates re-run against a real install.
   4. **An ADR extending ADR-0008's react-hooks exception to `src/dance/**`** — still owed
      from the original M4 handover.
   5. ~~**The silhouette hole**~~ — **closed 2026-07-28**, `src/dance/silhouette-limit.ts`.
      Named as a `limited` channel by ADR-0010, then enforced: a dancer may inflate by
      their share of the live slack, on the arm envelope's model. Watchable at `#dance`
      via the **puff up** emote. The enforcement found that the channels were not
      "applied unclipped" as the ADR describes but not applied to dancers at all — see
      [the journal entry](journal/2026-07-28-3-enforcing-the-limited-channels.md).
3. **Adopt `eslint-plugin-react-hooks` 7.1.1** (pinned at exact `7.0.1` today, per
   [ADR-0008](adr/0008-react-hooks-rules-excepted-at-the-ref-boundary.md)). Needs 6
   `set-state-in-effect` and 2 `preserve-manual-memoization` fixes in the game-return handler,
   the assembly-cutscene step machine, `World`, and `VirtualJoystick` — all behaviour-critical,
   so do it with the app running, not blind.
4. ~~Drop the `brace-expansion` ignores on/after 2026-07-26~~ — **done 2026-07-25**, and the
   premise was wrong. See [Supply chain](#supply-chain): the patch had already cleared the
   real (1-day) gate, and a **scoped** override carries the 5.x line. The ignore remains for
   a different and truthful reason — no patched version is compatible with `minimatch@3`'s
   API — and lives in **both** `pnpm-workspace.yaml` and `osv-scanner.toml`, one per scanner
   (the 2026-07-25 deletion of the latter was itself wrong; restored 2026-07-29). Drop both
   together when the toolchain stops pulling `minimatch@3`.
5. ~~CI + supply-chain gates~~ — **done 2026-07-25**. See [How CI landed](#how-ci-landed).
6. Delete the three untracked empty directories; tighten `BotParts`'s `rushMode` prop type;
   strip debug logging.
7. Add a test asserting every `townage-` key is accounted for in `backup.ts` — the CI license
   gate just demonstrated the value of machine-checked inventories.
8. Work down the 24 `react-hooks/exhaustive-deps` warnings. Non-blocking, but they are the
   backlog the pinned plugin is deferring, not architecture.
9. Arc chunk 1 (M5): **the radial wheel + the player↔NPC fist bump first**, then
   `externallyDriven`, then an NPC teaches `arm-turn`. Teaching content is decided (planning
   ADR-0008 — it's ours), the order is decided (planning ADR-0009 — the fist bump de-risks
   player contact without the square), and the controls are decided
   ([ADR-0014](adr/0014-radial-wheel-for-emotes-and-taught-moves.md) wheel,
   [ADR-0013](adr/0013-pointer-events-with-capture-for-new-pointer-input.md) input API). The
   wheel is how the fist bump is initiated, so the two land together. See
   [M5 order: the fist bump comes first](#m5-order-the-fist-bump-comes-first).

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
