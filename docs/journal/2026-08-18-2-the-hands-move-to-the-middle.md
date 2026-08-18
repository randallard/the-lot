# 2026-08-18 (2) — the hands move to the middle, and the lateral stops being an opinion

_Documents commit `d3cd4fb` — *a couple's handhold, solved from the bodies, and the instrument that judges it*. Landed 2026-08-18 after Ryan verified the pose in the running scene._

Ryan, after looking at the standing couple with the joint markers finally working:

> ok I took a look at the hands - we're on the right track but they can move to the horizontal
> middle between the dancer's shoulders - vertical level should be at the belle's waist - the
> body / head disproportion might affect this but that's the general rule

[ADR-0025](../adr/0025-the-joined-hands-hang-between-the-shoulders.md), superseding ADR-0023.

## What the hold was doing, said precisely

`lateral` was **0.210 toward the belle** on the default cast. That number is
`width / 2 − belle.restX` — *her inside shoulder, exactly*. ADR-0022's rule ("her arm hangs, the
beau covers the daylight") does not put the hands near her shoulder as a side effect; it puts
them **on** it, because her share of the gap between the two inside shoulders was defined as
zero.

So Ryan's "they can move to the middle" is a precise instruction: the hands were at one end of
the gap and belong halfway along it.

## The fix is smaller than the rule it replaces

```ts
const preferred = (beau.restX - belle.restX) / 2;
```

That is the whole lateral rule now. It deleted a `daylight`, a `beauSpan` and a `belleSpan`,
and it is worth naming *why* it can be that short: the beau's inside shoulder is `beau.restX`
in from his side of the stance and the belle's is `belle.restX` in from hers, so the point
between them is off the couple's midpoint by half the difference — **independent of the
stance**, because both shoulders move with it.

Two consequences fell out that the old rule had to work for:

- **Both dancers reach the same distance across** (`daylight / 2` each), by construction. The
  old rule needed a shortage case — "she takes daylight back only where the bodies force the
  pair wider than his arm can span" — and the new one cannot get into that state.
- **The stance cap changed with it.** `arms` was "as far as the beau can stand and still reach
  her hanging hand". Her hand does not hang any more, so it is now
  `beau.restX + belle.restX + 2 · min(beauReach, belleReach)` — as far as the pair can stand and
  still meet in the middle. It binds on no cast in the repo either way; leaving it would have
  been a comment that had quietly stopped being true.

## What it did to the three watched casts

| cast | stance | height | lateral | across (both) | clear beau/belle | reach |
|---|---|---|---|---|---|---|
| `default` | 1.140 | 0.713 | 0.210 → **0.050** | 0.160 | 0.146 / 0.190 | 55% / 71% |
| `mixed` | 1.070 | 0.670 | **0.175** | 0.000 | 0.000 / 0.150 | 100% / 60% |
| `max` | 1.640 | 0.903 | **0.005** | 0.115 | 0.171 / 0.105 | 68% / 90% |

**Stance and height did not move on any of them** — the two numbers Ryan signed off yesterday,
and the one he restated in the same sentence ("vertical level should be at the belle's waist").

**`max` is the one that shows the rule earning its place.** Under the old rule the hold was
clamped *flush* against the belle's surface there (clear 0.276/0.000): the preference walked it
into her and ADR-0023's clamp caught it. It now lands at 0.005 with daylight on both sides, and
the clamp does not bind. Same on `default`, where the clearances went from a lopsided
0.306/0.030 to 0.146/0.190.

**And the clamp binds on none of the three casts now.** That is the honest way to describe what
ADR-0025 did to ADR-0023: the bound is still there and still outranks the landmark — it is what
Ryan's "the body / head disproportion might affect this" *is* — but it has stopped being the
thing that decides where the hands go on the bodies we ship.

## The trade, named

**Equal distance is not equal effort.** On `max` the belle spends 90% of her reach against the
beau's 68% for the same 0.115 across, because her arm is shorter. The old rule bought the beau
a lower number by making him do all the reaching, which sounds backwards and was: it was
*placing* the hold to manage effort. Effort is now a consequence, and `upperArmStrain` /
`touchReach` are what report it.

The panel says this in as many words now — the `across` figures should match, the percentages
need not — because the previous blurb ("the two reaches should be equal, or the smaller one
should belong to whoever has slack") described a rule that no longer exists, and a panel
describing the wrong rule is the defect class this week has been about.

## Watched live

`#dance=two-trades`, `go home`, all three `bodies` casts. The hands read as **two hands meeting
between the dancers** rather than as the belle's hand being held, which is the change Ryan
asked for and the thing no number says.

⚠️ **The elbow watch's verdict is from the old placement.** Both elbows passed on 2026-08-17
against a hold 0.210 toward the belle; the beau's across dropped 0.320 → 0.160 and the belle's
rose 0.000 → 0.160, so *her* arm is the one now doing something it was not. Nothing in the
picture looked wrong on any cast, but a proper four-step re-watch on the default cast is owed
before this is called done.

## State

**597 tests** (from 596), lint 0 errors and none in `src/dance/`, typecheck and build clean.
Three tests changed rather than were added: the two that pinned the old lateral rule now pin the
landmark, and the signed-off-numbers test carries 0.050 with a note about which of its three
numbers Ryan changed and which he did not.
