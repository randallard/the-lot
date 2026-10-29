# 2026-10-29 (6): the-lot takes the standard, piece by piece

✅ Committed on Ryan's word (*"do 6, 5, 3, then commit to data"*). Standards only: the Star Thru and
twirl work of 10-29 (3)–(5) stays uncommitted for his look.

## The decision

The 10-29 compliance review ([note](../compliance/2026-10-29.md)) left one big gap: the-lot had
neither adopted the template's provable-code standard nor recorded a deviation from it. Ryan:
*"the lot should take the standard but we'll work towards it piece by piece"*. It's recorded in
the README's new "Standards" section and in PROGRESS's Standards line, which lists what's still to
take, in order. Until a piece lands, its gap stays open. It isn't an exception.

## Three pieces in

- **The docs-hygiene error.** The 10-27-7 journal linked to square-one's journal through a sibling
  checkout (`../../../square-one/…`). It now uses the GitHub URL. That's a link-only change, not a
  change in substance, so the entry is still append-only. Hygiene is clean (4 warnings: three long
  ADRs and no stance review).
- **Node 24 (ADR-1013).** Both `setup-node` steps in `ci.yml`, plus `"engines": { "node": ">=24" }`.
- **Secret scan.** The template's `secret-scan` job, copied as is: gitleaks 8.30.1 fetched and
  checked against a pinned SHA-256, the full history scanned with `--redact`, and `deploy` waiting on
  it. Run locally first: 177 commits, **1 finding, a false positive.** `key: "0.torso.lean-fwd"` in
  `review2-session.test.ts:36` (commit `2ba0189`, 10-18) is a pose-dial name. It's in
  `.gitleaksignore` by fingerprint, with the reason. After that: no leaks.
- The osv job's comment said it was "pinned by tag". It's pinned by SHA, so the comment now says
  so. The template carries the same stale comment.

⏳ **Next on the standard:** the first stance review, then property tests for the `review2-session`
and `pose-events` reducers. Back to Star Thru first: Ryan's keyframes on ryan × 2 (10-29 (5)).
