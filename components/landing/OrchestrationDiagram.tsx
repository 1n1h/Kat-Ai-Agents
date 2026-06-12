"use client";

import { useEffect, useState } from "react";
import {
  Compass,
  Network,
  PenLine,
  ScanSearch,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AGENTS, agentById, type AgentId } from "@/lib/agent-meta";

/**
 * The signature visual: the agent hierarchy and how the orchestrator hands
 * work to each specialist. An org-chart of nodes (orchestrator on top, the
 * five specialists below) with delegation edges that "flow" and a pulse that
 * travels down the active branch — auto-cycling through the real pipeline.
 * Hover/tap any node to study what it does. Static under reduced-motion.
 */

const ORCH: { x: number; y: number } = { x: 400, y: 112 };

const POS: Record<Exclude<AgentId, "auto">, { x: number; y: number }> = {
  "litigation-analysis": { x: 95, y: 432 },
  "contract-review": { x: 248, y: 398 },
  drafting: { x: 400, y: 388 },
  "citation-check": { x: 552, y: 398 },
  strategy: { x: 705, y: 432 },
};

const ICONS: Record<AgentId, LucideIcon> = {
  auto: Network,
  "litigation-analysis": ScanSearch,
  "contract-review": ScrollText,
  drafting: PenLine,
  "citation-check": ShieldCheck,
  strategy: Compass,
};

/** The cycle the orchestrator walks — order encodes the real invariants. */
const FLOW: { id: Exclude<AgentId, "auto">; verb: string }[] = [
  { id: "litigation-analysis", verb: "analyzing the record" },
  { id: "contract-review", verb: "reviewing the contract" },
  { id: "drafting", verb: "assembling the draft" },
  { id: "citation-check", verb: "auditing every citation" },
  { id: "strategy", verb: "pressure-testing strategy" },
];

const SPECIALISTS = AGENTS.filter((a) => a.id !== "auto");

const edgePath = (p: { x: number; y: number }) =>
  `M ${ORCH.x} ${ORCH.y + 44} Q ${p.x} 250 ${p.x} ${p.y - 38}`;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

function NodeCard({
  id,
  active,
  onEnter,
  onLeave,
}: {
  id: AgentId;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const meta = agentById(id);
  const Icon = ICONS[id];
  const isHub = id === "auto";
  return (
    <button
      type="button"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onEnter}
      className={`flex h-full w-full items-center gap-2.5 rounded-2xl border px-3 text-left transition-all duration-300 ${
        isHub ? "justify-center" : ""
      } ${
        active
          ? "border-accent bg-accent-wash shadow-lg shadow-black/20"
          : "border-line-strong bg-panel hover:border-line-strong hover:bg-panel-deep"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
          active
            ? "bg-accent text-paper"
            : "bg-accent/10 text-accent ring-1 ring-inset ring-accent/30"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span
          className={`block truncate font-sans font-semibold leading-tight ${
            isHub ? "text-[16px]" : "text-[13.5px]"
          } ${active ? "text-ink" : "text-ink-soft"}`}
        >
          {meta.name}
        </span>
        <span className="block truncate font-mono text-[9.5px] tracking-[0.15em] text-muted uppercase">
          {isHub ? "orchestrator" : "specialist"}
        </span>
      </span>
    </button>
  );
}

export default function OrchestrationDiagram() {
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState<AgentId | null>(null);
  const paused = hovered !== null;

  useEffect(() => {
    if (reduced || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % FLOW.length), 2400);
    return () => clearInterval(t);
  }, [reduced, paused]);

  const activeFlowId = reduced ? null : FLOW[idx].id;
  const currentId: AgentId = hovered ?? activeFlowId ?? "auto";
  const current = agentById(currentId);
  const caption = reduced
    ? "the orchestrator mediates every hop"
    : `delegating · ${FLOW[idx].verb}`;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-panel/60 p-2 shadow-2xl backdrop-blur-sm sm:p-4">
        <svg viewBox="0 0 800 540" className="w-full" role="img" aria-label="How CounselOS routes work between specialist agents">
          {/* edges */}
          {SPECIALISTS.map((s) => {
            const p = POS[s.id as Exclude<AgentId, "auto">];
            const isActive = currentId === s.id;
            return (
              <path
                key={`edge-${s.id}`}
                id={`edge-${s.id}`}
                d={edgePath(p)}
                fill="none"
                strokeLinecap="round"
                className={
                  isActive
                    ? "stroke-accent"
                    : "stroke-line-strong"
                }
                style={{ strokeWidth: isActive ? 2.5 : 1.5 }}
                strokeOpacity={isActive ? 0.95 : 0.5}
              />
            );
          })}

          {/* animated overlay + traveling pulse on the active branch */}
          {!reduced &&
            activeFlowId &&
            (() => {
              const p = POS[activeFlowId as Exclude<AgentId, "auto">];
              return (
                <g key={`pulse-${idx}-${activeFlowId}`}>
                  <path
                    d={edgePath(p)}
                    fill="none"
                    strokeLinecap="round"
                    className="edge-flow stroke-accent-soft"
                    style={{ strokeWidth: 2.5 }}
                    strokeOpacity={0.9}
                  />
                  <circle r="6" className="fill-accent">
                    <animateMotion dur="1.05s" repeatCount="indefinite" path={edgePath(p)} />
                  </circle>
                </g>
              );
            })()}

          {/* orchestrator node */}
          {!reduced && currentId === "auto" && (
            <circle
              cx={ORCH.x}
              cy={ORCH.y}
              r="58"
              className="ring-pulse fill-accent"
              opacity={0.18}
            />
          )}
          <foreignObject x={ORCH.x - 96} y={ORCH.y - 40} width={192} height={80}>
            <div className="h-[80px] w-[192px]">
              <NodeCard
                id="auto"
                active={currentId === "auto"}
                onEnter={() => setHovered("auto")}
                onLeave={() => setHovered(null)}
              />
            </div>
          </foreignObject>

          {/* specialist nodes */}
          {SPECIALISTS.map((s) => {
            const p = POS[s.id as Exclude<AgentId, "auto">];
            const active = currentId === s.id;
            return (
              <g key={`node-${s.id}`}>
                {active && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="42"
                    className="ring-pulse fill-accent"
                    opacity={0.16}
                  />
                )}
                <foreignObject x={p.x - 78} y={p.y - 33} width={156} height={66}>
                  <div className="h-[66px] w-[156px]">
                    <NodeCard
                      id={s.id}
                      active={active}
                      onEnter={() => setHovered(s.id)}
                      onLeave={() => setHovered(null)}
                    />
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {/* live status caption */}
        <div className="pointer-events-none absolute top-4 left-0 flex w-full justify-center sm:top-6">
          <span className="caret rounded-full border border-line bg-paper/70 px-3 py-1 font-mono text-[10.5px] tracking-[0.18em] text-muted uppercase backdrop-blur-sm">
            {caption}
          </span>
        </div>
      </div>

      {/* detail panel — study the selected agent */}
      <div className="mt-5 min-h-[112px] rounded-2xl border border-line bg-panel p-5 transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xl text-ink">{current.name}</span>
          {currentId !== "auto" && (
            <span className="rounded-full bg-accent-wash px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-accent uppercase">
              {current.label}
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-accent uppercase">
          {current.tagline}
        </p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">
          {current.blurb}
        </p>
      </div>

      {/* the invariants, stated plainly */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {[
          "Analysis before drafting",
          "Every draft is citation-checked",
          "The orchestrator mediates every hop",
        ].map((t) => (
          <span
            key={t}
            className="rounded-full border border-line bg-panel px-3 py-1.5 font-sans text-[12px] text-muted"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
