"use client";

import { BadgeCheck, FileCheck2, Quote, ShieldAlert } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";

const PILLARS = [
  {
    icon: Quote,
    title: "Every finding is cited",
    body: "Not 'the witness seems evasive,' but 'at 42:13 the witness states X; at 118:7 the same witness states not-X.' Document, page, line, exhibit, Bates — checkable.",
  },
  {
    icon: ShieldAlert,
    title: "Never fabricates authority",
    body: "If the record doesn't contain it, the gap is the finding. Uncertain propositions are marked [VERIFY] and carried forward — never quietly invented.",
  },
  {
    icon: FileCheck2,
    title: "Findings and judgment, kept apart",
    body: "Cited facts stay structurally separate from labeled, falsifiable assessments. You always know what's anchored to the record and what's reasoning.",
  },
  {
    icon: BadgeCheck,
    title: "Every draft is validated",
    body: "Before a draft reaches you, the citation-check agent audits it against the source record on a nine-point rubric and returns an itemized PASS or FAIL.",
  },
];

export default function TrustSection() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <section className="grain px-6 py-20 sm:py-28">
      <div ref={ref} className="mx-auto max-w-5xl">
        <div className={revealClass(shown)}>
          <p className="text-center font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
            Trust, built into the architecture
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center font-serif text-3xl leading-tight text-ink sm:text-4xl">
            The guardrails a court would expect
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[15.5px] leading-relaxed text-ink-soft">
            These aren't settings you toggle on. They're enforced by how the
            agents are built — so the work you sign is grounded in the record.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className={revealClass(shown)}
                style={{ transitionDelay: shown ? `${i * 80}ms` : undefined }}
              >
                <div className="card-hover flex h-full gap-4 rounded-2xl border border-line-strong bg-panel p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/30">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-sans text-[16px] font-semibold text-ink">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
                      {p.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
