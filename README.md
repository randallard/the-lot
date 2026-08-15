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

## Where this is going

townage is one repo in a family of square-dance projects planned in
`~/Development/work/square-dance-planning/`. Its job in that arc is **the world** — the place
where you meet people, learn moves from them, and eventually dance.

The engine for that is a separate repo, **square-one**: a pure TypeScript library that owns
formations, call definitions, and choreography. It knows nothing about rendering. townage
will consume it as a pinned git dependency and drive dancers in the world from it.

That work has not started. townage today has **no dance subsystem at all** — NPCs stand at
hardcoded world positions, and its animation system is pose-only (arms, head, lean) with
nothing driving locomotion from a scripted path. Building that driver is the next milestone.

**Start at [`docs/PROGRESS.md`](docs/PROGRESS.md)** for current state and what's next.

## Docs

| | |
|---|---|
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Current state, what works, what's next |
| [`docs/adr/`](docs/adr/README.md) | Architecture decisions, one per file |
| [`docs/journal/`](docs/journal/README.md) | Dated narrative worklog |
| [`docs/reviews/`](docs/reviews/README.md) | Periodic re-examination of standing decisions |
| [`docs/plans/`](docs/plans/) | Feature plans, written before implementation |
