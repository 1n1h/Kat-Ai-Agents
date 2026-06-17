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
import {
  researchToolDefs,
  executeResearchTool,
  isResearchTool,
  researchGuidance,
  availableResearchTools,
} from "@/lib/researchTools";
import {
  togetherEnabled,
  isProviderDown,
  streamTogether,
  togetherCheapModel,
} from "@/lib/llm";

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
  /** long-term memory for this matter (client-persisted, injected as context) */
  matterMemory?: string | null;
  /** force a provider — "together" runs the cheap model directly (mobile). */
  provider?: "together";
}

/** Lightweight, tool-less assistant prompt for the direct cheap-model path. */
const DIRECT_PROMPT =
  "You are Lex, an AI legal assistant for attorneys. Answer clearly, " +
  "accurately, and concisely in plain prose. In this mode you have no tools " +
  "or document access; if a request needs a citation you can't verify or a " +
  "file you don't have, say what you'd need rather than guessing. Never " +
  "fabricate case citations or quotes. No em dashes.";

const VOICE_NOTE =
  "\n\n[Voice mode: the user is speaking aloud and will hear this reply as " +
  "speech. Answer in at most three short sentences of plain prose — no " +
  "markdown, no lists, no headings. Offer to go deeper instead of " +
  "elaborating unprompted.]";

const CLOUD_NOTE =
  "\n\n[Cloud session: to deliver a finished document (letter, brief, memo, " +
  "or agreement), call the write_document tool with the full text as Markdown " +
  "— the user gets a one-click Word and PDF download. When the user uploads a " +
  "document, its full text is included inline in their message under a header " +
  "like '[Attached document — name]'. Read and use that text directly; do not " +
  "say you can't access files or ask the user to paste it.]";

const MEMORY_NOTE =
  "\n\n[MEMORY — you may call the `remember` tool to save a durable fact about " +
  "THIS matter (a party, key date, decision, ruling, or standing instruction/" +
  "preference) to long-term memory that persists across future conversations. " +
  "Use it sparingly, only for things worth carrying forward — not transient " +
  "chatter — and don't announce that you saved it.]";

/** Tool that produces a downloadable deliverable in the cloud (no filesystem). */
const WRITE_DOC_TOOL = {
  name: "write_document",
  description:
    "Produce a finished deliverable for the user to download as Word or PDF. " +
    "Provide the full document as polished Markdown: a # title, ## section " +
    "headings, blank lines between paragraphs, - bullets, and **bold** for " +
    "emphasis. For any review, issues list, or comparison, present the items " +
    "as a Markdown TABLE (e.g. | Section | Risk | Suggested revised language |) " +
    "rather than loose prose, and open a review memo with a short executive " +
    "summary. Use for letters, briefs, memos, redlines, and agreements — not " +
    "for short chat replies.",
  input_schema: {
    type: "object" as const,
    properties: {
      filename: {
        type: "string",
        description: 'A short file name without extension, e.g. "demand-letter".',
      },
      content: {
        type: "string",
        description: "The full document body in Markdown.",
      },
    },
    required: ["filename", "content"],
  },
};

/** Tool the orchestrator (and direct specialists) use to write matter memory. */
const REMEMBER_TOOL = {
  name: "remember",
  description:
    "Save one durable fact about this matter to long-term memory (persists " +
    "across future conversations). Lasting facts only: parties, key dates, " +
    "decisions, rulings, standing instructions or preferences.",
  input_schema: {
    type: "object" as const,
    properties: {
      note: {
        type: "string",
        description: "A concise fact to remember, phrased as one line.",
      },
    },
    required: ["note"],
  },
};

// rolling-summary thresholds: once a thread passes SUMMARIZE_AFTER turns we
// summarize all but the last KEEP_RECENT into a context note so the prompt
// stays bounded instead of resending the whole transcript forever.
const SUMMARIZE_AFTER = 24;
const KEEP_RECENT = 12;

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
/**
 * Suppress internal-process narration for the user-facing voice. The user wants
 * the work product, not a play-by-play of how it was produced.
 */
const NO_PROCESS_NOTE =
  "\n\n[Presentation: deliver the finished work product, and at most one or " +
  "two plain sentences of status. Do NOT narrate your internal process — no " +
  "hop-by-hop play-by-play ('first hop', 'next hop', 'final hop'), no " +
  "describing which specialist you delegated to or consulted, no validation " +
  "PASS/FAIL or rubric reasoning, no 'ORCHESTRATION NOTE', and never name an " +
  "internal tool (consult_specialist, write_document, SendMessage, Task, etc.). " +
  "Coordinate silently; the answer and any document ARE the output, not a " +
  "description of how you made them. When a document is produced, summarize " +
  "what's in it briefly and let the user open it.]";

/**
 * Force action: the model must do the work this turn, not announce it. Stops
 * the "Let me analyze and draft…" → end-of-turn failure.
 */
const ACT_NOTE =
  "\n\n[Execution: do the requested work IN THIS TURN — call your tools and " +
  'return the result. Never end a turn with only a statement of intent ("I\'ll ' +
  'review…", "Let me analyze…", "then I\'ll draft…", "prepare your ' +
  'deliverable"); if you say you will produce something, produce it in the same ' +
  "turn. When the user asks for a document, deliverable, letter, memo, " +
  "agreement, or redline, you MUST actually generate the document with your " +
  "document tool so it is delivered and opens for them — never paste the full " +
  "document inline as your reply, and never stop after merely describing it. " +
  "Any document you produce must be polished Markdown: a # title, a short " +
  "Executive Summary (counts by severity), findings grouped under ## headings " +
  "(Deal-Breakers, Material, Watch-List), and each issue list as a Markdown " +
  "TABLE (| Section | Risk (plain English) | Suggested revised language |) " +
  "rather than numbered prose, ending with a brief client-ready cover note.]";

/** Formatting directive for the Drafting specialist — produces a polished memo. */
const DRAFT_FORMAT_NOTE =
  "\n\n[Formatting: produce a polished, professional document in Markdown. " +
  "Open with a # title and a short Executive Summary (counts by severity). " +
  "Group findings by severity under ## headings (Deal-Breakers, Material, " +
  "Watch-List). Present each issue group as a Markdown TABLE with columns " +
  "| Section | Risk (plain English) | Suggested revised language |, not loose " +
  "prose. Use **bold** for labels. End with a short, client-ready cover note. " +
  "Prefer tables over paragraphs for any list of issues or terms.]";

/**
 * Last-resort detector: the orchestrator sometimes writes the whole deliverable
 * as its chat reply instead of calling write_document. When its final text reads
 * like a finished document (titled / sectioned / a redline memo), we route it to
 * the document panel rather than dumping the full memo inline — matching how
 * other assistants surface a deliverable.
 */
function looksLikeDeliverable(t: string): boolean {
  const text = t.trim();
  if (text.length < 500) return false;
  // A Markdown table (a row plus a |---|---| separator) is the clearest signal
  // of a structured deliverable — route it to the panel no matter what.
  const hasTable = /^\s*\|.*\|\s*$/m.test(text) && /^\s*\|?[\s:|-]+\|[\s:|-]+\|?\s*$/m.test(text);
  if (hasTable) return true;
  const mdHeadings = (text.match(/^#{1,3}\s+\S/gm) || []).length;
  const boldHeadings = (text.match(/^\s*\*\*[^*]+\*\*\s*:?\s*$/gm) || []).length;
  const cues =
    /(suggested revised language|cover note|deal-?breaker|redlines?|issues?\s*(&|and)\s*redlines|unfavorable term|executive summary|section\s+\d+\.\d+)/i.test(
      text,
    );
  return (
    mdHeadings >= 1 ||
    (boldHeadings >= 2 && cues) ||
    (cues && text.length > 1100)
  );
}

/**
 * A short chat-side summary of a deliverable: the Executive Summary if present,
 * otherwise the opening prose — tables and headings stripped, capped. Shown in
 * the transcript alongside the document chip while the full memo lives in the
 * panel (mirrors how other assistants surface an artifact).
 */
function deliverableSummary(t: string): string {
  const text = t.trim();
  let body = "";
  const exec = text.match(
    /^#{1,3}\s*Executive Summary\s*\n+([\s\S]*?)(?=\n#{1,3}\s|\n\s*\|)/im,
  );
  if (exec) {
    body = exec[1];
  } else {
    const afterTitle = text.replace(/^#\s+.+\n+/, "");
    const m = afterTitle.match(/^([\s\S]*?)(?=\n#{1,3}\s|\n\s*\|)/);
    body = m ? m[1] : afterTitle;
  }
  body = body
    .replace(/^\s*\|.*$/gm, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (body.length > 900) body = body.slice(0, 900).replace(/\s+\S*$/, "") + "…";
  return body;
}

/** Best-effort title for a deliverable pulled from the model's own text. */
function deliverableTitle(t: string): string {
  const md = t.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (md) return md;
  const titled = t.match(/titled\s+["“']([^"”']{4,90})["”']/i)?.[1]?.trim();
  if (titled) return titled;
  const bold = t.match(/^\s*\*\*([^*]{4,90})\*\*\s*$/m)?.[1]?.trim();
  if (bold) return bold;
  return "Document";
}

const ORCH_IDENTITY_NOTE =
  "\n\n[Identity: you are the firm's orchestrator and speak in one steady " +
  "voice. You have no personal name, and neither do your specialists as far " +
  "as the user is concerned. NEVER reveal internal agent, model, or persona " +
  "names (e.g. Atlas, Sol, Cass, Lex, Vera) and never describe your internal " +
  "tooling or skills. If asked who you are or how you work, refer to the " +
  "specialists only by their professional roles: Litigation Analysis, " +
  "Contract Review, Drafting, Citation Check, and Practice Strategy.]" +
  NO_PROCESS_NOTE +
  ACT_NOTE;

/**
 * Cloud orchestrator persona. The local install runs the real Atlas via the
 * Agent SDK's Task tool; here we reproduce the single-voice contract on the
 * direct API: the user only ever talks to the orchestrator, which consults
 * specialists privately and answers in one synthesized voice.
 */
const ORCH_CLOUD_PROMPT = `You are the orchestrator of Lex, the AI workspace, the single point of contact the user talks to. The user speaks only to you; they never address a specialist directly, and you never tell them to "talk to" another agent or hand them off.

You coordinate a team of specialists and speak for the whole system in one steady voice:
- Litigation Analysis — depositions, discovery, timelines, contradictions, buried admissions, evidence gaps (read-only).
- Contract Review — clause-by-clause review, redlines with proposed language, ranked risk (read-only).
- Drafting — assembles letters, briefs, and agreements from cited findings.
- Citation Check — audits a draft against its sources and returns PASS or FAIL.
- Practice Strategy — strategy and decision support for running the practice.

When a message needs real legal work, use the consult_specialist tool to delegate to the right specialist(s) in a sensible order — analysis before drafting, drafting before citation-check — passing each one all the context it needs (specialists cannot see this conversation). You may consult more than once. Then synthesize their work into a single coherent answer in your own voice. Never paste a specialist's reply verbatim as if they were addressing the user, and never adopt a specialist's name.

For greetings, small talk, clarifying questions, or questions about how you work, just answer directly, warmly, and briefly — do not consult anyone. Offer to begin when the user is ready.

You have no personal name. You are the orchestrator. Do not call yourself Atlas, Sol, Cass, Lex, Vera, or any other personal name. No em dashes in anything you draft.${NO_PROCESS_NOTE}${ACT_NOTE}`;

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

/**
 * Return a copy of the message list with a single cache breakpoint on the last
 * block of the last message. The whole prefix before it is cached, so across a
 * multi-hop tool loop the conversation (incl. any large uploaded document) is
 * written to cache once and READ on later hops — cache reads bill at 10% and,
 * crucially, do NOT count toward the ITPM rate limit on Opus/Sonnet 4.x.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cacheTip = (turns: any[]): any[] => {
  if (!turns.length) return turns;
  const out = turns.slice();
  const last = out[out.length - 1];
  const cc = { type: "ephemeral" as const };
  let content = last.content;
  if (typeof content === "string") {
    content = [{ type: "text" as const, text: content, cache_control: cc }];
  } else if (Array.isArray(content) && content.length) {
    content = content.map((b, i) =>
      i === content.length - 1 ? { ...b, cache_control: cc } : b,
    );
  } else {
    return turns;
  }
  out[out.length - 1] = { ...last, content };
  return out;
};

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

type Convo = { role: "user" | "assistant"; content: string }[];

/**
 * Rolling thread summarization. Short threads pass through unchanged. Long ones
 * keep the last KEEP_RECENT turns verbatim and fold everything before them into
 * a compact summary (a cheap haiku call) returned as a context note for the
 * system prompt — so the prompt stays bounded as the thread grows.
 */
async function condenseHistory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  messages: ChatMessage[],
): Promise<{ convo: Convo; historyNote: string }> {
  const all: Convo = messages.map(({ role, content }) => ({ role, content }));
  if (all.length <= SUMMARIZE_AFTER) return { convo: all, historyNote: "" };

  const older = all.slice(0, all.length - KEEP_RECENT);
  let recent = all.slice(all.length - KEEP_RECENT);
  // the model requires the first turn to be the user's
  while (recent.length && recent[0].role !== "user") recent = recent.slice(1);
  if (!recent.length) recent = all.slice(-KEEP_RECENT);

  const transcript = older
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n")
    .slice(0, 24000);

  try {
    const res = await client.messages.create({
      model: MODEL_IDS.haiku,
      max_tokens: 700,
      system:
        "Summarize this legal-assistant conversation so far into a tight brief " +
        "the assistant can rely on to continue: the matter, the parties, key " +
        "facts and findings, decisions made, open questions, and any deadlines. " +
        "Bullet points. No preamble.",
      messages: [{ role: "user", content: transcript }],
    });
    const summary = textOf(res.content as { type: string; text?: string }[]);
    const historyNote = summary
      ? "\n\n[EARLIER IN THIS CONVERSATION — summary of the turns before the " +
        "recent ones shown below; treat as established context.]\n" +
        summary
      : "";
    return { convo: recent, historyNote };
  } catch {
    // summarization failed — fall back to a hard recent-window cap (no note)
    return { convo: recent, historyNote: "" };
  }
}

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
    max_tokens: 16000,
    system: cachedSystem(
      spec.prompt +
        CLOUD_NOTE +
        identityNote(id) +
        (id === "drafting" ? DRAFT_FORMAT_NOTE : ""),
    ),
    // generous cap so the orchestrator can hand over a full contract, not a slice
    messages: [{ role: "user", content: instruction.slice(0, 200000) }],
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
  const connTools = anthropicToolDefs(tokens);
  const researchTools = researchToolDefs();
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
  // Extra retries (with the SDK's exponential backoff) ride out short
  // rate-limit windows so an orchestrated turn doesn't surface a 429.
  const client = new Anthropic({ maxRetries: 5 });
  const { convo, historyNote } = await condenseHistory(client, messages);
  const firmCtx =
    firmContext(userEmail) +
    extraCtx +
    historyNote +
    MEMORY_NOTE +
    researchGuidance();
  const isAuto = agentId === "auto" || !SPECIALISTS[agentId as SpecialistId];

  const stream = new ReadableStream({
    async start(controller) {
      // tracked across both paths so the fallback only fires if Anthropic
      // produced nothing (avoids a doubled answer after partial output)
      let streamedAny = false;
      try {
        if (!isAuto) {
          // Direct specialist: stream its reply, persona name kept internal.
          // Connector tools (Dropbox/Outlook/Gmail) loop until a final text.
          const id = agentId as SpecialistId;
          const spec = SPECIALISTS[id];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const turns: any[] = [...convo];
          for (let hop = 0; hop < 5; hop++) {
            const s = client.messages.stream({
              model: modelFor(id),
              max_tokens: 8000,
              system: cachedSystem(
                spec.prompt + CLOUD_NOTE + identityNote(id) + firmCtx +
                  guidance + (voice ? VOICE_NOTE : ""),
              ),
              tools: [
                WRITE_DOC_TOOL,
                REMEMBER_TOOL,
                hostedSearch,
                ...connTools,
                ...researchTools,
              ],
              messages: cacheTip(turns),
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
              if (call.name === "write_document") {
                const di = (call.input ?? {}) as {
                  filename?: string;
                  content?: string;
                };
                const dname = (di.filename || "document").replace(
                  /[^\w. -]/g,
                  "_",
                );
                const dcontent = String(di.content ?? "");
                if (dcontent.trim())
                  controller.enqueue(
                    line({ t: "document", name: dname, text: dcontent }),
                  );
                results.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: dcontent.trim()
                    ? `Document "${dname}" is ready — the user can download it as Word or PDF.`
                    : "No content provided; nothing written.",
                });
                continue;
              }
              if (call.name === "remember") {
                const note = String(
                  (call.input as { note?: string })?.note ?? "",
                ).trim();
                if (note) controller.enqueue(line({ t: "memory", text: note }));
                results.push({
                  type: "tool_result",
                  tool_use_id: call.id,
                  content: "Saved to matter memory.",
                });
                continue;
              }
              controller.enqueue(
                line({ t: "status", text: `using: ${call.name}` }),
              );
              const input = (call.input ?? {}) as Record<string, unknown>;
              const out = isResearchTool(call.name)
                ? await executeResearchTool(call.name, input)
                : await executeConnectorTool(call.name, input, tokens);
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
        let producedDoc = false;
        let nudged = false;
        let lastDraft = ""; // the Drafting specialist's output, as a fallback
        for (let hop = 0; hop < 7; hop++) {
          const resp = await client.messages.create({
            model: ORCHESTRATOR_MODEL,
            max_tokens: 8000,
            system: cachedSystem(
              ORCH_CLOUD_PROMPT + firmCtx + guidance +
                (voice ? VOICE_NOTE : ""),
            ),
            tools: [
              consultTool,
              WRITE_DOC_TOOL,
              REMEMBER_TOOL,
              hostedSearch,
              ...connTools,
              ...researchTools,
            ],
            messages: cacheTip(turns),
          });
          turns.push({ role: "assistant", content: resp.content });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const calls: any[] = resp.content.filter(
            (b: { type: string }) => b.type === "tool_use",
          );
          if (resp.stop_reason !== "tool_use" || calls.length === 0) {
            const final = textOf(resp.content);
            // Safety net: the model announced work ("Let me analyze… / I'll
            // draft…") but ended without doing it. Nudge once to actually act.
            if (
              !nudged &&
              !producedDoc &&
              final.length < 700 &&
              /\b(i'?ll|i will|let me|i'?m going to|prepare your deliverable|draft (the|your) (document|deliverable)|analyze the (full|document|agreement)|review (this|the) (agreement|contract|document))\b/i.test(
                final,
              )
            ) {
              nudged = true;
              turns.push({
                role: "user",
                content:
                  "Proceed now — complete the work in this turn: consult the specialists you need and produce the document with your tools. Do not reply with intent only.",
              });
              continue;
            }
            if (final) {
              streamedAny = true;
              // The orchestrator wrote the deliverable inline instead of using
              // the document tool — route it to the panel and hand off briefly.
              if (!producedDoc && looksLikeDeliverable(final)) {
                const title = deliverableTitle(final);
                const dname =
                  title.replace(/[^\w. -]/g, "_").slice(0, 80) || "Document";
                controller.enqueue(
                  line({ t: "document", name: dname, text: final }),
                );
                producedDoc = true;
                const summary = deliverableSummary(final);
                controller.enqueue(
                  line({
                    t: "text",
                    text:
                      (summary ? summary + "\n\n" : "") +
                      `**${title}** is open in the document panel — review it there, then download it as Word, PDF, or Markdown, or save it to the case.`,
                  }),
                );
              } else {
                controller.enqueue(line({ t: "text", text: final }));
              }
            }
            break;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const results: any[] = [];
          for (const call of calls) {
            if (call.name === "write_document") {
              const di = (call.input ?? {}) as {
                filename?: string;
                content?: string;
              };
              const dname = (di.filename || "document").replace(
                /[^\w. -]/g,
                "_",
              );
              const dcontent = String(di.content ?? "");
              if (dcontent.trim()) {
                producedDoc = true;
                controller.enqueue(
                  line({ t: "document", name: dname, text: dcontent }),
                );
              }
              results.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: dcontent.trim()
                  ? `Document "${dname}" is ready — the user can download it as Word or PDF.`
                  : "No content provided; nothing written.",
              });
              continue;
            }
            if (call.name === "remember") {
              const note = String(
                (call.input as { note?: string })?.note ?? "",
              ).trim();
              if (note) controller.enqueue(line({ t: "memory", text: note }));
              results.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: "Saved to matter memory.",
              });
              continue;
            }
            if (call.name !== "consult_specialist") {
              // connector tool (Dropbox / Outlook / Gmail) or research tool
              controller.enqueue(
                line({ t: "status", text: `using: ${call.name}` }),
              );
              const input = (call.input ?? {}) as Record<string, unknown>;
              const out = isResearchTool(call.name)
                ? await executeResearchTool(call.name, input)
                : await executeConnectorTool(call.name, input, tokens);
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
            if (id === "drafting" && out.trim().length > 200) lastDraft = out;
            results.push({
              type: "tool_result",
              tool_use_id: call.id,
              content: out,
            });
          }
          turns.push({ role: "user", content: results });
        }

        // Guarantee the deliverable reaches the panel: if a document was drafted
        // but the orchestrator never called write_document (it inlined or just
        // described it), emit the draft as a document now.
        if (!producedDoc && lastDraft.trim().length > 400) {
          const title =
            lastDraft.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Document";
          const dname = title.replace(/[^\w. -]/g, "_").slice(0, 80) || "Document";
          controller.enqueue(
            line({ t: "document", name: dname, text: lastDraft }),
          );
          producedDoc = true;
        }

        controller.enqueue(line({ t: "done" }));
      } catch (err) {
        // Anthropic failed. If nothing reached the user yet and Together AI is
        // configured, answer from the backup model (text-only — no tools).
        if (!streamedAny && togetherEnabled()) {
          try {
            const sys = isAuto
              ? ORCH_CLOUD_PROMPT + firmCtx
              : SPECIALISTS[agentId as SpecialistId].prompt +
                identityNote(agentId as SpecialistId) +
                firmCtx;
            controller.enqueue(line({ t: "status", text: "backup engine" }));
            let any = false;
            await streamTogether({
              system: sys,
              messages: convo,
              maxTokens: 4000,
              onText: (t) => {
                any = true;
                controller.enqueue(line({ t: "delta", text: t }));
              },
            });
            if (any) {
              controller.enqueue(line({ t: "done" }));
              return;
            }
          } catch {
            /* backup also failed — fall through to the graceful notice */
          }
        }
        controller.enqueue(
          line({
            t: "error",
            text: isProviderDown(err)
              ? "The assistant is temporarily unavailable — the model provider is over capacity or out of credits. Please try again shortly."
              : "Something went wrong handling that request. Please try again.",
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

  const {
    messages,
    agentId,
    matterId,
    voice,
    userEmail,
    userProfile,
    matterMemory,
    provider,
  } = (await req.json()) as ChatRequest;
  const profileCtx = userProfile
    ? `\n\n[CURRENT USER — self-onboarded employee profile. Address them by name and tailor work to their role.]\n${userProfile.slice(0, 1500)}`
    : "";
  const matterCtx =
    matterMemory && matterMemory.trim()
      ? "\n\n[MATTER MEMORY — durable facts accumulated for THIS matter across " +
        "prior conversations. Treat as established context; build on it and " +
        "don't contradict it.]\n" + matterMemory.slice(0, 4000)
      : "";
  const extraCtx = profileCtx + matterCtx;
  if (!messages?.length) {
    return Response.json({ error: "No messages." }, { status: 400 });
  }

  // Cheap direct path (mobile): stream straight from Together, no tools, no
  // Anthropic. Keeps the phone fast and independent of the API credit balance.
  if (provider === "together") {
    if (!togetherEnabled()) {
      return Response.json(
        { error: "Backup model is not configured." },
        { status: 500 },
      );
    }
    const convo = messages.map(({ role, content }) => ({ role, content }));
    const sys =
      DIRECT_PROMPT + firmContext(userEmail) + extraCtx + (voice ? VOICE_NOTE : "");
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let any = false;
          await streamTogether({
            system: sys,
            messages: convo,
            maxTokens: 2000,
            model: togetherCheapModel(),
            onText: (t) => {
              any = true;
              controller.enqueue(line({ t: "delta", text: t }));
            },
          });
          if (!any) {
            controller.enqueue(
              line({ t: "text", text: "I couldn't generate a reply. Please try again." }),
            );
          }
          controller.enqueue(line({ t: "done" }));
        } catch {
          controller.enqueue(
            line({
              t: "error",
              text: "The assistant is temporarily unavailable. Please try again shortly.",
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
    return cloudChat(messages, agentId, voice, userEmail, tokens, extraCtx);
  }

  const promptText = buildPrompt(messages) + (voice ? VOICE_NOTE : "");

  const isAuto = agentId === "auto" || !SPECIALISTS[agentId as never];
  const spec = isAuto ? null : SPECIALISTS[agentId as Exclude<AgentId, "auto">];

  // shared so the Together backup can reuse the same persona + context
  const localSystem =
    (isAuto
      ? ORCHESTRATOR_PROMPT + ORCH_IDENTITY_NOTE
      : spec!.prompt + identityNote(agentId as Exclude<AgentId, "auto">)) +
    firmContext(userEmail) +
    extraCtx +
    toolGuidance(tokens) +
    researchGuidance();

  // expose connector tools to the local runtime as an in-process MCP server
  const liveTools = availableTools(tokens);
  const liveResearch = availableResearchTools();
  const mcpServers: Record<string, unknown> = {};
  let mcpToolNames: string[] = [];
  if (liveTools.length || liveResearch.length) {
    const { createSdkMcpServer, tool } = await import(
      "@anthropic-ai/claude-agent-sdk"
    );
    const { z } = await import("zod");
    const zshape = (
      params: Record<
        string,
        { type: string; description: string; required?: boolean }
      >,
    ) =>
      Object.fromEntries(
        Object.entries(params).map(([k, p]) => {
          const base =
            p.type === "number"
              ? z.number().describe(p.description)
              : z.string().describe(p.description);
          return [k, p.required ? base : base.optional()];
        }),
      );
    if (liveTools.length) {
      mcpServers.connectors = createSdkMcpServer({
        name: "connectors",
        version: "1.0.0",
        tools: liveTools.map((t) =>
          tool(t.name, t.description, zshape(t.params), async (args) => ({
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
          })),
        ),
      });
    }
    if (liveResearch.length) {
      mcpServers.research = createSdkMcpServer({
        name: "research",
        version: "1.0.0",
        tools: liveResearch.map((t) =>
          tool(t.name, t.description, zshape(t.params), async (args) => ({
            content: [
              {
                type: "text" as const,
                text: await executeResearchTool(
                  t.name,
                  args as Record<string, unknown>,
                ),
              },
            ],
          })),
        ),
      });
    }
    mcpToolNames = [
      ...liveTools.map((t) => `mcp__connectors__${t.name}`),
      ...liveResearch.map((t) => `mcp__research__${t.name}`),
    ];
  }

  const stream = new ReadableStream({
    async start(controller) {
      let streamedAny = false;
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
            systemPrompt: localSystem,
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
                streamedAny = true;
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
        // Local runtime failed (often the same provider credit/quota issue).
        // Fail over to Together AI if nothing has reached the user yet.
        if (!streamedAny && togetherEnabled()) {
          try {
            controller.enqueue(line({ t: "status", text: "backup engine" }));
            let any = false;
            await streamTogether({
              system: localSystem,
              messages: messages.map(({ role, content }) => ({ role, content })),
              maxTokens: 4000,
              onText: (t) => {
                any = true;
                controller.enqueue(line({ t: "delta", text: t }));
              },
            });
            if (any) {
              controller.enqueue(line({ t: "done" }));
              return;
            }
          } catch {
            /* backup also failed — fall through to the graceful notice */
          }
        }
        controller.enqueue(
          line({
            t: "error",
            text: isProviderDown(err)
              ? "The assistant is temporarily unavailable — the model provider is over capacity or out of credits. Please try again shortly."
              : "Something went wrong handling that request. Please try again.",
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
