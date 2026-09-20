# 2026-09-19 (2) — The arm was already in the floor

Continues [`2026-09-19-1-a-lever-that-moves-two-things.md`](2026-09-19-1-a-lever-that-moves-two-things.md),
which ran on Sonnet 5 and handed over. This one on Opus 5. Ryan's ask, unchanged:
*"I need the shoulder height setting to be able to decrease more … we should be able to set
myco up on the character settings so that the shoulders and upper arm work — admittedly this
is at the edge of reason but let's see what we can do."*

## The thing the last session had backwards

It read the floor plunge as something a **widened bound would introduce**, reverted the bound
to `-0.20`, and left a comment warning the next person off. Measured against the live cast
through `computePositions`/`armMetrics` in the browser, at nobody's override but her own
shipped `MYCO_DEFAULTS`:

```
myco   shoulder 0.55   arm 0.80   elbow 0.22   wrist −0.02   hand bottom −0.25
ryan   shoulder 0.95   arm 0.80                              hand bottom  0.15
player shoulder 0.91   arm 0.635                             hand bottom  0.275
ember  shoulder 1.425  arm 1.005                             hand bottom  0.42
sprout shoulder 0.75   arm 0.34                              hand bottom  0.41
```

**Myco's resting arm is a quarter of a unit underground right now**, at `shoulderY: 0.05`,
with the bound at `-0.20` and no override anywhere. The ground mesh (`DanceReviewScene`,
opaque, `y = −0.01`) cuts it off, and that stub is what Ryan photographed. The bound was never
the thing holding the defect back — it was holding the *fix* back.

## And the other thing it had backwards

> 🔴 Ryan's actual original ask — the head/body overlap — is still unaddressed.

It was not the ask. *"especially with Myco, who has their head overlapping the body"* names
why her shoulder is **hard to place**, not a thing to fix — and the next clause says what to
do about it: make the setting go lower. `headBodyGap` is untouched, `-0.4` stands, and
`computePositions` keys `headCenterY` off `bodyTop` by design so `shoulderY` was never going
to move it. That open question is closed by reading the sentence, not by a decision.

## What landed — [ADR-0055](../adr/0055-an-arm-is-a-fixed-length-and-a-shoulder-can-be-put-anywhere.md)

`clearFloor(pose, m)` in `arm-pose.ts`: a free arm that would put its hand underground is
rotated about its own **pinned** shoulder until the hand's centre sits one `handRadius` above
`FLOOR_Y`. Upper arm keeps its natural length, so `upperArmStrain` still reads zero on a rest
pose. Runs in `poseArms`' limited channel, on `_free` only, **before** `constrainArm` — the
lift is a rotation and the fold is a horizontal slide, and a slide cannot undo a lift.

`SHAPE_BOUNDS.layout.shoulderY` opens to `{ min: -1.30, max: 1.50 }` — the body's own span,
`±(height/2 + radius)` over the body bounds' extremes.

### Two design calls, and the second was found by a test

**Sideways was built first and is wrong.** A penguin reads better than a zombie, but out-to-
the-side put Myco's elbow at `|x| = 0.714` against a `restX` of 0.46 — a resting arm half a
body-radius outside the envelope `tuckedRestX` and the review chart read her at. Forward
costs nothing: `rigidParts` already declines to count a forward overhang, because dancers
pass side-on.

**Then `dosado` beat 4.25 found the hole in "forward".** Raising an arm *grows* its horizontal
budget `√(1 − aimY²)`, so rescaling a leaning arm's bearing to the new budget **widens** it —
`|localX|` 0.484 against `restX` 0.46. Fixed at the source: `aimX` is now carried across to
the bit and only ever clamped inward, and the whole lift goes into `z`.

🔴 **A residue of that survives and is recorded, not fixed.** A lifted arm genuinely reaches
forward, so `constrainArm` backs it off a diagonally-approached partner along a diagonal
bearing, and a diagonal has an `x` in it — 0.484 again, from the fold this time, bounded by
the forward reach the lift bought. It moves the arm *away* from the partner;
`arm-geometry`'s "never lets a free arm intersect the partner's" is unmoved. It is a property
of `constrainArm`, it predates this, and nothing but a floor-lifted free arm had any forward
reach to expose it.

## Ryan's setting-up numbers

Measured through the live modules at her authored `shoulderY: 0.05` (world 0.55):

| `upperArmSpacing` | hand bottom, straight hang | clamp | tilt |
|---|---|---|---|
| **0.33 (shipped)** | **−0.25** | fires | 50.4° |
| 0.20 | −0.12 | fires | 38.2° |
| 0.12 | −0.04 | fires | 23.6° |
| 0.10 | −0.02 | fires | 17.0° |
| **0.08** | **0.00** | **silent** | **0°** |
| 0.06 | 0.02 | silent | 0° |

**`upperArmSpacing` ≤ 0.08 and she hangs naturally**, clamp never firing — elbow at 0.47,
forearm down the side of her stem, hand at 0.11. That is the "shoulders and upper arm work"
Ryan asked for, and it is two sliders in the editor's Layout section, not a code change. Her
shipped 0.33 is **left alone on purpose**: it is an authored look, and re-authoring a
character to keep a new rule quiet is the wrong way round.

## Suite

**31 failed / 772, against a clean baseline of 31 failed / 763 — the identical failing
set.** 9 tests added, all passing. Baseline captured by `git stash`ing the working tree and
running with the JSON reporter, then diffed by full test name, so "the same 31" is a set
comparison and not a count. Both figures confirmed stable over three consecutive full runs.

🔴 **A flaky test, found while re-checking those numbers.** `arch.test.ts`'s *"never
reaches past the length the shape editor would let a designer author"* fails intermittently in
the **full suite** and passes in isolation. It passed 3/3 full runs both with and without these
changes, but the very first JSON capture caught it failing — which is where the "32 failed"
written in an earlier draft of these notes came from. It is not caused by anything here (it
flakes in the clean tree too), but a suite whose count moves on its own is a bad baseline to
measure a change against, and the next person comparing numbers should know. **Not diagnosed.**

Seven existing statements moved and **none were re-pinned to a number.** Each said a free arm
hangs at `aimY === -1` and each ran it through Myco; they now compare against
`clearFloor(restPose(…))`, so they keep stating the rule and will keep passing when her upper
arm is shortened and the clamp goes quiet. The exception is `expression-channels`' *"hangs an
un-emoting arm where the body says its elbow rests"*, whose real subject is a proposal writing
the **shoulder** into the pose: it now asserts the shoulder-to-elbow distance is a full
`elbowReach`, which is the defect it was written for and is invariant under all of this.

## State

Uncommitted, held for Ryan's look: `src/dance/arm-pose.ts`, `src/services/body-shapes.ts`,
`src/dance/arm-pose.test.ts`, `src/dance/arm-geometry.test.ts`,
`src/dance/expression-channels.test.ts`, plus ADR-0055 and its index row and this entry.
The `waistY` fix and the `BodyLayout.shoulderY` doc from journal 1 are carried forward; the
warning comment it left on the bound is replaced by the bound itself opening.

**Next:** Ryan looks at Myco in `#review=california-twirl/stand/player-myco`, drags
`upper arm space` down toward 0.08 in the body editor's Layout section, and says whether the
pairing reads right. If it does, the 0.33 default is his to change. The pre-existing 31
failures are untouched by any of this and are the 09-14 stragglers' business — except the
flaky one above, which is its own small thing and is nobody's yet.
