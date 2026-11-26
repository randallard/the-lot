# 2026-11-22 (1): a daily check of the live services, and the agents are gone

Ryan: *"we need a daily check to verify the other aspects of the-lot - like is haiku hooking up for
chats, are the games playable with agents? I'm afraid my agents are offline for spaces-game,
kings-cooking or both"*. A compliance review came first ([note](../compliance/2026-11-22.md):
compliant, 1 small gap that Renovate is already fixing).

## What was found
- **Chat works.** One request through `townage.app/api/npc-chat` got Haiku's "ok" back (HTTP 200, about
  2s). The model is pinned at `claude-haiku-4-5-20251001` (`api/npc-chat.ts:91`).
- **Both agent servers are gone.** The live bundles call
  `spaces-game-python-production.up.railway.app` (Spaces Game, `AI_AGENT: "true"`) and
  `kings-cooking-inference-production.up.railway.app` (King's Cooking). Both return Railway's
  `404 "Application not found"`, which means the service no longer exists, not that it's asleep. So
  do the two other Railway hosts that appear in old docs (`kings-cooking-python`,
  `spaces-game-bot-production`).
- The games themselves, and Spaces Game's CPU board decks on GitHub Pages, are up.
- Yes, Spaces Game and King's Cooking are the only games NPCs play (`AVAILABLE_GAMES`).

## What was built (branch `daily-check`, uncommitted, for Ryan's check)
[ADR-0076](../adr/0076-a-daily-check-of-the-live-services.md), `.github/workflows/daily-check.yml`
(daily 14:00 UTC plus manual runs), `scripts/daily-check/checks.ts` (the pure judgments),
`run.ts` (the fetches) and `checks.test.ts` (17 tests). There's also a README paragraph.

Verified:
- A live run gives 9 checks, 4 failing: the two agent servers' `/health` and move requests.
- The King's Cooking move request was run against `kings-cooking-python`'s server on port 8197
  (`KINGS_AGENT_URL` override): `/health` ok, and it moved `[0,0] → [1,0]`.
- The Spaces Game request was read against `spaces-game-python`'s `ConstructBoardRequest`, but not
  run, because the server needs torch and the trained models (the clone is 1.1 GB).
- Reading that server also showed that it always returns `board`, set to null with `valid: false`
  when it fails, so the check requires `valid: true`. My first version would have passed a failure.
- `pnpm lint` exits 0, and the new tests pass.

The issue and email parts can only be tested on GitHub. The first scheduled run after merge
will open the `daily-check` issue, because the agents are down.

## Also today: the major updates (groups 1 and 2), and group 3 set up
Merged in order, each brought up to date first: #24 setup-node v7, **#29 vitest 5**, #25 jest-dom 8,
and #27 globals 17. #16 (setup-node v6.5.0) was closed as superseded.
- **vitest 5 needed a one-line fix** (`f3bc789` on #29): `src/test/setup.ts` imports
  `@testing-library/jest-dom/vitest`, not the bare package. Under vitest 5 the bare import no longer
  extends vitest's `Assertion` type, and lint failed 13 times with "Unsafe call of a type that could
  not be resolved". jest-dom 8's only breaking change is dropping vitest older than 5, so it went in
  after #29.
- **Vercel is rate-limited until about 2026-11-23 21:00 UTC** ("Deployment rate limited — retry in
  24 hours"). Every Renovate PR and rebase builds a preview. #27 was merged on CI alone, since Vercel
  isn't a required check. `main`'s last deploy succeeded. **Watch this:** with automerge (ADR-1023),
  a day of many Renovate merges can use up the quota again. If it keeps happening, turn off
  previews for Renovate branches in Vercel's settings ("Ignored Build Step").
- **Group 3** is PR #32 (`vite-8-plugin-react-6`). It combines #28 and #26, because plugin-react 6
  requires vite ^8. Lint, 63 test files and the build pass, and the build drops from ~6.7s to ~1.2s.
  It waits on Ryan's playtest (the checklist is in the PR). Close #28 and #26 after it merges.

## Next
1. Ryan checks it and merges. Then run it once by hand
   (`gh workflow run "daily check" -R randallard/the-lot`) and confirm the issue opens with the table.
2. **Ryan: the Railway account** (dashboard: do the two projects exist? Billing: card or plan). Then
   either redeploy both servers from their repos, or pick a new host. Either way, update
   King's Cooking's `INFERENCE_API_URL` variable and Spaces Game's `VITE_INFERENCE_API_URL` on Vercel.
   The check follows the live bundles, so it needs no change unless the new host isn't one it knows
   (Railway, Render, Fly). In that case, set `SPACES_AGENT_URL` / `KINGS_AGENT_URL` as variables here.
3. The vite 8 + plugin-react 6 playtest PR (in progress).
