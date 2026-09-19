# 2026-09-14 (2) — The stragglers hang straight down

Picked up after the root-find. Two things first. The suite was run against it, and Ryan's
`progress` commit was split into three: `build:` (the js-yaml bound), `dance:` (`src/`) and
`docs:`. `notes.txt` went back to untracked, since it is a pasted transcript. The original is
kept as `backup/progress-dd219d9`.

## The suite

**763 tests, 749 passing, 14 failing** (was 745/18 before the root-find). All 14 are in
`arch.test.ts` (5), `arm-pose.test.ts` (2), `hold-metrics.test.ts` (6) and
`standing-hold.test.ts` (1). They are pins on the old geometry and wait on the stragglers
below. None was re-pinned.

## Measuring the four, as PROGRESS said to

`settleTouch` was instrumented temporarily; the patch and probe are kept in the planning
effort under `probes/2026-09-14-settle-stragglers/`. Per final solve it recorded passes, final
`|F|`, whether the determinant fallback fired, whether the line search ran out, and the step
lengths. It also recorded the forward/backward Jacobian mismatch.

There are **five** unconverged arms, not four: `sprout/sprout`'s beau stops at 1.7e-9, below
what the overlay count noticed.

| arm | final \|F\| | how it stopped | forearm from vertical |
|---|---|---|---|
| player/player belle | 1.0e-1 | line search exhausted | 1.55° |
| player/player beau | 7.6e-3 | pass budget | 1.31° |
| myco/sprout belle | 2.7e-3 | pass budget | 3.96° |
| sprout/player beau | 2.6e-3 | pass budget | 2.03° |
| sprout/myco beau | 3.7e-7 | pass budget | 3.87° |
| sprout/sprout beau | 1.7e-9 | pass budget | 2.08° |

Against the three candidates:

- **Singular Jacobian: ruled out.** The `det < 1e-18` fallback never fired on any arm. The
  smallest `|det|` anywhere was 1.2.
- **The flexion kink: not it.** A kink is continuous. Probing along each axis, `|F|` is
  linear out to a 1e-5 step, then **jumps by ~0.06** between 1e-5 and 1e-4. On
  `player/player`'s belle, bisecting that jump left a gap of 9e-19 with the elbow going
  0.355 → 0.240 and the aim swinging from hanging to 31° off. That is a discontinuity.
  The fwd/back Jacobian mismatch grows from 1e-6 to 1e-2 as each solve closes in.
- **No root at that stance: not shown either.** A 41³ grid scan, ±0.25 around each stuck
  offset, found nothing lower than where Newton stopped. But at that grid spacing (0.0125)
  it could not resolve a feature this steep, and `sprout/myco` did reach 3.7e-7.

## What it actually is: the wrist rule has a pole at a hanging forearm

Every unconverged arm has its forearm **within 4° of vertical**, and every arm more than 4°
off vertical converged. (Some near-vertical arms converge too: `ryan/sprout` belle at 3.07°,
`sprout/ryan` beau at 2.20°, the latter slowly.)

Two things in `wristRotation` go bad there:

1. 🔴 **The roll has no defined direction.** "Up" expressed in the forearm frame lies almost
   along the forearm's own axis. So the roll turns the palm toward the tiny perpendicular
   remainder, and that remainder points wherever the forearm happens to lean. Measured: the
   hand-swing azimuth follows the aim azimuth **exactly**. Within a 1e-3 ball around a stuck
   offset, both span **54°–133°**. Arms 10°+ off vertical span 4°–8°. The gain grows as
   `reach / tilt` and has no bound at vertical.
2. 🔴 **The ±face flip is a coin toss there.** `|n0·target|` is 0.014–0.026 at the stuck
   points, and inside a 1e-3 ball the sign changes in **8–42%** of samples. Each change turns
   the hand half a turn about the forearm. On `player/player`'s belle that also tips
   `touchPose` onto its other elbow branch.

🔑 **The flip alone is not the cause, measured.** With it disabled, `player/player` improves
to 2.4e-3, `player/myco` *breaks* (2.6e-2), and the other three do not move. (The 09-14
"not the cause" result was taken under the old iteration, which was diverging anyway, so it
said nothing either way. This one is under Newton.)

## What this means, and why I stopped

The solver is no longer the problem. At a hanging forearm the rule for "which way the hand
lies" is undefined, and the stragglers are exactly the stances whose answer sits in that
neighbourhood. No solver converges on a map that has no value at the answer. A wider line
search or more passes would only buy a number while the rendered hand could still spin
between frames.

What to do about it is a decision, not a number, so it is Ryan's. The candidates I can see,
none built:

- **Orient a held hand by the hold, not by the forearm's lean.** ADR-0054 already gives each
  dancer an arc from the median, `û(arc)`, which is defined whatever the forearm does. And
  "beau palm up, belle palm down" already fixes the face, which would retire the flip for a
  hold.
- **Keep forearms off vertical in `placeHold`.** This treats the symptom and adds a constraint.
- **Blend the roll toward a fixed reference as tilt → 0.** Continuous, but that reference is
  a choice someone would still have to make.

Then the flush rule, then re-pin, as before.

## Postscript — "isn't the hold supposed to be out in front?"

Ryan asked this, and the answer is yes, but as a derived value with no floor. ADR-0027, carried
into ADR-0046, made `forward` "what is left of the forearm". It is zero where that comes out
negative, and a tuned "a little" was rejected. Measured on all 25 today: `forward` is never
zero (0.013–0.430), but on the stragglers it is small: player/player 0.072, sprout/player
0.044, sprout/sprout 0.038, myco/sprout and sprout/myco 0.013.

🔑 **And the arc takes it straight back.** The hanging arm's settled wrist offset `z` is about
minus `forward` on every one: −0.077 vs 0.072, −0.045 vs 0.044, −0.015 and −0.013 vs 0.013.
So the wrist lands at `z` ≈ 0, directly under a hanging elbow (elbow `z` −0.001 to −0.011).
That is the vertical forearm. The hand is a little in front, the wrist is not, and
`relaxedForward` budgets forward for the hand while the arm now ends at the wrist.

That reframes the decision. A real floor on how far in front the **wrist** sits would keep
every forearm off the pole by construction, and would honour "a little forward" rather than
work around it.

## The idea we're playing with, written before measuring it

Ryan: *"in real life when paired with a dancer that is drastically differing in height the
taller dancer crouches down — is there a squinch we can do to bring closer to the smaller
partner and a general rule we can derive?"* And: measure or observe before an ADR.

**Not deciding anything.** The standing handhold has no accommodation. ADR-0032 moved the
reshape/break pair into `accommodation.ts` for every hold, but the touch-hands hold never took
one. The question is whether a standing-hold accommodation keeps forearms off the vertical
pole, and what rule would size it.

**Levers to try, all through the real solver** (`touchHold`, `touchLift`, `handCentre`) and
nothing approximated beside it:

1. **The taller dancer squinches**: `growBody(taller, −d)`, lifted by `standingLift`, the
   same construction `arch.ts` uses.
2. **The trade**: taller `−d` and smaller `+d`, which is ADR-0028's reshape run the other way.
3. **Hands further forward**: `forward + f` handed straight to the arms. This checks whether
   a floor on the wrist's forward offset is reachable at all, or just strains the arms.

**What we're looking for:**

- ✅ a lever that takes all five unconverged arms off the pole (forearm > ~10° off vertical,
  plan splay ≤ 1e-9);
- ✅ that does not break any of the 20 pairings that work today;
- ✅ the smallest `d` or `f` that does it, per pairing, and whether that minimum follows
  something measurable (height difference, reach ratio, `forward` before the lever) closely
  enough to be a rule;
- 🔴 a warning sign: **`player/player` is an identity pairing**, so there is no taller
  dancer to squinch. If it straggles for a reason that has nothing to do with height, a
  height rule cannot be the whole answer, and the result should say so rather than paper
  over it.

## What the levers did

The sweep covered all 25 pairings, with no ADR drafted. Output is in the planning effort's
`probes/2026-09-14-settle-stragglers/levers-2026-09-14.txt`.

🔑 **The stragglers are not the mismatched pairs.** Their waist differences are 0.000–0.100.
Every big-difference pairing (anything with Ember, Δwaist 0.24–0.34) already converges, with
forearms 31°–45° off vertical. Two of the five stragglers are identity pairings
(`player/player`, `sprout/sprout`). What they share is a **small `forward`** (0.013–0.072),
not a height gap.

**Squinch (taller −d), d up to 0.4: not a rule.** At best it fixes 4 and breaks 2. On every
Sprout pairing, Sprout's forearm stays at 2°–4° whatever the partner does, so that arm is the
problem and the partner's height doesn't change it. Player's body hits the editor's height
floor after d = 0.05, so `player/*` rows go flat past that.

**Trade (taller −d, smaller +d): worse.** It fixes up to 4 and breaks up to 10, and takes
`sprout/sprout` to 108% reach at d = 0.4.

**Forward + f: the only lever that moves the pole directly.** Reach is measured at the raised
forward:

| f | stragglers fixed | working pairings broken | worst reach |
|---|---|---|---|
| 0.05 | 5 | 2 (`ember/sprout`, `sprout/ember`) | 91% |
| 0.10 | 5 | 1 (`ember/sprout`, at a 37° forearm — not the pole) | 99% (`ryan/sprout`) |
| 0.15 | 5 | 0 | **108%**, Sprout over-extends |

So a flat `+f` has no safe value. 0.10 is on a knife edge at 99%, and 0.15 over-extends Sprout.
The `ember/sprout` break is a separate failure worth its own look.

🔑 **What that points at, still unmeasured:** a floor on how far in front the **wrist** sits,
not a constant added to the hand. The earlier postscript found the wrist trails back by about
`forward`, so the pole is wrist `z` ≈ 0. A floor of "wrist at least `m` in front", clamped by
reach the way ADR-0027 clamps everything, would give each pairing only as much forward as it
needs. That's the next probe: sweep `m`, and report reach and tilt.

The squinch is still a good idea for what it was built for (an arch, a height the smaller
dancer can't reach). It just doesn't answer this question.

## The wrist floor, the stagger and the yaw

Ryan: *"go ahead and run the wrist-forward floor probe — also what about the yaw and the
stagger."* Both were measured on 09-10 and dropped, but against the **fouling** (hands through
forearms), where they could not help because they move where the arms come *from*. This
problem is where the arms come from, and ADR-0051's stagger was proposed for exactly this
case. So both are back on the table.

The probe keeps the world hold point fixed while the bodies move. It checks reach against the
same formula `touchReach` uses (identical at abreast, diff 0), and marks ✓ only at a plan
splay ≤ 1e-9. "Off the pole" means the smaller forearm tilt is > 10°. That is my threshold,
not a measured one. Output: `probes/2026-09-14-settle-stragglers/floor-stagger-yaw-2026-09-14.txt`.

**Wrist-forward floor** (per pairing, the smallest extra forward that puts both wrists ≥ `m` in
front):

| m | converged | off pole | broke | max reach | over 100% |
|---|---|---|---|---|---|
| 0.02 | 5/5 | 3 | 0 | 97% | 0 |
| 0.04 | 5/5 | 4 | 0 | 100% | 1 |
| 0.06 | 5/5 | 4 | 0 | 104% | 4 |
| 0.08 | 5/5 | 5 | 0 | 108% | 6 (all Sprout pairings) |

It never breaks a working pairing, and it only adds forward where it's needed (0 on the Ember,
Myco and Ryan pairings). But **Sprout runs out of arm** before the floor clears the pole. It is
the lever that asks the most of the shortest arm.

**Stagger: no rule.** Neither direction is monotone. Beau-behind and belle-behind each
break 1–7 pairings, and converged cells mostly still sit at 0°–10°. The by-size variant (the
shorter dancer steps back) gets 4/5 at best and over-extends fast (s = 0.2 → 15 over 100%).
This matches ADR-0052's supersession: the stagger is not the lever.

**Yaw inward: the clean one.** It is continuous, monotone, and needs no extra reach at the
low end:

| θ (both turn in) | converged | off pole | broke | max reach | over 100% |
|---|---|---|---|---|---|
| 10° | 5/5 | 0 | 1 | 93% | 0 |
| 15° | 5/5 | 0 | 0 | 95% | 0 |
| **20°** | **5/5** | **4** | **0** | **97%** | **0** |
| 30° | 5/5 | 5 | 0 | 105% | 5 (Myco/Ryan pairs) |

Turning away is worse (it breaks 5–6), matching 09-10. A flat 25°–30° over-extends the pairs
that already had plenty of forward. So like the floor, it wants sizing **per pairing**, not
a constant.

**Yaw × floor:** 10° + floor 0.04 → 5/5, 4 off pole, 94%. 20° with any floor → 5/5, 4 off
pole, 97%. 25° → all 5 off the pole but 4 over 100%. The two overlap more than they add:
both turn the forearm forward.

🔑 **What this is pointing at, still not a decision:** a small inward yaw (real couples do
turn slightly toward each other) sized per pairing, possibly with a small wrist floor, both
clamped by reach. It is the only combination here that clears the stragglers without
over-extending Sprout.

🔴 **Not checked, and it must be before any ADR:**

1. **The fouling and the flatness.** The 09-10 fix (hand separation scaled by hand radius)
   was measured abreast. A yaw changes which way each forearm comes in, so `hold-metrics`
   has to be re-run under the yawed stance.
2. **`touchHold` was not re-solved.** Width, lateral, height and forward all assume abreast.
   The real thing would put yaw inside the band's fixed point.
3. **One straggler stays at ≤ 10° under yaw 20°.** It needs identifying.
4. **How it looks.** No number here says a 20° turn reads as a couple holding hands rather
   than two people facing each other. That needs Ryan's eyes on the review route.

## Under the yaw: fouling, flatness, and the last straggler — then a toggle to look

Ryan: *"go ahead with 1 and 3, then build the toggle."*

### 1. Fouling and flatness under the yaw

`holdMetrics` gained an optional `turnIn` (radians each dancer turns toward the other, hold
point fixed on the floor). The crossing direction handed to `handExtentAlong` is now rotated
into each dancer's own frame, because it asks in that frame and until now both yaws were
zero. At `turnIn = 0` it takes exactly the old path. The failing set is identical with the
change stashed and applied.

| θ | fouled | worst forearm gap | worst flatness | unstacked | stragglers ≤ 10° |
|---|---|---|---|---|---|
| 0° | 21/25 | −0.062 | 0.13 | 0 | all 5 |
| 10° | 21/25 | −0.059 | 0.06 | 0 | all 5 |
| 15° | 21/25 | −0.057 | 0.03 | 0 | all 5 |
| 20° | 21/25 | −0.054 | 0.01 | 0 | `player/player` beau, 9.9° |
| 25° | 21/25 | −0.051 | 0.00 | 0 | none |

- **The yaw neither causes nor cures the fouling.** 21 of 25 foul at 0° and at every angle.
  The set swaps one pairing: `ember/ember` starts fouling by −0.004 at 20°, and
  `sprout/sprout` clears (+0.002). The worst gap eases slightly.
- 🔴 **21/25 fouling abreast is itself news.** The failing pin ("nine pairings reach a hand
  through the partner's forearm") was written before ADR-0054 moved the wrists. Either
  the overlay made the fouling far worse, or the metric's premise moved with the geometry
  (hands overlaid over the median, forearms from opposite sides). That needs its own look
  and is not a yaw question.
- **Flatness gets better with the turn**, 0.13 → 0.01, and stays inside `FLAT_ENOUGH` at
  every angle.

### 3. The straggler that stays near vertical

At 20° it is **`player/player`'s beau, 9.9°**, a hair under the 10° line. His belle is at
23°, so an identity pairing splits 10° against 23°. That is the authored asymmetry again:
beau palm up, belle palm down. 25° clears him (12°), but 25° over-extends the Myco/Ryan
pairs (last section), so a flat angle still has no clean value. The turn should be sized per
pairing.

### The toggle

The review route's panel has a **🧪 turn in** slider (0°–30°), live on the `standing couple`
step only. It is dashed and amber when non-zero and says *not the shipped pose — don't rate
it*. It prints this pairing's forearm tilts, forearm gap and flatness from `holdMetrics`.

It needed one real change beyond the slider. `poseArms` carries `hold.forward` along each
dancer's **own** local `z`. Turned in, those axes diverge, and the two hands would be written
to two different points: through `poseArms`, 0.15 apart at 10°, 0.29 at 20°, 0.43 at 30°.
`poseArms` now takes an optional **couple yaw** and carries forward along that, which puts the
hands back together (≤ 1e-12 at 20° and 30°). `DanceFloor` gets an exploratory `turnIn` prop.
It turns the rigs only while the placements say standing couple, passes the couple's yaw
through `resolveExpression`, and declares the hold (two dancers 2θ apart can fall outside
`TOUCH_FACING_TOLERANCE`, 0.6 rad). With the prop at 0 nothing changes: same failing set,
`tsc` clean, lint unchanged.

Checked in the running app: the readout on `sprout/myco` goes 3.9°/37.6° → 12.5°/60.5° at 20°,
matching the probe, with no console errors. **The 3D pose itself was not seen.** The browser
window was hidden, so the canvas never drew. That look is Ryan's.

### Noticed, not touched

`DanceReviewScene.tsx` renders the note / prev-next / next-unrated / advance-on-rate block
**twice**, and both textareas share one `noteRef`. It looks like a duplicated paste. Left
alone because it is outside this change.
