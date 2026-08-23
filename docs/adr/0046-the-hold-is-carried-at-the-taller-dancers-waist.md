# ADR-0046: The joined hands are carried at the taller dancer's waist
- Status: Accepted
- Date: 2026-08-22
- Deciders: Ryan, Claude

## Context

Supersedes [ADR-0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md), and with it the
last of the ADR-0022 → 0023 → 0025 → 0027 chain's height rule. ADR-0027 kept the height as
inherited and changed only the forward axis; it also wrote down, in its own consequences, the
sentence this ADR is the answer to:

> If the pose reads as thrust out, the honest dial is not a fudge factor on `forward` — it is
> **the decision about whose waist sets the height.**

Ryan watched the standing couple in two screenshots that were the same pair with the roles
swapped. Myco with Ember read as right: hands at 0.713, a third of a body's width forward,
nobody past 79% of their reach. Ember with Myco read as wrong: hands at 0.557, **no forward
offset at all**, and Ember at **100%** of her arm — the same two bodies, a hold that had dropped
0.156 and a pose that had lost the thing ADR-0027 was written to add.

**The belle's waist is a role, and a role is not a body.** That is the whole defect. The rule
came from a dance opinion Ryan gave on 2026-08-16 — *"the gent's job is to make the belle's job
easier, even if she's taller"* — and it read correctly for six days because on the shipped
pairing the belle **is** the taller dancer, where the two rules are identical. Where she was
not, the hold moved because somebody had been handed a different label, which is not a fact
about either of them.

**And the geometry has an opinion the roles do not.** The taller dancer is the one who runs out
of arm, because they are reaching **down** and a shoulder cannot follow a hand down. The shorter
dancer reaches **up**, which an arm has room for — an arm going up is not folding back on
itself. So aiming at the *taller* dancer's waist is not a compromise between the two of them; it
is the only aim that asks each of them for the motion they can make.

## Decision

**The hold aims at the taller dancer's waist** — `max` of the two dancers' world waist heights —
and the shorter dancer lifts to meet it.

The higher of the two waists *is* the taller dancer's, not a proxy for it: `waistY` is a fixed
fraction of shoulder height (`computePositions`), so it is monotone in stature and `Math.max`
picks the same dancer the word does.

**Unchanged, and restated because this supersedes ADR-0027** — only the aim moves; everything
downstream of it stands, and still binds in the same order:

- **It is an aim, not the answer.** The band is still cut from what both arms can actually make,
  as a bounded fixed point over four coupled quantities — height, across, palm lift and forward
  — because a reach is a sphere and every axis spends the same arm.
- **The floor still outranks the aim**, and it is the **beau's**, because it is his palm that
  goes underneath. Sprout as beau cannot get her hanging hand down to a grown partner's waist,
  so the hold rises to where her arm reaches.
- **The ceiling still outranks it too.** On a wide enough torso neither dancer can lift a hand
  that high, and the hold comes out below the aim; the debug scene's `mixed reversed` cast does
  exactly this at 0.653 against an aim of 0.713.
- **The upper arm hangs, and the hands come forward.** `forward` is still not a preference: it
  is what is left of the forearm once the relaxed elbow, the across and the height are paid for,
  `forward² = forearmSpan² − across² − (handY − elbowY)²`, zero where that is negative, and the
  hold takes the **shorter** of the two dancers' answers while the longer-reaching one's elbow
  folds back to take up the slack. Untouched as a rule; it moves as a number, which is the
  mechanism working — a hold the taller dancer can carry leaves them arm to put their hands in
  front with.
- **The lateral is halfway between the two inside shoulders**, a landmark rather than a
  preference about whose arm does the work, **clamped into the corridor between the bodies**,
  and the clamp outranks the landmark.
- **The corridor is still measured side-to-side at `z` 0**, which stays provably conservative
  with the hands in front: a capsule's lateral half-width at a forward offset `z` is
  `sqrt(max(0, r² − z²))`, strictly narrower than at `z` 0.
- **A hand is the ellipsoid that is drawn** ([ADR-0026](0026-a-hand-is-the-ellipsoid-that-is-drawn.md)):
  each dancer puts their own drawn palm on the contact plane.
- **Stance floor** is ADR-0012's `lateralClearance` + `PERSONAL_SPACE`, and at least a corridor
  wide enough for the hands at the hold's height.
- **ADR-0027's own promotion condition carries over**: `relaxedForward` assumes the elbow hangs
  in the shoulder's own **x**-plane, which is what `touchPose` guarantees today. A move that
  deliberately lifts an elbow sideways has no relaxed forward and this derivation does not apply
  to it.

**What this gives up, said plainly:** Ryan's 2026-08-16 opinion, as literally worded. The gent
no longer pays for the belle's comfort *because* he is the gent — he pays when he is the taller,
and she pays when she is. The opinion's *purpose* survives intact, and arguably better: the hold
still sits where the dancer who cannot adapt can carry it, and it now identifies that dancer by
their body instead of by their side of the couple.

## Alternatives considered

All three were measured through the real solver rather than reasoned about beside it —
`touchHold` gained an optional `target` parameter so a candidate height could be run through the
same fixed point the shipped one uses. A candidate evaluated any other way is a candidate for a
different function.

Over the 20 orderings the five shipped bodies can make:

| aim | someone at 100% | no forward at all | worst role-swap shift in height |
|---|---|---|---|
| the belle's waist (ADR-0027) | 12/20 | 12/20 | 0.156 |
| the shorter dancer's waist | 14/20 | 14/20 | 0.102 |
| the mean of the two waists | 9/20 | 10/20 | 0.078 |
| **the taller dancer's waist** | **8/20** | **8/20** | **0.045** |

- **The shorter dancer's waist.** Worse than what we had, on every column. It aims at the dancer
  who could have adapted either way and strands the one who could not — the mirror image of the
  right answer, and the reason "split the difference downward" is not the tidy compromise it
  looks like.
- **The mean of the two waists.** The compromise that behaves like one. It makes the pose Ryan
  called right *worse* — Myco/Ember's forward drops 0.320 → 0.311 and the belle goes 79% → 90% —
  and only half-fixes its mirror, which lands at forward 0.126 with Ember still at 99%. Neither
  dancer is exactly relaxed and neither is comfortable.
- **A tuned offset from one waist, or a blend weighted by height.** Rejected on the grounds this
  solve has rejected every constant: there is a mechanism here, and it has an answer.
- **Keep the belle's waist and treat the mirrored pose as out of scope**, on the reasoning that
  the shipped square always seats the taller dancer as belle. It does today. It is one seating
  decision away from not doing, and the failure mode is a dancer at 100% of their reach with
  their hands pinned in the plane of their own body.

## Consequences

- **12 of the 20 orderings are byte-identical** — every one where the belle was already the
  taller. The pose Ryan called right is untouched: Myco/Ember stays 0.713 / forward 0.320 /
  67%–79%.
- **The four Ember-as-beau orderings are the win.** All four went 0.557 / forward 0.000 / Ember
  at 100%, and all four now sit at 0.713 with forward restored (0.078–0.288) and Ember at
  85–90%.
- **The three watched debug casts do not move at all**: `default` 1.140 / 0.713 / 0.050,
  `mixed` 1.070 / 0.670 / 0.175, `max` 1.640 / 0.903 / 0.005. `mixed reversed` improves —
  0.625 → 0.653, forward 0.111 → 0.144, both reaches down a little.
- **The aim now binds.** 14 of 20 orderings land on it to 1e-12, and three more within 1e-5 (the
  player, whose arm is *just* long enough once the sideways spend is paid). Only three are
  visibly raised, all of them Sprout as beau, by 0.025–0.045.
- **The hold is no longer role-dependent where it matters.** The aim is symmetric in the pair by
  construction; the *clamp* is not, because the beau's palm is underneath. So swapping roles can
  still move the height, on 3 of the 10 unordered pairs, by at most **0.045** — against 0.156
  before.
- 🔑 **The couple's standing width is downstream of this, and that is where the change is
  largest.** A hold aimed below a dancer's hanging hand eats the arm they would otherwise spend
  reaching *across*, so the pair stand narrow. Myco with Sprout — an adult and a child — held
  hands at 0.403, *below the child's own waist*, and stood at **0.745**; they now hold at 0.475
  and stand at **1.057**. Ember with Sprout goes 0.560 → 0.860, Ember with the player 0.610 →
  0.900.
- ✅ **ADR-0018's terminal case is closed.** Myco with Sprout could not be given the room for an
  arch at the width their handhold put them at: the overshoot was 1.62, then 1.07, then 1.05
  after three separate corrections to `archClearance` and the stance floor. It is **0.60** now,
  and the arch fits. The finding survived every correction until the one that addressed what was
  actually causing it, which was the aim. Its test is kept as a passing witness rather than
  deleted.
- ✅ **Three of the nine orderings that had to buy upper arm for an arch no longer do**, and a
  fourth buys far less: Ember/player 0.12 → 0, Myco/Sprout and Ryan/Sprout 0.03 → 0,
  player/Sprout 0.09 → 0.01. Ember with Myco and with Ryan still need 0.31, unchanged.
- **ADR-0045's five lost orderings become two** — the player with Sprout, both ways. Not because
  the seam got safer: three of the five stopped reaching, so they no longer *have* two widths to
  disagree about. The distinction is still pinned by its test.
- 🔴 **The cost, and it wants a watch.** Myco and Sprout standing at 1.057 is arm's length for
  the child — she is at 100% of her reach there. It is what their arms allow at a hold she can
  actually make, and it is more room than an adult and a child holding hands would take. If it
  reads as too far apart on screen, the dial is the couple's **width** rule (currently "the wider
  shoulders plus daylight, capped by reach"), not this aim.
- **8 of 20 orderings still have somebody at 100%**: six involve Sprout, and two are the player
  with Myco and with Ryan. These are the genuinely mismatched pairs where the reach band binds
  wherever the hold is aimed — the residue [ADR-0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md)'s
  accommodations exist for, and a much smaller residue than the 12 this rule inherited.
- **A test that read one term of a `max` was found and fixed.** ADR-0042's "the reshape aims at
  whichever height costs less" was asserted on `archClearance` alone, which is only one of the
  three things `archRoom` maximises. It held for as long as the hands were the binding term
  everywhere it was tried; with Myco and Sprout standing 0.31 wider the **arm sweep** becomes
  what the aim is buying (aiming clear costs 0.633 → 0.699 of hand clearance and saves
  0.767 → 0.699 of sweep). `cheaperAim` was right; the test was reading a coincidence, and now
  asserts the quantity actually being minimised.
- **Promotion condition.** "Taller" is read off the waist, which is a fixed fraction of shoulder
  height for every body the shape editor can make. A body whose waist is authored independently
  of its shoulders — a different rig, or a `waistY` that stops being derived — breaks that
  identity, and this ADR's `Math.max` would then be picking the higher waist rather than the
  taller dancer. Those are the same thing today and the code says so; if they stop being, revisit
  rather than extend.
