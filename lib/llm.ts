/**
 * Provider fallback — Anthropic primary, Together AI backup.
 *
 * Anthropic stays the primary engine for every agent. When an Anthropic call
 * fails for a provider-level reason (credit balance, auth, overload, rate
 * limit), we transparently fall back to Together AI's OpenAI-compatible API so
 * the product keeps responding. The fallback is text-only (no tool use) — it is
 * a safety net, not a feature-parity path.
 *
 * Set TOGETHER_API_KEY to enable. Optionally set TOGETHER_MODEL to override the
 * default open model.
 */

const TOGETHER_URL = "https://api.together.xyz/v1/chat/completions";

export const togetherEnabled = () => !!process.env.TOGETHER_API_KEY?.trim();

/** One strong, broadly-available open model covers every role in backup mode. */
export const togetherModel = () =>
  process.env.TOGETHER_MODEL?.trim() ||
  "meta-llama/Llama-3.3-70B-Instruct-Turbo";

/** A cheap, fast serverless model for the mobile client's primary chat. */
export const togetherCheapModel = () =>
  process.env.TOGETHER_MODEL_CHEAP?.trim() || "Qwen/Qwen2.5-7B-Instruct-Turbo";

/**
 * A vision-capable Together model for OCR. NOTE: on a standard serverless key,
 * Together's vision models are "non-serverless" (dedicated endpoint only), so
 * this only works if TOGETHER_VISION_MODEL points at a model your account can
 * actually reach serverless, or a dedicated endpoint.
 */
export const togetherVisionModel = () =>
  process.env.TOGETHER_VISION_MODEL?.trim() ||
  "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo";

export interface SimpleMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * True when an Anthropic error is a provider-level outage we should fail over
 * for (billing/credit, auth, rate limit, overload) — not a bug in our request.
 */
export function isProviderDown(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("credit balance") ||
    msg.includes("billing") ||
    msg.includes("quota") ||
    msg.includes("insufficient") ||
    msg.includes("rate limit") ||
    msg.includes("overloaded") ||
    msg.includes("authentication") ||
    msg.includes("401") ||
    msg.includes("429") ||
    msg.includes("529") ||
    msg.includes("api key")
  );
}

/** Anthropic's system block (string or cache-control array) → plain text. */
function systemText(system: unknown): string {
  if (typeof system === "string") return system;
  if (Array.isArray(system)) {
    return system
      .map((b) => (b && typeof b === "object" && "text" in b ? String((b as { text?: string }).text ?? "") : ""))
      .join("");
  }
  return "";
}

/** Together expects OpenAI-shaped messages with system folded in as a message. */
function toOpenAiMessages(system: unknown, messages: SimpleMessage[]) {
  const sys = systemText(system).trim();
  return [
    ...(sys ? [{ role: "system" as const, content: sys }] : []),
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];
}

/**
 * Stream a completion from Together AI, forwarding text deltas via onText.
 * Returns the full text. Throws if Together is not configured or the call
 * fails (the caller already swallowed the Anthropic error to get here).
 */
export async function streamTogether(opts: {
  system: unknown;
  messages: SimpleMessage[];
  maxTokens?: number;
  model?: string;
  onText?: (delta: string) => void;
}): Promise<string> {
  const key = process.env.TOGETHER_API_KEY?.trim();
  if (!key) throw new Error("TOGETHER_API_KEY not configured");

  const res = await fetch(TOGETHER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model ?? togetherModel(),
      messages: toOpenAiMessages(opts.system, opts.messages),
      max_tokens: opts.maxTokens ?? 1000,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Together AI error: ${res.status} ${t.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta: string = json?.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          acc += delta;
          opts.onText?.(delta);
        }
      } catch {
        /* partial SSE chunk */
      }
    }
  }
  return acc.trim();
}

/**
 * Read an image with a vision model — OCR or visual Q&A. `imageDataUrl` is a
 * full data URL ("data:image/jpeg;base64,…"). Returns the model's text.
 */
export async function togetherVision(opts: {
  imageDataUrl: string;
  prompt?: string;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.TOGETHER_API_KEY?.trim();
  if (!key) throw new Error("TOGETHER_API_KEY not configured");

  const res = await fetch(TOGETHER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: togetherVisionModel(),
      max_tokens: opts.maxTokens ?? 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                opts.prompt ||
                "Transcribe all text in this image verbatim. Preserve structure — headings, lists, tables, signatures, dates. If it is a legal document, transcribe it faithfully and note anything illegible as [illegible].",
            },
            { type: "image_url", image_url: { url: opts.imageDataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText);
    throw new Error(`Together vision error: ${res.status} ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json?.choices?.[0]?.message?.content ?? "").trim();
}

/** True when an OCR engine is configured (Together vision model). */
export const visionEnabled = () => togetherEnabled();
