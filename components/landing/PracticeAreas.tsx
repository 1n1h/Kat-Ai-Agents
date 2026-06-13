"use client";

import { useEffect, useRef, useState } from "react";
import { useReveal, revealClass } from "./useReveal";

type Area = { name: string; blurb: string; img: string };

/**
 * The firm's scope of practice (firm/company-profile.md). Images are topical
 * stock placeholders (loremflickr, deterministic via ?lock=) — swap each `img`
 * for a curated Unsplash photo or a firm image when ready.
 */
const AREAS: Area[] = [
  {
    name: "Commercial Litigation",
    blurb: "Contract, construction, real estate, securities & antitrust.",
    img: "https://loremflickr.com/600/800/skyscraper,business?lock=21",
  },
  {
    name: "Civil Trial Practice",
    blurb: "100+ jury trials in Florida state and federal courts.",
    img: "https://loremflickr.com/600/800/courtroom,courthouse?lock=22",
  },
  {
    name: "Insurance Litigation",
    blurb: "Defense for insurers and self-insured corporations.",
    img: "https://loremflickr.com/600/800/hurricane,storm?lock=23",
  },
  {
    name: "Products Liability",
    blurb: "Defense and subrogation recovery for corporate clients.",
    img: "https://loremflickr.com/600/800/warehouse,logistics?lock=34",
  },
  {
    name: "Equine Law",
    blurb: "Sale, breeding & insurance disputes — Ocala to Wellington.",
    img: "https://loremflickr.com/600/800/horse,equestrian?lock=25",
  },
  {
    name: "Mediation & Arbitration",
    blurb: "Florida-certified neutrals for complex disputes.",
    img: "https://loremflickr.com/600/800/handshake,meeting?lock=26",
  },
  {
    name: "Corporate Counseling",
    blurb: "Systems that reduce and prevent legal exposure.",
    img: "https://loremflickr.com/600/800/office,boardroom?lock=27",
  },
];

const RADIUS = 480;
const CARD_W = 280;
const CARD_H = 380;
const SPEED = 0.06; // degrees per frame

export default function PracticeAreas() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const [rotation, setRotation] = useState(0);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tick = () => {
      if (!pausedRef.current) setRotation((r) => r + SPEED);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const anglePer = 360 / AREAS.length;

  return (
    <section className="overflow-hidden px-6 py-24 sm:py-32">
      <div ref={ref} className="mx-auto max-w-6xl">
        <div className={revealClass(shown, "text-center")}>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
            Areas of practice
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl font-serif text-5xl leading-[1.05] text-ink sm:text-6xl">
            AI Paralegals
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            Trained on most legal fields.
          </p>
        </div>

        <div className={revealClass(shown, "mt-12")}>
          <div
            className="relative mx-auto flex items-center justify-center"
            style={{ height: CARD_H + 70, perspective: "2000px" }}
            onMouseEnter={() => {
              pausedRef.current = true;
            }}
            onMouseLeave={() => {
              pausedRef.current = false;
            }}
          >
            <div
              className="relative h-full w-full"
              style={{
                transform: `rotateY(${rotation}deg)`,
                transformStyle: "preserve-3d",
              }}
            >
              {AREAS.map((a, i) => {
                const itemAngle = i * anglePer;
                const rel = (itemAngle + (rotation % 360) + 360) % 360;
                const norm = Math.abs(rel > 180 ? 360 - rel : rel);
                const opacity = Math.max(0.25, 1 - norm / 180);
                return (
                  <div
                    key={a.name}
                    className="absolute top-1/2 left-1/2"
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      marginLeft: -CARD_W / 2,
                      marginTop: -CARD_H / 2,
                      transform: `rotateY(${itemAngle}deg) translateZ(${RADIUS}px)`,
                      opacity,
                      transition: "opacity 0.3s linear",
                    }}
                  >
                    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-line-strong shadow-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.img}
                        alt={a.name}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      <div className="absolute bottom-0 left-0 w-full p-5 text-white">
                        <h3 className="font-serif text-2xl leading-tight">
                          {a.name}
                        </h3>
                        <p className="mt-1.5 text-[13px] leading-snug text-white/85">
                          {a.blurb}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
