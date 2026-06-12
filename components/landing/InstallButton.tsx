"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Check, X } from "lucide-react";

/**
 * "Download for desktop" — installs the app as a standalone PWA.
 *
 * When the browser fires `beforeinstallprompt` we capture it and trigger the
 * native install on click (Chrome/Edge desktop). Browsers that don't support
 * programmatic install (Safari, Firefox) get a short instruction card instead.
 * Hidden entirely when already running installed (standalone display mode).
 *
 * The instruction card is rendered through a portal to <body> with fixed
 * coordinates. That's required here: the hero's `.rise` load-animation
 * elements keep a lingering `transform`, which becomes the containing block /
 * stacking context for an absolutely-positioned child — so an in-tree popover
 * gets painted behind the hero film below and collides with the caption. The
 * portal escapes that trap.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallButton({
  className = "",
  variant = "solid",
}: {
  className?: string;
  variant?: "solid" | "outline";
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(
    null,
  );

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setHelpOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const place = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 12;
    const gap = 10;
    const width = Math.min(300, window.innerWidth - margin * 2);
    // center on the trigger, then clamp inside the viewport
    const left = Math.min(
      Math.max(margin, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - margin,
    );
    const top = rect.bottom + gap;
    setPos({ left, top, width });
  }, []);

  useLayoutEffect(() => {
    if (!helpOpen) return;
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [helpOpen, place]);

  useEffect(() => {
    if (!helpOpen) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !cardRef.current?.contains(t)) {
        setHelpOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [helpOpen]);

  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setHelpOpen((o) => !o);
    }
  };

  const base =
    "group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium transition-all";
  const styles =
    variant === "solid"
      ? "bg-accent text-paper font-semibold shadow-lg hover:bg-accent-soft hover:shadow-xl"
      : "border border-line-strong bg-panel/60 text-ink backdrop-blur-sm hover:bg-panel-deep";

  return (
    <>
      <button
        ref={btnRef}
        onClick={onClick}
        className={`${base} ${styles} ${className}`}
      >
        <Download className="h-4 w-4" />
        Download for desktop
      </button>

      {helpOpen &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={cardRef}
            className="pop fixed z-[200] rounded-2xl border border-line-strong bg-panel p-4 text-left shadow-2xl"
            style={{ left: pos.left, top: pos.top, width: pos.width }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-[10px] tracking-[0.22em] text-accent uppercase">
                Install Sheehe AI
              </p>
              <button
                onClick={() => setHelpOpen(false)}
                className="-mt-1 -mr-1 rounded-full p-1 text-faint transition-colors hover:text-ink"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-soft">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span>
                  In <strong className="text-ink">Chrome or Edge</strong>, click
                  the install icon in the address bar (a monitor with a ⊕).
                </span>
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span>
                  Or open the browser menu →{" "}
                  <strong className="text-ink">Install Sheehe AI</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                <span>
                  On a Mac with Safari:{" "}
                  <strong className="text-ink">File → Add to Dock</strong>.
                </span>
              </li>
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
