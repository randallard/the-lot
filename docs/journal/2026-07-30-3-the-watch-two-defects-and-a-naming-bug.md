# 2026-07-30 (3) — the watch: an inside-out arm, and the wrong arm entirely

Ryan watched the first cut. 477 tests, lint 0 errors, typecheck and build clean.
**Nothing here is committed** — the working tree holds it.

## What worked

The availability predicate, on both counts. The wedge greys out and states its reason when
the pair are facing away, and again when they are too far apart. That is the unwired
`canBump` from the M5 handover closed, and it is the first screenshot made unreachable.

## Defect 1 — the arm was inside out

Ryan: *"it seems I'm too close or the wrong end of the arm is targeted?"* Both halves of
that turned out to be true, and the second one was the bigger.

`gripPose` reads its `dir` argument as pointing **toward the partner** — it puts the hand
at `+radius · dir` and the arm group's own origin back at `(radius − handReach) · dir`.
`bumpPose` was handing it the direction pointing back toward **self**. That mirrors both
about the contact point:

| pair distance | arm origin z (shoulder should be ≈ 0) | aim z |
|---|---|---|
| half of reach | +0.748 | −1.0 |
| ¾ of reach | +0.884 | −1.0 |
| full reach | +1.020 | −1.0 |

The shoulder was standing at the partner's feet with the forearm pointing back across the
gap. On screen: one arm segment floating between the two bodies, attached to neither.

**It passed every test in the file, and the reason is worth keeping.** Every assertion here
measures where the **hand** ends up — and the hand was correct, because a bump wants its
hand `handRadius` back on its own side, which is exactly what the sign flip happens to
produce. The arm was mirrored about the contact point and the one point everyone measured
was the fixed point of that mirror.

Fixed by negating both arguments: `gripPose(out, m, -m.handRadius, 0, …, -dirX, -dirZ, …)`.
New tests assert the **origin and the aim**, not the hand.

## Defect 2 — it was the left arm all along, and my earlier entry was wrong

Ryan: *"we wanted right hand to right hand, correct? they are meeting correctly but it's
the left arms."* Correct, and this corrects
[the previous entry](2026-07-30-2-the-fists-were-never-in-the-same-frame.md), which called
this "two opposite conventions" and treated both as legitimate. It is not a convention
difference. It is a **naming bug**, and I built a configuration option
(`RigHandedness = "right-positive"`) that legitimised it.

The geometry: `Player.tsx` sets `rotation.y = atan2(dir.x, dir.z)`, so yaw 0 faces `+z`.
Facing `+z` with `+y` up, the right hand is at `-x` — right = forward × up = ẑ × ŷ = −x̂.

- `Dancer.tsx` places `arms.right` at `-forearmX`. **Correct**, and `poseArms`' comment
  ("+x is the anatomical left group") says the same.
- `Player.tsx`, `Npc.tsx` and `Eyes.tsx` name their **+x** side "right". That is the
  character's **left**.

So the driver was faithfully performing a left-hand bump while every label said right. The
fists met correctly because the contact maths never asks which arm it is.

**The naming is left alone, deliberately.** It is self-consistent across the game *and*
`CharacterPreview`, which means every authored emote's "R arm" track already means the `+x`
arm. Renaming would mirror content that exists. Instead `World` hands the driver the group
those components call `left`, with a matching `drivenKey` so the emote layer releases the
same one. `RigHandedness` now documents the truth and `"left-positive"` is what every rig
here actually is.

The editor's preview rig is built fresh, so it names its sides **anatomically** while
rendering identically to the game — which is what makes it trustworthy about which hand a
move uses.

## Still open — the shoulder still slides

After defect 1, the origin is on the right side of the contact point but still not at the
shoulder:

| pair distance | arm origin z (should be ≈ 0) |
|---|---|
| half of reach | −0.343 |
| ¾ of reach | −0.206 |
| full reach | −0.070 |

At ¾ reach that is 0.2 behind a torso of radius 0.3 — the arm would read as coming out of
the player's back. This is Ryan's "too close", and it is `arm-pose`'s founding bet meeting a
case it was not scoped for: the arm is placed relative to the **contact point**, not the
shoulder, and "the upper arm nobody draws takes up the difference." That difference is
positive at Allemande range and **negative** at bump range, so a rigid arm can only keep its
hand on the contact by sliding its shoulder backwards.

Underneath it, a plain bug: `maxSeparation` is `handReach_a + handReach_b` and ignores the
two hand radii. Touching fists needs `+ ra + rb`, which is why even "full reach" is off by
exactly `handRadius`.

**The decision this needs, and it is Ryan's:** with a rigid arm pinned at a real shoulder,
the only free parameter is *direction*, so the contact point must lie on the reachable
sphere. Either the **contact height gives** when the pair stand closer than full extension —
the arms angle up and the fists meet higher, which is what people do — or the fists
interpenetrate at natural standing distance. Taking the first would mean the authored
vertical rule stops being authoritative, which is a change to a concept
[ADR-0016](../adr/0016-contact-moves-are-authored-constraints-not-keyframes.md) just
shipped, and would want its own ADR superseding that part rather than a quiet edit.

## Proposed next — auto-positioning

Ryan's: *"a setting that sets a move to bring bodies into position automatically when a move
is accepted by both parties."*

This is the question `fist-bump.ts` parked on purpose — `facingYaw` has been sitting
computed-but-unapplied because "may a gesture turn a character" was not the driver's to
answer. As an authored field it fits the schema directly:
`approach: "none" | "turn" | "turn-and-step"`.

Three consequences to settle first, which is why it wants **its own ADR** rather than being
folded into ADR-0016:

1. **It splits the availability predicate.** Stance currently means "possible now"; with
   approach it means "where they need to end up", so the wedge should offer on *could they
   get there* and only the contact moment tests *are they there*.
2. **"Accepted by both parties" is a mechanism that does not exist.** The wheel fires and
   the bump runs; there is no offer/response handshake. NPCs could answer from
   `npc-friendliness.ts`, but the invitation → response → move shape is new. It is the same
   consent axis as `exit: "transfer"` — moving someone's body is a stronger thing than
   showing them an emote.
3. **It would sidestep the shoulder problem, but only for approach moves.** Walking them
   into position can walk them to exactly the separation where the arms close. A move
   authored `approach: "none"` still needs the decision above.
