# 2026-10-31 (10): EmoteBuilderModal.tsx

Ryan: *"start on EmoteBuilderModal.tsx."* There were 5 findings, not 10-31 (6)'s 63: the autofixes
and ADR-0070's options took the rest.

- **The eye-keyframe slider read `(kf.override[f.key] as number) ?? 0`.** The cast hid an
  `undefined` (the override is a `Partial<EyeShape>`), which made the `?? 0` look unnecessary. The
  real gap was that `EYE_NUM_FIELDS` was keyed by `keyof EyeShape`, which includes `irisColor`, a
  string. It's now keyed by a new `EyeNumKey` (the numeric keys only), so the read is
  `number | undefined` and `?? 0` is honest, with no cast.
- **Clearing a field** used `delete next[f.key]`. It's now a rest destructure,
  `const { [f.key]: _cleared, ...next } = kf.override`: the same object, with no dynamic delete.
- **Three `String(f.key)`**, now plain `f.key` (already a string).

No runtime change. `tsc -b` is clean; `pnpm lint` has 0 errors and 8 warnings; 1,240 tests pass;
the build passes. **The strict count: 768 → 763.**
