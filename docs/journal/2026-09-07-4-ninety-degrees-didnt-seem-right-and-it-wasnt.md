# "90 degrees doesn't seem right to me" — and it wasn't

**2026-09-07, later again**

I wrote [ADR-0051](../adr/0051-a-couple-stands-staggered-by-the-angle-the-palm-needs.md) an
hour ago, arguing that the couple's *stance* was the handhold fix and a wrist could not be.
Ryan read it and said one sentence: *"yeah... 90 degrees doesn't seem right to me but let's
take a look."* He was right, and
[ADR-0052](../adr/0052-a-palm-turns-on-its-forearm-before-the-wrist-bends.md) supersedes it.

## The error

ADR-0051 said the correction lands in the plane a wrist bends least — radial/ulnar deviation,
limit near 25° — so five hands would need an impossible right angle.

**That ignored pronation.** Rotating the forearm about its own axis is free through ±90°, and
it *moves where the remaining bend has to happen* — into flexion, where about 80° is
available. Roll first and the residual is a different, much smaller angle in a much more
generous plane.

Measured by sweeping the roll and taking the minimum angle from horizontal — brute force,
3600 steps, rather than trusting the algebra a second time:

| | before (claimed) | after (measured) |
|---|---|---|
| correction needed | 5.7°–90°, median 60° | **1.4°–88.1°, median 35.5°** |
| hands within 45° | — | **30 of 40** |
| hands past 70° | 5 "impossible" | **4**, all involving Sprout |

The residual is exactly `|θ − forearm tilt|`, confirmed against the sweep.

**So ADR-0051 had it backwards.** It built relief for four hands and skipped the thirty-six.
A wrist handles 36 of 40 on comfortable angles; the stagger is the second thing, aimed at the
near-vertical forearms — the same orderings where `hold.forward` collapses to 0.000.

## The mistake underneath the arithmetic

🔑 **A zero-wrist requirement was assumed and never stated.** ADR-0051's target — a forearm
horizontal enough that roll alone suffices — is precisely what "no bending allowed" demands,
and nobody had asked for that. Once the requirement is written down it is obviously too
strong: real dancers hold inside hands with the forearm partway down and the wrist taking the
rest.

That is the same failure the last month keeps finding, in a new place. `PERSONAL_SPACE`
claiming to be the frame's margin, `TouchHold.width` claiming to be where a pair stand, and
now a constraint nobody typed sitting inside a derivation and setting its answer. **The
tooling cannot catch it** — the arithmetic downstream of the assumption was correct — and
only asking the question on a case the assumption cannot cover finds it. Here the case was
Ryan's eyebrow.

## What stands

θ ≈ 87.5°–90° — the palm normal really is perpendicular to the forearm, and that is
anatomically right rather than a modelling artifact. The edge-on contact is real. The chart
measurements are unchanged. Only the conclusion drawn from them moved.

## What was decided

**ADR-0052: a palm turns on its forearm before the wrist bends.** The hand's rotation is
solved, not authored: roll freely about the forearm, bend across it only for what the roll
cannot reach, clamp the bend at a human flexion limit.

Four hands will still be wrong by construction — the clamp is what makes that true, and it is
deliberate. They keep scoring red in `hold-metrics.ts`, and **that is the evidence the
stagger decision needs and does not have yet.** If they still read wrong on the review route,
ADR-0051's idea returns as its own ADR aimed at those four; if they read acceptably, it does
not return.

Not implemented. Nothing in the tree changed but documentation.
