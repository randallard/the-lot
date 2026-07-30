# 2026-07-30 (2) — the fists were never in the same frame

The first cut of ADR-0016 is built: the fist bump is authored data, the editor exists, the
wheel greys out. 470 tests (from 421), lint 0 errors, typecheck and build clean.

But the interesting part is a correction.

## Correcting this morning's entry, and ADR-0016's Consequences

Both said the second screenshot — fists at visibly different heights — was `gripHeight`'s
known failure mode, the one the dancer-size brief has open: the mean of two resting elbows
being wrong for a very unequal pair. **That was wrong, and it was a guess dressed as a
diagnosis.** ADR-0016 is accepted and immutable in substance, so the correction lives here.

What it actually is: `ArmMetrics.elbowY` is measured in each character's **own group**, and
the two groups do not sit at the same world height. `Player`'s is at `BASE_Y` = 0.75 with
`PLAYER_BODY_CENTER_Y` = 0; `Npc`'s is at 0 with `NPC_BODY_CENTER_Y` = 0.5. `gripHeight`
averaged two numbers from different frames and handed back one number that both characters
then wrote as a **local** Y. The fists ended up exactly one rig offset — 0.75 — apart.

It would do that between two **identical** bodies. It has nothing to do with unequal
reach, and the placeholder it was blamed on is still open and still unfixed.

Why it survived: every dancer inside `DanceFloor` has a rig at 0, so the bug is
unexpressible there, and that is the only pairing the grip had ever been watched on. And
`fist-bump.test.ts` built every pair with the default `rigOriginY` of 0 — including the
assertion `expect(ha.y).toBeCloseTo(hb.y)`, which is *precisely* the property that was
broken and which passed, because both sides were measured in the same frame that the
production code was not using.

**The lesson, and it is a new one for this repo:** a test that constructs its fixtures more
uniformly than production does can assert the exact broken property and pass. Not "the test
was too weak" — it was testing the right thing. It was testing it on a pair the game never
builds. `armMetrics` now takes `rigOriginY`, `gripHeight` answers in world, and
`localHeight` names the conversion.

## Two more that were invisible

**`handRadius` was always the open hand.** `armMetrics` read `shape.hand.open.radius`
unconditionally, so a *fist* bump was solved with the open hand's size. Ryan asked for a
closed-hand selector thinking it was cosmetic; it moves the contact point. `armMetrics` now
takes the hand pose, and `metricsFor` routes the authored one through so no caller has to
remember.

**And the hand was drawn open too.** `Npc.tsx` and `Player.tsx` both hardcoded `hand.open`
for the mesh. So even after the maths was right, the fists would have been *solved* at
0.07 + 0.09 and *drawn* at 0.09 + 0.11 — overlapping by 4cm, and looking exactly like a
geometry bug. Both now take a `handPose` prop, and the driver announces when it owns the
arms so `World` can switch it. Worth noting how this pair travels: the measurement bug and
the drawing bug would have cancelled *visually* about as often as they compounded.

## The one I nearly shipped

`resolveRole` has to put the arm back on the right shoulder, and I wrote
`side === "left" ? 1 : -1` — copied from `poseArms`, whose comment says "+x is the
anatomical left group".

That comment is true of `Dancer.tsx`. It is false of `Player.tsx` and `Npc.tsx`, which both
put the **right** arm at `+forearmX`. Two opposite conventions, and nothing had ever posed
both kinds of rig from one code path, so they had never had to agree.

Caught by reading rather than by a test, and a test would not have caught it: the contact
assertions all pass either way, because the hands still meet at exactly the right point.
It only shows as an arm that starts and ends its blend on the far shoulder. There is now a
`RigHandedness` the caller declares, and `restSign` maps it — plus a test that asserts the
contact point is *unchanged* by it, which is the reason it hides.

## What got built

- **`src/dance/contact-move.ts`** — the schema and the resolver. Roles, stance, anchors
  (part + hand + `attach`), per-axis resolution rules, handedness, out-of-range, exit,
  envelope, tags. `resolveRole` is what both the editor and the driver call; that is the
  property ADR-0016 turns on, and there is a test asserting the authored fist bump produces
  the same pose the hardcoded one did.
- **`resolveContactAt` / `envelopeWith`** — `fist-bump.ts`'s two hardcoded rules and its
  three hardcoded durations, extracted as parameters. The old entry points now call the new
  ones, so nothing about the existing gesture changed.
- **`FistBumpDriver`** — plays an authored `ContactMove` rather than a hardcoded gesture,
  and publishes availability every frame whether or not a bump is running.
- **The wheel wedge greys out**, with a reason on it ("too far away", "face them") rather
  than vanishing. Closes the unwired `canBump` the M5 handover flagged. A wedge that
  disappears when you turn around is indistinguishable from one that never existed.
- **`ContactMoveBuilderModal` + `ContactMovePreview`** — the editor, reachable from the
  body editor's row of tools. Two characters, cast for preview only. The preview rig draws
  the *authored* hand and carries a facing marker, and drives through `resolveRole`.
- **`services/contact-moves.ts`** — storage, registered in `backup.ts`. Not keyed by
  character, unlike emotes and arm actions: a move authored against roles that is filed
  under a character reintroduces the binding the schema exists to remove.

## Not built, deliberately

`attach: "free"` and `exit: "transfer"` — the lobbed fist and the traded head — are in the
schema and resolve as `rigid`/`return`. Gated on consent. `"lean"` behaves as `"reach"`.
One constraint per move is read, though the schema holds a list.

## Next

**Watch it.** Nothing here has been seen on screen — the standing rule in this repo is that
contact has read fine in code and measured wrong three times, and today added a fourth. In
particular: do the fists now meet at one height, does the wedge grey out when you turn
away, and does the closed fist look like a fist.
