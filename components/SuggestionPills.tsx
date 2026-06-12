"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { PiMicrosoftOutlookLogoFill } from "react-icons/pi";
import { SiDropbox } from "react-icons/si";
import { pickSuggestions } from "@/lib/suggestions";
import type { AgentId } from "@/lib/agent-meta";

/* the firm's actual stack: Outlook / MyCase / Dropbox */
const CONNECTOR_PILLS = [
  { label: "From Outlook", icon: PiMicrosoftOutlookLogoFill, color: "#0F6CBD" },
  { label: "From MyCase", icon: Scale, color: "var(--color-accent)" },
  { label: "From Dropbox", icon: SiDropbox, color: "#0061FF" },
];

const pillClass =
  "flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-input px-3 py-1.5 text-[13px] whitespace-nowrap text-ink-soft transition-colors hover:border-line-strong hover:bg-panel-deep hover:text-ink";

/**
 * One row, six pills: three legal suggestions drawn at random per visit
 * from the pool, plus three fixed connectors.
 */
export default function SuggestionPills({
  onAction,
  onConnector,
}: {
  onAction: (agent: AgentId, prompt: string) => void;
  onConnector: () => void;
}) {
  const [picks] = useState(() => pickSuggestions(3));

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {picks.map((s) => (
        <button
          key={s.label}
          className={pillClass}
          onClick={() => onAction(s.agent, s.prompt)}
        >
          <s.icon className="h-3.5 w-3.5 text-accent" />
          {s.label}
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
