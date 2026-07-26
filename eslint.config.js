import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Empty catch is this codebase's idiom for best-effort localStorage:
      // storage can throw (quota, private mode, disabled) and the game must
      // carry on regardless. ADR-0009.
      'no-empty': ['error', { allowEmptyCatch: true }],

      // A leading underscore is the existing convention for a binding that is
      // deliberately kept but unused — a destructured prop that documents the
      // shape, or a setter whose value nothing reads.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // --- The ADR-0002 shared-ref boundary ---------------------------------------
  //
  // eslint-plugin-react-hooks v7's compiler-aligned rules object to the pattern
  // this codebase adopted on purpose: per-frame state crosses the R3F/DOM
  // boundary through mutable refs, because a setState per frame would re-render
  // the tree at display refresh rate. Mutating a caller-owned ref inside
  // useFrame *is* the mechanism; the compiler cannot tell it apart from an
  // accidental mutation.
  //
  // These exceptions are scoped to the files that participate in that bridge and
  // nowhere else. A new file that needs one is a prompt to ask whether the
  // pattern is still paying for itself. Full reasoning, alternatives, and the
  // promotion condition: docs/adr/0008-react-hooks-rules-excepted-at-the-ref-boundary.md
  {
    // Writers: the whole R3F scene layer, plus the one overlay component that
    // writes input state back into the scene. `src/dance/**` joins them per
    // ADR-0011 — the choreography driver writes dancer transforms from useFrame,
    // which is the same ADR-0002 mechanism in a new directory.
    files: [
      'src/world/**/*.{ts,tsx}',
      'src/dance/**/*.{ts,tsx}',
      'src/overlay/VirtualJoystick.tsx',
    ],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    // Readers: overlay components that poll shared refs from their own
    // requestAnimationFrame loops, because a ref write notifies nothing.
    files: [
      'src/overlay/AssemblyCutscene.tsx',
      'src/overlay/ChoiceBubble.tsx',
      'src/overlay/MoodSlider.tsx',
      'src/overlay/NpcChatBubble.tsx',
      'src/overlay/SpeechBubble.tsx',
    ],
    rules: {
      'react-hooks/refs': 'off',
    },
  },
])
