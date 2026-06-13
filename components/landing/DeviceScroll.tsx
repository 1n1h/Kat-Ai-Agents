"use client";

import { useEffect, useRef, type ReactNode } from "react";
import BgHaze from "./BgHaze";

/**
 * Scroll-driven device reveal (the "iPad tilt"): the framed screen starts
 * angled back and rotates to front-facing as you scroll, then HOLDS flat for a
 * stretch of scroll so you can take it in, before the page continues. Driven by
 * GSAP scrub against the landing's own scroller (#landing-scroll) — no
 * framer-motion, no window-scroll hijacking. Static + flat under reduced motion.
 */
export default function DeviceScroll({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

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
        gsap.set(frameRef.current, { rotateX: 22, scale: 1.05 });

        const tl = gsap.timeline({
          scrollTrigger: {
            scroller,
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
          },
        });
        // tilt to front-facing over the first ~55% of the scroll …
        tl.to(
          frameRef.current,
          { rotateX: 0, scale: 1, ease: "none", duration: 0.55 },
          0,
        )
          .to(titleRef.current, { y: -64, ease: "none", duration: 0.55 }, 0)
          // … then hold it flat for the rest (the "see it front-facing" beat)
          .to({}, { duration: 0.5 });
      }, sectionRef);

      ScrollTrigger.refresh();
    })();

    return () => {
      killed = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[210vh]">
      <div
        className="sticky top-0 flex h-dvh flex-col items-center justify-center overflow-hidden px-6"
        style={{ perspective: "1300px" }}
      >
        <BgHaze />

        <div
          ref={titleRef}
          className="relative z-10 mb-9 w-full max-w-4xl text-center sm:mb-11"
        >
          {title}
        </div>

        {/* device frame — thin brass body rim, then a uniform black bezel,
            then the screen (like an actual iPad) */}
        <div
          ref={frameRef}
          className="relative z-10 mx-auto w-full max-w-5xl rounded-[44px] p-1.5 shadow-2xl"
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: "center top",
            background: "var(--color-accent)",
          }}
        >
          <div className="rounded-[38px] bg-black p-3.5">
            <div className="overflow-hidden rounded-[24px]">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
