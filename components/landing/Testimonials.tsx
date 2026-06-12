"use client";

import { Quote } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";

/**
 * Social proof. NOTE: these are placeholder quotes for layout — replace the
 * copy and attributions with real, approved client testimonials before this
 * page is shared publicly.
 */
interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The citation check changed how I sign off on work product. I can see every assertion traced to the record before anything goes out the door — that confidence is the whole game.",
    name: "Danielle R.",
    role: "Managing Partner · Civil litigation boutique",
  },
  {
    quote:
      "It reads a deposition the way a sharp senior associate would — timelines, contradictions, the buried admission on page 200 — and every finding points me back to the line.",
    name: "Marcus H.",
    role: "Of Counsel · Commercial litigation",
  },
  {
    quote:
      "I dictate on the drive back from court and a clean first draft is waiting, built only from the findings my analysts produced. It respects what the record actually says.",
    name: "Priya N.",
    role: "Solo practitioner · Family law",
  },
];

export default function Testimonials() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <section className="px-6 py-20 sm:py-28">
      <div ref={ref} className="mx-auto max-w-5xl">
        <div className={revealClass(shown)}>
          <p className="text-center font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
            From the practice
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Built for how attorneys actually work
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.name}
              className={revealClass(
                shown,
                "flex flex-col rounded-3xl border border-line bg-panel p-6",
              )}
              style={{ transitionDelay: shown ? `${i * 90}ms` : undefined }}
            >
              <Quote className="h-7 w-7 text-accent/50" />
              <blockquote className="mt-3 flex-1 font-serif text-[16.5px] leading-relaxed text-ink-soft">
                {t.quote}
              </blockquote>
              <figcaption className="mt-5 border-t border-line pt-4">
                <span className="block font-sans text-[14px] font-semibold text-ink">
                  {t.name}
                </span>
                <span className="block font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
                  {t.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
