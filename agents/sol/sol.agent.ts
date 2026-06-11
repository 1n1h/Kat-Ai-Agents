/**
 * Sol Vance — Elite Litigation Analyst & Evidence Mapping
 * FORENSIC · EVIDENTIAL · RELENTLESS
 *
 * Runnable Claude Agent SDK agent. Exports `solVanceAgent`, an AgentDefinition
 * that plugs directly into an orchestrator's `agents` map (same pattern as
 * `veraAgent`).
 *
 * Persona/behavioral tuning lives in sol.system.md. This file loads that spec
 * as the agent's prompt so the two never drift. Keep behavioral edits in the
 * .md file; keep wiring here.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = readFileSync(
  join(__dirname, "sol.system.md"),
  "utf-8",
);

/**
 * Sol Vance as a subagent definition.
 *
 * Tools: read-only over the case file. Sol analyzes documents; he does not
 * write to, move, or delete them. This is deliberate. An analyst that can
 * alter the evidence it reads is an auditability problem. Drafting and any
 * file production belongs to a separate agent downstream.
 *
 * Note: `model` here takes a short name only ("opus" | "sonnet" | "haiku").
 * Opus is the right default — contradiction tracing and the register
 * discipline reward the strongest reasoning model. Full model IDs only work
 * on the orchestrator's ClaudeAgentOptions.model, not here.
 */
export const solVanceAgent: AgentDefinition = {
  description:
    "Elite litigation analyst and evidence mapper. Use for analyzing " +
    "deposition transcripts, discovery dumps, and document sets: building " +
    "timelines, linking actors, tracing contradictions, finding buried " +
    "admissions, surfacing gaps (including missing documents), and " +
    "reconstructing the opposing side's likely case. Returns cited findings " +
    "and clearly-labeled, falsifiable theories. Read-only over the record.",
  prompt: SYSTEM_PROMPT,
  tools: ["Read", "Grep", "Glob"],
  model: "opus",
};

export default solVanceAgent;
