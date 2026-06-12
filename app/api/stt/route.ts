import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Speech-to-text via ElevenLabs Scribe. Billing note: Scribe charges by
 * audio duration, so the client only sends speech turns (silence-trimmed),
 * never a continuous stream.
 */
export async function POST(req: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json(
      { error: "ELEVENLABS_API_KEY is not set." },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: "No audio received." }, { status: 400 });
  }

  const out = new FormData();
  out.set("file", audio, audio.name || "turn.webm");
  out.set("model_id", "scribe_v1");
  // no "(peaceful purring)"-style annotations in legal dictation
  out.set("tag_audio_events", "false");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: out,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return Response.json(
      { error: `Transcription failed (${res.status}). ${detail.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { text?: string };
  return Response.json({ text: (data.text ?? "").trim() });
}
