/**
 * Where `#review2`'s pose events live: IndexedDB, append and read-all, nothing else.
 *
 * Taken from branching-video's `src/shell/event-store.ts` (its ADR-0007), with its contract kept
 * as is. Appends are idempotent by event id (`put`), so loading the same bundle twice is harmless.
 * Without IndexedDB (a private window with storage blocked, say) it falls back to memory, and the
 * caller is told so the page can say the work is not being kept.
 *
 * Not in `services/backup.ts`, which backs up localStorage keys; the screen's own Save/Load is
 * its backup.
 */

import { isPoseEvent, type PoseEvent } from "./pose-events";

export interface PoseStore {
  append(events: readonly PoseEvent[]): Promise<void>;
  all(): Promise<readonly PoseEvent[]>;
}

export function createInMemoryStore(seed: readonly PoseEvent[] = []): PoseStore {
  const events = new Map<string, PoseEvent>(seed.map((e) => [e.id, e]));
  return {
    append: (batch) => {
      for (const e of batch) events.set(e.id, e);
      return Promise.resolve();
    },
    all: () => Promise.resolve([...events.values()]),
  };
}

const DB_NAME = "townage-pose";
const DB_VERSION = 1;
const STORE = "events";

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => { reject(request.error ?? new Error("IndexedDB request failed")); };
  });
}

function openIndexedDbStore(dbName = DB_NAME): Promise<PoseStore> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    open.onerror = () => { reject(open.error ?? new Error(`IndexedDB open failed: ${dbName}`)); };
    open.onsuccess = () => {
      const db = open.result;
      resolve({
        append: async (batch) => {
          if (batch.length === 0) return;
          const tx = db.transaction(STORE, "readwrite");
          const store = tx.objectStore(STORE);
          await Promise.all(batch.map((e) => asPromise(store.put(e))));
          await new Promise<void>((done, fail) => {
            tx.oncomplete = () => { done(); };
            tx.onerror = () => { fail(tx.error ?? new Error("IndexedDB transaction failed")); };
          });
        },
        all: async () => {
          const store = db.transaction(STORE, "readonly").objectStore(STORE);
          const rows: unknown[] = await asPromise(store.getAll());
          return rows.filter(isPoseEvent);
        },
      });
    };
  });
}

export async function openPoseStore(): Promise<{ store: PoseStore; persistent: boolean }> {
  try {
    if (typeof indexedDB === "undefined") return { store: createInMemoryStore(), persistent: false };
    return { store: await openIndexedDbStore(), persistent: true };
  } catch {
    return { store: createInMemoryStore(), persistent: false };
  }
}

/** Download text as a file (branching-video's `files.ts`). */
export function downloadText(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
