"use client";

import { useEffect, useState } from "react";
import {
  AudioLines,
  FileDown,
  FolderLock,
  Mic,
  Plug,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { useReveal, revealClass } from "./useReveal";
import BgHaze from "./BgHaze";

interface Capability {
  icon: LucideIcon;
  title: string;
  body: string;
}

const CAPS: Capability[] = [
  {
    icon: AudioLines,
    title: "Hands-free voice",
    body: "Hold a real conversation with your matter. Speak, and it answers aloud — interrupt any time to redirect. Built for the drive between hearings.",
  },
  {
    icon: Mic,
    title: "Dictation, not transcription theater",
    body: "Tap to dictate; your words land in the composer as clean text you can edit before anything is sent. Nothing leaves until you say so.",
  },
  {
    icon: UploadCloud,
    title: "Drop in the record",
    body: "Upload depositions, discovery, and contracts straight into a matter. The analysts read only that matter's files — never another client's.",
  },
  {
    icon: FileDown,
    title: "Court-ready deliverables",
    body: "Drafts come back as real documents — one-click export to PDF and Word for letters and briefs, Excel for tabular work product.",
  },
  {
    icon: FolderLock,
    title: "Matter-isolated by design",
    body: "Every conversation and file belongs to a matter with its own workspace. Agents can never reach across cases.",
  },
  {
    icon: Plug,
    title: "Connected to your stack",
    body: "Bring the firm's systems into the case — Gmail, Drive, Docs, Calendar, Slack, NetDocuments, and SharePoint.",
  },
];

// ── fan geometry ──────────────────────────────────────────────
const CARD_W = 480;
const CARD_H = 360;
const SPACING = 268; // horizontal step between cards
const STEP_DEG = 7; // rotation per step
const DEPTH = 110; // z push per step
const TILT = 6; // rotateX on inactive cards
const MAX_OFF = 2; // neighbors shown each side
const ADVANCE_MS = 4200; // slow auto-advance

/** Minimal signed offset from active to i, wrapping around the loop. */
function signedOffset(i: number, active: number, len: number) {
  const raw = i - active;
  const alt = raw > 0 ? raw - len : raw + len;
  return Math.abs(alt) < Math.abs(raw) ? alt : raw;
}

export default function Capabilities() {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const len = CAPS.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // slow, self-running advance — pauses on hover, off under reduced motion
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    if (paused) return;
    const id = window.setInterval(
      () => setActive((a) => (a + 1) % len),
      ADVANCE_MS,
    );
    return () => window.clearInterval(id);
  }, [paused, len]);

  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32">
      <BgHaze />
      <div ref={ref} className="relative z-10 mx-auto max-w-6xl">
        <div className={revealClass(shown)}>
          <h2 className="mx-auto max-w-4xl text-center font-serif text-5xl leading-[1.05] text-ink sm:text-6xl md:text-7xl">
            Features
          </h2>
        </div>

        <div
          className={revealClass(shown, "mt-16")}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className="relative mx-auto"
            style={{ height: CARD_H + 80, perspective: "1200px" }}
          >
            <div
              className="absolute inset-0"
              style={{ transformStyle: "preserve-3d" }}
            >
              {CAPS.map((c, i) => {
                const off = signedOffset(i, active, len);
                const abs = Math.abs(off);
                if (abs > MAX_OFF) return null;
                const isActive = off === 0;
                const Icon = c.icon;
                const transform = [
                  `translateX(${off * SPACING}px)`,
                  `translateY(${isActive ? -14 : abs * 10}px)`,
                  `translateZ(${-abs * DEPTH}px)`,
                  `rotateZ(${off * STEP_DEG}deg)`,
                  `rotateX(${isActive ? 0 : TILT}deg)`,
                  `scale(${isActive ? 1.04 : 0.9})`,
                ].join(" ");
                return (
                  <button
                    key={c.title}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={c.title}
                    className="absolute top-1/2 left-1/2 rounded-3xl border border-line-strong bg-panel p-8 text-left shadow-2xl transition-all duration-500 ease-out"
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      marginLeft: -CARD_W / 2,
                      marginTop: -CARD_H / 2,
                      zIndex: 50 - abs,
                      opacity: 1 - abs * 0.16,
                      transform,
                      cursor: isActive ? "default" : "pointer",
                    }}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/30">
                      <Icon className="h-7 w-7" />
                    </span>
                    <h3 className="mt-5 font-sans text-2xl font-bold text-ink">
                      {c.title}
                    </h3>
                    <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">
                      {c.body}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* progress dots */}
          <div className="mt-8 flex items-center justify-center gap-2">
            {CAPS.map((c, i) => (
              <button
                key={c.title}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show ${c.title}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === active
                    ? "w-7 bg-accent"
                    : "w-2 bg-line-strong hover:bg-accent/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
