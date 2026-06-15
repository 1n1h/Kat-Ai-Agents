"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  AudioLines,
  Cable,
  FileText,
  Loader2,
  Mic,
  Plus,
  Square,
  UploadCloud,
  X,
} from "lucide-react";
import type { AgentId } from "@/lib/agent-meta";
import { cloudUpload } from "@/lib/cloudFiles";
import { primeAudioPlayback } from "@/lib/audioPlayback";
import AgentSelect from "./AgentSelect";

export default function Composer({
  value,
  onChange,
  agentId,
  onAgentChange,
  disabled,
  matterId,
  onSend,
  onOpenConnectors,
  onOpenVoice,
  onMockTrial,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  agentId: AgentId;
  onAgentChange: (id: AgentId) => void;
  disabled: boolean;
  matterId: string;
  onSend: (text: string, attached: string[]) => void;
  onOpenConnectors: () => void;
  onOpenVoice: () => void;
  onMockTrial?: () => void;
  autoFocus?: boolean;
}) {
  const [attached, setAttached] = useState<string[]>([]);
  const [reads, setReads] = useState<{ name: string; text: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [dictation, setDictation] = useState<
    "idle" | "recording" | "transcribing"
  >("idle");
  const fileInput = useRef<HTMLInputElement>(null);
  const readInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recChunksRef = useRef<Blob[]>([]);

  /* close the + menu on outside click */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (plusRef.current && !plusRef.current.contains(e.target as Node)) {
        setPlusOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  /* keep height in sync with controlled value (incl. pill prefills) */
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
    if (value && autoFocus) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [value, autoFocus]);

  /** A doc whose text we can extract so the agent can actually read it. */
  const isReadable = (f: File) =>
    /\.(pdf|docx|txt|md|markdown|csv|json|rtf)$/i.test(f.name) ||
    f.type === "application/pdf" ||
    f.type.startsWith("text/");

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;

    // Readable documents (PDF/Word/text): extract the text inline so the agent
    // can read them. On the cloud deploy there's no working directory, so a
    // stored file is invisible to the agent — the text is the access.
    const readable = list.filter(isReadable);
    if (readable.length) await extractDocs(readable);

    // Anything else (images, etc.): store it in the matter.
    const others = list.filter((f) => !isReadable(f));
    if (!others.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("matterId", matterId);
      for (const f of others) form.append("files", f);
      const res = await fetch("/api/files", { method: "POST", body: form });
      if (res.ok) {
        const data = (await res.json()) as { saved?: string[] };
        setAttached((prev) => [...prev, ...(data.saved ?? [])]);
      } else {
        // cloud deploy has no disk — upload to Firebase Storage instead
        const saved = await cloudUpload(matterId, others);
        setAttached((prev) => [...prev, ...saved]);
      }
    } catch {
      /* upload failed — chips simply don't appear */
    } finally {
      setUploading(false);
    }
  }

  /** Read a document's text so the agent can review/revise it (no storage). */
  async function extractDocs(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setExtracting(true);
    try {
      const form = new FormData();
      for (const f of list) form.append("files", f);
      const res = await fetch("/api/files/extract", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        docs?: { name: string; text: string; error?: string }[];
      };
      const ok = (data.docs ?? []).filter((d) => d.text);
      if (ok.length) {
        setReads((prev) => [
          ...prev,
          ...ok.map((d) => ({ name: d.name, text: d.text })),
        ]);
      }
    } catch {
      /* extraction failed — chip simply doesn't appear */
    } finally {
      setExtracting(false);
    }
  }

  function send() {
    const t = value.trim();
    if ((!t && !reads.length) || disabled || uploading || extracting) return;
    const docBlock = reads.length
      ? "\n\n" +
        reads
          .map((r) => `[Attached document — ${r.name}]\n${r.text}`)
          .join("\n\n")
      : "";
    const content =
      (t + docBlock).trim() ||
      `Please review the attached document(s): ${reads
        .map((r) => r.name)
        .join(", ")}.`;
    onSend(content, attached);
    setAttached([]);
    setReads([]);
  }

  /* dictation: record → Scribe transcribes → text lands in the input.
     Nothing is sent to the agent until the user hits Submit. */
  async function toggleDictation() {
    if (dictation === "recording") {
      recRef.current?.stop();
      return;
    }
    if (dictation !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      recStreamRef.current = stream;
      recChunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) recChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        recStreamRef.current?.getTracks().forEach((t) => t.stop());
        recStreamRef.current = null;
        setDictation("transcribing");
        try {
          const blob = new Blob(recChunksRef.current, { type: rec.mimeType });
          const form = new FormData();
          form.set(
            "audio",
            new File([blob], "dictation.webm", { type: blob.type }),
          );
          const res = await fetch("/api/stt", { method: "POST", body: form });
          const data = (await res.json()) as { text?: string };
          const text = (data.text ?? "").trim();
          if (text) {
            onChange(value ? `${value.trimEnd()} ${text}` : text);
            area.current?.focus();
          }
        } finally {
          setDictation("idle");
        }
      };
      rec.start();
      setDictation("recording");
    } catch {
      setDictation("idle");
    }
  }

  /* release the mic if the composer unmounts mid-recording */
  useEffect(() => {
    return () => {
      recStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const canSend =
    (Boolean(value.trim()) || reads.length > 0) &&
    !disabled &&
    !uploading &&
    !extracting;

  return (
    <div
      className={`relative rounded-2xl border bg-input shadow-lg transition-colors ${
        dragOver ? "border-accent" : "border-line-strong"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void upload(e.dataTransfer.files);
      }}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-accent-wash/80">
          <p className="flex items-center gap-2 font-mono text-[12px] tracking-wide text-accent">
            <UploadCloud className="h-4 w-4" />
            Drop documents into this case
          </p>
        </div>
      )}

      {(attached.length > 0 ||
        reads.length > 0 ||
        uploading ||
        extracting) && (
        <div className="flex flex-wrap gap-2 border-b border-line px-4 pt-3 pb-2.5">
          {attached.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2 py-1 font-mono text-[12px] text-ink-soft"
            >
              {name}
              <button
                className="text-faint hover:text-accent"
                onClick={() => setAttached((p) => p.filter((n) => n !== name))}
                aria-label={`Remove ${name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {reads.map((r) => (
            <span
              key={r.name}
              className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-wash px-2 py-1 font-mono text-[12px] text-accent"
              title="Document text read for the agent"
            >
              <FileText className="h-3 w-3" />
              {r.name}
              <button
                className="text-accent/70 hover:text-accent"
                onClick={() => setReads((p) => p.filter((d) => d.name !== r.name))}
                aria-label={`Remove ${r.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {uploading && (
            <span className="caret font-mono text-[11px] text-muted">
              uploading
            </span>
          )}
          {extracting && (
            <span className="caret font-mono text-[11px] text-muted">
              reading document
            </span>
          )}
        </div>
      )}

      <textarea
        ref={area}
        value={value}
        disabled={disabled}
        rows={1}
        placeholder="State your question for the record…"
        className="block max-h-56 w-full resize-none bg-transparent px-4 pt-4 pb-2 text-base leading-relaxed text-ink outline-none placeholder:text-faint"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />

      <div className="flex items-center justify-between px-2.5 pb-2.5">
        {/* + menu: upload / connectors */}
        <div className="relative" ref={plusRef}>
          <button
            onClick={() => setPlusOpen((o) => !o)}
            disabled={disabled}
            data-tour="upload"
            title="Add files or connectors"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel-deep hover:text-ink disabled:opacity-40"
          >
            <Plus
              className={`h-4.5 w-4.5 transition-transform ${plusOpen ? "rotate-45" : ""}`}
            />
          </button>
          {plusOpen && (
            <div className="pop absolute bottom-full left-0 z-30 mb-2 w-60 rounded-xl border border-line-strong bg-panel p-1.5 shadow-2xl">
              <button
                className="flex w-full items-center gap-2.5 rounded-lg p-3 text-left text-[14px] text-ink transition-colors hover:bg-panel-deep"
                onClick={() => {
                  setPlusOpen(false);
                  fileInput.current?.click();
                }}
              >
                <UploadCloud className="h-4 w-4 text-muted" />
                Upload from computer
              </button>
              <button
                className="flex w-full items-center gap-2.5 rounded-lg p-3 text-left text-[14px] text-ink transition-colors hover:bg-panel-deep"
                onClick={() => {
                  setPlusOpen(false);
                  readInput.current?.click();
                }}
              >
                <FileText className="h-4 w-4 text-muted" />
                Read a document
              </button>
              <button
                className="flex w-full items-center gap-2.5 rounded-lg p-3 text-left text-[14px] text-ink transition-colors hover:bg-panel-deep"
                onClick={() => {
                  setPlusOpen(false);
                  onOpenConnectors();
                }}
              >
                <Cable className="h-4 w-4 text-muted" />
                Connectors…
              </button>
            </div>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={readInput}
          type="file"
          multiple
          hidden
          accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json,.rtf,application/pdf,text/*"
          onChange={(e) => {
            if (e.target.files) void extractDocs(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="flex items-center gap-1.5">
          <AgentSelect
            value={agentId}
            onChange={onAgentChange}
            onMockTrial={onMockTrial}
            disabled={disabled}
          />
          <button
            onClick={toggleDictation}
            disabled={disabled}
            title={
              dictation === "recording"
                ? "Stop and transcribe into the input"
                : "Dictate — speech becomes text here, nothing is sent"
            }
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-panel-deep disabled:opacity-40 ${
              dictation === "recording"
                ? "text-accent"
                : "text-muted hover:text-ink"
            }`}
          >
            {dictation === "recording" ? (
              <Square className="h-3.5 w-3.5" />
            ) : dictation === "transcribing" ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin text-accent" />
            ) : (
              <Mic className="h-4.5 w-4.5" />
            )}
          </button>
          <button
            onClick={() => {
              // Unlock audio output on this tap so the first spoken reply in
              // voice mode isn't blocked by the browser's autoplay policy.
              primeAudioPlayback();
              onOpenVoice();
            }}
            disabled={disabled}
            title="Voice conversation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-panel-deep hover:text-ink disabled:opacity-40"
          >
            <AudioLines className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={send}
            disabled={!canSend}
            title="Send"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              canSend
                ? "bg-accent text-paper hover:bg-accent-soft"
                : "bg-panel-deep text-faint"
            }`}
          >
            <ArrowUp className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
