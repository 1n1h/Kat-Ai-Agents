"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AGENTS, agentById, type AgentId } from "@/lib/agent-meta";
import type { Msg } from "@/lib/store";

/** Bates-style margin numbering — every turn in the record gets a locator. */
const bates = (n: number) => String(n + 1).padStart(3, "0");

function Turn({ msg, index }: { msg: Msg; index: number }) {
  const isUser = msg.role === "user";
  const label = isUser ? "You" : agentById(msg.agentId ?? "auto").name;
  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-b border-line py-6">
      <span className="pt-1 text-right font-mono text-[11px] text-faint select-none">
        {bates(index)}
      </span>
      <div>
        <p
          className={`mb-2 font-sans text-[11px] font-semibold tracking-[0.18em] uppercase ${
            isUser ? "text-muted" : "text-accent"
          }`}
        >
          {label}
        </p>
        {isUser ? (
          <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink-soft">
            {msg.content}
          </p>
        ) : (
          <div className="prose-legal">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (id: AgentId) => void }) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col justify-center px-6 pb-24">
      <p className="rise rise-1 font-mono text-[11px] tracking-[0.25em] text-accent">
        THE RECORD IS OPEN
      </p>
      <h1 className="rise rise-2 mt-4 max-w-xl font-serif text-4xl leading-tight text-ink">
        Good counsel begins with the record.
      </h1>
      <p className="rise rise-3 mt-4 max-w-lg text-sm leading-relaxed text-muted">
        Upload the documents that matter, then put a specialist on them. Every
        finding cites its source. Every draft is checked before it reaches you.
      </p>
      <div className="rise rise-4 mt-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => onPick(a.id)}
            className="group bg-paper p-5 text-left transition-colors hover:bg-panel"
          >
            <p className="font-sans text-[11px] font-semibold tracking-[0.18em] text-ink uppercase group-hover:text-accent">
              {a.name}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {a.blurb}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Transcript({
  messages,
  live,
  statuses,
  streaming,
  agentId,
  onPickAgent,
  bottomRef,
}: {
  messages: Msg[];
  live: string;
  statuses: string[];
  streaming: boolean;
  agentId: AgentId;
  onPickAgent: (id: AgentId) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!messages.length && !streaming) {
    return <EmptyState onPick={onPickAgent} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-10">
      {messages.map((m, i) => (
        <Turn key={i} msg={m} index={i} />
      ))}

      {live && (
        <Turn
          msg={{ role: "assistant", content: live, agentId }}
          index={messages.length}
        />
      )}

      {streaming && (
        <div className="grid grid-cols-[3.5rem_1fr] gap-x-4 py-5">
          <span />
          <div className="space-y-1">
            {statuses.slice(-3).map((s, i) => (
              <p key={i} className="font-mono text-[11px] text-muted">
                <span className="text-accent">→</span> {s}
              </p>
            ))}
            <p className="caret font-mono text-[11px] text-faint">
              {live ? "writing" : "on the record"}
            </p>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
