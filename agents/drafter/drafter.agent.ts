import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

const systemPrompt = readFileSync(
  join(__dirname, "drafter.system.md"),
  "utf-8",
);

/**
 * Lex Draft — Legal Drafting Agent.
 *
 * First agent in the system with write access. Drafts legal documents from
 * matter templates plus the cited findings handed off by upstream analysts
 * (Sol Vance, Cass Mercer). Drafts only what its sources support.
 *
 * Chain role: downstream of Sol and Cass. The orchestrator delegates drafting
 * via the Task tool, passing the findings package. After drafting, the
 * orchestrator routes the draft to the validator (Cite Check). This agent does
 * NOT call the validator itself and does NOT loop with it.
 *
 * model: short name only ("opus" | "sonnet" | "haiku") on subagents.
 * Full model IDs live on the orchestrator, never here.
 */
export const drafterAgent: AgentDefinition = {
  description:
    "Legal drafting agent. Assembles documents from matter templates and the " +
    "cited findings supplied by upstream analysts. Write access. Asserts only " +
    "source-grounded text; carries [VERIFY] and gaps forward unresolved; never " +
    "fabricates authority. Delegate to it after Sol/Cass findings exist; route " +
    "its output to the validator.",
  prompt: systemPrompt,
  model: "sonnet",
  tools: ["Read", "Write", "Edit"],
};
