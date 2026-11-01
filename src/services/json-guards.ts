/**
 * Guards for JSON this code didn't just build: values read back from localStorage, and server
 * replies.
 *
 * `JSON.parse` and `Response.json()` return `any`, and either source can hold anything: an older
 * format, a hand edit, another build's data, an error page. Each reader takes the value as
 * `unknown` and keeps only what its guard accepts, so a bad value falls back to the reader's
 * default instead of flowing on as the wrong type.
 */

/** The value stored under `key`, parsed; `undefined` when absent, unreadable or not JSON. */
export function readStoredJson(key: string): unknown {
  try {
    const data = localStorage.getItem(key);
    if (data === null) return undefined;
    const parsed: unknown = JSON.parse(data);
    return parsed;
  } catch {
    return undefined;
  }
}

/** A plain object (not null, not an array), with its fields still unchecked. */
export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * The entries of `x` whose values pass `ok`; `{}` when `x` isn't an object. One bad entry is
 * dropped rather than costing the rest.
 */
export function recordOf<T>(x: unknown, ok: (v: unknown) => v is T): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isRecord(x)) return out;
  for (const [k, v] of Object.entries(x)) if (ok(v)) out[k] = v;
  return out;
}

/** The items of `x` that pass `ok`; `[]` when `x` isn't an array. */
export function arrayOf<T>(x: unknown, ok: (v: unknown) => v is T): T[] {
  return Array.isArray(x) ? x.filter(ok) : [];
}

export const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
export const isString = (v: unknown): v is string => typeof v === "string";
export const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";
