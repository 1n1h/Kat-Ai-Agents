import { NextRequest } from "next/server";
import { togetherVision, visionEnabled } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

interface VisionRequest {
  /** raw base64 (no data: prefix) or a full data URL */
  imageBase64?: string;
  /** e.g. "image/jpeg" — used to build the data URL when only base64 is given */
  mimeType?: string;
  /** optional instruction; defaults to faithful OCR transcription */
  prompt?: string;
}

/**
 * OCR / image understanding for the mobile client. Sends a photo to a
 * vision-capable model (Together AI) and returns the transcribed / described
 * text. Used to read a document or whiteboard from the camera or library.
 */
export async function POST(req: NextRequest) {
  if (!visionEnabled()) {
    return Response.json(
      { error: "Vision is not configured (TOGETHER_API_KEY missing)." },
      { status: 500 },
    );
  }

  let body: VisionRequest;
  try {
    body = (await req.json()) as VisionRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = (body.imageBase64 ?? "").trim();
  if (!raw) return Response.json({ error: "No image provided." }, { status: 400 });

  const imageDataUrl = raw.startsWith("data:")
    ? raw
    : `data:${body.mimeType || "image/jpeg"};base64,${raw}`;

  try {
    const text = await togetherVision({
      imageDataUrl,
      prompt: body.prompt,
      maxTokens: 1800,
    });
    return Response.json({ text });
  } catch {
    // never surface the raw provider error
    return Response.json(
      { error: "Couldn't read that image. Please try a clearer photo." },
      { status: 502 },
    );
  }
}
