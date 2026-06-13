"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import VideoCard from "./VideoCard";
import InstallButton from "./InstallButton";
import BackgroundReel from "./BackgroundReel";

/**
 * Scroll-expansion hero. A small portrait card sits centered over an ambient
 * background reel; as you scroll it unfurls — growing width-dominant to fill
 * the viewport — while the offset headline ("Win the" upper-left, "prep work."
 * lower-right) splits apart and slides away, the background dims off, and the
 * call-to-action rises in.
 *
 * Driven by GSAP scrub against the landing's own scroller (#landing-scroll), so
 * it composes with the rest of the page (no wheel/scroll hijacking). The
 * default (no-JS / reduced-motion) state shows the card expanded with the
 * headline and CTA statically in place.
 */
export default function Hero({ onSignIn }: { onSignIn: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLSpanElement>(null);
  const rightRef = useRef<HTMLSpanElement>(null);
  const pbRef = useRef<HTMLParagraphElement>(null);
  const bigRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const scroller = document.getElementById("landing-scroll");
    if (!scroller || !sectionRef.current) return;

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
        // start small + portrait; bg visible; headline together; cta hidden
        gsap.set(cardRef.current, { width: 336, height: 432 });
        gsap.set(bgRef.current, { opacity: 1 });
        gsap.set(ctaRef.current, { opacity: 0, y: 24 });

        const tl = gsap.timeline({
          scrollTrigger: {
            scroller,
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
          },
        });
        tl
          // card unfurls — width grows far more than height (capped by CSS)
          .to(cardRef.current, { width: 1680, height: 900, ease: "none" }, 0)
          // left group ("Seven" + "Powered by") slides left together
          .to([leftRef.current, pbRef.current], { xPercent: -170, ease: "none" }, 0)
          // right group ("AI Agents" + "Brown Intelligence Group") slides right together
          .to([rightRef.current, bigRef.current], { xPercent: 170, ease: "none" }, 0)
          // ambient background lingers, then dims off later in the scroll
          .to(bgRef.current, { opacity: 0, ease: "none" }, 0.5)
          // both lines fade as they clear
          .to(
            [leftRef.current, rightRef.current, pbRef.current, bigRef.current],
            { opacity: 0, ease: "none" },
            0.5,
          )
          // CTA rises in over the expanded card
          .to(ctaRef.current, { opacity: 1, y: 0, ease: "none" }, 0.64);
      }, sectionRef);

      ScrollTrigger.refresh();
    })();

    return () => {
      killed = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[200vh]">
      {/* sticky stage */}
      <div className="grain sticky top-0 h-dvh overflow-hidden">
        {/* ambient background reel — bright + sharp at the top, then washes off
            to the cream page (and the card takes over) as you scroll */}
        <div ref={bgRef} aria-hidden className="absolute inset-0 z-0">
          <BackgroundReel />
        </div>

        {/* the expanding card, centered */}
        <div
          ref={cardRef}
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "min(94vw, 84rem)",
            height: "min(82vh, 52rem)",
            maxWidth: "94vw",
            maxHeight: "82vh",
          }}
        >
          <VideoCard src="/vids/vid2.mp4" label="Live · Orchestrated run" fill />
        </div>

        {/* headline — centered, stacked; the two lines part on scroll */}
        <h1
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 text-center uppercase leading-[0.9] tracking-wide text-[2.4rem] sm:text-6xl md:text-[5.5rem]"
          style={{
            fontFamily: "var(--font-impact)",
            // bright brass, hardcoded: this sits over the dark footage, so it
            // must stay legible regardless of the cream page theme
            color: "#c9a55c",
            textShadow:
              "0 2px 10px rgba(0,0,0,0.55), 0 6px 44px rgba(0,0,0,0.6)",
          }}
        >
          <span ref={leftRef}>
            Lex <span style={{ color: "#3a6098" }}>&amp;</span> Co.
          </span>
          <span ref={rightRef}>AI Case Management</span>
        </h1>

        {/* brand lockup — under the card; the two lines part in sync with the
            headline ("Powered by" with "Seven", the name with "AI Agents") */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-[14vh] z-20 flex flex-col items-center text-center"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.55)" }}
        >
          <p
            ref={pbRef}
            className="font-mono text-base uppercase tracking-[0.32em]"
            style={{ color: "rgba(236,230,216,0.8)" }}
          >
            Powered by
          </p>
          <p
            ref={bigRef}
            className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl"
            style={{ fontFamily: "var(--font-display)", color: "#c9a55c" }}
          >
            Brown Intelligence Group
          </p>
        </div>

        {/* CTA — rises in once the card has expanded (no body copy here) */}
        <div
          ref={ctaRef}
          className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center justify-center gap-3 px-6 pb-10 sm:flex-row sm:pb-14"
        >
          <button
            onClick={onSignIn}
            className="group flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-[15px] font-semibold text-paper shadow-lg transition-all hover:bg-accent-soft hover:shadow-xl"
          >
            Open the workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <InstallButton variant="outline" />
        </div>
      </div>
    </section>
  );
}
