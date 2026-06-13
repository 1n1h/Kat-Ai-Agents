"use client";

import { useEffect, useRef } from "react";
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
import VideoCard from "./VideoCard";

const ICONS: Record<AgentId, LucideIcon> = {
  auto: Network,
  "litigation-analysis": ScanSearch,
  "contract-review": ScrollText,
  drafting: PenLine,
  "citation-check": ShieldCheck,
  strategy: Compass,
};

/**
 * The clip shown directly under each agent card. Orchestrator uses 2.mp4; the
 * five specialists cycle through 3/4/5 (we only have three specialist clips).
 * Swap any path here when a dedicated clip arrives.
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
  const stackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  // Green progress line: fills from the Orchestrated card down to Practice
  // Strategy as you scroll through the stack, then stops. Scroll-linked via
  // GSAP ScrollTrigger against the landing's own scroller (#landing-scroll).
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const scroller = document.getElementById("landing-scroll");
    if (!scroller || !stackRef.current || !fillRef.current) return;

    let killed = false;
    let ctx: { revert: () => void } | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        // green progress line
        gsap.set(fillRef.current, { scaleY: 0, transformOrigin: "top" });
        gsap.to(fillRef.current, {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            scroller,
            trigger: stackRef.current,
            start: "top 72%",
            end: "bottom 62%",
            scrub: 0.4,
          },
        });

        // parallax feel: cards and videos drift at different rates as they
        // pass through the viewport (translation only — sizes untouched). The
        // rate gap between video and card is what reads as depth.
        gsap.utils
          .toArray<HTMLElement>("[data-parallax]")
          .forEach((el) => {
            const strong = el.dataset.parallax === "video";
            const amt = strong ? 10 : 4;
            gsap.fromTo(
              el,
              { yPercent: amt },
              {
                yPercent: -amt,
                ease: "none",
                scrollTrigger: {
                  scroller,
                  trigger: el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.5,
                },
              },
            );
          });
      }, stackRef);
      ScrollTrigger.refresh();
    })();

    return () => {
      killed = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section className="px-6 py-24 sm:py-32">
      <div ref={ref} className="mx-auto max-w-6xl">
        <div className={revealClass(shown)}>
          <h2 className="mx-auto max-w-4xl text-center font-serif text-5xl leading-[1.05] text-ink sm:text-6xl md:text-7xl">
            Meet the team
          </h2>
        </div>

        <div
          ref={stackRef}
          className="relative mt-14 space-y-16 sm:mt-16 sm:space-y-20"
        >
          {/* progress spine — runs down the center, behind the cards (z-0), so
             it shows through the gaps between them. Centered with -ml-px (half
             the 2px width) instead of translate-x, leaving transform free for
             the GSAP scaleY fill. */}
          <div
            aria-hidden
            className="absolute top-1 bottom-1 left-1/2 z-0 -ml-px w-[2px] rounded-full bg-line-strong"
          />
          <div
            ref={fillRef}
            aria-hidden
            className="absolute top-1 bottom-1 left-1/2 z-0 -ml-px w-[2px] origin-top rounded-full bg-green-500"
            style={{ transform: "scaleY(0)" }}
          />

          {ORDERED.map((a, i) => {
            const Icon = ICONS[a.id];
            const isOrch = a.id === "auto";
            const video = AGENT_VIDEOS[a.id];
            return (
              <div
                key={a.id}
                className={revealClass(shown, "relative z-10")}
                style={{ transitionDelay: shown ? `${i * 70}ms` : undefined }}
              >
                {/* full-width card (parallax on the wrapper so it doesn't
                    fight the card-hover transform) */}
                <div data-parallax="card">
                <div
                  className={`card-hover rounded-3xl p-7 sm:p-8 ${
                    isOrch
                      ? "border border-accent/40 bg-accent-wash"
                      : "group border border-line-strong bg-panel hover:bg-panel-deep"
                  }`}
                >
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        isOrch
                          ? "bg-accent text-paper shadow-lg"
                          : "bg-accent/10 text-accent ring-1 ring-inset ring-accent/30 transition-colors group-hover:bg-accent group-hover:text-paper group-hover:ring-transparent"
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-3xl text-ink sm:text-4xl">
                        {a.name}
                      </h3>
                      {isOrch && (
                        <span className="rounded-full bg-accent px-3 py-1 font-sans text-[12px] font-bold tracking-wide text-paper uppercase">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-5 text-lg leading-relaxed text-ink-soft sm:text-xl">
                    {a.blurb}
                  </p>
                </div>
                </div>

                {/* video directly below the card */}
                {video && (
                  <div className="mt-6" data-parallax="video">
                    <VideoCard src={video} label={a.name} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
