# ADR-0053: A dancer is paired with themselves too — the diagonal is the control
- Status: Accepted
- Date: 2026-09-12
- Deciders: Ryan, Claude

## Context

[ADR-0050](0050-a-pose-is-reviewed-at-a-named-beat-not-a-caught-one.md) built the review
matrix and rejected folding the ordered pairings into unordered ones, because ADR-0046
exists precisely because the role swap is not a symmetry. That reasoning still holds and
ADR-0050's decision is untouched. What it did not examine is the **other** pair it left
out: `reviewPairings` excluded `beau === belle` without ever arguing for it, on what reads
in hindsight as a literal reading of the word *partner*. Ryan asked for them back on
2026-09-12: *"we need to include identity pairings, like you -> you, and Myco -> Myco."*

The exclusion looked obviously right and is not. A cell is not two *people*; it is two
**bodies** handed to `DanceFloor` as a positional pair, and `Dancer` seats every occupant at
the same body centre. `myco → myco` is therefore not a dancer holding their own hand — it
is **two dancers of identical build**, which is an ordinary pose the geometry owes an answer
for and which no other cell in the matrix stands up.

What makes it worth 130 extra cells is what it removes rather than what it adds. Every
mixed cell varies two things at once — the figure and the size difference — so when one
reads wrong, the chart's row/column reading has to *infer* which. The 09-07 sweep that
produced ADR-0046 and ADR-0047 was exactly that inference done by hand. On the diagonal the
size difference is zero by construction, so the confound is gone: whatever still reads
wrong there is the **figure**, and whatever appears only off the diagonal is the **fit**.

## Decision

**`reviewPairings()` returns every ordered pair the roster can form, identity included** —
25 on the shipped cast of five, the full n × n and not n × (n−1). The five identity rows are
labelled in bold in the exported chart, and read as the control the mixed rows are compared
against.

## Alternatives considered

**Leave them out and reason about the confound by hand.** What we were doing. It worked
twice, and both times it took a day and an ADR to establish something the diagonal would
have shown in one cell.

**A separate "symmetric bodies" harness outside the matrix.** Rejected: the matrix's whole
value is that it is enumerable and addressable, and a control that lives somewhere else is a
control that is not in the chart, not in the URL space, and not in the sweep. It would also
need its own copy of the step and figure axes.

**Synthesise a mean body and pair it with itself.** One control row instead of five, and a
smaller cost. Rejected because it tests a body nobody dances as: the point of the diagonal
is that each *real* build gets asked how it does against itself, and Sprout's answer is not
Myco's — the two are at opposite ends of every proportion the geometry has ever tripped on.

## Consequences

The matrix is **650 cells**, not the 520 named in ADR-0050's consequences — 25 pairings ×
26 steps. A fifth NPC now makes it 36 × 26 = 936; the axis grows quadratically rather than
by n−1, so the cost of a new cast member has gone up and should be weighed as such.

The handhold measurements come along for free, since `holdSection` walks the same pairings:
**50 palms now, all 50 inside ADR-0052's flatness target**, and the five new gaps are all
1.0× the flat-palm ideal. ADR-0052 held on bodies it was never measured against.

🔑 **The diagonal is not expected to be symmetric, and reading it as if it should be is the
trap this ADR creates.** The hold is authored as *beau's right palm up, belle's left palm
down* (ADR-0052), so the two hands sit at different heights even on identical bodies — on
`you → you` the forearms hang at 40° and 47°. That difference is the stacking, not a defect.
The control removes the *size* confound and nothing else.

**Promotion condition:** if a figure is ever added whose choreography is undefined when the
two dancers have equal measurements — a tie broken by height, say — the diagonal will be
the first place it fails, and the answer is to define the tiebreak in a new ADR rather than
to drop the row that found it.
