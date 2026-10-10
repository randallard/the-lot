# ADR-0058: A raised hold stands the upper arm up

- Status: Accepted
- Date: 2026-09-21
- Deciders: Ryan, Claude

## Context

[ADR-0057](0057-the-turn-under-is-four-named-styles-and-the-review-branches-on-them.md) named four
ways a dancer takes a joined arm over their own head and gave each one a review cell. `FULL_L` —
the happy path — had no pose. This is that pose.

Ryan, 2026-08-23, in the report that also found the arm-swap:

> the left arm need to be turned under as it makes an upside down L with the invisible upper arm
> and the forearm then is horizontal over the head of the belle

The obstacle is [ADR-0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md), and it is a
good decision being asked the wrong question. *"The humerus of a hanging arm stays in the plane of
its own shoulder"* is the right anatomy for a couple standing hand in hand — it is what closed
*"the beau's arm is pointing at the belle"* at the source, without a tuned constant. **Nothing
about an arch is hanging.** `touchPose` pins the elbow to `x = shoulder.x` and takes the point
further back; for a hand raised above the crown and inward toward the join, that is not a shape
anybody makes.

## Decision

**`touchPose` gains `raised`, 0–1, which rotates the elbow along its own circle toward the
highest point on it.**

The elbow's legal positions are the intersection of a sphere at the shoulder with one at the
placed point — **a circle**, whatever rule picks from it. ADR-0027 picks where that circle crosses
the shoulder's own plane. The L picks the circle's **highest** point, which is the most vertical
humerus the geometry allows. `raised` turns from the first toward the second about the circle's
axis (Rodrigues), and `TouchHold.raised` carries it.

**A rotation, not a lerp between two elbows.** Every value in between is a real elbow, so the
upper arm and the forearm keep their exact lengths the whole way across and `upperArmStrain` reads
zero at both ends and everywhere between — asserted over the cast at seven blend values. A lerp
between positions would cut the chord and shorten the humerus *while the hands are going up*, on
the one figure where somebody is watching the arm.

**The highest point is closed form, and basis-free.** Height on the circle is maximised at the
normalised projection of **up** onto the circle's plane, `w = ŷ − (ŷ·n)n`, whose length is
`√(1 − n.y²)`. No search, no tuned constant — which is the property ADR-0027 was written to buy
and this must not spend. When that length is zero the hand is directly above or below the
shoulder, every elbow on the circle is the same height, and the hanging answer is returned
untouched.

**It rides the arch's own blend.** `DanceFloor` passes `under.blend`, so the humerus stands up
exactly as fast as the hands climb. An arch is a standing handhold that has gone up — the hold is
built by lerping its own fields — so a rule with a threshold in it would pop the elbow across
partway up the rise.

**`raised = 0` is ADR-0027 byte-identical**, including its fall-throughs. Asserted, not assumed.

## 🔴 And the measurement that matters most is how rarely it fires

**The L has a circle to turn on in 7 of 50 arms.** Across all twenty-five orderings, both roles,
at the real arch with the reach and the reshape worn: for 43 of them the hold is at or past full
stretch, `touchPose` falls through to `reachPose`, and there is no elbow to place at all.

That is not a defect in this rule and it is not a reason to weaken it. **A straight arm has no
elbow freedom, and neither does the dancer.** It is the same fact ADR-0027 states from the other
end — *"the straighter the arm, the smaller the elbow's circle"* — met at the far end of its own
range.

What it does mean is that **the arch is at full stretch for almost the whole cast**, and the
straight arms are mostly already near-vertical (6°–29° off) because they are reaching up to a
point above the crown. Where there *is* slack the rule earns its place — `ryan/sprout`'s beau goes
**44° → 28°** — and where there is not, the pose was already about as L-shaped as an arm can be.

🔴 **One arm is neither: `sprout/ember`'s beau sits at 88° off vertical, straight.** A nearly
horizontal upper arm at an arch, with no elbow freedom to fix it. Recorded here as a finding, not
fixed: it is a reach problem rather than an elbow problem, and it belongs with the arch height.

## Alternatives considered

**A separate `archPose` solver.** Rejected: both answers are points on the same circle, so a
second solver would re-derive the same two spheres to disagree about one angle — and would have
to be kept in step with `touchPose` forever.

**Switch rules on "is this an arch".** Rejected: the arch blends up rather than appearing, so any
threshold pops. Making it a number is what lets it ease, and it is the same choice already made
for the arch's height and lateral.

**Aim the elbow at a head-avoiding direction instead of straight up.** That is the *next*
decision, not this one. Standing the humerus up is what Ryan asked for and is well-defined without
reference to a head; keeping a forearm out of its own head is a limit that applies to arms nobody
is holding too. One decision per file.

**Pose the elbow directly, as the old `ELBOW_SWING`/`ELBOW_BACK` constants did.** The thing
ADR-0027 exists to have stopped doing.

## Consequences

**`FULL_L` now has a pose**, and the review's red *"this style has no pose yet"* block comes off
its cells. `DUCK_UNDER` and `CASUAL` keep theirs.

**Six new statements pinned** (`raised-elbow.test.ts`), the load-bearing ones being that the
humerus never changes length, that the hand does not move when the elbow does — a hold is a fixed
point two dancers both solve onto, and an elbow rule that dragged it would pull their hands apart
— and that nothing on the circle is higher than where `raised = 1` lands, checked by sweeping the
rotation past both ends.

🔑 **The regime boundary is named in the tests rather than assumed.** Ryan reaching 90% of his arm
is already in `reachPose`, and a test that assumed one regime across the cast would have been
asserting the wrong thing about the pose instead of finding a defect in it.

🔴 **The head is not guarded, and standing the elbow up can move a forearm toward one.** The
general rule — an arm does not pass through its own head — is still owed, and is the next
decision. It is a smaller problem for a *held* arm than expected, because 43 of 50 held arms turn
out to be straight and near-vertical; it is the **free** arm, which raises inward past horizontal,
where every character on the cast fouls their own head.

**And it puts a number on worklist item 10.** *"The last resort is reached far too readily"* now
has a companion measurement: the arch asks almost every arm on the cast for its full length.
`archRoom` clears the **taller** dancer's crown, and both dancers are held to it.
