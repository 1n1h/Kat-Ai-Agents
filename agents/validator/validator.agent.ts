import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

const systemPrompt = readFileSync(
  join(__dirname, "validator.system.md"),
  "utf-8",
);

/**
 * Cite Check — Drafting Validator.
 *
 * Audits a Lex Draft draft against a fixed rubric and the source findings
 * package. NO write access. Emits PASS or FAIL with itemized, source-anchored
 * reasons.
 *
 * Builder-validator chain: the drafter is the builder, this is the validator.
 * On FAIL, control returns to the ORCHESTRATOR, not back to the drafter in a
 * loop. The orchestrator decides whether to re-delegate drafting. This agent
 * never edits the draft and never produces replacement text.
 *
 * model: short name only on subagents.
 */
export const validatorAgent: AgentDefinition = {
  description:
    "Drafting validator. Checks a draft against a citation-grounding and " +
    "two-register rubric using the source findings package. Read-only, no " +
    "write access. Returns PASS/FAIL with reasons; on FAIL returns control to " +
    "the orchestrator (no loop back to the drafter). Use after the drafter " +
    "produces a draft.",
  prompt: systemPrompt,
  model: "sonnet",
  tools: ["Read"],
};
