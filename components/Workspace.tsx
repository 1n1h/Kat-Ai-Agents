"use client";

import { useEffect, useRef, useState } from "react";
import { agentById, type AgentId } from "@/lib/agent-meta";
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
import ThemeToggle from "./ThemeToggle";
import SuggestionPills from "./SuggestionPills";
import { ConnectorsDialog } from "./connectors";

interface MatterFile {
  name: string;
  size: number;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Working late, Counsel.";
  if (h < 12) return "Good morning, Counsel.";
  if (h < 18) return "Good afternoon, Counsel.";
  return "Good evening, Counsel.";
}

export default function Workspace() {
  const [ready, setReady] = useState(false);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [matterId, setMatterId] = useState<string>("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<AgentId>("auto");
  const [files, setFiles] = useState<MatterFile[]>([]);
  const [draft, setDraft] = useState("");
  const [connectorsOpen, setConnectorsOpen] = useState(false);

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
  const isEmpty = !activeThread?.messages.length && !streaming;

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
    setDraft("");

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

  const composer = (
    <Composer
      value={draft}
      onChange={setDraft}
      agentId={agentId}
      onAgentChange={setAgentId}
      disabled={streaming || !matterId}
      matterId={matterId}
      onSend={handleSend}
      onOpenConnectors={() => setConnectorsOpen(true)}
      autoFocus={isEmpty}
    />
  );

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
        <header className="rise rise-2 flex items-center justify-between border-b border-line px-6 py-3">
          <p className="truncate font-mono text-[10px] tracking-[0.22em] text-faint uppercase">
            {activeMatter?.name ?? "—"}
            {activeThread ? ` / ${activeThread.title}` : " / new thread"}
            <span className="text-line-strong"> · </span>
            <span className="text-muted">{agentById(agentId).name}</span>
          </p>
          <ThemeToggle />
        </header>

        {isEmpty ? (
          /* ── new-thread hero: greeting, composer, pills ── */
          <section className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-16">
            <div className="w-full max-w-2xl">
              <h2 className="rise rise-2 mb-8 text-center font-serif text-4xl text-ink">
                <span className="mr-3 text-accent">✳</span>
                {greeting()}
              </h2>
              <div className="rise rise-3">{composer}</div>
              <div className="rise rise-4 mt-4">
                <SuggestionPills
                  onAction={(agent, prompt) => {
                    setAgentId(agent);
                    setDraft(prompt);
                  }}
                  onConnector={() => setConnectorsOpen(true)}
                />
              </div>
            </div>
          </section>
        ) : (
          /* ── active thread: transcript + docked composer ── */
          <>
            <section className="flex-1 overflow-y-auto">
              <Transcript
                messages={activeThread?.messages ?? []}
                live={live}
                statuses={statuses}
                streaming={streaming}
                agentId={agentId}
                bottomRef={bottomRef}
              />
            </section>
            <div className="px-6 pb-4">
              <div className="mx-auto max-w-3xl">
                {composer}
                <p className="mt-2 text-center font-mono text-[10px] tracking-wider text-faint">
                  AI work product — review before filing or sending.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      <ConnectorsDialog
        open={connectorsOpen}
        onClose={() => setConnectorsOpen(false)}
      />
    </div>
  );
}
