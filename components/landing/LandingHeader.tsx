"use client";

import { useEffect, useState } from "react";

/**
 * Sticky landing header. The Sign-in button is always visible — during
 * testing it's the user's own door into the workspace.
 */
export default function LandingHeader({
  onSignIn,
  onRequestAccess,
}: {
  onSignIn: () => void;
  onRequestAccess: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = document.getElementById("landing-scroll");
    const target: HTMLElement | Window = root ?? window;
    const read = () =>
      setScrolled((root ? root.scrollTop : window.scrollY) > 12);
    read();
    target.addEventListener("scroll", read, { passive: true });
    return () => target.removeEventListener("scroll", read);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 transition-colors sm:px-8 ${
        scrolled
          ? "border-b border-line bg-paper/85 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-wash">
          <span className="font-serif text-[15px] text-accent">✳</span>
        </span>
        <span className="font-serif text-lg text-ink">
          Sheehe <span className="text-accent">&amp;</span> Associates
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onRequestAccess}
          className="hidden rounded-full px-4 py-2 text-[14px] font-medium text-ink-soft transition-colors hover:text-ink sm:block"
        >
          Request access
        </button>
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
