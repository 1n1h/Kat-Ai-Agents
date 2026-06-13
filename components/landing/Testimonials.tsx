"use client";

import { useReveal, revealClass } from "./useReveal";

type Testimonial = { name: string; role: string; quote: string };

// mock testimonials — legal practitioners on the workspace
const TESTIMONIALS: Testimonial[] = [
  {
    name: "Marcus Hale",
    role: "Managing Partner",
    quote:
      "It drafted a demand letter in the time it takes to pull the file — and every citation checked out.",
  },
  {
    name: "Priya Anand",
    role: "Litigation Associate",
    quote:
      "I dictate on the drive to the courthouse and the brief is waiting when I sit down.",
  },
  {
    name: "Daniel Cho",
    role: "Senior Associate",
    quote:
      "Contract review flagged the indemnity clause I'd have missed at 11 p.m. That's the whole game.",
  },
  {
    name: "Rebecca Stern",
    role: "Litigation Paralegal",
    quote:
      "The citation check alone earns its keep — no more chasing parallel cites by hand.",
  },
  {
    name: "Anthony Russo",
    role: "Trial Attorney",
    quote:
      "It's like adding five specialists to the team without adding five salaries.",
  },
  {
    name: "Lena Whitfield",
    role: "Of Counsel",
    quote:
      "Intake to a clean first draft in an afternoon. My associates won't work without it.",
  },
  {
    name: "Omar Haddad",
    role: "Solo Practitioner",
    quote:
      "Matter isolation means nothing ever bleeds across clients. I sleep better.",
  },
  {
    name: "Grace Müller",
    role: "Discovery Counsel",
    quote:
      "It reads the whole record and comes back with the three things that actually matter.",
  },
  {
    name: "Caleb Brooks",
    role: "Associate",
    quote:
      "I stopped micromanaging the busywork — the orchestrator just routes it and verifies.",
  },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

function TCard({ t }: { t: Testimonial }) {
  return (
    <figure className="w-64 shrink-0 rounded-2xl border border-line-strong bg-panel p-5 shadow-lg">
      <blockquote className="font-serif text-[15px] leading-relaxed text-ink">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 font-sans text-[13px] font-bold text-accent">
          {initials(t.name)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[13.5px] font-semibold text-ink">{t.name}</span>
          <span className="text-[12px] text-muted">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function Column({
  reverse = false,
  duration,
}: {
  reverse?: boolean;
  duration: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((seg) => (
        <div
          key={seg}
          className="cos-vcol flex shrink-0 flex-col gap-4"
          style={{
            animation: `cosVMarquee ${duration}s linear infinite`,
            animationDirection: reverse ? "reverse" : "normal",
          }}
        >
          {TESTIMONIALS.map((t, i) => (
            <TCard key={`${seg}-${i}`} t={t} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  const fade = (dir: string) =>
    ({
      background: `linear-gradient(${dir}, var(--color-paper), transparent)`,
    }) as const;

  return (
    <section className="overflow-hidden px-6 py-24 sm:py-32">
      <div ref={ref} className="mx-auto max-w-6xl">
        <div className={revealClass(shown, "text-center")}>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
            Testimonials
          </p>
          <h2 className="mx-auto mt-4 max-w-4xl font-serif text-5xl leading-[1.05] text-ink sm:text-6xl md:text-7xl">
            What the team is saying
          </h2>
        </div>

        {/* 3D wall of vertically scrolling testimonials */}
        <div
          className={revealClass(
            shown,
            "relative mx-auto mt-16 flex h-[460px] items-center justify-center overflow-hidden",
          )}
          style={{ perspective: "1000px" }}
        >
          <div
            className="flex gap-4"
            style={{
              transform:
                "rotateX(14deg) rotateY(-12deg) rotateZ(6deg) scale(1.08)",
            }}
          >
            <Column duration={34} />
            <Column duration={44} reverse />
            <Column duration={38} />
            <Column duration={48} reverse />
          </div>

          {/* edge fades into the paper */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/4"
            style={fade("to bottom")}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4"
            style={fade("to top")}
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/5"
            style={fade("to right")}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-1/5"
            style={fade("to left")}
          />
        </div>
      </div>
    </section>
  );
}
