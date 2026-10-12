# 2026-10-11 (3) — a dial moves what hangs off it

Ryan looked at [(2)](2026-10-11-2-one-address-two-poses.md)'s work: *"stretch sliders work as
described and coin flip buttons work."* Everything up to there is committed (`c6f3e0d` the fold
off, `536a9cc` L and duck reshape plus the toss control, `09dce01` the ADR-0010 split, `8efa8b6`
docs). Then three corrections, all built here, **none seen yet, none committed**.

## 1. The dials are drawn, not solved

Ryan: *"the sliders I think should move the hands with … actually all attached appendages should
move downstream."*

Until now a dial changed the shape handed to the solver, so the hold stayed where the plan put it
and the arm re-solved onto it: a longer upper arm bent the elbow, the hand never moved. That is
the opposite of what a dial is for.

🔑 **Now nothing hands a dial to the solver.** `DanceFloor` poses the pair on the figure's own
bodies, then at the point it writes the rigs:

| dial | what is drawn | what rides along |
|---|---|---|
| torso | `growBody` on the resolved shape; rig lift and mesh scale from it | head, both shoulders, both arms |
| upper arm | the elbow, further out along the same line from the shoulder | forearm, hand |
| forearm | the forearm cylinder scaled about its elbow end | hand |

So a hand in a hold **leaves the hold** when a dial is turned, and the rules box says so.

🔴 **Found on the way: the forearm's mesh was never stretched by anything.** ADR-0040's reach
lengthens `shape.forearm`, the hand was seated at the longer length, and the cylinder stayed the
length it was built — a gap at the wrist on every pair that reached. It scales now.

## 2. A stretch belongs to the arm in the hold

Ryan: *"the stretch should only affect the forearm that is in the handhold, the other one should
stay unaffected."*

Applied to **both** sources of stretch:

- the **figure's reach** (ADR-0040) — one number on the shape, so the free arm is drawn back at
  its built forearm length;
- the **forearm and upper-arm dials** — held arm only. My reading: he said forearm, and I took
  the upper-arm dial with it, since a free arm's upper arm stretching is the same defect.

When neither arm is held, a dial moves both — so no slider is ever dead.

`TrackedArms.upperArmNatural` is per side now, and `readSolids` takes it per side, so the length
rule charges each arm against its own length.

🔴 Not followed through: `trackForearm`'s markers and the free arm's rest pose are still computed
from the one shared `ArmMetrics`, so on a pair that reaches, a marker on the free hand sits a
reach-length low. Markers only.

## 3. A broken turn-under is a casual pass

Ryan: *"broken turn under should be a casual pass not a close one."*

`arch.ts` `passRoom`: **a break is given no less room than the same pair's reshape.** `you →
Ember` broke at 0.576 against a reshape at 0.818; it now takes 0.818. Letting go buys no tighter
a pass than holding on. Applied in `sizeArch`'s three hold-keeping returns; the terminal let-go
(stand at twice the room) is untouched. 🧪 No ADR — still experimenting. "Casual" is my number,
not his: it may want to be wider still, or the hands lower.

## Parked by Ryan

**Dosado**, and Pass Thru with it: *"leave dosado to look at later — I wonder if our rules that we
talk about here will affect it well."* The fold is off; the rules checker is the candidate
replacement.

## State

Suite **932 passing / 38 failing / 3 skipped** (the same 38), `tsc -b` clean, eslint 0 errors.
No test moved for any of the three, which means none of them is pinned by one.

## Next

1. Ryan watches `#review=california-twirl/under-arch/player-ember`: each slider carries what is
   below it; only the held arm stretches; `break` on the toss control passes at the reshape's
   distance.
2. Commit, then the **contact sheet** (PROGRESS worklist 17) — checker throttled to pose changes
   first.
