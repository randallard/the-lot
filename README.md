# townage

A 3D world that hosts games.

You spawn into a white void — featureless ground, white fog, no instructions. After a few
seconds something appears off to the right: a small dull metallic box lying tilted on the
ground like discarded junk. Walking into it triggers a pickup. A second part spawns far to
the left. Drag them together and they snap, and an NPC turns up to say hello.

From there it opens out. The NPCs live in a town, they have moods and opinions and memories
of how your last game went, and they're in your phone. You challenge them to games — which
are separate applications townage launches you into and catches you coming back from.

The repo is named `the-lot`; the package and the world are called **townage**.

## Running it

```bash
pnpm install
pnpm dev            # vite dev server
```

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server with HMR |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm test` | vitest (watch) |
| `pnpm test:coverage` | vitest, single run, with coverage |
| `pnpm lint` | eslint |

`dev`, `build` and `test` first run `scripts/link-engine.mjs`, which links the dance engine
to a sibling `../square-one` checkout **when one exists** and otherwise leaves the pinned
package alone ([ADR-0034](docs/adr/0034-the-engine-relinks-itself-when-a-sibling-checkout-exists.md)).
It prints which one you got. A green suite on a linked checkout is not proof the pinned
version works — CI and a fresh clone resolve the pin.

Typecheck with `tsc -b` (which `pnpm build` does), never `tsc --noEmit`.

NPC dialogue needs `ANTHROPIC_API_KEY` set on the deployment for the `api/npc-chat.ts` edge
function. **Without it the game is fully playable** — NPCs reply with emoji instead of
sentences ([ADR-0006](docs/adr/0006-npc-dialogue-through-a-serverless-proxy.md)). Nothing
about the world, the tutorial, or the games requires it.

Player data lives entirely in your browser's `localStorage`. There is no account and no
backend to point at ([ADR-0007](docs/adr/0007-localstorage-with-a-versioned-backup-file.md)).

## Deployment

**townage deploys to Vercel as `townage.app`, from Vercel's own Git integration on push to
`main`.** That is a separate pipeline from GitHub Actions: CI passing tells you the gates
passed, not that the site went out, and the two report in different places.

The `deploy to Pages` job in `.github/workflows/ci.yml` is the template's opt-in GitHub Pages
path and is **skipped on purpose** — `vars.DEPLOY_PAGES` is unset. It shows as a slashed circle
in the run graph, which reads like a failure and is not one. Turning it on would stand up a
second, competing deployment of the same app.

`ANTHROPIC_API_KEY` and the KV binding live on the Vercel project, not in the repo.

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| E | Pocket / phone |
| Enter | Context-sensitive: pick up what's near, rush toward the arrow, talk to the closest NPC, or open the phone |
| Click the arrow | Rush toward the target — you go translucent and fly, decelerating on approach |
| Click an object | Rush all the way to it and pick it up |
| Hold on an NPC (or right-click) | The radial wheel — your emotes, and the moves you can do together ([ADR-0014](docs/adr/0014-radial-wheel-for-emotes-and-taught-moves.md)). A short tap still opens chat |
| Touch | Virtual joystick, shown on touch devices only |

## How it's built

React 19 + TypeScript + Vite. The world renders through **React Three Fiber** over three.js
([ADR-0001](docs/adr/0001-react-three-fiber-over-babylon.md)); everything outside the canvas
— the phone, speech bubbles, cutscenes, editors — is ordinary React DOM. The two layers
exchange per-frame values through shared refs rather than React state, because a `setState`
per frame would re-render the tree at display refresh rate
([ADR-0002](docs/adr/0002-shared-refs-across-the-r3f-dom-boundary.md)).

```
src/
  world/       R3F scene — Player, Npc, GameNpc, Ground, CameraRig, camera/screen-projection hooks
  overlay/     React DOM — phone apps, speech bubbles, cutscenes, body/eye/emote editors
  state/       Game state: facts in, phase derived out (ADR-0004)
  dance/       The dance subsystem — drives dancers from the square-one engine (see below)
  services/    Storage, animation, NPC records, game launch, backup
  config/      NPC definitions, game knowledge
api/           Vercel edge functions — the NPC dialogue proxy and support form
docs/          ADRs, journal, progress, plans (start at docs/PROGRESS.md)
```

Characters are built from primitive geometry — capsules, spheres, cylinders — parameterised
in `services/body-shapes.ts` rather than authored as models, which is what makes the in-game
body and eye editors possible.

Games are **separate deployments**, not modules. townage navigates the whole page to them
with a compressed payload in the URL fragment and a `returnUrl` to come home by
([ADR-0005](docs/adr/0005-games-launch-by-url-hash-handoff.md)). Currently: Spaces Game and
King's Cooking.

## The dance

townage is one repo in a family of square-dance projects planned in
`~/Development/work/square-dance-planning/`. Its job in that arc is **the world** — the place
where you meet people, learn moves from them, and eventually dance.

The engine is a separate repo, **square-one**: a pure TypeScript library that owns formations,
call definitions and choreography, and knows nothing about rendering. townage consumes it as a
pinned git dependency (`github:randallard/square-one`, the tag is in `package.json`) and
`src/dance/` is everything between the engine's answer and a character on screen:

- **The floor** (`DanceFloor.tsx`, `frame.ts`, `useDancePerformance.ts`) — places dancers
  where the engine says, in world units, scaled so real bodies of different sizes clear each
  other.
- **The arms** (`arm-pose.ts`, `arch.ts`, `forearm-hold.ts`, `wrist.ts`) — holds, grips and
  arches, solved from each character's own proportions. The engine says *which* hand; this
  says where it is.
- **Expression** (`expression-channels.ts`, `silhouette-limit.ts`) — what an emote may and
  may not move while a dancer is in a figure
  ([ADR-0010](docs/adr/0010-emote-choreography-channel-contract.md)).
- **The pose rules** (`pose-rules.ts`, `pose-solids.ts`) — a checker that reads a posed pair
  off the drawn meshes and reports every rule it breaks: clipping, an arm changing sides, a
  stretched arm, feet off the floor, a hold that has come apart.

**Where it stands.** The radial wheel is live in the world. The couple and facing-pair
figures — Dosado, Pass Thru, Allemande Left, Partner Trade, California Twirl — run in the two
instrument scenes below. **The arm postures are the open work**: the California Twirl's
turn-under does not yet look right across the cast, and as of October 2026 the approach is
that poses are authored by hand on one pairing, checked against the rules, and carried to the
others — rather than generated by rules alone. The reference for the turn-under is the
**gable** (called "the L" before 2026-10-12): both arms leaning in to a peak over the turning
dancer's crown. Dancing a whole square in the world is not built. There are three turn-under styles — `gable`, `duck-under` and `casual` — and the gable work is exploratory and not yet accepted.

### Looking at it

Routes on the dev server, none of them part of the game:

| Route | What it is |
|---|---|
| `#dance`, `#dance=two-twirls`, … | The debug scene: a figure playing on a pair, with tracking markers and readouts. |
| `#review`, `#review=california-twirl/under-arch/ryan-ember` | The pose review: one named moment of one figure on one pairing of the cast, frozen. Rate it, note it, read the rules verdict, turn the experimental dials. The address is `figure/step/beau-belle`. |
| `#review2`, `#review2=california-twirl/player-myco`, `…/only` | 🧪 The posing screen (prototype): play / step / scrub a whole figure on one pairing, the other 24 couples dance around it in a filled disk (click one to focus it; Ctrl+↑/↓ spacing), click a body part for dials that read and move the drawn pose, set keyframes for every unlocked couple or (`/only`) for one, accept & lock couples in the pairings drawer, save / load the keyframes as a file. Dials move the drawn pose (not the solver); *play: my keyframes* eases every couple through its own timeline, blending with the solver at the edges. |
| `#solve4`, `#solve4=ryan,ember,myco,sprout` | 🧪 Right and Left Thru solved for four dancers (the N-dancer solve). |
| `#voice-test` | 🧪 The voice test: say a call, and it measures how long after you stop speaking the browser's speech recognition names it (server or on-device), in ms and beats. 75 CALLERLAB Basic + Mainstream calls; results download as JSON. |

**Start at [`docs/PROGRESS.md`](docs/PROGRESS.md)** for current state and what's next — its
first block is always the place to pick up.

## Standards

**the-lot takes the provable-code standard** from
[`cr-ci-cd-rust-typescript-template`](https://github.com/randallard/cr-ci-cd-rust-typescript-template)
(its `project-conventions` skill and standards ADRs 1000–1017). It predates the template, so it's
adopting the standard **piece by piece** rather than in one pass (Ryan, 2026-10-29). Until a piece
lands, the gap is open, not an exception. What's in and what's left is in
[`docs/PROGRESS.md`](docs/PROGRESS.md)'s Standards line and the newest note in
[`docs/compliance/`](docs/compliance/).

**Tier: none claimed yet** (ADR-1002 claims only what CI enforces). Toward provable-lite:
`fast-check` properties now cover both screen reducers (`review2-session`, `voice-test-session`),
and CI's test job is green (since 2026-10-31: the 38 old failures fixed or kept as `it.fails`
findings), but the strictness bar (ADR-1011) isn't met. Claim provable-lite when it is.

## Docs

| | |
|---|---|
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Current state, what works, what's next |
| [`docs/adr/`](docs/adr/README.md) | Architecture decisions, one per file |
| [`docs/journal/`](docs/journal/README.md) | Dated narrative worklog |
| [`docs/reviews/`](docs/reviews/README.md) | Periodic re-examination of standing decisions |
| [`docs/plans/`](docs/plans/) | Feature plans, written before implementation |
