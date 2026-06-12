"use client";

import { useEffect, useRef, useState } from "react";
import { Briefcase, Cable, FolderOpen, LogOut, Plus } from "lucide-react";
import { agentById, type AgentId } from "@/lib/agent-meta";
import {
  loadState,
  saveState,
  uid,
  type Matter,
  type Msg,
  type Thread,
} from "@/lib/store";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth, firebaseEnabled, signOut } from "@/lib/firebase";
import Transcript from "./Transcript";
import Composer from "./Composer";
import ThemeToggle from "./ThemeToggle";
import SuggestionPills from "./SuggestionPills";
import VoiceMode from "./VoiceMode";
import { ConnectorsDialog } from "./connectors";

interface MatterFile {
  name: string;
  size: number;
}

/** A few voices per time of day so the hero never feels canned. */
const GREETINGS: Record<"late" | "morning" | "afternoon" | "evening", string[]> = {
  late: [
    "Working late, {name}.",
    "The quiet hours, {name}.",
    "Burning the midnight oil, {name}?",
  ],
  morning: [
    "Good morning, {name}.",
    "Morning, {name}. The record awaits.",
    "Early and ready, {name}.",
  ],
  afternoon: [
    "Good afternoon, {name}.",
    "Afternoon, {name}.",
    "Back on the record, {name}.",
  ],
  evening: [
    "Good evening, {name}.",
    "Evening, {name}.",
    "Still on the clock, {name}?",
  ],
};

function pickGreeting(): string {
  const h = new Date().getHours();
  const bucket =
    h < 5 ? "late" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  const list = GREETINGS[bucket];
  return list[Math.floor(Math.random() * list.length)];
}

const navRow =
  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 font-sans text-[14px] text-ink-soft transition-colors hover:bg-panel-deep hover:text-ink";

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
  const [casesOpen, setCasesOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const [newCaseOpen, setNewCaseOpen] = useState(false);
  const [newCaseName, setNewCaseName] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);

  const [streaming, setStreaming] = useState(false);
  const [live, setLive] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  /* chosen once per visit so it doesn't flicker between renders */
  const [greetingTpl] = useState(pickGreeting);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* ── signed-in user for the footer ── */
  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

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

  /* ── case files ── */
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

  const fullName = user?.displayName?.trim() || user?.email || "Counsel";
  const firstName = fullName.split(/[\s@]+/)[0];

  function createCase() {
    const name = newCaseName.trim();
    if (!name) return;
    const m: Matter = { id: uid(), name, createdAt: Date.now() };
    setMatters((prev) => [...prev, m]);
    setMatterId(m.id);
    setThreadId(null);
    setCasesOpen(true);
    setNewCaseOpen(false);
    setNewCaseName("");
  }

  function updateThread(id: string, fn: (t: Thread) => Thread) {
    setThreads((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
  }

  /** Sends a turn through the agents; returns the reply (voice mode reads it). */
  async function handleSend(
    text: string,
    attached: string[],
  ): Promise<string> {
    if (streaming || !matterId) return "";
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
    return finalText;
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
      onOpenVoice={() => setVoiceOpen(true)}
      autoFocus={isEmpty}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      {/* ── sidebar (Claude-style) ────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-panel font-sans">
        <div className="rise rise-1 px-5 pt-5 pb-3">
          <h1 className="font-serif text-2xl tracking-tight">CounselOS</h1>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* primary nav */}
          <nav className="rise rise-2 space-y-0.5 px-3 pt-2">
            <button onClick={() => setThreadId(null)} className={navRow}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-panel-deep text-ink-soft">
                <Plus className="h-4 w-4" />
              </span>
              <span className="font-medium text-ink">New thread</span>
            </button>

            <button
              onClick={() => setCasesOpen((o) => !o)}
              className={navRow}
              title="Show or hide cases"
            >
              <span className="flex h-7 w-7 items-center justify-center">
                <Briefcase className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 text-left">Cases</span>
              <span
                role="button"
                tabIndex={0}
                className="rounded-md p-1 text-muted hover:text-accent"
                title="New case"
                onClick={(e) => {
                  e.stopPropagation();
                  setNewCaseOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    setNewCaseOpen(true);
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </span>
            </button>
            {casesOpen && (
              <ul className="space-y-0.5 pb-1 pl-10">
                {matters.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => {
                        setMatterId(m.id);
                        setThreadId(null);
                      }}
                      className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-[14px] transition-colors ${
                        m.id === matterId
                          ? "bg-panel-deep font-medium text-ink"
                          : "text-muted hover:bg-panel-deep hover:text-ink"
                      }`}
                    >
                      {m.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {files.length > 0 && (
              <>
                <button
                  onClick={() => setFilesOpen((o) => !o)}
                  className={navRow}
                  title="Files in this case's working directory"
                >
                  <span className="flex h-7 w-7 items-center justify-center">
                    <FolderOpen className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1 text-left">Files</span>
                  <span className="pr-1 font-mono text-[12px] text-faint">
                    {files.length}
                  </span>
                </button>
                {filesOpen && (
                  <ul className="space-y-0.5 pb-1 pl-10">
                    {files.map((f) => (
                      <li
                        key={f.name}
                        className="truncate px-2 py-1 font-mono text-[12px] text-muted"
                        title={f.name}
                      >
                        {f.name}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <button onClick={() => setConnectorsOpen(true)} className={navRow}>
              <span className="flex h-7 w-7 items-center justify-center">
                <Cable className="h-[18px] w-[18px]" />
              </span>
              Connectors
            </button>
          </nav>

          {/* recents */}
          <div className="rise rise-3 px-3 pt-5">
            <p className="px-2 pb-1 text-[13px] font-medium text-muted">
              Recents
            </p>
            <ul className="space-y-0.5">
              {matterThreads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => {
                      setThreadId(t.id);
                      setAgentId(t.agentId);
                    }}
                    className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-[14px] transition-colors ${
                      t.id === threadId
                        ? "bg-panel-deep font-medium text-ink"
                        : "text-ink-soft hover:bg-panel-deep hover:text-ink"
                    }`}
                  >
                    {t.title || "Untitled"}
                  </button>
                </li>
              ))}
              {!matterThreads.length && (
                <li className="px-2 py-1.5 text-[13px] text-faint italic">
                  No threads yet in this case.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* footer: avatar profile */}
        <div className="rise rise-4 flex items-center gap-3 border-t border-line px-4 py-3">
          {user?.photoURL ? (
            // Google profile photo; no-referrer avoids Google's hotlink 403
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={fullName}
              referrerPolicy="no-referrer"
              className="h-9 w-9 shrink-0 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-wash font-serif text-lg text-accent">
              {fullName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-ink">
              {fullName}
            </span>
            <span
              className="block truncate text-[12.5px] text-muted"
              title={
                firebaseEnabled
                  ? (user?.email ?? "Signed in")
                  : "Auth activates once Firebase keys are configured — files stay on this machine"
              }
            >
              {firebaseEnabled ? "Signed in" : "Local mode"}
            </span>
          </span>
          {firebaseEnabled && (
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-deep hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ── main ──────────────────────────────────────────────── */}
      <main className="grain flex min-w-0 flex-1 flex-col">
        <header className="rise rise-2 flex items-center justify-between border-b border-line px-6 py-3">
          <p className="truncate font-mono text-[11px] tracking-[0.22em] text-faint uppercase">
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
                {greetingTpl.replace("{name}", firstName)}
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
                <p className="mt-2 text-center font-mono text-[11px] tracking-wider text-faint">
                  AI work product — review before filing or sending.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* new-case panel — anchored beside the sidebar, in the app's skin */}
      {newCaseOpen && (
        <div
          className="fixed inset-0 z-50"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNewCaseOpen(false);
          }}
        >
          <div className="pop absolute top-32 left-[17rem] w-80 rounded-2xl border border-line-strong bg-panel p-5 shadow-2xl">
            <h3 className="font-serif text-xl text-ink">New case</h3>
            <p className="mt-1 text-[13px] text-muted">
              e.g. Smith v. Allied, M&amp;A — Birch
            </p>
            <input
              autoFocus
              value={newCaseName}
              onChange={(e) => setNewCaseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createCase();
                if (e.key === "Escape") setNewCaseOpen(false);
              }}
              placeholder="Case name"
              className="mt-3 w-full rounded-xl border border-line bg-input px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setNewCaseOpen(false)}
                className="rounded-lg px-3.5 py-2 text-[13.5px] text-muted transition-colors hover:bg-panel-deep hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={createCase}
                disabled={!newCaseName.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-[13.5px] font-semibold text-paper transition-colors hover:bg-accent-soft disabled:opacity-40"
              >
                Create case
              </button>
            </div>
          </div>
        </div>
      )}

      <ConnectorsDialog
        open={connectorsOpen}
        onClose={() => setConnectorsOpen(false)}
      />

      <VoiceMode
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        ask={(text) => handleSend(text, [])}
        agentName={agentById(agentId).name}
      />
    </div>
  );
}
