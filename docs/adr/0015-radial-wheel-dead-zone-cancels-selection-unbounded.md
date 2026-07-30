# ADR-0015: The radial wheel cancels in the dead zone, and selects without an outer bound
- Status: Accepted
- Date: 2026-07-29
- Deciders: Ryan, Claude

## Context

Supersedes [ADR-0014](0014-radial-wheel-for-emotes-and-taught-moves.md), which was
**internally contradictory** — a defect found within the hour, while implementing its
geometry.

ADR-0014's Decision says the wheel is "dismissed by releasing at the centre **or outside
the ring**", and its Consequences repeat "centre and outside-the-ring as cancel". The same
ADR also requires the marking-menu model, where "a directional flick selects without
waiting for it".

Those cannot both hold. **A flick goes outside the ring — that is what a flick is.** Built
as written, the expert gesture the ADR exists to enable would always cancel. Worse, it
would fail quietly: novices using the visible menu at short range would be fine, so the
contradiction would only surface for the users who had learned the directions.

It also gives away the mechanism. Pie menus win on Fitts's law because a wedge widens with
distance; an outer cancel boundary caps that, turning an unboundedly large target back into
a bounded one and reintroducing the precision the pattern removes.

Nothing else in ADR-0014 was wrong, so everything else here is carried forward deliberately
rather than rethought. This ADR supersedes rather than amends because the house rules say
so, and because the clause sits inside the Decision — a wheel whose cancel geometry is
different is a different wheel.

One further correction, to a Consequence rather than the Decision: ADR-0014 predicted "a new
hand-to-hand pose function joins `arm-pose.ts`". Implementation showed `gripPose` already
covers it — it is parameterised by `radius` and `separation` and places from the pivot, so a
fist bump is `radius` = own `handRadius`, `separation` = 0. No new pose function was needed.

## Decision

**Interactions are chosen from a radial wheel, opened by a held pointer on a target
character. The central dead zone cancels; everything beyond it selects by angle, with no
outer bound. Selection commits on pointer up.**

Cancelling after opening is done by bringing the pointer **back** into the dead zone, which
preserves WCAG 2.5.2's requirement that a user can abort before release while leaving each
wedge unbounded outward.

Carried forward from ADR-0014, unchanged:

1. **The wheel opens on a character, not on empty screen.** It dodges `VirtualJoystick`
   (`position: fixed; bottom: 40; left: 40`, 120 px) and gives the context filter that caps
   items under the ~8-item practical ceiling without submenus — the wheel shows only what is
   possible with *that* character right now, which doubles as teaching feedback.
2. **Wheel items are taught things** — planning ADR-0008's union — so learning something is
   what puts it on the wheel, and progression and controls share one data structure.
3. **Every gesture path has a non-gestural equivalent**: tap to open and tap a wedge, and
   `EmotePanel`'s existing digit bindings (1–9, 0) as the keyboard path and expert shortcut.

Input follows [ADR-0013](0013-pointer-events-with-capture-for-new-pointer-input.md): Pointer
Events with capture, hold duration branching on `e.pointerType` — ~500 ms for touch, matching
Android's long-press timeout and iOS's `minimumPressDuration`, and immediate for a right-click.

## Alternatives considered

- **Keep ADR-0014's outer cancel boundary and drop the flick** — rejected. The flick is the
  expert half of the marking-menu model and the reason to prefer a wheel over
  `EmotePanel`'s list at all. Keeping the boundary would leave a radial menu with none of the
  advantages that justify one.
- **Keep both, with the ring far enough out that flicks land inside it** — rejected. It
  reintroduces a distance the user must not exceed, which is precisely the precision demand
  Fitts's law says a radial menu removes, and it would be invisible until someone flicked hard.
- **Treat the contradiction as a typo and edit ADR-0014 in place** — rejected. The clause is
  in the Decision and changes behaviour, and `docs/adr/README.md` is explicit that editing an
  accepted ADR's Decision is how immutability quietly dies. The rule exists for exactly this
  temptation.
- **A separate explicit cancel wedge** — rejected: it spends one of ~8 scarce slots on
  something the dead zone already does, and the dead zone is where the pointer already is.

## Consequences

- **The accessibility floor is unchanged and still binding**: commit on pointer up with the
  dead zone as the abort target (WCAG 2.5.2); tap-to-open plus tap-a-wedge alongside
  hold-and-flick (2.5.7, 2.5.1); wedge hit areas at least 24×24 CSS px (2.5.8), the pinch
  points being the inner dead zone and ring thickness rather than the wedge middles; and an
  **adjustable hold duration**, since a fixed long-press is hostile to tremor.
- **The dead zone is now load-bearing twice** — it is the cancel target as well as the
  no-selection region — so it is sized as a target, not as a threshold.
  `wheel-geometry.ts` sets it at 28 px, comfortably past the 24 px minimum across its
  diameter.
- **Already implemented and tested.** `src/overlay/wheel-geometry.ts` was written to this
  decision rather than to ADR-0014, with its divergence recorded in the module header and a
  test named for it. That header should now point here instead.
- **The ring becomes purely visual.** `RING_INNER_PX` / `RING_OUTER_PX` say where wedges are
  drawn and have no part in selection, which is worth knowing before anyone "fixes" a drag
  that selects from beyond the artwork.
- **iOS still needs `-webkit-touch-callout: none` and `user-select: none`**, or the native
  callout fires during the hold.
- **The wheel remains M5 scope**, because it is how the player initiates the fist bump.
- **Watch it before believing it** — the standing rule. This ADR is itself the argument for
  it: a contradiction that survived being written down, reviewed and accepted was caught by
  building the thing.
- **Promotion condition, inherited:** if the flick path proves unusable at eight wedges on a
  phone, drop to four plus context filtering rather than abandoning the directional model,
  since that model is what the expert path is built on.
