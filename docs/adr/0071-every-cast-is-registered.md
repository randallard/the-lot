# ADR-0071: Every cast is justified inline and registered
- Status: Accepted
- Date: 2026-11-01
- Deciders: Ryan ("1: start it", 2026-11-01)

## Context
[ADR-0066](0066-casts-are-not-registered-until-the-lint-pass.md) put the `any` registry
([ADR-1012](1012-strictness-extras-offered-at-project-start.md)) off until the strict lint pass,
because most casts were expected to go in it. The pass reached zero findings on 2026-11-01
([journal 11-01 (2)](../journal/2026-11-01-2-the-lint-pass-reaches-zero.md)), with
`no-unnecessary-type-assertion` on. So every cast left is one the compiler needs. A count over the
TypeScript AST gives **177 `as` casts** (137 in `src/` and `api/`, 40 in test files) and **no
`any`**. (A text grep had suggested about 650, because it matched prose too.)

## Decision
Adopt the registry, as square-one did (its ADR-0027). Every `any`, and every `as` other than
`as const`, in `src/` and `api/` (test files included) does both of these:

- it carries an inline comment saying why it's sound;
- it's listed in [`docs/any-registry.md`](../any-registry.md) with its file, the cast, and the
  reason.

A cast that typed code can replace is replaced, not registered. A new cast without both doesn't
merge. `scripts/` is out of scope: it's in no tsconfig and is linted without types
([ADR-0070](0070-strict-lint-with-two-react-shaped-options.md)).

## Alternatives considered
- **Register only casts outside tests.** A test's cast hides a wrong assumption just as well, and
  40 is not many.
- **Keep deferring.** ADR-0066's own promotion condition has been met.

## Consequences
- Supersedes ADR-0066.
- Like-for-like casts can share one registry row (for example, one row for every
  `[number, number, number]` tuple read from three.js), as long as the inline comment is at each site.
- The README can claim provable-lite once the registry is complete (PROGRESS).
- Promotion: if the registry stops being kept, the compliance review's ADR-1012 item shows it.
  If casts keep growing in one module, that module's types want fixing instead.
