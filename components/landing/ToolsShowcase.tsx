"use client";

import type { ComponentType, CSSProperties } from "react";
import {
  FaApple,
  FaGithub,
  FaLinkedin,
  FaMicrosoft,
  FaSlack,
} from "react-icons/fa";
import { PiMicrosoftOutlookLogoFill } from "react-icons/pi";
import {
  SiDropbox,
  SiGmail,
  SiGooglecalendar,
  SiGoogledrive,
} from "react-icons/si";
import Marquee from "./Marquee";
import { useReveal, revealClass } from "./useReveal";
import BgHaze from "./BgHaze";

type Brand = {
  name: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  color: string;
};

// recognizable, real business marks — the firm's stack plus the broader tools
const BRANDS: Brand[] = [
  { name: "Microsoft 365", icon: FaMicrosoft, color: "#D83B01" },
  { name: "Outlook", icon: PiMicrosoftOutlookLogoFill, color: "#0F6CBD" },
  { name: "Gmail", icon: SiGmail, color: "#EA4335" },
  { name: "Google Drive", icon: SiGoogledrive, color: "#4285F4" },
  { name: "Google Calendar", icon: SiGooglecalendar, color: "#34A853" },
  { name: "Dropbox", icon: SiDropbox, color: "#0061FF" },
  { name: "Slack", icon: FaSlack, color: "#4A154B" },
  { name: "LinkedIn", icon: FaLinkedin, color: "#0A66C2" },
  { name: "GitHub", icon: FaGithub, color: "#181717" },
  { name: "Apple", icon: FaApple, color: "#111111" },
];

const repeat = (n: number) => Array.from({ length: n }).flatMap(() => BRANDS);
const ROW_TOP = repeat(2);
const ROW_BOTTOM = [...repeat(2)].reverse();

function Badge({ b }: { b: Brand }) {
  return (
    <span
      title={b.name}
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-line-strong bg-paper shadow-md transition-transform duration-200 hover:scale-110"
    >
      <b.icon className="h-7 w-7" style={{ color: b.color }} />
    </span>
  );
}

export default function ToolsShowcase() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32">
      <BgHaze />
      <div ref={ref} className="relative z-10 mx-auto max-w-6xl">
        <div className={revealClass(shown, "mx-auto max-w-3xl text-center")}>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
            Connected to your stack
          </p>
          <h2 className="mt-4 font-serif text-5xl leading-[1.05] text-ink sm:text-6xl">
            Integrate with favorite tools
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-soft sm:text-xl">
            Your agents have access to your whole workflow — integrating
            seamlessly with the tools your firm already runs.
          </p>
        </div>

        {/* two rows of recognizable marks, scrolling opposite directions */}
        <div className={revealClass(shown, "mt-16 space-y-6")}>
          <Marquee durationSec={38}>
            {ROW_TOP.map((b, i) => (
              <Badge key={`${b.name}-${i}`} b={b} />
            ))}
          </Marquee>
          <Marquee durationSec={46} reverse>
            {ROW_BOTTOM.map((b, i) => (
              <Badge key={`${b.name}-${i}`} b={b} />
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
