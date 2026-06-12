"use client";

import { useReveal, revealClass } from "./useReveal";

/**
 * The teaching centerpiece: a short, real screen-recording of the app doing one
 * actual matter (ask → orchestrator routes → drafted + citation-checked answer).
 *
 * ── TO GO LIVE ──────────────────────────────────────────────────────────────
 *   1. Record a ~90s walkthrough (see the shot list Claude provided).
 *   2. Drop the file at  public/tour.mp4  and a still at  public/tour-poster.jpg
 *   3. Set TOUR_ENABLED = true below.
 * Until then this section renders nothing, so the page never shows a broken or
 * placeholder video to the associate.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const TOUR_ENABLED = false;
const TOUR_VIDEO_SRC = "/tour.mp4";
const TOUR_POSTER_SRC = "/tour-poster.jpg";

export default function TourSection() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  if (!TOUR_ENABLED) return null;

  return (
    <section className="px-6 py-20 sm:py-28">
      <div ref={ref} className="mx-auto max-w-4xl">
        <div className={revealClass(shown)}>
          <p className="text-center font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
            See it on a real matter
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Ninety seconds, start to finish.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[15.5px] leading-relaxed text-ink-soft">
            Watch one request move from a plain-language question to a drafted,
            citation-checked answer — the whole workflow, nothing staged.
          </p>
        </div>
        <div
          className={revealClass(shown, "mt-10")}
          style={{ transitionDelay: shown ? "120ms" : undefined }}
        >
          <div className="overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-2xl">
            <video
              className="aspect-video w-full"
              controls
              playsInline
              preload="metadata"
              poster={TOUR_POSTER_SRC}
            >
              <source src={TOUR_VIDEO_SRC} type="video/mp4" />
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}
