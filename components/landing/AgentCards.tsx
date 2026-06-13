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
import DeviceFrame from "./DeviceFrame";
import FlowingPaths from "./FlowingPaths";

const ICONS: Record<AgentId, LucideIcon> = {
  auto: Network,
  "litigation-analysis": ScanSearch,
  "contract-review": ScrollText,
  drafting: PenLine,
  "citation-check": ShieldCheck,
  strategy: Compass,
};

/**
 * The clip shown on each agent card. Orchestrator uses 2.mp4; the five
 * specialists cycle through 3/4/5 (only three specialist clips for now).
 */
const AGENT_VIDEOS: Partial<Record<AgentId, string>> = {
  auto: "/vids/2.mp4",
  "litigation-analysis": "/vids/3.mp4",
  "contract-review": "/vids/man_sitting.mp4",
  drafting: "/vids/5.mp4",
  "citation-check": "/vids/shot44.mp4",
  strategy: "/vids/last_vid.mp4",
};

// orchestrator first, then the specialists in pipeline order
const ORDERED = [
  AGENTS.find((a) => a.id === "auto")!,
  ...AGENTS.filter((a) => a.id !== "auto"),
];

export default function AgentCards() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <section className="relative px-6 py-24 sm:py-32">
      <FlowingPaths />
      <div ref={ref} className="relative z-10 mx-auto max-w-6xl">
        <div className={revealClass(shown)}>
          <h2 className="mx-auto max-w-4xl text-center font-serif text-5xl leading-[1.05] text-ink sm:text-6xl md:text-7xl">
            Meet the team
          </h2>
        </div>

        {/* scroll-stack: each card pins, the next slides up and stacks on top */}
        <div className="mx-auto mt-16 max-w-5xl">
          {ORDERED.map((a, i) => {
            const Icon = ICONS[a.id];
            const isOrch = a.id === "auto";
            const video = AGENT_VIDEOS[a.id];
            const frame = `border-[3px] border-[#1e3a5f]/50 shadow-2xl ${
              isOrch ? "bg-accent-wash" : "bg-panel"
            }`;
            return (
              <div
                key={a.id}
                className="sticky"
                style={{ top: `${96 + i * 26}px`, zIndex: i + 1 }}
              >
                <article
                  className={`mb-8 grid items-center gap-7 rounded-[28px] p-6 sm:grid-cols-2 sm:gap-9 sm:p-8 ${frame}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                          isOrch
                            ? "bg-accent text-paper shadow-lg"
                            : "bg-accent/10 text-accent ring-1 ring-inset ring-accent/30"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="font-mono text-[11px] font-bold tracking-[0.22em] text-accent uppercase">
                        {isOrch ? "Default" : "Specialist"}
                      </span>
                    </div>
                    <h3 className="mt-5 font-serif text-3xl text-ink sm:text-4xl">
                      {a.name}
                    </h3>
                    <p className="mt-3 text-lg leading-relaxed text-ink-soft">
                      {a.blurb}
                    </p>
                  </div>

                  {video && (
                    <DeviceFrame>
                      <video
                        className="aspect-video w-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                      >
                        <source src={video} type="video/mp4" />
                      </video>
                    </DeviceFrame>
                  )}
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
