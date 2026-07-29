# 2026-07-28 (3) — Enforcing the limited channels

*Documents commit `66b1b65`. Continues from
[writing ADR-0010](2026-07-28-2-writing-adr-0010.md).*

ADR-0010 classified six channels as `limited` and left them unenforced. This closes that.

## First: a correction to the ADR I wrote this morning

Its Consequences say the limited silhouette channels are *"classified here and still applied
unclipped, so an emote that puffs a dancer up mid-pass can clip through their partner."*

**That is wrong about dancers**, and I only found out by going to enforce it. `Dancer` builds
its geometry from `shape` at mount and `DanceFloor` never wrote a scale — so
`bodyRadiusDelta`, `bodyHeightDelta`, `headRadiusDelta` and the head offsets were not
"applied unclipped", they were **not applied at all**. Silently dropped. Which is to say they
were being treated as `owned`, by exactly the accident-of-omission the ADR names two bullets
later as the weak point of the split arbitration. `bodyLeanZ` was the one that really was
applied unclipped, and the sentence is accurate for the *player*, which `mergeAnimation` has
always fed the full deltas — but the player is out of the ADR's scope, so that is no defence.

The ADR is Accepted and its Consequences are frozen, so this entry is the correction, per the
same rule that governs journals. No supersession: the *decision* is untouched — the six
channels are `limited`, and they now behave that way. What was wrong was a description of the
code, not a choice.

Worth noticing that the error had the shape the ADR is about. I looked at a channel doing
nothing and wrote down a reason for it that was one layer off, which is the same mistake as
looking at `spin` doing nothing and calling it a passing test.

## What enforcement had to do

Two jobs, then, not one: make the channels *play*, and clip them. `src/dance/silhouette-limit.ts`,
pure and tested; `DanceFloor` calls it once per dancer per frame.

The model is the arm envelope's, deliberately — the problem is the same one wearing different
clothes, and a second arbitration idiom in the same file would be a third thing to keep
consistent. A dancer may use their **share of the live slack**: the room between what the pair
needs at rest (the ADR-0012 number) and what they actually have this frame, split by body
radius exactly as `reachAllowance` splits it for arms. Inside that share the emote plays
untouched; past it, it is scaled back until it fits.

Two properties inherited whole from the arms, both worth stating because both are what stop
this reading as a glitch:

- **Zero cost when there is room.** One evaluation, and a dancer with the floor to themselves
  is never touched. Nobody deflates for a pass that isn't happening.
- **Shrinking is never limited.** The limit is on trespass, not on change. An emote that makes
  a dancer *smaller* cannot break a formation, so it is never clipped however tight the square.

Measurement goes through `lateralClearance` rather than comparing radii, which buys ADR-0012's
height awareness for free: a head that grows *above* the partner's costs nothing, and a body
that stretches until two heads meet at the same height costs something even though no radius
changed. That second case is real and I would not have thought to hand-code it.

## The search returns only what it has verified

First attempt scaled proportionally — `k *= allowance / need`, three passes. The invariant test
caught it overshooting by 5×10⁻⁵: the required clearance is only *nearly* linear in `k`,
because the lean term carries a `sin` and the height-aware term a `√(r²−dy²)`.

The fix is not more passes, it is a different guarantee. It now bisects, and only ever returns
a `k` it has **measured and found feasible** — `lo` starts at 0, the resting silhouette the
square was measured from, which always fits. Twelve steps resolve the surviving fraction to
about 1/4000 of the emote, and none of it runs unless a dancer is actually trespassing.

The tempting move was to loosen the test to `allowance + 1e-4`. The invariant *is* the module;
a tolerance on it would have been the module quietly not doing its job.

## Tests

19 new, 285 total. Two carry the weight:

- **`inflatedParts` reproduces `rigidParts` exactly at k = 0.** The formula is restated so the
  frame loop can build it without allocating, and this is the only thing stopping the copy
  from drifting away from the original. It caught the head-height coupling while I was writing
  it: growing the body's radius or height lifts the head, because the head rides on the torso.
- **The pair stays clear at every point of a closing pass, both dancers puffing at once.**
  Walks them in from clear to touching and asserts what the module exists for — that the sum
  of what they take never exceeds the room between them.

## To watch

A fourth debug emote, **puff up**, at `#dance`. Nearly doubles the body radius and swells the
head — deliberately gross, because a subtle puff would be indistinguishable from no puff, which
is the trap `spin` sat in for a week. It should swell in full while the pair is apart and be
squeezed back as they close, per dancer, by their own share of the gap.

**Watched, and good on all counts** (Ryan, same day). The squeeze reads as a breath rather
than a stutter — which is the judgement the tests could not make, and the same one the arm
fold needed. So the hard clamp holds for a second channel: no easing, no proximity ramp, no
softening at the boundary. Two for two now, and it is starting to look like a property of the
*model* rather than luck with the arms: a limit that only ever removes the trespass, applied
to a quantity that was already moving continuously, does not announce itself.

That closes the last open item in ADR-0010's `limited` class. Every channel the ADR names is
now classified, implemented, and verified on screen.

## Still open

The arbitration is still split — `arm-pose.ts` for arms, `silhouette-limit.ts` for shape,
`DanceFloor`'s frame loop wiring them together and enforcing `owned` by not reading it. Three
places now rather than two, which is the honest cost of enforcing a channel before consolidating
the resolver. ADR-0010 names the consolidation as owed; this did not pay it down.
