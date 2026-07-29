# 2026-07-27 — the arm envelope, and an experiment before the ADR

*Documents commit `107479f`, which landed this together with the following day's watch —
the two are one experiment and could not be separated in the tree by the time either was
committed. Continues from
[the grip was easing, not holding](2026-07-26-the-grip-was-easing-not-holding.md), and is
continued by [the buttons were lying](2026-07-28-the-buttons-were-lying.md).*

Two things happened: Allemande Left's turn direction was finally verified by eye, and the
ADR-0010 conversation turned into code instead of prose.

## Allemande Left turns CCW — verified

The watch list's highest-risk item, and the one nothing but a render could settle: the
column had been wrong once in square-one's spec and corrected on 2026-07-25 with no way
to confirm the correction. Ryan watched it on 2026-07-27 and it is **counterclockwise,
each dancer's left side toward the pivot**. Render-validated, not argued. Judged off the
facing marker rather than the arms, since the arm posed is the one nearest the pivot by
construction and so cannot disagree with the engine either way.

## The tuck became an envelope, because Ryan asked a better question

The ADR-0010 discussion started from my model: choreography *owns* transform, facing, and
any arm involved in contact; emotes own everything else. Ryan pushed on the arm half:

> pass thru has no hold so I think any emote is fair game except where the arms squeeze in
> — that part of the emote would also squeeze in? what if a character was doing a quick
> spin at the moment of arms squeezing in? could the squeeze be each arm as it came into
> the relevant area?

That distinguishes two things I had bundled:

- **A grip is a placement.** The forearm goes *here*, because that is where the other
  dancer's arm is. Nothing to negotiate — the emote's contribution to that arm is dropped.
- **A tuck is a limit.** It says only how far out an arm may be, not where it goes. So the
  emote should keep writing the arm and the limit should clamp whatever it wrote.

Which answers the spin directly: an arm swinging through a full-body emote folds *only
while it is in the shared space* and springs back as it swings out, per arm, as each one
arrives. Nobody parks both arms for a whole pass; you fold the shoulder that is passing.

### The envelope

```
reachAllowance(me, them, separation) = separation × myRadius / (myRadius + theirRadius)
```

Each dancer may reach toward their partner as far as their **proportional share of the
live gap**, measured from their own centre. Two properties make this the right shape:

- The two allowances **sum to the whole separation**, so two arms each honouring their own
  can touch and cannot overlap, whoever is bigger.
- At the closest distance the frame permits — where `separation` is the pair's
  `lateralClearance`, itself never less than the two body radii — a dancer's share resolves
  to **exactly their own body radius**, which is the old fixed tuck. The generalisation
  subsumes the thing it replaces rather than sitting beside it, which is the test of
  whether a generalisation is real.

`constrainArm` then folds any pose by however much its furthest drawn point trespasses,
along the partner's bearing. Feed it a resting arm and you get yesterday's tuck; feed it an
emote and you get Ryan's squeeze. `tuckPose`, `tuckNearness`, `tuckExposure` and the
`tuckX` metric are gone — three knobs and a stored constant replaced by one bound with a
proof.

**One deliberate behaviour change:** the old tuck was anticipatory, easing in from 2×
clearance via a smoothstep. The envelope engages when the arm would actually trespass,
softened only by a `PERSONAL_SPACE` margin of 0.06 (the same daylight the default frame
scale leaves between passing bodies). So arms fold later and more decisively than
yesterday. Whether that reads as intent or as hitting a wall is the thing to watch — it is
a hard clamp on a continuous quantity so it cannot *pop*, but it can still look abrupt. The
fix, if needed, is to ease the envelope closed with proximity rather than clamp at the
boundary.

## Dancers can emote now

`Dancer` gained `expression` refs (body, head) and `DanceFloor` a `controllers` prop — one
`AnimationController` per occupant. Per frame the driver ticks it and:

- **arms** go in as a *proposal* to `poseArms`, which folds them where they trespass and
  drops them entirely on a hand the engine has engaged;
- **`bodyDeltaY`, lean, head rotation** are applied straight through — an emote owns those
  outright, because none of them can break a formation;
- **`bodyDeltaRotY` is dropped.** A spin emote may not turn a dancer in a square. Facing
  belongs to the choreography, and dropping the channel is the whole of that rule.

`NEUTRAL_POSE` stands in for a dancer with no controller, so there is one code path rather
than two, and a stopped emote cannot leave a channel stuck where it left it.

An emote's arm is a *rotation about the shoulder*; the dance layer works in where the arm
ends up. `proposeArms` converts — same rig either way, one group per shoulder, so it is a
change of description rather than of pose. Note the mirror: emote arm names were authored
against the player rig, where "left" is the group at −x, and −x is a dancer's anatomical
*right*.

## The experiment

`src/dance/debug-emotes.ts` — three emotes built in code, because real ones live in
`localStorage` and an experiment that depends on whatever happens to be saved is not an
experiment. Each aims at one channel of the contract, and each has an expected answer:

| emote | channel | expected |
|---|---|---|
| wide arms | limited | swing freely, fold only while between a passing pair, spring back |
| spin | owned (facing) | **nothing at all** happens to a driven dancer |
| look around | free | plays untouched always, including mid-grip |

Buttons in the debug panel fire them on both dancers at once — the interesting frames are
where both are reaching simultaneously.

## Tests

266 in the suite. The new one worth naming: **both dancers swinging both arms wide for
whole calls, and no arm ever crossing another** — far more than any real emote asks for, at
the worst possible moment. Also that an emoting arm is untouched when there is room (folded,
not parked), and that a gripped hand ignores the emote entirely.

## Why the ADR still isn't written

Deliberate, and it is ADR-0005's cut-to-code stance applied to ourselves. "Clip vs
constrain, and does a folding arm read as intent or as a glitch" is exactly the class of
question this repo has spent two days watching the render answer differently from the
argument. The ADR gets written from what the experiment shows.

What the ADR will say, pending that: three kinds of channel — **owned** (position, facing,
a gripped arm), **limited** (any other arm, and probably the silhouette deltas), **free**
(head, lean, bob, eyes, effects) — arbitrated in one resolver rather than in scattered
conditionals, with clipping as the conflict rule.

## Two things it will *not* say

**The player's case is out of scope**, and now has its own recorded position: the planning
effort's [breakdown-is-the-feature](../../../work/square-dance-planning/briefs/breakdown-is-the-feature.md)
brief. The square is not authoritative over the player; a square that falls apart is a
playable situation, not an error. So ADR-0010 decides which system writes which channel of
a *dancer*, and says nothing about how much the world insists.

**The free-play emote veto stays** (`Player.tsx:153`, `} else if (!isEmoting) {`). While a
performance owns you the driver writes position and the veto is irrelevant; in free play,
stopping to wave is a real design choice. If an emote ever wants to move, the honest fix is
a `locks` flag on the `Emote` type rather than a global rule.

## Still open, found on the way

`ResolvedPose` carries `bodyRadiusDelta`, `bodyHeightDelta` and `headRadiusDelta` — an
emote can inflate the **silhouette**, which is exactly what ADR-0012 measures to size the
square, and it is measured once per cast at mount. So an emote that puffs a dancer up
mid-pass can clip through their partner, and no arm logic catches it. Unwired in the
experiment on purpose, to keep it focused. Same answer as the arms, most likely: constrained
while close.
