import { NextRequest } from "next/server";
import { mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import {
  ORCHESTRATOR_MODEL,
  ORCHESTRATOR_PROMPT,
  MODEL_IDS,
  SPECIALISTS,
} from "@/agents/registry";
import type { AgentId } from "@/lib/agent-meta";

export const runtime = "nodejs";
export const maxDuration = 600;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  agentId: AgentId;
  matterId: string;
  /** voice mode: replies are spoken aloud, so keep them short */
  voice?: boolean;
}

const VOICE_NOTE =
  "\n\n[Voice mode: the user is speaking aloud and will hear this reply as " +
  "speech. Answer in at most three short sentences of plain prose — no " +
  "markdown, no lists, no headings. Offer to go deeper instead of " +
  "elaborating unprompted.]";

const CLOUD_NOTE =
  "\n\n[Cloud session: file tools are unavailable here. Work from the " +
  "conversation only, and ask the user to paste any document text they " +
  "want analyzed. The full file workspace runs on the firm's local " +
  "install.]";

const sanitize = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);

/** Each matter gets its own working directory; agents only ever see that dir. */
function matterDir(matterId: string): string {
  const dir = join(process.cwd(), "uploads", sanitize(matterId) || "general");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * The SDK is single-prompt per query; we carry the thread by replaying it as
 * a transcript (same approach as the original standalone agents).
 */
function buildPrompt(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}

const enc = new TextEncoder();
const line = (obj: unknown) => enc.encode(JSON.stringify(obj) + "\n");

/**
 * Cloud fallback: no agent runtime or disk, so chat runs on the direct
 * Anthropic API. "Auto" becomes a fast haiku router that picks the
 * specialist, whose persona then answers with streamed deltas.
 */
async function cloudChat(
  messages: ChatMessage[],
  agentId: AgentId,
  voice?: boolean,
): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let chosen = agentId as Exclude<AgentId, "auto">;
        if (agentId === "auto" || !SPECIALISTS[chosen]) {
          controller.enqueue(line({ t: "status", text: "triaging request" }));
          const pick = await client.messages.create({
            model: MODEL_IDS.haiku,
            max_tokens: 16,
            system:
              "You route legal requests to a specialist. Reply with exactly " +
              "one id and nothing else: litigation-analysis | " +
              "contract-review | drafting | citation-check | strategy.",
            messages: [
              {
                role: "user",
                content: messages[messages.length - 1].content.slice(0, 4000),
              },
            ],
          });
          const id = (
            pick.content[0]?.type === "text" ? pick.content[0].text : ""
          ).trim();
          chosen = (
            id in SPECIALISTS ? id : "strategy"
          ) as Exclude<AgentId, "auto">;
          controller.enqueue(
            line({ t: "status", text: `delegating: ${chosen}` }),
          );
        }

        const spec = SPECIALISTS[chosen];
        const s = client.messages.stream({
          model:
            MODEL_IDS[(spec.model ?? "sonnet") as keyof typeof MODEL_IDS],
          max_tokens: 8000,
          system: spec.prompt + CLOUD_NOTE + (voice ? VOICE_NOTE : ""),
          messages: messages.map(({ role, content }) => ({ role, content })),
        });
        s.on("text", (t) => controller.enqueue(line({ t: "delta", text: t })));
        await s.finalMessage();
        controller.enqueue(line({ t: "done" }));
      } catch (err) {
        controller.enqueue(
          line({
            t: "error",
            text: err instanceof Error ? err.message : String(err),
          }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." },
      { status: 500 },
    );
  }

  const { messages, agentId, matterId, voice } =
    (await req.json()) as ChatRequest;
  if (!messages?.length) {
    return Response.json({ error: "No messages." }, { status: 400 });
  }

  // the agent runtime is excluded from cloud deploys (function size limit);
  // import it lazily and fall back to the direct Anthropic API there
  let query: typeof import("@anthropic-ai/claude-agent-sdk").query | null =
    null;
  let cwd = "";
  try {
    ({ query } = await import("@anthropic-ai/claude-agent-sdk"));
    cwd = matterDir(matterId);
  } catch {
    query = null;
  }
  if (!query || !cwd) {
    return cloudChat(messages, agentId, voice);
  }

  const promptText = buildPrompt(messages) + (voice ? VOICE_NOTE : "");

  const isAuto = agentId === "auto" || !SPECIALISTS[agentId as never];
  const spec = isAuto ? null : SPECIALISTS[agentId as Exclude<AgentId, "auto">];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const q = query({
          prompt: promptText,
          options: {
            cwd,
            permissionMode: "bypassPermissions",
            systemPrompt: isAuto ? ORCHESTRATOR_PROMPT : spec!.prompt,
            model: isAuto
              ? ORCHESTRATOR_MODEL
              : MODEL_IDS[(spec!.model ?? "sonnet") as keyof typeof MODEL_IDS],
            ...(isAuto
              ? { agents: SPECIALISTS, allowedTools: ["Task"] }
              : { allowedTools: (spec!.tools as string[]) ?? [] }),
          },
        });

        for await (const msg of q) {
          if (msg.type === "assistant") {
            for (const block of msg.message.content) {
              if (block.type === "text" && block.text.trim()) {
                controller.enqueue(line({ t: "text", text: block.text }));
              } else if (block.type === "tool_use") {
                // surface files the agents create/modify so the UI can
                // offer downloads under the response
                if (block.name === "Write" || block.name === "Edit") {
                  const p = (block.input as { file_path?: string })?.file_path;
                  if (p) {
                    controller.enqueue(line({ t: "file", name: basename(p) }));
                  }
                }
                const status =
                  block.name === "Task"
                    ? `delegating: ${(block.input as { subagent_type?: string })?.subagent_type ?? "specialist"}`
                    : `working: ${block.name.toLowerCase()}`;
                controller.enqueue(line({ t: "status", text: status }));
              }
            }
          } else if (msg.type === "result") {
            if (msg.subtype !== "success") {
              controller.enqueue(
                line({ t: "error", text: `Run ended: ${msg.subtype}` }),
              );
            }
          }
        }
        controller.enqueue(line({ t: "done" }));
      } catch (err) {
        controller.enqueue(
          line({ t: "error", text: err instanceof Error ? err.message : String(err) }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
