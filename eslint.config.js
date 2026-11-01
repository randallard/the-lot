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
    // strictTypeChecked plus ADR-1011's three rules (ADR-0070). It was measured in a separate
    // eslint.strict.config.js until the lint pass reached zero findings (journal 11-01 (2)).
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // ADR-1011's three, stated so a preset change can't drop them.
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // ADR-0070: React handlers in arrow shorthand, and numbers in template strings.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowAny: false, allowBoolean: false, allowNullish: false, allowRegExp: false,
        allowNever: false, allowArray: false,
      }],

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
  // promotion condition: docs/adr/0008-react-hooks-rules-excepted-at-the-ref-boundary.md,
  // and its successor docs/adr/0069-the-react-hooks-exception-names-the-dance-files-that-write-from-a-frame-loop.md
  {
    // Writers: the whole R3F scene layer, the one overlay component that writes
    // input state back into the scene, and the five dance files that write rigs,
    // cameras or shared refs from a frame loop (ADR-0069). The rest of src/dance/
    // keeps the rules on: list a file here only when it writes that way.
    files: [
      'src/world/**/*.{ts,tsx}',
      'src/overlay/VirtualJoystick.tsx',
      'src/dance/DanceDebugScene.tsx',
      'src/dance/DanceFloor.tsx',
      'src/dance/FistBumpDriver.tsx',
      'src/dance/Review2Scene.tsx',
      'src/dance/SolveFourScene.tsx',
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
  {
    // ADR-0075: react-hooks 7.1 validates refs and memoization further. These screens read and
    // write shared refs during render on purpose (ADR-0002), so each lists only what it trips.
    files: [
      'src/App.tsx',
      'src/dance/DanceDebugScene.tsx',
      'src/dance/Review2Scene.tsx',
      'src/world/Npc.tsx',
      'src/world/Player.tsx',
      'src/world/World.tsx',
    ],
    rules: {
      'react-hooks/refs': 'off',
    },
  },
  {
    files: ['src/dance/DanceDebugScene.tsx', 'src/dance/Review2Scene.tsx', 'src/overlay/VirtualJoystick.tsx'],
    rules: {
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    // App.tsx waits for its reducer (ADR-0074), which is what will remove these.
    files: ['src/App.tsx', 'src/world/World.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/App.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },

  // ADR-0070: the bake and solve scripts are in no tsconfig, so they're linted without types.
  {
    files: ['scripts/**/*.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },
])
