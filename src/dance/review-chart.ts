/**
 * The review matrix as markdown — the chart, filled in.
 *
 * ## Why markdown, and why this shape
 *
 * The chart's home is `work/square-dance-planning/`, beside the PROGRESS doc and the ADRs,
 * because that is the directory the effort has to be resumable from after a cleared
 * context. A rating living only in a browser's localStorage is a rating that does not
 * survive the thing this project's docs are written to survive.
 *
 * One table per figure, **steps across and pairings down**. That orientation is the whole
 * point of the chart: a column that is bad everywhere is a broken *moment* — the arch, the
 * pass, the grip — and a row that is bad everywhere is a broken *pairing*, which is
 * usually a proportion the geometry was not fitted to. Those two readings are the ones the
 * last month of ADRs were found by, and they are only visible when the axes are laid out
 * this way round. A flat list of 650 scores has the same information and shows neither.
 *
 * Notes come out underneath their table rather than inside a cell, because a note is a
 * sentence and a sentence in a table cell makes every column as wide as the worst one.
 */

import { REVIEW_FIGURES } from "./review-steps";
import { reviewPairings, cellId, pairingId, type Pairing } from "./review-route";
import { castRoster } from "../config/npcs";
import { RATING_LABELS, type ReviewRecords } from "./review-store";
import { getBodyShape } from "../services/body-shapes";
import { FLAT_ENOUGH, holdMetrics } from "./hold-metrics";

/**
 * `Myco → Sprout`, for a heading a human reads rather than an id.
 *
 * An identity pairing comes back **bold** — `**Myco → Myco**`. Those five rows are the
 * control (see `reviewPairings`), and in a 25-row table a control the eye has to hunt for
 * is one that does not get used: the reading the diagonal enables is *compare this row
 * against the mixed rows around it*, which needs it findable at a glance.
 */
function pairingName(p: Pairing, labels: ReadonlyMap<string, string>): string {
  return `${labels.get(p.beau) ?? p.beau} → ${labels.get(p.belle) ?? p.belle}`;
}

function pairingLabel(p: Pairing, labels: ReadonlyMap<string, string>): string {
  const name = pairingName(p, labels);
  return p.beau === p.belle ? `**${name}**` : name;
}

/**
 * The whole matrix as a markdown document.
 *
 * Unrated cells are `·` rather than blank, so a half-finished sweep reads as *"not yet
 * looked at"* instead of as a table with holes in it — and so the two states a review can
 * be in, unrated and rated 2 (can't tell), never look the same. That distinction is the
 * one a resumed sweep needs first.
 */
export function reviewChartMarkdown(records: ReviewRecords, now = new Date()): string {
  const labels = new Map(castRoster().map((c) => [c.id, c.label]));
  const pairings = reviewPairings();
  const cells = REVIEW_FIGURES.flatMap((f) =>
    f.steps.flatMap((s) => pairings.map((p) => cellId(f, s, p))),
  );
  const rated = cells.filter((id) => records[id] !== undefined).length;

  const out: string[] = [
    "# Square-dance pose review — the chart",
    "",
    `Generated ${now.toISOString().slice(0, 10)} from the \`#review\` route in \`the-lot\`.`,
    "**Do not hand-edit the tables** — re-export instead; hand-written scores are lost on the",
    "next export and, worse, are indistinguishable from real ones until then. Notes belong in",
    "the route, where they are stored beside the score that goes with them.",
    "",
    `**${rated} of ${cells.length} rated.**`,
    "",
    "Scale: **0** terrible · **1** bad · **2** can't tell · **3** good · **4** perfect · `·` not yet rated.",
    "",
    "🔑 **How to read a table.** Steps run across, pairings down. A bad **column** is a broken",
    "moment — the arch, the pass, the grip — and is a geometry question. A bad **row** is a",
    "pairing whose proportions the geometry was not fitted to, which is where ADR-0046 and",
    "ADR-0047 both came from. A table that is bad everywhere is neither; it is a figure.",
    "",
    "🔑 **The five bold rows are the control.** An identity pairing — **you → you**, **Myco →",
    "Myco** — is not a dancer holding their own hand; it is two dancers of *identical build*.",
    "With the size difference held at zero, whatever still reads wrong there belongs to the",
    "**figure**, and whatever only goes wrong off the diagonal belongs to the **fit**. Read a",
    "bad mixed cell against its two bold rows before calling it a proportion problem.",
    "",
  ];

  for (const figure of REVIEW_FIGURES) {
    out.push(`## ${figure.label}`, "");
    out.push(`\`${figure.call}\` · ${String(figure.beats)} beats · ${String(figure.steps.length)} steps`, "");
    out.push(`| pairing | ${figure.steps.map((s) => s.label).join(" | ")} |`);
    out.push(`|---|${figure.steps.map(() => "---").join("|")}|`);
    for (const p of pairings) {
      const row = figure.steps.map((s) => {
        const r = records[cellId(figure, s, p)];
        return r === undefined ? "·" : String(r.rating);
      });
      out.push(`| ${pairingLabel(p, labels)} | ${row.join(" | ")} |`);
    }
    out.push("");

    // The findings for this figure, in matrix order so a note sits near the cell it is about.
    const notes: string[] = [];
    for (const step of figure.steps) {
      for (const p of pairings) {
        const id = cellId(figure, step, p);
        const r = records[id];
        if (r === undefined || r.note.trim() === "") continue;
        notes.push(
          `- **${step.label} · ${pairingName(p, labels)}** — ${String(r.rating)} (${RATING_LABELS[r.rating]}) · \`${id}\`  \n  ${r.note.trim().replace(/\n+/g, "\n  ")}`,
        );
      }
    }
    if (notes.length > 0) {
      out.push(`### Notes — ${figure.label}`, "", ...notes, "");
    }
  }

  out.push(...holdSection(labels));

  // What each step is on screen to answer, once, at the end. In the route it sits above the
  // rating buttons; here it is the legend the tables are read against.
  out.push("## What each step is asking", "");
  for (const figure of REVIEW_FIGURES) {
    out.push(`### ${figure.label}`, "");
    for (const step of figure.steps) {
      const pose =
        step.pose.kind === "stand" ? "standing couple" : `beat ${String(step.pose.beat)}`;
      out.push(`- **${step.label}** (${pose}) — ${step.watch}`);
    }
    out.push("");
  }

  return out.join("\n");
}

/** The unrated chart — the tracking sheet before anybody has looked at anything. */
export function blankChartMarkdown(now = new Date()): string {
  return reviewChartMarkdown({}, now);
}

/** Every pairing id, for a caller that wants the axis without the tables. */
export function pairingIds(): readonly string[] {
  return reviewPairings().map(pairingId);
}


/**
 * The standing couple's handhold, measured — the half of the chart that does not need an eye.
 *
 * 🔑 **A rule beats a rating wherever a rule exists.** A 0–4 score says a pose looked wrong;
 * these say which of three things is wrong, on which pairings, and by how much — and they go
 * on saying it after a fix without anybody looking again. Regenerated with the chart, so they
 * cannot drift from the code the way a number quoted in prose does.
 */
function holdSection(labels: ReadonlyMap<string, string>): string[] {
  const out: string[] = [
    "## The handhold, measured",
    "",
    "Ryan's rule, 2026-09-07: *the belle's hand should be held level just above the beau's, and",
    "the beau's just below the belle's.* Solved through the real `touchHold` and `touchLift`, so",
    "this cannot disagree with what the scene draws.",
    "",
    "- **order** — beau's hand centre below the belle's. The hold as authored (*\"beau right palm",
    "  up and belle's left palm down\"*).",
    "- **gap** vs **ideal** — centre-to-centre distance, against what it would be with the two",
    "  palms lying flat on each other. `ideal` is the sum of the two half-thicknesses.",
    "- 🔴 **flat** — 0 = palm lying in the contact plane, 1 = palm standing on its rim. **There is",
    "  no wrist**: a hand's orientation is its forearm's, so this is decided by wherever the reach",
    `  left the arm. Target is ${FLAT_ENOUGH.toFixed(2)} or less.`,
    "- **tilt** — the forearm off straight-down, in degrees. Over 90° is a forearm pointing *up*.",
    "",
    "| pairing | order | gap | ideal | ×ideal | flat beau | flat belle | tilt beau | tilt belle |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  const mark = (ok: boolean) => (ok ? "✅" : "🔴");
  // `+ 0` because a palm that came exactly level lands on negative zero, and a chart that
  // prints `-0.00` for "perfect" invites a bug hunt with no bug in it — the same guard the
  // hold readout puts on its clearances.
  const flat = (n: number) => (Number(n.toFixed(2)) + 0).toFixed(2);
  for (const p of reviewPairings()) {
    const m = holdMetrics(getBodyShape(p.beau), getBodyShape(p.belle));
    const name = pairingLabel(p, labels);
    out.push(
      `| ${name} | ${mark(m.stacked)} | ${m.gap.toFixed(3)} | ${m.idealGap.toFixed(3)} | ` +
        `${(m.gap / m.idealGap).toFixed(1)}× | ` +
        `${mark(m.beau.flatness <= FLAT_ENOUGH)} ${flat(m.beau.flatness)} | ` +
        `${mark(m.belle.flatness <= FLAT_ENOUGH)} ${flat(m.belle.flatness)} | ` +
        `${m.beau.forearmTilt.toFixed(0)}° | ${m.belle.forearmTilt.toFixed(0)}° |`,
    );
  }
  out.push("");
  return out;
}
