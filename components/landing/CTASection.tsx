"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";
import InstallButton from "./InstallButton";

/**
 * Closing CTA. Mirror of the hero's intro: as you scroll in, the card fades up
 * while the left group (heading + "Open the workspace") slides in from the left
 * and the right group (subhead + "Download for desktop") slides in from the
 * right — settling by the bottom. The footage backdrop lives one level up (in
 * LandingPage) so it spans both this card and the footer. GSAP scrub against
 * #landing-scroll; static + settled under no-JS / reduced motion.
 */
export default function CTASection({ onSignIn }: { onSignIn: () => void }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

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
        gsap.set(cardRef.current, { opacity: 0, y: 40 });
        gsap.set([headingRef.current, openRef.current], { x: -140 });
        gsap.set([subRef.current, downloadRef.current], { x: 140 });

        const tl = gsap.timeline({
          scrollTrigger: {
            scroller,
            trigger: sectionRef.current,
            start: "top 88%",
            end: "bottom 96%",
            scrub: 0.6,
          },
        });
        tl.to(cardRef.current, { opacity: 1, y: 0, ease: "none" }, 0)
          .to([headingRef.current, openRef.current], { x: 0, ease: "none" }, 0)
          .to([subRef.current, downloadRef.current], { x: 0, ease: "none" }, 0);
      }, sectionRef);

      ScrollTrigger.refresh();
    })();

    return () => {
      killed = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative px-6 py-24 sm:py-32">
      <div
        ref={(node) => {
          ref.current = node;
          cardRef.current = node;
        }}
        className={revealClass(
          shown,
          "grain relative z-10 mx-auto max-w-4xl overflow-hidden rounded-[2rem] border-[3px] border-[#1e3a5f] bg-panel/55 px-8 py-20 text-center shadow-2xl backdrop-blur-md sm:px-12",
        )}
      >
        <div
          aria-hidden
          className="drift pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 25%, var(--color-accent-wash), transparent 70%)",
          }}
        />
        <h2
          ref={headingRef}
          className="mx-auto max-w-2xl font-serif text-5xl leading-[1.05] text-ink sm:text-7xl"
        >
          Get Started Today
        </h2>
        <p
          ref={subRef}
          className="mx-auto mt-5 max-w-xl text-xl leading-relaxed font-medium text-ink-soft sm:text-2xl"
        >
          Try it for free.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            ref={openRef}
            onClick={onSignIn}
            className="group flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-[15px] font-semibold text-paper shadow-lg transition-all hover:bg-accent-soft"
          >
            Open the workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <div ref={downloadRef}>
            <InstallButton variant="outline" />
          </div>
        </div>
      </div>
    </section>
  );
}
