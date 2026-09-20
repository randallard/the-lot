# 2026-09-20 (2) — Myco's arm is a diversity case now

Ryan re-authored her on screen against `#review=california-twirl/stand/player-myco`, and asked
for the values to become her defaults. They have. What they cost is the rest of this entry.

## What landed

```
forearm.height      0.24 → 0.16
hand.open.radius    0.11 → 0.08
upperArmSpacing     0.33 → 0.10
shoulderY           0.05 → 0.11
forearmXOffset      0.46   (unchanged — it had been at 0.39 mid-session and came back)
headBodyGap        −0.40   (unchanged)
```

🔑 **Her reach is now roughly half what it was.**

| | shoulder | `elbowReach` | forearm | hand r | **`handReach`** | **whole arm** |
|---|---|---|---|---|---|---|
| was | 0.55 | 0.33 | 0.24 | 0.11 | **0.690** | 0.80 |
| now | 0.61 | 0.10 | 0.16 | 0.08 | **0.350** | 0.43 |

## What it buys, on the step it was tuned against

Against the player at defaults, all dials at zero:

| | value | |
|---|---|---|
| handhold width / arch stance | 0.880 / **0.880** | ✅ the arch fits at the couple's own width — no reach, no `sizeArch` let-go |
| `clearFloor` | **silent** | ✅ her arm hangs on its own |
| flatness | **0.018** | ✅ against the `FLAT_ENOUGH` 0.25 target |
| forearm tilt | 8.5° / **34.4°** | ✅ her old 0.33 upper arm put her at **128°**, pointing up |
| worst forearm gap | **−0.018** | 🔑 the least-fouling this pairing has ever measured |

🔑 **The forearm gap is the headline and the hand radius is what bought it.** Defaults gave
−0.047, and [09-19-3](2026-09-19-3-a-dial-for-elbow-back.md) had to push `hands fwd` to **+30cm**
to get `myco/player` to +0.002 — the only pairing ever to go positive against the 🔴 nine-pairing
foul. Most of that is now free at 0cm, because a smaller hand is a smaller thing for a
partner's forearm to be inside of. Putting the radius back to 0.11 sends the gap straight back
to −0.047.

🔴 **It costs 0.028 of `upperArmStrain` on her, and that was taken deliberately.** Her arm is
that much short of the hold, so her elbow wings out to 99° off the hang. The grid — strain /
her forearm tilt / her upper-arm-off-hang, `C` where `clearFloor` fires:

```
 upArm \ forearm      0.14         0.16         0.18         0.20         0.22
  0.10          0.028/41/84  0.028/34/99  0.028/28/115 0.028/21/134 0.041/17/160
  0.14          0.021/57/73  0.021/49/85  0.021/42/97  0.021/35/109 0.021/28/124
  0.18          0.017/78/61  0.017/68/72  0.017/59/82  0.017/51/93  0.017/43/104
  0.22          0.000/100/51 0.014/91/57  0.014/79/68  0.014/69/78  0.014/60/88
  0.26          0.000/120/44 0.000/111/48 0.012/106/51 0.012/91/63C 0.012/80/73C
```

Every cell that reaches **strain 0.000** puts her forearm at 100–120° — past horizontal,
pointing up, which is the look this re-authoring existed to get rid of. There is no cell that
is both unstrained and hanging. That is not a tuning failure; it is the shape of a short arm.

## 🔑 The finding: this is a diversity case, and it is the first real one

Ryan: *"let's use this as a diversity exercise and plan to build accommodations in a set number
of ways we've already discussed."*

**Myco is now the first cast member whose arm cannot make holds the rest of the dance assumes**
— not because a slider was dragged somewhere silly, but because she is a short-armed character
and was authored that way on purpose. Every reach problem before this was a *pair* problem
(these two cannot pass, these two cannot meet in the middle). This is a **body** problem, and it
follows her into every figure.

The accommodations already exist and are already decided. `accommodation.ts` is explicit that
this is the rule and not a suggestion: *"A hold added later must answer **which of these two**
rather than inventing a third silent one, and must keep the draw."*

| | what happens | decided in |
|---|---|---|
| **reshape** | both torsos change by the same amount in opposite directions; the hold survives | ADR-0037 |
| **break** | nobody changes shape, both reach their limit, the hands come apart | ADR-0037 |
| **reach** | both dancers lengthen the undrawn upper arm by the least the editor's own slider allows — the ordered last resort *before* break | ADR-0040 |

So the plan is not to re-tune Myco until the failures go away. It is to **work through the
review and, at each hold she cannot make, answer it with one of those three** — same draw, same
per-execution randomness, nothing new invented.

## What broke, and the three kinds it breaks into

Suite **31 → 36 failures**: 9 new, 4 recovered. Diffed by full test name, not by count.

✅ **Recovered (4):** `hangs an arm beside its own body rather than through it`,
`holds a matched pair's hands dead centre`, `mixed — still puts the two hands on each other`,
and `arch.test.ts`'s `charges more for a thicker arm`.

**A. Stale pins — her numbers changed, the statements did not (3).**
`handExtentAlong` across the palm 0.0314 → 0.0228; `leaves the watched default hold exactly
where Ryan signed it off` (myco+ember width 1.14 → 1.08); `max — still puts the two hands on
each other`, a coordinate pin.

**B. `clearFloor` lost its subject (3).** `puts an underground hand on the floor instead`,
`lifts a dead hang FORWARD`, `a lifted arm survives being folded in off a close partner`. Her
resting hand now sits at **+0.18**, above the floor. [ADR-0055](../adr/0055-an-arm-is-a-fixed-length-and-a-shoulder-can-be-put-anywhere.md)
says the clamp *"fires for exactly one character on the cast"* — it now fires for **none**, so
three rule-statements have nothing to exercise. 🔑 **They want a synthetic low-shoulder,
long-arm subject rather than a shipped character**, which is more robust than what they had:
the rule should be pinned on a body authored to break it, not on whoever happens to be
breaking it this month.

**C. 🔴 Real regressions — the diversity case showing up where nobody was looking (3).**

- **The fist bump over-extends her.** `keeps Myco's arm on their shoulder at every reach`:
  `upperArmStrain` reaches **0.1135** where it asserts exactly 0. `elbowReach` went 0.33 → 0.10,
  so the authored contact is past what her upper arm can make without the undrawn link
  stretching.
- **She can no longer reach the mean elbow in a forearm hold.** `🔴 is out of reach for the
  shipped default pair` asserts Ember overshoots and Myco does *not*; Myco's shortfall is now
  **0.0925**. `planForearm`'s accommodation would fire for **both** dancers rather than one,
  which is a different figure than the one that test documents.
- `the two-segment arm — Myco: reaches any point inside its own range`, whose target grid is
  built from her old dimensions.

🔑 **The standing handhold got better and the fist bump and the arm turn got worse**, and the
reason is structural rather than unlucky: the `#review` route only covers the couple figures.
Neither the bump nor the turn has a step in it.

## ❓ Open — when do the tests get fixed?

Ryan: *"I wonder if we should take care of those tests now or when we come to them in the
review."* **Undecided, deliberately.**

The argument for **now**: a red suite hides the next regression, and A and B are bookkeeping
that will only get staler.

The argument for **as we reach them**: C is not bookkeeping. Each of those three is a hold that
needs an accommodation decision, and re-pinning the assertion before making that decision throws
away the only thing currently asking for it. The failing test *is* the worklist item.

A middle reading, not chosen: do A and B now (they state rules and carry no decision), leave C
failing as the open finding it is.

## State

`src/services/body-shapes.ts` only — `MYCO_DEFAULTS` plus a comment block explaining why the
five numbers go together and what the strain buys. Typecheck clean. Uncommitted with the rest
of 09-19 and 09-20.

⚠️ **Nothing changes in Ryan's browser.** His saved `myco` in `localStorage` overrides
`MYCO_DEFAULTS` and holds the identical values, so this only shows up on a fresh profile or
after a **reset** in the body editor.

**Next:** carry on through the review. At each step where Myco cannot make the hold, answer it
with reshape, break or reach — and settle the open question above the first time it actually
bites.
