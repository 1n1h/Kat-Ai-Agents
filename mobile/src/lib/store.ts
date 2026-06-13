import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AgentId } from "./agents";

export interface Msg {
  role: "user" | "assistant";
  content: string;
  agentId?: AgentId;
  docs?: { name: string; content: string }[];
}

export interface Matter {
  id: string;
  name: string;
  createdAt: number;
  messages: Msg[];
}

const KEY = "@lex/matters";

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function loadMatters(): Promise<Matter[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Matter[];
  } catch {
    /* corrupted — start fresh */
  }
  return [];
}

export async function saveMatters(matters: Matter[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(matters));
  } catch {
    /* ignore */
  }
}
