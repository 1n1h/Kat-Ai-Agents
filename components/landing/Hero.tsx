"use client";

import { ArrowRight } from "lucide-react";

export default function Hero({
  onRequestAccess,
  onSignIn,
}: {
  onRequestAccess: () => void;
  onSignIn: () => void;
}) {
  return (
    <section className="grain relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16 text-center">
      {/* drifting accent wash */}
      <div
        aria-hidden
        className="drift pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 30%, var(--color-accent-wash), transparent 70%)",
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

      <p className="rise rise-1 mb-6 font-mono text-[11px] tracking-[0.32em] text-accent uppercase">
        The AI workspace for attorneys
      </p>

      <h1 className="rise rise-2 max-w-4xl font-serif text-[2.6rem] leading-[1.05] text-ink sm:text-6xl md:text-7xl">
        A team of legal specialists,
        <br className="hidden sm:block" />{" "}
        <span className="sheen">orchestrated for you.</span>
      </h1>

      <p className="rise rise-3 mt-7 max-w-2xl text-[17px] leading-relaxed text-ink-soft sm:text-xl">
        Litigation analysis, contract review, drafting, and citation check —
        each a specialist in its own right, working under one orchestrator that
        delegates, sequences, and verifies. Every finding cited. Every draft
        audited before it reaches you.
      </p>

      <div className="rise rise-4 mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={onRequestAccess}
          className="group flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-[15px] font-semibold text-paper shadow-lg transition-all hover:bg-accent-soft hover:shadow-xl"
        >
          Request access
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
        <button
          onClick={onSignIn}
          className="rounded-full border border-line-strong bg-panel/60 px-7 py-3.5 text-[15px] font-medium text-ink backdrop-blur-sm transition-colors hover:bg-panel-deep"
        >
          Sign in
        </button>
      </div>

      <p className="rise rise-5 mt-7 font-mono text-[11px] tracking-[0.18em] text-faint uppercase">
        Privileged &amp; confidential · Matter-isolated by design
      </p>
    </section>
  );
}
