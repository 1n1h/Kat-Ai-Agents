import { NextRequest } from "next/server";
import { KokoroTTS } from "kokoro-js";

export const runtime = "nodejs";
export const maxDuration = 600;

/**
 * Open-source TTS via Kokoro-82M (ONNX, runs locally on CPU). The model
 * (~90MB quantized) downloads to the HF cache on first use, then it's
 * offline. Voice af_heart is the highest-rated English voice.
 */
let ttsPromise: Promise<KokoroTTS> | null = null;
function getTTS(): Promise<KokoroTTS> {
  ttsPromise ??= KokoroTTS.from_pretrained(
    "onnx-community/Kokoro-82M-v1.0-ONNX",
    { dtype: "q8", device: "cpu" },
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

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text?: string };
  const clean = speakable(text ?? "");
  if (!clean) {
    return Response.json({ error: "Nothing to read." }, { status: 400 });
  }

  try {
    const tts = await getTTS();
    const audio = await tts.generate(clean, { voice: "af_heart" });
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
    return Response.json(
      { error: err instanceof Error ? err.message : "TTS failed." },
      { status: 500 },
    );
  }
}
