"use client";

import { useRef, useState } from "react";

export default function Composer({
  disabled,
  matterId,
  onSend,
}: {
  disabled: boolean;
  matterId: string;
  onSend: (text: string, attached: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

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
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t, attached);
    setText("");
    setAttached([]);
    if (area.current) area.current.style.height = "auto";
  }

  return (
    <div className="border-t border-line bg-paper">
      <div
        className={`mx-auto max-w-3xl px-6 py-4 ${dragOver ? "bg-accent-wash" : ""}`}
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
        {(attached.length > 0 || uploading) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attached.map((name) => (
              <span
                key={name}
                className="border border-line-strong bg-panel px-2 py-0.5 font-mono text-[11px] text-ink-soft"
              >
                {name}
                <button
                  className="ml-2 text-faint hover:text-accent"
                  onClick={() =>
                    setAttached((p) => p.filter((n) => n !== name))
                  }
                  aria-label={`Remove ${name}`}
                >
                  ×
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

        <div className="flex items-end gap-3 border border-line-strong bg-white/60 px-4 py-3 focus-within:border-accent">
          <button
            onClick={() => fileInput.current?.click()}
            disabled={disabled}
            title="Attach documents to this matter"
            className="pb-0.5 font-mono text-sm text-muted transition-colors hover:text-accent disabled:opacity-40"
          >
            +
          </button>
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
          <textarea
            ref={area}
            value={text}
            disabled={disabled}
            rows={1}
            placeholder="State your question for the record, or drop documents here…"
            className="max-h-48 flex-1 resize-none bg-transparent text-[0.95rem] leading-relaxed text-ink outline-none placeholder:text-faint"
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button
            onClick={send}
            disabled={disabled || !text.trim()}
            className="bg-ink px-4 py-1.5 font-sans text-[11px] font-semibold tracking-[0.18em] text-paper uppercase transition-colors hover:bg-accent disabled:opacity-30"
          >
            Submit
          </button>
        </div>
        <p className="mt-2 text-center font-mono text-[10px] tracking-wider text-faint">
          AI work product — review before filing or sending. Files stay in this
          matter&apos;s working directory.
        </p>
      </div>
    </div>
  );
}
