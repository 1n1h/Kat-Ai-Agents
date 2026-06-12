"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, AudioLines, Cable, Plus, UploadCloud, X } from "lucide-react";
import type { AgentId } from "@/lib/agent-meta";
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
  autoFocus?: boolean;
}) {
  const [attached, setAttached] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);

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

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("matterId", matterId);
      for (const f of list) form.append("files", f);
      const res = await fetch("/api/files", { method: "POST", body: form });
      const data = (await res.json()) as { saved?: string[] };
      setAttached((prev) => [...prev, ...(data.saved ?? [])]);
    } finally {
      setUploading(false);
    }
  }

  function send() {
    const t = value.trim();
    if (!t || disabled || uploading) return;
    onSend(t, attached);
    setAttached([]);
  }

  const canSend = Boolean(value.trim()) && !disabled && !uploading;

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

      {(attached.length > 0 || uploading) && (
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
          {uploading && (
            <span className="caret font-mono text-[11px] text-muted">
              uploading
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

        <div className="flex items-center gap-1.5">
          <AgentSelect
            value={agentId}
            onChange={onAgentChange}
            disabled={disabled}
          />
          <button
            onClick={onOpenVoice}
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
