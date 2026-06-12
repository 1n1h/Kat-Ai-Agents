"use client";

import {
  CalendarDays,
  FileText,
  FolderArchive,
  Globe,
  Mail,
  MessagesSquare,
  X,
  type LucideIcon,
} from "lucide-react";

/**
 * Client connectors from the project doc: Email, Google Docs, Slack,
 * Calendar, NetDocuments, SharePoint. UI is wired now; the actual OAuth /
 * API configuration arrives in a later phase.
 */
export interface Connector {
  id: string;
  name: string;
  icon: LucideIcon;
  hint: string;
}

export const CONNECTORS: Connector[] = [
  { id: "gmail", name: "Gmail", icon: Mail, hint: "Draft and review email in matter context" },
  { id: "gdocs", name: "Google Docs", icon: FileText, hint: "Open and edit firm documents" },
  { id: "calendar", name: "Calendar", icon: CalendarDays, hint: "Deadlines, hearings, statute dates" },
  { id: "slack", name: "Slack", icon: MessagesSquare, hint: "Bring team threads into a matter" },
  { id: "netdocuments", name: "NetDocuments", icon: FolderArchive, hint: "Search the firm's document repository" },
  { id: "sharepoint", name: "SharePoint", icon: Globe, hint: "Access firm sites and libraries" },
];

export function ConnectorsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pop w-full max-w-md rounded-2xl border border-line-strong bg-panel p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-xl text-ink">Connectors</h2>
            <p className="mt-1 text-[13px] text-muted">
              Bring the firm&apos;s systems into the workspace.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition-colors hover:bg-panel-deep hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-5 space-y-1">
          {CONNECTORS.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-panel-deep"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper">
                <c.icon className="h-4 w-4 text-ink-soft" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-ink">
                  {c.name}
                </span>
                <span className="block truncate text-[12px] text-muted">
                  {c.hint}
                </span>
              </span>
              <span
                className="cursor-not-allowed rounded-lg border border-line px-3 py-1 font-sans text-[11px] font-semibold tracking-wide text-faint uppercase"
                title="Configuration arrives in a later phase"
              >
                Connect
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center font-mono text-[10px] tracking-wider text-faint">
          Configuration coming in a later phase — the UI is wired and ready.
        </p>
      </div>
    </div>
  );
}
