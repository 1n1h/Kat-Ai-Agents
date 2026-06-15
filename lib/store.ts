/**
 * Local-first persistence for matters and threads (localStorage for v1;
 * swaps to Firestore once Firebase keys exist).
 */

import type { AgentId } from "./agent-meta";

export interface Msg {
  role: "user" | "assistant";
  content: string;
  agentId?: AgentId;
  /** files the agent wrote to the matter dir (local path; downloaded by name) */
  files?: string[];
  /** documents the agent drafted in the cloud (content carried for convert) */
  docs?: { name: string; content: string }[];
  /**
   * documents the USER uploaded for the agent to read — shown as a compact
   * chip; the text is sent to the model but never rendered in the bubble.
   */
  attachments?: { name: string; text: string }[];
}

export interface Thread {
  id: string;
  matterId: string;
  title: string;
  agentId: AgentId;
  messages: Msg[];
  createdAt: number;
  starred?: boolean;
}

export interface Matter {
  id: string;
  name: string;
  createdAt: number;
  starred?: boolean;
  /** long-term memory: durable facts the agents accumulate across threads */
  memory?: string;
}

export interface WorkspaceState {
  matters: Matter[];
  threads: Thread[];
}

const KEY = "counselos.v1";

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function loadState(): WorkspaceState {
  if (typeof window === "undefined") return { matters: [], threads: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as WorkspaceState;
  } catch {
    /* corrupted state — start fresh */
  }
  return { matters: [], threads: [] };
}

export function saveState(state: WorkspaceState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}
