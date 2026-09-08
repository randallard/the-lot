# ADR-0052: A palm turns on its forearm before the wrist bends
- Status: Accepted
- Date: 2026-09-07
- Deciders: Ryan, Claude

## Context

Supersedes [ADR-0051](0051-a-couple-stands-staggered-by-the-angle-the-palm-needs.md), which
decided the couple's *stance* was the fix. **Its reasoning stopped holding within the hour,
and Ryan is the one who stopped it**: *"90 degrees doesn't seem right to me."*

What both ADRs rest on still stands. The standing couple's joined hands are tangent and are
not a handhold — they meet edge to edge, only 2 of 40 palms presenting a face. The cause is
that **the palm normal sits 87.5°–90° off the forearm axis** (Ember 74°, from her authored
hand rotation) and there is no wrist, so the palm faces wherever the forearm points. That
measurement is right, and it is also *anatomically* right: a real palm's normal is
perpendicular to its forearm.

🔴 **What was wrong was the next step.** ADR-0051 argued that the correction lands in the
plane a wrist bends least — radial/ulnar deviation, limit near 25° — so five hands would need
an impossible right angle and a wrist could not be the fix. That ignored **pronation**.
Rotating the forearm about its own axis is anatomically free through ±90°, it reads as
turning your palm over rather than as a bent wrist, and it *reorients where the remaining
bend has to happen* — into flexion, where about 80° is available.

Measured properly, sweeping the roll and taking the minimum angle from horizontal, the
residual bend is `|θ − forearm tilt|` — confirmed numerically against a brute-force sweep:

| | |
|---|---|
| residual after a free roll | **1.4° – 88.1°**, median **35.5°** |
| hands within 45° | **30 of 40** |
| hands past 70° | **4 of 40**, every one of them involving Sprout |

So a wrist handles **36 of 40 hands** on comfortable angles, and ADR-0051 had it backwards:
it built relief for four cases and skipped the thirty-six. The four it would have helped are
the near-vertical forearms — tilt 1.9°–13°, the same orderings where `hold.forward` collapses
to 0.000 — which is a real and separate problem.

The deeper mistake is worth naming, because it is not arithmetic. **A zero-wrist requirement
was assumed and never stated.** ADR-0051's target — a forearm horizontal enough that roll
alone suffices — is exactly what "no bending allowed" demands, and nobody had asked for that.
Real dancers hold inside hands with the forearm partway down and the wrist taking the rest.

## Decision

**A dancer's hand rotation is solved, not authored: the hand rolls about its own forearm
first, and bends across it only for what the roll cannot reach.**

Roll is spent freely because it costs nothing anatomically. The residual bend is clamped to a
human flexion limit, and a hand that would need more than the clamp keeps what the clamp
gives rather than reaching an angle no wrist makes.

## Alternatives considered

**The stagger, as the primary fix** — ADR-0051. Lost on the measurement above: it addresses
the four hands whose forearms hang vertical and does nothing for the thirty-six that only
need a wrist they do not have. It is not wrong, it is second.

**Both at once** — solve the rotation *and* stagger the couple far enough to bring the four
extremes into range. Rejected as one decision for the reason ADR-0038 keeps proving: an
accommodation has to beat the alternative it was chosen over, and the stagger's cost is only
justified by whatever survives the wrist. Committing to it now would be paying before
knowing, and the stagger's costs are real — `TouchHold.width` stops having one meaning, and
the stagger has to fade during a figure the engine sized believing the pair stand abreast.

**Keep the authored rotation and stagger only** — considered and rejected with ADR-0051:
horizontal forearms put a palm somewhere new rather than somewhere right, because nothing is
turning it.

**Draw a joined-hands prop.** Still rejected, for the reason it always was: the arch, the
clearances and the accommodation ladder all need real hand positions.

## Consequences

**The authored `hand.rotation` has to become one thing or the other.** It is styling today —
Ember's `[-23,45,-14]` is why her θ is 74° rather than 90° — and a solved rotation either
replaces it or composes with it as an offset. Composing keeps the character's look and makes
the solve relative to a per-body reference; replacing makes every hand identical in pose and
loses authored character. This is a real fork and it lands in the implementation.

🔴 **Four hands will still be wrong, by construction, and that is the point of clamping.**
The Sprout-as-beau orderings need 77°–88° and will get the clamp. They will keep reading
edge-on, `hold-metrics.ts` will keep scoring them, and the chart will keep showing them
red — which is exactly the evidence the stagger decision needs and does not have yet.

**The promotion condition is that remeasure.** If the clamped four still read wrong on the
review route, ADR-0051's stagger comes back as its own ADR, aimed at those cases and
justified by them. If they read acceptably, it does not come back at all.

**Scope is the standing touch hold.** Arch and forearm grips pose hands too, and whether the
same solve should reach them is a question this does not answer — a gripped forearm is
already laid into a partner's grip by a different path. Deliberately left, rather than
generalised on the assumption it transfers.

**The measurement is already in place.** `hold-metrics.ts` reports palm flatness, the centre
gap against the flat-palm ideal, and forearm tilt per pairing; the chart regenerates them;
and two tests pin today's numbers and are written to fail when this lands. Nothing new has to
be built to know whether this worked.
