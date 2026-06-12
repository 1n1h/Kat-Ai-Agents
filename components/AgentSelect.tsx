"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { AGENTS, agentById, type AgentId } from "@/lib/agent-meta";

/**
 * Claude-style model selector, repurposed for specialists. Lives inside the
 * composer's bottom row and opens upward. The panel is rendered with fixed
 * positioning and clamped to the viewport so it never clips off-screen — the
 * trigger sits mid-row on mobile, so a plain right-aligned panel would spill
 * past the left edge on narrow phones.
 */
export default function AgentSelect({
  value,
  onChange,
  disabled,
}: {
  value: AgentId;
  onChange: (id: AgentId) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{
    left: number;
    bottom: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const selected = agentById(value);

  const place = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 12; // keep this clear of either screen edge
    const gap = 8; // breathing room above the trigger
    const width = Math.min(352 /* 22rem */, window.innerWidth - margin * 2);
    // Right-align to the trigger, then clamp inside the viewport.
    const left = Math.min(
      Math.max(margin, rect.right - width),
      window.innerWidth - width - margin,
    );
    const bottom = window.innerHeight - rect.top + gap;
    const maxHeight = Math.min(416 /* 26rem */, rect.top - gap - margin);
    setPos({ left, bottom, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-ink-soft transition-colors hover:bg-panel-deep hover:text-ink disabled:opacity-40"
      >
        <span className="max-w-[180px] truncate">{selected.name}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && pos && (
        <div
          className="pop fixed z-30 overflow-y-auto rounded-xl border border-line-strong bg-panel p-1.5 shadow-2xl"
          style={{
            left: pos.left,
            bottom: pos.bottom,
            width: pos.width,
            maxHeight: pos.maxHeight,
          }}
        >
          <p className="px-3 pt-2 pb-1 font-mono text-[11px] tracking-[0.2em] text-faint uppercase">
            Specialists
          </p>
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onChange(a.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-lg p-3 text-left transition-colors hover:bg-panel-deep ${
                a.id === value ? "bg-panel-deep" : ""
              }`}
            >
              <span>
                <span className="block text-[15px] font-medium text-ink">
                  {a.name}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                  {a.tagline}
                </span>
              </span>
              {a.id === value && (
                <Check className="h-4.5 w-4.5 shrink-0 text-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
