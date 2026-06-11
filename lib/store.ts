/**
 * Local-first persistence for matters and threads (localStorage for v1;
 * swaps to Firestore once Firebase keys exist).
 */

import type { AgentId } from "./agent-meta";

export interface Msg {
  role: "user" | "assistant";
  content: string;
  agentId?: AgentId;
}

export interface Thread {
  id: string;
  matterId: string;
  title: string;
  agentId: AgentId;
  messages: Msg[];
  createdAt: number;
}

export interface Matter {
  id: string;
  name: string;
  createdAt: number;
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
