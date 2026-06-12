"use client";

import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  Cable,
  ChevronLeft,
  ChevronsUpDown,
  CircleHelp,
  EllipsisVertical,
  FolderOpen,
  LogOut,
  PanelLeft,
  Pencil,
  Plus,
  Settings,
  Star,
  SunMoon,
  Trash2,
} from "lucide-react";
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
import SettingsDialog from "./SettingsDialog";
import Tour from "./Tour";
import { ConnectorsDialog } from "./connectors";
import { getSettings, isLightTheme, setTheme } from "@/lib/settings";
import { cloudList } from "@/lib/cloudFiles";

interface MatterFile {
  name: string;
  size: number;
  /** present for Firebase Storage files (cloud sessions) */
  url?: string;
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
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [menuMode, setMenuMode] = useState<"main" | "case" | "confirm">(
    "main",
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    setSidebarOpen(window.matchMedia("(min-width: 768px)").matches);
    setReady(true);
  }, []);

  /** On phones the sidebar is an overlay — picking something dismisses it. */
  function closeSidebarOnMobile() {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  /* ── persist ── */
  useEffect(() => {
    if (ready) saveState({ matters, threads });
  }, [ready, matters, threads]);

  /* ── case files: local working directory merged with cloud storage ── */
  useEffect(() => {
    if (!matterId) return;
    let alive = true;
    void (async () => {
      const [server, cloud] = await Promise.all([
        fetch(`/api/files?matterId=${encodeURIComponent(matterId)}`)
          .then((r) => r.json())
          .then((d) => (d.files ?? []) as MatterFile[])
          .catch(() => [] as MatterFile[]),
        cloudList(matterId),
      ]);
      if (!alive) return;
      const merged = new Map<string, MatterFile>();
      for (const f of server) merged.set(f.name, f);
      for (const f of cloud) {
        merged.set(f.name, { name: f.name, size: f.size, url: f.url });
      }
      setFiles([...merged.values()]);
    })();
    return () => {
      alive = false;
    };
  }, [matterId, streaming, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads, live, statuses]);

  /* close the thread menu on outside click */
  useEffect(() => {
    if (!menuFor) return;
    function onDown(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-thread-menu]")) setMenuFor(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuFor]);

  /* close the profile menu on outside click */
  useEffect(() => {
    if (!profileOpen) return;
    function onDown(e: MouseEvent) {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-profile-menu]")) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [profileOpen]);

  const matterThreads = threads
    .filter((t) => t.matterId === matterId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const starredThreads = matterThreads.filter((t) => t.starred);
  const recentThreads = matterThreads.filter((t) => !t.starred);
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

  function toggleStar(t: Thread) {
    updateThread(t.id, (x) => ({ ...x, starred: !x.starred }));
    setMenuFor(null);
  }

  function startRename(t: Thread) {
    setRenameText(t.title);
    setRenamingId(t.id);
    setMenuFor(null);
  }

  function commitRename() {
    if (!renamingId) return;
    const name = renameText.trim();
    if (name) {
      updateThread(renamingId, (t) => ({ ...t, title: name.slice(0, 80) }));
    }
    setRenamingId(null);
  }

  function moveThread(id: string, toMatterId: string) {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, matterId: toMatterId } : t)),
    );
    if (threadId === id) setThreadId(null);
    setMenuFor(null);
  }

  function deleteThread(id: string) {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    if (threadId === id) setThreadId(null);
    setMenuFor(null);
  }

  /** Sends a turn through the agents; returns the reply (voice mode reads it). */
  async function handleSend(
    text: string,
    attached: string[],
    opts?: { voice?: boolean },
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
    const filesMade = new Set<string>();
    let deltaIdx = -1; // cloud chat streams partial text as deltas
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          agentId,
          matterId,
          voice: opts?.voice ?? false,
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
              const ev = JSON.parse(raw) as {
                t: string;
                text?: string;
                name?: string;
              };
              if (ev.t === "text" && ev.text) {
                blocks.push(ev.text);
                deltaIdx = -1;
                setLive(blocks.join("\n\n"));
              } else if (ev.t === "delta" && ev.text) {
                if (deltaIdx === -1) {
                  deltaIdx = blocks.length;
                  blocks.push("");
                }
                blocks[deltaIdx] += ev.text;
                setLive(blocks.join("\n\n"));
              } else if (ev.t === "status" && ev.text) {
                setStatuses((prev) => [...prev, ev.text!]);
              } else if (ev.t === "file" && ev.name) {
                filesMade.add(ev.name);
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
      messages: [
        ...history,
        {
          role: "assistant",
          content: finalText,
          agentId,
          ...(filesMade.size ? { files: [...filesMade] } : {}),
        },
      ],
    }));
    setLive("");
    setStatuses([]);
    setStreaming(false);
    return finalText;
  }

  if (!ready) return null;

  const menuItem =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-ink transition-colors hover:bg-panel";

  const renderThreadRow = (t: Thread) => (
    <li key={t.id} className="group relative">
      {renamingId === t.id ? (
        <input
          autoFocus
          value={renameText}
          onChange={(e) => setRenameText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setRenamingId(null);
          }}
          onBlur={commitRename}
          className="w-full rounded-lg border border-accent bg-input px-2 py-1.5 text-[14px] text-ink outline-none"
        />
      ) : (
        <>
          <button
            onClick={() => {
              setThreadId(t.id);
              setAgentId(t.agentId);
              closeSidebarOnMobile();
            }}
            className={`w-full truncate rounded-lg px-2 py-1.5 pr-8 text-left text-[14px] transition-colors ${
              t.id === threadId
                ? "bg-panel-deep font-medium text-ink"
                : "text-ink-soft hover:bg-panel-deep hover:text-ink"
            }`}
          >
            {t.starred && (
              <Star className="mr-1.5 inline h-3 w-3 fill-accent text-accent" />
            )}
            {t.title || "Untitled"}
          </button>
          <button
            data-thread-menu
            onClick={() => {
              setMenuFor(menuFor === t.id ? null : t.id);
              setMenuMode("main");
            }}
            aria-label="Thread options"
            className={`absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1 text-muted transition-opacity hover:bg-panel-deep hover:text-ink ${
              menuFor === t.id
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <EllipsisVertical className="h-4 w-4" />
          </button>

          {menuFor === t.id && (
            <div
              data-thread-menu
              className="pop absolute top-8 right-0 z-40 w-56 rounded-xl border border-line-strong bg-panel-deep p-1.5 shadow-2xl"
            >
              {menuMode === "main" && (
                <>
                  <button className={menuItem} onClick={() => toggleStar(t)}>
                    <Star
                      className={`h-4 w-4 ${t.starred ? "fill-accent text-accent" : "text-muted"}`}
                    />
                    {t.starred ? "Unstar" : "Star"}
                  </button>
                  <button className={menuItem} onClick={() => startRename(t)}>
                    <Pencil className="h-4 w-4 text-muted" />
                    Rename
                  </button>
                  <button
                    className={menuItem}
                    onClick={() => setMenuMode("case")}
                  >
                    <Briefcase className="h-4 w-4 text-muted" />
                    Add to Case
                  </button>
                  <hr className="my-1 border-line" />
                  <button
                    className={`${menuItem} text-accent hover:text-accent`}
                    onClick={() => setMenuMode("confirm")}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </>
              )}

              {menuMode === "case" && (
                <>
                  <button
                    className={`${menuItem} text-muted`}
                    onClick={() => setMenuMode("main")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Move to…
                  </button>
                  <hr className="my-1 border-line" />
                  {matters
                    .filter((m) => m.id !== t.matterId)
                    .map((m) => (
                      <button
                        key={m.id}
                        className={menuItem}
                        onClick={() => moveThread(t.id, m.id)}
                      >
                        <Briefcase className="h-4 w-4 text-muted" />
                        <span className="truncate">{m.name}</span>
                      </button>
                    ))}
                  {matters.length < 2 && (
                    <p className="px-2.5 py-2 text-[12.5px] text-faint italic">
                      No other cases yet.
                    </p>
                  )}
                </>
              )}

              {menuMode === "confirm" && (
                <button
                  className={`${menuItem} text-accent hover:text-accent`}
                  onClick={() => deleteThread(t.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete permanently?
                </button>
              )}
            </div>
          )}
        </>
      )}
    </li>
  );

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
    <div className="flex h-dvh overflow-hidden bg-paper text-ink">
      {/* one-time guided walkthrough for first-time users */}
      <Tour setSidebarOpen={setSidebarOpen} />

      {/* ── sidebar (Claude-style; overlay drawer on mobile) ──── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-line bg-panel font-sans transition-transform duration-200 md:static md:transition-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        <div className="rise rise-1 flex items-center justify-between px-5 pt-5 pb-3">
          <h1 className="font-serif text-2xl tracking-tight">
            Counsel<span className="text-accent">OS</span>
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            title="Close sidebar"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-deep hover:text-ink"
          >
            <PanelLeft className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          {/* primary nav */}
          <nav className="rise rise-2 space-y-0.5 px-3 pt-2">
            <button
              onClick={() => {
                setThreadId(null);
                closeSidebarOnMobile();
              }}
              className={navRow}
            >
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
                data-tour="new-case"
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
                        closeSidebarOnMobile();
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
                      <li key={f.name}>
                        <a
                          href={
                            f.url ??
                            `/api/files/download?matterId=${encodeURIComponent(matterId)}&name=${encodeURIComponent(f.name)}`
                          }
                          download={f.name}
                          target={f.url ? "_blank" : undefined}
                          rel={f.url ? "noopener" : undefined}
                          className="block truncate rounded px-2 py-1 font-mono text-[12px] text-muted transition-colors hover:bg-panel-deep hover:text-ink"
                          title={`Download ${f.name}`}
                        >
                          {f.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <button
              onClick={() => setConnectorsOpen(true)}
              className={navRow}
              data-tour="connectors"
            >
              <span className="flex h-7 w-7 items-center justify-center">
                <Cable className="h-[18px] w-[18px]" />
              </span>
              Connectors
            </button>
          </nav>

          {/* starred + recents */}
          <div className="rise rise-3 px-3 pt-5" data-tour="threads">
            {starredThreads.length > 0 && (
              <>
                <p className="px-2 pb-1 text-[13px] font-medium text-muted">
                  Starred
                </p>
                <ul className="space-y-0.5 pb-3">
                  {starredThreads.map(renderThreadRow)}
                </ul>
              </>
            )}
            <p className="px-2 pb-1 text-[13px] font-medium text-muted">
              Recents
            </p>
            <ul className="space-y-0.5">
              {recentThreads.map(renderThreadRow)}
              {!matterThreads.length && (
                <li className="px-2 py-1.5 text-[13px] text-faint italic">
                  No threads yet in this case.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* footer: profile menu */}
        <div className="rise rise-4 relative border-t border-line" data-profile-menu>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            data-tour="profile"
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-panel-deep"
          >
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
              <span className="block truncate text-[12.5px] text-muted">
                {firebaseEnabled ? "Signed in" : "Local mode"}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
          </button>

          {profileOpen && (
            <div className="pop absolute right-3 bottom-full left-3 z-40 mb-2 rounded-xl border border-line-strong bg-panel-deep p-1.5 shadow-2xl">
              <p className="truncate px-2.5 pt-2 pb-1.5 text-[12.5px] text-muted">
                {user?.email ?? "Local mode — this machine"}
              </p>
              <button
                className={menuItem}
                onClick={() => {
                  setProfileOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Settings className="h-4 w-4 text-muted" />
                Settings
              </button>
              <button
                className={menuItem}
                onClick={() => {
                  setProfileOpen(false);
                  setConnectorsOpen(true);
                }}
              >
                <Cable className="h-4 w-4 text-muted" />
                Connectors
              </button>
              <button
                className={menuItem}
                onClick={() => setTheme(!isLightTheme())}
              >
                <SunMoon className="h-4 w-4 text-muted" />
                Toggle light / dark
              </button>
              <button
                className={menuItem}
                onClick={() =>
                  window.open(
                    "https://github.com/1n1h/Kat-Ai-Agents",
                    "_blank",
                    "noopener",
                  )
                }
              >
                <CircleHelp className="h-4 w-4 text-muted" />
                Get help
              </button>
              <hr className="my-1 border-line" />
              {firebaseEnabled ? (
                <button className={menuItem} onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 text-muted" />
                  Log out
                </button>
              ) : (
                <p className="px-2.5 py-2 text-[12.5px] text-faint italic">
                  Sign-in activates with Firebase keys.
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── main ──────────────────────────────────────────────── */}
      <main className="grain flex min-w-0 flex-1 flex-col">
        <header className="rise rise-2 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
                className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-deep hover:text-ink"
              >
                <PanelLeft className="h-4.5 w-4.5" />
              </button>
            )}
            <p className="truncate font-mono text-[11px] tracking-[0.22em] text-faint uppercase">
              {activeMatter?.name ?? "—"}
              {activeThread ? ` / ${activeThread.title}` : " / new thread"}
              <span className="hidden text-line-strong sm:inline"> · </span>
              <span className="hidden text-muted sm:inline">
                {agentById(agentId).name}
              </span>
            </p>
          </div>
          <ThemeToggle />
        </header>

        {isEmpty ? (
          /* ── new-thread hero: greeting, composer, pills ── */
          <section className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-16 sm:px-6">
            <div className="w-full max-w-2xl">
              <h2 className="rise rise-2 mb-8 text-center font-serif text-3xl text-ink sm:text-4xl">
                {greetingTpl.replace("{name}", firstName)}
              </h2>
              <div className="rise rise-3">{composer}</div>
              {/* slightly wider than the composer so six pills hold one row */}
              <div className="rise rise-4 mt-4 sm:-mx-16">
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
                matterId={matterId}
                bottomRef={bottomRef}
              />
            </section>
            <div className="px-4 pb-4 sm:px-6">
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
          <div className="pop absolute top-24 left-1/2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-line-strong bg-panel p-5 shadow-2xl md:top-32 md:left-[17rem] md:w-80 md:translate-x-0">
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
        ask={(text) =>
          handleSend(text, [], { voice: getSettings().voiceConcise })
        }
        agentName={agentById(agentId).name}
      />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userEmail={user?.email}
      />
    </div>
  );
}
