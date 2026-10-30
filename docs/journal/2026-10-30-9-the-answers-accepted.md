# 2026-10-30 (9): the ADR-1012/1015 answers, accepted

Ryan: *"accept 0066-0068 as proposed ... our notes should maybe say that we might have a backend at
some point and incorporate rust?"*

- **0066** (no `any` registry until the strict lint pass), **0067** (jsx-a11y for the HTML
  overlays) and **0068** (no Rust core) are Accepted.
- Before accepting, 0068 was narrowed to the **client**, and it now says so: a backend is a
  different question. The planning effort's repo map already names when it comes: sharing moves
  between players (item 6) triggers "the backend/database deliberation", and multiplayer (item 9)
  needs a sync story. Rust is a natural candidate there (the template's provable tier, Kani), and
  if client logic ever has to share a rule with that server, that's when a Rust core here is
  worth reconsidering. Both are in 0068's consequences.
- The planning effort's README notes Rust as a candidate at item 6.
