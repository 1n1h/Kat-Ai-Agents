"use client";

import {
  CheckCheck,
  LineChart,
  ListOrdered,
  PenLine,
  ScrollText,
} from "lucide-react";
import { SiGmail, SiGooglecalendar, SiGoogledrive } from "react-icons/si";
import type { AgentId } from "@/lib/agent-meta";

interface ActionPill {
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  agent: AgentId;
  prompt: string;
}

const ACTIONS: ActionPill[] = [
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
    label: "Draft",
    icon: PenLine,
    agent: "drafting",
    prompt: "Draft a letter to opposing counsel regarding ",
  },
  {
    label: "Check citations",
    icon: CheckCheck,
    agent: "citation-check",
    prompt:
      "Audit the attached draft for citation grounding: verify every assertion against the source record and return an itemized PASS/FAIL.",
  },
  {
    label: "Strategize",
    icon: LineChart,
    agent: "strategy",
    prompt: "Help me think through ",
  },
];

const CONNECTOR_PILLS = [
  { label: "From Gmail", icon: SiGmail, color: "#EA4335" },
  { label: "From Drive", icon: SiGoogledrive, color: "#4285F4" },
  { label: "From Calendar", icon: SiGooglecalendar, color: "#34A853" },
];

const pillClass =
  "flex items-center gap-1.5 rounded-lg border border-line bg-input px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:bg-panel-deep hover:text-ink";

export default function SuggestionPills({
  onAction,
  onConnector,
}: {
  onAction: (agent: AgentId, prompt: string) => void;
  onConnector: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {ACTIONS.map((a) => (
        <button
          key={a.label}
          className={pillClass}
          onClick={() => onAction(a.agent, a.prompt)}
        >
          <a.icon className="h-3.5 w-3.5 text-accent" />
          {a.label}
        </button>
      ))}
      {CONNECTOR_PILLS.map((c) => (
        <button key={c.label} className={pillClass} onClick={onConnector}>
          <c.icon className="h-3.5 w-3.5" style={{ color: c.color }} />
          {c.label}
        </button>
      ))}
    </div>
  );
}
