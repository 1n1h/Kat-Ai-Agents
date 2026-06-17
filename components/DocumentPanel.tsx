"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Briefcase,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  X,
} from "lucide-react";

export interface PanelDoc {
  name: string;
  content: string;
}

/**
 * Slide-in document viewer (Claude-style). Opens whenever an agent drafts a
 * document; renders the live content and offers download / copy / close.
 * Conversion to PDF/Word/Excel happens in-memory via /api/files/convert, so it
 * works on the cloud deploy (no filesystem).
 */
export default function DocumentPanel({
  doc,
  open,
  drafting,
  onClose,
  onSaveToCase,
}: {
  doc: PanelDoc | null;
  open: boolean;
  drafting?: boolean;
  onClose: () => void;
  onSaveToCase?: (to: "pdf" | "docx" | "md" | "xlsx") => Promise<boolean>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const name = doc?.name ?? "document";
  const stem = name.replace(/\.[^.]+$/, "") || "document";
  const ext = name.toLowerCase().slice(name.lastIndexOf("."));
  const isCsv = ext === ".csv";

  async function download(to: string) {
    if (!doc) return;
    setBusy(to);
    try {
      const res = await fetch("/api/files/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: doc.name, content: doc.content, to }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${stem}.${to}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  }

  function copy() {
    if (!doc) return;
    void navigator.clipboard.writeText(doc.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function saveToCase() {
    if (!doc || !onSaveToCase) return;
    setSaveState("saving");
    const ok = await onSaveToCase(isCsv ? "xlsx" : "docx");
    setSaveState(ok ? "saved" : "error");
    setTimeout(() => setSaveState("idle"), 2200);
  }

  const dlBtn =
    "flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-sans text-[12px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-50";

  return (
    <aside
      // In-flow column (not an overlay): when open it takes width and the chat
      // pane (main, flex-1) shrinks beside it — Claude-style split, not a cover.
      className={`flex h-full shrink-0 flex-col overflow-hidden border-l border-line-strong bg-panel transition-[width] duration-300 ease-out ${
        open
          ? "w-full md:w-[46vw] md:max-w-[900px] md:min-w-[480px]"
          : "w-0 border-l-0"
      }`}
      aria-hidden={!open}
    >
      {/* fixed-width inner so content doesn't reflow while the column animates */}
      <div className="flex h-full w-full min-w-[320px] flex-col md:min-w-[480px]">
        {/* header */}
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-wash">
            <FileText className="h-4 w-4 text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink">{stem}</p>
            <p className="font-mono text-[11px] tracking-wider text-faint uppercase">
              {drafting ? (
                <span className="caret">drafting</span>
              ) : (
                (ext.replace(".", "") || "doc") + " · ready"
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-deep hover:text-ink"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* body — rendered document */}
        <div className="grain flex-1 overflow-y-auto bg-paper px-7 py-6">
          {doc ? (
            <div className="prose-legal mx-auto max-w-2xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {doc.content || "*Empty document.*"}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="mt-10 text-center text-[13px] text-faint italic">
              No document yet.
            </p>
          )}
        </div>

        {/* footer — actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <Download className="h-4 w-4 text-muted" />
          {isCsv ? (
            <button
              onClick={() => download("xlsx")}
              disabled={!!busy || drafting}
              className={dlBtn}
            >
              {busy === "xlsx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Excel
            </button>
          ) : (
            <>
              <button onClick={() => download("pdf")} disabled={!!busy || drafting} className={dlBtn}>
                {busy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                PDF
              </button>
              <button onClick={() => download("docx")} disabled={!!busy || drafting} className={dlBtn}>
                {busy === "docx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Word
              </button>
              <button onClick={() => download("md")} disabled={!!busy || drafting} className={dlBtn}>
                {busy === "md" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Markdown
              </button>
            </>
          )}
          {onSaveToCase ? (
            <button
              onClick={saveToCase}
              disabled={saveState === "saving" || drafting}
              className={`${dlBtn} ml-auto`}
              title="Save into this case's files"
            >
              {saveState === "saving" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saveState === "saved" ? (
                <Check className="h-3.5 w-3.5 text-accent" />
              ) : (
                <Briefcase className="h-3.5 w-3.5" />
              )}
              {saveState === "saved"
                ? "Saved to case"
                : saveState === "error"
                  ? "Save failed"
                  : "Save to case"}
            </button>
          ) : null}
          <button
            onClick={copy}
            disabled={drafting}
            className={`${dlBtn} ${onSaveToCase ? "" : "ml-auto"}`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-accent" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
