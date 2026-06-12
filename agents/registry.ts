/**
 * Server-side agent registry.
 *
 * Loads the persona system prompts (the .md files are the source of truth for
 * behavior — keep tuning there, not here) and exposes them as Agent SDK
 * definitions keyed by the professional agent ids the UI uses.
 *
 * Original architecture by K. — orchestrator mediates every hop, analysts are
 * read-only, the drafter is the only writer, the validator gates every draft.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import type { AgentId } from "@/lib/agent-meta";

/**
 * Full model IDs live ONLY here (single source of truth, per the original
 * orchestrator design). Subagent definitions use short names.
 */
export const MODEL_IDS = {
  opus: "claude-opus-4-8",
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5-20251001",
} as const;

export const ORCHESTRATOR_MODEL =
  process.env.ANTHROPIC_MODEL || MODEL_IDS.opus;

const prompt = (folder: string, file: string): string =>
  readFileSync(join(process.cwd(), "agents", folder, file), "utf-8");

export const ORCHESTRATOR_PROMPT = prompt(
  "orchestrator",
  "orchestrator.system.md",
);

/**
 * Subagent definitions for the orchestrator's `agents` map.
 * Keys are the subagent_type names the orchestrator's Task tool uses.
 */
export const SPECIALISTS: Record<
  Exclude<AgentId, "auto">,
  AgentDefinition
> = {
  "litigation-analysis": {
    description:
      "Litigation analysis and evidence mapping. Use for depositions, " +
      "discovery dumps, and document sets: timelines, actor links, " +
      "contradictions, buried admissions, gaps. Cited findings and labeled, " +
      "falsifiable theories. Read-only over the record.",
    prompt: prompt("sol", "sol.system.md"),
    tools: ["Read", "Grep", "Glob"],
    model: "opus",
  },
  "contract-review": {
    description:
      "Contract review and legal risk analysis. Clause-by-clause review, " +
      "redlines with proposed language, ranked risk, compliance against a " +
      "playbook, opposing-counsel pushback. Cited FINDINGS vs labeled " +
      "ASSESSMENTS; never fabricates authority. Read-only analyst.",
    prompt: prompt("cass", "cass.system.md"),
    tools: ["Read", "Grep", "Glob"],
    model: "opus",
  },
  drafting: {
    description:
      "Legal drafting. Assembles documents from matter templates and the " +
      "cited findings supplied by upstream analysts. Write access. Carries " +
      "[VERIFY] and gaps forward unresolved; never fabricates authority. " +
      "Delegate after analysis findings exist; route output to citation-check.",
    prompt:
      prompt("drafter", "drafter.system.md") +
      "\n\n[Platform note: deliverables are files. Write every finished " +
      "document into the working directory — Markdown (.md) for letters, " +
      "briefs, and legal documents; CSV (.csv) for any tabular data. The " +
      "interface shows the user a download button for each file you write, " +
      "with one-click conversion to PDF and Word from .md, and Excel from " +
      ".csv. State the filename when you finish.]",
    tools: ["Read", "Write", "Edit"],
    model: "sonnet",
  },
  "citation-check": {
    description:
      "Drafting validator. Audits a draft against the citation-grounding " +
      "rubric and the source findings package. Read-only. Returns PASS/FAIL " +
      "with itemized reasons; on FAIL control returns to the orchestrator.",
    prompt: prompt("validator", "validator.system.md"),
    tools: ["Read"],
    model: "sonnet",
  },
  strategy: {
    description:
      "Practice strategy thinking partner. Asks the sharp question, names " +
      "the gap between stated goals and actual behavior, holds the frame. " +
      "Conversation only — no tools.",
    prompt: prompt("vera", "vera.system.md"),
    tools: [],
    model: "opus",
  },
};
