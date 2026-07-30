# ADR-0016: A contact move is authored as constraints on body parts, not as a keyframed pose
- Status: Accepted
- Date: 2026-07-30
- Deciders: Ryan, Claude

## Context

M5's fist bump is built and wired (planning **ADR-0009**, in
`~/Development/work/square-dance-planning/`), and Ryan watched it. Two screenshots set the
agenda:

- **Far apart and facing away:** the forearms and hands are *detached*, floating in the gap
  between the two characters.
- **Close together:** the fists do not read as meeting, and read as sitting at different
  heights.

Neither is a tuning problem, and the constants they are made of were chosen by hand in code.
Ryan's response was to ask for an authoring surface — an editor for two-body moves, the way
`EmoteBuilderModal` is an editor for emotes.

**The existing authoring surface cannot be extended to do it.** `EmoteBuilderModal` authors
keyframed joint angles for one character. `Emote`/`ResolvedPose` in `services/emotes.ts` is
single-character by construction — every field is one body's own rig-local pose, with no
partner reference and no world space. Planning **ADR-0008** already established this and gave
gestures their own arm of the taught-thing union for exactly this reason.

**Three different things in this repo are called a pose**, and the confusion between them is
the decision:

| Type | Is | Authored by |
|---|---|---|
| `services/arm-actions.ts` → `ArmPose` | joint angles (shoulder / elbow / wrist, degrees) | the emote editor |
| `dance/arm-pose.ts` → `ArmPose` | a placement + aim vector in the character's local space | nobody — solved per frame |
| what a contact move needs | *"this part meets that part, resolved this way"* | nothing yet |

**Keyframed angles are the wrong model here, and the fist bump's own maths says so.**
`contactFraction` splits the gap by reach so the longer-armed character covers more of it;
`gripHeight` picks a shared height from both bodies; `reachAllowance` is where "a child cannot
raise their arm to an adult's" will live. That machinery exists precisely so a bump between
mismatched bodies works without being re-authored. Author joint angles and every pairing needs
its own take, and the dancer-size brief's accessibility rule stops falling out and becomes a
special case.

**The detached arms are not a defect, and this is the part that would be easiest to get
wrong.** `dance/arm-pose.ts` says in its opening docstring that it "does not model reach or
attachment: an arm is not obliged to stay plausibly connected to a shoulder," written as a
concession to caricatures that have no upper arms, necks or legs. Ryan's reading is that this
is an *affordance*, not a compromise:

> at the end of the day these are characters — for players, avatars — both hiding parts of our
> real selves and at the same time, allowing us to express ourselves in ways that our real
> bodies are limited … what if an emote could take one arm as a paddle and toss the other fist
> up to lob across the dance floor where someone could lob it back — mid dance even … what if
> dancers could trade heads! chaos! So I do want to leave some of that unrestricted
> deliberately.

That reframes the screenshot. The wrong thing about the floating arms is not that the arm left
the body — it is that **nothing authored the detachment**. An unhandled case and a deliberate
absurdity look identical on screen and are opposites in the model. The purpose of naming the
strange cases is not to forbid them; it is so the two stop being indistinguishable.

A lobbed fist, a paddle arm and a traded head are all the same shape underneath, and it is
smaller than "two hands meet": a **part**, a **destination**, and **who owns the part when it
gets there**. Contact is the special case where the destination is a shared point and ownership
returns to the body. Ownership transfer is not new machinery — [ADR-0010](0010-emote-choreography-channel-contract.md)'s
owned-channel rule and `FistBumpDriver`'s `drivenArms` are already that mechanism, currently
aimed only at arms and only for the length of a gesture.

**Where it lives is settled by decisions already taken,** so it is context here rather than a
second decision. square-one's
[ADR-0002](https://github.com/randallard/square-one/blob/main/docs/adr/0002-pure-library-no-storage-no-ui.md)
forbids UI and storage; planning ADR-0008 routes gestures to this repo. A separate editor repo
would have to carry `CharacterBodyShape`, `HandPose`, `computePositions`, `armMetrics` and
`CharacterPreview` with it — extracting the body model and the renderer, which planning
ADR-0004 declined once already — and hash-n-patter does not exist yet.

## Decision

**A contact move is authored data in townage: an ordered list of constraints, each naming a
part, a destination, and who owns that part on arrival — resolved at play time from the
participants' body metrics, never stored as joint angles.**

A constraint carries:

- **Roles, not characters.** Authored against `A`/`B` (and later `C`…`H`); a cast of real
  characters is bound at preview and at play time only. A move bound to a specific NPC is not
  reusable and defeats the body-independence the resolution rules exist for.
- **A stance** — the starting relation between roles, named (`facing-within-reach`,
  `side-by-side-within-reach`), never absolute coordinates. The same authored fact places the
  editor preview *and* supplies the runtime availability predicate.
- **An anchor** — the part, plus the hand pose it is in: `(part, "open" | "closed")`. Derived
  from `CharacterBodyShape` through `computePositions`, so it is a function of the body rather
  than a hand-placed marker. `HandShape.open`/`.closed` already exist per body.
- **A destination and a per-axis resolution rule.** Horizontal and vertical resolve
  independently: horizontal by reach fraction (`contactFraction`), at one role, or at the
  midpoint; vertical by mean resting elbow (`gripHeight` today), mean shoulder, or absolute.
  Splitting the axes is what makes a palm touch at shoulder height a different rule rather than
  a different function.
- **Handedness**, stated physically — `same-hand` (the handshake convention: two characters
  facing each other both put out their right), `opposite-hand`, or `independent`. Not
  "mirrored", which is ambiguous once the stance reverses one frame.
- **Out-of-range behaviour, authored rather than enforced** — `decline`, `reach` (stretch and
  detach), `lean`, or `none`. Reach is a rule the move chooses, not a validity gate the model
  imposes.
- **Ownership on arrival** — `return` (the part goes back to its own body) or `transfer` (it
  stays with the other role).
- **An envelope** in seconds, and **classification tags** in a reserved namespace of the
  existing `tags: string[]`.

Resolution runs through **one pure module**, three.js-free in `src/dance/` alongside
`arm-pose.ts` and `fist-bump.ts`, called by both the editor's preview and the runtime driver.
The editor UI lives in `src/overlay/`; the authored move is stored under
[ADR-0007](0007-localstorage-with-a-versioned-backup-file.md).

## Alternatives considered

- **Extend `EmoteBuilderModal` to two characters** — rejected. It authors joint angles for one
  rig, and `ResolvedPose` has no partner reference or world space anywhere in it. Two fists
  meeting at a point *between* two bodies is structurally inexpressible, which planning
  ADR-0008 already found.
- **Author contact moves in square-one** — rejected by that repo's ADR-0002. Not a judgment
  call: it forbids UI and storage outright.
- **A new shared editor repo now, consumed by townage and hash-n-patter** — rejected as
  premature, for the reasons in Context. Worth adding: the genuine second consumer is already
  here and is not another repo — the editor and the runtime — which is why one shared resolver
  is the load-bearing part rather than a nicety.
- **Reach as a hard validity gate — refuse to solve a pose that leaves the body** — rejected on
  Ryan's avatar stance above. It would foreclose the lob, the paddle and the traded head, which
  are the point rather than an edge case.
- **A single numeric "extremeness" degree on moves** — rejected in favour of tags. What people
  opt out of is not one axis: body-detachment, flashing and spinning, and being touched are
  different objections, and a scale forces a ranking between things that are not comparable.

## Consequences

- **The editor and the runtime must share the resolver, or the editor lies.** This is the
  property the whole design turns on, and it is also what makes a later extraction into a
  shared package mechanical rather than a rewrite.
- **The availability predicate is not purely geometric.** It is stance ∧ taught ∧ both
  participants' comfort settings, so the resolver takes the *partner's* preferences as an
  input from the start. Threading that in afterwards is expensive; one parameter now is not.
  The wider stance is a planning brief, not this ADR.
- 🔴 **`transfer` ownership is gated and unimplemented.** A lobbed fist or a traded head is the
  one case a receiver cannot decline by not looking, so it needs consent before it ships. The
  field exists so the schema does not foreclose it; nothing resolves it yet.
- **Classification tags are authored from day one, with nothing reading them.** Retrofitting
  classification onto existing authored content is the expensive part. The fist bump gets
  tagged now.
- **Two defects this obliges fixing, both currently silent:** `armMetrics` sets
  `handRadius = shape.hand.open.radius` unconditionally (`src/dance/arm-pose.ts:141`), so a
  closed-fist bump is solved with the open hand's radius and the fists are separated by the
  wrong amount by construction; and `gripHeight` is an acknowledged placeholder whose failure
  mode is exactly the very unequal pair in the second screenshot. Measure it in the overlay
  rather than eyeballing it — this repo's arm work has looked right and measured wrong three
  times.
- **Travel stays square-one's.** A move that holds contact *and* moves — Ryan's "touch a
  quarter": palm contact, then pinwheel a quarter — is a contact spec attached to a block, and
  `arm-turn` is already render-validated. If this editor grows waypoints, choreography now
  lives in two repos and planning ADR-0004's seam is gone.
- **N roles by shape, pairwise by implementation.** A list of contacts between named roles is
  already N-ready — a star is four contacts at one point, a wave is a chain — so no N-body
  solving is needed to avoid painting the schema into a corner.
- **The cost is indirection, and it is real.** You cannot drag an arm to where you want it. You
  specify a rule and watch it solve, which is harder to use and slower to author than
  keyframes. That is the price of a move that works between two bodies it was never authored
  against, and it is worth naming as a cost rather than pretending the editor will feel direct.
- **Promotion condition:** if hash-n-patter is scaffolded and wants to author the same moves,
  the pure resolver becomes a shared artifact and lifts out — a new ADR, not a quiet copy. If
  moves ever need sharing between *players*, that is the planning effort's repo-map item 5, the
  named trigger for the backend deliberation, and it is not this.
