"use client";

import { ArrowRight } from "lucide-react";
import HeroFilm from "./HeroFilm";
import InstallButton from "./InstallButton";

export default function Hero({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="grain relative overflow-hidden px-6 pt-24 pb-16">
      {/* drifting accent wash */}
      <div
        aria-hidden
        className="drift pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 22%, var(--color-accent-wash), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--color-paper))",
        }}
      />

      <div className="mx-auto max-w-3xl text-center">
        <p className="rise rise-1 mb-6 font-mono text-[11px] tracking-[0.32em] text-accent uppercase">
          Sheehe &amp; Associates · Your AI legal team
        </p>

        <h1 className="rise rise-2 mx-auto max-w-3xl font-serif text-[2.6rem] leading-[1.05] text-ink sm:text-6xl md:text-[4.2rem]">
          Win the <span className="sheen">prep work.</span>
        </h1>

        <p className="rise rise-3 mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-ink-soft sm:text-xl">
          A specialist team that researches, drafts, and verifies every citation
          — on call, on every matter. Ask in plain language; it plans the work,
          routes each piece to the right specialist, and audits the result
          before it reaches you.
        </p>

        <div className="rise rise-4 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onSignIn}
            className="group flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-[15px] font-semibold text-paper shadow-lg transition-all hover:bg-accent-soft hover:shadow-xl"
          >
            Open the workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <InstallButton variant="outline" />
        </div>

        <p className="rise rise-5 mt-7 font-mono text-[11px] tracking-[0.18em] text-faint uppercase">
          Privileged &amp; confidential · Matter-isolated by design
        </p>
      </div>

      {/* the film */}
      <div className="rise rise-5 mx-auto mt-14 max-w-4xl">
        <HeroFilm />
      </div>
    </section>
  );
}
