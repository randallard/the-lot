# Architecture Decision Records (ADRs)

Significant decisions for **townage**, one file per decision, with the context and
consequences — so the *why* survives, not just the *what*.

The recognized practice is the **ADR** (Michael Nygard, 2011), commonly written with the
**MADR** (Markdown Any Decision Records) template. We use a MADR-lite form.

## Conventions

- Files: `NNNN-kebab-title.md`, zero-padded, monotonically increasing.
- Status values: `Proposed` · `Accepted` · `Superseded by ADR-XXXX` · `Deprecated`.

### One decision per file

An ADR records **one** decision. If your file has a numbered list of decisions in it, you have
written a policy document, not an ADR — split it.

The test: **if you can't supersede one part of it, it's too big.** A file bundling eleven
decisions can never be superseded, because a new ADR replacing it would throw out the ten that
were fine. So the only available move becomes editing it in place — which is how bloat quietly
destroys immutability. These are not two separate failures; the first causes the second.

### Immutable in substance

To change a decision, write a **new** ADR that supersedes the old one, and flip the old one's
status to `Superseded by ADR-XXXX`. Don't rewrite history.

Precisely what that allows and forbids:

| Part of the file | Mutable? |
|---|---|
| The `- Status:` line | ✅ that's what it's for |
| The index table in this README | ✅ it's an index |
| Typo / broken-link fixes | ✅ |
| `## Context`, `## Decision`, `## Consequences` | ❌ **frozen once Accepted** |
| Adding a new decision to an existing ADR | ❌ **write a new ADR** |
| "Amended on <date>" blocks | ❌ that's an edit wearing a hat |

If you find yourself writing "amended" inside an accepted ADR, stop: what you have is a new
decision, and it deserves its own number and its own supersession link.

### Superseding

1. Write `NNNN-new-title.md` with the new decision. In its Context, say what it replaces and
   **why the old reasoning stopped holding** — that's the valuable part, and it's the thing
   an in-place edit destroys.
2. In the old ADR, change only the Status line to `Superseded by [ADR-NNNN](NNNN-new-title.md)`.
3. Update the index below.

A superseded ADR stays in the repo, unedited, forever. Someone reading the new one needs to see
what was believed before and what changed.

### A note on the backfilled ADRs

ADRs 0001–0007 were written on 2026-07-25, during the docs retrofit, about decisions taken
between 2026-03-06 and 2026-03-28. Their `Date:` line names both the record date and the
decision date, with the commit that introduced the decision.

They were reconstructed from two sources: the 2026-03-06 session journal, which records
*intent*, and the code, which records *what actually happened*. Where the two disagree, the
ADR says so. Each one names the files and commits it was evidenced against, so a future
reader can check the reconstruction rather than trust it.

They are otherwise ordinary ADRs — immutable in substance, superseded rather than edited.

## Template

Copy [`TEMPLATE.md`](TEMPLATE.md).

```markdown
# ADR-NNNN: <title>
- Status: Proposed | Accepted | Superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Deciders: <names>

## Context
<forces at play, constraints, what makes this non-obvious>

## Decision
<what we chose, stated plainly — ONE decision>

## Consequences
<results, good and bad; what this commits us to>
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0000](0000-record-architecture-decisions.md) | Record architecture decisions (use ADRs) | Accepted |
| [0001](0001-react-three-fiber-over-babylon.md) | React Three Fiber as the 3D renderer, over Babylon.js | Accepted |
| [0002](0002-shared-refs-across-the-r3f-dom-boundary.md) | Shared refs carry per-frame state across the R3F/DOM boundary | Accepted |
| [0003](0003-rush-mode-as-a-numeric-enum.md) | Rush mode is one numeric enum, not a set of boolean flags | Accepted |
| [0004](0004-derived-phase-with-ui-override.md) | Game state stores facts; the phase is derived, with a UI-only override | Accepted |
| [0005](0005-games-launch-by-url-hash-handoff.md) | Games are separate deployments, integrated by a compressed URL-hash handoff | Accepted |
| [0006](0006-npc-dialogue-through-a-serverless-proxy.md) | NPC dialogue goes through a serverless proxy, opt-in, and degrades without it | Accepted |
| [0007](0007-localstorage-with-a-versioned-backup-file.md) | Browser `localStorage` is the only store; a versioned backup file is the escape hatch | Accepted |
| [0008](0008-react-hooks-rules-excepted-at-the-ref-boundary.md) | `react-hooks` compiler rules are excepted at the ADR-0002 ref boundary, not worked around | Accepted |
| [0009](0009-empty-catch-is-the-best-effort-storage-idiom.md) | `no-empty` allows empty catch, because best-effort storage is a deliberate idiom | Accepted |
| [0010](0010-emote-choreography-channel-contract.md) | Emote and choreography share a dancer by channel, classified owned / limited / free | Accepted |
| [0011](0011-frame-scale-derives-from-occupant-bodies.md) | The dance frame's scale derives from the occupants' bodies | Superseded by ADR-0012 |
| [0012](0012-pair-clearance-from-the-3d-silhouette.md) | Pair clearance comes from the 3D rigid silhouette, not a flat disc | Accepted |
| [0013](0013-pointer-events-with-capture-for-new-pointer-input.md) | New pointer input uses Pointer Events with capture, and branches on `pointerType` | Accepted |
| [0014](0014-radial-wheel-for-emotes-and-taught-moves.md) | Interactions are chosen from a radial wheel, held-open for novices and flickable for experts | Superseded by ADR-0015 |
| [0015](0015-radial-wheel-dead-zone-cancels-selection-unbounded.md) | The radial wheel cancels in the dead zone, and selects without an outer bound | Accepted |
| [0016](0016-contact-moves-are-authored-constraints-not-keyframes.md) | A contact move is authored as constraints on body parts, not as a keyframed pose | Accepted |
| [0017](0017-an-arm-is-two-segments-with-a-pinned-shoulder.md) | An arm is two segments — a pinned shoulder, a free elbow, and a compliant link between them | Accepted |
| [0018](0018-a-contact-move-may-bring-the-pair-into-position.md) | A contact move may bring the pair into position, and being chosen is the consent | Superseded by ADR-0021 |
| [0019](0019-a-move-may-turn-a-body-past-facing-so-the-shoulder-leads.md) | A move may turn a body past facing, so the working shoulder leads | Accepted |
| [0020](0020-the-forearm-aims-along-the-contact-axis.md) | The forearm's aim is authored, and a punch meets at shoulder height | Accepted |
| [0021](0021-being-moved-needs-a-live-yes.md) | Being moved needs a live yes, so the approach is narrowed to NPC receivers | Accepted |
| [0022](0022-a-couples-handhold-is-solved-for-the-pair.md) | A couple's handhold is solved for the pair, and the joined hands are not at the midpoint | Superseded by ADR-0023 |
| [0023](0023-the-bodies-bound-the-handhold.md) | The bodies bound the handhold, and the square grows to fit them | Superseded by ADR-0025 |
| [0024](0024-the-dance-hangs-an-arm-outside-its-own-body.md) | The dance hangs an arm outside its own body, whatever the editor says | Accepted |
| [0025](0025-the-joined-hands-hang-between-the-shoulders.md) | The joined hands hang halfway between the two inside shoulders | Superseded by ADR-0027 |
| [0026](0026-a-hand-is-the-ellipsoid-that-is-drawn.md) | A hand is the ellipsoid that is drawn, not the sphere it is made from | Accepted |
| [0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md) | The upper arm hangs, and the joined hands come forward | Accepted |
| [0028](0028-an-arch-a-pair-cannot-make-is-accommodated-two-ways.md) | An arch a pair cannot make is accommodated two ways, drawn at random | Accepted |
| [0029](0029-a-shoulder-follows-the-torso-it-hangs-from.md) | A shoulder follows the torso it hangs from | Accepted |
| [0030](0030-the-arch-clearance-is-measured-from-the-worse-accommodation.md) | The arch clearance is measured from the worse accommodation, and passed as a number | Superseded by [0037](0037-the-figure-is-sized-to-the-accommodation-drawn.md) |
| [0031](0031-the-hands-free-clearance-is-passed-too.md) | The hands-free clearance is passed too, so a Trade bows like a Twirl does | Accepted |
| [0032](0032-the-accommodation-belongs-to-the-hold-not-to-the-arch.md) | The accommodation belongs to the hold, not to the arch | Accepted |
| [0033](0033-the-forearm-hold-is-a-reach-a-pair-can-fail.md) | The forearm hold is a reach a pair can fail, and it gets the same two accommodations | Accepted |
| [0034](0034-the-engine-relinks-itself-when-a-sibling-checkout-exists.md) | The engine re-links itself when a sibling checkout exists | Accepted |
| [0035](0035-the-square-does-not-grow-for-its-widest-pair.md) | The square does not grow for its widest pair | Accepted |
| [0036](0036-the-arch-clearance-carries-its-own-margin.md) | The arch clearance carries its own margin, and must stay inside the couple's width | Accepted |
| [0037](0037-the-figure-is-sized-to-the-accommodation-drawn.md) | The figure is sized to the accommodation drawn, and a pair who let go are not held to a handhold's width | Accepted |
| [0038](0038-the-arm-holding-the-arch-up-is-in-the-gap-too.md) | The arm holding the arch up is in the gap too, and each arm is swept to its own hand | Accepted |
| [0039](0039-a-hand-is-charged-against-the-other-dancer.md) | A joined hand is charged against the other dancer only, and from where it actually is | Accepted |
| [0040](0040-a-pair-reach-before-they-let-go.md) | A pair reach with the undrawn upper arm before they let go | Accepted |
| [0041](0041-the-join-rises-as-far-as-the-pair-can-lift-it.md) | The join rises as far as the pair can lift it clear, and no further | Accepted |
| [0042](0042-the-reshape-aims-at-whichever-height-costs-less.md) | The reshape aims at whichever height asks the figure for less room | Accepted |
| [0043](0043-a-body-grows-from-where-it-stands.md) | A body grows from where it stands, and the rig carries the difference | Accepted |

## Decisions this repo inherits

townage is one repo in the square-dance game family planned in
`~/Development/work/square-dance-planning/`. Two of that effort's decisions bind this repo and
are recorded there, not here:

- **ADR-0002 — retrofit the-lot, don't restart.** Why townage keeps its code and gains the
  standards in place, which is what these docs are.
- **ADR-0006 — townage consumes square-one as a pinned git dependency**, with a local link
  during co-development. That lands with the choreography adapter (milestone M4).
