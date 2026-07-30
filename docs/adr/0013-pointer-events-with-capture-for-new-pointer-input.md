# ADR-0013: New pointer input uses Pointer Events with capture, and branches on `pointerType`
- Status: Accepted
- Date: 2026-07-29
- Deciders: Ryan, Claude

## Context

This repo already handles pointer input two ways, and the split is not a style preference — the
two approaches differ in what they get *right*.

**Touch Events, with manual identifier bookkeeping.** `VirtualJoystick.tsx` stores
`touchId.current`, then loops `changedTouches` on every move and every end to find the matching
identifier. It renders only when `"ontouchstart" in window || navigator.maxTouchPoints > 0`, so
mouse and pen do not reach it at all. `SpeechBubble`, `NpcChatBubble` and `ChoiceBubble` use
`onTouchStart` similarly.

**Pointer Events, with capture.** `SliderRow.tsx` calls
`e.currentTarget.setPointerCapture(e.pointerId)` on down, stores an origin, reads a delta on
move, and clears on `onPointerUp` / `onPointerCancel`, with `touchAction: "none"` and
`userSelect: "none"` on the element. `AssemblyCutscene.tsx` also uses `onPointerDown`.

Two differences decide this, both concrete:

**1. Capture makes events outside the element reliable.** With Touch Events the element gets
moves only while the finger is over it, unless you do the bookkeeping yourself — which is
exactly what `VirtualJoystick`'s `changedTouches` loops are. `setPointerCapture` routes every
subsequent event for that pointer to the capturing element, including `pointerup` fired well
outside it. Any interaction where the finger deliberately travels away from where it started
needs this, and the coming radial menu ([ADR-0014](0014-radial-wheel-for-emotes-and-taught-moves.md))
is precisely that.

**2. `pointerType` answers a question the device check cannot.**
`"ontouchstart" in window || navigator.maxTouchPoints > 0` appears in at least four files
(`App.tsx`, `EmotePanel.tsx`, `PocketButton.tsx`, `VirtualJoystick.tsx`). It answers *"can this
device do touch."* It is used in places that mean *"is this interaction a touch."* Those
diverge on hybrid hardware — a touchscreen laptop, or an iPad with a trackpad — where the
boolean is `true` while the user is holding a mouse. `e.pointerType`
(`"mouse" | "touch" | "pen"`) answers per interaction and is correct on hybrids.

That second point is a latent correctness bug, not tidiness: ADR-0014 needs a ~500 ms hold for a
finger and an *instant* open for a right-click, and a per-device boolean gets that backwards for
a mouse user on a touch-capable machine.

## Decision

**New pointer input uses Pointer Events with `setPointerCapture`, following the shape already in
`SliderRow.tsx`, and branches on `e.pointerType` rather than on a device-capability boolean.**

Existing Touch Events code stays as it is. **Migrate on touch, not on schedule** — convert a
file when it is being changed for another reason, never as a standalone consistency pass.

The existing `"ontouchstart" in window …` checks are not in scope: they mostly gate whether to
*render* a control, which genuinely is a device-capability question. The rule is that new
interaction code must not add another one to decide input modality.

## Alternatives considered

- **Standardise on Touch Events, matching the more numerous existing sites** — rejected. It
  would mean hand-rolling pointer routing that the platform already does, writing a second
  implementation for mouse and right-click, and keeping a device check that is wrong on hybrid
  hardware. Consistency with the older of two patterns is not worth those three costs.
- **Migrate every Touch Events site now** — rejected as churn. `VirtualJoystick` works, is
  covered by tests, and a rewrite has no user-visible payoff. This ADR deliberately leaves a
  mixed codebase rather than buying a refactor nobody asked for.
- **Leave it per-author** — rejected: that is the status quo, and it is what produced two
  patterns for one job. A file-by-file coin flip also guarantees the hybrid-device bug recurs.

## Consequences

- **One handler covers mouse, touch and pen.** Right-click and held-touch open the same wheel
  from one code path, differing only where `pointerType` says they should.
- **Four things Pointer Events do *not* fix**, all of which still need writing:
  1. Right-click needs a `contextmenu` handler calling `preventDefault()` to suppress the native
     menu. Implement on `pointerdown` (`e.button === 2`); use `contextmenu` only to suppress.
  2. `pointercancel` must reset state — browsers fire it when they claim the gesture. Wire it to
     the same handler as `pointerup`, as `SliderRow` does, or a menu sticks open.
  3. Secondary pointers must be ignored: drop any `pointerId` that is not the captured one. This
     is the only bookkeeping that survives.
  4. `touch-action: none` is required, not optional. Without it the browser may take the gesture
     for scrolling and fire `pointercancel` mid-drag.
- **The codebase stays mixed, on purpose**, so a reader will find both patterns. This ADR is the
  answer to "which one do I use" — `SliderRow.tsx` is the reference implementation.
- **`react-hooks` interaction:** capture-based handlers hold state in refs across frames, which
  is the same [ADR-0002](0002-shared-refs-across-the-r3f-dom-boundary.md) boundary
  [ADR-0008](0008-react-hooks-rules-excepted-at-the-ref-boundary.md) already excepts. Expect new
  input code to land in that exception rather than to fight the linter.
- **Promotion condition:** if a Touch Events site is ever found to have the hybrid-device bug in
  a way users hit, that is the "changed for another reason" trigger — convert it then, and this
  ADR's migrate-on-touch clause is what authorises it without a separate decision.
