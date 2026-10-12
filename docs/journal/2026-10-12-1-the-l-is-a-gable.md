# 2026-10-12 (1) — the L is a gable

The picture [10-11 (4)](2026-10-11-4-the-l-is-a-level-forearm.md) was waiting on arrived as eight
frames of Ryan and a partner dancing a California Twirl, shot from behind the starting couple.
🔴 **The photos are not in the repo and are not to be added** (Ryan). This entry is the record.

Ryan, sending them: *"I called it L but I think that's misleading, now that I look at it."*

## The reading — confirmed by Ryan (*"I think you've got the beats"*)

Angles are by eye from one low camera; depth is mostly lost.

| Beat | Joined hands | Her held arm (left) | His arm (right) |
|---|---|---|---|
| stand | hip height, midway between them | nearly straight, down and in | same |
| ~1 | her crown height, midway between them; both have turned in to face | upper arm level and forward, forearm vertical | sloping up ~35°, slight bend |
| ~1.5 | above both heads, she is starting under | steep, nearly straight | steep, nearly straight |
| 2 | directly over her crown, about half a head above it | upper arm near vertical, elbow about crown height out over her own shoulder, forearm up and in ~35°, bend ~110° | upper arm up and across ~45°, forearm up and in, bend ~130° |
| 3 | between them again, behind her left shoulder | upper arm out to her side ~35° above level, elbow near ear height, forearm up and back | mostly hidden |
| ~3.5 | her shoulder height, between them | elbow down at her ribs, forearm vertical | hidden |
| end | hip height, low hold | relaxed, bent | relaxed |

🔑 **What it says, against what is built:**

- **Both arms, leaning in to a peak** — a gable. Neither forearm is ever level. 10-11 (4)'s
  *"the whole point is for the forearm to sit parallel to the floor"* does not survive the
  picture, and neither does the 08-23 *"forearm horizontal over the head"*.
- **The elbow travels**: in front of her at shoulder height → beside her head at crown height →
  out to her side → down by her ribs. ADR-0058's "highest point on the circle" matches the
  beat-2 frame only.
- **The join stays over the centre of the exchange and she walks under it.** Midway between
  them at the quarter, over her crown at the midpoint (where she *is* the centre), between them
  again at three-quarter. 🧪 My reading, not contradicted; not yet tested on screen.
- **The join is low**: a hand above *her* crown. `archHeight` lets it rise toward the taller.
- **Neither arm is straight.**
- **The lift happens during the turn.** No frame has both on their spots with the arch up,
  which is what `arch-up` at beat 0 draws.

Answers to 10-11 (4)'s four questions: both arms · her elbow level with her crown and out to the
side, not above her head · his hand clasped on hers at the peak, his arm crossing the gap · the
level forearm holds nowhere.

## Ryan's rulings, 2026-10-12

- **`full-l` is renamed `gable`.** *"Gable is great replace full-l."*
- **The head-tip is normal, in every style.** *"she didn't really need to but it's reflex and I
  think even in lazy when they're not connected people do it as part of the pantomime."*
  🔴 Not built. Head facing is the emotes' channel (ADR-0062); a tip is a pitch, and who owns it
  is undecided.
- **"Duck" means shrinking the dancer.** *"when we say duck it's really referring to the need to
  shrink the dancer to make the geometry work in the-lot."* Which is what `duckRoom` already is;
  it is not the head-tip.
- **The pass really is that close** — she brushes him — *"and notice that the squeeze isn't
  necessary."* Consistent with `FOLD_FREE_ARMS = false` (10-11 (2)).

## Done

- `FULL_L`/`"full-l"` → **`GABLE`/`"gable"`** and `LAZY_L`/`"lazy-l"` → **`LAZY_GABLE`/`"lazy-gable"`**
  across `src/dance/` (Ryan: *"Gable is great replace full-l"*, then *"lazy L to lazy gable"*).
  Labels read `· the gable`.
- 🔑 **The step ids never carried the name**, so there was nothing in them to update: the happy
  path is the unsuffixed id (`quarter`, `under-arch`, `three-quarter`) and the siblings are
  `-duck`, `-lazy`, `-casual`. Every `#review=` address written in an earlier journal still opens
  the pose it meant. Ryan asked for the ids to be updated too; if he wants the gable spelled into
  them (`under-arch-gable`), that breaks those addresses and is his call.
- The three gable `watch` texts (`quarter`, `under-arch`, `three-quarter`) and `turn-under.ts`'s
  doc are rewritten to the table above. The watch text is the specification (ADR-0057).
- 🔴 **The ADRs still say "the L", `FULL_L`, `LAZY_L` and "forearm horizontal", on purpose.**
  Ryan: *we'll supersede the L in the ADRs once this is proven.* Until then ADR-0057 (the four
  names) and ADR-0058 (the upper arm stands up) are Accepted and describe the old vocabulary and
  the old elbow rule. When the gable is accepted on screen, new ADRs supersede them — one
  decision each — and their Status flips. Not before.

Suite **932 / 38 / 3 skipped** (the same 38), `tsc -b` clean. **Uncommitted** — Ryan verifies.

## Measured, throwaway harness (deleted)

`duck.test.ts`'s real-pose-path harness, widened to all 25 orderings, both arms, beats 1–3, at
`overhead` 0 and 1. 🔴 Coarse: it disagreed with the floor about hands touching on a reshape, so
only the robust readings are kept.

- **She is exactly at the centre of the exchange at beat 2**, every ordering. So "over the
  centre" and "over her crown" are the same point there, as the photos need.
- **Neither setting of the `overhead` dial keeps the join over the centre.** At `0` her hand is
  0.07–0.83 from the centre at beat 2 (`player/player` 0.47, outside a 0.28 head). At `1` it is
  over *her* at all three beats, so at beats 1 and 3 it has left the centre by up to 0.75 — it
  follows her instead of her walking under it.
- **The pair are far apart at beat 2**: 0.42–1.71 between centres, `player/player` 1.02 at
  `overhead` 0. The photo has them brushing.
- Her arm is already bent (58°–139° at beat 2), forearm 18°–90° above level, elbow 0.06–0.74
  **below** her crown where the photo has it level with it.

## The plan, whole (2026-10-12)

Scope stays frozen to the **gable** on the California Twirl until Ryan accepts it across the
cast. Each step is watched by Ryan on the review page before the next is leaned on.

0. ✅ **The reading, the names, the specification.** Above.
1. **The join is a fixed point over the centre of the exchange, at the low height** — a hand
   above *her* crown, not clear of the taller dancer. She walks under it; it does not follow
   her. Replaces the `overhead` dial rather than adding a setting to it. Watch
   `#review=california-twirl/under-arch/player-player`, then `quarter` and `three-quarter`.
2. **The pass is brush-close.** With the hands above the heads there is no hand in the gap at
   head height, which is what ADR-0038/0039 charge the figure for. The beau's bow shrinks to
   what the two bodies need. No squeeze (`FOLD_FREE_ARMS` stays `false`).
3. **The elbow has a direction per beat**: forward of her at the quarter, up beside her head at
   the midpoint with the elbow level with her crown, trailing out to her side at three-quarter.
   Only what 1 and 2 leave wrong. The rules checker judges it.
4. **The lift happens during the turn.** Hip height at the start, her crown height by the
   quarter, the peak at the midpoint, her shoulder height on the way out, hip height at the end.
   Whether `arch-up` at beat 0 survives is decided here.
5. **The head-tip, in every style** including the lazy gable. Needs an owner first: head facing
   is the emotes' (ADR-0062) and a tip is a pitch.
6. **The contact sheet** (worklist 17) — all 25 orderings at one step, the checker's verdict
   under each — and Ryan accepts the gable on it.
7. **The other three styles from the gable**: the lazy gable is the same pantomime with the
   hands apart; the duck is the gable with the dancer shrunk when the geometry needs it; casual
   last.
8. **The ADRs, once it is proven.** New ADRs supersede 0057 (names) and 0058 (elbow rule), and
   whichever of 0025-as-applied-to-the-arch, 0041 (join height) and 0038/0039 (the hand in the
   gap) steps 1–2 turned over. One decision per file; old Status flipped; nothing amended.
9. **Then the 10-10 track resumes**: drag handles and save, carry-over, keyframes.

Parked: Dosado and Pass Thru without the fold, `BREAK_COMFORT`'s value, the selection rule, the
three tests 09-30 left failing.

## Step 1, built the same day — the join is held over the centre

🧪 Exploratory, no ADR, **uncommitted and unwatched**.

- `TouchHold.over` (`arm-pose.ts`): a **world** point the joined hands are held over, with a
  weight. `poseArms` eases the hand from where the pair carry it to that point. Absent, nothing
  changes.
- `DanceFloor`'s **`archOverCentre`** (default `false`): on entering an arch span it samples both
  motions at the span's first beat, takes the couple's midpoint as the centre, and hands it to
  the arch hold on the arch's own blend. It sizes and plans the arch as `archOverhead = 1`,
  because at the midpoint she *is* the centre.
- Review page: **🧪 join over the centre**, **on by default there**, and it disables the
  `join overhead` dial while on. `#dance` is unchanged.
- `over-centre.test.ts`, 28 tests through the real pose path, all 25 orderings.

📏 **What it does.** Both hands land within 0.10 (hers) and 0.16 (his) of the centre at beats 1,
2 and 3, in every ordering; carried with the pair, hers is 0.37 off at the quarter on
`player/player`. The flat distance between the two hands falls from up to 1.10 to at most 0.22.

🔴 **What it costs, and it is step 2.** The beau passes exactly `ArchSizing.wanted` from the
centre at the midpoint, and for **12 of 25** orderings that is further than his arm goes, so the
solve lengthens his undrawn upper arm (0.07–0.92) instead of letting the hands part. The checker's
arm-length rule should say so on screen.

🔑 **Two things found about the pass distance**, both for step 2:

- **`wanted` is already the bodies' own room for about half the cast** (`player/player` 0.62 =
  0.62). On these bodies "brush-close" is two *heads* passing — a 0.28 head on a 0.15 torso —
  so the photo's belly-to-back pass is not available by shrinking the bow alone. The hand-in-the-
  gap charge is the other half: 0.03–0.50 over the bodies on the rest.
- **When `wanted` comes within a hair of the width, the beau stands off by about 1.5 widths**
  (`myco/ryan` 1.71, `ryan/player` 1.58, `ryan/sprout` 1.47, `player/sprout` 1.02) instead of
  `wanted`. That is square-one's bow being bounded near the width (`calls.ts`, by the comment at
  its line 202) — and it is exactly what the `pair closes` dial at 100% drives every closing pair
  into. Closing the pair makes the midpoint pass **wider**, not tighter.

🔴 Not done in step 1: the low height. The join's height is still `archHeight`'s, which rises
toward the taller dancer where both can reach. It threads through eight functions in `arch.ts`
and wants doing with the pass distance, since a lower join is where a head is wider.

**Next:** Ryan watches `#review=california-twirl/under-arch/player-player`, then `quarter` and
`three-quarter`, with the switch on and off. Then step 2, starting from the two findings above.

Suite **960 passing / 38 failing (the same 38) / 3 skipped**, `tsc -b` clean, eslint 0 errors.

## Ryan's first look at step 1, and three corrections

Switch on. `under-arch/player-ember`: *"looks good."* `quarter/player-ember`: *"whys his arm way
up there"* — then, of the same cell: *"ember's lean is messing that up her crown is farther
forward from her hand."* And of `under-arch-casual`: *"lazy and casual on the break should just
be arm pointing up — not out … his arm is neck chopping her and her arm … she wouldn't work that
hard — funny I said she'd duck her head in the pantomime but her arm would stay maybe just
pointing into the air a little but not raise her elbow."*

🧪 All three below are exploratory, no ADR, **uncommitted and unwatched**.

**1. A join that is being made sits low.** The owed half of step 1. `player/ember`'s join was
0.58 above her crown, because `archHeight` rises toward clearing the taller dancer when both can
reach, and he is much the taller. With the switch on, `DanceFloor` now clamps the hand's target
to `crownOf(belle as worn) + headroom` (`headroom` is exported from `arch.ts` for it).
🔴 **Clamped at the pose only.** `sizeArch` still sizes the figure for the higher join, so the
sizing and the pose disagree — ADR-0037's class of defect, taken on knowingly until the low
height is threaded through `arch.ts` with the pass distance (step 2).

**2. A break points up, not out.** For any arch whose accommodation is `BREAK`, nobody reaches
for the join any more. The beau's hand goes above his own held shoulder at `BREAK_COMFORT` of
his reach; the belle's elbow stays hanging (`raised: 0`) and her forearm lifts, the hand a little
forward of her shoulder. Done through `TouchHold.over`, aimed at each dancer's own shoulder in
world space, so it holds through the turn.
🔴 `planArch`'s break hands, `stopClearOf` and `BREAK_COMFORT`'s reach-toward are no longer what
is drawn, but they are still what `sizeArch` **sizes** a break for. A break is probably being
given more room than two arms pointing up need.

**3. Casual is a break.** `accommodationFor(CASUAL)` is `BREAK` (was `null`, the last style still
tossing) and `keepsContact(CASUAL)` is `false` (was `true`). No review cell tosses now. The
review's red *"this style has no pose yet"* block comes off casual. 🧪 **Lazy and casual draw
the same pose**; what separates them is owed. Their six watch texts are rewritten to this.

🔴 **Not done: Ember's lean.** Her body leans 14° and her head sits 0.28 forward, so her crown is
forward of the midline everything here measures from — the centre she stands on, the join over
it, and `crownOf`, which is a height with no forward offset. Ryan's observation, recorded; a
join "over her crown" is over her feet. Wants deciding before the contact sheet, since Ember and
Myco are the cast's two leaners.

🔴 **Not done: the head-tip.** He confirmed it again for the break, as part of the pantomime.

Suite **960 / 38 (the same 38) / 3 skipped**, `tsc -b` clean, eslint 0 errors. The break pose
lives in `DanceFloor`'s frame loop and has no test; `over-centre.test.ts` covers only the made
join.

**Next:** Ryan re-watches `quarter/player-ember` (gable) and `under-arch-casual`,
`under-arch-lazy` on the same pairing. Then step 2 with the low height threaded through
`arch.ts`, and the lean.

## Ryan's second look, and three more

Of the break: *"beau same for casual — not arm way up, just like hers."* Of the pass: *"ember's
lean affects the pass as well — her head goes through his body."* And of `quarter/player-ember`
on the gable, with the join now low: *"I do think his arm shouldn't be pointing down, too."*

🧪 Exploratory, no ADR, **uncommitted and unwatched**.

**1. In `casual` the beau does no more than she does** — elbow hanging, forearm lifted. In the
lazy gable his arm still goes up over his own shoulder. 🔑 That is the first thing that tells the
two break styles apart: lazy holds an arch up for nobody, casual does not bother.

**2. A raised elbow stops level with the hand** — `TouchHold.forearmUp`, threaded to `touchPose`
and `standUp`. ADR-0058 turns the elbow to the highest point it can reach, which pointed a tall
beau's forearm *down* onto a join held low over a short belle. The cap is one `acos` on the same
circle: the largest turn at which the elbow is still no higher than the hand. Lengths and the
hand's place are untouched; an arm already pointing down while hanging is left hanging. On only
when the join is over the centre and the hold is made. Three tests in `raised-elbow.test.ts`.
🔴 It makes the forearm **level at worst**, not leaning up as in the photographs, and it cannot
help a join so far below his shoulder that no elbow sits under it.

**3. 🔴 Her head through his body — found, not fixed.** `rigidParts` (`body-shapes.ts`) leaves
forward overhangs out of the passing room on purpose: *"dancers pass each other side-on in lanes,
and a forward-jutting caricature head never narrows the lane gap."* True of a Pass Thru. In a
Twirl she **turns** as she passes, so a head 0.28 forward on a body leaning 14° sweeps round into
him. The room a turning dancer needs is her swept radius, not her side-on width. This is the
plan's step 2 and it now has three parts: the low join in `arch.ts`, the hand no longer in the
gap, and the turning dancer's forward overhang.

Suite **963 / 38 (the same 38) / 3 skipped**, `tsc -b` clean, eslint 0 errors.

**Next:** Ryan re-watches `quarter/player-ember`, `under-arch-casual/player-ember`,
`under-arch-lazy/player-ember`. Then step 2, all three parts.

## Lazy drops too

Ryan, on being told the lazy gable's beau still held an arm up over his own shoulder: *"lazy
should drop too."*

🧪 **In any break both dancers now do the same thing** — elbow hanging, forearm lifted over their
own held shoulder (`raised: 0`, the `over` point 0.4 of the drawn span forward). The arm-up
branch is gone from `DanceFloor`, and with it the pose's only use of `BREAK_COMFORT` (still used
by `arch.ts` for sizing — 🔴 which still assumes the old reach). The six lazy/casual watch texts
in `review-steps.ts` say so.

🔴 **This corrects point 1 of the section above:** nothing on screen now tells `lazy-gable` from
`casual`. They are the same accommodation (`BREAK`), the same contact (none), and the same pose.
Whether they are one style or what separates them is Ryan's, and is not blocking the gable.

**Next:** unchanged — Ryan re-watches `quarter/player-ember`, `under-arch-casual/player-ember`,
`under-arch-lazy/player-ember`; then step 2, all three parts.

## Her head through his body, measured — and the diagnosis above was only a third of it

Measured before building anything: all 25 orderings walked through the real Twirl (square-one's
motions, 0.05-beat steps), each dancer as a leaning body capsule and a head sphere placed where
the renderer draws them (`head.offsetZ`, `body.leanX` included, turned by the dancer's facing),
3-D capsule distance. A throwaway test, deleted; the numbers are here.

**Only four orderings overlap at all — everyone → Ember** — and it is **his head in her head**,
not her head in his body, at about **beat 1.25**, not under the arch:

| | reshape (him / her) | overlap as drawn | built shapes, no reshape | pass at beat 2 |
|---|---|---|---|---|
| you → Ember | +0.77 / −0.77 | **0.27** | 0.05 | 0.61 |
| Sprout → Ember | +0.85 / −0.85 | **0.26** | −0.07 | 0.56 |
| Myco → Ember | +0.93 / −0.93 | **0.21** | −0.03 | 0.96 |
| Ryan → Ember | +0.69 / −0.69 | **0.17** | 0.05 | 0.76 |

The other 21 clear by 0.04–0.46, Ember as beau included.

🔑 **Three causes, and the forward overhang is the smallest alone:**

1. **The reshape levels their heads.** Built, her head is far above his and he passes under it
   (ADR-0012's height-aware clearance). The reshape grows him and shrinks her by ~0.8 each, and
   the two heads end at the same height. `bodies` is measured on the *built* shapes, before.
2. **Her head is 0.28 forward** on a body leaning 14°, and she turns — the section above.
   Without it the worn overlap is 0.07 for you → Ember, not 0.27.
3. **It is not at the midpoint.** At beat 2 she faces along the diameter and he is square to
   her side; the overlap is on the way in, as she turns toward him.

🔴 **Two fixes tried on the numbers, neither good:**

- **Widening the pass** (`archClearance`). The smallest clearance that clears it takes
  you → Ember from 0.61 to 0.86 — against a width of 0.90, which is square-one's stand-off
  regime, so they pass **1.15 apart instead of 0.61**. Ryan → Ember 0.76 → 1.04, Sprout → Ember
  0.56 → 1.04, Myco → Ember 0.96 → 1.46. The full swept radius is worse still (1.35). A beat-2
  lever on a beat-1.25 problem, and the opposite of *"the pass is really that close"*.
- **A smaller reshape** (what the low join in `arch.ts` would buy). Swept from the full reshape
  to none: you → Ember 0.27 → 0.32 → 0.32 → 0.26 → 0.16 → 0.05. It gets worse before it gets
  better and only clears with no reshape at all. **Step 2's low join will not fix this.**

What is left is what the photographs show: **she tips her head** (step 5), and a caricature head
0.44 across and 0.28 forward may simply brush. That is Ryan's call, so step 2's third part is
**on hold** rather than built; parts one and two stand.

**Next:** Ryan re-watches the three cells and rules on the head. Then step 2 parts one and two.

## Three styles, and three things a pair can do

Ryan, on being told lazy and casual now drew the same pose:

> lets reduce the accomodation to two - either shrink or break ... I like lazy as a third break
> with lazy pose but distinct because the break is trying with good effort, its a different
> energy - the break is created with hands getting as close as they can without changing the
> rules - the shrink / grow is creating new rules - following the rules by changing shape -
> that's fun in a different way - so cut out casual - that's the same as lazy for our purposes -
> I guess casual is a less judgemental term - lets go with that - replace all lazy with casual

**Built, 🧪, uncommitted, unwatched:**

- **`TurnUnderStyle` is three:** `gable`, `duck-under`, `casual`. `LAZY_GABLE` / `"lazy-gable"`
  is gone and `CASUAL` is what it was (forces `BREAK`, keeps no contact). The old casual is cut.
- **Review cells are nine, not twelve.** `…-lazy` is no longer an address; `…-casual` is the old
  lazy. 🔴 Any `#review=…-lazy/…` in an earlier entry of this journal now falls back.
- 🔑 **The pose separates the two breaks, not the accommodation.** `CASUAL` draws the forearm
  lifted from a hanging elbow. A `BREAK` reached any other way (the coin-flip control on a
  `gable` cell; a pair `sizeArch` cannot seat; the unstyled floor) **reaches** again — the
  `planArch` break pose the first look replaced for *every* break. That is his *"trying with
  good effort"*, and it is also the pose he called *"neck chopping"* when it was on the casual
  cell; it has not been re-watched as the effortful break.
- 🔴 The duck is untouched. By his description it is a shrink like the reshape; whether it
  stays a style of its own was not said.

**His answer for Ember**, as I read it: *"keep her shape but reduce the size as a shrink grow
unless the setting / coin flip says go casual break — does that work?"* 🔴 Half. The casual
break does no reshape, and on the built shapes the heads clear or all but (−0.07 to 0.05 at the
reshape's distance; a break passes wider — expected, not re-measured). The shrink/grow **as
built** is ADR-0043's torso trade — heads keep their size — and is exactly the case measured
above at 0.17–0.27. If *"reduce the size"* means scaling the whole dancer, head and its forward
offset included, that is a different reshape and has not been measured.

Suite **962 / 38 (the same 38) / 3 skipped** (one test fewer: two style tests became one),
`tsc -b` clean, eslint 0 errors.

**Next:** Ryan watches `under-arch-casual/player-ember`, and `under-arch/player-ember` with the
coin on *break*; and says which shrink he means for Ember. Then step 2 parts one and two.

## Stopped for the day — committed unwatched

Ryan, taking a break: *"go ahead and commit and push."* So the whole session is committed
**without** his having watched the last round (lazy dropped; three styles; the reaching break
restored). That is his call and it does not make any of it accepted — it is still 🧪 with no ADR.

Where to resume is the ⏸ block at the top of [`PROGRESS.md`](../PROGRESS.md): three cells for
him to watch, four questions only he can answer (Ember's shrink, the duck's standing, where the
join sits for a leaning dancer, the step ids), and step 2 parts one and two, which wait on none
of them.
