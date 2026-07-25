# ADR-0006: NPC dialogue goes through a serverless proxy, opt-in, and degrades without it
- Status: Accepted
- Date: 2026-07-25 — backfilled; decision taken 2026-03-11 (`a2f71fa`)
- Deciders: Ryan

## Context
townage's NPCs needed to say things that aren't in a script. Canned lines carry the tutorial
fine, but the arc wants NPCs who react to how a game actually went, remember a conversation,
and answer a question the author never anticipated. That means a language model in the loop.

Three constraints landed on that at once:

1. **The API key cannot be in the client.** townage is a static front-end shipped to
   browsers. Anything bundled is public.
2. **Sending a player's messages to a third party is a privacy decision, not a technical
   one.** It has to be the player's call, made knowingly.
3. **The game must stay playable when the model is unavailable** — no key configured, network
   down, upstream error, or the player simply declining. Dialogue is a texture layer over
   townage, not a dependency of it.

## Decision
Route every model call through a **stateless serverless edge function** in this repo
(`api/npc-chat.ts`), which holds the key server-side and forwards to the Anthropic Messages
API. The client never sees a key and never talks to Anthropic directly.

The feature is **opt-in per player**, gated by a modal shown before the first NPC chat
(`ChatOptInModal`), stored as `useHaiku` in `townage-chat-prefs`. Every call site checks
`getPreferences().useHaiku` before reaching for the network.

Every path **degrades** rather than failing:

| Situation | Behaviour |
|---|---|
| Player declined | NPC replies with an emoji after an 800ms "typing" delay |
| No key configured server-side | 500 from the proxy → client catch path |
| Upstream API error | 502 from the proxy → client catch path |
| Client catch path | NPC replies 👀 marked `isSeen`, with a "(?) what happened" button explaining |
| Post-game commentary fails | Falls back to the NPC's static `winReaction` / `loseReaction` |

Structured replies use **tool use with a forced `tool_choice`**, so the model returns a typed
object (`dialogue`, `continues`, `defaultReply`, `defaultAction`) rather than prose the client
would have to parse. A second tool, `escalate_to_ryan`, is offered with `tool_choice: auto` so
the model can decide to hand a player's bug report or suggestion to a support form.

## Alternatives considered
- **Calling the Anthropic API directly from the browser** — would expose the key. Not viable.
- **A long-running backend service** — more capability (rate limiting per player, real
  session storage, request logging) at the cost of infrastructure to operate. The edge
  function is the smallest thing that solves the key problem, and it fits the existing Vercel
  deployment. This is the alternative to revisit if abuse becomes real.
- **Free-text responses parsed client-side** — brittle. Forced tool use makes the response
  shape a schema rather than a parsing problem.
- **Making AI dialogue mandatory** — simpler code, one path instead of two. Rejected on both
  privacy and reliability: a player who declines should still get a complete game.

## Consequences
- The key stays server-side, and the proxy is stateless — it stores nothing. That claim is
  made to players in `ChatInfoModal`, so it is a promise the implementation has to keep. Any
  future change that adds logging or storage to `api/npc-chat.ts` breaks a stated commitment
  and needs a new ADR plus a copy change, not a quiet deploy.
- Two dialogue paths exist for every interaction, and both must be maintained. The emoji
  fallback is not a stub — it is the experience for every player who declines.
- **The model id is pinned in source** (`claude-haiku-4-5-20251001` in `api/npc-chat.ts`).
  Model ids are deprecated and retired on a published schedule; a retired one returns 404 and
  the graceful degradation above silently becomes the *only* path — the game keeps working
  and the feature quietly dies. Nothing in the repo watches for this. It is listed as a
  standing item in [`../reviews/README.md`](../reviews/README.md), which is the only
  mechanism currently catching it.
- Rate limiting is a **game mechanic rather than infrastructure**: NPCs "fall asleep"
  (`npc-sleep.ts`) after enough messages, which caps spend per player and reads in-world
  instead of as an error. Elegant, but it is a client-side cap — the proxy itself is
  unauthenticated and has no limiter, so it protects against ordinary play, not against abuse.
- Support escalation depends on the model choosing the `escalate_to_ryan` tool. A player who
  wants to report a bug while AI is disabled has no path to the support form through chat.
