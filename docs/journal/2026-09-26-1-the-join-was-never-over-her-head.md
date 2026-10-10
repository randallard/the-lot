# 2026-09-26 (1) — the join was never over her head

Ryan watched the `FULL_L` cells the [09-21-3](2026-09-21-3-the-arch-is-at-full-stretch-for-almost-everybody.md)
session built, with four reference photographs beside them:

> the beau kind of has to put their hand directly above the belle's head, or at least that's the
> general idea — in our implementation the beau is just putting his hand up in between the couple
> and that causes the belle to have to reach more than is reasonable

He is right, it is measurable, and chasing it turned up **two clearance defects** that had nothing
to do with the dial built to find them. No ADR yet — *"let's try it out in practice before setting
it in stone"* — so everything new here is a 🧪 dial defaulting to off.

## The rule was inherited from the wrong figure

`archLateral` put the join *"halfway between the two inside shoulders"*, which is ADR-0025/0027's
rule for a **standing** hold, where it is right: two people facing each other hand in hand meet in
the middle. A turn-under is not that figure.

Measured on the shipped cast, the join lands **30%–70% of the separation short** of the turning
dancer's midline. On the default pairing it is 0.050 from the couple's midpoint while her own
midline is at 0.540. And the consequence shows in her hand: taken against her own inside shoulder,
it is **inboard in 18 of the 20 orderings** — she reaches across her own chest, away from her head,
which is exactly the unreasonable reach in the report.

🔑 **The "L" terminology was never the problem.** An L puts the hand `forearmSpan` inboard of the
shoulder, and the shoulder is `restX` out from the midline, so an L lands the hand over the crown
whenever `forearmSpan ≥ restX` — true for Ember (0.605 vs 0.360), Player and Sprout. The L already
says "over your own head." What contradicted it was the join's lateral pulling her hand the other
way.

## Two defects, the same defect, one level apart

Both are a **lateral** clearance term that should vanish above a dancer's crown and did not. Both
were invisible while the join sat between the two of them, and both became load-bearing the moment
it moved over one of them.

**`archClearance`** solves `halfSeparation − lateral ≥ extent + radius` to keep each hand clear of
the *other* dancer's body. Put the join over her midline and `lateral` **is** `halfSeparation`, so
it reads `0 ≥ extent + radius` — unsatisfiable at every separation. `archFits` failed everywhere,
`sizeArch` fell through to its terminal let-go, and the couple stood at **twice** the room. A
change whose entire point was to bring them closer was walking them apart. The premise underneath
that rule is square-one's ADR-0018, *a joined hand in the gap between two heads*; a hand over
somebody's head is not in the gap, and what keeps it off them there is `headroom`, vertically.

**`armSweepClearance`** charged `me.armHalfWidth` against a dancer with **no cross-section at the
sample's height**. `sideExtentAt` already returns 0 above a crown, so the test collapsed to
`|armX − themX| < armHalfWidth` — an arm passing over a head, with the body metres below it, was
failed for not clearing its *axis*. The bisection then answered `2 × (handLateral + armHalfWidth)`
for every pairing.

🔴 **That second one was found by the duck not working.** The number was pinned at exactly 1.280
for `ember/myco` and *did not move* as the belle's crown dropped from 1.530 to 1.330. A clearance
that ignores the thing you are changing is a clearance measuring something else — the binding
sample was the beau's hand, which the duck does not move.

Fixing it turned out to matter more than the dial did: `ember/myco`, `ember/player` and
`ember/ryan` all keep the hold at their own width now, and the whole cast went from **5 to 11**
of 20 holding at `overhead = 1`.

## `reachCeiling` was measuring to the midpoint too

Smaller, same family, found while threading the parameter: the callers measured the across-distance
to the couple's **midpoint**, but the join has never been there — `archLateral` puts it at the
midpoint of the two inside *shoulders*, up to 0.130 away. The height solve was pricing a reach
nobody makes.

It moved one real outcome. `sizeArch`'s terminal-case pair — forearms at the editor's ceiling,
heads at their widest — **no longer has to let go**. That is ADR-0037 part 3 losing a witness, not
losing its reachability, and its test is left failing rather than quietly re-pointed: whether that
case still wants that witness is a decision, not a fixup.

## The duck, and what it is actually for

Ryan, on the styles: *"those would choose between fallback methods, right?"* — which is the call
[`turn-under.ts`](../../src/dance/turn-under.ts) was explicitly waiting on, having refused to rank
the four *"because nobody has looked at them yet."*

So `DUCK_UNDER` got its pose, and it is a **torso drop**, which is where the lever came from: Ryan
asked *"can we make the duck shrink the torso?"* back when the reshape was built. ADR-0043 already
did the hard part — the rig origin drops under her so her **feet stay on the floor** and the whole
change comes out of the top of her.

Three things worth keeping:

1. 🔴 **A duck solved at pose time cannot work**, and the first attempt did exactly that. Its only
   available yardstick is `ArchSizing.width`, which for the pairings a duck exists to rescue is
   *already* the doubled let-go width — the arm clears trivially at that separation, so every
   pairing came back wanting a duck of one centimetre. It belongs in `sizeArch`'s cascade, between
   reaching and letting go, while the pair are still trying to keep the hold.
2. **Scanned, not bisected.** Clearance is not monotone in body height: on `ryan/player`, growing
   the beau took the sweep 1.244 → 1.164 → 1.244. A bisection could settle either side of a dip it
   never saw; a scan in the editor's own steps finds the *least* depth that works regardless.
3. **The least that clears, not the deepest available** — which is what `review-steps`' own watch
   text asks for: *"whether the drop reads as ducking rather than as a shrunken dancer."*

🔴 **And `ryan/ember` is the case that will test that sentence.** A beau far shorter than his
belle: she needs **−1.20** of her 1.41 of body to get under his arm. It is honest geometry — a much
taller dancer really does have to fold a long way — and it will probably look like collapsing. Left
at the editor's bound rather than capped at a guessed fraction, because the number to cap it at is
something to see before it is chosen. There is a test asserting the current cost so that a future
cap has to say what it changed.

## Shrink-and-grow was never broken, and was never going to fix this

Worth writing down because it was the first thing suspected. The reshape is alive and doing heavy
work — on `myco/ember` it grows Myco's crown 1.530 → 2.278 and shrinks Ember's 2.155 → 1.407. But
`reshapeDeficit` only asks *can his hand get to the join height*, and for the three Ember-as-beau
failures it correctly computed a **zero** trade, because his hand could. Forcing the growth anyway
moved the sweep not at all: the join rides on *her* crown, so he chases a fixed target from a
rising shoulder.

A reach lever, aimed at something that was not a reach problem. The duck is the one aimed at the
constraint that actually binds.

## What is on screen

Two dials in the review panel, on the **arch** steps rather than `stand` (the first of the six to
sit anywhere else), both off by default:

- **🧪 join overhead** — the join from the shoulder midpoint to over the turning dancer's crown.
- **🧪 pair closes** — the couple from their handhold's width to the tightest the figure can still
  be delivered at. 🔑 `100%` is **bisected, not `bodies`**: `archRoom` floors the required room at
  `bodies` and square-one answers a clearance at or above the couple's width with its *cap*, so a
  naive floor there would push every pairing into let-go under a dial named *closer*.

`DUCK_UNDER` is off the review panel's "no pose yet" list. `CASUAL` is still owed one.

## Next

- Look at it. `myco/ember`, `myco/player`, `myco/ryan`, `player/ember`, `sprout/ember` and
  `sprout/ryan` close up and keep the hold; `ryan/ember` is the duck to judge.
- Then the selection rule (PROGRESS item 13) has its trigger: a pairing whose partner's arm cannot
  clear the turning dancer's head **cannot dance a `FULL_L`**, which is a measurable fallback
  condition rather than a coin flip.
- Then one ADR covering the overhead join, the closing, and whether the four styles rank.
- `CASUAL`'s pose.
- Nine orderings still let go at `overhead = 1`; none of them has been looked at yet.
