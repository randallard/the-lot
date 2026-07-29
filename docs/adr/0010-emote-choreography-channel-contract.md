# ADR-0010: Emote and choreography share a dancer by channel, classified owned / limited / free
- Status: Accepted
- Date: 2026-07-28
- Deciders: Ryan, Claude

## Context

Promised by `dance/DanceFloor.tsx`'s header and owed since M4. Deliberately written *after*
the render was watched rather than before — the question at its centre ("does a folding arm
read as intent or as a glitch?") is one this repo has repeatedly seen the screen answer
differently from the argument.

Two systems want to write the same dancer every frame. **square-one** drives the
choreography: where each dancer is, which way they face, when a grip engages. **townage's
`AnimationController`** plays an emote: arms, head, lean, bob, silhouette, eyes, effects.
They overlap, and the overlap is not decorative — a square is a shared coordinate agreement,
so one dancer's emote turning them 180° breaks the formation for everyone else, while that
same dancer glancing at their partner breaks nothing at all.

What makes it non-obvious is that the two failure modes look nothing like each other and
the naive fixes each cause the other:

- **Suspend emotes while dancing** (what `Player.tsx` does in free play) kills expression at
  exactly the moment it matters. The square is where the characters are together.
- **Let emotes play through** puts a dancer's arm inside their partner and turns a dancer
  out of the set.

The M4 experiment (`dance/debug-emotes.ts`, watched 2026-07-28) settled the middle ground
empirically. Three emotes, each aimed at one channel, all three verified on screen: arms
that fold only where they trespass and spring back as they clear — and **the fold reads as
intent, not as a glitch**, which is what licenses a hard clamp instead of a softened one; a
head that turns freely mid-grip; and a body that stays straight through a full spin.

The experiment also produced two corrections to the contract sketched on 2026-07-27:

1. **"Facing" is two channels, not one.** A dancer's head facing and body facing became
   different questions the moment heads could turn. A rule that says "facing belongs to the
   choreography" forbids a dancer looking at their partner — which is the whole point of the
   expression layer.
2. **"Lean is free" is wrong.** `rigidParts` (ADR-0012) counts `sin(|leanZ|) · height/2` as
   lateral reach, so a sideways lean *is* silhouette. Only the forward/back lean is free.

That second correction generalises into the rule this ADR actually rests on, and it is why
the classification is derivable rather than a matter of taste.

## Decision

Every channel of `ResolvedPose` is classified as **owned**, **limited**, or **free**, and
its classification alone determines what happens when the choreography and an emote both
want it:

- **owned** — the choreography writes it; the emote's contribution is **dropped entirely**.
  Not blended: a facing that is half the formation's and half the emote's is not a
  compromise, it is a dancer pointing nowhere.
- **limited** — the emote writes it, **clipped** by however much it trespasses on space that
  is not this dancer's. Constrained, never replaced, and never eased at the boundary: a hard
  clamp on a continuous quantity cannot pop, and the render confirms it reads as intent.
- **free** — the emote writes it outright; the choreography does not participate.

**A channel is `limited` exactly when it feeds `rigidParts`** — the silhouette ADR-0012
measures once at mount to size the square. That is the derivation, not a judgement call:
anything an emote can change that the spacing was computed from can invalidate the spacing.

| Channel | Kind | Why |
|---|---|---|
| horizontal position | owned | Not expressible in `ResolvedPose` at all — enforced by the type, not the resolver |
| `bodyDeltaRotY` | owned | Body facing. One dancer spinning is one dancer out of the square |
| a **gripped** arm | owned | While a grip is engaged the hand is a placement, not a pose |
| `rightArm` / `leftArm` (ungripped) | limited | Folded by trespass via `reachAllowance` + `constrainArm` |
| `bodyRadiusDelta`, `bodyHeightDelta` | limited | Body capsule in `rigidParts` |
| `bodyLeanZ` | limited | Sideways lean is lateral reach in `rigidParts` |
| `headRadiusDelta`, `headOffsetX` | limited | Head part in `rigidParts` |
| `headOffsetY` | limited | Moves head height, changing which parts clear each other |
| `headDeltaRotation` | free | Head facing. Nothing about a head can break a formation |
| `bodyLeanX`, `headOffsetZ` | free | Forward/back; ADR-0012 excludes forward overhang laterally by design |
| `bodyDeltaY` | free | The bob — vertical, and bounded |
| `eyeOverride`, `activeEffects` | free | No spatial extent |

**An unclassified channel is owned.** A field added to `ResolvedPose` that nobody has
thought about is dropped for a driven dancer until someone classifies it. Failing toward a
formation that holds is the safe direction, and it makes the omission visible rather than
silent.

This governs **engine-driven dancers only**. The free-play player is deliberately out of
scope — the square is not authoritative over the player, and a square that falls apart is a
playable situation rather than an error. See the planning effort's
[breakdown-is-the-feature](../../../work/square-dance-planning/briefs/breakdown-is-the-feature.md).

## Alternatives considered

- **A global veto — emotes suspend while a call runs.** Simple, correct, and it makes the
  expression layer pointless during the only time two characters are dancing together. It
  is still the right rule for free-play locomotion (`Player.tsx`), where stopping to wave is
  a design choice rather than a conflict.
- **Per-channel blend weights.** Rejected for owned channels on principle above. For limited
  channels a weight is a worse clamp: it scales the whole pose toward rest instead of
  removing only the trespass, so an arm that is 5% too wide loses 100% of its gesture.
- **Ease the limit closed with proximity** rather than clamping at the boundary. Held as the
  fallback if the fold looked like an arm hitting a wall. The watch says it does not, so
  this is **not built** — a feature deleted before it was written.
- **Push expression into square-one** so one system owns everything. Rejected by ADR-0006's
  boundary: square-one is choreography, expression is townage's, and a shared engine would
  have to model every character system to arbitrate.
- **Swept-volume collision over the whole performance.** The honest end state, and the same
  answer as ADR-0012: it belongs with engine breathing (square-one Layer 2), not in a blend
  contract.

## Consequences

- The three channel kinds already exist in code, but **the arbitration is split** —
  `arm-pose.ts` handles arms, `DanceFloor`'s frame loop handles the rest inline, and owned
  channels are enforced by simply not reading them. That works and is verified; consolidating
  it into one resolver is owed, and until it happens "unclassified is owned" holds by
  accident of omission rather than by construction.
- **The limited silhouette channels are decided but not enforced.** `bodyRadiusDelta`,
  `bodyHeightDelta`, `bodyLeanZ`, `headRadiusDelta`, `headOffsetX` and `headOffsetY` are
  classified here and still applied unclipped, so an emote that puffs a dancer up mid-pass
  can clip through their partner. Known, named, and the next piece of work this ADR implies.
- **`bodyDeltaY` is free with a residual risk**, in the same spirit as ADR-0012's unprotected
  forward overhangs: `rigidParts` assumes a fixed body centre, so a bob is invisible to the
  clearance model. A jump that brings a short dancer's head up to a tall dancer's height
  mid-pass is unmodelled. Accepted as bounded; revisit if an emote ever leaves the floor.
- **Every owned channel needs an indicator the expression layer cannot move.** Learned twice
  in one day: a dropped channel and an unwired feature produce the identical picture, so
  `spin` passed its test for a week by doing nothing, and the body's facing was unreadable
  once the emote owned the head marker. Hence two markers on a dancer — head dot for looking,
  chest dot for facing. This is a testing obligation the classification creates, not an
  afterthought.
- Emote authors gain a real guarantee: an emote can never break a square. It can be quietly
  clipped, which is the cost, and the debug scene exists to make that visible.
- **Promotion condition:** if square-one ever drives arms, expression, or per-dancer timing
  itself, the ownership boundary moves and this contract becomes townage's *proposal* to the
  engine rather than its arbitration. Revisit via a new ADR then.
