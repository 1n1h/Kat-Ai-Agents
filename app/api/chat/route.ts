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
import { firmContext } from "@/lib/firmContext";

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
  /** signed-in email — matches an employee profile for context injection */
  userEmail?: string | null;
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

/** User-facing professional role for each specialist (no persona names). */
const ROLE_NAMES: Record<Exclude<AgentId, "auto">, string> = {
  "litigation-analysis": "Litigation Analysis",
  "contract-review": "Contract Review",
  drafting: "Drafting",
  "citation-check": "Citation Check",
  strategy: "Practice Strategy",
};

/** Keep persona first-names internal — the user only meets professional roles. */
const identityNote = (id: Exclude<AgentId, "auto">) =>
  `\n\n[Identity: to the user you are the firm's ${ROLE_NAMES[id]} specialist. ` +
  `If asked who you are, answer with that role. Never introduce yourself with ` +
  `a personal first name or persona name.]`;

/**
 * Cloud orchestrator persona. The local install runs the real Atlas via the
 * Agent SDK's Task tool; here we reproduce the single-voice contract on the
 * direct API: the user only ever talks to the orchestrator, which consults
 * specialists privately and answers in one synthesized voice.
 */
const ORCH_CLOUD_PROMPT = `You are the orchestrator of CounselOS, the single point of contact the user talks to. The user speaks only to you; they never address a specialist directly, and you never tell them to "talk to" another agent or hand them off.

You coordinate a team of specialists and speak for the whole system in one steady voice:
- Litigation Analysis — depositions, discovery, timelines, contradictions, buried admissions, evidence gaps (read-only).
- Contract Review — clause-by-clause review, redlines with proposed language, ranked risk (read-only).
- Drafting — assembles letters, briefs, and agreements from cited findings.
- Citation Check — audits a draft against its sources and returns PASS or FAIL.
- Practice Strategy — strategy and decision support for running the practice.

When a message needs real legal work, use the consult_specialist tool to delegate to the right specialist(s) in a sensible order — analysis before drafting, drafting before citation-check — passing each one all the context it needs (specialists cannot see this conversation). You may consult more than once. Then synthesize their work into a single coherent answer in your own voice. Never paste a specialist's reply verbatim as if they were addressing the user, and never adopt a specialist's name.

For greetings, small talk, clarifying questions, or questions about how you work, just answer directly, warmly, and briefly — do not consult anyone. Offer to begin when the user is ready.

You have no personal name. You are the orchestrator. Do not call yourself Atlas, Sol, Cass, Lex, Vera, or any other personal name. No em dashes in anything you draft.`;

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

type SpecialistId = Exclude<AgentId, "auto">;

const modelFor = (id: SpecialistId) =>
  MODEL_IDS[(SPECIALISTS[id].model ?? "sonnet") as keyof typeof MODEL_IDS];

const textOf = (content: { type: string; text?: string }[]) =>
  content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("")
    .trim();

/**
 * Run one specialist privately and return its text. Specialists never see the
 * conversation; the orchestrator hands them everything they need.
 */
async function runSpecialist(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  id: SpecialistId,
  instruction: string,
): Promise<string> {
  const spec = SPECIALISTS[id];
  const res = await client.messages.create({
    model: modelFor(id),
    max_tokens: 8000,
    system: spec.prompt + CLOUD_NOTE + identityNote(id),
    messages: [{ role: "user", content: instruction.slice(0, 12000) }],
  });
  return textOf(res.content) || "(no output)";
}

/**
 * Cloud fallback: no agent runtime or disk, so chat runs on the direct
 * Anthropic API.
 *
 * "Auto" runs the orchestrator as the single voice the user talks to: it
 * consults specialists privately via a tool and synthesizes one answer — the
 * cloud equivalent of the local Task-tool pipeline. A directly chosen
 * specialist answers in its own role, with persona names kept internal.
 */
async function cloudChat(
  messages: ChatMessage[],
  agentId: AgentId,
  voice?: boolean,
  userEmail?: string | null,
): Promise<Response> {
  const firmCtx = firmContext(userEmail);
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 },
    );
  }
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const convo = messages.map(({ role, content }) => ({ role, content }));
  const isAuto = agentId === "auto" || !SPECIALISTS[agentId as SpecialistId];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!isAuto) {
          // Direct specialist: stream its reply, persona name kept internal.
          const id = agentId as SpecialistId;
          const spec = SPECIALISTS[id];
          const s = client.messages.stream({
            model: modelFor(id),
            max_tokens: 8000,
            system:
              spec.prompt + CLOUD_NOTE + identityNote(id) + firmCtx +
              (voice ? VOICE_NOTE : ""),
            messages: convo,
          });
          s.on("text", (t) =>
            controller.enqueue(line({ t: "delta", text: t })),
          );
          await s.finalMessage();
          controller.enqueue(line({ t: "done" }));
          return;
        }

        // Auto: orchestrator delegates to specialists privately, then answers.
        const consultTool = {
          name: "consult_specialist",
          description:
            "Delegate a unit of work to one specialist and get their findings " +
            "or output back. Use for any substantive legal analysis, drafting, " +
            "or validation. The user never sees this exchange; you synthesize " +
            "the result into your own reply.",
          input_schema: {
            type: "object" as const,
            properties: {
              specialist: {
                type: "string",
                enum: Object.keys(SPECIALISTS),
                description: "Which specialist to consult.",
              },
              instruction: {
                type: "string",
                description:
                  "Exactly what you need this specialist to do, including all " +
                  "context they need — they cannot see the conversation.",
              },
            },
            required: ["specialist", "instruction"],
          },
        };

        controller.enqueue(line({ t: "status", text: "orchestrating" }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const turns: any[] = [...convo];
        for (let hop = 0; hop < 6; hop++) {
          const resp = await client.messages.create({
            model: ORCHESTRATOR_MODEL,
            max_tokens: 8000,
            system: ORCH_CLOUD_PROMPT + firmCtx + (voice ? VOICE_NOTE : ""),
            tools: [consultTool],
            messages: turns,
          });
          turns.push({ role: "assistant", content: resp.content });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const calls: any[] = resp.content.filter(
            (b: { type: string }) => b.type === "tool_use",
          );
          if (resp.stop_reason !== "tool_use" || calls.length === 0) {
            const final = textOf(resp.content);
            if (final) controller.enqueue(line({ t: "text", text: final }));
            break;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const results: any[] = [];
          for (const call of calls) {
            const input = (call.input ?? {}) as {
              specialist?: string;
              instruction?: string;
            };
            const id = (
              input.specialist && input.specialist in SPECIALISTS
                ? input.specialist
                : "strategy"
            ) as SpecialistId;
            controller.enqueue(
              line({ t: "status", text: `consulting: ${id}` }),
            );
            const out = await runSpecialist(
              client,
              id,
              input.instruction ?? "",
            );
            results.push({
              type: "tool_result",
              tool_use_id: call.id,
              content: out,
            });
          }
          turns.push({ role: "user", content: results });
        }

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

  const { messages, agentId, matterId, voice, userEmail } =
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
    return cloudChat(messages, agentId, voice, userEmail);
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
            systemPrompt:
              (isAuto ? ORCHESTRATOR_PROMPT : spec!.prompt) +
              firmContext(userEmail),
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
