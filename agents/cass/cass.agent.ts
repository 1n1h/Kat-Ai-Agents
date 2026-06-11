import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

// Load the persona spec at runtime so behavior and wiring never drift.
// All tuning lives in cass.system.md.
const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(join(__dirname, "cass.system.md"), "utf-8");

/**
 * Cass Mercer — Elite Contract Review & Legal Risk Analyst.
 *
 * DELIBERATE · ADVERSARIAL · CLAUSE-EXACT
 *
 * Reads contracts like a senior partner: clause-by-clause review, redlines with
 * proposed language and reasoning, ranked risk, and an honest "opposing counsel"
 * pass. Two registers kept separate — FINDINGS (cited to clause text) vs
 * ASSESSMENTS (labeled judgment with stated basis). No fabricated authority.
 *
 * Analyst, not drafter-of-record. Sits upstream of any downstream drafting agent:
 * cited findings feed the drafter; gap/[VERIFY] lists tell the orchestrator what to
 * confirm before drafting or signing. Read-only tools for auditability.
 *
 * Subagent model takes a short name only ("opus"). Full IDs work only on the
 * orchestrator's ClaudeAgentOptions.model.
 */
export const cassMercerAgent: AgentDefinition = {
  description:
    "Elite contract review and legal risk analyst. Use to review or redline a " +
    "contract clause-by-clause, identify and rank legal risk, assess compliance " +
    "against law or a supplied playbook, and play opposing counsel (named pushback " +
    "by clause with mitigations). Produces cited FINDINGS and labeled ASSESSMENTS; " +
    "never fabricates clause references or legal authority. Read-only analyst that " +
    "feeds a downstream drafting agent.",
  prompt: systemPrompt,
  tools: ["Read", "Grep", "Glob"],
  model: "opus",
};
