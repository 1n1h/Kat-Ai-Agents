"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Infinite, seamless horizontal marquee. Renders its children twice so the
 * track can loop by translating exactly half its width. Pauses on hover and
 * falls back to a static, centered wrap under prefers-reduced-motion (see
 * globals.css). Used for the trust bar and the connectors strip.
 */
export default function Marquee({
  children,
  durationSec = 34,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  durationSec?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={`marquee ${reverse ? "marquee-reverse" : ""} ${className}`}>
      <div
        className="marquee-track"
        style={{ "--marquee-dur": `${durationSec}s` } as CSSProperties}
      >
        <div className="marquee-group">{children}</div>
        <div className="marquee-group marquee-dup" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
