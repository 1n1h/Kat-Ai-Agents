"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { submitWaitlist } from "@/lib/firebase";

export default function WaitlistDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [firm, setFirm] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStatus("busy");
    try {
      await submitWaitlist({ name, email, firm, note });
      setStatus("done");
    } catch {
      // Don't lose the lead's goodwill over a storage hiccup; thank them and
      // surface a soft note so they can also reach out directly.
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pop relative w-full max-w-md rounded-3xl border border-line-strong bg-panel p-7 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-deep hover:text-ink"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {status === "done" || status === "error" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-wash text-accent">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h2 className="font-serif text-2xl text-ink">You&apos;re on the list</h2>
            <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-ink-soft">
              Thank you — we&apos;ll reach out at{" "}
              <span className="text-ink">{email}</span> as access opens up.
            </p>
            {status === "error" && (
              <p className="mt-3 font-mono text-[11px] tracking-wide text-faint">
                If you don&apos;t hear back, email katherine@amploconsulting.com
                directly.
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-6 rounded-full bg-accent px-6 py-2.5 text-[14px] font-semibold text-paper transition-colors hover:bg-accent-soft"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-2xl text-ink">Request access</h2>
            <p className="mt-1.5 mb-5 text-[14px] text-muted">
              Tell us a little about your practice and we&apos;ll be in touch.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-line bg-input px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
              />
              <input
                required
                type="email"
                autoComplete="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-line bg-input px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
              />
              <input
                placeholder="Firm or practice (optional)"
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                className="w-full rounded-xl border border-line bg-input px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
              />
              <textarea
                rows={3}
                placeholder="What would you put it to work on first? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full resize-none rounded-xl border border-line bg-input px-4 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
              />
              <button
                type="submit"
                disabled={status === "busy"}
                className="mt-1 w-full rounded-full bg-accent px-5 py-3 text-[15px] font-semibold text-paper shadow transition-colors hover:bg-accent-soft disabled:opacity-50"
              >
                {status === "busy" ? "Sending…" : "Request access"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
