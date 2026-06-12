/**
 * Rotating suggestion pool for the hero pills. Three are drawn at random
 * per visit, so the row reads fresh while staying squarely in legal work.
 * Each suggestion routes to the right specialist with a strong prompt.
 */

import {
  CheckCheck,
  FileSearch,
  FileText,
  Gavel,
  LineChart,
  ListOrdered,
  PenLine,
  Scale,
  ScrollText,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AgentId } from "./agent-meta";

export interface Suggestion {
  label: string;
  icon: LucideIcon;
  agent: AgentId;
  prompt: string;
}

export const SUGGESTION_POOL: Suggestion[] = [
  {
    label: "Create a cover letter",
    icon: PenLine,
    agent: "drafting",
    prompt: "Draft a professional cover letter to accompany ",
  },
  {
    label: "Draft interrogatories",
    icon: ListOrdered,
    agent: "drafting",
    prompt:
      "Draft a set of interrogatories for this matter. Ask me what facts and claims they should target before drafting.",
  },
  {
    label: "Discovery request",
    icon: FileSearch,
    agent: "drafting",
    prompt:
      "Draft a request for production of documents. Ask me about the claims at issue and the categories of documents we need.",
  },
  {
    label: "Review a contract",
    icon: ScrollText,
    agent: "contract-review",
    prompt:
      "Review the attached contract clause by clause: material terms, missing building blocks, ranked risks, and proposed redlines with verbatim language.",
  },
  {
    label: "Build a timeline",
    icon: ListOrdered,
    agent: "litigation-analysis",
    prompt:
      "Build a timeline from the documents in this case: key events, actors, and contradictions, every entry cited to its source.",
  },
  {
    label: "Check citations",
    icon: CheckCheck,
    agent: "citation-check",
    prompt:
      "Audit the attached draft for citation grounding: verify every assertion against the source record and return an itemized PASS/FAIL.",
  },
  {
    label: "Find contradictions",
    icon: Search,
    agent: "litigation-analysis",
    prompt:
      "Trace contradictions across the documents in this case: internal, cross-witness, and document-versus-testimony, each as a matched pair of citations.",
  },
  {
    label: "Demand letter",
    icon: Gavel,
    agent: "drafting",
    prompt:
      "Draft a demand letter. Ask me about the parties, the harm, the amount demanded, and the deadline before drafting.",
  },
  {
    label: "Deposition prep",
    icon: Users,
    agent: "litigation-analysis",
    prompt:
      "Prepare deposition questions tied to specific contradictions and gaps in the record for this case. Ask me who the deponent is.",
  },
  {
    label: "Redline an NDA",
    icon: ScrollText,
    agent: "contract-review",
    prompt:
      "Redline the attached NDA: flag one-sided terms, missing carve-outs, and survival issues, with proposed replacement language.",
  },
  {
    label: "Engagement letter",
    icon: FileText,
    agent: "drafting",
    prompt:
      "Draft a client engagement letter including an AI-use disclosure provision. Ask me about scope, fees, and jurisdiction first.",
  },
  {
    label: "Cease and desist",
    icon: Gavel,
    agent: "drafting",
    prompt:
      "Draft a cease and desist letter. Ask me about the conduct, the legal basis, and the remedy sought before drafting.",
  },
  {
    label: "Spot missing clauses",
    icon: Scale,
    agent: "contract-review",
    prompt:
      "Identify the building blocks missing from the attached agreement for its contract type, and explain the risk each gap creates.",
  },
  {
    label: "Settlement posture",
    icon: LineChart,
    agent: "litigation-analysis",
    prompt:
      "From the record in this case, assess settlement posture: strengths, weaknesses, and what the other side likely fears most — with citations, theories labeled.",
  },
  {
    label: "Client intake summary",
    icon: FileText,
    agent: "litigation-analysis",
    prompt:
      "Summarize the attached intake materials: facts, parties, potential claims, deadlines to calendar, and open questions to ask the client.",
  },
  {
    label: "Motion outline",
    icon: Gavel,
    agent: "drafting",
    prompt:
      "Outline a motion for this case from the findings in the record. Ask me which motion and which court before drafting.",
  },
  {
    label: "Opposing counsel pass",
    icon: Users,
    agent: "contract-review",
    prompt:
      "Play opposing counsel on the attached agreement: name the pushback by clause and propose mitigations for each.",
  },
  {
    label: "Affidavit draft",
    icon: PenLine,
    agent: "drafting",
    prompt:
      "Draft an affidavit from the facts in this case. Ask me who the affiant is and what the affidavit must establish.",
  },
  {
    label: "Case strategy session",
    icon: LineChart,
    agent: "strategy",
    prompt: "Help me think through strategy on this matter: ",
  },
];

/** n distinct random picks, drawn once per visit. */
export function pickSuggestions(n: number): Suggestion[] {
  const pool = [...SUGGESTION_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
