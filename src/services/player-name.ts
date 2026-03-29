const STORAGE_KEY = "townage-player-name";

export function getPlayerName(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setPlayerName(name: string): void {
  localStorage.setItem(STORAGE_KEY, name);
}

export function hasPlayerName(): boolean {
  const name = localStorage.getItem(STORAGE_KEY);
  return name !== null && name.trim().length > 0;
}
