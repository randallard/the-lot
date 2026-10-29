# 2026-10-28 (12): sprout and ember — all 25 Allemandes

🧪 Exploratory, uncommitted, for Ryan's look (*"work on sprout and ember"*). the-lot only; square-one
is untouched, so no release this time.

**All 25 Allemande Lefts clean and baked** (were 22). Report:
[`solve-all/2026-10-28-allemande-all-25.md`](../solve-all/2026-10-28-allemande-all-25.md).

## Sprout ↔ ember: unequal forearms

Traced (`try-fold-one.ts`): the hands met, but sprout's forearm was stretched to 1.5× and ember's
squashed to 0.76×. "Each hand at the other's elbow" both ways forces the two forearms to one
length; sprout's is 0.20, ember's 0.605. The floor's `contactRadius` has always said what people do:
the longer forearm's hand reaches the partner's elbow, the shorter's holds further up the longer.

- `whole-move.ts`: `gripSlides(m, k)`, true for the shorter forearm. That hand's target is the
  closest point of the partner's forearm (elbow to wrist), not the elbow. In the readable cost, the
  exact gradient (the pull split between elbow and wrist by the clamp parameter) and `metrics`.
- `armTurnGrip` and `forearmStart`: the elbows sit the **longer** forearm apart, not the mean; each
  hand starts its own forearm out along the line.

24 of 25 clean after this.

## Ember ×2: the step-in

A forearm swinging 30–38° a sample in the beat before contact. Traced: the belle's hanging forearm
began tilted back (pitch −71°, heading −45°) and turned 160° on the way up; the beau's turned 67°.

- Tried and reverted: a weak forearm reach over the step-in. It pulled each hand toward an elbow
  still 1–2 m away; 25 outliers, everything stretched.
- Tried and narrowed: pinning raise and pitch to a hanging arm at both ends (targets, as the twirl
  pins its ends). At the end it moved the swing there: the grip lets go half a beat before the
  call ends, and dropping the arm in under three samples was 30–33°. **Start only.**
- The hanging arm's heading is free, so before the grip the start gives the held arm the heading it
  will need at contact: the swing up is then the lift, not a turn as well. Worst swing 20°.

## The upper arm is never longer than it is

The floor broke a rule on the new sprout → ember bake that solve-all called clean: *"Ember's left
upper arm is stretched 0.015"*. `pose-rules`' length rule holds the drawn upper arm to its length
within 1 cm (`SKIN`); the solver charged stretch gently both ways and flagged only past 1.25×.
Measured across the bakes: myco ↔ ember 4.2 / 3.2 cm, sprout ↔ ember 2.0 / 1.9, Partner Trade
sprout → ryan 1.3.

- `whole-move.ts`: an upper arm past its length costs like a clip (readable and gradient).
  `Metrics.upperOver`, and solve-all flags past 1 cm, so a bake can't be called clean while the
  floor says otherwise.
- Every figure re-solved: 100 of 100 clean. Allemande and Partner Trade re-baked (50 files); worst
  upper arm now 0.2 cm. Dosado and Pass Thru bakes are under the skin (0.6 cm) and stay.

⚠️ **Found, not touched:** the twirl's `meet` bakes for myco → ember and sprout → ember draw the upper
arm **54–56 cm** past its length. Older bakes, reviewed under the twirl's own rules (the arch's
reach); worth a look against the floor's length rule.

## Checks

- `tsc -b` clean; the suite at the 38 known failures, 1151 passed (2 new: which hand slides, and the
  sliding hand costing the same anywhere along the forearm).
- `#review=allemande-left/half/sprout-ember`, `/half/myco-ember`, `/three-quarters/ember-sprout`,
  `/grip/ember-ember` and `partner-trade/quarter/sprout-ryan`: baked solve drawn, rules all kept.

⏳ **Next:** Ryan looks → commit (no square-one change). Then the twirl's long upper arms.

## Committed

Ryan: *"commit it"*. On the existing pin to square-one v0.10.0; nothing upstream changed.
