# 2026-09-12 — the diagonal goes back in

Ryan, on the chart: *"I love what we have but there are a couple tweaks I need you to make
— first — we need to include identity pairings, like you -> you, and Myco -> Myco."*

He is right, and the exclusion was never argued for. `reviewPairings` had
`if (beau !== belle)` in it from the first commit, with a comment asserting *"a dancer cannot
partner themselves"* as though that settled it. It does not settle anything: a cell is not
two people, it is two **bodies** handed to `DanceFloor` as a positional pair. `myco → myco`
is two dancers of identical build, which is a pose the geometry owes an answer for.

## What it buys, which is more than five rows

Every mixed cell moves two variables at once — the figure and the size difference. When one
reads wrong, the chart's row/column reading has to work out which, and that is exactly the
day's work that produced ADR-0046 and ADR-0047. On the diagonal the size difference is zero
by construction, so what is left is the figure alone. Read a bad mixed cell against its two
bold rows before calling it a proportion problem. [ADR-0053](../adr/0053-a-dancer-is-paired-with-themselves-too.md).

## Numbers

| | before | after |
|---|---|---|
| pairings | 20 | **25** |
| cells | 520 | **650** |
| palms measured in the hold section | 40 | **50** |

**All 50 palms are inside ADR-0052's flatness target** and all 25 gaps are 1.0× the
flat-palm ideal — so the wrist holds on five pairings it was never measured against. That is
the first thing the new rows said, and it was free.

## 🔑 The diagonal is not symmetric, and that is not a bug

`you → you` comes out with forearms at **40° and 47°**. Identical bodies, different angles —
because the hold is authored as *beau's right palm up, belle's left palm down*, so the two
hands sit at different heights whoever is standing there. The control removes the **size**
confound and nothing else. Anyone reading the diagonal as a symmetry check will file a
defect that is really ADR-0052 working.

## Where it landed

- `reviewPairings()` — the exclusion is gone, and the comment now says why the pair belongs.
- `review-chart.ts` — identity rows come out **bold**, with a second key paragraph on how to
  read them. In a 25-row table a control the eye has to hunt for does not get used.
- `review-route.test.ts` — the `beau !== belle` assertion is inverted into a test that the
  diagonal is *present*, five of five.
- `pose-review-chart.md` in `work/square-dance-planning/` re-exported: **0 of 650**.

`tsc` clean · docs-hygiene clean · **754 tests, the same 7 failing** — the six moved pins
from ADR-0052 and the terminal-arch `reshape`/`break`, none of them touching this. Neither
failing file goes through `reviewPairings`, so the count is the same seven for the same
reasons. Still nothing rated: the sweep has not started, and it is now 650 cells long.

`src/` **uncommitted**, the same deliberate state as 09-08 — the code is waiting on Ryan's
eyes, and now the pairing change is waiting with it. The chart's own copy is committed and
pushed on the `work` side (`a6ba891`).
