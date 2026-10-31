/**
 * 🧪 `#voice-test` (2026-10-29): can a spoken call be recognised fast enough to dance it on the beat?
 *
 * Proof 3 of the north star (`work/square-dance-planning/briefs/north-star-caller-practice.md`).
 * The page asks for a call (or listens freely), and for each utterance records what the browser's
 * speech recognition wrote, the call it names (`match-call.ts`), and how long after you **stopped
 * speaking** the first result naming a call arrived, and the final one. The end of speech comes
 * from a level meter on the microphone, so it doesn't depend on the recogniser's own idea of it.
 *
 * Engine: the Web Speech API. "server" sends the audio to the browser maker's service (Google, in
 * Chrome); "on-device" asks for local recognition (`processLocally`), where the browser has it,
 * and biases it towards the call names (`phrases`). On-device Whisper is the next engine to add;
 * it needs a dependency and a model download, so it waits for Ryan's go-ahead.
 *
 * State: one pure reducer (`voice-test-session.ts`). This file owns the microphone, the
 * recogniser and the randomness, and only dispatches.
 *
 * Chain mode (2026-10-30): a chain of calls a caller could call from a static square (`chain.ts`),
 * said in one go. Each call is ticked as it's named; a pause between calls gives each its own
 * latency.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { VOICE_CALLS, type VoiceCall } from "./call-vocabulary";
import { callsFrom } from "square-one";
import { CHAIN_LENGTH, formationName, makeChain } from "./chain";
import { hearCalls } from "./sound-alike";
import { initialSession, perCallLatency, reduce, summarise, summariseChains, type Mode, type Spread, type Trial } from "./voice-test-session";

// ── The Web Speech API, as much of it as this page uses (lib.dom doesn't declare it) ──────────

interface RecognitionResultEvent {
  readonly resultIndex: number;
  readonly results: ArrayLike<{ readonly isFinal: boolean; readonly 0: { readonly transcript: string } }>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  phrases?: unknown[];
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { readonly error: string; readonly message?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface RecognitionClass {
  new (): Recognition;
  available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (o: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
}
type PhraseClass = new (phrase: string, boost: number) => unknown;

const speechWindow = window as unknown as {
  SpeechRecognition?: RecognitionClass;
  webkitSpeechRecognition?: RecognitionClass;
  SpeechRecognitionPhrase?: PhraseClass;
};
const RecognitionImpl = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
const LANG = "en-US";

// ── The level meter: end of speech, independent of the recogniser ───────────────────────────────

/** Speech is a level this many times the room's quiet, and at least {@link MIN_LEVEL}. */
const OVER_QUIET = 4;
const MIN_LEVEL = 0.012;
/** Quiet this long ends an utterance; the end is stamped at the last loud sample. */
const HANGOVER_MS = 300;
const SAMPLE_MS = 10;

type Pool = "dancing" | "basic" | "all";
const poolOf = (p: Pool): readonly VoiceCall[] =>
  p === "all" ? VOICE_CALLS : p === "basic" ? VOICE_CALLS.filter((c) => c.program === "basic") : VOICE_CALLS.filter((c) => c.dancing === true);
const pick = (calls: readonly VoiceCall[], not: string | null): string | null => {
  const from = calls.length > 1 ? calls.filter((c) => c.id !== not) : calls;
  return from[Math.floor(Math.random() * from.length)]?.id ?? null;
};
const sayOf = (id: string | null) => VOICE_CALLS.find((c) => c.id === id)?.say ?? "—";
/** A call heard by sound rather than an exact spelling is marked `~`. */
const namedSay = (n: { readonly id: string; readonly exact?: boolean }) => `${n.exact === false ? "~" : ""}${sayOf(n.id)}`;

export function VoiceTestScene() {
  const [pool, setPool] = useState<Pool>("dancing");
  const [onDevice, setOnDevice] = useState(false);
  const [s, dispatch] = useReducer(reduce, undefined, () => initialSession(pick(poolOf("dancing"), null), "web-speech server"));
  const [level, setLevel] = useState(0);
  const [localStatus, setLocalStatus] = useState<string>(() => (RecognitionImpl?.available === undefined ? "not offered by this browser" : "checking…"));
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; timer: number } | null>(null);

  const sum = useMemo(() => summarise(s), [s]);
  const chainSum = useMemo(() => summariseChains(s), [s]);

  // On-device availability, where the browser can tell us.
  useEffect(() => {
    const available = RecognitionImpl?.available;
    if (available === undefined) return;
    available({ langs: [LANG], processLocally: true }).then(setLocalStatus, (e: unknown) => {
      setLocalStatus(`error: ${String(e)}`);
    });
  }, []);

  // A new call to ask for after each prompt-mode trial.
  const asked = s.trials.length;
  const lastTarget = useRef(s.target);
  useEffect(() => {
    lastTarget.current = s.target;
  }, [s.target]);
  useEffect(() => {
    if (asked > 0 && s.mode === "prompt") dispatch({ type: "target", id: pick(poolOf(pool), lastTarget.current) });
  }, [asked, s.mode, pool]);
  // A new chain on entering chain mode and after each chain said.
  useEffect(() => {
    if (s.mode === "chain") dispatch({ type: "chain", chain: makeChain(Math.random) });
  }, [asked, s.mode]);

  const stopAll = useCallback(() => {
    wanted.current = false;
    rec.current?.abort();
    rec.current = null;
    const a = audio.current;
    if (a !== null) {
      window.clearInterval(a.timer);
      a.stream.getTracks().forEach((t) => { t.stop(); });
      void a.ctx.close();
      audio.current = null;
    }
    setLevel(0);
    dispatch({ type: "listening", on: false });
  }, []);

  useEffect(() => stopAll, [stopAll]);

  const startMeter = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    let quiet = 0.005;
    let speaking = false;
    let lastLoud = 0;
    // setInterval, not requestAnimationFrame: rAF stops when the window is hidden, and the
    // microphone shouldn't.
    const timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sq = 0;
      for (const v of buf) sq += v * v;
      const rms = Math.sqrt(sq / buf.length);
      const now = performance.now();
      const loud = rms > Math.max(MIN_LEVEL, quiet * OVER_QUIET);
      // The room's quiet: a slow average of the samples that aren't speech.
      if (!loud) quiet = quiet * 0.95 + rms * 0.05;
      if (loud) {
        lastLoud = now;
        if (!speaking) {
          speaking = true;
          dispatch({ type: "speech-start", at: now });
        }
      } else if (speaking && now - lastLoud > HANGOVER_MS) {
        speaking = false;
        dispatch({ type: "speech-end", at: lastLoud });
      }
      setLevel(rms);
    }, SAMPLE_MS);
    audio.current = { ctx, stream, timer };
  }, []);

  const startRecognition = useCallback(() => {
    if (RecognitionImpl === undefined) return;
    const r = new RecognitionImpl();
    r.lang = LANG;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    if (onDevice) {
      r.processLocally = true;
      const Phrase = speechWindow.SpeechRecognitionPhrase;
      if (Phrase !== undefined) {
        try {
          r.phrases = VOICE_CALLS.map((c) => new Phrase(c.say, 5));
        } catch {
          // Biasing is optional; recognition still runs without it.
        }
      }
    }
    r.onresult = (e) => {
      const at = performance.now();
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res === undefined) continue;
        dispatch({ type: "heard", transcript: res[0].transcript.trim(), final: res.isFinal, at });
      }
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      dispatch({ type: "notice", text: `recognition error: ${e.error}${e.message !== undefined && e.message !== "" ? ` (${e.message})` : ""}` });
      if (e.error === "not-allowed" || e.error === "network" || e.error === "service-not-allowed" || e.error === "language-not-supported") stopAll();
    };
    // Continuous recognition still ends by itself now and then; start again while wanted.
    r.onend = () => {
      if (wanted.current && rec.current === r) {
        try {
          r.start();
        } catch {
          stopAll();
        }
      }
    };
    rec.current = r;
    r.start();
  }, [onDevice, stopAll]);

  const start = useCallback(async () => {
    if (RecognitionImpl === undefined) {
      dispatch({ type: "notice", text: "This browser has no Web Speech recognition (SpeechRecognition)." });
      return;
    }
    dispatch({ type: "engine", engine: onDevice ? "web-speech on-device" : "web-speech server" });
    try {
      await startMeter();
    } catch (e) {
      dispatch({ type: "notice", text: `microphone: ${String(e)}` });
      return;
    }
    wanted.current = true;
    dispatch({ type: "listening", on: true });
    startRecognition();
  }, [onDevice, startMeter, startRecognition]);

  const install = useCallback(async () => {
    const inst = RecognitionImpl?.install;
    if (inst === undefined) return;
    setLocalStatus("installing…");
    try {
      const ok = await inst({ langs: [LANG], processLocally: true });
      setLocalStatus(ok ? "available" : "install failed");
    } catch (e) {
      setLocalStatus(`install error: ${String(e)}`);
    }
  }, []);

  const results = useMemo(
    () => JSON.stringify({ format: "voice-test", version: 3, at: new Date().toISOString(), userAgent: navigator.userAgent, bpm: s.bpm, summary: sum, chainSummary: chainSum, trials: s.trials }, null, 1),
    [s.bpm, s.trials, sum, chainSum],
  );
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([results], { type: "application/json" }));
    a.download = `voice-test-${new Date().toISOString().slice(0, 19).replace(/:/g, "")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  // Dev server only (vite.config.ts `save-voice-results`): writes to ~/Downloads on the dev machine.
  const saveToDevMachine = async () => {
    try {
      const r = await fetch("/__voice-results", { method: "POST", headers: { "content-type": "application/json" }, body: results });
      if (!r.ok) throw new Error(await r.text());
      const { path } = (await r.json()) as { path: string };
      dispatch({ type: "notice", text: `Saved to ${path}` });
    } catch (e) {
      dispatch({ type: "notice", text: `Save failed: ${String(e)}` });
    }
  };

  const liveMatch = s.mode === "chain" ? undefined : hearCalls(s.now.interim, null)[0];
  const meter = Math.min(1, level / 0.15);

  return (
    <div style={backdrop}><div style={page}>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Voice test</h1>
      <p style={muted}>
        Can a spoken call be recognised in time to dance it? Latency is from when you <b>stop speaking</b> (the level
        meter) to the first result naming a call, and to the final result. One beat at {s.bpm} bpm is{" "}
        {Math.round(sum.beatMs)} ms.
      </p>

      <section style={card}>
        <div style={row}>
          <button style={big} onClick={() => { if (s.listening) stopAll(); else void start(); }}>
            {s.listening ? "■ Stop" : "● Start listening"}
          </button>
          <label style={label}>
            <input type="checkbox" checked={onDevice} disabled={s.listening} onChange={(e) => { setOnDevice(e.target.checked); }} /> on-device
          </label>
          <span style={muted}>on-device: {localStatus}</span>
          {localStatus === "downloadable" && <button onClick={() => { void install(); }}>install</button>}
        </div>
        <div style={row}>
          <label style={label}>
            mode{" "}
            <select value={s.mode} onChange={(e) => { dispatch({ type: "mode", mode: e.target.value as Mode }); }}>
              <option value="prompt">prompt: say the call shown</option>
              <option value="chain">chain: say the {CHAIN_LENGTH} calls shown, in one go</option>
              <option value="free">free: call freely, the floor follows</option>
            </select>
          </label>
          <label style={label}>
            calls{" "}
            <select value={pool} disabled={s.mode === "chain"} onChange={(e) => { const p = e.target.value as Pool; setPool(p); dispatch({ type: "target", id: pick(poolOf(p), null) }); }}>
              <option value="dancing">the 7 square-one dances</option>
              <option value="basic">CALLERLAB Basic</option>
              <option value="all">Basic + Mainstream</option>
            </select>
          </label>
          <label style={label}>
            bpm <input type="number" value={s.bpm} min={60} max={200} style={{ width: 60 }} onChange={(e) => { dispatch({ type: "bpm", bpm: Number(e.target.value) }); }} />
          </label>
        </div>
        {s.notice !== null && <p style={{ color: "#ff8a80", margin: "8px 0 0" }}>{s.notice}</p>}
        {RecognitionImpl === undefined && <p style={{ color: "#ff8a80" }}>No SpeechRecognition in this browser.</p>}
      </section>

      <section style={{ ...card, textAlign: "center" }}>
        {s.mode === "prompt" ? (
          <>
            <div style={muted}>say</div>
            <div style={{ fontSize: 40, fontWeight: 700, margin: "4px 0" }}>{sayOf(s.target)}</div>
            <button onClick={() => { dispatch({ type: "target", id: pick(poolOf(pool), s.target) }); }}>skip</button>
          </>
        ) : s.mode === "chain" ? (
          <>
            <div style={muted}>say, in one go (pause between calls to time each one) · from {s.chain === null ? "—" : formationName(s.chain.start)}</div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 14px", margin: "8px 0" }}>
              {s.chain?.steps.map((step, k) => (
                <div key={k} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.now.named[k]?.id === step.id ? "#69f0ae" : undefined }}>{step.say}</div>
                  <div style={{ ...muted, fontSize: 12 }}>→ {formationName(step.to)}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { dispatch({ type: "chain", chain: makeChain(Math.random) }); }}>new chain</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 22 }}>call freely, with or without "heads", "everybody"…</div>
            <div style={{ ...muted, margin: "6px 0" }}>
              the floor: <b style={{ color: "#e8e8e8" }}>{s.floor === null ? "unknown (every call, matched strictly)" : s.floor.map(formationName).join(" or ")}</b>
              {s.floor !== null && ` · ${String(new Set(s.floor.flatMap((f) => callsFrom(f))).size)} calls legal`}
            </div>
            <button onClick={() => { dispatch({ type: "floor-reset" }); }}>reset to a static square</button>
          </>
        )}
        <div style={{ height: 10, background: "#333", borderRadius: 5, margin: "14px auto 6px", maxWidth: 420 }}>
          <div style={{ height: 10, width: `${String(meter * 100)}%`, background: s.now.speechStart !== null && s.now.speechEnd === null ? "#69f0ae" : "#888", borderRadius: 5 }} />
        </div>
        <div style={{ minHeight: 24, fontSize: 18 }}>
          {s.now.interim !== "" ? (
            <>“{s.now.interim}”{s.mode === "chain"
              ? s.now.named.length > 0 && <b style={{ color: "#69f0ae" }}> → {s.now.named.map(namedSay).join(" · ")}</b>
              : liveMatch !== undefined && <b style={{ color: "#69f0ae" }}> → {liveMatch.exact ? "" : "~"}{liveMatch.call.say}</b>}</>
          ) : <span style={muted}>{s.listening ? "listening…" : "not listening"}</span>}
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>Summary ({s.engine})</h2>
        <table style={table}>
          <tbody>
            <tr><td>utterances</td><td>{sum.trials}</td></tr>
            <tr><td>right call (prompt)</td><td>{sum.asked === 0 ? "—" : `${String(sum.right)} / ${String(sum.asked)} (${pct(sum.right, sum.asked)})`}</td></tr>
            <tr><td>right on the first naming result</td><td>{sum.asked === 0 ? "—" : `${String(sum.rightEarly)} / ${String(sum.asked)} (${pct(sum.rightEarly, sum.asked)})`}</td></tr>
            <tr><td>named no call</td><td>{sum.missed}</td></tr>
            <SpreadRow name="end of speech → first naming result" x={sum.toFirstMatch} beat={sum.beatMs} />
            <SpreadRow name="end of speech → final result" x={sum.toFinal} beat={sum.beatMs} />
            {sum.freeCalls > 0 && <tr><td>free: calls heard (by sound)</td><td>{`${String(sum.freeCalls)} (${String(sum.freeBySound)})`}</td></tr>}
            {sum.freeCalls > 0 && <SpreadRow name="free: end of speech → last call named" x={sum.freeLastCall} beat={sum.beatMs} />}
          </tbody>
        </table>
        {chainSum.chains > 0 && (
          <>
            <h2 style={{ ...h2, marginTop: 14 }}>Chains</h2>
            <table style={table}>
              <tbody>
                <tr><td>chains</td><td>{chainSum.chains}</td></tr>
                <tr><td>heard exactly</td><td>{`${String(chainSum.exact)} / ${String(chainSum.chains)} (${pct(chainSum.exact, chainSum.chains)})`}</td></tr>
                <tr><td>calls heard, in order</td><td>{`${String(chainSum.callsInOrder)} / ${String(chainSum.callsAsked)} (${pct(chainSum.callsInOrder, chainSum.callsAsked)})`}</td></tr>
                <SpreadRow name={`end of each call → its naming (${String(chainSum.segmented)} chains with a pause per call)`} x={chainSum.perCall} beat={sum.beatMs} />
                <SpreadRow name="end of speech → last call named" x={chainSum.lastCall} beat={sum.beatMs} />
                <SpreadRow name="end of speech → final result" x={chainSum.toFinal} beat={sum.beatMs} />
              </tbody>
            </table>
          </>
        )}
        <div style={row}>
          <button onClick={() => { void navigator.clipboard.writeText(results); }}>copy results</button>
          <button onClick={download}>download results</button>
          {import.meta.env.DEV && <button onClick={() => { void saveToDevMachine(); }}>save to dev machine</button>}
          <button onClick={() => { dispatch({ type: "clear" }); }}>clear</button>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>Utterances</h2>
        <table style={table}>
          <thead>
            <tr><th>asked</th><th>heard</th><th>named</th><th>first naming (ms; chains: per call)</th><th>final (ms)</th></tr>
          </thead>
          <tbody>
            {[...s.trials].reverse().slice(0, 30).map((t, i) => <TrialRow key={s.trials.length - i} t={t} />)}
          </tbody>
        </table>
      </section>
    </div></div>
  );
}

function TrialRow({ t }: { t: Trial }) {
  const since = (at: number | null) => (at === null || t.speechEnd === null ? "—" : String(Math.round(at - t.speechEnd)));
  if (t.chain !== null) {
    const heard = t.calls.map((c) => c.id);
    const exact = heard.join(" ") === t.chain.join(" ");
    const per = perCallLatency(t);
    return (
      <tr>
        <td>{t.chain.map(sayOf).join(" · ")}</td>
        <td>“{t.transcript}”</td>
        <td style={{ color: exact ? "#69f0ae" : "#ff8a80" }}>{t.calls.length === 0 ? "nothing" : t.calls.map(namedSay).join(" · ")}</td>
        <td>{per === null ? "—" : per.map((x) => (x === null ? "×" : String(Math.round(x)))).join(" · ")}</td>
        <td>{since(t.finalAt)}</td>
      </tr>
    );
  }
  const ok = t.target === null ? undefined : t.matched === t.target;
  return (
    <tr>
      <td>{t.target === null ? "—" : sayOf(t.target)}</td>
      <td>“{t.transcript}”</td>
      <td style={{ color: ok === undefined ? undefined : ok ? "#69f0ae" : "#ff8a80" }}>
        {t.target === null
          ? (t.calls.length === 0 ? "nothing" : t.calls.map(namedSay).join(" · "))
          : `${t.matched === null ? "nothing" : sayOf(t.matched)}${t.early !== null && t.early !== t.matched ? ` (first: ${sayOf(t.early)})` : ""}`}
      </td>
      <td>{since(t.firstMatchAt)}</td>
      <td>{since(t.finalAt)}</td>
    </tr>
  );
}

function SpreadRow({ name, x, beat }: { name: string; x: Spread; beat: number }) {
  const f = (v: number | null) => (v === null ? "—" : `${String(Math.round(v))} ms (${(v / beat).toFixed(2)} beats)`);
  return (
    <tr>
      <td>{name}</td>
      <td>{x.n === 0 ? "—" : `median ${f(x.median)} · p90 ${f(x.p90)} · worst ${f(x.worst)} · n ${String(x.n)}`}</td>
    </tr>
  );
}

const pct = (a: number, b: number) => `${String(Math.round((100 * a) / b))}%`;
const backdrop: React.CSSProperties = { minHeight: "100vh", background: "#15171c", overflowY: "auto", position: "fixed", inset: 0 };
const page: React.CSSProperties = { color: "#e8e8e8", font: "15px system-ui, sans-serif", padding: "20px 16px", boxSizing: "border-box", maxWidth: 900, margin: "0 auto" };
const card: React.CSSProperties = { background: "#1e2129", borderRadius: 8, padding: 14, margin: "12px 0" };
const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 8 };
const label: React.CSSProperties = { display: "flex", gap: 6, alignItems: "center" };
const muted: React.CSSProperties = { color: "#9aa0aa", margin: 0 };
const big: React.CSSProperties = { fontSize: 18, padding: "8px 16px" };
const h2: React.CSSProperties = { fontSize: 16, margin: "0 0 8px" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
