# ADR-0076: A daily check of the live services a player touches, with agents asked to play
- Status: Accepted
- Date: 2026-11-22
- Deciders: Ryan ("we need a daily check to verify the other aspects of the-lot … is haiku hooking
  up for chats, are the games playable with agents?", then "go ahead and build the daily check",
  2026-11-22; built by Claude)

## Context
CI checks this repo's code. It can't see the services a player depends on, because they're in other
repos and on other hosts:

- **NPC chat** goes through `api/npc-chat.ts` on Vercel to Claude Haiku
  (`claude-haiku-4-5-20251001`, pinned at `api/npc-chat.ts:91`), and needs `ANTHROPIC_API_KEY` on the
  Vercel project ([ADR-0006](0006-npc-dialogue-through-a-serverless-proxy.md)).
- **The two games** are separate apps that townage launches (`src/services/launch-game.ts`). Those
  are Spaces Game on Vercel and King's Cooking on GitHub Pages, the only games NPCs play
  (`AVAILABLE_GAMES`, `src/config/game-knowledge.ts`).
- **The computer opponents.** Spaces Game's CPU boards are static decks on GitHub Pages
  (`spaces-game-cpu-boards`). Both games' **AI agents** are Python servers (`spaces-game-python`,
  `kings-cooking-python`), and each game's URL for its server is compiled in at build time
  (`VITE_INFERENCE_API_URL`, and `VITE_KC_INFERENCE_API_URL` from the `INFERENCE_API_URL` variable).

On 2026-11-22, Ryan suspected the agents were offline. They were: both agent servers return
Railway's `404 "Application not found"`, which Railway gives when a service no longer exists, not
when it's asleep. Nothing had reported it. A game page still loads in that state, so only playing a
game against an agent would show it.

## Decision
- **A scheduled workflow, `.github/workflows/daily-check.yml`, runs daily at 14:00 UTC** and can be
  run by hand (`workflow_dispatch`). It runs `node scripts/daily-check/run.ts` on Node 26 with no
  install: just Node's `fetch`.
- **It checks what a player would touch, and asks the agents to play:**
  1. `townage.app` loads.
  2. One real chat round-trip through `/api/npc-chat`. It passes only on a real line from the model,
     not the proxy's `"good game!"` fallback.
  3. and 4. Spaces Game and King's Cooking load.
  5. The CPU board decks' `health.json` says `ok`.
  6. and 7. For each game, its agent server's `/health`, and then one real move. King's Cooking gets
     a lone rook from its own API test (`/select-move`). Spaces Game gets round one of a 2x2 game at
     `beginner` (`/construct-board`, passing only on `valid: true` with a board).
- **The agent URLs come from the live game bundles**, the same strings players' browsers call. A
  pattern in `scripts/daily-check/checks.ts` matches the hosts the Python servers run on. The
  repository variables `SPACES_AGENT_URL` and `KINGS_AGENT_URL` override that when a server moves to
  a host the pattern doesn't know. If the bundle names no agent host, or more than one, the check
  fails and says to set the override.
- **The decisions are pure, and tested.** `checks.ts` judges each response and has no IO, and
  `checks.test.ts` covers it in the normal vitest run. That includes Railway's "gone" response and
  the Spaces server's own failure shape (`board: null, valid: false`). `run.ts` is the shell.
- **Reporting:**
  - A failure fails the run. GitHub emails whoever last changed the schedule.
  - It opens one issue labelled `daily-check`, then edits that issue's body on later failing days,
    so a long outage doesn't notify every day.
  - The first passing day closes the issue with the passing table.
  - Every run writes the table to its job summary.

## Alternatives considered
- **A Claude scheduled routine.** It could say *why* something broke, not just that it did, but it
  costs more per run and lives outside the repo. The checks here are mechanical, so a workflow is
  enough. Ryan chose the workflow.
- **`/health` only.** That's cheaper, but a server can answer `/health` while its models fail to
  load, and the question was whether games are *playable* with agents. One move each is the
  smallest request that shows that.
- **Hard-coding the agent URLs here.** That's simpler, but the check would keep testing an old URL
  after a game was redeployed somewhere else, which is the failure this check exists to catch.
- **An external uptime service.** It can't make the chat or move requests without being set up by
  hand outside any repo, and it would be another account to keep alive.

## Consequences
- **One Haiku call a day** (a one-word reply, `max_tokens` 200 at most) is charged to the
  deployment's key.
- **It fails every day until the agent servers are back.** That's intended: the issue stays open
  with the current table, and the run is red. If an outage is accepted for a while, disable the
  workflow (`gh workflow disable "daily check"`) rather than weakening a check.
- GitHub disables scheduled workflows in a public repo after 60 days without activity. Renovate's
  merges keep the repo active.
- The `beginner` Spaces agent needs a trained model on the server, so a server that's up but missing
  its models fails check 7. That's deliberate.
- The move request shapes follow the servers' request models (`kings-cooking-python` `models.py`,
  `spaces-game-python` `inference_server/models.py`). The King's Cooking request was run against its
  server locally on 2026-11-22 and returned a move. The Spaces Game request was checked against the
  model by reading it only, not by running it.
- Promotion condition: if a failure happens that this check missed (for example a game that loads
  but can't start a match), add that probe here, with a test of its judgment in `checks.test.ts`.
