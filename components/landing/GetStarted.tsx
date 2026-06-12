"use client";

import { LogIn, FolderOpen, MessageSquareText } from "lucide-react";
import { useReveal, revealClass } from "./useReveal";
import InstallButton from "./InstallButton";

const STEPS = [
  {
    icon: LogIn,
    title: "Sign in",
    body: "Use your firm Google account or the email you were invited with. Your work syncs across every device you sign in on.",
  },
  {
    icon: FolderOpen,
    title: "Open a matter",
    body: "Create a case or pick one. Everything you ask and every file you add stays isolated to that matter — never bleeds across clients.",
  },
  {
    icon: MessageSquareText,
    title: "Just ask",
    body: "Type or talk in plain language: “draft a demand letter,” “flag the risk clauses,” “check these cites.” The orchestrator handles the rest.",
  },
];

export default function GetStarted({ onSignIn }: { onSignIn: () => void }) {
  const { ref, shown } = useReveal<HTMLDivElement>();

  return (
    <section className="px-6 py-20 sm:py-28">
      <div ref={ref} className="mx-auto max-w-5xl">
        <div className={revealClass(shown)}>
          <p className="text-center font-mono text-[11px] tracking-[0.28em] text-accent uppercase">
            Getting started
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center font-serif text-3xl leading-tight text-ink sm:text-4xl">
            You're three steps from your first draft.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.title}
                className={revealClass(shown)}
                style={{ transitionDelay: shown ? `${i * 90}ms` : undefined }}
              >
                <div className="card-hover h-full rounded-2xl border border-line-strong bg-panel p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-inset ring-accent/30">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="font-mono text-[12px] tracking-[0.2em] text-faint uppercase">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-serif text-xl text-ink">{s.title}</h3>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">
                    {s.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={revealClass(shown, "mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row")}
          style={{ transitionDelay: shown ? "300ms" : undefined }}
        >
          <button
            onClick={onSignIn}
            className="rounded-full bg-accent px-7 py-3.5 text-[15px] font-semibold text-paper shadow-lg transition-all hover:bg-accent-soft hover:shadow-xl"
          >
            Open the workspace
          </button>
          <InstallButton variant="outline" />
        </div>
      </div>
    </section>
  );
}
