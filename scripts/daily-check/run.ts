/**
 * The daily check's IO (ADR-0076): fetch each live service once, judge it with `checks.ts`,
 * write the summary, and exit 1 if anything failed. Run with `node scripts/daily-check/run.ts`.
 *
 * Every URL can be overridden by an environment variable of the same name, which is how the
 * check follows a service that moves before the discovery patterns in `checks.ts` know about it.
 */
import { appendFileSync, writeFileSync } from "node:fs";
import {
  CHAT_REQUEST,
  KINGS_MOVE_REQUEST,
  SPACES_BOARD_REQUEST,
  agentUrlsIn,
  judgeAgentHealth,
  judgeChat,
  judgeCpuBoards,
  judgeKingsMove,
  judgePage,
  judgeSpacesBoard,
  scriptUrls,
  summarize,
  type Probe,
  type Result,
} from "./checks.ts";

const env = (name: string, fallback: string): string => process.env[name] ?? fallback;

const TOWNAGE_URL = env("TOWNAGE_URL", "https://townage.app/");
// The same defaults as src/services/launch-game.ts.
const SPACES_GAME_URL = env("SPACES_GAME_URL", "https://spaces-game-api.vercel.app/");
const KINGS_COOKING_URL = env("KINGS_COOKING_URL", "https://randallard.github.io/kings-cooking/");
// src/utils/remote-cpu-boards.ts in spaces-game-node.
const CPU_BOARDS_HEALTH_URL = env("CPU_BOARDS_HEALTH_URL", "https://randallard.github.io/spaces-game-cpu-boards/health.json");

// A cold Railway service can take a while to wake.
const TIMEOUT_MS = 30_000;

async function probe(url: string, init?: RequestInit): Promise<Probe> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return { status: res.status, body: await res.text() };
  } catch (e) {
    return { status: 0, body: e instanceof Error ? e.message : String(e) };
  }
}

const postJson = (url: string, body: unknown): Promise<Probe> =>
  probe(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** The agent server a live game calls: an override, or the URL compiled into its bundle. */
async function agentUrl(game: string, override: string | undefined, page: Probe, pageUrl: string): Promise<string | Result> {
  if (override) return override.replace(/\/$/, "");
  const found = new Set<string>();
  for (const src of scriptUrls(page.body, pageUrl)) {
    for (const u of agentUrlsIn((await probe(src)).body)) found.add(u);
  }
  const [first, ...rest] = [...found];
  if (first === undefined) return { name: `${game} agent server`, ok: false, detail: "no agent URL found in the live bundle; set the override variable (ADR-0076)" };
  if (rest.length > 0) return { name: `${game} agent server`, ok: false, detail: `the live bundle names ${String(found.size)} agent hosts (${[...found].join(", ")}); set the override variable` };
  return first;
}

async function agentChecks(
  game: string,
  override: string | undefined,
  page: Probe,
  pageUrl: string,
  play: (base: string) => Promise<Result>,
): Promise<Result[]> {
  if (page.status !== 200) return [{ name: `${game} agent server`, ok: false, detail: "not checked: the game page itself is down" }];
  const base = await agentUrl(game, override, page, pageUrl);
  if (typeof base !== "string") return [base];
  return [judgeAgentHealth(game, await probe(`${base}/health`)), await play(base)].map((r) => ({ ...r, detail: `${r.detail} (${base})` }));
}

async function main(): Promise<void> {
  const [townage, chat, spaces, kings, boards] = await Promise.all([
    probe(TOWNAGE_URL),
    postJson(new URL("api/npc-chat", TOWNAGE_URL).toString(), CHAT_REQUEST),
    probe(SPACES_GAME_URL),
    probe(KINGS_COOKING_URL),
    probe(CPU_BOARDS_HEALTH_URL),
  ]);

  const results: Result[] = [
    judgePage("townage.app loads", townage),
    judgeChat(chat),
    judgePage("Spaces Game loads", spaces),
    judgePage("King's Cooking loads", kings),
    judgeCpuBoards(boards),
    ...(await agentChecks("Spaces Game", process.env.SPACES_AGENT_URL, spaces, SPACES_GAME_URL, async (base) =>
      judgeSpacesBoard(await postJson(`${base}/construct-board`, SPACES_BOARD_REQUEST)),
    )),
    ...(await agentChecks("King's Cooking", process.env.KINGS_AGENT_URL, kings, KINGS_COOKING_URL, async (base) =>
      judgeKingsMove(await postJson(`${base}/select-move`, KINGS_MOVE_REQUEST)),
    )),
  ];

  const summary = summarize(results, new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC");
  console.log(summary);
  writeFileSync(env("DAILY_CHECK_SUMMARY", "daily-check-summary.md"), summary + "\n");
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) appendFileSync(stepSummary, summary + "\n");
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

await main();
