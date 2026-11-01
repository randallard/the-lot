/// <reference types="vite/client" />

/** The `VITE_*` variables the app reads; each is optional and has a fallback where it's used. */
interface ImportMetaEnv {
  readonly VITE_NPC_CHAT_URL?: string;
  readonly VITE_SPACES_GAME_URL?: string;
  readonly VITE_KINGS_COOKING_URL?: string;
}
