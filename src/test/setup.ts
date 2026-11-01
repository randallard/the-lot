import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Mock localStorage for tests
const localStorageMock = (() => {
  // A Map, so removal isn't a dynamic `delete`. `|| null` below keeps the old mock's reading of a
  // stored "" as absent, so no test sees a difference.
  const store = new Map<string, string>();

  return {
    getItem: (key: string): string | null => {
      return store.get(key) || null;
    },
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
    key: (index: number): string | null => {
      return [...store.keys()][index] || null;
    },
    get length(): number {
      return store.size;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Clear localStorage before each test
beforeEach(() => {
  localStorageMock.clear();
});
