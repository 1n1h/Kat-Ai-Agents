"use client";

import { useEffect, useState } from "react";
import { Download, Check, X } from "lucide-react";

/**
 * "Download for desktop" — installs the app as a standalone PWA.
 *
 * When the browser fires `beforeinstallprompt` we capture it and trigger the
 * native install on click (Chrome/Edge desktop). Browsers that don't support
 * programmatic install (Safari, Firefox) get a short instruction card instead.
 * Hidden entirely when already running installed (standalone display mode).
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

  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setHelpOpen(true);
    }
  };

  const base =
    "group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-medium transition-all";
  const styles =
    variant === "solid"
      ? "bg-accent text-paper font-semibold shadow-lg hover:bg-accent-soft hover:shadow-xl"
      : "border border-line-strong bg-panel/60 text-ink backdrop-blur-sm hover:bg-panel-deep";

  return (
    <div className="relative inline-block">
      <button onClick={onClick} className={`${base} ${styles} ${className}`}>
        <Download className="h-4 w-4" />
        Download for desktop
      </button>

      {helpOpen && (
        <div className="absolute top-full left-1/2 z-50 mt-3 w-[290px] -translate-x-1/2 rounded-2xl border border-line-strong bg-panel p-4 text-left shadow-2xl">
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
              In <strong className="text-ink">Chrome or Edge</strong>, click the
              install icon in the address bar (a monitor with a ⊕).
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              Or open the browser menu → <strong className="text-ink">Install
              Sheehe AI</strong>.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              On a Mac with Safari: <strong className="text-ink">File → Add to
              Dock</strong>.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
