# `any` / `as` registry

Every `any`, and every `as` other than `as const`, in `src/` and `api/` (test files included), with
why it's sound ([ADR-0071](adr/0071-every-cast-is-registered.md)). Each one also carries its reason
inline, as a `/* cast: … (ADR-0071) */` comment right after the cast.

**91 casts, 0 `any`** (2026-11-01). Making the registry removed 86 others: they
were replaced by guards over untrusted JSON, `instanceof` checks, `satisfies`, or by typing the
code that needed them ([journal 11-01 (3)](journal/2026-11-01-3-the-cast-registry.md)).

A new cast needs both a row here and its inline reason, or it doesn't merge. A cast that typed code
can replace is replaced instead. Like casts share a row; one-offs have their own.

## Shared reasons

| Reason | Why it's sound | Sites |
|---|---|---|
| the index runs over a pair, so it is 0 or 1 (21) | The index comes from `for (let d = 0; d < 2; d++)`, or a `.forEach`/`.map` over a two-element array (`[A, B]`, a dancer's two arms), so it is 0 or 1. The solver's hot loops stay as they are: a different loop shape cost bake time (journal 10-31 (8)). | `src/dance/whole-move-n.ts` 299, 300<br>`src/dance/whole-move-twirl.ts` 78, 78<br>`src/dance/whole-move.ts` 594, 685, 1044, 1045, 1065, 1066, 1068, 1088, 1111, 1114, 1115, 1221, 1320, 1321, 1347, 1563, 1800 |
| two dancers or two arms, mapped from a pair (13) | A `.map` over a two-element tuple (two dancers, or a dancer's two arms) returns an array, which TypeScript types as `T[]`; `map` keeps the length, so it is still a pair. In tests, the frames of a two-dancer call, which always hold two. | `src/dance/arm-geometry.test.ts` 49, 95, 253, 261, 272, 281, 322<br>`src/dance/whole-move-figure.ts` 109, 110<br>`src/dance/whole-move-twirl.ts` 61<br>`src/dance/whole-move.ts` 791, 1756, 1795 |
| `Object.keys` of an object with only these keys (6) | `Object.keys` is typed `string[]` whatever the object. Each object here is typed with exactly these keys (a const record, an `EyeShape` or a partial of one), so every key is one of them. | `src/dance/DanceDebugScene.tsx` 586<br>`src/overlay/EmoteBuilderModal.tsx` 182<br>`src/overlay/EyeEditor.tsx` 187, 327<br>`src/services/emotes.ts` 244<br>`src/voice/chain.ts` 56 |
| the switch above narrows the track, so its keyframes are this kind (6) | Inside `switch (activeTrack)`, each case's keyframes come from that track (`emote.tracks.<case>`), so they are that track's keyframe type. TypeScript doesn't carry the switch on `activeTrack` over to `kf`. | `src/overlay/EmoteBuilderModal.tsx` 509, 514, 519, 524, 529, 534 |
| a `<select>` whose options are exactly this union (5) | The value of a `<select>` whose `<option>`s are written out in the same component, or generated from the list of the union (`EFFECT_TYPES`), one per member, so it can only be one of them. | `src/dance/Review2Scene.tsx` 1146, 1198<br>`src/overlay/EmoteBuilderModal.tsx` 243<br>`src/voice/VoiceTestScene.tsx` 301, 309 |
| every track's keyframes have an `id` and a `time` (4) | Every track of `EmoteTracks` is an array of keyframes that all have `id` and `time`; indexing by a union key gives a union of arrays, which is read here only through those shared fields, and written back to the same track. | `src/overlay/EmoteBuilderModal.tsx` 357, 379, 380, 389 |
| a per-key write into a partial of the same shape (4) | A field-by-field copy into a `Partial<EyeShape>`, keyed by `keyof EyeShape`. TypeScript can't correlate the key with its value type in the loop. Each value comes from the same key of an `EyeShape`, or from its mirror (`MIRROR_MAP` pairs fields of the same type). | `src/overlay/EyeEditor.tsx` 189, 329<br>`src/services/emotes.ts` 248, 250 |
| the material its JSX declares (3) | A three.js object whose material is declared in the same file's JSX as a `meshStandardMaterial` (or, after `instanceof THREE.Mesh`, which narrows to `Mesh<any, any>`, is a `Material` or an array of them by three's definition). | `src/dance/Review2Scene.tsx` 292<br>`src/world/GameNpc.tsx` 102<br>`src/world/Npc.tsx` 450 |
| a frame mapped dancer for dancer keeps its two dancers (3) | A `.map` over a `Frame` (a two-dancer tuple) that returns a dancer for each: same length, so still a `Frame`. | `src/dance/chain-join.test.ts` 82<br>`src/dance/chain-join.ts` 96<br>`src/dance/whole-move.ts` 1792 |
| a scratch slot that starts empty (2) | An initial `null` in the frame-loop scratch literal, widened to the type it is filled with on the first frame. Nothing reads it before it is filled; every read checks for `null`. | `src/dance/FistBumpDriver.tsx` 275, 276 |
| merging the dancers' dial records (2) | `Object.assign({}, ...records)` over `Record<string, number>` values is typed `any`; the merge of number records is a number record. | `src/dance/SolveFourScene.tsx` 49<br>`src/dance/baked-four.ts` 101 |
| every `ARM_KEYS` field is set on the next line (2) | An `Arm` built field by field: the loop on the next line assigns every key in `ARM_KEYS`, which is the full key list of `Arm` (`whole-move.ts`), before it is read. | `src/dance/whole-move-n.ts` 124<br>`src/dance/whole-move.ts` 792 |

## One-off casts

| Where | Cast | Why it's sound |
|---|---|---|
| `src/dance/Review2Scene.tsx`:362 | `useThree((st) => st.controls) as unknown as { target: THREE.Vector3; u…` | R3F types `controls` as an `EventDispatcher` or null. This scene mounts drei's `<OrbitControls makeDefault>`, which has `target` and `update`. |
| `src/dance/Review2Scene.tsx`:790 | `k.split(".") as [string, PartId, string]` | A `DialKey` other than the width key is `<dancer>.<part>.<aspect>` by construction (`pose-events.ts`), so it splits into three, and the middle one is a `PartId`. |
| `src/dance/Review2Scene.tsx`:791 | `PARTS[part] as (typeof PARTS)[PartId] \| undefined` | Widens the lookup to `| undefined`, so a key from an older build whose part no longer exists is handled by the `?.` below rather than assumed. |
| `src/dance/baked-four.test.ts`:40 | `files[`./baked-four/${file}`] as FourBake \| undefined` | `import.meta.glob` types every module as `unknown`; the files under `baked-four/` are the committed bakes, and the test asserts each is defined before use. |
| `src/dance/chain-join.test.ts`:22 | `[ { x: pb.x / 100, z: pb.z / 100, yaw: pb.facing * D2R, arms: [] }, { …` | A test fixture: two placements with empty `arms`, passed where a `Frame` is expected; the function under test reads only `x`, `z` and `yaw`. |
| `src/dance/contact-move.test.ts`:646 | `legacy as { approach?: unknown }` | The test removes `approach` to build a move as it was saved before the field existed; the cast is what allows the `delete`. |
| `src/dance/dance-route.ts`:82 | `DEBUG_FIGURES[0] as DebugFigure` | `DEBUG_FIGURES` is a constant list written out above with several entries, so its first element exists. |
| `src/dance/expression-channels.test.ts`:53 | `key as keyof ResolvedPose` | `Object.keys(NEUTRAL_POSE)`, where `NEUTRAL_POSE` is a `ResolvedPose`: every key is a `keyof ResolvedPose`. |
| `src/dance/pose-dials.test.ts`:38 | `[{ body: { height: 1 } }, { body: { height: 1 } }] as unknown as Chara…` | A test fixture with only `body.height`, the one field the function under test reads. |
| `src/dance/whole-move-rlt.ts`:83 | `shapes as readonly [CharacterBodyShape, CharacterBodyShape, CharacterB…` | The function throws unless `shapes.length === 4` two lines above, so it is a four-tuple. |
| `src/dance/whole-move.test.ts`:332 | `{ ...Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, 0])), hold…` | Built from `Object.keys(WEIGHTS)`, so it has every weight key (as 0), with `hold` and `clasp` set: a full `typeof WEIGHTS`. |
| `src/overlay/BoardGrid.tsx`:77 | `move as BoardMove & { color?: string }` | Reads an optional `color` that moves from another source can carry; it is `undefined` when absent, and the `??` falls back. |
| `src/overlay/ContactMoveBuilderModal.tsx`:188 | `c.anchors.map((an) => (an.role === role ? { ...an, ...p } : an)) as un…` | The map updates one anchor and returns the others as they are; each keeps its `role`, so the result has the same tuple shape as `anchors`. |
| `src/overlay/useWheelGesture.ts`:77 | `handle as Capturable \| null \| undefined` | Widened only so the next line can check `typeof c?.setPointerCapture === "function"` before calling it. |
| `src/services/fetch-pending-results.test.ts`:90 | `defined(deleteCall[1], "deleteCall[1]").body as string` | The code under test sends `body: JSON.stringify(...)`, so the mocked call's body is a string. |
| `src/voice/VoiceTestScene.tsx`:59 | `window as unknown as { SpeechRecognition?: RecognitionClass; webkitSpe…` | Declares the speech-recognition constructors as optional properties of `window`; every use checks them for `undefined` first. |
| `src/voice/chain.ts`:98 | `out[j] as T` | A Fisher–Yates swap: `i` runs from `length - 1` down to 1 and `j` is in `[0, i]`, so both elements exist. |
| `src/voice/chain.ts`:98 | `out[i] as T` | A Fisher–Yates swap: `i` runs from `length - 1` down to 1 and `j` is in `[0, i]`, so both elements exist. |
| `src/voice/sound-alike.ts`:194 | `best.s.call.id as ApplicationCallId` | The candidates are built from `STANDARD_APPLICATIONS` entries, so the id is an `ApplicationCallId`. |
| `src/voice/voice-test.test.ts`:243 | `step.id as ApplicationCallId` | The chain's steps are built from `STANDARD_APPLICATIONS`, so each id is an `ApplicationCallId`. |
