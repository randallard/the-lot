# Progress & Status

_Last updated: 2026-08-15_

## Status / next

**ADR-0018 is narrowed, and superseded (2026-08-15, seventh pass).** Ryan, reading back over
the day: *"does this mean if another player character chooses my player character off the
wheel, say, to fist bump me, I can't decline?"* Reading the code rather than ADR-0018's
summary of itself: **partly**. `availability` does consult the receiver's preferences and
refuses with `"muted-by-b"` — but that is a **standing** preference. There is no
offer/response anywhere, so a second player could pre-mute a category and still not decline
*that* bump while `playerBodyDriven` walked and turned their avatar for ~1.25s.
[ADR-0021](adr/0021-being-moved-needs-a-live-yes.md) supersedes
[ADR-0018](adr/0018-a-contact-move-may-bring-the-pair-into-position.md). Narrative in
[the seventh journal entry](journal/2026-08-15-7-a-note-is-not-a-guard.md). 552 tests, gates
green. **Nothing shipping changes.**

- 🔴 **The lesson: a promotion condition is a note, and a note is not a guard.** I had written
  this exact gap into ADR-0018 myself. The reasoning was sound for the shipping arrangement
  and unsound one line past it, with nothing in the code marking where the line was.
- **`ConsentMode` on `ComfortPreferences`** — `"standing"` (all there is; an NPC cannot be
  asked) or `"live"` (can be asked, and must be for anything that moves them). `availability`
  refuses with `"needs-live-consent"` when a move approaches and the **receiver** is live.
  Receiver alone: choosing is the chooser's live answer.
- **The line is at being *moved*, not *touched*** — `approach: "none"` writes nobody's
  placement, so ADR-0016's standing preferences still govern there.
- **Required field, and `OPEN_TO_EVERYTHING` is now `"live"`**, so the default fails toward
  refusing. Adding it broke four test fixtures and no production code.
- **The corner analysis Ryan asked for**, recorded in the ADR: the fail-open default
  (guarded); 🔴 **ownership has no owner** — `playerBodyDriven` is a boolean, so with two
  people two claims cannot be told apart, and retrofitting an owner id touches every driver
  (named, not fixed, unreachable while the guard holds); and ✅ **the corner we are not in** —
  `approachTarget` is pure and returns targets rather than applying them, which is exactly
  what a networked client needs. ADR-0016 made the geometry pure for editor/runtime parity and
  bought the multiplayer seam by accident.
- 🔴 **The guard is unexercised in render** — nothing sets a live receiver. Not a seam, by this
  repo's rule. It is a refusal, so it fails toward refusing too much, which is the right
  direction for the one control between a stranger and your avatar.

---

**✅ WATCHED AND ACCEPTED (2026-08-15).** Ryan, at the end of the day's five passes: *"ok that
looks good, and the allemande left looks good."* Everything below this line was built today and
carried a 🔴 unwatched flag; it no longer does. Read this section first if you are picking the
repo back up — the rest of it is the day's narrative, newest first.

**What the watch confirmed, item by item:**

- ✅ **The fist bump, end to end.** The approach walks the pair in, the twist turns the working
  shoulder toward the partner and unwinds as the hand comes away, and the fists meet head on
  with straight wrists at shoulder height. ADR-0018, 0019 and 0020 are render-validated.
- ✅ **The dance floor's grip is unchanged, and this is the load-bearing one.** ADR-0017's watch
  list said a Dosado or an Allemande that looked different would be a rig-split bug rather than
  a design change — the split was meant to be *the same pixels by construction*. **The Allemande
  Left looks right**, so the two-group rig, the elbow-naming of `ArmPose`, and every call site
  that had to be converted are confirmed against the one render that was already validated back
  on 2026-07-27. That is the strongest single result of the day: a five-file rig change with no
  visible effect where it was supposed to have none.
- ✅ **Reach is comfortable now.** It rose three times over the day (0.917 → 1.427 → 1.605) and
  the last word is that the staging distance reads right. `APPROACH_FRACTION` stays the dial.
- ✅ **Being moved by a gesture reads acceptably.** The first thing in the game that moves the
  player without them steering, and it was not raised again after the pass that introduced it.

**What the watch did *not* exercise, stated plainly:**

- 🔴 **`aim: "natural"` — and therefore `reachPose`, `ELBOW_SWING`, and the whole two-bone
  solve — is shipped and unexercised.** Nothing authored uses it: the built-in bump is
  `"along-axis"`, and it is the only contact move that exists. It is tested and typechecked,
  and by this repo's own standing rule *an unexercised seam is not a seam*. ADR-0020 carries the
  promotion condition; the honest reading today is that its render is unverified, not that it
  works. The first move that wants a bent arm — a hand on a shoulder, a palm on a back — is
  what will actually check it.
- 🔴 **The approach ignores obstacles** and an NPC mid-walk freezes rather than pausing. Neither
  came up, because neither was set up.
- 🔴 **`gripHeight`'s unequal-pair rule** is untouched and still open (step 3 of the dancer-size
  brief). `mean-shoulder` sidestepped it for the bump rather than answering it.

**Next:** the queue behind this is the `externallyDriven` player seam — implemented in
square-one, declared in `useDancePerformance.ts` and never called, so the player has never been
in a square — then teaching `arm-turn`. Both predate today.

---

**The fists meet like a punch now (2026-08-15, fifth pass) — 🔴 unwatched.** Ryan: *"in life,
the forearm lines up like a punch to punch fists with a straight wrist — these are coming in at
a real angle."*
[ADR-0020](adr/0020-the-forearm-aims-along-the-contact-axis.md). Narrative in
[the fifth journal entry](journal/2026-08-15-5-a-punch-that-stops.md). 545 tests, gates green.

- **The angle was the solve working, not failing.** `reachPose` pins the elbow one *rigid*
  upper arm from the shoulder, so both ends of the forearm are fixed and its direction is
  whatever that demands. "Always plausibly attached" and "straight wrist" are competing goals,
  and ADR-0017 chose the first this morning without noticing it was choosing.
- 🔴 **It also retires an answer given too quickly.** Asked whether the upper arm was
  restricted, I measured *maximum reach*, found `handReach = upper + forearm` used in full, and
  said no. True, and a narrower question than the one asked — the rigid upper arm was not
  capping reach, it was dictating the forearm's angle. The failure mode worth naming: picking
  the reading of a question that a measurement already to hand can settle.
- **The aim is authored** (`aim: "along-axis" | "natural"` on the constraint, editor control,
  absent means along-axis). `punchPose` is `gripPose` with radius = the hand's own and
  separation 0 — exactly what `bumpPose` was before this morning; `bumpPose` survives as
  `"natural"`.
- **And the height moved with it, because they are one decision.** A level forearm is only
  attached if the shoulder can reach down to it. At `mean-elbow` the player's elbow lands
  *inside their own torso* and the undrawn link needs 0.443 against a natural 0.220; at
  `mean-shoulder` it needs 0.232. Reach rises 1.427 → 1.605 as a side effect.

  | rule | player strain | NPC strain | max separation |
  |---|---|---|---|
  | mean-elbow | **0.223** | 0.084 | 1.427 |
  | mean-shoulder | **0.012** | 0.062 | 1.605 |

- 🔴 **`upperArmStrain` is nonzero by design now**, where ADR-0017 introduced it as a quantity
  that should read zero. Still the right instrument — it now measures how well the authored
  height suits the authored aim, which is the coupling ADR-0020 exists to name.
- **The handedness guard has now been rewritten by three consecutive ADRs** — invisible in the
  pose, then visible, now visible one level down at `elbowLocal`. It is tracking *where the
  handedness fact lives*, and the fact keeps moving. Worth restating the reason each time,
  because the version that goes wrong is rewriting it to match whatever the code does.

**Add to the watch list:** contact has moved up to shoulder height, which is a visible change to
where a bump happens. And reach has risen for the third time today — if it now reads as *too*
far apart, `APPROACH_FRACTION` is the dial rather than any of the geometry.

---

**The twist now unwinds too (2026-08-15, fourth pass) — 🔴 unwatched.** Ryan on the twist:
*"looks pretty good but the npc falls back to facing and the player character stays twisted."*
Two symptoms, **one defect**, and the asymmetry is the tell — the driver held the staged
placement to its last frame and dropped it, and afterwards each component resumed a different
behaviour. The NPC has one (`lookAt(player)` while hovered) so it **snapped** square; the player
has none, so the yaw the driver left behind just **stayed**. The half that looked right was
right by accident. Narrative in
[the fourth journal entry](journal/2026-08-15-4-the-twist-outlived-the-contact.md).

- **Squaring up is part of the gesture.** The twist now unwinds across the **withdraw**, on the
  same beat the arm returns to rest, so it costs no extra time in charge of the player.
- `squareUp` is extracted from `approachTarget`, which already held this logic for turning them
  *in* — so the heading they return to is by construction the one they were turned away from,
  for either stance. The driver stages a `settle` beside `to`: same positions, twist removed.
  You square up; you do not walk back.
- **Through extend and hold the unwind parameter is a flat 0**, which writes the staged
  placement exactly. `easePlacement` at 0 is the identity, so replacing the old snap with an
  ease changed nothing inside the contact window — the grip's rule is intact.
- By release both are already square, so the NPC's `lookAt` is a no-op. A test asserts the
  settled NPC yaw *equals* `facingYaw` toward the player, which is the "nothing left to snap"
  property stated as an equality rather than hoped for.
- 🔴 **Correcting [ADR-0019](adr/0019-a-move-may-turn-a-body-past-facing-so-the-shoulder-leads.md),
  which is accepted and immutable:** its Consequences say a twisted pair "are no longer square
  to each other … the main thing to watch", which is true during the gesture and quietly implies
  the state persists. It should have said the twist is **spent and returned within** the gesture,
  and named the release point as the thing to get right. The decision is unaffected.

544 tests (from 539), gates green.

---

**The body twists now (2026-08-15, third pass) — 🔴 unwatched.** Ryan watched the nudge and
sent a screenshot of two characters almost torso to torso: *"we need the body to twist — that
reach is too limited — in a real life fist bump there is a turn towards a person sometimes …
also maybe the upper arm is restricted so it can't reach out?"*
[ADR-0019](adr/0019-a-move-may-turn-a-body-past-facing-so-the-shoulder-leads.md). Narrative in
[the third journal entry](journal/2026-08-15-3-the-lateral-cost-was-a-choice.md). 539 tests
(from 526), gates green.

- **It is not the upper arm, and measuring said so.** `handReach` is exactly `upper + forearm`
  (player: 0.220 + 0.325 = 0.545) and `reachPose` straightens all the way. What eats the arm is
  the two terms `axialReach` subtracts: the **rise** to the contact height (0.380) and the
  **lateral offset** (0.250), leaving 0.300 to travel.
- **Turning inverts the lateral term's sign, which is the whole decision.** A pair facing each
  other bump with the arm on the far side from the hand it meets, so each spends reach crossing
  their own midline. Turn `t` toward the partner and the shoulder swings to `restX·cos t`
  across and `restX·sin t` **along** — the cost shrinks and the shoulder starts closer.

  | | square on | 20° | 35° | 90° | old flat limit |
  |---|---|---|---|---|---|
  | max separation | 0.917 | 1.198 | **1.427** | 1.909 | 1.215 |

  At 35° the pair reach further apart than the flat `handReach + handReach` that preceded any of
  this — which is what makes twisting a **fix** rather than a partial walk-back of ADR-0017.
- **A budget, not a pose.** `twistFor` gives the smallest twist that reaches and **zero when
  they can reach squarely**, so a close-up bump still reads square-on. The solve is the law of
  cosines, not a search, and a test pins it as the exact inverse of `axialReach`.
- **Twist is derived from placements, never plumbed** (`twistOf`). A pair angled toward each
  other reach further whether an approach turned them or the player just stopped at an angle —
  the same "make the wrong thing inexpressible" move as ADR-0017's rig split.
- **A defect in yesterday's code, one day old:** `offerReach` passed a single twist to a
  `maxSeparation` that had just become per-side, so the second character was measured square-on
  and the radius came out 0.27 short. Caught by the test pinning the offer radius to the staging
  arithmetic — the same check that caught the step-budget overshoot. **When two numbers are one
  promise seen from opposite ends, assert them against each other, not each against a
  constant.**
- **Staged separation goes from about 0.73 to about 1.14** (combined body radii 0.45), and the
  offer radius to about 2.64.

**Add to the watch list:** a twisted pair are no longer square to each other, which is new on
screen; 35° was chosen by arithmetic, not by eye, and the slider is in the editor. And 🔴 **the
rise is now the biggest single term and is still a placeholder** — the player spends 0.38 of a
0.545 arm getting down to the contact height, because `gripHeight` means two elbows and the
player's rig stands 0.25 higher. That is step 3 of the dancer-size brief, and the likeliest
reason a bump reads as an arm *dangling toward* rather than *reaching out*.

---

**The bump now brings you into position (2026-08-15, after the watch) — 🔴 also unwatched.**
Ryan watched the arm work below and reported the bump *"requires way too close of a
position — I thought we talked about nudging"*. Both halves right, and they are two problems.
[ADR-0018](adr/0018-a-contact-move-may-bring-the-pair-into-position.md): a move carries an
`approach`, and **being chosen off the wheel is the consent to be moved**. Narrative in
[the second journal entry](journal/2026-08-15-2-the-nudge-that-was-decided-and-never-built.md).
526 tests (from 507), lint 0 errors, typecheck and build clean.

- **The reach really did get shorter, and honestly so.** Measured: player↔Ryan went **1.215 →
  0.917**. The player's arm is 0.545 long and spends **0.38 climbing down** to the mean-elbow
  contact height and **0.25 crossing its own midline**, leaving 0.300 to travel. The climb is
  `gripHeight`'s known unequal-pair placeholder surfacing as a *reach* cost — the player's rig
  sits 0.25 higher than an NPC's — and it is still open.
- **The fix is positioning, not geometry.** Loosening `axialReach` would buy comfort by making
  the number lie again. `outOfRange: "reach"` was the other tempting wrong answer: already
  implemented, and it reproduces the original floating-arms screenshot.
- **Auto-positioning had been item 2 of the next-action list since 2026-07-30** — Ryan's, and
  deferred pending an offer/response handshake for "accepted by both parties". **That blocker
  dissolves for the case that exists:** the handshake is needed when both participants are
  players; today one is an NPC whose consent is already `ComfortPreferences`, and the player's
  is the wheel press.
- **What it does.** `approach: "none" | "turn" | "turn-and-step"`, optional and defaulted
  through `approachOf` so stored moves do not silently gain the power to move people.
  `availability` asks a move that approaches a *weaker* question — facing dropped entirely,
  distance widened to `offerReach` — while **consent is not relaxed**. For the default pairing
  the offer radius goes **0.92 → ~2.2** and facing stops mattering.
- **Placement is now an owned channel**, `playerBodyDriven` / `npcBodyDriven`, the same
  contract `drivenArms` has one level down.
- **One defect the tests caught, and it was mine:** `offerReach` started as
  `maxSeparation + APPROACH_STEP`, which overshoots the promised budget by the width of the
  comfortable margin, because the approach stages the pair at 0.8 of reach. Measured from the
  staged separation now, with a test that walks the offer range and asserts nobody is asked to
  move further than `APPROACH_STEP` in total.

**Add to the watch list:** this is the first thing in the game that **moves the player without
them steering** — input is ignored for the whole gesture (~1.25s), not just the step, because
handing the controls back when the fists meet lets you walk out of a contact you are still in.
Whether that feels right is the question. Also: the approach ignores obstacles (bounded at 1.5
units, so a pair can be stepped through scenery), and an NPC mid-walk freezes rather than
pausing gracefully.

---

**The shoulder decision is taken and built (2026-08-15) — and it is 🔴 unwatched.**
[ADR-0017](adr/0017-an-arm-is-two-segments-with-a-pinned-shoulder.md): an arm is **two
segments** — a pinned shoulder, a free elbow, and an undrawn compliant link between them.
Narrative in [the journal](journal/2026-08-15-the-shoulder-was-never-there.md). 507 tests
(from 477), lint 0 errors, typecheck and build clean.

- **What the −0.34 actually was.** `bumpPose` placed the arm group's origin `handRadius +
  handReach` back from the contact point while the body stands `separation × contactFraction`
  back from it. Those agree at one separation and nowhere else, so the whole arm slid along
  the axis to make up the difference — at half reach the forearm's near end sat inside the
  torso. All three measured offsets fall out of one formula; there was nothing to tune.
- **The third option Ryan chose.** The old framing had two ways out (the height gives, or the
  fists interpenetrate) because a *one-segment* arm leaves direction as the only free
  parameter. The arm groups draw a forearm and a hand and nothing between shoulder and elbow,
  so a nested group makes the elbow free and turns it into two-bone IK. **ADR-0016's authored
  vertical rule stays authoritative** — that is the point of picking this one.
- **The rig split is the load-bearing half.** The solve alone would render correctly through
  the old single group, because `origin = elbow − elbowReach · aim` encodes any elbow. That
  was rejected on purpose: it leaves the shoulder as a value that happens to come out right.
  The outer shoulder group now carries **no ref**, so a driver cannot move a shoulder at all.
  Same reasoning as the `CHANNELS` record and the `ResolvedExpression` shape — make the defect
  inexpressible, don't remember not to write it.
- **The generalisable lesson, and it is a fourth variant of this repo's running theme:** *a
  quantity that nothing draws and nothing measures is not a quantity the model has.* The
  earlier three were about tests missing what the code did; this one is about the model not
  having the concept. `arm-pose.ts` had said since M4 that it "does not model reach or
  attachment" — written as a modest concession to caricature anatomy, and read by the code as
  a licence to put a shoulder at the partner's feet.
- **Two tests now assert the opposite of what they did**, both because the property genuinely
  inverted. "aims both arms horizontally" is gone — a horizontal forearm was what forcing the
  arm along the contact axis produced, and forcing it is what dragged the shoulder off the
  body; what replaces it is that the arm is *attached* at every reach. And "does not move the
  contact point — which is why this hides" asserted that handedness made no difference to the
  pose, which was true and was exactly how "it was driving the left arm" stayed invisible.
- 🔴 **Reach is measurably shorter, and this is the first thing to watch.** The old
  `maxSeparation` was `handReach + handReach`, ignoring both the climb to the contact height
  and the reach across the body's own midline; `restX` runs to 0.46 on the wider bodies. Some
  pairs that used to be offered a bump will now be told to move closer. If it feels fussy the
  answer is a torso-twist allowance in `axialReach`, not the old flattering number.
- **New instrument:** `TrackedArms.upperArm` per side per frame, printed min → max in the
  dance debug overlay. A grip *should* breathe there (it is pinned to the pair's pivot and the
  bodies breathe); a reach should not.

**Next: watch it, then auto-positioning.** The watch list is below under
[What to watch](#what-to-watch-2026-08-15). Item 2 of the old next-action list —
auto-positioning, and its own ADR — is untouched and now first in the queue behind the watch.

### What to watch (2026-08-15)

1. **The bump at close range.** The forearm's near end should be outside the torso at every
   distance the wheel offers, and the elbow should read as bent rather than as an arm shoved
   backwards. This is the defect the ADR exists for.
2. **The fists still meet at the authored height**, and meet each other — the height rule is
   supposed to be untouched, so anything that moved is a regression rather than a trade.
3. **Does the wheel now say "too far away" too often?** The reach correction is real and
   deliberate; whether it is *comfortable* is a judgement only a watch can make.
4. **The elbow's swing direction.** `ELBOW_SWING` is 0.6, tuned by eye and by arithmetic
   rather than by watching. Elbows should go out and down; if they read as sticking out too
   far, that constant is the dial.
5. **The dance floor's grip is meant to look identical.** `gripPose` is unchanged in what it
   draws — same pixels, by construction — so a Dosado or an Allemande that looks different is
   a rig-split bug, not a design change.



**Status:** A real, working R3F application with no dance subsystem and, until today, no
docs. The world, tutorial, NPCs, phone, chat, emotes, body/eye editors, game launching, and
backup/restore all work and have been played. Code development paused around 2026-04-06
(`609e989`); this entry resumes the repo as part of the square-dance arc.

**What just happened (2026-07-25):** the docs half of the ADR-0002 retrofit. `docs/adr`,
`docs/journal`, `docs/reviews`, this file, and a real README now exist; the root `journal/`
and `plans/` moved under `docs/` with history preserved; and **seven ADRs were backfilled**
for decisions taken between 2026-03-06 and 2026-03-28, each evidenced against the code and
the commit that introduced it. No `src/` changes were made — deliberately, so the retrofit
creates no merge surface against M4. The **CI half landed the same day** and did touch
`src/` — see [How CI landed](#how-ci-landed).

**Where this stands right now (2026-07-28) — read this first if you are picking the repo
back up.**

- **Committed:** everything through the **arm envelope, the expression layer, and the
  watch that verified them** — `107479f` (dance + player), on top of `028541e` (arm
  channel) and `b9b4fe3` (journal). 266 tests, lint 0 errors, typecheck and build clean.
  See the journal entries for
  [2026-07-27](journal/2026-07-27-the-arm-envelope-and-the-emote-experiment.md) and
  [2026-07-28](journal/2026-07-28-the-buttons-were-lying.md).
- **The debug scene now actually works (2026-07-28).** The first attempt at the watch found
  three defects in the instrument, none in the arbitration: the emote buttons were looping
  toggles that queued (so a second press did nothing, forever); `spin` used only the
  channel `DanceFloor` deliberately drops, so passing and being unwired looked identical;
  and the head sphere and its facing marker were siblings, so a head turn rotated a
  featureless ball. All three fixed — one-shot emotes fired with `interrupt`, `spin` now
  also turns the head and sweeps the arms, and the head is one pivoting group.
- **Uncommitted and *unverified*:** `package.json` and `pnpm-workspace.yaml` carry the
  bumped square-one pin. square-one is tagged `v0.2.0` **locally and not pushed**, so
  nothing has installed from the pin — see [Consuming square-one](#consuming-square-one)
  for the exact finishing sequence. The link override is still active and must not be
  committed.
- **ADR-0010 is written and accepted (2026-07-28)** —
  [the emote/choreography channel contract](adr/0010-emote-choreography-channel-contract.md),
  the last thing M4 owed. Written *after* the render was watched, on purpose.
- **The `limited` silhouette channels are enforced (2026-07-28)** —
  `src/dance/silhouette-limit.ts`, pure and tested, called once per dancer per frame.
  A dancer may inflate by their **share of the live slack** (the room between what the
  pair needs at rest and what they have this frame, split by body radius) — the arm
  envelope's model, deliberately, because it is the same problem. Zero cost when there is
  room; shrinking is never limited. 19 new tests, 285 total.
  - **Correcting the ADR, which cannot be edited:** its Consequences say these channels
    were "applied unclipped". For *dancers* they were not applied **at all** — `Dancer`
    built geometry at mount and `DanceFloor` never wrote a scale, so they were silently
    behaving as `owned`. True only of `bodyLeanZ`, and of the player (out of scope). The
    decision is unaffected; see
    [the journal entry](journal/2026-07-28-3-enforcing-the-limited-channels.md).
  **Watched and verified** (Ryan, 2026-07-28) via the **puff up** emote: the squeeze reads
  as a breath, not a stutter. So the hard clamp holds for a second channel — no easing, no
  proximity ramp. **Every channel ADR-0010 names is now classified, implemented, and
  verified on screen.**
- **The arbitration is consolidated (2026-07-28)** — `src/dance/expression-channels.ts` is
  now the one place ADR-0010's contract is *decided*; `arm-pose.ts` and
  `silhouette-limit.ts` remain the mechanisms. The ADR's fail-safe rule is structural
  rather than remembered: `CHANNELS` is `Record<keyof ResolvedPose, Channel>`, so a new
  channel breaks the build until classified, and `ResolvedExpression` has **no field for an
  owned channel**, so a spin has nowhere to arrive from. Behaviour unchanged — the 285
  pre-existing tests pass untouched. **M4's ADR work is closed.**
  - Found while proving that safeguard fires: **the typecheck gate had not been running at
    all.** See the boxed warning under [Tests](#-typechecking-tsc--b-never-tsc---noemit).
- **The square-one release is finished (2026-07-28, `1976f7f`)** — tag pushed, pin resolved
  from the tarball for the first time, link override out, all gates re-run against a real
  install. The working tree is **clean**: nothing is uncommitted and nothing here behaves
  differently from a fresh clone.
- **CI on GitHub was red, and is now green (2026-07-29).** Pushed as `8d06012` + `a501c5e`;
  run `30486706020` passes every job, `osv-scan` included — its log reads `Loaded filter
  from: /github/workspace/osv-scanner.toml` … `No issues found`. **This is also the first
  time the M4 arc has ever run in Actions**: the push carried 13 commits, and CI tests the
  resulting tree rather than each commit, so what is verified is today's `main`. Two causes,
  both invisible locally, both now caught locally:
  - **`osv-scan`** had failed on every run since `fb6f4d2` (2026-07-26) because
    `osv-scanner.toml` was deleted; `auditConfig` in `pnpm-workspace.yaml` only ever
    governed `pnpm audit`. Restored, with the reasoning duplicated on purpose and each
    file pointing at the other. Verified by running the scanner's own container against a
    clean export — see [Two scanners is not duplication](#two-scanners-is-not-duplication).
  - **`docs hygiene`** failed on links like `../../work/square-dance-planning/…` that
    resolve only on a machine with sibling checkouts. `scripts/docs-hygiene.py` now rejects
    any link escaping the repo root *before* testing existence, so it fails here too and
    not only in a fresh clone. Eight such links fixed in this repo — the planning effort
    has no public remote, so those are now unlinked inline code; the two square-one
    cross-references became GitHub URLs.
  - ~~**`main` is 11 commits ahead of `origin/main`.**~~ **Pushed 2026-07-29.** `main` and
    `origin/main` agree, and the local container run of osv-scanner matched CI's log line for
    line (468 packages, one advisory filtered) — which is the evidence that the local check
    now stands in for the remote one.
- **Controls decided (2026-07-29) —
  [ADR-0014](adr/0014-radial-wheel-for-emotes-and-taught-moves.md) and
  [ADR-0013](adr/0013-pointer-events-with-capture-for-new-pointer-input.md).** A held pointer on
  an NPC opens a radial wheel of emotes / greetings / moves, marking-menu style so a flick
  selects without waiting for it; its items *are* the taught things, so learning something is
  what puts it there. Input is Pointer Events with capture per `SliderRow.tsx`, branching on
  `e.pointerType` — which also fixes a latent hybrid-device bug in the
  `"ontouchstart" in window` pattern. Nothing built yet; it's M5 scope because the wheel is how
  the fist bump gets initiated.
- ~~**The player's head fix is unwatched.**~~ **Closed 2026-07-29** — watched, found wrong,
  fixed, and watched again. See the 2026-07-28 entry below for what it was.
- **The fist bump was watched (2026-07-30), and it turned the work toward an editor.**
  `FistBumpDriver` is committed and wired to the wheel; Ryan watched it and sent two
  screenshots. **Far apart and facing away:** the forearms and hands *detach* and float in the
  gap. **Close together:** the fists do not read as meeting, and read as sitting at different
  heights. Rather than tune the constants again, the response is to make the move **authored**
  — [ADR-0016](adr/0016-contact-moves-are-authored-constraints-not-keyframes.md).
  - **The detachment is not a defect, and this is the reframe that matters.**
    [`arm-pose.ts`](../src/dance/arm-pose.ts) already says it "does not model reach or
    attachment," written as a concession to caricatures with no upper arms. Ryan's reading is
    that it is an *affordance* — these are avatars, and the arc wants a fist lobbed across the
    floor and dancers trading heads. So the wrong thing about the floating arms is that
    **nothing authored the detachment**. An unhandled case and a deliberate absurdity look
    identical on screen and are opposites in the model.
- **The first cut is built (2026-07-30) and is 🔴 unwatched.** ADR-0016's schema, resolver,
  editor and predicate all landed — 470 tests (from 421), lint 0 errors, typecheck and build
  clean. Full narrative in
  [the second journal entry](journal/2026-07-30-2-the-fists-were-never-in-the-same-frame.md).
  - **`src/dance/contact-move.ts`** is the schema and the resolver. `resolveRole` is what both
    the editor and `FistBumpDriver` call — the property ADR-0016 turns on — and a test asserts
    the authored fist bump produces the same pose the hardcoded one did.
  - **The wheel wedge greys out with a reason on it** ("too far away", "face them") instead of
    vanishing. Closes the unwired `canBump` the M5 handover flagged.
  - **`ContactMoveBuilderModal` + `ContactMovePreview`**, reachable from the body editor's row
    of tools. Storage in `services/contact-moves.ts`, registered in `backup.ts`, deliberately
    **not** keyed by character.
  - 🔴 Gated and unimplemented, by design: `attach: "free"` and `exit: "transfer"` (the lobbed
    fist, the traded head) resolve as `rigid`/`return`; `"lean"` behaves as `"reach"`; one
    constraint per move is read though the schema holds a list.
- **Three defects the build turned up, all now fixed, none of which a green suite had caught.**
  - 🔴 **The height defect was misdiagnosed this morning, including in ADR-0016's
    Consequences** — which is accepted and immutable, so the correction is in the journal.
    It is **not** `gripHeight`'s unequal-pair placeholder. `elbowY` is measured in each
    character's own group and the two groups sit at different world heights (`Player` at
    `BASE_Y` 0.75, `Npc` at 0), so `gripHeight` averaged across frames and both sides wrote the
    result as a *local* Y — putting the fists exactly 0.75 apart **between identical bodies**.
    `armMetrics` now takes `rigOriginY`, `gripHeight` answers in world, `localHeight` names the
    conversion. The placeholder is still open and still unfixed.
  - **`handRadius` was always the open hand**, so a fist bump was solved at the wrong size —
    and `Npc.tsx`/`Player.tsx` *drew* the open hand too, so it would also have looked wrong
    after the maths was fixed. Both now carry the authored pose.
  - **Two opposite arm-side conventions live in this repo**: `Dancer.tsx` puts the right arm at
    `-forearmX`, `Player.tsx` and `Npc.tsx` at `+forearmX`. Nothing had ever posed both from
    one code path. `RigHandedness` is now declared by the caller.
- **It was watched (2026-07-30), and found two more defects — both now fixed.** 477 tests,
  lint 0 errors, build clean. Narrative in
  [the third journal entry](journal/2026-07-30-3-the-watch-two-defects-and-a-naming-bug.md).
  - ✅ **The predicate works.** The wedge greys out and states its reason, both for facing
    away and for too far apart. The first screenshot is now unreachable.
  - **The arm was inside out.** `gripPose` reads `dir` as pointing toward the *partner*;
    `bumpPose` handed it the direction toward *self*, mirroring the arm about the contact
    point. The shoulder was placed at the partner's feet (origin z +0.75 to +1.02, should be
    ≈0) with the aim reversed. It passed every test in the file because they all measure the
    **hand**, which was correct — the hand is the fixed point of that mirror. Fixed by
    negating both the direction and the radius; new tests measure origin and aim.
  - **It was driving the left arm.** 🔴 **This corrects the "two opposite conventions"
    finding in the previous entry** — it is a *naming bug*, not a convention, and the earlier
    write-up legitimised it. Yaw 0 faces +z, so the anatomical right hand is at −x.
    `Dancer.tsx` is correct; `Player.tsx`, `Npc.tsx` and `Eyes.tsx` all name their **+x** side
    "right", which is the character's left. The naming is **left alone on purpose** — it is
    self-consistent with `CharacterPreview`, so every authored emote's "R arm" already means
    the +x arm and renaming would mirror existing content. `World` maps around it instead.
- **Next action: 🔴 a decision, then auto-positioning.**
  1. ~~**The shoulder still slides back** at bump range~~ — **decided and built 2026-08-15,
     see the top of this file.** Ryan took a third option the framing below had missed: the
     arm becomes **two segments** ([ADR-0017](adr/0017-an-arm-is-two-segments-with-a-pinned-shoulder.md)),
     so the authored vertical rule survives intact and ADR-0016 is not superseded. The
     original write-up is kept because its diagnosis was exact and its framing is instructive:
     origin z −0.34 / −0.21 / −0.07 at half / ¾ / full reach, where it should be ≈0.
     `arm-pose` places the arm relative to the **contact point**, not the shoulder, and its
     "the undrawn upper arm takes up the difference" bet goes *negative* at bump range. Also
     `maxSeparation` ignores the two hand radii, so "full reach" is short by `handRadius`
     (fixed, along with two larger omissions). **With a rigid arm pinned at a real shoulder
     the only free parameter is direction** — true, and the word doing the work is *rigid*.
  2. ~~**Auto-positioning**~~ — **built 2026-08-15 as
     [ADR-0018](adr/0018-a-contact-move-may-bring-the-pair-into-position.md), see the top of
     this file.** The original note, which was right and is what got built:
     (Ryan, 2026-07-30): a move may bring both bodies into position when
     accepted by both parties. Fits the schema as
     `approach: "none" | "turn" | "turn-and-step"`, and answers the question `facingYaw` has
     been parked on since M5. Wants **its own ADR**: it splits the availability predicate
     ("could they get there" vs "are they there"), and "accepted by both parties" needs an
     offer/response handshake that does not exist yet.
  - Two smaller M4 leftovers still owed: an ADR extending ADR-0008's react-hooks exception to
    `src/dance/**` (owed since the M4 handover, and `src/dance/` has grown a lot since), and
    sending `docs-hygiene.py`'s escape guard upstream to the template.
- **The player's head is fixed too (2026-07-28).** `Player.tsx` had the same split head as
  `Dancer` did, so an emote's head turn did not turn the *player's* face either. It now has
  the same single `headGroupRef` holding the sphere and the eyes, with position, rotation
  and scale written once to the shared pivot; `Eyes` is unchanged and its other three call
  sites are untouched. Two latent bugs went with it — the eyes never scaled with
  `headRadiusDelta`, and never tracked `bodyHeightDelta`, so an emote that inflated or
  stretched a character would have separated the face from the head.
  **Watched 2026-07-29 — and it was wrong.** The fix put the eyes inside the head group, which
  is right, but the group also carried `animShape.head.rotation`, and `mergeAnimation` defines
  that as `shape.head.rotation + headDeltaRotation`. `PLAYER_DEFAULTS`' base is
  **`[-180, -91, -93]`**, so the player's face sat 91° round the side of their head. That field
  had only ever been applied to a bare sphere, where it is invisible unless the head is
  low-segment and faceted, so its stored values were tuned as decoration and mean nothing about
  facing — moving the eyes into a group carrying it turned harmless junk data into a visible
  defect. **The group now carries the emote's head turn only; the base stays on the sphere
  mesh**, which is the split [`Dancer.tsx`](../src/dance/Dancer.tsx) already had. `Npc.tsx` was
  never affected: its `<Eyes>` is still a sibling of the rotated mesh.
  - **The lesson, and it is the reason that claim stayed open for a day:** a fix that is
    reasoned, typechecked and green is still a claim. This one was all three and still put a
    face on the side of a head.

**What just happened (2026-07-27):** the tuck became an **envelope**, and dancers gained an
expression layer so the ADR-0010 arbitration could be *watched* rather than argued.

- **`reachAllowance` + `constrainArm`** replace the tuck. Each dancer may reach toward
  their partner as far as their proportional share of the live gap; any arm pose — resting
  or mid-emote — folds by however much its furthest point trespasses. The two allowances
  sum to the separation, so arms can touch and cannot overlap; and at the closest permitted
  distance a share resolves to exactly the dancer's own body radius, which *is* the old
  fixed tuck. `tuckPose`, `tuckNearness`, `tuckExposure` and the `tuckX` metric are gone.
- **A grip is a placement, a fold is a limit** — the distinction Ryan drew, and the
  load-bearing half of the coming ADR. A gripped hand is owned outright; every other arm
  keeps playing whatever the emote wants, folded only where it trespasses.
- **`Dancer` + `DanceFloor` take an expression layer** (`controllers`): arms as a proposal,
  head/lean/bob applied straight through, and `bodyDeltaRotY` **dropped** — a spin emote
  may not turn a dancer in a square.
- **Allemande Left's CCW turn is verified** (Ryan, 2026-07-27) — the watch list's
  highest-risk item, now render-validated.

**What happened before that (2026-07-26):** the **arm channel** and its **contact
tracking**, over two rounds of Ryan's render notes. The new pure `src/dance/arm-pose.ts`
owns both; the driver eases the rig toward what `poseArms` returns and publishes what the
arms are touching.

- **A forearm grip is two horizontal, antiparallel forearms** along the line between the
  dancers, at one shared height, side by side, each hand at the other's elbow. Two earlier
  attempts (aim the forearm at the grip point; stand it up vertically) were both
  compromises against a constraint that doesn't exist — **these caricatures have no upper
  arms, necks or legs**, so nothing about arm placement has to satisfy anatomy. What has to
  be right is contact.
- **Contact is tracked**, per frame, in world space: every forearm as an `{ elbow, hand }`
  segment, plus the pivot, the pair's separation, and where each gripping hand is on its
  partner's forearm (`along`, and `gap` where negative means a hold). Out through
  `DanceFloor.onArms`; the debug overlay prints **min → max since the grip engaged** and the
  scene draws markers (black pivot, blue elbows, red hands). Ranges rather than instants
  because the last defect was pure drift and an instantaneous readout hid it.
- **The pose is written exactly; only the grip blend is eased.** The driver used to ease the
  rig *toward* the pose, which lagged — and a lagged local pose is an arm glued to its own
  dancer instead of to the pivot, so the pair slid and let go twice per breath. Engaging and
  releasing blend; a held grip is rigid to the last decimal.
- **Proximity tucks** the forearm on the side a dancer is passing on, far enough in that
  the hand is inside the torso — a bound that makes it provably enough rather than tuned
  by eye.
- **The 29% orbit breathing stays** — Ryan likes it. It was flagged as an engine defect
  this morning; it's a keep. Don't "fix" it.

Full reasoning, in order: [the horizontal grip and
tracking](journal/2026-07-26-the-grip-is-horizontal-and-tracked.md) (superseding the vertical
grip in [the entry before it](journal/2026-07-26-forearm-grips-and-arm-tucks.md)), then
[the grip was easing, not holding](journal/2026-07-26-the-grip-was-easing-not-holding.md) —
whose lesson generalises: **if the driver transforms what a pure function returns, the pure
function's tests do not cover the driver.** 268 tests green.

**Next: M4 — the choreography adapter.** A new `src/dance/` subsystem that drives NPCs from
the square-one engine. Everything needed to start it cold is in
[What M4 actually contains](#what-m4-actually-contains) below. **No longer blocked:**
square-one M2 landed 2026-07-25 and `square-one@0.1.0` is installed here as a pinned git
dependency — `import { applyCall, createPerformance } from "square-one"` resolves at runtime
and at the type level. See [Consuming square-one](#consuming-square-one).

**The CI + supply-chain half is done (2026-07-25).** `.github/workflows/{ci,docs-hygiene,stance-review}.yml`
and `scripts/docs-hygiene.py` are in, and all nine gates pass (the ninth, `osv-scan`, only
truly since 2026-07-29 — see [How CI landed](#how-ci-landed)). Getting there took more than
copying: see [How CI landed](#how-ci-landed) for what the handover predicted correctly, what
it missed, and the two decisions it forced ([ADR-0008](adr/0008-react-hooks-rules-excepted-at-the-ref-boundary.md),
[ADR-0009](adr/0009-empty-catch-is-the-best-effort-storage-idiom.md)).

## Architecture

townage is the **world** repo of the square-dance game family planned in
`~/Development/work/square-dance-planning/` (its ADR-0003 set the repo split). It owns the
world-interaction chunks of the arc: gesture building blocks, two-couple square encounters,
full-square progression, the club layer, and the IRL club bridge. It consumes **square-one**
for choreography and owns none of it.

This repo's own decisions ([full index](adr/README.md)):

- 3D renderer: React Three Fiber over three.js — [ADR-0001](adr/0001-react-three-fiber-over-babylon.md)
- Cross-layer per-frame state: shared refs, not React state — [ADR-0002](adr/0002-shared-refs-across-the-r3f-dom-boundary.md)
- Rush navigation: one numeric enum — [ADR-0003](adr/0003-rush-mode-as-a-numeric-enum.md)
- Game state: facts stored, phase derived, UI override — [ADR-0004](adr/0004-derived-phase-with-ui-override.md)
- Games: separate deployments, URL-hash handoff — [ADR-0005](adr/0005-games-launch-by-url-hash-handoff.md)
- NPC dialogue: serverless proxy, opt-in, degrading — [ADR-0006](adr/0006-npc-dialogue-through-a-serverless-proxy.md)
- Storage: `localStorage` only, versioned backup file — [ADR-0007](adr/0007-localstorage-with-a-versioned-backup-file.md)

**Where it runs: Vercel, as `townage.app`, deployed by Vercel's Git integration on push to
`main`.** Not GitHub Pages, and not by GitHub Actions — CI going green says the gates passed,
not that the site shipped. The `deploy to Pages` job is the template's opt-in Pages path with
`vars.DEPLOY_PAGES` unset, so it is **skipped by design**; it renders as a slashed circle that
looks like a failure and is not one. Enabling it would stand up a second deployment of the same
app, which is the arrangement [ADR-0005](adr/0005-games-launch-by-url-hash-handoff.md)
deliberately does not have. `ANTHROPIC_API_KEY` and the Vercel KV binding are project settings,
not repo state. Recorded here 2026-08-15 after the skipped job was misread as a stopped
build — the fact was implied by `api/` and by ADR-0005's aside, and stated plainly nowhere.

Inherited from the planning effort: **ADR-0002** (retrofit this repo, don't restart) and
**ADR-0006** (consume square-one as a pinned git dependency with a local link during
co-development).

## What works

Played and working:

- **The world** — white void with fog, ground plane, follow camera with cutscene zoom
  (`world/`).
- **The tutorial** — two-part bot discovery at hardcoded spawn points, rush navigation with
  a directional arrow, drag-to-assemble modal, NPC Ryan's introduction, phone hint, free play.
- **Four NPCs** — NPC Ryan plus Myco, Ember, and Sprout, at hardcoded world positions
  (`MYCO_POS`, `EMBER_POS`, `SPROUT_POS` in `world/World.tsx`), each with a personality
  config, per-game reactions, and a friendliness score that nudges on play and chat.
- **The phone** — homescreen plus Find, Messages, Settings, Games, Town Report, and per-NPC
  rank detail. Keyboard shortcuts `f`/`m`/`s` on the homescreen.
- **NPC chat** — opt-in Claude Haiku dialogue through the `api/npc-chat.ts` edge proxy, with
  structured tool-use replies, support escalation, a daily mood check, NPC "sleep" as a
  rate limit, and a full emoji fallback path for players who decline (ADR-0006).
- **Game launching and return** — Spaces Game and King's Cooking, launched by URL-hash
  handoff with session reuse for unfinished games, plus async result pickup from Vercel KV
  for games abandoned without returning (ADR-0005).
- **Emotes and animation** — `AnimationController` with a play queue, an interrupt stack
  (depth-capped at 10), 0.25s crossfade blending, and loop support; an emote panel and an
  in-game emote builder.
- **Character editors** — body shape, eye, and arm-action editors with live preview, all
  parameterised over primitive geometry (`services/body-shapes.ts`).
- **Backup and restore** — versioned export/import (`BACKUP_VERSION = "1.1.0"`) with fixed,
  dynamic, and optional key classes (ADR-0007).

**Tests: 295 pass** (21 files), as of 2026-07-28. The two `fetch-pending-results` failures
that stood here were fixed on 2026-07-25 (worklist item 1); the rest of the growth is M4's
`src/dance/` — frame, body clearance, the arm channel, and the ADR-0010 expression
channels (`expression-channels.ts`, `silhouette-limit.ts`).

### ⚠ Typechecking: `tsc -b`, never `tsc --noEmit`

`tsconfig.json` is **solution-style** — `"files": []` plus references to `tsconfig.app.json`
and `tsconfig.node.json`. So `tsc --noEmit` against it typechecks **nothing at all** and
exits 0, which looks exactly like success. `npm run build` (`tsc -b && vite build`) is the
real gate; `npx tsc -b --force` is the standalone one. Running `vite build` on its own does
**not** typecheck either — esbuild strips types without reading them.

Found 2026-07-28, after several sessions of reporting "typecheck clean" from the vacuous
command. Nothing was actually broken — `tsc -b --force` passes on the whole tree — but the
gate had not been run.

**CI was never affected.** `.github/workflows/ci.yml`'s *ts fast gates* job runs
`pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm build` is `tsc -b && vite build`. The hole
was in hand-run commands only. The safest local habit is simply to run what CI runs.

Note: `pnpm test` used to refuse to run behind pnpm's build-verification gate
(`ERR_PNPM_IGNORED_BUILDS` on `esbuild`). It runs fine as of the 2026-07-28 reinstall.
`CI=true pnpm test` forces a single run rather than watch mode.

## M4 — what to check in the render

*Built 2026-07-25, **not yet visually verified**. The subsystem is in `src/dance/`;
`pnpm dev` then `http://localhost:5173/#dance`. Buttons switch call, the slider sets tempo
(30 bpm makes direction obvious), the checkbox toggles drift re-fitting, ⏸ freezes dancers
mid-move with a live `beat n.n / total` readout — pause at a beat from the Dosado table
below and compare the screen against the simulated positions.*

Gates are green — 177 tests, lint 0 errors, typecheck and build clean — and the driver's
output has been simulated frame-by-frame headlessly. **None of that validates the geometry.**
square-one's Dosado spec marks its waypoints "provisional until rendered" and this render is
the check they are stacked behind, so the list below is the actual deliverable.

**2026-07-26, before re-watching:** the head-facing marker was on the **back** of the head
(local −z; townage characters face +z — `atan2(dir.x, dir.z)` convention, eyes at
`+eyeZOnSphere`). Ryan caught it from a paused screenshot. The choreography maths was never
wrong, but every facing observation made before the fix was mirrored — re-check items 1–3
with the dot now honestly on the face. The default cast's square is modestly bigger than the
old 2.2 (~2.60 scale): pair clearance is measured on the 3D rigid silhouette (ADR-0012;
heads count, height-aware), which caught that Myco's/Ember's heads were silently clipping at
2.2 — an earlier flat-disc measurement (ADR-0011, superseded same day) had ballooned it to
~4.44 and read as dancers avoiding each other. See the
[journal entry](journal/2026-07-26-body-derived-frame-scale.md).

In order of how likely each is to be wrong:

1. ~~**Allemande Left's turn direction.**~~ **VERIFIED 2026-07-27** — Ryan watched it: the
   turn is counterclockwise viewed from above, each dancer's left side toward the pivot.
   This was the list's highest-risk item (the column had been wrong once in square-one's spec
   and corrected on 2026-07-25, with nothing but a render able to confirm the correction), so
   the correction is now render-validated rather than argued. Judged off the **facing
   marker**, not the arms — the arm posed is the one nearest the pivot by construction, so it
   cannot disagree with the engine either way.
2. **The forearm grip itself** (new 2026-07-26, third pass — and the overlay now gives you
   numbers, so this one need not be judged by eye). Expect both left forearms **horizontal,
   antiparallel, side by side**, level with each other, holding through the turn and
   releasing half a beat before the step-out. Read the **contact panel** under the beat
   clock, which prints **min → max since the grip engaged**: only `separation` should have a
   spread. For the default cast everything else should be flat — `a hand↔pivot 0.191`,
   `a along 0.400`, `a gap −0.082`, `b along 0.000`, `b gap −0.000`: Ember's hand exactly at
   Myco's elbow, Myco's hand 40% up Ember's longer forearm, both gaps ≤ 0 (negative is a
   hold; a hand wrapping a forearm overlaps it). **Any spread outside `separation` is the
   defect**, and a positive `gap` is a hand not holding. The **joint markers** checkbox says
   the same thing visually — red hands and blue elbows should look nailed to the black pivot
   dot while the bodies swing past. Off by default: a debugging aid, not part of the dance.
3. **The grip holds steady; the bodies breathe around it.** This is the *model*, confirmed
   by Ryan, not a compromise: the join is rigid — pinned to the pivot at a fixed radius,
   only rotating — and **the undrawn upper arm is the compliant link** that takes up the
   pair's 0.46-unit separation pulse, exactly as a real one would. So the visible gap
   between a torso and its own forearm opens and closes; the forearms themselves never
   stretch, squash, or drift off the pivot. Asserted **twice**: on the pose (*"holds steady
   and only rotates while the bodies breathe around it"*) and on the driver's own frame loop
   (*"driven frame by frame"*) — because the first version checked only the pose, and the
   render slid anyway.
3b. ~~**The emote experiment**~~ — **WATCHED AND FULLY VERIFIED 2026-07-28.** Three
   buttons — **wide arms**, **spin**, **look around** — fire on both dancers at once,
   mid-call, through a real `AnimationController`. Each aims at one channel of the
   pending ADR-0010 contract. What Ryan saw:
   - ~~**wide arms**~~ → **VERIFIED.** The arms swing freely and draw in during the
     pass, and — the part no test could answer — **the fold reads as intent, not as a
     glitch.** So the envelope stays a hard clamp; the proximity easing contemplated as
     a fallback is **not needed** and should not be built.
   - ~~**spin**~~ → **VERIFIED**, in two passes. Head turns all the way round and the
     arms sweep the full circle; **the body stays straight.** The first pass could not
     answer the body question at all, and the reason is worth keeping: the dancer's only
     facing indicator was the head marker, and spin now owns the head, so there was
     nothing left to read body facing off. The **chest facing marker** was added to close
     that, then resized when it turned out to scale away on thin bodies. `bodyDeltaRotY`
     is confirmed dropped for a driven dancer — on the screen, not just in the code.
   - ~~**look around**~~ → **VERIFIED.** Plays untouched, including mid-grip. The
     control behaves as a control.

   **The head/body facing split is a finding, not just a fix.** Once an emote can turn a
   head, "which way is this dancer facing" is two questions with two answers, and the
   debug scene now has a marker for each: head dot = where they are looking (emote-owned),
   chest dot = where they are facing (choreography-owned). ADR-0010 should name them as
   separate channels rather than treating "facing" as one thing.
4. **The arms on the passes.** Dosado and Pass Thru: the arm on the side being passed
   should slide **into the torso** as the pair closes and swing back out after — right arms
   on the Dosado's forward pass, left arms on the return, which is the call's own
   right-shoulders-then-left falling out of the geometry rather than being scripted. The
   outside arm should keep hanging free the whole time.
4b. **The orbit breathing is a keep.** `arm-turn` emits a waypoint every quarter turn and
   the stepper interpolates linearly, so the pair walks the **chords** of the orbit:
   separation oscillates 1.56 → 1.10 → 1.56 world units every two beats, a 29% radius dip.
   Ryan watched it and likes it, so it stays — do not "fix" it on discovering the
   arithmetic. (If it ever must go: waypoints every eighth turn take the dip to 7.6%.)
5. **Dosado facing.** Facing must stay *constant* for the whole call — dancers orbit each
   other face-forward and never turn. Any rotation means the frame's facing mapping is wrong.
6. **Right shoulders first** on Dosado and Pass Thru, per the definitions.
7. **Return to home.** Dosado must end exactly where it started. The simulation says it does,
   at beat 6.
8. **Pass Thru clearance** — expect it to look tight at default bodies (0.06 world units of
   daylight is correct — real dancers brush shoulders). Also flip the new **"bodies" switch**
   (default / mixed / max): `mixed` and `max` must show a visibly bigger square with everyone
   still clearing. See the size section below.

Dosado's waypoints in **engine units** (multiply by the frame's scale for world
distances — the scale is body-derived now, ~2.60 for the default cast). Every beat
listed; the 2026-07-26 render watch caught a return-leg defect hiding in a skipped
beat-5 row, so no more elided rows:

```
beat |    A engine    |    B engine    | doing
   0 | ( 0.00, -0.50) | ( 0.00,  0.50) | start, facing each other
   1 | (-0.15, -0.10) | ( 0.15,  0.10) | forward, veering into own-left lanes
   2 | (-0.15,  0.30) | ( 0.15, -0.30) | right shoulders pass
   3 | ( 0.15,  0.30) | (-0.15, -0.30) | sidestep right, crossing behind
   4 | ( 0.15,  0.10) | (-0.15, -0.10) | backing straight (half walking pace)
   5 | ( 0.15, -0.10) | (-0.15,  0.10) | left shoulders pass
   6 | ( 0.00, -0.50) | ( 0.00,  0.50) | closing diagonal onto home — beat 0→1 mirrored
```

Watched 2026-07-26 (first human eyes), fixed in square-one **twice** the same day,
both spec defects the "provisional until rendered" marker predicted. Round one:
dancers veered outward after beat 4 (backward pass re-applied its lane veer from a
displaced start; the spec table had skipped beat 5). Round two: the first fix
backed straight then side-stepped a hard 90° corner at beat 5 — Ryan called it
"straight back then correct", and the CALLERLAB definition agrees with him:
*"walking a smooth circular path … slide slightly to the left to return"* — the
closing lateral blends into the backing as the beat-0→1 veer mirrored (`pass`'s
new 3-beat `close` exit; the chain is now three blocks, 2+1+3 = 6). The table
above is the final geometry. **Re-watch the return leg**, then Dosado is done.

### Dancer size vs. lane width — immediate defect closed 2026-07-26

Passing dancers clear each other only while `scale × 0.3 ≥ r₁ + r₂` — clearance is a *pair*
property. `SHAPE_BOUNDS` allows `body.radius` up to 0.60, so at a fixed scale 2.2 the body
editor could produce dancers who physically cannot pass each other, and the engine cannot see
it — square-one works in engine units where dancers are points with no radius.

**Fixed at the transform layer ([ADR-0012](adr/0012-pair-clearance-from-the-3d-silhouette.md),
journal [2026-07-26](journal/2026-07-26-body-derived-frame-scale.md)):** `DanceFloor` derives
its frame scale from the occupants' pairwise clearance needs — `rigidParts` +
`lateralClearance` (height-aware, side-on, heads count, forward overhang doesn't) through
`scaleForGaps` — never below the default, growing when some pair needs more room.
Whole-square breathing, done coarsely; no combination the editor can produce clips
side-to-side. The debug scene grew a "bodies" switch to verify the extremes. (ADR-0011's
first cut measured a flat disc per dancer; superseded the same day when the render showed
it ballooning the square.)

**Still open, deliberately:** local breathing (engine-side, hangs on the brief's question 1),
size-derived step cadence, and hand-contact height for the 0.10–2.00 height range — whose
seed is now `gripHeight` in `arm-pose.ts`: the **mean of the two dancers' resting elbow
heights**, which is where a horizontal forearm naturally sits, asserted in
`arm-pose.test.ts` so step 3 has to replace it deliberately. Its known failure: past some
height difference the taller dancer should do nearly *all* the accommodating, because an
adult can drop their arm to a child's height and a child cannot raise theirs to an adult's.
**A second placeholder sits beside it:** `contactRadius` takes half the *shorter* forearm,
so a mismatched pair grips at the short-armed dancer's reach — right in spirit, unexamined
at the extremes. **The
design work continues in
`~/Development/work/square-dance-planning/briefs/dancer-size-and-accessibility.md`**
— it reaches into the engine seam, and it is where representation and accessibility get
decided. Do not paper over any of it by clamping body size.

## Consuming square-one

`package.json` pins `square-one: github:randallard/square-one#v0.1.0` (planning ADR-0006).
Verified 2026-07-25: `applyCall`, `applyCallToPair`, `createPerformance` and the exported
types all resolve, and `tsc -b` passes against them.

**The one sharp edge — `allowBuilds` is keyed by commit hash.** square-one gitignores its
`dist/`, so pnpm must run its `prepare` (a plain `tsc`) after cloning. pnpm's blocked-scripts
default refuses that until it is allowed, and it will *only* accept the full
`square-one@https://codeload.github.com/.../<sha>` key — a plain `square-one: true` is
rejected. **That sha changes on every square-one tag**, so bumping the dependency is a
two-line edit here, not one.

Do not paper over this by allowing builds broadly; the individual-exception rule is the point.
If the churn becomes annoying, the fix belongs in square-one — commit its `dist/` so no build
step is needed, which makes tags drop-in. Flagged to the planning effort as a real cost of
ADR-0006's git-dependency choice.

Local co-development uses a link override instead of the pin, per ADR-0006. CI always installs
from the pin.

**✅ The release is finished (2026-07-28, `1976f7f`).** square-one's `v0.2.0` tag is pushed
(Ryan), the pin resolved for the first time, and the link override is out. Verified against
the resolved tarball rather than the sibling checkout: `node_modules/square-one` points at
`.pnpm/square-one@https+++codeload.github.com+…+660fe33`, the remote tag dereferences to that
same commit, and the `allowBuilds` key did its job — pnpm ran square-one's `prepare`
(`tsc -p tsconfig.build.json`) on install, which is the whole reason that key exists.

Gates from that real install: `tsc -b` clean, eslint 0 errors, 295 tests, `vite build` clean,
audit 1 high ignored. `package.json` and `pnpm-workspace.yaml` are now the repo's real
dependency state rather than work in progress.

**The sequence, for the next bump.** Tag and **push** square-one first — pnpm cannot resolve
a tag that isn't on the remote, so a local tag leaves the pin unverifiable. Then bump the pin
*and* the `allowBuilds` sha (two lines), remove any link override, `pnpm install`, re-run the
gates, and commit `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` **together** —
they only mean anything as a set. **Never commit the link.** While it is in place the pin is
inert and every green gate here proves nothing about a fresh clone: ADR-0006's footgun,
green-against-link and red-against-pin. This release sat half-done for a day for exactly that
reason, and the three files were held back through six commits of M4 work to keep it honest.

## Teaching content is ours

*Decided 2026-07-29 by the planning effort's **ADR-0008**
(`square-dance-planning/adr/0008-teaching-content-is-townage-data-engine-stays-pure.md`) —
cross-repo, so it lives there. Nothing is built yet; this section records the seam so M5 can
start cold.*

**This repo owns** which NPC teaches what, unlock ordering, difficulty, lesson prose and voice,
whether a performance counts, and the record that a player knows something. **square-one gains
no teaching metadata at all** and is never told anything is being taught.

- **Follow the existing pattern, don't invent a second one.** `src/config/game-knowledge.ts` +
  `src/config/npcs.ts` already do exactly this for King's Cooking and Spaces Game: a canonical
  subject list, per-subject knowledge as prose in skill tiers, and
  `getGameKnowledge(npcId, skillLevel)` dispatching on NPC config. Teaching a gesture is the
  same kind of object. The learned-record side follows `npc-records.ts` /
  `npc-kings-chess-records.ts` under [ADR-0007](adr/0007-localstorage-with-a-versioned-backup-file.md).
- **Prerequisite ordering is *derived*, not annotated.** A call's block chain already states
  what must be known first, so read it out of composition rather than asking square-one for a
  prerequisite field. Difficulty and tiering are ours, because they are tuning judgments about
  this game rather than facts about square dance.
- **A taught thing is a tagged union**, so non-engine gestures have a home:
  `{ kind: "block", block, params }` for choreography square-one drives, and
  `{ kind: "gesture", gesture }` for townage-native two-body gestures. One progression orders
  both, since ordering is ours.

**The fist bump is why the union exists.** It is *not* an emote — `Emote`/`ResolvedPose` in
`src/services/emotes.ts` is single-character by construction, every field one body's own
rig-local pose, with no partner reference and no world space — and it is *not* a square-one
block, having no travel and not being square dance. But `src/dance/arm-pose.ts` already holds
the machinery it needs: a general two-body contact vocabulary (`gripHeight(a, b)`,
`contactRadius(a, b)`, `contactSeparation(a, b)`, `reachAllowance(me, them, separation)`,
`PERSONAL_SPACE`) built for the Allemande grip. Authored two-body contact gestures are the
piece that does not exist yet, and the fist bump is their first user.

### M5 order: the fist bump comes first

*Planning **ADR-0009** (Ryan, 2026-07-29) —
`square-dance-planning/adr/0009-fist-bump-proves-player-contact-before-the-square.md`. It
corrects a sequencing observation in ADR-0008, whose own decision is unaffected.*

**Lead with a player↔NPC fist bump.** Teaching `arm-turn` first bundles two unknowns into one
milestone — whether the player can make contact with another character at all, and whether the
player can occupy a slot in an engine-driven square. The fist bump isolates the first and drops
the second: no engine, no square, no beat clock. It is the **de-risking step** for the
player-in-a-square problem rather than a detour from it.

Nearly everything it needs is already here:

- **`src/dance/arm-pose.ts` is driver-agnostic by design** — "the driver hands over floor
  positions and headings and eases its rig toward what comes back", and its only import is
  `services/body-shapes`. Two characters with positions and headings satisfy it.
- **`src/world/World.tsx` already computes player↔NPC distance every frame**, with
  `NPC_APPROACH_DIST` / `NPC_WALK_AWAY_DIST` and an approached-and-standing-still detector that
  fires a callback. That is the trigger.
- **`src/world/Player.tsx` already renders an arbitrary `ArmPose`.**
- **`services/body-shapes.ts` sizes both**, so reach and clearance across mismatched bodies are
  computable today.

**The new work is the gesture itself, and don't over-read the reuse:** `gripPose` is the
*forearm* grip — two horizontal antiparallel forearms, each hand at the other's elbow. A fist
bump is hand-to-hand and needs its own pose function. Reusable are `ArmMetrics`,
`contactSeparation`, `reachAllowance` and `PERSONAL_SPACE`. Two contact kinds in one module is
also the point to review that module's shape; it was written for one.

**Watch it before believing it.** Contact has been wrong by eye three times in this repo while
tests stayed green — the sliding grip most recently. Reuse the contact panel's min → max
instrumentation rather than judging by camera angle.

**The radial wheel is M5 scope too**, because it is *how* the player initiates the fist bump —
[ADR-0014](adr/0014-radial-wheel-for-emotes-and-taught-moves.md). Held pointer on an NPC opens a
circle of emotes / greetings / moves; release at centre or outside cancels. Marking-menu model
(Kurtenbach 1993): the wheel is shown after the hold, and a directional flick selects without
waiting, so novice and expert use one gesture. **Its items are taught things** — planning
ADR-0008's union — so learning something is what puts it on the wheel, and filtering by "what's
possible with this NPC right now" keeps the list under the ~8-item practical ceiling without
submenus.

Two things that constrain the build:

- 🔴 **`VirtualJoystick` occupies the natural gesture area** (`position: fixed; bottom: 40;
  left: 40`, 120 px, `zIndex: 5`), which is why the wheel opens *on a character* rather than
  anywhere on screen.
- **Input follows [ADR-0013](adr/0013-pointer-events-with-capture-for-new-pointer-input.md)** —
  Pointer Events with `setPointerCapture`, per `SliderRow.tsx`, branching hold duration on
  `e.pointerType` (~500 ms for touch, immediate for a right-click) rather than on the
  `"ontouchstart" in window` boolean, which is wrong on hybrid devices.

`EmotePanel` stays as the browse-everything surface, and its existing digit bindings (1–9, 0)
become the wheel's keyboard path and expert shortcut — worth extracting rather than copying.

### Built so far: the wheel is live on the main NPC (2026-07-29)

Following M4's pattern — pure module and tests first, driver second, watch third. **91 new
tests, 386 total**, lint 0 errors (no new warnings), build clean.

**✅ Watched and working (Ryan, 2026-07-29).** `pnpm dev`, walk up to Ryan-the-NPC, and **hold**
on him (or right-click). The wheel opens at the press point with the player's own emotes; drag
to a wedge and release to play it, or release in the centre to cancel. A short **tap** still
opens chat, untouched.

**The watch found four defects, and no test would have caught any of them.** Worth listing,
because three were invisible to the suite by construction and the fourth was legible in a
screenshot before anyone described it:

1. **iOS answered the hold with its own long-press.** Safari put up the selection loupe and a
   Copy / Look Up / Translate bar instead of the wheel. `-webkit-touch-callout: none` was on the
   *wheel*, which does not exist until the hold completes — the hold happens on the **canvas**.
   Moved there, scoped so DOM text stays selectable.
2. **The hold's click fell through to chat.** A click always follows `pointerdown` +
   `pointerup` on the same target, so the NPC opened chat behind the wheel on a selection *and*
   on a cancel. `useWheelGesture` now exposes `consumeClick()`, which `App` checks before
   delegating to `handleNpcClick`.
3. **A one-item wheel drew a stray line, not a ring.** With a single wedge the bounds run −π to
   +π and the endpoints coincide, so the annulus-sector path degenerates. A full circle is now
   its own path. This would have fixed itself on the second emote — the kind of defect that
   hides for months.
4. **Nothing opened at all with no emotes saved**, which is indistinguishable from a broken
   gesture. An empty wheel now opens with one disabled "no emotes yet" wedge.

**Not in the wheel yet: the fist bump.** Deliberately — it has no driver, and a wedge that
selects and does nothing is exactly the `spin` channel's failure, which passed its test for a
week by being unwired. It joins when it can actually run.

- **[`src/dance/fist-bump.ts`](../src/dance/fist-bump.ts)** (31 tests). Contact geometry and a
  seconds-based envelope (extend 0.25 / hold 0.35 / withdraw 0.3). No square-one import, no
  beat clock — ADR-0009's "touches no engine" holds literally.
  - **ADR-0014's cost estimate was wrong, in our favour.** It predicted a new pose function
    because `gripPose` is the *forearm* grip. But `gripPose` is parameterised by `radius` and
    `separation` and places everything from the pivot, so a fist bump is the same function with
    `radius` = the character's own `handRadius` and `separation` = 0. Asymmetric hands then fall
    out correctly: hand centres end up exactly `a.handRadius + b.handRadius` apart, which is
    what touching means. Asserted across every pair in the cast.
  - **The contact point splits the gap by *reach*, not body radius** — deliberately unlike
    `reachAllowance`. Sharing a lane is a question about torsos; meeting in the middle is a
    question about arms. The consequence is that the dancer-size brief's rule *falls out*: the
    longer-armed character covers more of the distance, so a child and an adult meet close to
    the child. `gripHeight` is still the shared placeholder for height.
  - The hold is written exactly rather than eased, on the sliding-grip lesson: easing *through*
    a contact window is how a defect looks right and measures wrong.
- **[`src/overlay/wheel-geometry.ts`](../src/overlay/wheel-geometry.ts)** (19 tests). Wedge 0
  straight up, clockwise, so digits 1–9/0 map in reading order. Dead zone cancels; selection is
  unbounded outward.
- **[`src/overlay/useWheelGesture.ts`](../src/overlay/useWheelGesture.ts)** (21 tests). The
  ADR-0013 piece: Pointer Events with capture on the pressed element, `pointerId` filtering so a
  second finger is ignored, `pointercancel` resetting, and `contextmenu` suppressed so a
  right-click drag is possible. Hold defaults to 500 ms (Android's long-press timeout and iOS's
  `minimumPressDuration`) and is a prop, per ADR-0015's adjustable-hold requirement.
  - **A short tap deliberately does nothing here**, so an NPC's existing tap-to-chat still
    works. Only a hold opens the wheel — the wheel coexists with the current tap meaning rather
    than taking it.
  - ~~🔴 **The non-dragging path is not wired.**~~ **Done 2026-07-29** — see `WheelButton`
    below. Tapping the NPC was spoken for by chat, so the opener is a button instead.
- **[`src/overlay/InteractionWheel.tsx`](../src/overlay/InteractionWheel.tsx)** (17 tests). SVG
  annulus sectors, active wedge highlighted, digit hints, disabled wedges greyed and out of the
  tab order. In `drag` mode it is `pointerEvents: none` decoration — the opener owns the
  gesture, and a wedge that also handled clicks would fire twice. In `sticky` mode each wedge is
  a real button answering click, Enter and Space.

**ADR-0014 was contradictory, and [ADR-0015](adr/0015-radial-wheel-dead-zone-cancels-selection-unbounded.md)
supersedes it.** Found by implementing it, within the hour of accepting it: ADR-0014 said cancel
"at the centre **or outside the ring**" while also requiring a marking menu's directional flick,
and **a flick goes outside the ring** — so the expert gesture would always have cancelled, and
only for the users who had learned the directions. ADR-0015 resolves it in favour of the flick:
the dead zone cancels, selection is unbounded outward, and aborting means coming *back* to the
dead zone (which still satisfies WCAG 2.5.2). Everything else in ADR-0014 carried forward
unchanged. **The ring is now purely visual** — a drag beyond the artwork still selects, and that
is not a bug to fix.

**How it is wired.** `App` owns one `useWheelGesture` (only one wheel can be open at a time) and
renders `InteractionWheel` in the DOM overlay; the handlers are threaded `App → World → Npc` and
spread onto the NPC's existing hitbox mesh, next to its `onClick`.

- **The event type is structural for this reason.** The thing pressed is a **mesh**, so R3F's
  `ThreeEvent` arrives rather than a DOM event — same pointer fields, but capture lives on
  `target` instead of `currentTarget`. `WheelPointerEvent` names only what is used and
  `capturePointer` takes whichever handle offers the method, so one hook serves a DOM button and
  a 3D character.
- **`showKeyHints` asks the gesture, not the device.** The wheel records the `pointerType` that
  opened it, so hints show for a right-click and not for a thumb — ADR-0013's per-interaction
  argument applied to rendering, and the reason this did not become a fifth
  `"ontouchstart" in window` check.

- **[`src/overlay/WheelButton.tsx`](../src/overlay/WheelButton.tsx)** (6 tests). ADR-0015's
  **non-dragging path**, and the accommodation a long press most needs: WCAG **2.5.7** (AA) and
  **2.5.1** (A) both require a single-pointer alternative to hold-and-flick, and a fixed
  long-press is the part of this design most hostile to tremor. Third in the button row
  (pocket 40, emotes 104, this 168), opening the wheel in `sticky` mode — it stays up with no
  pointer held and a wedge is chosen by tapping it.
  - **Centred on the viewport, not on the button.** The wheel is ~240 px across, so a corner
    anchor would put half its wedges off-screen — and the flick that would forgive that is
    exactly what this path exists to avoid needing.
  - **Renders on every device, unlike its neighbours.** `PocketButton` and the emote button
    hide behind `"ontouchstart" in window`, which is fine for a convenience control and wrong
    for this one: a mouse user who cannot hold a button down needs it as much as a thumb does.
    A real `<button>`, so Enter and Space work for free.
  - Key hints now show unless the wheel was opened **by touch**, so the sticky path — the one a
    keyboard user reaches for — shows the digits.

**Still to build, in order:**

1. **Drive both characters' arms through a bump.** The real integration: `Player.tsx` and
   `Npc.tsx` each own their rig and read `AnimationController` independently, so something has
   to hold the shared bump state and hand each of them a world-space arm pose for its duration.
   This is the piece with no precedent — `DanceFloor` does it for dancers, but the player has
   never been on either side of a contact.
2. **Add the fist-bump wedge**, once step 1 makes it do something. `canBump` from
   `fist-bump.ts` greys it out when the player is too far to reach.
3. **Watch it.** Contact has been wrong by eye three times here with green tests behind it.
4. **Anchor the sticky wheel to a chosen NPC.** It is viewport-centred today, which is fine
   while every wedge is a player emote. The moment the wheel carries NPC-specific items — the
   fist bump — the sticky path needs to know *who*, or it becomes a second-class route to a
   subset of the wheel, which is precisely what 2.5.7 forbids.

🔴 **Still true, just deferred: `externallyDriven` has never run.** It is the seam by which the
player participates in a square instead of being driven by the engine. square-one implements it
(`src/stepper.ts`) and property-tests it (`test/properties.test.ts:330`); this repo declares it
at [`useDancePerformance.ts:32`](../src/dance/useDancePerformance.ts) and passes it through to
`createPerformance` — **and no caller has ever supplied it.** All of M4's contact machinery was
validated dancer↔dancer inside `DanceFloor`, with the player out of scope by
[ADR-0010](adr/0010-emote-choreography-channel-contract.md). This is the same shape as the
inert pin above, the `spin` channel that passed its test by doing nothing, and `osv-scan`
running for three days without ever passing: **an unexercised seam is not a seam.** ADR-0009
defers it; it does not answer it. It stays the gate in front of `arm-turn`.

## Supply chain

Settings live in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) — pnpm 11 reads them there,
not from `.npmrc`.

- **`minimumReleaseAge: 1440`** (1 day) — [pnpm's documented recommendation and its v11
  default](https://pnpm.io/settings): "in most cases, malicious releases are discovered and
  removed from the registry within an hour." Now stated explicitly rather than inherited, so
  a default change cannot move it silently. Verify with `pnpm config get minimumReleaseAge`.
- **`overrides: "brace-expansion@5": ">=5.0.8"`** — GHSA-mh99-v99m-4gvg / CVE-2026-14257
  (High, CVSS 7.5, DoS). OSV gives one range, introduced `0` fixed `5.0.8`.
  **Scoped to the 5.x line deliberately:** brace-expansion 5.x changed its export shape, so a
  blanket override throws `expand is not a function` inside `minimatch@3.1.5` on any
  brace-containing pattern — which this repo's eslint config has (`**/*.{ts,tsx}`). Measured,
  not guessed: the blanket version takes `pnpm lint` down with exit 2.
- **One `auditConfig.ignoreGhsas` entry remains**, for the residual `brace-expansion@1.1.16`.
  The reason is *not* a quarantine wait and *not* a severity judgement: **no patched version
  is compatible with `minimatch@3`'s API.** Dev-only path; nothing reaches the shipped
  bundle.
- **The same ignore is also in [`osv-scanner.toml`](../osv-scanner.toml), and has to be**
  (restored 2026-07-29). `auditConfig` governs `pnpm audit` only; the `osv-scan` CI job runs
  osv-scanner with `fail-on-vuln: true`, and osv-scanner reads its own config. Two scanners,
  two formats, one posture — each file points at the other. **Correcting this section's
  earlier claim:** it said `osv-scanner.toml` was deleted so there would be "one ignore, in
  one place, with a true reason." The reason was true and the consolidation was not
  available — it deleted the config the OSV job actually reads, and that job went red on
  every run from `fb6f4d2` (2026-07-26) until 2026-07-29. See
  [Two scanners is not duplication](#two-scanners-is-not-duplication).

### What the first attempt got wrong

Worth keeping, because it was confidently documented and still false. The comments asserted a
72-hour quarantine was blocking the fix. pnpm's actual default is 1440 minutes, the fix
cleared it on 2026-07-24, and the timed ignores were waiting for a deadline that had already
passed. The sibling repo `square-one` had the mirror-image bug — an age gate written into
`.npmrc`, where pnpm never read it, so it had no gate at all while believing it had a 7-day
one. Both were fixed together; see square-one's ADR-0011.

**The lesson both repos paid for: a supply-chain control you have not verified is not a
control.** `pnpm config get minimumReleaseAge` is one command.

### Two scanners is not duplication

*2026-07-29. The second half of the same lesson, and it cost three days of red CI.*

The 2026-07-25 CI work had already learned the right thing and written it down — "osv-scanner
reads its own config file, not pnpm's. Two ignores for one advisory, in two tools, over two
databases" ([journal](journal/2026-07-25-ci-half.md)). Later the same day, fixing the false
quarantine reasoning, `osv-scanner.toml` was deleted in `fb6f4d2` on the principle that one
advisory deserves one ignore in one place. That principle is good and did not apply: the two
files are not two records of one decision, they are configuration for two different programs.
Only `pnpm audit` reads `auditConfig`.

The cost was invisible because of *where* it failed. `pnpm audit --audit-level=high` kept
reporting `1 high (1 ignored)` locally, so the local signal said the posture was configured.
The OSV job is a reusable workflow that can't be exercised from a checkout, so nobody saw it
disagree. the-lot's `osv-scan` went red on every run after `fb6f4d2`; square-one, which never
had an `osv-scanner.toml` at all, has failed `osv-scan` on **every run in its history**.

**That "can't be exercised locally" claim was itself wrong, and that's the durable lesson.**
The reusable workflow can't run locally, but the *scanner* can, and it is what decides the
job. Reproduced before fixing and verified after, against a clean `git archive` export so
`node_modules` couldn't change the answer:

```
docker run --rm -v "$PWD:/src" -w /src ghcr.io/google/osv-scanner:v2.3.8 -r ./
```

Before: exit 1, the brace-expansion finding. After: `Loaded filter from: /src/osv-scanner.toml`,
`No issues found`, exit 0. **A gate you believe is unrunnable locally is worth ten minutes of
trying anyway** — the container the job pulls is usually just a container.

## What's stubbed, dead, or unfinished

- **`board-creation` is wired but unreachable.** The phase, its resume point, and its
  `BoardCreator` UI all exist and are handled in `App.tsx` — but nothing sets it. The comment
  at the call site says "kept for potential future use". Board creation moved into the games
  themselves.
- **`docs/plans/npc-documentation-lookup.md` is unimplemented.** It designs a "booklet" for
  NPC Ryan — static markdown under `public/docs/` plus a keyword index, fetched on demand via
  tool use. There is no `public/docs/` directory and nothing in `src/` references it.
- **`docs/plans/gettcheese-tutorial-game.md` is largely superseded.** It plans an in-phone
  tutorial with a ported game engine under `src/game/`. That directory does not exist; the
  games stayed separate deployments instead (ADR-0005).
- **`@react-three/rapier` is a dependency with zero imports.** Physics was provisioned, never
  adopted (ADR-0001).
- **`src/npc/`, `src/bot-play/`, and `src/overlay/games/` are empty directories.** *They are
  not abandoned repo structure* — `git ls-files` returns nothing for all three and no commit
  in the repo's history has ever touched them. They are untracked local remnants on one
  machine, invisible to a fresh clone. Safe to delete; nothing to salvage. (Recorded because
  the M3 handoff brief flagged them as an open question — this is the answer.)
- **`FIXED_KEYS` in `backup.ts` covers 12 of the 23 `townage-` keys the code writes**, with
  no test asserting the namespace is fully accounted for (ADR-0007).
- **`BotParts.tsx` types its `rushMode` prop as `RefObject<number>`, not `RefObject<RushMode>`** —
  a small type-safety hole at the one site that writes `2` (ADR-0003).
- **Debug `console.log` calls remain** in `App.tsx`, `useGameState.ts`, and elsewhere,
  including one wrapping `setShowChatInfo` purely to print a stack trace.
- **Font rendering on Linux** — an unresolved 2026-03-06 finding. Courier New isn't installed;
  the fallback renders oddly at 12px. Deferred, no clock on it; see
  [`reviews/README.md`](reviews/README.md).

## What M4 actually contains

*This section is the M4 handover. It should be enough to start the work cold.*

A new `src/dance/` subsystem in townage, consuming square-one:

- **Frame** — the unit-square ↔ world transform (dance-floor origin, scale, orientation).
  square-one's square frame is abstract and **re-fits to actual dancer positions** as a
  square migrates, so this transform has to respect that drift rather than pin dancers to
  fixed floor coordinates.
- **Driver** — ticks square-one's performance stepper from `useFrame`, feeds the player in as
  an **externally-driven dancer**, and writes position and facing onto dancer rigs. Per
  square-one's ADR-0007 the stepper is the primary interface; ideal path data is what it
  produces with every performance coefficient turned off.
- **Blend contract with the existing animation system** — choreography owns transform and
  facing; emotes own pose. The seam is **not clean**, and the specifics matter:
  - `AnimationController.tick()` returns a `ResolvedPose` — arm rotations, head delta,
    body lean, `bodyDeltaY`, `bodyDeltaRotY`. It is pose-only. Nothing in it moves a
    character through the world.
  - But `Player.tsx` currently gives emotes a **veto over locomotion** (`else if (!isEmoting)`
    guards the movement branch) and lets them **overwrite facing** (`rotation.y` is set from
    `emoteBaseRotY + bodyDeltaRotY` while emoting). A driver that owns transform and facing
    collides with both. Resolving that is the first real design decision of M4 — and it
    deserves an ADR.
  - Grip-bearing blocks (square-one's `arm-turn`) carry hand semantics that must drive arm
    poses. This section originally said the driver should **request poses through
    `services/arm-actions.ts`**; that was **decided the other way** on 2026-07-26.
    `arm-actions` is the canned-keyframe emote system, and an engaged arm tracks live
    formation geometry — so `src/dance/arm-pose.ts` owns it, alongside transform and facing.
    The 2026-07-26 arm work added a second case that settles it: the **proximity tuck** is
    not in the engine's data *or* a canned pose, it is derived from where the other dancer
    is this frame, and an emote flinging both arms wide during a shoulder pass would put an
    arm through another dancer. Both belong in the ADR-0010 contract.
  - `bodyDeltaY` is a *visual* offset only — `positionRef` stays at ground level. The driver
    should follow that convention.
- **`<DanceFloor>`** — places N dancers, N ∈ {2, 4, 8}. Two-couple-safe: don't hard-code 8.

**Done when:** a debug scene has two NPCs looping Dosado, driven by square-one. That render
is also what **validates square-one's provisional waypoints** — its Dosado spec marks them
"provisional until rendered", so M4 is the check three calls of geometry are stacked behind.

**Before starting**, read in this order:
1. `~/Development/square-one/docs/PROGRESS.md` — is M2 (consumable package) done?
2. `~/Development/square-one/docs/adr/0007-stepper-primary-ideal-paths-derived.md` — the interface you're consuming.
3. `~/Development/square-one/docs/spec/calls/dosado.md` — the first call to render.
4. `~/Development/work/square-dance-planning/PROGRESS.md` — the cross-repo milestone table.

**Both ADRs this section expected are now written.** The emote/choreography blend contract
became [ADR-0010](adr/0010-emote-choreography-channel-contract.md) (2026-07-28). Teaching
content was decided **2026-07-29** in the planning effort's **ADR-0008**
(`square-dance-planning/adr/0008-teaching-content-is-townage-data-engine-stays-pure.md`) —
cross-repo, so it lives there per that effort's ADR-0007. See
[Teaching content is ours](#teaching-content-is-ours) below for what this repo now owns.

## How CI landed

*Replaces the handover section that stood here. All eight gates pass locally and in Actions:
`install --frozen-lockfile`, `lint`, `test`, `build`, `audit --audit-level=high`,
`audit signatures`, the license allowlist, and `docs-hygiene`.*

*Corrected 2026-07-29: there is a **ninth** gate, `osv-scan`, and it was red from `fb6f4d2`
until 2026-07-29 while this section said all gates passed. It is counted, runnable locally,
and green as of the `osv-scanner.toml` restore — see
[Two scanners is not duplication](#two-scanners-is-not-duplication).*

**The handover's measurements were exact** — 61 lint errors, 25 warnings, ~26 of them
`react-hooks/*`, `docs-hygiene.py` already clean, `ci.yml`'s `detect` job self-skipping the
Rust half. All verified before acting on them.

**What it missed, all in the supply-chain job it hadn't run:**

- `pnpm audit --audit-level=high` found **27 vulnerabilities (15 high, 1 critical)** — every
  one a devDependency. `pnpm update` within existing semver ranges cleared 26.
- The 27th, `brace-expansion` (GHSA-mh99-v99m-4gvg), was first handled as a timed ignore in
  `pnpm-workspace.yaml` **and** `osv-scanner.toml` — two entries because `pnpm audit` and the
  OSV scan are different tools over different databases, something only the real CI run
  revealed — and correctly so; the `osv-scanner.toml` half was later deleted on a
  consolidation that did not hold, and is back. **Both were wrong and have been replaced
  (2026-07-25, later).** The stated reason
  — waiting out "pnpm's 72-hour `minimumReleaseAge` quarantine" — was wrong twice over: the
  quarantine is **1440 minutes (1 day)**, pnpm's documented default and recommendation, and
  the fix cleared it on 2026-07-24. Nothing was ever being waited for. See
  [Supply chain](#supply-chain) for what replaced it.
- `pnpm exec license-checker-rseidelsohn` wasn't installed — the template has no
  `package.json`, so its pnpm path was never exercised. Added as a devDependency.
- The license allowlist then failed on **`@react-three/rapier`, which publishes with no
  license field and no LICENSE file**. Since ADR-0001 already recorded it as provisioned but
  never imported, it was **removed** rather than excepted. Physics returns as a deliberate
  choice when something needs it.
- Four more licenses had to be allowed, all permissive toolchain transitives: `CC-BY-4.0`
  (caniuse-lite — browser data, not code), `(MIT AND CC-BY-3.0)` (spdx-ranges), and `MIT*`
  (webgl-constants — MIT by its LICENSE file, undeclared in `package.json`). Recorded inline
  in `ci.yml`.
- `pnpm/action-setup` needs a version source. Added `"packageManager": "pnpm@11.5.3"`, which
  also pins CI to the pnpm that produced the lockfile.
- pnpm 11 no longer reads `pnpm.*` settings from `package.json`; they live in
  `pnpm-workspace.yaml` now. That's where `allowBuilds: esbuild: true` went — which is also
  what fixed `pnpm test` locally.

**The 61 lint errors resolved as 35 mechanical + 5 ordinary + 21 architectural.** The
mechanical ones were fixed. So were the 5 ordinary ones — and one of those was hiding a real
bug: `SettingsApp`'s `settingsActions` memoized on `[onOpenBodyEditor]` while closing over
`prefs`, so the keyboard shortcut for "toggle AI responses" fired against stale preferences.
The remaining 21 are `eslint-plugin-react-hooks` objecting to ADR-0002's shared-ref pattern
on purpose; they are excepted by path, per [ADR-0008](adr/0008-react-hooks-rules-excepted-at-the-ref-boundary.md).

**Deliberately deferred: `eslint-plugin-react-hooks` 7.1.1.** It arrived incidentally in the
audit-driven update and materially changes the lint surface — `refs` goes 6 → 47 and extends
to `App.tsx`, plus 6 `set-state-in-effect` and 2 `preserve-manual-memoization` errors needing
real restructuring in the game-return handler and the assembly-cutscene step machine. The
plugin is pinned to exact `7.0.1`; adopting 7.1.1 is worklist item 3, with play-testing.

## Worklist

1. ~~Fix the two failing `fetch-pending-results` tests~~ — **done 2026-07-25**.
2. **M4: `src/dance/`** — frame, driver, `<DanceFloor>`, the arm channel. Built and mostly
   watched. What's left, in order:
   1. **Watch the emote experiment** (M4 list item 3b) — the one thing blocking the ADR.
   2. ~~**Write ADR-0010**, the emote/choreography blend contract~~ — **done 2026-07-28**,
      [`0010-emote-choreography-channel-contract.md`](adr/0010-emote-choreography-channel-contract.md).
      Three channel kinds — **owned** (dropped), **limited** (clipped by trespass),
      **free** (untouched) — with the full per-channel table in the ADR, which is the
      authority; don't re-summarise it here, it has already drifted once.

      The two things the writing itself changed, both worth knowing without opening it:
      - **Body facing and head facing are separate channels with different owners.** The
        choreography owns the body; the emote owns the head. "Facing is owned" would
        forbid a dancer glancing at their partner.
      - **"Lean is free" was wrong.** `rigidParts` counts `sin(|leanZ|) · height/2` as
        lateral reach, so a *sideways* lean is silhouette and is `limited`. Only the
        forward/back lean is free. That produced the ADR's actual load-bearing rule: **a
        channel is `limited` exactly when it feeds `rigidParts`** — derivable rather than
        a matter of taste, and it settled the silhouette deltas as a side effect.

      The player's case is deliberately **out of scope**; see the planning effort's
      `square-dance-planning/briefs/breakdown-is-the-feature.md`.
   3. ~~**Finish the release**~~ — **done 2026-07-28** (`1976f7f`). Tag pushed, pin
      resolved from the tarball, link dropped, gates re-run against a real install.
   4. **An ADR extending ADR-0008's react-hooks exception to `src/dance/**`** — still owed
      from the original M4 handover.
   5. ~~**The silhouette hole**~~ — **closed 2026-07-28**, `src/dance/silhouette-limit.ts`.
      Named as a `limited` channel by ADR-0010, then enforced: a dancer may inflate by
      their share of the live slack, on the arm envelope's model. Watchable at `#dance`
      via the **puff up** emote. The enforcement found that the channels were not
      "applied unclipped" as the ADR describes but not applied to dancers at all — see
      [the journal entry](journal/2026-07-28-3-enforcing-the-limited-channels.md).
3. **Adopt `eslint-plugin-react-hooks` 7.1.1** (pinned at exact `7.0.1` today, per
   [ADR-0008](adr/0008-react-hooks-rules-excepted-at-the-ref-boundary.md)). Needs 6
   `set-state-in-effect` and 2 `preserve-manual-memoization` fixes in the game-return handler,
   the assembly-cutscene step machine, `World`, and `VirtualJoystick` — all behaviour-critical,
   so do it with the app running, not blind.
4. ~~Drop the `brace-expansion` ignores on/after 2026-07-26~~ — **done 2026-07-25**, and the
   premise was wrong. See [Supply chain](#supply-chain): the patch had already cleared the
   real (1-day) gate, and a **scoped** override carries the 5.x line. The ignore remains for
   a different and truthful reason — no patched version is compatible with `minimatch@3`'s
   API — and lives in **both** `pnpm-workspace.yaml` and `osv-scanner.toml`, one per scanner
   (the 2026-07-25 deletion of the latter was itself wrong; restored 2026-07-29). Drop both
   together when the toolchain stops pulling `minimatch@3`.
5. ~~CI + supply-chain gates~~ — **done 2026-07-25**. See [How CI landed](#how-ci-landed).
6. Delete the three untracked empty directories; tighten `BotParts`'s `rushMode` prop type;
   strip debug logging.
7. Add a test asserting every `townage-` key is accounted for in `backup.ts` — the CI license
   gate just demonstrated the value of machine-checked inventories.
8. Work down the 24 `react-hooks/exhaustive-deps` warnings. Non-blocking, but they are the
   backlog the pinned plugin is deferring, not architecture.
9. Arc chunk 1 (M5): **the radial wheel + the player↔NPC fist bump first**, then
   `externallyDriven`, then an NPC teaches `arm-turn`. Teaching content is decided (planning
   ADR-0008 — it's ours), the order is decided (planning ADR-0009 — the fist bump de-risks
   player contact without the square), and the controls are decided
   ([ADR-0014](adr/0014-radial-wheel-for-emotes-and-taught-moves.md) wheel,
   [ADR-0013](adr/0013-pointer-events-with-capture-for-new-pointer-input.md) input API). The
   wheel is how the fist bump is initiated, so the two land together. See
   [M5 order: the fist bump comes first](#m5-order-the-fist-bump-comes-first).

Deferred with reasons: physics (rapier removed — re-add deliberately when something needs it,
and resolve its missing license declaration then); the NPC documentation "booklet" plan; the
in-phone gettcheese tutorial.

## Open questions

- **Emote/choreography arbitration** — who wins on facing and locomotion when both want them?
  Due at M4, first thing.
- **Teaching-content representation** — townage data or square-one? Proposal: townage. Due at M5.
- **When does the ref-plumbing pattern break?** ADR-0002 names a promotion condition: the
  per-entity `<name>ScreenPos` refs grow linearly with the cast, and `<DanceFloor>` needs to
  place up to 8 dancers. M4 may be the event that triggers replacing them with a keyed
  registry.
- **Database / backend: deliberately not yet.** Everything is client-side (ADR-0007). The
  named trigger for the backend deliberation is the arc's **social layer** — sharing custom
  moves, sequences, and tips *between people*. Until then: versioned plain-data files.

---

_History accretes below, oldest first. See [`journal/`](journal/README.md) for the narrative
and [`reviews/`](reviews/README.md) for stance reviews._

- **2026-03-06** — Repo scaffolded. White void, two-part bot discovery, rush navigation,
  drag-to-assemble, pocket inventory, mobile joystick. R3F chosen over Babylon; the shared-ref
  pattern and the derived-phase model both established the same day. See
  [`journal/2026-03-06-session-1-white-void-and-bot-parts.md`](journal/2026-03-06-session-1-white-void-and-bot-parts.md).
- **2026-03-07 → 2026-04-06** — Undocumented at the time; reconstructed from commits. Phone
  tutorial, the NPC chat proxy and game-launch handoff (`a2f71fa`), keyframe and emote UI,
  backup/restore (`5b58561`), eye and body editors, slider and phone polish (`609e989`).
- **2026-07-25** — Docs retrofit (planning M3). `docs/` stood up, root `journal/` and `plans/`
  moved in, README replaced, seven ADRs backfilled, this file created. No `src/` changes. See
  [`journal/2026-07-25-docs-retrofit.md`](journal/2026-07-25-docs-retrofit.md).
- **2026-07-25** — CI half landed (`b8ec634`, `782fc02`). Nine gates green on `main`; 61 lint
  errors to 0; tests 163/163; 27 audit findings to one dated, self-expiring ignore;
  `@react-three/rapier` removed. ADR-0008 and ADR-0009 came out of it. See
  [`journal/2026-07-25-ci-half.md`](journal/2026-07-25-ci-half.md).
- **2026-07-26** — Body-derived frame scale (ADR-0011). `scaleForBodies()` closes the brief's
  immediate defect: the full `SHAPE_BOUNDS` radius range dances without intersecting, the
  debug scene can prove it, 186/186 tests. See
  [`journal/2026-07-26-body-derived-frame-scale.md`](journal/2026-07-26-body-derived-frame-scale.md).
