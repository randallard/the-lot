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

### Inherited standards ADRs (1NNN)

These belong to the template. In a project, **don't edit them and don't flip their Status**: only
the template supersedes a 1NNN, with a new 1NNN. When the template adds one, copy it in
unchanged. If this project deviates from one, record that in **your own** 0NNN ADR, citing the
1NNN it departs from, and say why. A recorded deviation is a decision. An unrecorded one is
drift.

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
| [0010](0010-emote-choreography-channel-contract.md) | Emote and choreography share a dancer by channel, classified owned / limited / free | Superseded by ADR-0059–0064 |
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
| [0027](0027-the-upper-arm-hangs-and-the-hands-come-forward.md) | The upper arm hangs, and the joined hands come forward | Superseded by [0046](0046-the-hold-is-carried-at-the-taller-dancers-waist.md) |
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
| [0040](0040-a-pair-reach-before-they-let-go.md) | A pair reach with the undrawn upper arm before they let go | Superseded by [0048](0048-a-pair-reach-with-the-forearm.md) |
| [0041](0041-the-join-rises-as-far-as-the-pair-can-lift-it.md) | The join rises as far as the pair can lift it clear, and no further | Accepted |
| [0042](0042-the-reshape-aims-at-whichever-height-costs-less.md) | The reshape aims at whichever height asks the figure for less room | Accepted |
| [0043](0043-a-body-grows-from-where-it-stands.md) | A body grows from where it stands, and the rig carries the difference | Accepted |
| [0044](0044-standing-and-passing-use-one-margin.md) | Standing and passing ask the same function how far apart two bodies go | Accepted |
| [0045](0045-a-couples-width-is-the-one-they-are-dancing-at.md) | A couple's width is the one they are dancing at, not the one they would rest at | Accepted |
| [0046](0046-the-hold-is-carried-at-the-taller-dancers-waist.md) | The joined hands are carried at the taller dancer's waist | Accepted |
| [0047](0047-a-couple-stands-at-the-width-they-can-still-make-the-hold-at.md) | A couple stands at the width they can still make the hold at | Accepted |
| [0048](0048-a-pair-reach-with-the-forearm.md) | A pair reach with the forearm, and it is drawn | Accepted |
| [0049](0049-the-inside-arm-hangs-from-where-the-stance-left-room.md) | The inside arm hangs from where the stance left room | Accepted |
| [0050](0050-a-pose-is-reviewed-at-a-named-beat-not-a-caught-one.md) | A pose is reviewed at a named beat, not a caught one | Accepted |
| [0051](0051-a-couple-stands-staggered-by-the-angle-the-palm-needs.md) | A couple stands staggered, by the angle the palm needs | Superseded by ADR-0052 |
| [0052](0052-a-palm-turns-on-its-forearm-before-the-wrist-bends.md) | A palm turns on its forearm before the wrist bends | Accepted |
| [0053](0053-a-dancer-is-paired-with-themselves-too.md) | A dancer is paired with themselves too — the diagonal is the control | Accepted |
| [0054](0054-the-solve-places-the-hand-and-the-wrist-follows.md) | The solve places the hand and the wrist follows | Accepted |
| [0055](0055-an-arm-is-a-fixed-length-and-a-shoulder-can-be-put-anywhere.md) | An arm is a fixed length, and a shoulder can be put anywhere | Accepted |
| [0056](0056-a-declared-hold-keeps-the-hand-the-figure-named.md) | A declared hold keeps the hand the figure named | Accepted |
| [0057](0057-the-turn-under-is-four-named-styles-and-the-review-branches-on-them.md) | The turn-under is four named styles, and the review branches on them | Accepted |
| [0058](0058-a-raised-hold-stands-the-upper-arm-up.md) | A raised hold stands the upper arm up | Accepted |
| [0059](0059-emote-and-choreography-share-a-dancer-by-channel.md) | Emote and choreography share a dancer by channel: owned, limited or free | Accepted |
| [0060](0060-a-channel-is-limited-exactly-when-it-feeds-the-silhouette.md) | A channel is limited exactly when it feeds the silhouette | Accepted |
| [0061](0061-the-choreography-owns-position-body-facing-and-a-gripped-arm.md) | The choreography owns position, body facing and a gripped arm | Accepted |
| [0062](0062-head-facing-forward-lean-and-the-bob-are-the-emotes.md) | Head facing, forward lean and the bob are the emote's | Accepted |
| [0063](0063-an-unclassified-expression-channel-is-owned.md) | An unclassified expression channel is owned | Accepted |
| [0064](0064-the-channel-contract-governs-engine-driven-dancers-only.md) | The channel contract governs engine-driven dancers only | Accepted |
| [0065](0065-state-is-managed-facts-managed-position-and-derived-values.md) | State is managed facts, a managed position, and derived values — and a screen's transitions go through one pure reducer | Accepted |
| [0066](0066-casts-are-not-registered-until-the-lint-pass.md) | No `any` registry until the strict lint pass has run | Accepted |
| [0067](0067-accessibility-lint-for-the-html-overlays.md) | Accessibility lint (jsx-a11y) for the HTML overlays | Accepted |
| [0068](0068-no-rust-core.md) | No Rust/WASM core in the client; the-lot's logic stays at TypeScript with property tests | Accepted |
| [1000](1000-template-standards-adrs-are-inherited.md) | Template standards ADRs are inherited, numbered 1000 and up | Accepted |
| [1001](1001-project-conventions-is-the-canonical-standard.md) | project-conventions is the canonical provable-code standard | Accepted |
| [1002](1002-provable-is-a-four-rung-ladder.md) | "Provable" means a four-rung ladder, and a project claims only the rungs CI enforces | Accepted |
| [1003](1003-provable-plus-tier-verus-for-named-invariants.md) | Opt-in provable+ tier: Verus for named invariants, with a human-reviewed spec | Accepted |
| [1004](1004-kani-job-fails-without-harnesses.md) | The Kani CI job fails when there are no proof harnesses | Accepted |
| [1005](1005-every-ci-job-has-a-timeout.md) | Every CI job has a timeout: 30 minutes for proofs, 15 for the rest | Accepted |
| [1006](1006-cargo-runs-locked-in-ci.md) | Cargo runs with `--locked` in CI | Accepted |
| [1007](1007-one-day-crate-cooldown-via-cargo-min-publish-age.md) | New crate versions wait one day, via Cargo's native `min-publish-age` | Accepted |
| [1008](1008-build-scripts-are-the-rust-attack-surface.md) | Build scripts and proc-macros are treated as the Rust attack surface | Accepted |
| [1009](1009-miri-runs-without-secrets-or-shared-target-cache.md) | Miri runs without secrets and without a shared `target/` cache | Accepted |
| [1010](1010-typescript-stays-on-6-until-the-lint-gate-supports-7.md) | TypeScript stays on 6.x until the type-aware lint gate supports 7 | Accepted |
| [1011](1011-typescript-strictness-bar.md) | The TypeScript strictness bar matches what the repos already run | Accepted |
| [1012](1012-strictness-extras-offered-at-project-start.md) | Engineering-Strategy's TS extras are offered as an opt-in at every project start | Accepted |
| [1013](1013-node-24-lts-in-ci.md) | CI runs Node 24 LTS | Accepted |
| [1014](1014-npm-trusted-publishing-hygiene.md) | npm trusted publishing: bind by repository ID, never from comment- or fork-triggered workflows | Accepted |
| [1015](1015-logic-beyond-provable-lite-moves-to-a-rust-core.md) | UI logic that needs more than provable-lite moves into a Rust core compiled to WASM | Accepted |
| [1016](1016-pnpm-supply-chain-settings-stay-explicit.md) | pnpm supply-chain settings stay explicit, and major pnpm bumps are evaluated first | Accepted |
| [1017](1017-state-is-managed-facts-managed-position-derived-values.md) | State is managed facts, managed position and derived values, and a screen's transitions go through one pure, property-tested reducer | Accepted |

## Decisions this repo inherits

townage is one repo in the square-dance game family planned in
`~/Development/work/square-dance-planning/`. Two of that effort's decisions bind this repo and
are recorded there, not here:

- **ADR-0002 — retrofit the-lot, don't restart.** Why townage keeps its code and gains the
  standards in place, which is what these docs are.
- **ADR-0006 — townage consumes square-one as a pinned git dependency**, with a local link
  during co-development. That lands with the choreography adapter (milestone M4).
