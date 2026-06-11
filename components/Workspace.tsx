"use client";

import { useEffect, useRef, useState } from "react";
import { AGENTS, agentById, type AgentId } from "@/lib/agent-meta";
import {
  loadState,
  saveState,
  uid,
  type Matter,
  type Msg,
  type Thread,
} from "@/lib/store";
import { firebaseEnabled, signOut } from "@/lib/firebase";
import Transcript from "./Transcript";
import Composer from "./Composer";

interface MatterFile {
  name: string;
  size: number;
}

export default function Workspace() {
  const [ready, setReady] = useState(false);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [matterId, setMatterId] = useState<string>("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<AgentId>("auto");
  const [files, setFiles] = useState<MatterFile[]>([]);

  const [streaming, setStreaming] = useState(false);
  const [live, setLive] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* ── hydrate from localStorage ── */
  useEffect(() => {
    const s = loadState();
    let ms = s.matters;
    if (!ms.length) {
      ms = [{ id: uid(), name: "General", createdAt: Date.now() }];
    }
    setMatters(ms);
    setThreads(s.threads);
    setMatterId(ms[0].id);
    setReady(true);
  }, []);

  /* ── persist ── */
  useEffect(() => {
    if (ready) saveState({ matters, threads });
  }, [ready, matters, threads]);

  /* ── matter files ── */
  useEffect(() => {
    if (!matterId) return;
    fetch(`/api/files?matterId=${encodeURIComponent(matterId)}`)
      .then((r) => r.json())
      .then((d) => setFiles(d.files ?? []))
      .catch(() => setFiles([]));
  }, [matterId, streaming]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads, live, statuses]);

  const matterThreads = threads
    .filter((t) => t.matterId === matterId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const activeThread = threads.find((t) => t.id === threadId) ?? null;
  const activeMatter = matters.find((m) => m.id === matterId) ?? null;
  const activeAgent = agentById(agentId);

  function addMatter() {
    const name = window.prompt("Matter name (e.g. Smith v. Allied, M&A — Birch)");
    if (!name?.trim()) return;
    const m: Matter = { id: uid(), name: name.trim(), createdAt: Date.now() };
    setMatters((prev) => [...prev, m]);
    setMatterId(m.id);
    setThreadId(null);
  }

  function updateThread(id: string, fn: (t: Thread) => Thread) {
    setThreads((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
  }

  async function handleSend(text: string, attached: string[]) {
    if (streaming || !matterId) return;

    const content = attached.length
      ? `${text}\n\n[Documents added to this matter's working directory: ${attached.join(", ")}]`
      : text;
    const userMsg: Msg = { role: "user", content };

    let thread = activeThread;
    if (!thread) {
      thread = {
        id: uid(),
        matterId,
        title: text.slice(0, 60),
        agentId,
        messages: [],
        createdAt: Date.now(),
      };
      setThreads((prev) => [...prev, thread!]);
      setThreadId(thread.id);
    }
    const history = [...thread.messages, userMsg];
    updateThread(thread.id, (t) => ({ ...t, messages: history }));

    setStreaming(true);
    setLive("");
    setStatuses([]);

    const blocks: string[] = [];
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          agentId,
          matterId,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        blocks.push(`*${(err as { error?: string }).error ?? "Request failed."}*`);
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const raw of lines) {
            if (!raw.trim()) continue;
            try {
              const ev = JSON.parse(raw) as { t: string; text?: string };
              if (ev.t === "text" && ev.text) {
                blocks.push(ev.text);
                setLive(blocks.join("\n\n"));
              } else if (ev.t === "status" && ev.text) {
                setStatuses((prev) => [...prev, ev.text!]);
              } else if (ev.t === "error" && ev.text) {
                blocks.push(`*${ev.text}*`);
                setLive(blocks.join("\n\n"));
              }
            } catch {
              /* partial line — ignored */
            }
          }
        }
      }
    } catch (err) {
      blocks.push(
        `*Connection error: ${err instanceof Error ? err.message : String(err)}*`,
      );
    }

    const finalText = blocks.join("\n\n") || "*No response produced.*";
    updateThread(thread.id, (t) => ({
      ...t,
      messages: [...history, { role: "assistant", content: finalText, agentId }],
    }));
    setLive("");
    setStatuses([]);
    setStreaming(false);
  }

  if (!ready) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      {/* ── sidebar ───────────────────────────────────────────── */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-panel">
        <div className="rise rise-1 border-b border-line px-5 py-5">
          <h1 className="font-serif text-2xl">CounselOS</h1>
          <p className="mt-1 font-mono text-[10px] tracking-[0.22em] text-accent">
            PRIVILEGED &amp; CONFIDENTIAL
          </p>
        </div>

        {/* matters */}
        <div className="rise rise-2 border-b border-line px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="font-sans text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
              Matters
            </p>
            <button
              onClick={addMatter}
              className="font-mono text-sm text-muted hover:text-accent"
              title="New matter"
            >
              +
            </button>
          </div>
          <ul className="mt-2 space-y-0.5">
            {matters.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => {
                    setMatterId(m.id);
                    setThreadId(null);
                  }}
                  className={`w-full truncate px-2 py-1.5 text-left text-[13px] transition-colors ${
                    m.id === matterId
                      ? "border-l-2 border-accent bg-paper font-medium text-ink"
                      : "border-l-2 border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* threads */}
        <div className="rise rise-3 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="font-sans text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
              Threads
            </p>
            <button
              onClick={() => setThreadId(null)}
              className="font-mono text-sm text-muted hover:text-accent"
              title="New thread"
            >
              +
            </button>
          </div>
          <ul className="mt-2 space-y-0.5">
            {matterThreads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => {
                    setThreadId(t.id);
                    setAgentId(t.agentId);
                  }}
                  className={`w-full truncate px-2 py-1.5 text-left text-[13px] transition-colors ${
                    t.id === threadId
                      ? "border-l-2 border-accent bg-paper font-medium text-ink"
                      : "border-l-2 border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {t.title || "Untitled"}
                </button>
              </li>
            ))}
            {!matterThreads.length && (
              <li className="px-2 py-1.5 text-[12px] text-faint italic">
                No threads yet on this matter.
              </li>
            )}
          </ul>

          {/* matter files */}
          {files.length > 0 && (
            <div className="mt-6">
              <p className="font-sans text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
                Matter files
              </p>
              <ul className="mt-2 space-y-1">
                {files.map((f) => (
                  <li
                    key={f.name}
                    className="truncate font-mono text-[11px] text-ink-soft"
                    title={f.name}
                  >
                    {f.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rise rise-4 border-t border-line px-5 py-3">
          {firebaseEnabled ? (
            <button
              onClick={() => signOut()}
              className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase hover:text-accent"
            >
              Sign out
            </button>
          ) : (
            <p
              className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase"
              title="Auth activates once Firebase keys are configured"
            >
              ● Local mode — files stay on this machine
            </p>
          )}
        </div>
      </aside>

      {/* ── main ──────────────────────────────────────────────── */}
      <main className="grain flex min-w-0 flex-1 flex-col">
        {/* top bar: matter + agent switcher */}
        <header className="rise rise-2 border-b border-line bg-paper/90 px-6 pt-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] tracking-[0.22em] text-faint uppercase">
              {activeMatter?.name ?? "—"}
              {activeThread ? ` / ${activeThread.title}` : " / new thread"}
            </p>
            <nav className="mt-2 flex gap-6 overflow-x-auto">
              {AGENTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAgentId(a.id)}
                  disabled={streaming}
                  className={`border-b-2 pb-2 font-sans text-[12px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase transition-colors ${
                    a.id === agentId
                      ? "border-accent text-ink"
                      : "border-transparent text-faint hover:text-muted"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </nav>
            <p className="border-t border-line py-1.5 font-mono text-[10px] text-muted">
              {activeAgent.tagline}
            </p>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto">
          <Transcript
            messages={activeThread?.messages ?? []}
            live={live}
            statuses={statuses}
            streaming={streaming}
            agentId={agentId}
            onPickAgent={(id) => setAgentId(id)}
            bottomRef={bottomRef}
          />
        </section>

        <Composer
          disabled={streaming || !matterId}
          matterId={matterId}
          onSend={handleSend}
        />
      </main>
    </div>
  );
}
