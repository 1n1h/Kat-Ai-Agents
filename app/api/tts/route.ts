import { NextRequest } from "next/server";
import type { KokoroTTS } from "kokoro-js";

export const runtime = "nodejs";
export const maxDuration = 600;

/**
 * Open-source TTS via Kokoro-82M (ONNX, runs locally on CPU). The model
 * (~90MB quantized) downloads to the HF cache on first use, then it's
 * offline. Voice af_heart is the highest-rated English voice.
 */
let ttsPromise: Promise<KokoroTTS> | null = null;
function getTTS(): Promise<KokoroTTS> {
  // dynamic import: the kokoro/onnx stack is excluded from cloud deploys
  // (250MB function limit) — this route is a local-install feature for now
  ttsPromise ??= import("kokoro-js").then((m) =>
    m.KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8",
      device: "cpu",
    }),
  );
  return ttsPromise;
}

/** Strip markdown so the voice reads prose, not syntax. */
function speakable(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " Code block omitted. ")
    .replace(/\|[^\n]*\|/g, " ") // table rows
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2400);
}

const VOICES = new Set([
  "af_heart",
  "af_bella",
  "af_nicole",
  "am_michael",
  "am_fenrir",
  "bf_emma",
  "bm_george",
]);

export async function POST(req: NextRequest) {
  const { text, voice } = (await req.json()) as {
    text?: string;
    voice?: string;
  };
  const clean = speakable(text ?? "");
  if (!clean) {
    return Response.json({ error: "Nothing to read." }, { status: 400 });
  }
  const chosen = voice && VOICES.has(voice) ? voice : "af_heart";

  try {
    const tts = await getTTS();
    // allowlisted above; cast narrows to kokoro-js's voice union
    const audio = await tts.generate(clean, { voice: chosen as "af_heart" });
    const wav = audio.toWav();
    return new Response(wav, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // a failed model download would otherwise poison every later request
    ttsPromise = null;
    // cloud deploys exclude the kokoro stack — fall back to ElevenLabs there
    const el = await elevenLabsTTS(clean);
    if (el) return el;
    return Response.json(
      { error: err instanceof Error ? err.message : "TTS failed." },
      { status: 500 },
    );
  }
}

/**
 * ElevenLabs fallback for cloud sessions. Flash model + 64kbps mp3 keeps
 * per-character cost minimal; voice-mode replies are already brief.
 */
async function elevenLabsTTS(text: string): Promise<Response | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  // Sarah (premade) — available on free-tier API keys, unlike legacy
  // library voices. Override with ELEVENLABS_VOICE_ID if desired.
  const voiceId =
    process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 1500),
          model_id: "eleven_flash_v2_5",
        }),
      },
    );
    if (!res.ok) return null;
    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return null;
  }
}
