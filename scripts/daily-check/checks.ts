/**
 * The daily check's decisions (ADR-0076): what each probe's response means, where the live games
 * say their agent servers are, and how the results read. No IO here. `run.ts` does the fetching.
 */

export interface Probe {
  status: number;
  body: string;
}

export interface Result {
  name: string;
  ok: boolean;
  detail: string;
}

/** A probe that never got a response (DNS, TLS, timeout) has status 0 and the error as its body. */
const describe = (p: Probe): string => (p.status === 0 ? `no response: ${p.body}` : `HTTP ${String(p.status)}`);

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}

function field(v: unknown, key: string): unknown {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>)[key] : undefined;
}

/** Railway's answer when the service or project no longer exists, which is not the same as asleep. */
const RAILWAY_GONE = "Application not found";

function failure(p: Probe): string {
  if (p.status === 404 && p.body.includes(RAILWAY_GONE)) return "HTTP 404: Railway says \"Application not found\" (the service is gone, not asleep)";
  return describe(p);
}

/** A page is up when it answers 200 with HTML. */
export function judgePage(name: string, p: Probe): Result {
  const ok = p.status === 200 && /<html/i.test(p.body);
  return { name, ok, detail: ok ? "HTTP 200" : failure(p) };
}

/** The proxy's own fallback line when Claude's reply has no usable text (`api/npc-chat.ts`). */
export const CHAT_FALLBACK = "good game!";

/** Chat works when the proxy returns a real line from the model, not its fallback. */
export function judgeChat(p: Probe): Result {
  const name = "NPC chat (Haiku, via townage.app/api/npc-chat)";
  if (p.status !== 200) return { name, ok: false, detail: failure(p) };
  const dialogue = field(parseJson(p.body), "dialogue");
  if (typeof dialogue !== "string" || dialogue.trim() === "") return { name, ok: false, detail: "HTTP 200 but no dialogue in the reply" };
  if (dialogue === CHAT_FALLBACK) return { name, ok: false, detail: `HTTP 200 but only the proxy's fallback line ("${CHAT_FALLBACK}")` };
  return { name, ok: true, detail: `replied "${dialogue.slice(0, 60)}"` };
}

/** The CPU board decks are up when their health file says ok. */
export function judgeCpuBoards(p: Probe): Result {
  const name = "Spaces Game CPU board decks";
  const ok = p.status === 200 && field(parseJson(p.body), "status") === "ok";
  return { name, ok, detail: ok ? "status ok" : p.status === 200 ? "HTTP 200 but status isn't ok" : failure(p) };
}

/** An agent server's `/health` is up when it answers 200 with `status: "ok"`. */
export function judgeAgentHealth(game: string, p: Probe): Result {
  const name = `${game} agent server /health`;
  const ok = p.status === 200 && field(parseJson(p.body), "status") === "ok";
  return { name, ok, detail: ok ? "status ok" : failure(p) };
}

/** A King's Cooking agent can play when `/select-move` returns a move. */
export function judgeKingsMove(p: Probe): Result {
  const name = "King's Cooking agent picks a move";
  if (p.status !== 200) return { name, ok: false, detail: failure(p) };
  const move = field(parseJson(p.body), "move");
  const ok = field(move, "from") !== undefined && field(move, "to") !== undefined;
  return { name, ok, detail: ok ? `moved ${JSON.stringify(field(move, "from"))} → ${JSON.stringify(field(move, "to"))}` : "HTTP 200 but no move in the reply" };
}

/** A Spaces Game agent can play when `/construct-board` returns a board. */
export function judgeSpacesBoard(p: Probe): Result {
  const name = "Spaces Game agent builds a board";
  if (p.status !== 200) return { name, ok: false, detail: failure(p) };
  // The server always sends `board`; a failed build is `board: null, valid: false`
  // (spaces-game-python, inference_server/models.py ConstructBoardResponse).
  const data = parseJson(p.body);
  const board = field(data, "board");
  const ok = typeof board === "object" && board !== null && field(data, "valid") === true;
  return { name, ok, detail: ok ? "returned a valid board" : "HTTP 200 but no valid board in the reply" };
}

/** Script URLs referenced by a built page, resolved against the page's URL. */
export function scriptUrls(html: string, pageUrl: string): string[] {
  const found = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"/gi)].map((m) => m[1]);
  return found.filter((s): s is string => s !== undefined).map((s) => new URL(s, pageUrl).toString());
}

/**
 * Where a built game bundle sends agent requests. The URL is compiled in from a `VITE_*` variable,
 * so it's found by the hosts the Python servers run on. Adding a host here is how a move is followed.
 */
const AGENT_HOSTS = /https:\/\/[a-z0-9-]+(?:\.up)?\.(?:railway\.app|onrender\.com|fly\.dev)/g;

export function agentUrlsIn(bundle: string): string[] {
  return [...new Set(bundle.match(AGENT_HOSTS) ?? [])];
}

/** King's Cooking's own API test request (`kings-cooking-python/tests/test_api.py`): a lone rook. */
export const KINGS_MOVE_REQUEST = {
  agent: "scripted_1",
  current_player: "dark",
  board: [
    [{ type: "rook", owner: "dark", id: "daily-check", move_count: 0 }, null, null],
    [null, null, null],
    [null, null, null],
  ],
  pieces_with_moves: [{ from: [0, 0], moves: [[1, 0], [2, 0]] }],
};

/** Round one of a 2x2 game with no history, as `spaces-game-node` sends it. */
export const SPACES_BOARD_REQUEST = {
  board_size: 2,
  round_num: 0,
  agent_score: 0,
  opponent_score: 0,
  opponent_history: [],
  skill_level: "beginner",
  round_scores: [],
  round_history: [],
};

export const CHAT_REQUEST = {
  systemPrompt: "You are a health check. Reply with the single word: ok",
  messages: [{ role: "user", content: "ping" }],
};

/** The issue body: a table, failures first. */
export function summarize(results: readonly Result[], when: string): string {
  const failing = results.filter((r) => !r.ok);
  const head = failing.length === 0 ? `All ${String(results.length)} checks pass.` : `**${String(failing.length)} of ${String(results.length)} checks failing.**`;
  const rows = [...failing, ...results.filter((r) => r.ok)].map((r) => `| ${r.ok ? "✅" : "❌"} | ${r.name} | ${r.detail.replaceAll("|", "\\|")} |`);
  return [`Daily check, ${when}. ${head}`, "", "| | Check | Result |", "|---|---|---|", ...rows].join("\n");
}
