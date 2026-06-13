"use client";

import { useEffect, useState } from "react";
import { FirmMark } from "@/components/FirmLogo";

/**
 * Landing header — chromeless and click-through (only the mark + Sign-in take
 * pointer events). The logo flips to WHITE while it sits over the dark hero
 * footage, then back to the brass mark + ink wordmark once you scroll past the
 * hero (where the page is cream).
 */
export default function LandingHeader({ onSignIn }: { onSignIn: () => void }) {
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const scroller = document.getElementById("landing-scroll");
    const target: HTMLElement | Window = scroller ?? window;
    const read = () => {
      const y = scroller ? scroller.scrollTop : window.scrollY;
      // white while the header still overlaps the hero footage
      setOverHero(y < window.innerHeight * 0.85);
    };
    read();
    target.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      target.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-3.5 sm:px-8">
      <div className="pointer-events-auto flex items-center gap-2">
        {/* the round seal stays brass on both the hero and the cream sections */}
        <FirmMark className="h-7 w-7 text-accent" />
        <span
          className={`font-serif text-lg transition-colors duration-300 ${
            overHero ? "text-white" : "text-ink"
          }`}
          style={
            overHero ? { textShadow: "0 1px 14px rgba(0,0,0,0.45)" } : undefined
          }
        >
          Lex{" "}
          <span style={{ color: overHero ? "#ffffff" : "#16304d" }}>&amp;</span>{" "}
          Co.
        </span>
      </div>

      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
        <button
          onClick={onSignIn}
          className="rounded-full bg-accent px-5 py-2 text-[14px] font-semibold text-paper shadow transition-colors hover:bg-accent-soft"
        >
          Sign in
        </button>
      </div>
    </header>
  );
}
