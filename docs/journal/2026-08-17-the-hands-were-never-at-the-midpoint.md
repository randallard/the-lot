# 2026-08-17 — the hands were never at the midpoint

_Documents [ADR-0022](../adr/0022-a-couples-handhold-is-solved-for-the-pair.md), landed in
commit `d3cd4fb`. Nothing in square-one changed._

Yesterday's note said this pairing could not hold hands naturally, and offered Ryan a choice
between resizing the cast and writing touch hands its own arm rule. He took neither:

> try again with the body spacing and arm positions — I want it to work with no new
> limitations — the movement should accommodate the body size

## What "the band is empty" was actually measuring

The claim was arithmetic, and the arithmetic was right. One shared height. A floor, because a
hand cannot go below where the arm hangs. A ceiling, because a resting handhold should keep the
elbow bent (`TOUCH_COMFORT`, 0.95). Two shoulders half a world unit apart. No height satisfies
all four, therefore no handhold, therefore the cast.

What it was not was a fact about handholding. It was a fact about **holding the hands at the
couple's midpoint**, which is where every version of this has put them since the day it was
written, and which nothing had ever decided. `insideHands` in the engine returns
`couple.center`; the width had already been taken away from the engine on the grounds that it
depends on shoulders, and the hold *point* had not, on no grounds at all.

Pin the hands to the midpoint and one number — the shared height — has to absorb every
difference between two bodies. Unpin them and there are three, and the accommodation goes where
it belongs.

## The solve

`touchHold(beau, belle)` returns `{ width, height, lateral }`, and the third one is the whole
entry.

**Height** stays Ryan's rule with one change he did not ask for: it is the **lower** of the two
waists. On the debug cast the belle is the tall one, and her waist (0.713) is nearly the beau's
*shoulder* height (0.950) — so holding there left his hand up by his own shoulder and his
forearm 81° off vertical. Dead horizontal, pointing at the belle. Which is the same defect Ryan
has now caught twice, arriving a third time from a direction neither previous fix covered.

The lower waist is not an invention. It is written in this module already, in `gripHeight`'s
doc, as the rule that a placeholder was standing in for:

> past a big enough height difference the real rule is that the *taller* dancer does nearly all
> the accommodating, because an adult can drop their arm to a child's height and the child
> cannot raise theirs to the adult's

Where the belle is the shorter dancer — the ordinary arrangement, and the one Ryan was watching
— the two rules are the same rule.

**(Reverted the same afternoon. See the last section — the change I did not ask permission for
is the one that was wrong.)**

**Width** is unchanged in value and changed in kind: `2 × (max shoulder + max hand radius)`,
which is 1.140 on this cast, so the stance Ryan approved is exactly preserved and the Trade's
pass stays at 0.342. The eyeballed `TOUCH_INBOARD = 0.11` is gone; it was the joined hands' own
radius all along, and now it says so. Capped by what the two arms can actually span at the hold
height, floored by the two bodies — a couple stands where its hands can meet and no closer than
its bodies allow.

**Lateral** is the new freedom, and it is solved rather than chosen: the hands sit wherever both
dancers spend **the same fraction of their own reach**. There is exactly one such point, so
nothing here is tuned. On the default cast it comes out 0.173 toward the belle, and both dancers
land at **94%** with zero strain — against 53% and 72% for the same two bodies at the midpoint.

What that looks like is a short dancer reaching across to a tall one whose arm hangs at her own
side, which is what a child holding an adult's hand looks like, and which the midpoint had made
unrepresentable.

## The elbow, closed at the source

`ELBOW_BACK` went in yesterday to stop the beau's elbow landing *outboard of the hand it was
holding with*. It worked by counterweighting: a preference for backward, weighted by fold,
strong enough to beat the outward preference that survived the projection.

`touchPose` removes the direction instead of outweighing it. **The humerus of a hanging arm
stays in the plane of its own shoulder** — nobody lifts an elbow sideways to hold a hand — and
pinning the elbow's lateral offset to the shoulder's cuts its circle of legal positions to two
points, of which the one further back is the fold. No constant appears anywhere in it. An elbow
that cannot leave its shoulder's plane cannot get outboard of anything.

It does not answer every case: an arm straight enough (94%, reaching across) needs its elbow
0.117 clear of that plane for the triangle to close, and there `reachPose` still places it. That
is the right split, and worth stating plainly because it is the inverse of how those constants
were tuned: **the straighter the arm, the smaller the elbow's circle and the less the preference
can get wrong.** The folded arms — where it had everything to get wrong, and did — are the ones
that now come through the anatomy.

## Two slips found by writing the number down twice

Both were in *measurement*, both invisible to a green suite, and both are the same slip.

Yesterday's report said the beau was 38% extended and the belle 79%. Those were measured to the
**contact point**. Each dancer's hand centre is half a hand off it — the beau's palm underneath,
the belle's above — and to the hands the same pose was 53% and 72%. My own scratch readout
reproduced the error before the tests caught it.

Then it did real damage: splitting the daylight on the contact height rather than on each
dancer's own hand handed Sprout 0.166 of reach-across that her 0.300 arm did not have, and sent
her hand 0.043 past the end of it. There is now one definition, `touchReach`, exported for the
tests and the debug readout, and the readout in the panel calls it rather than re-deriving it.

## Where it stands

**568 tests** (from 567), lint 0 errors, typecheck and build clean. The whole shipped cast is
asserted pairwise, both ways round: nobody's hand goes past the end of their arm and nobody
stands inside anybody.

🔴 **Unwatched.** The browser was not drivable from this session, so the render watch is Ryan's:
`pnpm dev`, `#dance=two-trades`, the standing couple. The debug panel now prints the solved hold
— stance, hand height, offset from the midpoint, and each dancer's reach — for the couple
figures, so the numbers behind the picture are next to the picture.

🔴 **And the honest remaining complaint is that 94% is a nearly straight arm.** Elbows bent
about 140°: visible, but this is a formation people stand in and they would carry more bend than
that. The cause is `WAIST_OF_SHOULDER = 0.5`, whose own doc says a figure with legs wants about
0.73 — a waist at 0.73 lifts the hands, folds the elbows to around 100°, and costs nothing else.
That is the next dial, and it is a body constant rather than a clamp, which is the point.

## Same afternoon: the belle's waist goes back, and it is a rule about a role

Ryan watched it — *"the start looks pretty good, that's partner up right?"* — and then corrected
the one thing above that he had not asked for:

> the gent's job is to make the belle's job easier, even if she's taller — so if a dancer chooses
> that side then they need to be the ones to pay attention to the belle's comfortable hand
> position at the belle's waist — even if it looks awkward — maintain opinionation that way

**The lower-waist rule was a geometric answer to a question about a role.** Everything I reasoned
from — that the taller dancer can drop their arm and the shorter cannot raise theirs, that both
forearms then hang at 15° instead of one going horizontal — is true and beside the point. Nobody
was asking which dancer *can* accommodate. The beau's position is the one that accommodates,
that is what taking that side means, and a rule that reassigns the job to whoever happens to be
shorter has quietly deleted the thing the position is for. The prettier picture was the tell, not
the evidence.

So the height is the belle's waist, full stop, clamped only where an arm physically cannot reach.
And the same opinion now decides the lateral offset too, which the first version had splitting
effort evenly: **her arm hangs and he covers the daylight.** The hold sits under the belle's own
inside shoulder — the cheapest place her arm can reach at that height — and the beau reaches
across all of it. The equal-reach bisection is gone, and with it the last piece of machinery in
here that was solving for fairness instead of for the dance.

On the debug cast: hands at **0.713**, her waist exactly; hold **0.210** toward her; she spends
**69%** of her reach with her forearm at 30°, he spends **68%** of his with his forearm **81° off
vertical**, reaching across. Zero strain on both. On two *identical* bodies the hold still sits
off centre toward the belle, and the beau is at 91% against her 53% — which is the rule showing
its opinion in the one case where a symmetric solve would look most defensible.

🔴 **And that near-horizontal forearm is now a feature that will look exactly like the defect
fixed twice this week.** The distinction is the elbow, not the forearm angle: the old defect was
an elbow *outboard of its own hand*, which `touchPose` now makes structurally impossible and a
test asserts. Anyone re-watching this — me included — should check the elbow before believing
the forearm.

The complaint about nearly straight arms above no longer applies at this height (both arms are at
68/69% and properly bent), and `WAIST_OF_SHOULDER` remains the one dial behind the height. It is
now the *only* thing that would move this pose without touching the opinion.

## Late the same day: the instrument moved inside the session

Ryan set up the Chrome browser tool, so the render watch is no longer something this repo can only
*ask for*. Worth recording how it failed first, because it will recur: the extension was installed
and enabled the whole time, but this box runs **Chromium** (no Google Chrome), the browser process
had been up **14 days**, and the extension had updated underneath it on day 3. A stale service
worker looks identical to "not installed" from the tool's side — `list_connected_browsers` returns
an empty list either way. Restarting the browser fixed it.

First reading, live from the running app: the panel's hold matches the solve to the digit —
stance 1.140, hands 0.713, off-mid 0.210 toward the belle, beau 68% across 0.320, belle 69% across
0.000.

🔴 **That is not the watch.** It is the numbers confirmed one layer further out than the test
suite reaches, which is exactly the class of confirmation that has been wrong twice this week — the
torso was half a unit low while every number about it was right. The pose itself is still
unjudged, and the standing couple only exists at beat 0/8 of the loop, so seeing it needs a pause
at the right moment rather than a screenshot of whatever is on screen. Left the panel at 30 bpm
with joint markers on for that.
