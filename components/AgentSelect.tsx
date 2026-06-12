"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { AGENTS, agentById, type AgentId } from "@/lib/agent-meta";

/**
 * Claude-style model selector, repurposed for specialists. Lives inside the
 * composer's bottom row and opens upward.
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
  const selected = agentById(value);

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
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-panel-deep hover:text-ink disabled:opacity-40"
      >
        <span className="max-w-[160px] truncate">{selected.name}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="pop absolute right-0 bottom-full z-30 mb-2 w-80 rounded-xl border border-line-strong bg-panel p-1.5 shadow-2xl">
          <p className="px-2.5 pt-1.5 pb-1 font-mono text-[10px] tracking-[0.2em] text-faint uppercase">
            Specialists
          </p>
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onChange(a.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-panel-deep ${
                a.id === value ? "bg-panel-deep" : ""
              }`}
            >
              <span>
                <span className="block text-[13.5px] font-medium text-ink">
                  {a.name}
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                  {a.tagline}
                </span>
              </span>
              {a.id === value && (
                <Check className="h-4 w-4 shrink-0 text-accent" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
