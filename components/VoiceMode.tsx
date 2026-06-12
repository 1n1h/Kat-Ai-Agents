"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, X } from "lucide-react";
import Spinner from "./Spinner";
import { getSettings } from "@/lib/settings";

/**
 * Hands-free conversation:
 *   record (VAD trims silence) → ElevenLabs Scribe transcribes the turn →
 *   agent replies (voice-concise) → Kokoro speaks → listening resumes.
 * Speaking up while the agent talks interrupts it (barge-in). Only actual
 * speech turns are sent to Scribe, so transcription billing stays minimal.
 */

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

/* RMS thresholds (0..1). Barge-in is higher: echo cancellation plus margin. */
const SPEECH_START = 0.025;
const SILENCE_END_MS = 1100;
const BARGE_RMS = 0.06;
const BARGE_MS = 300;
const EMPTY_RESTART_MS = 15000; // re-arm recorder so silent blobs never grow

export default function VoiceMode({
  open,
  onClose,
  ask,
  agentName,
}: {
  open: boolean;
  onClose: () => void;
  ask: (text: string) => Promise<string>;
  agentName: string;
}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [lastHeard, setLastHeard] = useState("");
  const [error, setError] = useState("");
  const [heardYet, setHeardYet] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const closedRef = useRef(false);
  const stateRef = useRef<VoiceState>("idle");
  stateRef.current = state;

  /* per-turn VAD bookkeeping */
  const vad = useRef({ heard: false, lastVoice: 0, turnStart: 0, bargeAt: 0 });

  function rms(): number {
    const an = analyserRef.current;
    if (!an) return 0;
    const buf = new Uint8Array(an.fftSize);
    an.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) {
      const d = (v - 128) / 128;
      sum += d * d;
    }
    return Math.sqrt(sum / buf.length);
  }

  function stopAudio() {
    audioRef.current?.pause();
    audioRef.current = null;
  }

  function stopRecorder() {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  }

  function listen() {
    if (closedRef.current || !streamRef.current) return;
    chunksRef.current = [];
    vad.current = {
      heard: false,
      lastVoice: 0,
      turnStart: performance.now(),
      bargeAt: 0,
    };
    setHeardYet(false);
    const rec = new MediaRecorder(streamRef.current);
    recorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      if (closedRef.current || stateRef.current !== "listening") return;
      if (vad.current.heard) {
        void transcribe(new Blob(chunksRef.current, { type: rec.mimeType }));
      } else {
        listen(); // silence only — drop the blob, re-arm
      }
    };
    rec.start();
    setState("listening");
  }

  async function transcribe(blob: Blob) {
    setState("thinking");
    try {
      const form = new FormData();
      form.set("audio", new File([blob], "turn.webm", { type: blob.type }));
      const res = await fetch("/api/stt", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Transcription failed.");
      const text = (data.text ?? "").trim();
      if (closedRef.current) return;
      if (!text) {
        listen();
        return;
      }
      setLastHeard(text);
      await converse(text);
    } catch (err) {
      if (closedRef.current) return;
      setError(err instanceof Error ? err.message : "Transcription failed.");
      setState("idle");
    }
  }

  async function converse(text: string) {
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
        body: JSON.stringify({ text: reply, voice: getSettings().voice }),
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

  /* the VAD heartbeat — runs the whole time the overlay is open */
  function tick() {
    if (closedRef.current) return;
    const level = rms();
    const now = performance.now();
    const v = vad.current;

    if (stateRef.current === "listening") {
      if (level > SPEECH_START) {
        if (!v.heard) setHeardYet(true);
        v.heard = true;
        v.lastVoice = now;
      }
      if (v.heard && now - v.lastVoice > SILENCE_END_MS) {
        stopRecorder(); // onstop → transcribe
      } else if (!v.heard && now - v.turnStart > EMPTY_RESTART_MS) {
        stopRecorder(); // onstop → silent → re-arm
      }
    } else if (stateRef.current === "speaking") {
      if (level > BARGE_RMS) {
        if (!v.bargeAt) v.bargeAt = now;
        if (now - v.bargeAt > BARGE_MS) {
          stopAudio(); // user talked over the agent — yield the floor
          listen();
        }
      } else {
        v.bargeAt = 0;
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    closedRef.current = false;
    setError("");
    setLastHeard("");

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (closedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        src.connect(analyser);
        analyserRef.current = analyser;
        timerRef.current = setInterval(tick, 60);
        listen();
      } catch {
        setError("Microphone access was blocked — allow it and try again.");
      }
    })();

    return () => {
      closedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      stopRecorder();
      stopAudio();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      void ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function orbTap() {
    if (state === "speaking") {
      stopAudio();
      listen();
    } else if (state === "listening") {
      vad.current.heard = false; // discard whatever was buffered
      stopRecorder();
      setState("idle");
    } else if (state === "idle") {
      setError("");
      listen();
    }
  }

  const caption = error
    ? error
    : state === "listening"
      ? heardYet
        ? "Listening — pause when you're done."
        : "Listening…"
      : state === "thinking"
        ? lastHeard || "One moment…"
        : state === "speaking"
          ? "Speak up or tap to interrupt"
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
        {caption}
      </p>

      <p className="mt-3 font-mono text-[11px] tracking-wider text-faint">
        {state === "thinking"
          ? "on the record…"
          : "voice replies stay brief to keep costs down"}
      </p>
    </div>
  );
}
