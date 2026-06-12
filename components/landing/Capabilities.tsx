"use client";

import {
  AudioLines,
  FileDown,
  FolderLock,
  Mic,
  Plug,
  UploadCloud,
  type LucideIcon,
} from "lucide-react";
import { CONNECTORS } from "@/components/connectors";
import Marquee from "./Marquee";
import { useReveal, revealClass } from "./useReveal";

interface Capability {
  icon: LucideIcon;
  title: string;
  body: string;
}

const CAPS: Capability[] = [
  {
    icon: AudioLines,
    title: "Hands-free voice",
    body: "Hold a real conversation with your matter. Speak, and it answers aloud — interrupt any time to redirect. Built for the drive between hearings.",
  },
  {
    icon: Mic,
    title: "Dictation, not transcription theater",
    body: "Tap to dictate; your words land in the composer as clean text you can edit before anything is sent. Nothing leaves until you say so.",
  },
  {
    icon: UploadCloud,
    title: "Drop in the record",
    body: "Upload depositions, discovery, and contracts straight into a matter. The analysts read only that matter's files — never another client's.",
  },
  {
    icon: FileDown,
    title: "Court-ready deliverables",
    body: "Drafts come back as real documents — one-click export to PDF and Word for letters and briefs, Excel for tabular work product.",
  },
  {
    icon: FolderLock,
    title: "Matter-isolated by design",
    body: "Every conversation and file belongs to a matter with its own workspace. Agents can never reach across cases.",
  },
  {
    icon: Plug,
    title: "Connected to your stack",
    body: "Bring the firm's systems into the case — Gmail, Drive, Docs, Calendar, Slack, NetDocuments, and SharePoint.",
  },
];

export default function Capabilities() {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <section className="px-6 py-20 sm:py-28">
      <div ref={ref} className="mx-auto max-w-5xl">
        <div className={revealClass(shown)}>
          <p className="text-center font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
            The whole practice, in one place
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Talk to it, hand it the file, get back work product
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPS.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className={revealClass(
                  shown,
                  "rounded-2xl border border-line bg-panel p-6",
                )}
                style={{ transitionDelay: shown ? `${i * 70}ms` : undefined }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-inset ring-accent/30">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-sans text-[16px] font-semibold text-ink">
                  {c.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  {c.body}
                </p>
              </div>
            );
          })}
        </div>

        {/* connector marks — a scrolling strip of the tools it connects to */}
        <div
          className={revealClass(shown, "mt-12")}
          style={{ transitionDelay: shown ? "200ms" : undefined }}
        >
          <p className="mb-4 text-center font-mono text-[10.5px] tracking-[0.24em] text-muted uppercase">
            Connects with the tools your firm already runs on
          </p>
          <Marquee durationSec={38} reverse>
            {CONNECTORS.map((c) => (
              <span
                key={c.id}
                title={c.hint}
                className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-panel px-4 py-2.5"
              >
                <c.icon className="h-4 w-4 shrink-0" style={{ color: c.color }} />
                <span className="text-[13.5px] text-ink-soft">{c.name}</span>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
