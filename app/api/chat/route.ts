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
import {
  anthropicToolDefs,
  availableTools,
  executeConnectorTool,
  toolGuidance,
  type ConnectorTokens,
} from "@/lib/connectorTools";

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
  /** self-onboarded profile summary (from users/{uid}/profile/self) */
  userProfile?: string | null;
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
 * Identity suppression for the LOCAL orchestrator. The persona .md files name
 * the orchestrator and specialists (Atlas, Sol, Cass, Lex, Vera); the user must
 * never hear those — only the professional roles. (The cloud path enforces the
 * same via ORCH_CLOUD_PROMPT + identityNote.)
 */
const ORCH_IDENTITY_NOTE =
  "\n\n[Identity: you are the firm's orchestrator and speak in one steady " +
  "voice. You have no personal name, and neither do your specialists as far " +
  "as the user is concerned. NEVER reveal internal agent, model, or persona " +
  "names (e.g. Atlas, Sol, Cass, Lex, Vera) and never describe your internal " +
  "tooling or skills. If asked who you are or how you work, refer to the " +
  "specialists only by their professional roles: Litigation Analysis, " +
  "Contract Review, Drafting, Citation Check, and Practice Strategy.]";

/**
 * Cloud orchestrator persona. The local install runs the real Atlas via the
 * Agent SDK's Task tool; here we reproduce the single-voice contract on the
 * direct API: the user only ever talks to the orchestrator, which consults
 * specialists privately and answers in one synthesized voice.
 */
const ORCH_CLOUD_PROMPT = `You are the orchestrator of the Sheehe & Associates AI workspace, the single point of contact the user talks to. The user speaks only to you; they never address a specialist directly, and you never tell them to "talk to" another agent or hand them off.

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

/**
 * System prompt as a cacheable block: the persona + firm context + tool
 * guidance prefix repeats on every message and every orchestration hop, so
 * prompt caching cuts its input cost ~90% after the first call.
 */
const cachedSystem = (text: string) => [
  {
    type: "text" as const,
    text,
    cache_control: { type: "ephemeral" as const },
  },
];

type SpecialistId = Exclude<AgentId, "auto">;

/**
 * Cloud model selection. Cloud calls bill per token on the API key, so
 * opus-tier specialists are downshifted to sonnet here (quality is close
 * for chat-sized work; the local install keeps opus on subscription).
 * Set CLOUD_FULL_MODELS=1 to disable the downshift.
 */
const modelFor = (id: SpecialistId) => {
  const short = (SPECIALISTS[id].model ?? "sonnet") as keyof typeof MODEL_IDS;
  if (short === "opus" && !process.env.CLOUD_FULL_MODELS) {
    return MODEL_IDS.sonnet;
  }
  return MODEL_IDS[short];
};

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
    system: cachedSystem(spec.prompt + CLOUD_NOTE + identityNote(id)),
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
  tokens: ConnectorTokens = {},
  extraCtx = "",
): Promise<Response> {
  const firmCtx = firmContext(userEmail) + extraCtx;
  const connTools = anthropicToolDefs(tokens);
  const guidance = toolGuidance(tokens);
  // primary web search: Anthropic-hosted (server-side execution);
  // tavily_search in connTools is the backup
  const hostedSearch = {
    type: "web_search_20250305" as const,
    name: "web_search" as const,
    max_uses: 5,
  };
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
          // Connector tools (Dropbox/Outlook/Gmail) loop until a final text.
          const id = agentId as SpecialistId;
          const spec = SPECIALISTS[id];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const turns: any[] = [...convo];
          let streamedAny = false;
          for (let hop = 0; hop < 5; hop++) {
            const s = client.messages.stream({
              model: modelFor(id),
              max_tokens: 8000,
              system: cachedSystem(
                spec.prompt + CLOUD_NOTE + identityNote(id) + firmCtx +
                  guidance + (voice ? VOICE_NOTE : ""),
              ),
              tools: [hostedSearch, ...connTools],
              messages: turns,
            });
            let firstDelta = true;
            s.on("text", (t) => {
              if (firstDelta && streamedAny) {
                controller.enqueue(line({ t: "delta", text: "\n\n" }));
              }
              firstDelta = false;
              streamedAny = true;
              controller.enqueue(line({ t: "delta", text: t }));
            });
            const final = await s.finalMessage();
            turns.push({ role: "assistant", content: final.content });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const calls: any[] = final.content.filter(
              (b: { type: string }) => b.type === "tool_use",
            );
            if (final.stop_reason !== "tool_use" || calls.length === 0) break;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results: any[] = [];
            for (const call of calls) {
              controller.enqueue(
                line({ t: "status", text: `using: ${call.name}` }),
              );
              const out = await executeConnectorTool(
                call.name,
                (call.input ?? {}) as Record<string, unknown>,
                tokens,
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
            system: cachedSystem(
              ORCH_CLOUD_PROMPT + firmCtx + guidance +
                (voice ? VOICE_NOTE : ""),
            ),
            tools: [consultTool, hostedSearch, ...connTools],
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
            if (call.name !== "consult_specialist") {
              // connector tool (Dropbox / Outlook / Gmail)
              controller.enqueue(
                line({ t: "status", text: `using: ${call.name}` }),
              );
              const out = await executeConnectorTool(
                call.name,
                (call.input ?? {}) as Record<string, unknown>,
                tokens,
              );
              results.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: out,
              });
              continue;
            }
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

  const { messages, agentId, matterId, voice, userEmail, userProfile } =
    (await req.json()) as ChatRequest;
  const profileCtx = userProfile
    ? `\n\n[CURRENT USER — self-onboarded employee profile. Address them by name and tailor work to their role.]\n${userProfile.slice(0, 1500)}`
    : "";
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
  // connector refresh tokens ride in httpOnly cookies
  const tokens: ConnectorTokens = {
    dropbox: req.cookies.get("dbx_refresh")?.value,
    outlook: req.cookies.get("ms_refresh")?.value,
    gmail: req.cookies.get("g_refresh")?.value,
  };

  if (!query || !cwd) {
    return cloudChat(messages, agentId, voice, userEmail, tokens, profileCtx);
  }

  const promptText = buildPrompt(messages) + (voice ? VOICE_NOTE : "");

  const isAuto = agentId === "auto" || !SPECIALISTS[agentId as never];
  const spec = isAuto ? null : SPECIALISTS[agentId as Exclude<AgentId, "auto">];

  // expose connector tools to the local runtime as an in-process MCP server
  const liveTools = availableTools(tokens);
  let mcpServers: Record<string, unknown> = {};
  let mcpToolNames: string[] = [];
  if (liveTools.length) {
    const { createSdkMcpServer, tool } = await import(
      "@anthropic-ai/claude-agent-sdk"
    );
    const { z } = await import("zod");
    mcpServers = {
      connectors: createSdkMcpServer({
        name: "connectors",
        version: "1.0.0",
        tools: liveTools.map((t) =>
          tool(
            t.name,
            t.description,
            Object.fromEntries(
              Object.entries(t.params).map(([k, p]) => {
                const base =
                  p.type === "number"
                    ? z.number().describe(p.description)
                    : z.string().describe(p.description);
                return [k, p.required ? base : base.optional()];
              }),
            ),
            async (args) => ({
              content: [
                {
                  type: "text" as const,
                  text: await executeConnectorTool(
                    t.name,
                    args as Record<string, unknown>,
                    tokens,
                  ),
                },
              ],
            }),
          ),
        ),
      }),
    };
    mcpToolNames = liveTools.map((t) => `mcp__connectors__${t.name}`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const q = query({
          prompt: promptText,
          options: {
            cwd,
            permissionMode: "bypassPermissions",
            // Isolation: the local Agent SDK otherwise inherits the developer's
            // own Claude config (CLI default loads all settings sources), which
            // leaks their personal claude.ai MCP connectors — Asana, Figma,
            // Box, Docusign, etc. — into the legal workspace and makes the agent
            // advertise tools that don't exist in the cloud (direct-API) path.
            // Lock it to ONLY the in-process `connectors` server so localhost
            // matches production exactly.
            settingSources: [],
            strictMcpConfig: true,
            // don't expose dev-environment skills to the legal agent
            skills: [],
            systemPrompt:
              (isAuto
                ? ORCHESTRATOR_PROMPT + ORCH_IDENTITY_NOTE
                : spec!.prompt +
                  identityNote(agentId as Exclude<AgentId, "auto">)) +
              firmContext(userEmail) +
              profileCtx +
              toolGuidance(tokens),
            model: isAuto
              ? ORCHESTRATOR_MODEL
              : MODEL_IDS[(spec!.model ?? "sonnet") as keyof typeof MODEL_IDS],
            ...(mcpToolNames.length
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                { mcpServers: mcpServers as any }
              : {}),
            ...(isAuto
              ? { agents: SPECIALISTS, allowedTools: ["Task", ...mcpToolNames] }
              : {
                  allowedTools: [
                    ...((spec!.tools as string[]) ?? []),
                    ...mcpToolNames,
                  ],
                }),
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
                    : `using: ${block.name.replace(/^mcp__connectors__/, "").toLowerCase()}`;
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
