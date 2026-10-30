# ADR-0068: No Rust/WASM core in the client; the-lot's logic stays at TypeScript with property tests
- Status: Accepted
- Date: 2026-10-30
- Deciders: Ryan (proposed by Claude, from the 2026-10-30 compliance review)

## Context
[ADR-1015](1015-logic-beyond-provable-lite-moves-to-a-rust-core.md) asks whether any logic needs a
guarantee beyond provable-lite, which would move it into a Rust crate compiled to WASM. the-lot's
heaviest logic is geometric: the arm and pose solve (`arm-pose.ts`, `whole-move*.ts`), the floor's
choreography (from square-one, which declined a Rust core in its ADR-0001), and the voice test's
reducer and matcher. What it needs is "the arm reaches the hand", "the floor follows legal calls",
which property tests over generated inputs check; nothing needs a proof.

This is about the **client**. A backend is a different question that hasn't been asked yet: the
planning effort's repo map says sharing moves and sequences between players (its item 6) is what
triggers "the backend/database deliberation", and multiplayer (item 9) needs a sync story too.
When that comes, Rust is a natural candidate for it: the template holds Rust to the provable tier
(Kani), and a server that keeps people's shared choreography and consent (planning ADR-0010) is
where a proven invariant could matter.

## Decision
No Rust core in the client. the-lot's logic stays in TypeScript, held by `fast-check` properties as
it adopts the provable-lite tier. This says nothing about a future backend, which gets its own
decision.

## Alternatives considered
- **Move the solver to Rust/WASM.** Speed is the only argument, and the solves run offline
  (`scripts/whole-move/`, baked tracks), not per frame.

## Consequences
- No WASM build step.
- Promotion: if an invariant needs proving rather than testing (or a solve has to run live and
  is too slow), revisit with a new ADR.
- A backend, when the planning effort's sharing or multiplayer stage starts, is decided in its own
  ADR, with Rust on the table. If client logic then wants to share code with it (a rule the server
  must also enforce), that is the moment to reconsider a Rust core here.
