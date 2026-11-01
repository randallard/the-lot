const STORAGE_KEY = "townage-player-id";

function generateUuid(): string {
  // The types say randomUUID is always there, but it's missing outside a secure context.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Version 4 (byte 6) and the RFC 4122 variant (byte 8).
  const bytes = crypto.getRandomValues(new Uint8Array(16))
    .map((b, i) => (i === 6 ? (b & 0x0f) | 0x40 : i === 8 ? (b & 0x3f) | 0x80 : b));
  return [...bytes]
    .map((b, i) => ([4, 6, 8, 10].includes(i) ? "-" : "") + b.toString(16).padStart(2, "0"))
    .join("");
}

export function getPlayerId(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const id = generateUuid();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
