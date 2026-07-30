# ADR-0014: Interactions are chosen from a radial wheel, held-open for novices and flickable for experts
- Status: Superseded by ADR-0015
- Date: 2026-07-29
- Deciders: Ryan, Claude

## Context

Ryan's proposal: a held touch on mobile (right-click with a mouse) opens a circle of emotes,
greetings and moves to pick from. The immediate need is M5 — the player has to be able to
*initiate* a fist bump with an NPC (planning ADR-0009) — and the longer-term worry is that the
arc adds "a bunch of moves" over time.

The current picker is `EmotePanel.tsx`: a vertical list opened from a button, floating at
`bottom: 104, right: 88`, which already binds digits **1–9 and 0** to `emotes[0..9]`.

This interaction is well studied, and the findings favour the proposal:

- **Pie menus beat linear menus** on both time and error rate — Callahan, Hopkins, Weiser &
  Shneiderman, *An Empirical Comparison of Pie vs. Linear Menus*, CHI '88. The mechanism is
  Fitts's law: every item is equidistant from the press point, and each wedge widens with
  distance, so targets are effectively large.
- **Marking menus** (Kurtenbach, Toronto, 1993) add the part that matters most here: hold and
  the menu appears; *flick* in a direction and it need not. The same physical gesture serves
  novice and expert, so directions are learned through the visible menu and become muscle
  memory with nothing to relearn. This only works if selection is **directional**, not
  positional.
- Practical ceiling is about **8 items**; 4 and 8 are most reliable because cardinals and
  diagonals are easy to hit blind. Nesting radial menus is known to be error-prone.

Two constraints from this repo:

- 🔴 **The joystick occupies the natural gesture area.** `VirtualJoystick` is
  `position: fixed; bottom: 40; left: 40`, 120 px, `zIndex: 5`. "Hold anywhere" cannot work on
  mobile.
- The item list is heterogeneous — emotes, greetings, moves — which is exactly the taught-thing
  tagged union that planning ADR-0008 defines for this repo:
  `{ kind: "block", … }` / `{ kind: "gesture", … }`, alongside plain emotes.

## Decision

**Interactions are chosen from a radial wheel, opened by a held pointer on a target character
and dismissed by releasing at the centre or outside the ring.** It follows the marking-menu
model: the wheel is *shown* after the hold, and a directional flick selects without waiting for
it. Selection commits on pointer **up**.

Three properties are load-bearing:

1. **The wheel opens on a character, not on empty screen.** This dodges the joystick collision
   and is the better design — the wheel shows only what is possible with *that* NPC right now,
   which caps the item count by context instead of by nesting, and doubles as teaching feedback.
2. **Wheel items are taught things.** Its entries are drawn from what the player knows, so
   learning something is what puts it on the wheel. Progression and controls share one data
   structure rather than being kept in sync.
3. **Every path has a non-gestural equivalent**: tap to open and tap a wedge, and the existing
   digit keys 1–9/0 from `EmotePanel` carry over as the keyboard path and expert shortcut.

Input follows [ADR-0013](0013-pointer-events-with-capture-for-new-pointer-input.md): Pointer
Events with capture, hold duration branching on `e.pointerType` — ~500 ms for touch (matching
Android's long-press timeout and iOS's `minimumPressDuration` of 0.5 s), immediate for a
right-click.

## Alternatives considered

- **Keep extending `EmotePanel`'s vertical list** — rejected on the CHI '88 result: slower and
  more error-prone, and it scales by scrolling, which is worse the more moves exist. It stays as
  the button-triggered browse-everything surface; the wheel is the in-world quick path.
- **Hold anywhere on screen** — rejected: collides with the joystick at `bottom: 40, left: 40`,
  and gives the wheel no context to filter by, so it would need submenus as the move list grows.
- **A fixed-slot hotbar** — rejected: it needs assignment UI before it is useful, and discards
  the directional muscle memory that makes marking menus fast. Reconsider if players end up
  wanting loadouts.
- **Submenus for scale** — rejected in favour of context filtering. Nested radial menus are
  error-prone, and "what can I do with this NPC" is a better filter than a taxonomy.

## Consequences

- **Accessibility floor, and it is a requirement not a nicety** given this repo's accessibility
  commitments:
  - Commit on **up**, with centre and outside-the-ring as cancel — WCAG **2.5.2 Pointer
    Cancellation** (A).
  - Tap-to-open plus tap-a-wedge must work, not only hold-and-flick — WCAG **2.5.7 Dragging
    Movements** (AA) and **2.5.1 Pointer Gestures** (A).
  - Wedge hit areas at least 24×24 CSS px — WCAG **2.5.8 Target Size (Minimum)** (AA); the
    pinch points are the inner dead zone and ring thickness, not the wedge middles.
  - **Hold duration must be adjustable.** A fixed long-press is hostile to tremor and motor
    impairment; the tap path is the primary accommodation and a setting is the second.
- **iOS needs `-webkit-touch-callout: none` and `user-select: none`**, or the native callout
  fires during the hold.
- **The wheel is M5 scope, not later polish.** It is how the player initiates the fist bump, so
  it and planning ADR-0009's gesture want building together.
- **Item budget is now a design constraint.** Context filtering keeps it under 8 today; if a
  single NPC ever offers more, the answer is better filtering or paging, not a submenu.
- **`EmotePanel`'s digit binding becomes shared behaviour** across two surfaces. Extracting it
  is preferable to a second copy drifting.
- **Watch it before believing it** — the standing rule in this repo, earned three times on
  contact geometry. A wheel that reads fine in code can feel mistimed on a real thumb, and the
  hold duration in particular is a judgement only the screen can make.
- **Promotion condition:** if the flick path turns out to be unusable — angles too tight at
  eight items on a phone — drop to four wedges plus context filtering rather than abandoning the
  directional model, since it is what the expert path is built on.
