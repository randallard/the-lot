# ADR-0068: No Rust/WASM core; the-lot's logic stays at TypeScript with property tests
- Status: Proposed
- Date: 2026-10-30
- Deciders: Ryan (proposed by Claude, from the 2026-10-30 compliance review)

## Context
[ADR-1015](1015-logic-beyond-provable-lite-moves-to-a-rust-core.md) asks whether any logic needs a
guarantee beyond provable-lite, which would move it into a Rust crate compiled to WASM. the-lot's
heaviest logic is geometric: the arm and pose solve (`arm-pose.ts`, `whole-move*.ts`), the floor's
choreography (from square-one, which declined a Rust core in its ADR-0001), and the voice test's
reducer and matcher. What it needs is "the arm reaches the hand", "the floor follows legal calls",
which property tests over generated inputs check; nothing needs a proof.

## Decision
No Rust core. the-lot's logic stays in TypeScript, held by `fast-check` properties as it adopts
the provable-lite tier.

## Alternatives considered
- **Move the solver to Rust/WASM.** Speed is the only argument, and the solves run offline
  (`scripts/whole-move/`, baked tracks), not per frame.

## Consequences
- No WASM build step.
- Promotion: if an invariant needs proving rather than testing (or a solve has to run live and
  is too slow), revisit with a new ADR.
