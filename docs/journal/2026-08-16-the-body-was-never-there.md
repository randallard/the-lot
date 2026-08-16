# 2026-08-16 — the body was never there

_Documents `8e4d914`, and square-one's `3c8ed43` alongside it._

Ryan, after accepting the Partner Trade fix:

> I think we should finalize "partner up" — that look is a bit off — I think the stance
> could be a little farther apart and have the reach accommodate the handhold better —
> the hands should be at the belle's waist height — let's see if that fixes the arm angle

Three specific asks. I went to measure the arm geometry before changing it, and found
something underneath all three.

## The torso was half a unit low

`Dancer.tsx` drew the body capsule at the rig origin:

```jsx
<mesh ref={expression?.body} rotation={...}>
  <capsuleGeometry args={[body.radius, body.height, ...]} />
```

No `position`. Meanwhile every other height in the same component comes from
`computePositions(shape, NPC_BODY_CENTER_Y)` — the shoulders the arms hang from, the head
group, the chest facing marker. And `Npc.tsx`, which draws the same capsule for the same
cast, has always placed it at `[0, NPC_BODY_CENTER_Y, 0]`.

So on the dance floor a dancer's head and arms floated half a world unit clear of their
torso, and Ember — whose capsule is 1.41 tall against a shared 0.5 centre — was mostly
under the floor.

**All 560 tests passed before the fix and all 560 passed after it**, and that is the
interesting part rather than an embarrassment. Everything that *reasons* about a dancer
reads the constant: `armMetrics`, `silhouetteMetrics`, `rigidParts`, the frame scale, the
clearance model. Every one of them was right the whole time. The only thing that was wrong
was the picture, and the only instrument that reads the picture is an eye.

The dance rig was written from scratch rather than adapted from `Npc`, and the offset
simply did not come along. It then survived the entire arm programme — the envelope, the
fist bump, ADR-0017's two-segment arm, touch hands — because none of that work ever had
reason to compare the drawn body against the computed one.

I could not screenshot it (no browser extension connected here), so the evidence is the
two components side by side rather than an image. That is enough: they disagree, and one
of them disagrees with its own arithmetic.

## Then the three asks, which were all one ask

With the body where it belongs, the measurements say the same thing Ryan's eye did.

**The stance.** The couple stood 0.868 world units apart. Myco's shoulders alone are
**0.920** across. So each dancer's inside shoulder was sitting *past* the joined hands —
`dx = −0.026` — and both arms hung dead vertical. There was no handhold shape on screen
because there was no room for one. Not a matter of degree.

Fixed on the side that owns shoulders, not in the engine. square-one's `COUPLE_WIDTH` doc
already said what to do: a third is *"the engine's body-agnostic default"* and *"a consumer
with real bodies should compute it and pass it to `partnerUp`"*. `coupleStandingWidth` is
that computation — the wider dancer's shoulder plus a hand's width of daylight, doubled —
and it gives **1.140**. The seam was cut in ADR-0004 and this is the first time anything
has actually walked through it.

**The reach.** `touchHeight` was the mean of the two dancers' own *hanging* hands, on the
reasoning that arms hang and hands should meet where they already are, so nobody lifts
anything. Sound, and wrong in the result: the mean lands at 0.375, which is **below**
Ember's hanging hand at 0.490. So Myco lifted, Ember pushed *down*, and Ember's arm came
out **113% extended** — the undrawn upper arm stretching to reach a height beneath it.
ADR-0017 permits exactly that (a hand may be placed further than the arm can go, and
`upperArmStrain` reports it), which is why it never crashed and never failed a test.

**The waist.** Now the carried height, from one body rather than two. `waistY` is new in
`body-shapes`, defined as half the shoulder height — this cast has no legs, so the waist
that *reads* is the middle of the capsule, not the anthropometric 0.6-of-stature. It has
to come off `shoulderY` because `bodyCenterY` is one constant for the whole cast and would
give a 0.95-shouldered dancer and a 1.43-shouldered one the same waist.

## The clamp, which Ryan did not ask for and the cast forced

"The belle's waist" is not achievable on this pairing in one direction. Myco's shoulder is
at 0.950 and Ember's at 1.425 — half a world unit apart, more than the slack in either
arm. With Myco as the belle, her waist at 0.475 is **0.973** from Ember's shoulder against
an arm of **0.935**. Over-extended again, by the identical mechanism I had just removed.

So the belle's waist is a *target*, and `touchHeight` raises it to whatever the shorter
reach can manage. That is not a fudge, it is what two people of very different heights do:
they meet above the shorter one's waist. Both dancers compute it from the same symmetric
inputs, because two hands at different heights are not joined.

## Numbers, before and after

| | Myco | Ember |
|---|---|---|
| before — extension / angle off vertical | 83% / −3° | **113%** / 4° |
| after (belle = Ember, as the scene pairs them) | 38% / 25° | 79% / 16° |

The hands land at 0.713, Ember's waist exactly, with the clamp inactive. Reversed, the
clamp lifts them from 0.475 to 0.562 and nobody exceeds 95%.

And a free one: a wider couple widens the Partner Trade's pass in step, **0.260 → 0.342**
world units against the 0.710 the bodies need. Still a collision, still the next decision,
but a third of the gap closed by fixing something else entirely.

## And then the elbow, on the first look

Ryan, watching the rebuilt version:

> see the beau's arm is pointing at the belle though?

He was right, and it was not the handhold. `reachPose` breaks the elbow's one degree of
freedom with a preference of `(sign × ELBOW_SWING, −1, 0)` — "mostly down, a little out" —
and then **projects that onto the plane perpendicular to the shoulder→hand axis**, because
the elbow has to stay on its circle.

A couple's joined hands put the hand nearly *below* the shoulder. So the axis is
near-vertical, the circle is near-horizontal, and the `−1` is almost entirely parallel to
the axis. Projection deletes it. What survived was "out", with a **positive** y residual:

```
shoulder (0.460, 0.950, 0)
elbow    (0.790, 0.957, 0)   ← outboard of the hand, and above the shoulder line
hand     (0.570, 0.672, 0)
```

The upper arm dead horizontal, the elbow outside the hand it was holding with. And the
upper arm is the one that isn't drawn, so what reads on screen is a forearm coming back
inward from a joint hanging out over the gap between them.

`ELBOW_BACK` is the answer, weighted by how folded the arm is. Backward is the one
direction always perpendicular to a vertical axis, so it is the one thing that cannot be
projected away — and a nearly straight arm has almost no circle to choose on, so weighting
by fold makes this free for the fist bump, whose render-validated geometry is untouched.
The elbow now sits at `(0.565, 0.868, −0.302)`: above the hand, below the shoulder, behind
the body.

Worth noting what this says about `ELBOW_SWING`. It was tuned against the fist bump, where
the arm is nearly extended and the circle is tiny, so the preference barely mattered and
any plausible number looked right. The first time it met a genuinely folded arm it produced
the worst available answer. **A tie-break tuned where the tie is small is not evidence
about where the tie is large.**

## What is still wrong, and it is the cast

The arm no longer points at anyone, and it is still visibly folded — forearm 57° off
vertical. Myco's arm is 0.690 long and the shoulder-to-hand span at Ember's waist is 0.30.
Nothing about the elbow rule can make an arm look unfolded when it is folded.

No height fixes it either. Myco needs the hands low (a long arm on a low shoulder), Ember
needs them high; with a comfort ceiling added to the floor already in `touchHeight`, the
permitted band is **empty**. This pairing cannot hold hands naturally at any height.

Left as a decision rather than a fudge. It is either a cast problem — Myco's arms and head
are outsized against the body, which is also what dominates the clearance number the
Partner Trade cannot meet — or touch hands wants an arm rule of its own. Both are Ryan's
call and neither is a bug.

## Worth keeping

Three defects in two days found by looking rather than by reading, and every time the code
was internally consistent and the tests were green. The engine emitted a sway nobody had
authored; the renderer drew a body half a unit from where every calculation in the same file
assumed it was; and a tie-break tuned on an extended arm produced its worst answer on a
folded one. **A test suite can only check the model against itself.** The render watch is
not a formality at the end of the work — it is the only instrument that reads the one thing
none of the others can.

The corollary showed up twice today and is worth its own sentence: **a constant tuned in the
regime where it barely matters carries no evidence about the regime where it does.**
`ELBOW_SWING` on a straight arm, and `COUPLE_WIDTH` on a couple that happened to be as wide
as one dancer's shoulders. Both looked settled. Neither had been asked a hard question.
