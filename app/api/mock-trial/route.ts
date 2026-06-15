import { NextRequest } from "next/server";
import {
  CASES,
  caseBrief,
  opposingKey,
  type TrialCase,
} from "@/lib/mockTrial";
import {
  counselSystem,
  judgeSystem,
  trialModel,
  type TrialTurn,
} from "@/agents/trial";
import { executeResearchTool } from "@/lib/researchTools";
import { togetherEnabled, isProviderDown, streamTogether } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 120;

interface TrialRequest {
  turn: TrialTurn;
  /** catalog case id, or omit and pass `custom` */
  caseId?: string;
  custom?: TrialCase;
  /** the side key the human is arguing */
  yourSideKey: string;
  /** trial transcript so far, as plain turns (for the counsel agent) */
  history?: { role: "user" | "assistant"; content: string }[];
  /** the human's latest argument (counsel + ruling turns) */
  userArgument?: string;
  /** the AI's latest reply (ruling turn) */
  lastAiReply?: string;
  /** grounding carried back from the `open` turn so we fetch case law once */
  caseLaw?: string;
}

const enc = new TextEncoder();
const line = (o: unknown) => enc.encode(JSON.stringify(o) + "\n");

/** Pull real comparable authority from CourtListener; fail soft to empty. */
async function fetchCaseLaw(c: TrialCase): Promise<string> {
  if (!process.env.COURTLISTENER_API_TOKEN) return "";
  const query = `${c.searchTerms ?? c.title} ${c.principle}`.slice(0, 200);
  try {
    const out = await executeResearchTool("courtlistener_search", { query });
    if (!out || /not configured|No CourtListener|failed/i.test(out)) return "";
    return out.slice(0, 2400);
  } catch {
    return "";
  }
}

function buildArgs(c: TrialCase, yourKey: string, caseLaw?: string) {
  const aiKey = opposingKey(c, yourKey);
  const you = c.sides[yourKey];
  const ai = c.sides[aiKey];
  return {
    brief: caseBrief(c),
    judge: c.judge,
    title: c.title,
    caseLaw,
    humanSide: you?.label ?? "the moving party",
    aiCounsel: ai?.counsel ?? "Opposing Counsel",
    aiSide: ai?.label ?? "the opposing party",
    aiWeapons: ai?.weapons ?? [],
    aiRisk: ai?.risk ?? "",
    historicalVerdict: c.historicalVerdict,
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set." },
      { status: 500 },
    );
  }

  const body = (await req.json()) as TrialRequest;
  const c = body.custom ?? CASES.find((x) => x.id === body.caseId);
  if (!c) return Response.json({ error: "Unknown case." }, { status: 400 });
  const yourKey =
    body.yourSideKey in c.sides
      ? body.yourSideKey
      : Object.keys(c.sides)[0];

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ maxRetries: 5 });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // The opening turn fetches grounding once and hands it back to the
        // client, which threads it through every later turn.
        let caseLaw = body.caseLaw ?? "";
        if (body.turn === "open") {
          caseLaw = await fetchCaseLaw(c);
          controller.enqueue(line({ t: "caselaw", text: caseLaw }));
        }

        const a = buildArgs(c, yourKey, caseLaw);

        let system: string;
        let messages: { role: "user" | "assistant"; content: string }[];

        if (body.turn === "counsel") {
          system = counselSystem(a);
          const hist = (body.history ?? []).slice(-6);
          messages = hist.length
            ? hist
            : [
                {
                  role: "user",
                  content:
                    body.userArgument?.trim() ||
                    "Opposing counsel rests their opening. Respond.",
                },
              ];
        } else if (body.turn === "ruling") {
          system = judgeSystem(a, "ruling");
          messages = [
            {
              role: "user",
              content: `The ${a.humanSide} argued: "${body.userArgument ?? ""}". ${a.aiSide} replied: "${body.lastAiReply ?? ""}". Rule on the exchange.`,
            },
          ];
        } else if (body.turn === "verdict") {
          system = judgeSystem(a, "verdict");
          const transcript = (body.history ?? [])
            .map(
              (m) =>
                `${m.role === "user" ? a.humanSide : a.aiSide}: ${m.content}`,
            )
            .join("\n\n")
            .slice(0, 9000);
          messages = [
            {
              role: "user",
              content: `Here is the full argument you presided over:\n\n${transcript}\n\nDeliver your verdict now.`,
            },
          ];
        } else {
          // open
          system = judgeSystem(a, "open");
          messages = [
            { role: "user", content: "Convene the court and open the trial." },
          ];
        }

        let streamedAny = false;
        const emit = (t: string) => {
          streamedAny = true;
          controller.enqueue(line({ t: "delta", text: t }));
        };

        try {
          const s = client.messages.stream({
            model: trialModel(),
            max_tokens: 900,
            system: [
              {
                type: "text" as const,
                text: system,
                cache_control: { type: "ephemeral" as const },
              },
            ],
            messages,
          });
          s.on("text", emit);
          await s.finalMessage();
        } catch (primaryErr) {
          // Primary (Anthropic) is down — fail over to Together AI if nothing
          // has streamed yet. Never surface the raw provider error.
          if (!streamedAny && togetherEnabled()) {
            await streamTogether({ system, messages, maxTokens: 900, onText: emit });
          } else {
            throw primaryErr;
          }
        }
        controller.enqueue(line({ t: "done" }));
      } catch (err) {
        controller.enqueue(
          line({
            t: "error",
            text: isProviderDown(err)
              ? "The simulation engine is briefly unavailable. Please try again in a moment."
              : "Something interrupted the proceedings. Please try again.",
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
