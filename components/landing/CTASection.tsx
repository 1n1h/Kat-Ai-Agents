"use client";

import { ArrowRight } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";

export default function CTASection({
  onRequestAccess,
  onSignIn,
}: {
  onRequestAccess: () => void;
  onSignIn: () => void;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <section className="px-6 py-24 sm:py-32">
      <div
        ref={ref}
        className={revealClass(
          shown,
          "grain relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-line-strong bg-panel px-8 py-16 text-center shadow-2xl sm:px-12",
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
        <h2 className="mx-auto max-w-xl font-serif text-3xl leading-tight text-ink sm:text-5xl">
          Bring a specialist team to your next matter
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          Analysis, drafting, and citation check — orchestrated, cited, and
          verified, on the record.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onRequestAccess}
            className="group flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-[15px] font-semibold text-paper shadow-lg transition-all hover:bg-accent-soft"
          >
            Request access
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={onSignIn}
            className="rounded-full border border-line-strong bg-paper/40 px-7 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-panel-deep"
          >
            I already have an account
          </button>
        </div>
      </div>
    </section>
  );
}
