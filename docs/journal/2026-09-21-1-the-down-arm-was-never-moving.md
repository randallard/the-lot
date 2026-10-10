# 2026-09-21 (1) — the down arm was never moving

The 08-23 defect, open for four weeks. Ryan picked it up mid-Myco: *"there is an issue that
propogates to the other characters as well when passing under the raised arm the other arm
switches sides — can you see where we talked about this before?"*

We had. `~/Development/work/square-dance-planning/PROGRESS.md:436`, with his verbatim report
and three screenshots, carried forward in this repo's PROGRESS as item 3 and in the planning
effort's as *"the last thing left from that day."* A review cell already existed for it:
`#review=california-twirl/under-arch/*`.

## The arm was never moving

That is the thing worth writing down. The belle's down arm does not swing anywhere. It gets
**re-labelled** — and it is the *other* arm, the held one, whose label moves.

`insideSide` reads the partner's bearing in the dancer's own frame. That moves when either the
partner moves **or** the dancer turns, and a Twirl does both, out of phase: the belle walks the
diameter at a steady 180° while the beau bows around an arc. So her joined hand reads `left`,
then `right`, then `left`, and "the down arm" is just whichever one is left over.

Walked at quarter-beat resolution through the real engine, `player/myco`:

```
beat 1.00  belle inside=left    ← screenshot 1: "starting the twirl - right arm down"
beat 1.25  belle inside=right   ← screenshot 2: "as if becomming the left arm"
beat 2.75  belle inside=right
beat 3.00  belle inside=left    ← screenshot 3: "the down arm becomes the right arm again"
```

Two flips, and it comes back — *"it does switch back but … it's weird."* Same on
`sprout/ember`, so it is the figure. The beau never flips, which is why only she shows it.

🔑 **The endpoints agree.** She reads `left` at beat 0 and `left` at beat 4. The two rotations
cancel exactly at the ends and only disagree in between. That single fact is what made the rest
easy: it means the swap is a **phase error**, not a change of side, so pinning the answer
throws nothing away.

## The half nobody saw

`poseArms` reads the role off the same side — `const beau = side === "right"`. So for the seven
quarter-beats the belle's hand read `right`, **both dancers were the beau**: two palms up, both
applying `+hold.lateral`, writing two different contact points for one hold.

That is worse than the reported defect and had gone unreported for four weeks, because an arm
teleporting across a body is louder than a hold drifting a few centimetres apart.

## The engine had already answered

I had a latch half-designed — per-dancer state, seeded on the first frame of the hold — before
checking what square-one actually hands over. `GripSpan.hand`. Its own type doc:

> A grip span is for a hold the **figure** imposes, which the placements cannot reveal.

Printed across the shipped pairings: beau `right`, belle `left`, beat 0 to 7.5 — two whole
Twirls, one answer, never changing. `DanceFloor` was *already reading it* into `track.arch` and
using it only to report. The fix is to pass it instead of a bare `true`, plus one line in
`touchingSide`.

🔑 **And the latch would have been actively harmful.** `#review` seeks straight to a beat.
Landing on `under-arch` would have latched the swapped value — preserving the defect inside the
one instrument built to find it. I would not have noticed that until watching it fail.

Lesson, and it is the third time this effort has taught it: **when the-lot and square-one both
seem to know something, square-one knows it.** The consumer re-deriving a fact the engine
declares is the shape of this bug, ADR-0027's preference constants, and ADR-0046's role-versus-
body confusion.

## What landed

[ADR-0056](../adr/0056-a-declared-hold-keeps-the-hand-the-figure-named.md). `touchingSide`'s
`declared` goes `boolean` → `DeclaredHold = boolean | "left" | "right"`; `DanceFloor` passes
`track.arch`. Three states because there are three — undeclared (ask the placements), declared
without a hand (the turn-in dial: skip the facing gate, still ask the placements, because nobody
is turning), and a named hand.

`declared-hold.test.ts`, 7 tests. The old behaviour is pinned as a **finding** — the flips at
1.25 and 3.0, and the seven both-beau quarter-beats — not deleted. A fix whose test shows only
the good state cannot tell anyone what it bought.

Suite 736 → 743 passing, **the same 36 failures**, same 8 files: the Myco set from 09-20,
untouched. `tsc` clean, lint 0 errors / 25 known warnings.

## Next, and it gets harder

Fixing this makes the *other* half of the same 08-23 report more visible. Once her arm stops
teleporting, her joined arm has to genuinely wind through 180° over her own head — Ryan's
*"upside down L with the invisible upper arm and the forearm then is horizontal over the head"*
— and nothing poses that yet. `TrackedArms.arch` is still reported-and-undrawn.

Which runs straight into his second question this session: **Myco's arm passes through her
head.** Swept the cast — it is not Myco:

| | shoulder sits outside own head by | arm | crosses in at |
|---|---|---|---|
| ember | **0.022** | 0.935 | −22° |
| player | 0.081 | 0.545 | −5° |
| sprout | 0.115 | 0.300 | +8° |
| myco | 0.140 | 0.350 | −8° |
| ryan | 0.209 | 0.690 | −5° |

**Every character's forearm enters their own head once the arm raises inward past roughly
horizontal.** Myco is where you *see* it (head radius 0.490 against a 0.350 arm — she can bury
the whole thing), Ember is where it is geometrically worst.

And there is no guard at all: every consumer of `ArmMetrics.parts` is **pairwise**
(`arch.ts:449`, `arm-pose.ts:1546`), and the one self-reference — `arch.ts:99` — uses it for a
height, not a collision. The exclusion is on the record as deliberate, citing Ryan 2026-08-17
(*"sometimes arms will be set wide … we don't need to build for"*) — but that ruling was about
an arm through its owner's **torso**, and the head was never separately asked.

The material exists: `rigidParts()[1]` is the head as a sphere, and `clearFloor` (ADR-0055) is
the template — swing about the shoulder until it clears, limited channel only. The owned arm is
the interesting half: a joined hand has nowhere else to be, so the only free variable is the
**elbow**, which swings on a circle about the shoulder–wrist axis. Choosing the elbow that keeps
the forearm out of the head *is* the upside-down L. The turn-under and the head guard are one
mechanism seen from two ends.
