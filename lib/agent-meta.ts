/**
 * Client-safe agent metadata. User-facing names are plain professional roles;
 * the original persona names (Sol, Cass, Lex, Atlas, Vera) live on only as
 * internal folder names under agents/.
 *
 * No node imports here — this file is shared with client components.
 */

export type AgentId =
  | "auto"
  | "litigation-analysis"
  | "contract-review"
  | "drafting"
  | "citation-check"
  | "strategy";

export interface AgentMeta {
  id: AgentId;
  /** Short label for the switcher */
  label: string;
  /** Full role name */
  name: string;
  /** One-line tagline shown under the switcher */
  tagline: string;
  /** Longer blurb for the empty-state card */
  blurb: string;
}

export const AGENTS: AgentMeta[] = [
  {
    id: "auto",
    label: "Auto",
    name: "Orchestrated",
    tagline: "Routes your matter to the right specialist automatically.",
    blurb:
      "The default mode. Triages your request, delegates analysis before drafting, and runs every draft through citation check before it reaches you.",
  },
  {
    id: "litigation-analysis",
    label: "Litigation",
    name: "Litigation Analysis",
    tagline: "Timelines, contradictions, buried admissions, evidence gaps.",
    blurb:
      "Reads depositions and discovery the way a master litigator does. Every finding cites its source; every theory is labeled and falsifiable.",
  },
  {
    id: "contract-review",
    label: "Contracts",
    name: "Contract Review",
    tagline: "Clause-by-clause review, redlines, ranked risk.",
    blurb:
      "Senior-partner-grade contract review: redlines with proposed language and reasoning, ranked risk, and an honest opposing-counsel pass.",
  },
  {
    id: "drafting",
    label: "Drafting",
    name: "Drafting",
    tagline: "Documents assembled from cited findings only.",
    blurb:
      "Drafts letters, briefs, and agreements from your templates and the findings of upstream analysis. Asserts only what its sources support.",
  },
  {
    id: "citation-check",
    label: "Cite Check",
    name: "Citation Check",
    tagline: "Audits drafts for grounding. PASS or FAIL, itemized.",
    blurb:
      "The validator. Checks every assertion in a draft against the source record and returns an itemized PASS/FAIL — the guard against fabricated authority.",
  },
  {
    id: "strategy",
    label: "Strategy",
    name: "Practice Strategy",
    tagline: "A thinking partner for the practice itself.",
    blurb:
      "Strategy and decision support for running the firm: the sharp question, the gap between stated goals and actual behavior, the frame held.",
  },
];

export const agentById = (id: string): AgentMeta =>
  AGENTS.find((a) => a.id === id) ?? AGENTS[0];
