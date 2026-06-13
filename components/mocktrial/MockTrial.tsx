"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Gavel,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Shield,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { FirmMark } from "@/components/FirmLogo";
import {
  CASES,
  MAX_ROUNDS,
  TRIAL_CATEGORIES,
  TRIAL_ROLES,
  caseById,
  opposingKey,
  type TrialCase,
  type TrialRoleId,
} from "@/lib/mockTrial";

type Screen = "lobby" | "custom" | "side" | "trial" | "verdict";

interface TMsg {
  by: TrialRoleId;
  label: string;
  text: string;
  ts: string;
  isVerdict?: boolean;
}

interface Verdict {
  text: string;
  youScore: number;
  aiScore: number;
  winner: "you" | "ai";
}

const clock = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function MockTrial({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<TrialCase | null>(null);
  const [yourKey, setYourKey] = useState<string>("");
  const [messages, setMessages] = useState<TMsg[]>([]);
  const [input, setInput] = useState("");
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState({ you: 0, ai: 0 });
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  /** live streaming buffer + who is currently speaking */
  const [live, setLive] = useState("");
  const [liveBy, setLiveBy] = useState<TrialRoleId | null>(null);
  const [gavel, setGavel] = useState(false);
  const [voice, setVoice] = useState(false);
  const voiceRef = useRef(false);
  const [isCustom, setIsCustom] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "Civil",
    yourLabel: "Plaintiff",
    oppLabel: "Defense",
    summary: "",
    yourArg: "",
    oppArg: "",
    facts: "",
    judge: "",
    jurisdiction: "",
  });
  const setF = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));
  const caseLawRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, live]);

  const bang = () => {
    setGavel(true);
    setTimeout(() => setGavel(false), 480);
  };

  useEffect(() => {
    voiceRef.current = voice;
    if (!voice && typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, [voice]);

  // stop any speech when the simulator unmounts
  useEffect(
    () => () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    },
    [],
  );

  /** Read a line aloud in a role-appropriate voice (browser on-device TTS). */
  const say = (text: string, role: TrialRoleId) => {
    if (!voiceRef.current || typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>[\]()]/g, ""));
    if (role === "judge") {
      u.pitch = 0.8;
      u.rate = 0.92; // measured, authoritative bench
    } else {
      u.pitch = 1.0;
      u.rate = 1.06; // sharper opposing counsel
    }
    synth.speak(u);
  };

  const filtered = useMemo(
    () =>
      CASES.filter((c) => {
        const q = search.trim().toLowerCase();
        const matchQ =
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.year.includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.blurb.toLowerCase().includes(q);
        const matchF = filter === "All" || c.category === filter;
        return matchQ && matchF;
      }),
    [search, filter],
  );

  /** Stream one trial turn; pipe deltas into the live buffer; return full text. */
  async function streamTurn(
    body: Record<string, unknown>,
    by: TrialRoleId,
  ): Promise<string> {
    setLive("");
    setLiveBy(by);
    let acc = "";
    try {
      const res = await fetch("/api/mock-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, caseLaw: caseLawRef.current }),
      });
      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        return `*${(e as { error?: string }).error ?? "Request failed."}*`;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const raw of lines) {
          if (!raw.trim()) continue;
          try {
            const ev = JSON.parse(raw) as { t: string; text?: string };
            if (ev.t === "delta" && ev.text) {
              acc += ev.text;
              setLive(acc);
            } else if (ev.t === "caselaw") {
              caseLawRef.current = ev.text ?? "";
            } else if (ev.t === "error" && ev.text) {
              acc += `\n\n*${ev.text}*`;
              setLive(acc);
            }
          } catch {
            /* partial line */
          }
        }
      }
    } catch (err) {
      acc += `\n\n*Connection error: ${err instanceof Error ? err.message : String(err)}*`;
    } finally {
      setLive("");
      setLiveBy(null);
    }
    return acc.trim() || "*No response.*";
  }

  function openCase(c: TrialCase) {
    setSelected(c);
    setScreen("side");
  }

  /** Build a runnable case from the attorney's own intake. */
  function buildCustomCase(): TrialCase {
    const split = (s: string) =>
      s
        .split(/\n|;|•|·/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 6);
    const yourWeapons = split(`${form.facts}\n${form.yourArg}`);
    return {
      id: `custom-${Date.now()}`,
      title: form.title.trim() || "Untitled Matter",
      year: String(new Date().getFullYear()),
      category: form.type,
      glyph: "✶",
      heat: 3,
      blurb: form.summary.trim() || "A custom matter for live argument.",
      sides: {
        you: {
          key: "you",
          label: form.yourLabel.trim() || "Your side",
          counsel: form.yourLabel.trim() || "Your side",
          goal: form.yourArg.trim() || "Prevail on the merits.",
          weapons: yourWeapons,
          risk: "Defend your weak points as opposing counsel presses them.",
        },
        opp: {
          key: "opp",
          label: form.oppLabel.trim() || "Opposing side",
          counsel: "Opposing Counsel",
          goal: form.oppArg.trim() || "Defeat the claim and discredit the theory.",
          weapons: split(form.oppArg),
          risk: "",
        },
      },
      judge: form.judge.trim() || "The Presiding Judge",
      stakes: form.summary.trim() || "—",
      historicalVerdict:
        "Your own matter — there is no historical record; the verdict above is the simulation's read.",
      principle: `${form.type} matter${form.jurisdiction.trim() ? ` · ${form.jurisdiction.trim()}` : ""}`,
      searchTerms: `${form.type} ${form.jurisdiction} ${form.summary}`
        .replace(/\s+/g, " ")
        .slice(0, 160),
    };
  }

  /** Shared trial start for both catalog and custom cases. */
  async function beginTrial(c: TrialCase, key: string, custom: boolean) {
    setSelected(c);
    setYourKey(key);
    setIsCustom(custom);
    setScreen("trial");
    setMessages([]);
    setRound(0);
    setScores({ you: 0, ai: 0 });
    setVerdict(null);
    caseLawRef.current = "";
    setBusy(true);
    bang();
    const opening = await streamTurn(
      {
        turn: "open",
        yourSideKey: key,
        ...(custom ? { custom: c } : { caseId: c.id }),
      },
      "judge",
    );
    setMessages([{ by: "judge", label: c.judge, text: opening, ts: clock() }]);
    say(opening, "judge");
    setBusy(false);
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  function pickSide(key: string) {
    if (selected) void beginTrial(selected, key, false);
  }

  async function submitArgument() {
    if (!input.trim() || busy || !selected) return;
    const arg = input.trim();
    setInput("");
    setBusy(true);

    const you = selected.sides[yourKey];
    const aiKey = opposingKey(selected, yourKey);
    const ai = selected.sides[aiKey];
    const cp = isCustom
      ? { custom: selected }
      : { caseId: selected.id };

    const afterYou: TMsg[] = [
      ...messages,
      { by: "you", label: `You — ${you.label}`, text: arg, ts: clock() },
    ];
    setMessages(afterYou);

    // map the lawyer-only transcript to model turns
    const history = afterYou
      .filter((m) => m.by === "you" || m.by === "counsel")
      .map((m) => ({
        role: m.by === "you" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

    const aiReply = await streamTurn(
      {
        turn: "counsel",
        ...cp,
        yourSideKey: yourKey,
        history,
        userArgument: arg,
      },
      "counsel",
    );
    const afterAi: TMsg[] = [
      ...afterYou,
      {
        by: "counsel",
        label: `${ai.counsel} — ${ai.label}`,
        text: aiReply,
        ts: clock(),
      },
    ];
    setMessages(afterAi);
    bang();
    say(aiReply, "counsel");

    const nextRound = round + 1;
    if (nextRound >= MAX_ROUNDS) {
      const vText = await streamTurn(
        {
          turn: "verdict",
          ...cp,
          yourSideKey: yourKey,
          history: [...history, { role: "assistant", content: aiReply }],
        },
        "judge",
      );
      const youScore = 16 + Math.floor(Math.random() * 14);
      const aiScore = 14 + Math.floor(Math.random() * 14);
      bang();
      setVerdict({
        text: vText,
        youScore,
        aiScore,
        winner: youScore >= aiScore ? "you" : "ai",
      });
      setMessages([
        ...afterAi,
        {
          by: "judge",
          label: `${selected.judge} — Verdict`,
          text: vText,
          ts: clock(),
          isVerdict: true,
        },
      ]);
      say(vText, "judge");
      setRound(nextRound);
      setScreen("verdict");
      setBusy(false);
      return;
    }

    const ruling = await streamTurn(
      {
        turn: "ruling",
        ...cp,
        yourSideKey: yourKey,
        userArgument: arg,
        lastAiReply: aiReply,
      },
      "judge",
    );
    setScores((s) => ({
      you: s.you + 3 + Math.floor(Math.random() * 5),
      ai: s.ai + 2 + Math.floor(Math.random() * 5),
    }));
    setMessages([
      ...afterAi,
      { by: "judge", label: selected.judge, text: ruling, ts: clock() },
    ]);
    say(ruling, "judge");
    setRound(nextRound);
    setBusy(false);
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  function reset() {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setScreen("lobby");
    setSelected(null);
    setYourKey("");
    setMessages([]);
    setVerdict(null);
    setRound(0);
    setScores({ you: 0, ai: 0 });
  }

  // ── shared chrome ─────────────────────────────────────────────
  const TopBar = ({
    children,
    back,
  }: {
    children: React.ReactNode;
    back?: () => void;
  }) => (
    <div className="flex items-center gap-3 border-b border-line bg-panel/70 px-4 py-3 backdrop-blur sm:px-6">
      {back ? (
        <button
          onClick={back}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel-deep hover:text-ink"
          title="Back"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
      ) : (
        <FirmMark className="h-7 w-7 shrink-0 text-accent" />
      )}
      <div className="min-w-0 flex-1">{children}</div>
      <button
        onClick={onExit}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-muted transition-colors hover:bg-panel-deep hover:text-ink"
        title="Leave the simulator"
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">Exit</span>
      </button>
    </div>
  );

  // ════════════════════════ LOBBY ════════════════════════════════
  if (screen === "lobby") {
    return (
      <div className="flex h-full flex-col">
        <TopBar>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-accent uppercase">
            <Scale className="h-3.5 w-3.5" /> Mock Trial
          </p>
          <p className="truncate text-[13px] text-muted">
            Pick a landmark case. Choose your side. Argue it live against AI
            counsel before the bench.
          </p>
        </TopBar>

        <div className="border-b border-line px-4 py-3 sm:px-6">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cases, parties, year, area…"
              className="w-full rounded-xl border border-line bg-input py-2.5 pr-3 pl-9 text-[14px] text-ink outline-none placeholder:text-faint focus:border-accent"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TRIAL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-full border px-3 py-1 text-[11.5px] tracking-wide transition-colors ${
                  filter === cat
                    ? "border-accent bg-accent text-paper"
                    : "border-line text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grain flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              onClick={() => setScreen("custom")}
              className="trial-rise card-hover group flex min-h-[188px] flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-panel/40 p-5 text-center"
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-wash text-accent">
                <Plus className="h-6 w-6" />
              </span>
              <span className="font-serif text-[17px] text-ink">
                Build your own case
              </span>
              <span className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                Enter a real or hypothetical matter and argue it live — grounded
                in real case law.
              </span>
            </button>
            {filtered.map((c, i) => (
              <button
                key={c.id}
                onClick={() => openCase(c)}
                style={{ animationDelay: `${i * 45}ms` }}
                className="trial-rise card-hover group flex flex-col items-start rounded-2xl border border-line-strong bg-panel p-5 text-left"
              >
                <div className="mb-3 flex w-full items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-wash font-serif text-2xl text-accent">
                    {c.glyph}
                  </span>
                  <div className="text-right">
                    <span className="block font-mono text-[10px] tracking-[0.18em] text-accent uppercase">
                      {c.category}
                    </span>
                    <span className="block text-[11px] text-faint">{c.year}</span>
                  </div>
                </div>
                <h3 className="font-serif text-[18px] leading-tight text-ink">
                  {c.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-muted">
                  {c.blurb}
                </p>
                <div className="mt-4 flex w-full items-center gap-1">
                  {Array.from({ length: 5 }).map((_, h) => (
                    <span
                      key={h}
                      className={`h-1 flex-1 rounded-full ${
                        h < c.heat ? "bg-accent" : "bg-line-strong"
                      }`}
                    />
                  ))}
                  <span className="ml-2 font-mono text-[9px] tracking-[0.15em] text-faint">
                    HEAT
                  </span>
                </div>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <p className="mt-16 text-center text-[13px] text-faint italic">
              No cases match “{search}”.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════ CUSTOM CASE INTAKE ══════════════════
  if (screen === "custom") {
    const TYPES = [
      "Civil",
      "Criminal",
      "Family",
      "Employment",
      "Commercial",
      "IP / Tech",
      "Other",
    ];
    const ready = form.title.trim() && form.summary.trim();
    const labelCls =
      "mb-1 block font-mono text-[10px] tracking-[0.14em] text-accent uppercase";
    const fieldCls =
      "w-full rounded-xl border border-line bg-input px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-faint focus:border-accent";
    return (
      <div className="flex h-full flex-col">
        <TopBar back={() => setScreen("lobby")}>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-accent uppercase">
            <Plus className="h-3.5 w-3.5" /> Build your own case
          </p>
          <p className="truncate text-[12.5px] text-muted">
            Your matter, argued live and grounded in real case law.
          </p>
        </TopBar>

        <div className="grain flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-2xl space-y-5">
            <div>
              <label className={labelCls}>Case name</label>
              <input
                value={form.title}
                onChange={(e) => setF("title", e.target.value)}
                placeholder="e.g. Rodriguez v. Hartwell Properties LLC"
                className={fieldCls}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Case type</label>
                <select
                  value={form.type}
                  onChange={(e) => setF("type", e.target.value)}
                  className={fieldCls}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Jurisdiction (optional)</label>
                <input
                  value={form.jurisdiction}
                  onChange={(e) => setF("jurisdiction", e.target.value)}
                  placeholder="e.g. S.D. Florida"
                  className={fieldCls}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>The side you argue</label>
                <input
                  value={form.yourLabel}
                  onChange={(e) => setF("yourLabel", e.target.value)}
                  placeholder="Plaintiff"
                  className={fieldCls}
                />
              </div>
              <div>
                <label className={labelCls}>Opposing side</label>
                <input
                  value={form.oppLabel}
                  onChange={(e) => setF("oppLabel", e.target.value)}
                  placeholder="Defense"
                  className={fieldCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Brief case summary</label>
              <textarea
                value={form.summary}
                onChange={(e) => setF("summary", e.target.value)}
                rows={3}
                placeholder="Two to five sentences describing the dispute and what's at stake."
                className={`${fieldCls} resize-none`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Your strongest argument</label>
                <textarea
                  value={form.yourArg}
                  onChange={(e) => setF("yourArg", e.target.value)}
                  rows={3}
                  placeholder="Your theory, in your own words."
                  className={`${fieldCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Opposing's strongest argument</label>
                <textarea
                  value={form.oppArg}
                  onChange={(e) => setF("oppArg", e.target.value)}
                  rows={3}
                  placeholder="What the other side will hit you with — the AI argues this."
                  className={`${fieldCls} resize-none`}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Key facts &amp; evidence (one per line — become your weapons)
              </label>
              <textarea
                value={form.facts}
                onChange={(e) => setF("facts", e.target.value)}
                rows={4}
                placeholder={"Signed lease dated 3/14\nWitness saw the notice posted\nNo cure period in the contract"}
                className={`${fieldCls} resize-none`}
              />
            </div>

            <div>
              <label className={labelCls}>Judge name (optional)</label>
              <input
                value={form.judge}
                onChange={(e) => setF("judge", e.target.value)}
                placeholder="The Presiding Judge"
                className={fieldCls}
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-1 pb-4">
              <button
                onClick={() => setScreen("lobby")}
                className="rounded-xl px-4 py-2.5 text-[13px] text-muted transition-colors hover:bg-panel-deep hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => void beginTrial(buildCustomCase(), "you", true)}
                disabled={!ready}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-paper transition-colors hover:bg-accent-soft disabled:bg-panel-deep disabled:text-faint"
              >
                <Gavel className="h-4 w-4" /> Run the trial
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════ SIDE SELECT ══════════════════════════
  if (screen === "side" && selected) {
    const keys = Object.keys(selected.sides);
    return (
      <div className="flex h-full flex-col">
        <TopBar back={() => setScreen("lobby")}>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-accent uppercase">
            <span>{selected.glyph}</span> {selected.title} · {selected.year}
          </p>
          <p className="truncate text-[12.5px] text-muted">
            {selected.category} · {selected.stakes}
          </p>
        </TopBar>

        <div className="grain flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <p className="text-center font-mono text-[11px] tracking-[0.25em] text-accent uppercase">
              Choose your side
            </p>
            <p className="mx-auto mt-2 mb-7 max-w-xl text-center text-[13.5px] leading-relaxed text-muted italic">
              {selected.blurb}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {keys.map((key) => {
                const s = selected.sides[key];
                return (
                  <button
                    key={key}
                    onClick={() => pickSide(key)}
                    className="trial-rise card-hover group flex flex-col rounded-2xl border border-line-strong bg-panel p-5 text-left"
                  >
                    <span className="font-mono text-[10px] tracking-[0.18em] text-accent uppercase">
                      {s.label}
                    </span>
                    <span className="mt-1 font-serif text-[20px] text-ink italic">
                      {s.counsel}
                    </span>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                      {s.goal}
                    </p>
                    <div className="mt-4">
                      <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-accent uppercase">
                        <Swords className="h-3 w-3" /> Your weapons
                      </p>
                      <ul className="space-y-1">
                        {s.weapons.map((w) => (
                          <li
                            key={w}
                            className="flex gap-1.5 text-[12.5px] text-ok"
                          >
                            <span>✓</span>
                            <span className="text-ink-soft">{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="mb-1 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-[#b06a4a] uppercase">
                        <Shield className="h-3 w-3" /> Your exposure
                      </p>
                      <p className="text-[12.5px] text-muted italic">{s.risk}</p>
                    </div>
                    <span className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-[13px] font-semibold tracking-wide text-paper opacity-0 transition-opacity group-hover:opacity-100">
                      Take this side <ArrowUp className="h-4 w-4 rotate-90" />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-6 text-center font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
              Historical outcome revealed after your verdict
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════ TRIAL ════════════════════════════════
  if (screen === "trial" && selected) {
    const aiKey = opposingKey(selected, yourKey);
    const you = selected.sides[yourKey];
    const ai = selected.sides[aiKey];
    const progress = Math.min((round / MAX_ROUNDS) * 100, 100);
    const speaking = liveBy ?? messages[messages.length - 1]?.by ?? null;

    return (
      <div className="flex h-full flex-col">
        <TopBar back={reset}>
          <p className="flex items-center gap-2 font-serif text-[15px] text-ink">
            <span>{selected.glyph}</span>
            <span className="truncate">{selected.title}</span>
          </p>
          <p className="truncate font-mono text-[11px] tracking-wide text-muted">
            {selected.judge} presiding · Round {Math.min(round + (busy ? 1 : 0), MAX_ROUNDS)}/{MAX_ROUNDS}
          </p>
        </TopBar>

        {/* progress */}
        <div className="h-1 bg-panel-deep">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* courtroom stage */}
        <div className="trial-stage relative flex h-28 items-end justify-center gap-10 overflow-hidden border-b border-line px-6 sm:gap-20">
          <Figure role="you" label="You" color={TRIAL_ROLES.you.color} active={speaking === "you"} />
          <div className="relative flex flex-col items-center">
            <Gavel
              className={`mb-1 h-5 w-5 text-accent ${gavel ? "trial-gavel" : ""}`}
            />
            <Figure
              role="judge"
              label="Bench"
              color={TRIAL_ROLES.judge.color}
              active={speaking === "judge"}
              tall
            />
          </div>
          <Figure
            role="counsel"
            label={ai.counsel.split(" ").pop() ?? "Counsel"}
            color={TRIAL_ROLES.counsel.color}
            active={speaking === "counsel"}
          />
        </div>

        {/* scoreboard */}
        <div className="relative flex items-center justify-center gap-6 border-b border-line bg-panel/40 py-2">
          <Score n={scores.you} label="You" color={TRIAL_ROLES.you.color} />
          <span className="font-mono text-[11px] text-faint">vs</span>
          <Score n={scores.ai} label={ai.counsel.split(" ").pop() ?? "AI"} color={TRIAL_ROLES.counsel.color} />
          <button
            onClick={() => setVoice((v) => !v)}
            title={voice ? "Mute the courtroom" : "Hear the courtroom aloud"}
            className={`absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              voice ? "text-accent" : "text-muted hover:bg-panel-deep hover:text-ink"
            }`}
          >
            {voice ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5" />}
          </button>
        </div>

        {/* transcript */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
          {messages.map((m, i) => (
            <Bubble key={i} m={m} />
          ))}
          {live && liveBy && (
            <Bubble
              m={{
                by: liveBy,
                label:
                  liveBy === "counsel"
                    ? `${ai.counsel} — ${ai.label}`
                    : selected.judge,
                text: live,
                ts: clock(),
              }}
              streaming
            />
          )}
          {busy && !live && (
            <p className="text-center font-mono text-[11px] tracking-wide text-faint italic">
              <span className="caret">the court is considering</span>
            </p>
          )}
        </div>

        {/* weapons + input */}
        <div className="border-t border-line bg-panel/50 px-4 pt-2.5 pb-3 sm:px-6">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] tracking-[0.14em] text-faint uppercase">
              {you.counsel}'s arsenal
            </span>
            {you.weapons.map((w) => (
              <button
                key={w}
                onClick={() => setInput((p) => (p ? `${p} ${w}` : w))}
                disabled={busy}
                className="rounded-full border border-line bg-panel px-2.5 py-0.5 text-[11px] text-ok transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
                title="Add to your argument"
              >
                {w}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitArgument();
                }
              }}
              disabled={busy}
              rows={2}
              placeholder={`Argue as ${you.counsel}. Tap a weapon above, or make your own case. Enter to deliver.`}
              className="max-h-32 min-h-[52px] flex-1 resize-none rounded-xl border border-line-strong bg-input px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent disabled:opacity-50"
            />
            <button
              onClick={() => void submitArgument()}
              disabled={busy || !input.trim()}
              className="flex h-[52px] items-center gap-1.5 rounded-xl bg-accent px-4 text-[13px] font-semibold tracking-wide text-paper transition-colors hover:bg-accent-soft disabled:bg-panel-deep disabled:text-faint"
            >
              Argue <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════ VERDICT ══════════════════════════════
  if (screen === "verdict" && verdict && selected) {
    const aiKey = opposingKey(selected, yourKey);
    const you = selected.sides[yourKey];
    const ai = selected.sides[aiKey];
    const youWon = verdict.winner === "you";
    return (
      <div className="relative flex h-full flex-col">
        {/* confetti */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="trial-confetti absolute top-0 block h-2 w-1.5 rounded-[1px]"
              style={{
                left: `${(i * 37) % 100}%`,
                background: i % 2 ? "var(--color-accent)" : TRIAL_ROLES.you.color,
                animationDelay: `${(i % 7) * 160}ms`,
                animationDuration: `${2.4 + (i % 5) * 0.4}s`,
              }}
            />
          ))}
        </div>

        <TopBar>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-accent uppercase">
            <Gavel className="h-3.5 w-3.5" /> Verdict · {selected.title}
          </p>
        </TopBar>

        <div className="grain relative flex-1 overflow-y-auto px-4 py-7 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="trial-rise mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent-wash">
              <Scale className="h-8 w-8 text-accent" />
            </div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-accent uppercase">
              The court has spoken
            </p>
            <h2 className="mt-2 font-serif text-3xl text-ink italic">
              {youWon ? "You outargued history" : "The AI prevailed"}
            </h2>

            <div className="mt-6 flex items-center justify-center gap-4">
              <ScoreCard
                n={verdict.youScore}
                name={you.counsel}
                side="You"
                color={TRIAL_ROLES.you.color}
                win={youWon}
              />
              <span className="font-mono text-[12px] text-faint">vs</span>
              <ScoreCard
                n={verdict.aiScore}
                name={ai.counsel}
                side={ai.label}
                color={TRIAL_ROLES.counsel.color}
                win={!youWon}
              />
            </div>

            <div className="mt-6 rounded-2xl border border-line-strong bg-panel p-5 text-left">
              <p className="mb-2 font-mono text-[10px] tracking-[0.14em] text-accent uppercase">
                The bench
              </p>
              <p className="text-[14px] leading-relaxed text-ink-soft italic">
                {verdict.text}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-line bg-panel-deep/50 p-4 text-left">
              <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
                Historical outcome
              </p>
              <p className="mt-1 text-[13px] text-ink-soft">
                {selected.historicalVerdict}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <button
                onClick={reset}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-paper transition-colors hover:bg-accent-soft"
              >
                <Sparkles className="h-4 w-4" /> Another case
              </button>
              <button
                onClick={() => {
                  setVerdict(null);
                  if (isCustom) {
                    void beginTrial(selected, opposingKey(selected, yourKey), true);
                  } else {
                    setScreen("side");
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-line-strong px-5 py-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-panel-deep"
              >
                <RotateCcw className="h-4 w-4" /> Switch sides
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ── stage figure ──────────────────────────────────────────────── */
function Figure({
  label,
  color,
  active,
  tall,
}: {
  role: TrialRoleId;
  label: string;
  color: string;
  active?: boolean;
  tall?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`mb-1 h-1.5 w-1.5 rounded-full transition-opacity ${active ? "trial-pulse" : "opacity-0"}`}
        style={{ background: color }}
      />
      <span
        className="block rounded-full"
        style={{ width: 14, height: 14, background: color, opacity: active ? 1 : 0.55 }}
      />
      <span
        className="mt-0.5 rounded-t-md"
        style={{
          width: 22,
          height: tall ? 30 : 24,
          background: color,
          opacity: active ? 0.9 : 0.4,
        }}
      />
      <span className="mt-1 font-mono text-[8.5px] tracking-wide" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

function Score({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-[18px] font-bold leading-none" style={{ color }}>
        {n}
      </div>
      <div className="mt-0.5 font-mono text-[8px] tracking-[0.12em] text-faint uppercase">
        {label}
      </div>
    </div>
  );
}

function ScoreCard({
  n,
  name,
  side,
  color,
  win,
}: {
  n: number;
  name: string;
  side: string;
  color: string;
  win: boolean;
}) {
  return (
    <div
      className={`min-w-[120px] rounded-2xl bg-panel px-5 py-4 ${win ? "border-2 border-accent" : "border border-line-strong"}`}
    >
      <div className="font-serif text-4xl font-bold" style={{ color: win ? undefined : color }}>
        <span className={win ? "text-accent" : ""}>{n}</span>
      </div>
      <div className="mt-1 text-[12px] text-ink-soft italic">{name}</div>
      <div className="font-mono text-[9px] tracking-[0.1em] text-faint uppercase">
        {side}
      </div>
      {win && (
        <div className="mt-1 font-mono text-[9px] tracking-[0.18em] text-accent uppercase">
          Winner
        </div>
      )}
    </div>
  );
}

/* ── transcript bubble ─────────────────────────────────────────── */
function Bubble({ m, streaming }: { m: TMsg; streaming?: boolean }) {
  const role = TRIAL_ROLES[m.by];
  const align =
    m.by === "you" ? "items-end" : m.by === "counsel" ? "items-start" : "items-center";
  const isJudge = m.by === "judge";
  return (
    <div className={`trial-msg flex flex-col ${align}`}>
      <div
        className="mb-1 flex items-center gap-1.5 px-1 font-mono text-[9px] tracking-[0.12em] uppercase"
        style={{ color: role.color }}
      >
        {m.isVerdict && <Gavel className="h-3 w-3" />}
        {m.label} · {m.ts}
      </div>
      <div
        className={`max-w-[88%] rounded-2xl border px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
          isJudge ? "italic text-ink-soft" : "text-ink"
        } ${streaming ? "caret" : ""}`}
        style={{
          background: role.tint,
          borderColor: `color-mix(in srgb, ${role.color} 45%, transparent)`,
          textAlign: isJudge ? "center" : "left",
        }}
      >
        {m.text}
      </div>
    </div>
  );
}
