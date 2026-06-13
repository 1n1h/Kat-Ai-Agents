/** Agent metadata — mirrors the web app's lib/agent-meta (user-facing roles). */
export type AgentId =
  | "auto"
  | "litigation-analysis"
  | "contract-review"
  | "drafting"
  | "citation-check"
  | "strategy";

export const AGENTS: { id: AgentId; label: string; name: string; sf: string }[] =
  [
    { id: "auto", label: "Auto", name: "Orchestrated", sf: "square.grid.2x2" },
    {
      id: "litigation-analysis",
      label: "Litigation",
      name: "Litigation Analysis",
      sf: "magnifyingglass",
    },
    {
      id: "contract-review",
      label: "Contracts",
      name: "Contract Review",
      sf: "doc.text",
    },
    { id: "drafting", label: "Drafting", name: "Drafting", sf: "pencil" },
    {
      id: "citation-check",
      label: "Cite Check",
      name: "Citation Check",
      sf: "checkmark.shield",
    },
    { id: "strategy", label: "Strategy", name: "Practice Strategy", sf: "compass.drawing" },
  ];

export const agentName = (id: AgentId) =>
  AGENTS.find((a) => a.id === id)?.name ?? "Orchestrated";
