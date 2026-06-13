import { fetch as expoFetch } from "expo/fetch";
import { API_BASE } from "./config";
import type { AgentId } from "./agents";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type StreamEvent = { t: string; text?: string; name?: string };

/**
 * Stream a chat turn from the backend (NDJSON over expo/fetch's streaming
 * body). Calls onEvent for each line: { t: "delta"|"text"|"status"|"document"
 * |"memory"|"error"|"done", text?, name? }.
 */
export async function streamChat(
  opts: {
    messages: ChatMessage[];
    agentId: AgentId;
    matterId: string;
    matterMemory?: string | null;
    /** "together" runs the cheap model directly (default on mobile) */
    provider?: "together";
  },
  onEvent: (ev: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await expoFetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...opts, voice: false, provider: opts.provider ?? "together" }),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status}).`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    onEvent({ t: "error", text: msg });
    return;
  }

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
        onEvent(JSON.parse(raw) as StreamEvent);
      } catch {
        /* partial line */
      }
    }
  }
}

/** Convert drafted Markdown to a downloadable file URL (PDF/Word/etc.). */
export function convertDocUrl() {
  return `${API_BASE}/api/files/convert`;
}

/**
 * OCR / read an image or document. Pass raw base64 + its mime type; returns the
 * transcribed text. Used for camera scans, photos, and picked PDFs.
 */
export async function ocrImage(
  imageBase64: string,
  mimeType = "image/jpeg",
  prompt?: string,
): Promise<string> {
  const res = await expoFetch(`${API_BASE}/api/vision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType, prompt }),
  });
  const j = (await res.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(j?.error || "Couldn't read that file.");
  return (j.text ?? "").trim();
}

/**
 * Send a picked document (PDF / Word / text) to the backend extractor and get
 * its plain text back, so the agent can review or revise it.
 */
export async function extractDocument(
  uri: string,
  name: string,
  mimeType: string,
): Promise<string> {
  const form = new FormData();
  // RN multipart file part
  form.append("files", { uri, name, type: mimeType } as unknown as Blob);
  const res = await expoFetch(`${API_BASE}/api/files/extract`, {
    method: "POST",
    body: form as unknown as BodyInit,
  });
  const j = (await res.json().catch(() => ({}))) as {
    docs?: { name: string; text: string; error?: string }[];
  };
  if (!res.ok) throw new Error("Couldn't read that document.");
  const d = j.docs?.[0];
  if (d?.error) throw new Error(d.error);
  return (d?.text ?? "").trim();
}

/** Read a local file URI (from a picker) into raw base64, via fetch + FileReader. */
export async function uriToBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onloadend = () => {
      const result = String(reader.result ?? "");
      resolve(result.replace(/^data:[^;]+;base64,/, ""));
    };
    reader.readAsDataURL(blob);
  });
}
