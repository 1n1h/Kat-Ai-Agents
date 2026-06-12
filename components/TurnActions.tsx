"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Square, Volume2 } from "lucide-react";

/** Only one turn speaks at a time. */
let currentAudio: HTMLAudioElement | null = null;
let currentStop: (() => void) | null = null;

const btn =
  "flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel-deep hover:text-ink";

export default function TurnActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [speech, setSpeech] = useState<"idle" | "loading" | "playing">("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function stop() {
    abortRef.current?.abort();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    currentStop = null;
    setSpeech("idle");
  }

  async function speak() {
    if (speech !== "idle") {
      stop();
      return;
    }
    currentStop?.(); // silence any other turn
    currentStop = stop;
    setSpeech("loading");
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error("TTS unavailable");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        setSpeech("idle");
      };
      await audio.play();
      setSpeech("playing");
    } catch {
      setSpeech("idle");
    }
  }

  return (
    <div className="mt-3 flex items-center gap-1">
      <button onClick={copy} className={btn} title="Copy">
        {copied ? (
          <Check className="h-4 w-4 text-ok" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={speak}
        className={btn}
        title={
          speech === "idle"
            ? "Read aloud (first use downloads the voice model — give it a minute)"
            : "Stop"
        }
      >
        {speech === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        ) : speech === "playing" ? (
          <Square className="h-3.5 w-3.5 text-accent" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
