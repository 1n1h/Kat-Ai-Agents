"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveal-on-scroll: returns a ref to attach to a section and whether it has
 * entered the viewport yet. Pair with the `.reveal` / `.reveal.in` classes in
 * globals.css. Reveals once, then stops observing.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  rootMargin = "0px 0px -12% 0px",
) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  return { ref, shown };
}

/** Convenience: the className string for a revealable block. */
export const revealClass = (shown: boolean, extra = "") =>
  `reveal ${shown ? "in" : ""} ${extra}`.trim();
