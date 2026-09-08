# ADR-0051: A couple stands staggered, by the angle the palm needs
- Status: Superseded by ADR-0052
- Date: 2026-09-07
- Deciders: Ryan, Claude

## Context

The standing couple's joined hands are tangent and are not a handhold. Measured across all
twenty orderings (2026-09-07): the **order** is right everywhere — the beau's hand centre
below the belle's — and each dancer's palm surface lands exactly on `hold.height`, because
`touchLift` settles it there. They meet edge to edge anyway. Two coins on their rims,
touching. Only **2 of 40** palms present their face; six stand exactly on the rim; the gap
between hand centres runs **3.0–6.5×** the flat-palm ideal.

The cause is one number. **The palm normal sits 87.5°–90° off the forearm axis** on four of
the five characters (Ember 74°, from her authored `[-23,45,-14]`), and there is no wrist —
a hand is an ellipsoid with a fixed authored rotation carried by the forearm group, so the
palm faces wherever the forearm happens to point. Rotating a hand about its own forearm axis
therefore sweeps the palm normal around a cone roughly *perpendicular* to the forearm, and
**vertical lies on that cone only when the forearm is horizontal.**

That is not a theory; it is what the numbers say. The two hands already near flat are the two
whose forearms point forward (tilt 91° and 97°, needing 5.7° and 6.9° of correction). The
five needing a full **90°** are the ones whose forearms hang near vertical (tilt 2°–13°).
Median correction across all forty hands: about 60°.

🔴 **So a wrist cannot be the fix.** A human wrist does roughly 80° of flexion and 70° of
extension, and this correction is not in a plane a wrist bends in — it is the sideways one,
where the limit is nearer 25°. Five hands would need a right angle. Any wrist implementation
must clamp, and the clamped cases stay exactly as wrong as they are now.

The related symptom points the same way: `hold.forward` — how far in front of the pair the
hands sit — is capped at the **shorter** dancer's relaxed reach and comes out **0.000 on 8
of 20** orderings, putting the hands in the plane through both bodies, which ADR-0027 itself
calls *"where nobody's hands are."* Those eight are the same orderings as the worst palms. A
couple standing exactly abreast asks both dancers to reach sideways to a point between them,
and a sideways reach is what leaves a forearm hanging.

Ryan, 2026-09-07: *"maybe the beau sometimes (maybe all the time) needs to stand a little bit
behind the belle to make this work geometrically."*

## Decision

**A couple's two dancers are offset along the way they are facing, and the offset is solved
from the arms rather than authored.**

The target is stated on the forearm, because the forearm is what decides the palm: each
dancer's forearm should make, with vertical, the angle their own hand's normal makes with
their forearm — about 90° for most of this cast, 74° for Ember. At that angle, and only at
it, a rotation about the forearm's own axis can bring the palm flat.

The stagger is a fact about **bodies**, so it stays on townage's side of the ADR-0004 seam
and the engine is not told. square-one places a couple abreast because that is the *figure*;
how two people with arms arrange themselves to hold hands within it is the same class of
measurement as `coupleWidth` and the clearances, and those are already solved here and
passed down rather than asked for.

Which dancer ends up behind is an **output** of the solve, not an authored rule.

## Alternatives considered

**Solve the hand's rotation and leave the stance alone** — the wrist. Rejected as a fix on
its own by the measurement above: it cannot reach the angles required, and the cases needing
most are the cases it can give least. Not rejected as a *component* — see Consequences.

**Tell square-one about the stagger**, as a third body measurement beside `coupleWidth` and
the clearances. Rejected because it is not a property of the figure. Every dancer in every
call would acquire a fore/aft term that only a joined-hands couple has any use for, and the
engine would own a number it cannot check.

**Raise `hold.forward` instead** — buy the same forearm angle by pushing the hands further in
front. Rejected because it is already maximal: `relaxedForward` spends whatever the arm has
left after going across and down, and on the eight worst orderings that is nothing. The
stagger is what *creates* forward reach rather than spending more of an arm that has none.

**Draw a single joined-hands mesh** and stop modelling the contact. Cheapest by far, and
rejected: the arch, the clearances and the accommodation ladder all need real hand positions,
and a prop over the top of a wrong pose hides the one thing this project measures.

## Consequences

🔴 **This decision does not by itself flatten a palm, and that is the honest shape of it.**
With the hand's rotation still authored, horizontal forearms put the palm somewhere new
rather than somewhere right. What the stagger buys is that a flat palm becomes *reachable* by
a rotation about the forearm's own axis — pronation, which is anatomically free and reads as
turning your palm over rather than as a broken wrist. The remaining rotation still has to be
applied by something.

**So the measurement after this lands is the input to the next decision**, and it should be
read as a split: how much of the residual is free roll about the forearm, and how much is
genuine bend across it. If the answer is "almost all roll", the follow-up is small. If a real
bend survives on some pairings, that is a second ADR and it is the wrist after all — arrived
at with a number instead of a guess. **That remeasure is the promotion condition.**

**A stagger has to blend out during a figure.** It is solved for the standing couple, and
during a Twirl the belle crosses the diameter while the beau orbits — positions the engine
computed, and whose clearances the engine solved, on the assumption that the dancers are
where it put them. A fore/aft nudge held through a pass would eat into a bow that was sized
without it. The safe reading is that the stagger belongs to the hold and fades with it, on
the same blend the arch already rides.

**"How far apart is a couple" stops having one answer.** `TouchHold.width` is centre-to-centre
today and is consumed by `arch.ts` and by `coupleWidth`; once the pair are staggered, lateral
separation and true separation differ. Every existing consumer wants the lateral one — that is
what a width has always meant here — so the field keeps its meaning and the stagger is
carried beside it. This is exactly the trap ADR-0045 was written about: a name keeping its old
meaning while the thing it names moves. Naming them separately is the whole guard.

**The measurements in `hold-metrics.ts` are the check.** `flatness`, the centre gap against
the flat-palm ideal, and the forearm tilt are already regenerated into the review chart per
pairing, and two tests pin today's numbers and are written to fail when this lands.
