"use client";

import {
  Compass,
  Network,
  PenLine,
  ScanSearch,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AGENTS, type AgentId } from "@/lib/agent-meta";
import { useReveal, revealClass } from "./useReveal";

const ICONS: Record<AgentId, LucideIcon> = {
  auto: Network,
  "litigation-analysis": ScanSearch,
  "contract-review": ScrollText,
  drafting: PenLine,
  "citation-check": ShieldCheck,
  strategy: Compass,
};

const orchestrator = AGENTS.find((a) => a.id === "auto")!;
const specialists = AGENTS.filter((a) => a.id !== "auto");

export default function AgentCards() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const Hub = ICONS.auto;

  return (
    <section className="px-6 py-20 sm:py-28">
      <div ref={ref} className="mx-auto max-w-5xl">
        <div className={revealClass(shown)}>
          <p className="text-center font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
            Five specialists, one chain of command
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Each agent is a master of one craft
          </h2>
        </div>

        {/* orchestrator — featured */}
        <div
          className={revealClass(shown, "mt-12")}
          style={{ transitionDelay: shown ? "60ms" : undefined }}
        >
          <div className="card-hover rounded-3xl border border-accent/40 bg-accent-wash/40 p-7 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-paper shadow-lg">
              <Hub className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-serif text-2xl text-ink">
                  {orchestrator.name}
                </h3>
                <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-paper uppercase">
                  Default
                </span>
              </div>
              <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-accent uppercase">
                {orchestrator.tagline}
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-soft">
            {orchestrator.blurb}
          </p>
          </div>
        </div>

        {/* specialists grid */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {specialists.map((a, i) => {
            const Icon = ICONS[a.id];
            return (
              <div
                key={a.id}
                className={revealClass(shown)}
                style={{ transitionDelay: shown ? `${120 + i * 80}ms` : undefined }}
              >
                <div className="group card-hover h-full rounded-3xl border border-line-strong bg-panel p-6 hover:bg-panel-deep">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/30 transition-colors group-hover:bg-accent group-hover:text-paper group-hover:ring-transparent">
                    <Icon className="h-[22px] w-[22px]" />
                  </span>
                  <div>
                    <h3 className="font-serif text-xl text-ink">{a.name}</h3>
                    <p className="font-mono text-[10.5px] tracking-[0.12em] text-accent uppercase">
                      {a.tagline}
                    </p>
                  </div>
                </div>
                <p className="mt-3.5 text-[14.5px] leading-relaxed text-ink-soft">
                  {a.blurb}
                </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
