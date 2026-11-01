/**
 * Storage for authored contact moves (ADR-0016).
 *
 * `localStorage` with best-effort writes, per ADR-0007 and ADR-0009 — the same idiom as
 * `arm-actions` and `emotes`, and registered in `backup.ts` so a move survives the
 * versioned backup/restore round trip.
 *
 * **Not keyed by character**, which is the one place this deliberately differs from
 * `arm-actions` and `emotes`. Those are one body's own animation, so "Ryan's wave" is a
 * sensible thing to own. A contact move is authored against *roles* and cast at play
 * time, so keying it to a character would reintroduce exactly the binding the schema
 * exists to avoid.
 */

import type { ContactMove } from "../dance/contact-move";
import { arrayOf, isRecord, isString, readStoredJson } from "./json-guards";

const STORAGE_KEY = "townage-contact-moves";

/** A move's header; the rest is as the editor saved it (`approachOf` defaults what older moves lack). */
function isContactMove(v: unknown): v is ContactMove {
  return isRecord(v) && isString(v.id) && isString(v.name);
}

function load(): ContactMove[] {
  return arrayOf(readStoredJson(STORAGE_KEY), isContactMove);
}

function persist(all: ContactMove[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function getContactMoves(): ContactMove[] {
  return load();
}

export function getContactMove(id: string): ContactMove | undefined {
  return load().find((m) => m.id === id);
}

export function saveContactMove(move: ContactMove): void {
  const all = load();
  const idx = all.findIndex((m) => m.id === move.id);
  if (idx >= 0) all[idx] = move;
  else all.push(move);
  persist(all);
}

export function deleteContactMove(id: string): void {
  persist(load().filter((m) => m.id !== id));
}
