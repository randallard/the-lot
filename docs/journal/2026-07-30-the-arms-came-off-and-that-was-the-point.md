# 2026-07-30 — the arms came off, and that was the point

Ryan watched the fist bump and sent two screenshots. Far apart and facing away: the forearms
and hands detached, floating in the gap between the two characters. Close together: the fists
didn't read as meeting, and read as sitting at different heights.

I read the first one as a bug and proposed the obvious fix — wire `canBump`, grey the wedge
out, decline the move when it's out of reach. That was wrong, and the correction is the whole
entry.

## The reframe

Ryan's note:

> at the end of the day these are characters — for players, avatars — both hiding parts of our
> real selves and at the same time, allowing us to express ourselves in ways that our real
> bodies are limited … what if an emote could take one arm as a paddle and toss the other fist
> up to lob across the dance floor where someone could lob it back — mid dance even … what if
> dancers could trade heads! chaos! So I do want to leave some of that unrestricted
> deliberately.

`arm-pose.ts`'s opening docstring has said since M4 that it "does not model reach or
attachment: an arm is not obliged to stay plausibly connected to a shoulder." I had read that
as a concession — caricatures have no upper arms, so don't pretend. It isn't a concession. It's
an affordance, and the roadmap wants it.

Which changes what's wrong with the screenshot. **The arm leaving the body is not the defect.
The defect is that nothing authored it leaving.** An unhandled case and a deliberate absurdity
look identical on screen and are opposites in the model, and there's no way to tell them apart
after the fact — which is the same shape as every other defect this repo has caught in the arm
work: it looked right and measured wrong, or looked wrong and *was* right.

So reach stops being a gate and becomes an authored rule: `decline`, `reach`, `lean`, `none`.
The move chooses. The model doesn't impose.

## What the primitive actually is

I'd been designing toward "two anchors meet." The paddle and the traded head say it's smaller:

> **a part, a destination, and who owns the part when it gets there.**

Contact is the special case where the destination is a shared point and ownership returns to
the body. A lob is the same three fields with the destination being the partner and ownership
transferring. Trading heads is two of those, crossed. Ownership transfer isn't new machinery —
[ADR-0010](../adr/0010-emote-choreography-channel-contract.md)'s owned-channel rule and
`FistBumpDriver`'s `drivenArms` are already exactly that, currently aimed only at arms and only
for the length of a gesture.

That gives a cheap test for whether the first cut has painted us in: **can the spec express
"role A's right hand goes to role B and stays there"?** If the schema bakes in "both anchors
return to rest," it can't, and the chaos gets designed out by accident. Two fields prevent it —
`attach: rigid | free` on the anchor, and an `exit` that includes being owned by someone else.
Neither is implemented. Both exist in the shape.

## Why not keyframes

The other half of [ADR-0016](../adr/0016-contact-moves-are-authored-constraints-not-keyframes.md).
The obvious editor is "`EmoteBuilderModal`, but with two characters," and it can't work:
`ResolvedPose` is single-character by construction, with no partner reference and no world
space anywhere in it. Planning ADR-0008 already found that.

But the deeper reason is that the fist bump's own maths argues against angles. `contactFraction`
splits the gap by reach so the longer-armed character covers more of it; `gripHeight` picks a
shared height from both bodies; `reachAllowance` is where "a child cannot raise their arm to an
adult's" will live. All of it exists so a bump between mismatched bodies works *without* being
re-authored. Author joint angles and every pairing needs its own take, and the dancer-size
brief's accessibility rule stops falling out of the geometry and becomes a special case.

Three different things in this repo are called a pose, which is most of why this was confusing:
`arm-actions.ts`'s `ArmPose` is joint angles, `dance/arm-pose.ts`'s `ArmPose` is a placement
plus an aim vector, and what a contact move needs is neither — it's the constraint that
*produces* the second one.

## Two silent defects the design work turned up

Neither is visible without looking for it:

- `armMetrics` sets `handRadius = shape.hand.open.radius` unconditionally
  (`src/dance/arm-pose.ts:141`). A closed-fist bump is currently solved with the **open** hand's
  radius, so the fists are separated by the wrong amount by construction. Ryan asked for a
  closed-hand selector thinking it was cosmetic; it changes the contact maths.
- `gripHeight` is the acknowledged placeholder — the mean of resting elbow heights — and the
  second screenshot is a very unequal pair, which is precisely its documented failure mode. The
  overlay already prints min → max per quantity. Measure it; don't eyeball it. That rule has
  been earned three times here.

## And the counterweight

One more thing from the same conversation, recorded as a planning brief rather than an ADR
because there's no content to filter yet: some people at a dance aren't ready for the chaos.
They're learning the moves. They'll want to turn the antics off.

The load-bearing part is that it's **receiver-side** — it filters what I see, never what you
can do — and that it splits in two. Things happening *near* me are a render-time filter and are
later work. Things done *with* me are not a filter at all: the move simply never appears on my
partner's wheel. Which lands on ADR-0016's availability predicate, and is why that predicate
takes both participants' preferences and not just body metrics. One parameter now; expensive
to thread through later.

That, plus classification tags authored from day one with nothing reading them, is all this
design owes the idea today.

## Next

Build the first cut: make the fist bump authorable. Two roles, stance presets with the
predicate wired, anchor plus hand pose, per-axis resolution rules, the existing envelope. No
phases, no travel — travel is square-one's, and "touch a quarter" is a contact spec attached to
the `arm-turn` block, not waypoints in this editor.

And then watch it, because the standing rule here is that contact has read fine in code and
measured wrong on screen three times.
