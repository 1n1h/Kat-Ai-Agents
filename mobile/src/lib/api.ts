import { File, Paths } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import * as Sharing from "expo-sharing";
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
    body: JSON.stringify({ ...opts, voice: false, provider: opts.provider }),
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
 * Stream one Mock Trial turn (NDJSON). onDelta receives the accumulated text;
 * onCaseLaw receives the grounding payload from the opening turn. Returns the
 * full text when the turn completes.
 */
export async function streamMockTrial(
  body: Record<string, unknown>,
  onDelta: (text: string) => void,
  onCaseLaw?: (text: string) => void,
): Promise<string> {
  let acc = "";
  const res = await expoFetch(`${API_BASE}/api/mock-trial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j?.error || "The court is unavailable.");
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
          onDelta(acc);
        } else if (ev.t === "caselaw") {
          onCaseLaw?.(ev.text ?? "");
        } else if (ev.t === "error" && ev.text) {
          acc += `${acc ? "\n\n" : ""}${ev.text}`;
          onDelta(acc);
        }
      } catch {
        /* partial line */
      }
    }
  }
  return acc.trim() || "(no response)";
}

export interface CaseResult {
  name: string;
  court: string;
  date: string;
  citation: string;
  url: string;
  snippet: string;
}

/** Search U.S. case law (CourtListener) for the Research tab. */
export async function searchCaseLaw(query: string): Promise<CaseResult[]> {
  const res = await fetch(`${API_BASE}/api/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const j = (await res.json().catch(() => ({}))) as {
    results?: CaseResult[];
    error?: string;
  };
  if (!res.ok) throw new Error(j?.error || "Search failed.");
  return j.results ?? [];
}

/**
 * Convert a drafted document to PDF/Word/Markdown and open the iOS share sheet
 * so the user can save it to Files, AirDrop, email, etc.
 */
export async function shareDocument(
  name: string,
  content: string,
  to: "pdf" | "docx" | "md",
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/files/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, content, to }),
  });
  if (!res.ok) throw new Error("Couldn't create that file.");
  const bytes = new Uint8Array(await res.arrayBuffer());
  const stem = (name.replace(/\.[^.]+$/, "") || "document").replace(
    /[^\w. -]/g,
    "_",
  );
  const file = new File(Paths.cache, `${stem}.${to}`);
  try {
    file.create({ overwrite: true });
  } catch {
    /* already exists — write overwrites */
  }
  file.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  }
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
  // Multipart uploads must use RN's global fetch — expo/fetch can't serialize
  // a {uri,name,type} file part ("Unsupported FormDataPart implementation").
  const res = await fetch(`${API_BASE}/api/files/extract`, {
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

/** Transcribe a recorded audio file (m4a) to text via the backend (Scribe). */
export async function transcribeAudio(uri: string): Promise<string> {
  const form = new FormData();
  form.append("audio", {
    uri,
    name: "dictation.m4a",
    type: "audio/m4a",
  } as unknown as Blob);
  // Global fetch (not expo/fetch) for multipart file uploads.
  const res = await fetch(`${API_BASE}/api/stt`, {
    method: "POST",
    body: form as unknown as BodyInit,
  });
  const j = (await res.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(j?.error || "Transcription failed.");
  return (j.text ?? "").trim();
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
