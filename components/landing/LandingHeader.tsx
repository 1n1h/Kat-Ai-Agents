"use client";

import { FirmMark } from "@/components/FirmLogo";

/**
 * Landing header — intentionally chromeless. No bar, border, or backdrop: just
 * the firm mark and the Sign-in button floating over the page. It's `fixed`
 * (out of flow) so it reserves no row — the hero footage runs all the way to
 * the top behind it — and click-through (pointer-events-none) so the empty
 * space never intercepts hovers/clicks beneath it; only the mark and button
 * re-enable pointer events.
 */
export default function LandingHeader({ onSignIn }: { onSignIn: () => void }) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-3.5 sm:px-8">
      <div className="pointer-events-auto flex items-center gap-2">
        <FirmMark className="h-7 w-7 text-accent" />
        <span className="font-serif text-lg text-ink">
          Sheehe <span className="text-accent">&amp;</span> Associates
        </span>
      </div>

      <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
        <button
          onClick={onSignIn}
          className="rounded-full bg-accent px-5 py-2 text-[14px] font-semibold text-paper shadow transition-colors hover:bg-accent-soft"
        >
          Sign in
        </button>
      </div>
    </header>
  );
}
