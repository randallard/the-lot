# There is no wrist, and the palms meet on their rims

**2026-09-07, later still**

Ryan asked for something in the chart that could be *tested* rather than rated — *"the
belle's hand should be held level just above the beau's hand and the beau's hand should be
level just below the belle's"* — and then guessed at two causes: *"maybe part of the problem
is we don't have an angle at the wrist? also maybe the beau sometimes needs to stand a
little bit behind the belle."*

**Both guesses are right, and they are the same defect seen from two sides.** Measured
across all twenty orderings before anything was built.

## What is right

The **order** is correct on 20/20: the beau's hand centre is below the belle's, which is the
hold as authored — *"beau right palm up and belle's left palm down"* (2026-08-15). And the
two hands genuinely **touch**: `touchLift` settles each dancer until their own palm surface
lands on `hold.height`, so tangency is by construction, not luck.

## 🔴 What is wrong

They are tangent **edge to edge**. Two coins standing on their rims, touching.

A hand is an ellipsoid — radius flattened along the palm normal — carried by the forearm
group with a fixed authored rotation. **There is no wrist.** So where the palm faces is
decided entirely by where the forearm happens to point, and the forearm points wherever the
reach left it. Measuring how far each palm is from lying flat in the contact plane
(0 = face on, 1 = on its rim):

| | |
|---|---|
| palms that meet face on (≤ 0.25) | **2 of 40** |
| palms at 1.00 — exactly on the rim | **6 of 40** |
| median | **0.86** |
| gap between hand centres, against the flat-palm ideal | **3.0× to 6.5×** |

The worst is `you → Myco` at 4.2× with the beau's palm at 0.98 — which is the pairing Ryan
named. He picked the worst cell in the matrix by eye.

🔑 **`arm-pose.ts` already compensates for the consequence and never touched the cause.**
`handRiseAlongUp` exists *because* of this: stacking two palms by their radii left a gap
Ryan could see on 2026-08-18, so the tilted hand's true vertical extent is now measured and
the surfaces do meet. That fixed the arithmetic and left the palms tilted. **A hold can be
exactly tangent and still not be a handhold** — which is why "do they touch" was the wrong
question and "do they touch *face to face*" is the right one.

## And the second guess is the second half of it

Both hands are placed at the **same** `(x, z)` — one `lateral`, one `forward`, shared. The
two hand centres differ only in `y`. So the only contact available is a vertical stack, and
a vertical stack only reads as a handhold when both palms are horizontal, which is exactly
what nothing guarantees. A per-dancer fore/aft offset — the beau a little behind — is what
would let the palms overlap face to face instead of balancing one on the other.

It would also fix something else already visible: `forward` is capped at the **shorter** of
the two dancers' relaxed reach, and it comes out **0.000 on 8 of 20 orderings** — hands in
the plane through both bodies, which ADR-0027 itself calls *"where nobody's hands are."*

## A discriminator worth keeping

Seven orderings have a forearm pointing **upward** at a waist-height hold (tilt > 90°, hand
above its own elbow), peaking at 117° on `Ember → Myco`. **Every one of the seven involves
Ember.** That says the cause is a proportion meeting the solve rather than a rule that is
wrong for everybody — the same shape of discriminator that made ADR-0049's diagnosis real
before anything was built.

## What was built, and what was not

Built: `hold-metrics.ts`, solved through the **real** `touchHold` and a newly exported
`touchLift` so it cannot disagree with the picture; a *"The handhold, measured"* section
regenerated into the chart with ✅/🔴 per pairing; five tests, two of which **pin the defect
as a number so a fix has something to move.** They are written to fail when it is fixed, and
say so.

Not built: **the fix.** Wrist DOF, per-dancer fore/aft, or both is a decision with real
alternatives — a wrist is a new degree of freedom in the rig and in the shape editor, an
offset changes what "a couple's width" means and would touch every arch measurement. That is
an ADR and Ryan's call, not something to slip in behind a measurement.

752 tests, 751 passing — the one failure is the pre-existing arch terminal case. `tsc`
clean, lint 0 errors, `docs-hygiene` clean. Uncommitted.
