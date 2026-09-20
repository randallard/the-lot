# 2026-09-19 (3) — A dial for elbow back

Ryan, after the hands-in-front measurement in
[`2026-09-19-2`](2026-09-19-2-the-arm-was-already-in-the-floor.md): *"just playing with it —
give me a dial for elbow back."* 🧪 **Nothing is decided here.** This is an instrument, built
the same way the turn-in, stagger and hand-height dials were.

## There is no elbow to turn, so the dial is at the other end

A handhold's elbow is **derived, not posed**. `touchPose` cuts the circle of legal elbows down
to two points by anatomy — the humerus stays in the plane of its own shoulder — and takes the
one further back. No tuned constant, no free parameter (`ELBOW_SWING` and `ELBOW_BACK` were
what it *replaced*). So there is nothing in there to dial without changing that rule, which is
not a thing to do while playing.

**What sends an elbow back is the hands going forward.** So the dial moves `hold.forward` —
the one point both dancers independently solve their own arm onto — exactly as the hand-height
dial moves `hold.height`, and the anatomy still decides where the elbow lands.

What it spends is ADR-0027. `hold.forward` is normally *as far forward as both dancers can
hold with the upper arm hanging*, so past that the upper arm stops hanging. The readout prints
that cost in two numbers:

- **upper arm off hang**, per dancer — the elbow's angle from straight down at its own
  shoulder. ADR-0027's zero.
- **strain** — `upperArmStrain`, world units the undrawn upper arm has been stretched past its
  natural length. Red as soon as it leaves zero: the hold has been asked for past the end of
  somebody's arm.

`🧪 hands fwd`, −20 to +40 cm, signed, gated by its own checkbox, `stand` step only, never
saved with a rating. `holdMetrics` takes it as a sixth argument; `DanceFloor` as
`handForward`. `0` changes nothing anywhere.

## What it already shows

Swept headlessly (s = strain, g = worst forearm gap, f = worst flatness):

| pairing | 0cm | 10cm | 20cm | 30cm |
|---|---|---|---|---|
| player/player | s0.000 g−0.045 **f0.13** | s0.015 g−0.026 **f0.00** | s0.044 g−0.021 f0.00 | s0.088 g−0.022 f0.00 |
| player/myco | s0.000 g−0.047 f0.02 | s0.016 g−0.042 f0.00 | s0.046 g−0.032 f0.00 | s0.092 g−0.034 f0.00 |
| myco/player | s0.000 g−0.008 f0.00 | s0.009 g−0.012 f0.00 | s0.039 g−0.005 f0.00 | s0.093 **g+0.002** f0.00 |
| ryan/ryan | s0.000 g−0.020 f0.00 | **s0.000** g−0.026 f0.00 | s0.045 g−0.026 f0.00 | s0.108 g−0.023 f0.00 |
| ember/sprout | s0.000 g−0.013 f0.00 | **s0.000** g−0.011 f0.08 | s0.039 g−0.008 f0.00 | s0.130 g−0.008 f0.00 |

🔑 **Forward buys both of the things the chart has been complaining about.** The forearm gap —
the 🔴 "nine pairings reach a hand through the partner's forearm", 21/25 fouling abreast as of
09-14 — roughly halves on `player/player` by 10cm, and `myco/player` **stops fouling
altogether** at 30cm, the first time any pairing has gone positive. Flatness collapses to 0 on
the pairing that had the worst of it.

🔴 **And it is not free, on the pairings that matter most.** Strain leaves zero at about **5cm**
on anything involving the player — his forearm is already 93% spent just dropping from his
elbow to the hold — while `ryan/ryan` and `ember/sprout` hold out to 15–20cm. So the honest
window is **5–15cm** if the upper arm is to keep hanging, and the interesting territory for
fouling is further out than that.

That tension is the decision this instrument exists to inform, and it is ADR-0027's: whether a
resting handhold is *as far forward as a hanging upper arm allows*, or *as far forward as the
hold needs to be*, with the upper arm coming off the hang to pay for it.

## State

Uncommitted with the rest of the day. `hold-metrics.ts` gained `handForward` plus
`upperArmAngle`/`strain` on `HandMetrics`; `DanceFloor` gained the `handForward` prop;
`DanceReviewScene` gained the dial and a second readout line. Suite **31 failed / 772 against
the same baseline of 31 failed / 763** — unchanged, no new tests (an instrument with a `0`
default that changes nothing is pinned by every existing test already passing through it).

**Next:** Ryan plays. If forward past the hang is worth having, ADR-0027 is what gets
superseded, and the forearm-gap numbers above are the argument.
