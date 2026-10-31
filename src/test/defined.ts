/**
 * For tests under `noUncheckedIndexedAccess`: an indexed read is typed `T | undefined`, and
 * `expect(x).toBeDefined()` doesn't narrow. This throws with a message instead, so a missing
 * value fails the test where it was read rather than at some later property access. `null`
 * counts as missing too, for the lookups that return it.
 */
export function defined<T>(value: T | null | undefined, what = "value"): T {
  if (value === undefined || value === null) throw new Error(`expected ${what} to be defined`);
  return value;
}
