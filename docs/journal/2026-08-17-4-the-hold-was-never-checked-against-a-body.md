# 2026-08-17 (4) — the hold was never checked against a body

_Documents commit `d3cd4fb` — *a couple's handhold, solved from the bodies, and the instrument that judges it*. Landed 2026-08-18 after Ryan verified the pose in the running scene._

The camera landed, Ryan used it immediately, and the first thing it showed was a defect that had
been shipped and watched and signed off two days running:

> take a look — note with different body sizes go home should update so that the handhold is
> between the beau and the belle as comfortably as possible, right? never pushed into the body of
> either — we want the square to accommodate in this case

## What it looked like, and then what it measured

`bodies: mixed`, `go home`. The two dancers were **interpenetrating** — the thin belle standing
inside the fat beau's torso — and the panel had been saying so all along for anyone who read it:
stance **0.820**, against the default cast's 1.140. A pair twice the size standing *closer
together*. The beau at **100.000%** of his reach.

Measured properly rather than by eye:

| cast | stance | torso gap | the hold | beau reach |
|---|---|---|---|---|
| `default` | 1.140 | 0.620 | clears both | 68% |
| `mixed` | 0.820 | 0.120 | **0.140 inside the beau** (0.250 counting his hand) | 100.000% |
| `max` | 1.200 | **0.000 — flush** | **0.240 inside the belle** (0.310 with hand) | 86% |

## Three defects, and the third is the one worth remembering

**One:** nothing constrained where the hold *went*. It was computed from shoulder offsets and
reach, and neither of those knows where a chest is.

**Two:** the square shrank as the bodies grew. The stance was capped by the beau's reach, and
the further the hold slid into him the less he could reach, which tightened the cap. A feedback
loop pointing the wrong way.

**Three — and this is the one:** the repo already had the right function. `lateralClearance`
over ADR-0012's rigid parts is height-aware, counts heads, and is what every other spacing
decision in the square goes through. Touch hands used `beauRadius + belleRadius` — a sum of two
radii, which permits standing flush and cannot see a head at all — because when `touchHold` was
written, the thing in front of me was *arms*, and I reached for the body number that was already
in `ArmMetrics` instead of asking what the rest of the codebase already knew. **The bug was not a
missing idea. It was a local answer to a question that had a house answer one import away.**

## What changed

[ADR-0023](../adr/0023-the-bodies-bound-the-handhold.md) supersedes ADR-0022: the stance is
floored by the pair's own clearance plus `PERSONAL_SPACE`, and by a corridor wide enough for the
hands at the hold's own height; the hold is then **clamped into that corridor**, which outranks
the preference about whose arm does the work. ADR-0022's opinions are untouched — the belle's
waist, off the midpoint, the beau covers the daylight — they just no longer get the last word
over a torso.

[ADR-0024](../adr/0024-the-dance-hangs-an-arm-outside-its-own-body.md) is the other half, and it
came out of Ryan's answer to where the fix belongs: *"I want to keep body composition as flexible
as we have it … sometimes arms will be set wide, even … even the eyes might clip but that type of
thing we don't need to build for — just bodies heads and shoulders."* The editor stays free; the
**dance** hangs the arm outside the body it is attached to. Without it, `mixed`'s beau has his
shoulder inside his own chest and every hold solved from it starts inside him.

**A third thing fell out that I did not go looking for.** With the hold no longer free to sit
exactly under a shoulder, four *shipped* pairs overshot their arms by 0.06% — every pair
involving Sprout. The reachable height band was cut from the vertical alone, and an arm already
reaching sideways has less than its whole length left to reach down with. Same shape of error as
the midpoint: **one number standing in for a constraint with two axes.** Third time this week
that description has fit. The band is now re-cut once the across is known, as a bounded fixed
point — two passes settle every cast in the repo.

## Watched, all three casts

Driven from this session. `go home`, `#dance=two-trades`, each cast in turn:

- **default** — stance 1.140, hands 0.713, off-mid 0.210, clear **0.306 / 0.030**, reaches
  68%/69%. Identical to the pose signed off this morning, which is the point: a test now pins
  those numbers.
- **mixed** — 1.070 (was 0.820), clear **0.000 / 0.150**, 100%/60%. The bodies are visibly apart
  where they used to overlap. The beau is at a straight arm and stays there: his torso is wider
  than his arm is long, so a hold he can reach *and* which is outside him is a single point.
- **max** — 1.640 (was 1.200 flush), clear **0.276 / 0.000**, 74%/89%. The square grew.

The panel prints `clear` now — daylight from the joined hands to each dancer's own surface at
the hold height — because the failure was legible in the numbers the whole time and nobody had
asked for that particular number. Negative means inside somebody.

## Owed, and unchanged by any of this

Steps (3) and (4) of the render watch: the beau's elbow from the front, Ember's from behind, on
the **default** cast. Both controls exist; the watch has now been outstanding for three days
while three instruments got built. That is the pattern to break tomorrow.
