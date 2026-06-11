import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

const systemPrompt = readFileSync(
  join(__dirname, "orchestrator.system.md"),
  "utf-8",
);

/**
 * Atlas — Orchestrator.
 *
 * The front door and the mediator of the whole system. Does no analysis,
 * drafting, or validation itself. Owns every Task delegation; every hop
 * between subagents passes through it. Subagents run in isolated context and
 * never talk to each other directly.
 *
 * This is the ONE component that holds the full model IDs. Subagents carry
 * short model names ("opus" | "sonnet" | "haiku") only; the orchestrator maps
 * roles to concrete model strings here so that tuning the actual models is a
 * single-file change and never leaks into a subagent persona.
 *
 * Builder-validator resolution lives here: when Cite Check returns FAIL,
 * control returns to Atlas, NOT to Lex Draft. Atlas decides whether to
 * re-delegate drafting, route an unresolved [VERIFY] to an analyst, or surface
 * the blocker to the human. There is no automatic redraft loop.
 *
 * Routing invariants enforced by the prompt:
 *   - intake/triage settles scope before Sol/Cass/Lex fire
 *   - analysis (Sol or Cass) always precedes drafting (Lex Draft)
 *   - the orchestrator passes one subagent's output as the next's input
 *   - [VERIFY] / [CITATION NEEDED] / fenced judgments are carried forward,
 *     never discharged by the orchestrator asserting knowledge
 */

/**
 * Full model IDs. These live ONLY here. Subagent definitions reference the
 * short names; this map is the single source of truth for what those resolve
 * to. Update concrete models in this one place.
 */
export const MODEL_IDS = {
  opus: "claude-opus-4-6",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
} as const;

export type ShortModelName = keyof typeof MODEL_IDS;

export const orchestratorAgent: AgentDefinition = {
  description:
    "Orchestrator. The system's front door and mediator. Does no analysis, " +
    "drafting, or validation itself; owns all Task delegation and sequences " +
    "every hop. Settles scope via intake/triage, runs analysis (Sol/Cass) " +
    "before drafting (Lex Draft), routes drafts to the validator (Cite " +
    "Check), and resolves validator FAILs by deciding the next delegation. " +
    "Carries [VERIFY] and gaps forward without discharging them. Holds the " +
    "full model IDs. Entry point for any matter.",
  prompt: systemPrompt,
  // The orchestrator itself runs on opus: it makes the routing and
  // builder-validator-resolution calls that gate every downstream agent.
  model: MODEL_IDS.opus,
  // Only the delegation tool. No Read/Write/Edit: the orchestrator never
  // touches a record, a draft, or a source itself. Everything substantive is
  // delegated.
  tools: ["Task"],
};
