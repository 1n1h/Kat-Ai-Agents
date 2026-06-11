import { NextRequest } from "next/server";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
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
}

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

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local." },
      { status: 500 },
    );
  }

  const { messages, agentId, matterId } = (await req.json()) as ChatRequest;
  if (!messages?.length) {
    return Response.json({ error: "No messages." }, { status: 400 });
  }

  const cwd = matterDir(matterId);
  const promptText = buildPrompt(messages);

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
