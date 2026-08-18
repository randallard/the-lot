# ADR-0022: A couple's handhold is solved for the pair, and the joined hands are not at the midpoint
- Status: Superseded by [ADR-0023](0023-the-bodies-bound-the-handhold.md)
- Date: 2026-08-17
- Deciders: Ryan, Claude

## Context

Touch hands — a couple standing with its inside hands joined — landed on 2026-08-16 with the
stance computed from the two dancers' shoulders (1.140 world units, up from the engine's
body-agnostic 0.868) and the joined hands carried at the belle's waist. The numbers were much
better than what they replaced and the picture still read wrong: Ryan, *"the beau's arm is
pointing at the belle"*, and after `ELBOW_BACK` fixed that, still visibly folded at 57° off
vertical.

The note left in `PROGRESS.md` was that **this pairing cannot hold hands naturally** — Myco
needs the hands low and Ember needs them high, and with a comfort ceiling as well as a
reachability floor the band is empty — so the choice was between resizing the cast and giving
touch hands its own arm rule.

Ryan rejected the framing: *"try again with the body spacing and arm positions — I want it to
work with no new limitations — the movement should accommodate the body size."*

**He was right, and the empty band was an artefact of two assumptions, neither ever decided.**
Both looked like facts about handholding:

1. **The hands meet at the couple's midpoint.** True of a matched pair; false of every other,
   and there is no rule of dancing behind it. `insideHands` in the engine says the hands meet
   at `couple.center`, which is the *body-agnostic* answer for the same reason `COUPLE_WIDTH`
   is — and unlike the width, nobody had asked the side that owns bodies for a better one.
2. **A resting handhold keeps the elbow bent** (`TOUCH_COMFORT`, 0.95 of the reach). Plausible,
   and it is what closed the band: a floor *and* a ceiling on one shared height, with two
   shoulders half a world unit apart, leaves nothing.

The first is load-bearing. With the hold pinned to the midpoint, the *only* freedom left for
accommodating two different bodies is the shared height — one number for two dancers — so every
mismatch had to be absorbed by a clamp, and a clamp is what makes a band empty.

A third rule was suspected and turned out to be sound: **the hands go at the belle's waist**,
which costs the beau dearly when the belle is the taller dancer. It was briefly replaced with
the lower of the two waists, on the reasoning that the taller dancer should accommodate. Ryan
put it back, and the reason is the decision below.

## Decision

**The handhold is solved once for the pair, as three numbers derived from the two bodies —
stance width, contact height, and how far off the couple's midpoint the hands sit — and both
dancers pose against the same solved answer.** `touchHold(beau, belle)` in `arm-pose.ts`.

**And the hold is placed for the belle, because that is the beau's job.** Ryan, on watching the
first version: *"the gent's job is to make the belle's job easier, even if she's taller — so if
a dancer chooses that side then they need to be the ones to pay attention to the belle's
comfortable hand position at the belle's waist — even if it looks awkward — maintain
opinionation that way."* This is a **dance** opinion rather than a geometric one, and it decides
two of the three numbers:

- **Height** is the belle's waist, clamped only into the band both arms can physically reach
  (no dancer can put a hand lower than it hangs or higher than they can lift it). Not the lower
  of the two waists, which is what the first draft of this ADR chose and which reads better on
  screen: it hangs both forearms neatly at 16° by quietly reassigning the accommodation to
  whoever is shorter, and the beau's side is the side that carries it.
- **Lateral** puts the joined hands under the **belle's own inside shoulder** — her arm hangs
  straight down to them, which is the cheapest thing it can do at that height — and the beau
  covers the whole of the daylight. She takes some back only when the bodies force the pair
  wider than his arm can span, which is a shortage rather than a preference. This is the
  freedom that was missing; equalising the two dancers' effort was tried here first and is the
  wrong rule, because it hands the belle part of the work whenever she is the one with slack.
- **Width** is the wider shoulders plus the joined hands' own width on each side, capped by how
  far apart the *beau* can stand and still reach her hand, floored by the two bodies. On the
  default cast the first term wins and gives **1.140** — the stance Ryan approved, now derived
  rather than fitted, with the eyeballed `TOUCH_INBOARD = 0.11` replaced by `max(handRadius)`,
  which is the same number said properly.

**And the arm that holds is posed by anatomy rather than by preference.** `touchPose` keeps the
humerus in the plane of its own shoulder — a hanging arm does not lift its elbow sideways to
hold a hand — which cuts the elbow's circle to two points and takes the one further back.
Nothing in it is tuned. Where the arm is too straight for that plane to contain the elbow at
all it defers to `reachPose`, which is where the swing constants have almost nothing left to
get wrong.

## Alternatives considered

- **Resize the cast.** Myco's arms and head really are outsized, and it dominates the Partner
  Trade clearance number too. But it fixes this pair by making the pair less extreme, and the
  next mismatched pair brings the defect back. A rule that only works on bodies close in size
  is not a rule.
- **A separate arm rule for touch hands, with its own constants.** What the old note proposed.
  It would have worked and it would have been another `ELBOW_SWING`: a constant tuned by eye
  against one pairing, carrying no evidence about any other.
- **Keep the midpoint and put the accommodation in a forward offset** (hands in front of the
  bodies, which is where real joined hands sit). Genuinely better anatomy, and it fails on this
  cast for the same reason the height did: Ember's forearm alone wants 0.518 of forward offset
  and Myco's wants 0.164, so a single shared z is another clamp. Worth revisiting *after* this,
  because with the lateral freedom in place the two dancers' asks are much closer together.
- **Share the effort evenly: the lower of the two waists, and the daylight split so both
  dancers spend the same fraction of their own reach.** Built first, and it produces a better
  *picture* — 94% each on the default cast, both forearms hanging at about 15°. Rejected by
  Ryan on the render, and the reasoning is not aesthetic: evenness is a rule about geometry
  where this is a rule about a **role**. A dancer who takes the beau's side takes the job of
  making the belle's easier, so a symmetric solve gives away the thing the position means.
  Kept in the record because it is the version that looks nicer, which is exactly why it would
  come back.
- **Measure a dancer's effort to the contact rather than to their own hand centre.** Keeps a
  hold looking symmetric between identical bodies and hides that the beau's palm is underneath,
  so his arm really does reach further. It sent Sprout's hand 0.043 past the end of her arm.
  Hence `touchReach` measuring to each dancer's own hand.

## Consequences

- **The empty band is gone, and not just for this pair.** Every ordered pair of the four
  shipped bodies now holds hands with **zero strain** — asserted over the whole cast, both ways
  round, rather than checked on the default two.
- **On the default cast the hands land at 0.713 — the belle's waist exactly — with the hold
  0.210 toward her, under her own inside shoulder.** She spends 69% of her reach with her
  forearm hanging at 30°; he spends 68% of his with his forearm **81° off vertical**, reaching
  across. Against 53% and 72% at the midpoint. (The 38%/79% reported on 2026-08-16 was
  measured to the contact rather than to each hand centre — `touchReach` exists so the number
  has one definition.)
- **The stance did not change**, so the Partner Trade's pass separation stays at 0.342 and the
  clearance decision is unaffected either way.
- 🔴 **A near-horizontal beau's forearm is now a feature and will look like a defect.** It is
  the accepted cost of the rule, and it is indistinguishable on sight from the "arm pointing at
  the belle" defect that was fixed twice this week — which was an *elbow outboard of its own
  hand* and is now structurally impossible. Anyone re-watching this should check the elbow, not
  the forearm angle: there is a test for exactly that invariant.
- **One dial sits behind the height and it is not a clamp.** `WAIST_OF_SHOULDER` is 0.5 because
  a legless capsule's waist is its own middle; its own doc says a legged figure wants ~0.73. It
  sets where every belle's waist is, so it is the one place to turn if the hold should sit
  higher or lower — and the only one that keeps the opinion intact.
- 🔴 **One arrangement still clamps, and it is a real limit rather than a tuning failure.** With
  Ember as the *beau* her palm has to go underneath, and a hand cannot get below where the arm
  hangs, so the hold rises off Myco's waist to 0.560. Width cannot help — width only ever adds
  to a reach. That one wants a body that can lean.
- **`ELBOW_BACK` is now a constant with no case behind it** — it went in for touch hands and
  touch hands no longer calls it. Left in place, with that recorded at the constant: deleting it
  would silently restore the defect it was written for, the day something folded again.
- **`poseArms` takes a `TouchHold` where it took a `coupleWidth`** — solved once by the caller
  and handed to both dancers, because a per-dancer solve is two answers to a question with one.
- **Promotion condition.** The forward offset above. If a couple's joined hands ever need to sit
  in front of the bodies — for a two-hand hold, a Star, or simply because the front view starts
  to look flat — that is a fourth number on `TouchHold` and a fourth term in the same solve,
  and this decision is the thing that makes it affordable.
