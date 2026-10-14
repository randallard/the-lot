# 2026-10-13 (1) — a frozen elbow, and a grown shoulder

Ryan watched the cells from the 10-12 ⏸ block. Of `quarter/player-ember` (the gable, reshape):
*"her head is clipping into his side and it looks like he might be shrugging his shoulder way
high so he doesn't have to hold his forearm up — is there something keeping his forearm from
tilting up?"* Of `under-arch-casual/player-ember`: *"her shoulders seem to be misplaced since her
body is tilted forward I bet they didn't come with"*, and *"the player … elbow up isn't very
casual — should be like they're saying — yeah here's how I'd do the move if my elbow was frozen
in place and I know I have to bring it back here for the standing couple anyway but my wrist and
hand move just fine, and the elbow bends … it looks like the beau's elbow is unable to bend
upward … is there something restricting it?"*

All three were measured first, through the real pose path (square-one's Twirl, `planArch`,
`poseArms`, the 10-12 low-join clamp and `forearmUp` reproduced). A throwaway test, deleted; the
numbers are here.

## 1. Casual: the elbow came up because the arm could not fold that far — fixed

| casual, before | shoulder y | elbow y | elbow z | forearm |
|---|---|---|---|---|
| player (beau, → Ember) | 0.910 | **0.957** | −0.215 | **23° down** |
| Ember (belle) | 1.425 | 1.230 | −0.266 | 41° up |

🔑 **The cause.** The 10-12 casual pose aimed the hand at a point `0.85·drawnSpan` above the
hanging elbow and let `touchPose` find an elbow for it. The player's forearm (drawn span) is
longer than his upper arm (0.22), so that point sat ~0.08 from his shoulder — closer than a
two-link arm with a longer second link can fold. The solve took the only elbow it had: up and
back, above his own shoulder, forearm pointing down. Nothing restricts the elbow joint; the
target was unreachable *with the elbow down*. Ember's upper arm is longer (0.33), so hers only
swung back 0.27.

🧪 **Built (uncommitted, unwatched):** `TouchHold.lift` (`arm-pose.ts`). In a casual break each
dancer poses **the standing hold, as if the partner still stood beside them at `width`** — so
the elbow is exactly where the standing couple has it and does not chase a partner who has
walked round behind — then `liftForearm` turns only the forearm, keeping its heading (forward
and in), from its standing elevation toward `CASUAL_FOREARM_LIFT` (**60°**, a guess at *"pointing
into the air a little"* — Ryan's to tune) on the arch's own blend. `DanceFloor` builds the casual
hold as `{ ...standing, lift: under.blend }`; the old aim point (`up`, `heldX`, `heldZ`) is gone.

| casual, after | elbow y | forearm |
|---|---|---|
| player | 0.690 (straight under the shoulder) | 60° up, every beat |
| Ember | 1.121 | 60° up, every beat |

`casual-lift.test.ts`, 52 tests over all 25 orderings: the elbow is the standing hold's to 1e-9,
only the forearm's elevation changes, the heading is kept, it does not move when the partner is
behind, and `lift: 0` is the standing hold exactly.

## 2. The gable at the quarter: he is grown past the join — not fixed, it is step 2 part one

| gable, beat 1, `player → ember` | value |
|---|---|
| reshape | him **+0.768**, her **−0.768** |
| his shoulder | **1.678** |
| the join (her crown 1.387 + headroom) | **1.460** — 0.22 *below* his shoulder |
| his upper arm | **0.220** |
| his elbow | 1.616, 0.21 behind the shoulder; forearm **43° down** |

🔑 **What keeps his forearm from tilting up is arithmetic, not a limit on the elbow.** The join
is 0.218 below his shoulder and his upper arm is 0.220 long, so the lowest any elbow can sit is
level with the hand: no elbow on his circle gives a forearm that leans up. The best is level.
The solve's own choice (the "further back" elbow, upper arm 16° below level and pointing
backward, only 0.06 under the shoulder) is what reads as a **shrug**. `forearmUp` does nothing
here — the hanging elbow is already above the hand. Turning `raised` off changes nothing at
beat 1 either.

Why he is that tall: `planArch` trades torso symmetrically against `archHeight`'s join — the
**high** one — while the pose then clamps the hand down to the **low** join (10-12, knowingly).
The sizing grew him for a join he is no longer asked to reach. This is exactly the 10-12 plan's
step 2 part one (thread the low join through `arch.ts`): sized against the low join, he grows
far less and his shoulder ends below the hand. 🔴 To get the photographs' forearm leaning *up*
(his arm sloping up ~35° with a slight bend), the trade should stop where the join sits at a
comfortable fraction of his reach above his shoulder, not at full reach — a number to choose
when building it.

Her head in his side is the 10-12 measured overlap (`you → Ember` 0.27 as drawn), still on hold
for Ryan's answer on which shrink he meant.

## 3. Ember's shoulders do not lean with her body — confirmed, not changed

`Dancer.tsx` (and `Npc.tsx`, `Player.tsx` in the world) rotates **only the torso mesh** by
`leanX`; the shoulder groups sit at `(±forearmX, shoulderY, 0)`, upright. Her torso's top is
`sin 14° · (0.705 + 0.22)` = **0.224 forward** and 0.027 lower than where her shoulders are drawn.
Her head was authored 0.28 forward to sit on the leaned torso; the arms never were. So her arms
hang from points ~0.22 behind the top of her own body — in the world as well as on the floor.

🔴 Not built, because it is not a dance-only change: every arm solver here assumes the shoulder
at local `z = 0` (`touchPose`'s `sz = 0`, `reachPose`, `armMetrics`, `rigidParts`, the solids),
and moving it changes how Ember (and Myco, the other leaner) look everywhere. Ryan's call
whether shoulders should follow the lean.

Also found: `BodyShape.leanX`'s doc says *"+ = lean back"*; the rig rotates `+x`, which tips the
top toward `+z`, the way characters face — so `+` is **forward**, as Ember's head offset agrees.
The doc comment is wrong. Not changed yet.

Suite **1014 passing / 38 failing (the same 38) / 3 skipped**, `tsc -b` clean, eslint 0 errors.
**Uncommitted** — Ryan verifies.

**Next:** Ryan watches `#review=california-twirl/under-arch-casual/player-ember` (and any casual
cell). Ryan rules on shoulders following the lean. Then step 2 part one, which is now also the
fix for the shrug: size the reshape against the low join.

## 4. Shoulders follow the lean — Ryan's ruling, built

Ryan: *"yeah shoulders should stay at the top of the body, following when it leans."* Asked
whether they are his to adjust: **height and width are** (the body editor's *shoulder height*,
`layout.shoulderY`, and the arm-spacing slider, `layout.forearmXOffset`); **forward/back is not a
setting** — it is now derived from the lean, the way the torso is drawn. The 10-10 plan's drag
handles are for authoring *poses*, not where a shoulder is built.

🧪 **Built (uncommitted, unwatched; a look change for Ember everywhere, not only on the floor):**

- `computePositions` turns the authored shoulder about the body's centre by `leanX` — the same
  rotation the torso mesh has — giving `shoulderY` (now lean-adjusted) and a new **`shoulderZ`**.
  Ember: **0.224 forward, 0.027 lower.** Upright bodies are byte-identical.
- Every renderer seats the shoulder groups at `shoulderZ`: `Dancer.tsx`, `Npc.tsx`, `Player.tsx`,
  `CharacterPreview.tsx` (the editor), `ContactMovePreview.tsx`.
- `ArmMetrics.restZ`, and every solver measures the arm from `(±restX, restY, restZ)`:
  `reachPose`, `touchPose` (+ `standUp`), `restPose`, `shoulderOf`, `elbowLocal`,
  `upperArmStrain`, the expression channel's swing, `hold-metrics`' upper-arm angle.
  `DanceFloor` writes `shoulder.position.z` per frame (a grown torso lengthens along its leaned
  axis) and reads it back.
- `BodyShape.leanX`'s doc corrected: `+` is **forward**.
- `shoulder-lean.test.ts` (3): her shoulder is exactly where the drawn torso's top went; upright
  is unchanged; the resting arm hangs from it at true length. Four existing test helpers that
  built a shoulder at `z = 0` now use `restZ`.

🔴 **Not followed:** `leanZ` (side lean) — it would put the two shoulders at different heights and
every arm measure is one number for both sides; nobody in the cast has one. An **emote's** lean
in the world (`Player.tsx`) does not move the shoulders per frame — it never moved their height
either. `arch.ts` plans in the couple's lateral/height plane and ignores the shoulder's forward
offset.

Ryan also, of the dials: *"playing with join overhead and pair closes dials do fun stuff."*

Suite **1017 passing / 38 failing (the same 38, checked name by name against the committed
tree) / 3 skipped**, `tsc -b` clean, eslint 0 errors. **Uncommitted.**

**Next:** Ryan watches Ember anywhere (editor, world, `#review=…/player-ember`) for the shoulders,
and `under-arch-casual/player-ember` for the frozen elbow. Then step 2 part one.

## 5. The resizing — step 2 part one, built narrow

Ryan: *"go ahead with the resizing."* 🧪 Uncommitted, unwatched, no ADR.

### What the measurement said first

The reshape **already aimed at the low join** (`reshapeDeficit` under `LOW` targets her crown +
headroom). Height was not the defect. **The across was**: with the join over the centre, the
floor sized as `overhead = 1` at the **standing** width, so his reach was priced to a point over
her a full width away — 0.650 across for the player against a 0.545 arm. `reachCeiling` then
returns his bare shoulder (`√max(0, reach² − across²)` = 0), so the trade grew him until his
shoulder was level with the join and `OVERSHOOT` took it 15% past: the shrug. Same on
`ryan/ember`, `sprout/ember`, `sprout/player`, `ember/sprout`.

Two tries that were dropped, both measured through the pose path over all 25:

- **Price the reach at the quarter** (join at the couple's midpoint, half a width away). Every
  beau's shoulder went below the join and every forearm leaned up — but the pass at the midpoint
  is `wanted`, not half a width, so the pose stretched his undrawn upper arm there:
  `player/player` went from a break to a held gable stretched **0.39**, `myco/myco` 0.86.
- **The low height alone, with the old pricing.** Turned 9 pairs into breaks: the hand charged
  in the gap at a lower height, where heads are wider.

### What is built: size the made hold at the midpoint pass

`OVER_CENTRE` (`arch.ts`) is a value of the `overhead` parameter, which only `planArch` reads, so
nothing else in the cascade changed signature beyond the type (`Overhead`).

- `planArch(…, separation, …, OVER_CENTRE)` is **the midpoint**: `separation` is how far he passes
  her, the hands are over her (the `overhead = 1` lateral), the reshape is priced to there, and
  the height is the **low** join (`crownOf(belle) + headroom`) — no rise toward the taller head.
- `sizeArch(…, OVER_CENTRE)` sizes the overhead-1 cascade as before, then for a drawn `RESHAPE`
  scans `centrePass`: the least pass from `bodies` up (0.005 steps, under the standing width)
  at which the hold is made (`plan.gap` 0) and `archClearance` and `armSweepClearance` of that
  plan fit. Found → `{ wanted: pass, centre: true }`. Not found → the overhead-1 sizing exactly.
- `cheaperAim` returns `LOW` for `OVER_CENTRE` (the join never aims at his crown).
- `DanceFloor` sizes with `OVER_CENTRE` when the 🧪 switch is on, and plans at `chosen.wanted`
  with `OVER_CENTRE` when `chosen.centre`, else at the width with overhead 1.

| seated over the centre | pass (was) | reshape (was) | his shoulder → join | stretch b1–3 |
|---|---|---|---|---|
| you → Ember | 0.670 (0.61) | ±0.568 (±0.768) | **1.478 → 1.677**, 0.20 below (was 0.20 above) | 0.00 |
| Ryan → Ember | 1.014 (0.76) | ±0.520 (±0.689) | 1.470 → 1.745 | 0.00 |
| Ember → Ember | 1.213 (a break, stood 2.02) | ±0.256 (none) | 1.649 → 1.969 | 0.00–0.01 |

The other **22 are unchanged** (test-pinned: their sizing equals the overhead-1 sizing).
`over-centre.test.ts` +30 tests; `walk` takes an `overhead`.

### 🔴 What still stands in the way — each is Ryan's or a later step

1. **Why only three seat: the arm-sweep check is a straight line.** `armSweepClearance` draws his
   arm shoulder → hand; to a hand a palm above her crown, directly over her, that line goes
   through her head for every pass short of the width. A real gable comes in from above — upper
   arm up, forearm down and in. Seating the rest wants the sweep checked on the drawn
   two-segment arm (elbow and forearm), not the chord.
2. **His forearm at the quarter is level, not up** (you → Ember: 0° at b1, 61° at b2, −9° at
   b3). The sizing is right now — the join is above his shoulder — but `raised = 1` turns the
   elbow to the highest point the circle has (ADR-0058's L) and `forearmUp` stops it level with
   the hand. *Level* is the cap, so it binds. The photographs' slope (~35°, slight bend) needs the
   elbow to stop short of the hand — the plan's step 3, the elbow's direction per beat.
3. Her head in his side is not re-measured under the smaller reshape.

Suite **1047 passing / 38 failing (the same 38) / 3 skipped**, `tsc -b` clean, eslint 0 errors.

**Next:** Ryan watches `#review=california-twirl/quarter/player-ember` and `…/under-arch/player-ember`
(switch on). Then either the drawn-arm sweep (seats more pairs) or step 3's elbow (tilts the
forearm up at the quarter) — Ryan's pick.

## 6. The elbow — the forearm leans up into the join

Ryan, given the drawn-arm sweep or the elbow next: *"elbow first."* 🧪 Uncommitted, unwatched.

`forearmUp`'s cap (`standUp`, `arm-pose.ts`) now stops the raised elbow where the forearm still
leans **`GABLE_FOREARM_LEAN` = 35°** up into the hand, not at level — 35° is the photographs'
quarter by eye, Ryan's to tune. And it works **both ways round the circle**: where the hanging
elbow is already too high (the three-quarter, the hand gone behind), it turns *down* to the lean,
eased by `raised` so the arch still blends in from the hang; with no elbow low enough, the lowest
one. Still a rotation on the elbow's circle — lengths and the hand's place untouched. Only on for
a made join held over the centre, as before.

His forearm, beats 1/2/3, through the pose path:

| | before | after |
|---|---|---|
| you → Ember | 0 / 61 / −9 | **35 / 61 / 35** |
| Ryan → Ember | 0 / 62 / −11 | 35 / 62 / 35 |
| Ryan → Ryan | 0 / 76 / −42 | 35 / 76 / 35 |
| Ryan → Myco | 0 / 73 / −47 | 35 / 73 / 35 |
| Ember → Sprout | −72 / −73 / −72 | −10 / −18 / −32 |

Below 35° still: arms at full stretch reaching as far as they go (Myco, Sprout, Ryan → you —
the straight arm's own angle; their stretch is the pass distance, unchanged), and Ember → Sprout,
whose join is below his shoulder. Her forearms were already 41°–84° and are not changed by it.

Tests: `raised-elbow.test.ts`'s cap block rewritten (never worse than hanging; the full lean
wherever an elbow gives it; a too-high hang is turned down; raised 0 is the hang exactly; nothing
changes where the highest elbow already leans enough). `over-centre.test.ts`: you → Ember and
Ryan → Ember lean ≥ 35° at all three beats.

🔴 Not yet the photographs' whole elbow (plan step 3): her upper arm level and forward at the
quarter, her elbow at crown height out over her shoulder at the midpoint, trailing out to her
side at three-quarter. This is the beau's forearm angle only, and a floor rather than a target.

Suite **1050 passing / 38 failing (the same 38) / 3 skipped**, `tsc -b` clean, eslint 0 errors.

**Next:** Ryan watches `#review=california-twirl/quarter/player-ember`, `…/under-arch/player-ember`,
`…/three-quarter/player-ember` (switch on). Then the drawn-arm sweep, which seats more pairs over
the centre.

## 7. The drawn-arm sweep — built, measured, taken back out

Ryan: *"go ahead with the drawn-arm sweep."* 🔴 **Nothing from this section is in the code.** The
code is exactly as at the end of §6; this is the record of why.

**What was built.** In `centrePass`, the chord check (`armSweepClearance`, shoulder → hand) was
replaced by `drawnArmClears`: the elbow from the floor's own solver (`touchPose` at `raised` 1
with the 35° lean cap), and only the drawn forearm and hand checked against the partner,
lateral only. Measured first that this frame is the right one: at beat 2 the join sits on the
beau's own `−x` axis at exactly the pass distance, forward 0, on all 25 orderings.

**What it found — the real result.** The chord had been *passing* arms that are drawn through her
head. The drawn forearm of you → Ember at the 0.67 pass overlaps her head laterally below her
crown. It is geometry, not a solver fault:

- A forearm leaning up at `α` into a point `h` above the top of a head of radius `R` passes the
  head's centre at `(R + h)·cos α`. To clear, `h ≥ (R + w)/cos α − R`. **The steeper the forearm,
  the higher the join has to be** — level needs only the forearm's half-width; 35° on Ember's
  0.44 head needs ~0.16, against the palm (0.07) `headroom` gives. Ryan's photograph has the join
  *"about half a head above"* her crown — consistent.
- **But a join that high is out of the belle's own reach on this cast.** Tried (`gableHeadroom`,
  the formula above, as the over-centre join height): **no pairing seated at all.** Ember as belle
  falls 0.10 short at every pass — her 0.935 arm cannot put her own hand half a head above her own
  0.88-wide head, and shrinking her moves her shoulder and crown together. The player as belle is
  0.67 from that point with a 0.545 arm, 0.133 short whatever the pass.
- With the palm-height join and the drawn check: the same three seat, but **worse** — you → Ember
  passes at 0.75 (was 0.67) with his midpoint forearm 29° (was 61°); Ryan → Ember is pushed out to
  a 1.10 pass and his arm stretches **0.48**.

So the photograph's midpoint — both forearms leaning up into a join half a head over her crown —
**cannot be drawn on these proportions** without something giving. 🔑 Ryan's call, the options as
I see them:

1. **The join sits off her centre, toward him** — still above her crown height, but over the side
   of her head nearer him. His forearm stops crossing her head; hers reaches less far.
2. **Her arm reaches for it** — ADR-0040's upper-arm lengthening (`reachForIt`), which the
   over-centre scan does not try yet.
3. **The forearms lean less at the midpoint** — near level over her head (the L there, the gable
   at the quarters), which needs only a palm of headroom.
4. **Accept a brush** — the forearm skims her head, as the 10-12 photos have her brushing him.

Suite unchanged from §6: **1050 / 38 (the same 38) / 3 skipped**, `tsc -b` clean, eslint 0 errors.

**Next:** Ryan picks among 1–4 (or other). He watches `quarter`, `under-arch`, `three-quarter` on
`player-ember` (switch on) — the review page's rules checker will say whether his forearm is in
her head at the midpoint on screen, which the reasoning above predicts it is.

## 8. The last look: seat the gable, or break it

Ryan, of §7's four options: *"I think 2 is good — take a look at 1 and 2 though, and let's make
this the last look — really that's what the break is for — if we can't accomodate with one of
these then we'll just assign a break to those pairings and make sure that on custom pairings
created by players that don't match exactly, we can pick out where the break needs to happen and
the gable just won't connect, but shows a bit of effort towards it."*

🧪 Built, uncommitted, unwatched, no ADR.

### The rule (`arch.ts`)

`sizeArch(…, OVER_CENTRE)` for a made hold calls **`seatOverCentre`**, a scan in Ryan's order:
**longer forearms** (outermost, least first — `reachForIt`'s lever, both dancers, editor steps,
stance re-solved) × **the join off her midline toward him** (`toward`, 0.04 steps, never past
her head's radius — still a palm over her crown height, over the near side of her head) ×
**the pass** (0.01 steps from `bodies`). A candidate seats when, at the midpoint, of a plan made
there (`planArch(…, pass, …, OVER_CENTRE, toward)`):

- the hands meet (`plan.gap` 0), and each arm reaches the join **with a hand's width to spare**
  (`comfortablyReaches` — at full stretch the palm's own offset is drawn as a stretch; 95% of
  reach was tried and was 0.038 of slack against Ryan's 0.11 hand),
- `archClearance` (with `toward`) fits,
- **both forearms as drawn** clear her head — his, and hers against her own head
  (`drawnArmClears`: the floor's own `touchPose` at `raised` 1 with the lean cap, the forearm at
  its tapering radius, then the hand; side-on at `z = 0`, which is the midpoint).

Seated → `{ centre: true, toward, armDelta, wanted: pass, width }`. **Nothing seats → a break**,
`{ …the overhead-1 break sizing, unseated: true }`. Everything is derived from the two shapes, so
a player's custom pairing gets the same answer by the same search.

### The floor (`DanceFloor.tsx`)

- Plans a seated hold at the pass with `toward`, and moves the held-over point `toward` him along
  the line from the centre to where he is at the middle of the span.
- 🔑 **A break over the centre shows effort** — `breakEffort` (`arch.ts`): each dancer reaches from
  their own held shoulder along the line to the join, stopping at `BREAK_COMFORT` of their reach;
  world space, every frame. Replaces `planArch`'s break reach there, which was planned at the
  standing width and stretched Myco-as-belle 0.77 once the pair were at the midpoint pass. A
  coin-flip break on a gable cell gets the same pose.
- The rules box does **not** ask an `unseated` pairing for joined hands (`keepsContact`).

### Result, all 25 through the pose path

**8 seat:** player → Sprout, Ember → player, Ember → Ryan, Ember → Sprout, Ryan → player,
Ryan → Ryan, Ryan → Sprout, Sprout → Sprout. Every one lengthens both forearms **+0.27 to +0.36**
and moves the join 0.12–0.32 toward him. Hands within 0.12 of each other; arms within 0.03 of
their length except the midpoint of Ryan → Ryan (his 0.16) and Ember → Ryan (hers 0.14).

**17 break**, including **every pairing with Ember or Myco as belle** and **you → Ember**. Hands
0.22–1.24 apart, arms within 0.09 of length (the standing hold already reads ~0.06), forearms up.

`over-centre.test.ts`: the seated list pinned; seated hold and don't stretch; broken reach, don't
connect, don't stretch; every pairing is one or the other. Sizing a pairing that breaks scans the
whole space — ~1 s for all 25 walks in the test, once per mount on the floor.

🔴 Open: the +0.3 forearms are visible — this is lever 2 as Ryan chose it, but he has not seen it.
The Ember-as-beau → Sprout seat has his forearm pointing down (−50°): his join is below his
shoulder. Lazy/casual are untouched.

Suite **1046 passing / 38 failing (the same 38) / 3 skipped**, `tsc -b` clean, eslint 0 errors.

**Next:** Ryan watches, switch on — a seated cell (`#review=california-twirl/under-arch/ryan-player`
style address for any of the eight), a broken one (`…/under-arch/player-ember`), and the shoulders
and casual from earlier today. Then, if accepted: the ADRs (plan step 8).
