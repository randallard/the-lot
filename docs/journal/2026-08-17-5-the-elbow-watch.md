# 2026-08-17 (5) — the elbow watch, taken

_Documents commit `d3cd4fb` — *a couple's handhold, solved from the bodies, and the instrument that judges it*. Landed 2026-08-18 after Ryan verified the pose in the running scene._

Ryan: *"now do the elbow watch on the default cast."* Three days owed, both controls finally
built, no more excuses. `#dance=two-trades`, `go home`, `bodies: default`, orbited to a front
view, a rear-quarter view, a side view and a plan view.

## What the numbers said first

Deliberately measured before looking, so the picture had something to disagree with:

| | beau (Myco) | belle (Ember) |
|---|---|---|
| shoulder | x −0.460, y 0.950 | x +0.360, y 1.425 |
| elbow | x −0.460, y 0.659, z −0.155 | x +0.360, y 1.304, z −0.307 |
| hand | x −0.780, y 0.603, z 0 | x +0.360, y 0.782, z 0 |
| elbow − shoulder, laterally | **0.000** | **0.000** |
| outboard of its own hand? | no — 0.460 against 0.780 | no — directly above it |
| undrawn upper arm | 0.330 = `elbowReach` exactly | 0.330 = `elbowReach` exactly |

## Step 3 — the beau's elbow: passes, and the forearm is the feature it was said to be

All three properties hold in the picture as well as the arithmetic.

**Lateral:** no flare. The drawn forearm's near end sits under his own shoulder; nothing about
holding a hand pulls the elbow sideways, which is what keeping the humerus in its own shoulder's
plane was for.

**Behind the body:** clearest from **above**, which turned out to be the view this question
wanted — in plan the red forearm runs from back to front, elbow nearer the camera-away side and
hand forward at z 0. From the front it reads as the forearm angling forward out of his side.

**Never outboard of the hand:** the forearm's inner end is at his torso edge and the hand ball is
at the far end, toward the belle. Unambiguous from every angle.

**And the 81° forearm looks exactly like the defect it is not.** The warning written two entries
ago was right to insist on the elbow rather than the angle: at a glance his arm reads as "pointing
at the belle", and the thing that makes it correct — the elbow inboard, at his own shoulder — is
only visible if you go looking for it. Worth keeping as the standing instruction for anyone
watching this pose.

## Step 4 — Ember's elbow: the detached reading is real, and it is not the hold's doing

Her elbow sits **0.087 behind her own back surface**, 0.121 below her shoulder. What that looks
like depends entirely on where you stand:

- **From the front** — hidden. Her torso occludes it and the forearm appears to emerge from her
  side, which is the ordinary look.
- **From behind or rear-quarter** — the forearm floats clear of her back with grey floor visible
  between it and her body, and her hand is a separate pebble below the forearm's tapered tip. It
  reads as a detached forearm.

**Then the control that settles it: her *free* arm looks identical.** Same wedge, same wrist gap,
same floating pebble, on the outside arm that is doing nothing at all. So this is ADR-0017's
undrawn upper arm plus her authored shape — a forearm tapering 0.10 → 0.025 with a 0.015 wrist gap
under a 0.07 hand — and **not** something the handhold introduced. If Ryan wants it to read as
attached, that is a body-shape or a draw-the-upper-arm decision, and it applies to every dancer
standing still, not to touch hands.

**The hands do meet, and it is visible.** Her small hand sits directly on top of his larger one,
hers above and his below, confirmed from the front, from behind, and from directly above.

## Two things the watch found that were not on its list

**🔴 The joint markers do not render for this pose.** `track.grip = grip?.hand ?? null` takes its
value from square-one's motion grips, and a standing couple's touch hold is not one — so
`grip` is null, and the markers' `visible = side !== null` hides every elbow and hand dot. The
control built to make elbows checkable is dark for the one pose the elbow watch is about. I judged
from the drawn geometry instead, which is sound (ADR-0017: the forearm *is* drawn from the elbow,
so its near end is the elbow) but it is not what the panel promises.

**🔴 The scene writes a hash it cannot read back.** `DanceDebugScene` writes `#dance=${call}` —
the *call* name — while `danceSceneFigure` looks up by figure **id**. So the couple figure
`two-trades` rewrites the URL to `#dance=partner-trade`, which matches no id and falls back to
Dosado on reload. Every couple watch is unshareable and unreloadable, and the entry two back
listed "camera state is not in the URL" as the reason a watch cannot be handed over as a link —
the figure is not in the URL either, and that one is a plain bug.

## Verdict

**Both elbows pass.** The pose that has been sitting unjudged since the handhold landed is
correct, in the picture as well as in the tests. Nothing about ADR-0022's opinions or ADR-0023's
clamps needs revisiting on the default cast.
