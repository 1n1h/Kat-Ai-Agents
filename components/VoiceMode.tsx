"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import Spinner from "./Spinner";

/* Minimal Web Speech API surface (Chrome/Edge ship it as webkit-prefixed). */
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRAlternative;
}
interface SREvent {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function makeRecognizer(): SpeechRec | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.continuous = false; // auto-stop on silence = natural turn-taking
  rec.interimResults = true;
  return rec;
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export default function VoiceMode({
  open,
  onClose,
  ask,
  agentName,
}: {
  open: boolean;
  onClose: () => void;
  /** sends the spoken text through the normal chat pipeline, returns the reply */
  ask: (text: string) => Promise<string>;
  agentName: string;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [lastHeard, setLastHeard] = useState("");
  const [error, setError] = useState("");

  const recRef = useRef<SpeechRec | null>(null);
  const finalRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const closedRef = useRef(false);
  const stateRef = useRef<VoiceState>("idle");
  stateRef.current = state;

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
  }

  function listen() {
    if (closedRef.current) return;
    const rec = recRef.current;
    if (!rec) return;
    finalRef.current = "";
    setInterim("");
    setState("listening");
    try {
      rec.start();
    } catch {
      /* start() throws if already running — safe to ignore */
    }
  }

  async function converse(text: string) {
    setLastHeard(text);
    setState("thinking");
    let reply = "";
    try {
      reply = await ask(text);
    } catch {
      reply = "";
    }
    if (closedRef.current) return;
    if (!reply) {
      listen();
      return;
    }
    setState("speaking");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      });
      if (!res.ok) throw new Error("tts failed");
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (!closedRef.current) listen();
      };
      await audio.play();
    } catch {
      if (!closedRef.current) listen();
    }
  }

  /* lifecycle: wire the recognizer while the overlay is open */
  useEffect(() => {
    if (!open) return;
    closedRef.current = false;
    setError("");
    setLastHeard("");

    const rec = makeRecognizer();
    if (!rec) {
      setError(
        "Voice input needs the Web Speech API — use Chrome or Edge for now.",
      );
      return;
    }
    recRef.current = rec;

    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText || finalRef.current);
    };
    rec.onend = () => {
      if (closedRef.current || stateRef.current !== "listening") return;
      const text = finalRef.current.trim();
      if (text) void converse(text);
      else listen(); // heard nothing — keep listening
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        setError("Microphone access was blocked — allow it and try again.");
        setState("idle");
      }
      // "no-speech" and friends fall through to onend, which restarts
    };

    listen();

    return () => {
      closedRef.current = true;
      rec.onend = null;
      rec.onresult = null;
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      recRef.current = null;
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function orbTap() {
    if (state === "speaking") {
      stopAudio();
      listen(); // interrupt the agent, take the floor
    } else if (state === "listening") {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      setState("idle");
      setInterim("");
    } else if (state === "idle") {
      listen();
    }
  }

  const caption =
    state === "listening"
      ? interim || "Listening…"
      : state === "thinking"
        ? lastHeard
        : state === "speaking"
          ? "Tap to interrupt"
          : "Tap the circle to speak";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper/95 backdrop-blur-md">
      <button
        onClick={onClose}
        aria-label="Exit voice mode"
        className="absolute top-5 right-5 rounded-lg p-2 text-muted transition-colors hover:bg-panel-deep hover:text-ink"
      >
        <X className="h-5 w-5" />
      </button>

      <p className="mb-10 font-sans text-[12px] font-semibold tracking-[0.22em] text-accent uppercase">
        {agentName} — voice
      </p>

      <button
        onClick={orbTap}
        aria-label="Toggle microphone"
        className={`flex h-44 w-44 items-center justify-center rounded-full border-2 transition-colors ${
          state === "listening"
            ? "orb-listen border-accent bg-accent-wash"
            : state === "speaking"
              ? "orb-speak border-accent bg-accent-wash"
              : "border-line-strong bg-panel"
        }`}
      >
        {state === "thinking" ? (
          <Spinner size={56} />
        ) : state === "idle" ? (
          <MicOff className="h-10 w-10 text-muted" />
        ) : (
          <Mic className="h-10 w-10 text-accent" />
        )}
      </button>

      <p className="mt-10 max-w-md px-6 text-center font-serif text-xl leading-relaxed text-ink-soft">
        {error || caption}
      </p>

      <p className="mt-3 font-mono text-[11px] tracking-wider text-faint">
        {state === "thinking"
          ? "on the record…"
          : "pause naturally and the agent will answer"}
      </p>
    </div>
  );
}
