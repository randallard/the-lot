# ADR-0009: `no-empty` allows empty catch, because best-effort storage is a deliberate idiom
- Status: Accepted
- Date: 2026-07-25
- Deciders: Ryan

## Context
Turning `pnpm lint` into a blocking CI gate surfaced 24 `no-empty` errors — by count, the
single largest category. Every one of them is the same three lines:

```ts
try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
} catch {}
```

They appear in seventeen files across `services/`, `state/`, `overlay/`, and `App.tsx`, and
they are all wrapped around `localStorage` access.

This is not carelessness. It follows directly from
[ADR-0007](0007-localstorage-with-a-versioned-backup-file.md): `localStorage` is the only
store, and it is a store that can genuinely fail — quota exhausted, private browsing, storage
disabled by policy, a serialisation error on a value someone edited by hand. In every one of
those cases the correct behaviour is for the game to carry on. A player whose NPC win/loss
record fails to save should still be able to play; the failure is not worth a modal, and
there is no recovery to attempt.

An empty catch is therefore the accurate expression of the intent: *attempt this, and if it
doesn't work, proceed.* The lint rule cannot distinguish that from a swallowed error nobody
thought about.

## Decision
Set `no-empty: ["error", { allowEmptyCatch: true }]` in `eslint.config.js`, with a comment
naming the idiom and pointing at ADR-0007. Empty blocks of every other kind — `if`, `for`,
`while`, bare blocks — remain errors.

## Alternatives considered
- **A comment inside each catch.** ESLint's `no-empty` ignores a block containing a comment,
  so this would also have worked with no config change. Rejected: 24 near-identical comments
  restating the same idiom is noise that makes the codebase harder to read, not easier, and
  it puts the rationale in 24 places instead of one.
- **Log the failure** (`catch { console.warn(...) }`). Rejected: it changes behaviour for no
  benefit. These failures are expected and unactionable; a console full of storage warnings in
  private-browsing mode trains people to ignore the console.
- **A `safeStorage` wrapper** that centralises the try/catch and exposes
  `get`/`set`/`remove`. This is the genuinely better answer — one place for the idiom, one
  place to add telemetry later, and the rule could stay at its default everywhere else.
  Rejected **for now** only on timing: it touches seventeen files and every storage-owning
  module, immediately before M4. Deferred deliberately, not dismissed — see below.
- **Disable `no-empty` entirely.** Rejected; the rule catches real mistakes in non-catch
  blocks and there is no reason to lose that.

## Consequences
- CI can gate on lint without 24 errors that describe a deliberate pattern.
- **The exception is broader than the idiom it exists for.** `allowEmptyCatch` is repo-wide,
  so a genuinely careless `catch {}` around something that *should* be handled will now pass
  lint. That is a real cost and the reason the wrapper below is the preferred end state.
- The rationale lives in one place — this ADR and the comment in `eslint.config.js` — rather
  than being re-derived by every reader who meets one of the 24 sites.
- **Promotion condition:** introduce a `safeStorage` helper when something forces the issue —
  a storage failure that actually needs to be observed (telemetry, a "your progress isn't
  saving" warning), or the backup-completeness test noted in ADR-0007 wanting a single place
  to enumerate keys. At that point the try/catch collapses into the helper, this exception can
  be dropped, and this ADR is superseded.
