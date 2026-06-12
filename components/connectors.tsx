"use client";

import type { ComponentType, CSSProperties } from "react";
import { Scale, X } from "lucide-react";
import { FaMicrosoft } from "react-icons/fa";
import { PiMicrosoftOutlookLogoFill } from "react-icons/pi";
import {
  SiDropbox,
  SiGmail,
  SiGooglecalendar,
  SiGoogledocs,
  SiGoogledrive,
} from "react-icons/si";

/**
 * Connectors for this firm's actual stack (Sheehe & Associates):
 * Microsoft 365 / Outlook, MyCase, Dropbox — plus the Google family.
 * UI is wired now; OAuth / API configuration arrives in a later phase.
 */
type IconComponent = ComponentType<{
  className?: string;
  style?: CSSProperties;
}>;

export interface Connector {
  id: string;
  name: string;
  icon: IconComponent;
  /** brand color, used for the glyph in both themes */
  color: string;
  hint: string;
}

export const CONNECTORS: Connector[] = [
  // the firm's primary stack
  { id: "outlook", name: "Outlook", icon: PiMicrosoftOutlookLogoFill, color: "#0F6CBD", hint: "Firm email and calendar in case context" },
  { id: "m365", name: "Microsoft 365", icon: FaMicrosoft, color: "#D83B01", hint: "Word documents and OneDrive files" },
  { id: "mycase", name: "MyCase", icon: Scale, color: "var(--color-accent)", hint: "Matters, contacts, deadlines, billing" },
  { id: "dropbox", name: "Dropbox", icon: SiDropbox, color: "#0061FF", hint: "Pull case files from Dropbox" },
  // Google family
  { id: "gmail", name: "Gmail", icon: SiGmail, color: "#EA4335", hint: "Draft and review email in case context" },
  { id: "gdrive", name: "Google Drive", icon: SiGoogledrive, color: "#4285F4", hint: "Pull case files straight from Drive" },
  { id: "gdocs", name: "Google Docs", icon: SiGoogledocs, color: "#4285F4", hint: "Open and edit firm documents" },
  { id: "calendar", name: "Google Calendar", icon: SiGooglecalendar, color: "#34A853", hint: "Deadlines, hearings, statute dates" },
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
      <div className="pop flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-line-strong bg-panel p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl text-ink">Connectors</h2>
            <p className="mt-1 text-[14px] text-muted">
              Bring the firm&apos;s systems into the workspace.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-deep hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <ul className="mt-5 space-y-1 overflow-y-auto">
          {CONNECTORS.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3.5 rounded-xl p-3 transition-colors hover:bg-panel-deep"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-paper">
                <c.icon className="h-5 w-5" style={{ color: c.color }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-ink">
                  {c.name}
                </span>
                <span className="block truncate text-[13px] text-muted">
                  {c.hint}
                </span>
              </span>
              <span
                className="cursor-not-allowed rounded-lg border border-line px-3.5 py-1.5 font-sans text-[12px] font-semibold tracking-wide text-faint uppercase"
                title="Configuration arrives in a later phase"
              >
                Connect
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center font-mono text-[11px] tracking-wider text-faint">
          Configuration coming in a later phase — the UI is wired and ready.
        </p>
      </div>
    </div>
  );
}
