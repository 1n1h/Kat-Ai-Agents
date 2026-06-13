"use client";

import { useEffect, useState, type ComponentType, type CSSProperties } from "react";
import { Check, Scale, X } from "lucide-react";
import { FaMicrosoft } from "react-icons/fa";
import { PiMicrosoftOutlookLogoFill } from "react-icons/pi";
import {
  SiDropbox,
  SiGmail,
  SiGooglecalendar,
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
  // Google family — one grant covers all three (Docs read via Drive)
  { id: "gmail", name: "Gmail", icon: SiGmail, color: "#EA4335", hint: "Draft and review email in case context" },
  { id: "gdrive", name: "Google Drive", icon: SiGoogledrive, color: "#4285F4", hint: "Case files and Google Docs from Drive" },
  { id: "calendar", name: "Google Calendar", icon: SiGooglecalendar, color: "#34A853", hint: "Deadlines, hearings, statute dates" },
];

/** rows that share another connector's OAuth flow */
const FLOW_ALIAS: Record<string, string> = {
  gdrive: "gmail",
  calendar: "gmail",
  // one Microsoft grant covers Outlook (mail/calendar) + Microsoft 365 (files)
  m365: "outlook",
};

export function ConnectorsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  /* which connectors have a live OAuth flow today */
  const CONNECTABLE = new Set([
    "dropbox",
    "outlook",
    "m365",
    "gmail",
    "gdrive",
    "calendar",
  ]);
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    fetch("/api/connectors/status")
      .then((r) => r.json())
      .then(setConnected)
      .catch(() => setConnected({}));
  }, [open]);

  async function disconnect(id: string) {
    await fetch("/api/connectors/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConnected((c) => ({ ...c, [id]: false }));
  }

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
              {connected[c.id] ? (
                <button
                  onClick={() => void disconnect(c.id)}
                  title="Connected — click to disconnect"
                  className="flex items-center gap-1.5 rounded-lg border border-accent bg-accent-wash px-3.5 py-1.5 font-sans text-[12px] font-semibold tracking-wide text-accent uppercase transition-colors hover:border-line hover:bg-transparent hover:text-muted"
                >
                  <Check className="h-3.5 w-3.5" />
                  Connected
                </button>
              ) : CONNECTABLE.has(c.id) ? (
                <a
                  href={`/api/connectors/${FLOW_ALIAS[c.id] ?? c.id}/start`}
                  className="rounded-lg border border-line-strong px-3.5 py-1.5 font-sans text-[12px] font-semibold tracking-wide text-ink uppercase transition-colors hover:border-accent hover:text-accent"
                >
                  Connect
                </a>
              ) : (
                <span
                  className="cursor-not-allowed rounded-lg border border-line px-3.5 py-1.5 font-sans text-[12px] font-semibold tracking-wide text-faint uppercase"
                  title="This connector's setup is in progress"
                >
                  Soon
                </span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center font-mono text-[11px] tracking-wider text-faint">
          Connections are per-browser and revocable here or in the provider.
        </p>
      </div>
    </div>
  );
}
