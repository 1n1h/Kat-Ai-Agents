"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { agentById, type AgentId } from "@/lib/agent-meta";
import type { Msg } from "@/lib/store";
import TurnActions from "./TurnActions";
import Spinner from "./Spinner";

/** Bates-style margin numbering — every turn in the record gets a locator. */
const bates = (n: number) => String(n + 1).padStart(3, "0");

function Turn({
  msg,
  index,
  showActions,
  noBorder,
}: {
  msg: Msg;
  index: number;
  showActions?: boolean;
  noBorder?: boolean;
}) {
  const isUser = msg.role === "user";
  const label = isUser ? "You" : agentById(msg.agentId ?? "auto").name;
  return (
    <div
      className={`grid grid-cols-[2.25rem_1fr] gap-x-3 py-6 sm:grid-cols-[3.5rem_1fr] sm:gap-x-4 ${
        noBorder ? "" : "border-b border-line"
      }`}
    >
      <span className="pt-1 text-right font-mono text-[12px] text-faint select-none">
        {bates(index)}
      </span>
      <div>
        <p
          className={`mb-2 font-sans text-[12px] font-semibold tracking-[0.18em] uppercase ${
            isUser ? "text-muted" : "text-accent"
          }`}
        >
          {label}
        </p>
        {isUser ? (
          <p className="whitespace-pre-wrap text-[1.05rem] leading-relaxed text-ink-soft">
            {msg.content}
          </p>
        ) : (
          <div className="prose-legal">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
        {!isUser && showActions && <TurnActions text={msg.content} />}
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
  bottomRef,
}: {
  messages: Msg[];
  live: string;
  statuses: string[];
  streaming: boolean;
  agentId: AgentId;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
      {messages.map((m, i) => (
        <Turn
          key={i}
          msg={m}
          index={i}
          showActions
          // no hairline between the last turn and the in-progress response
          noBorder={streaming && i === messages.length - 1}
        />
      ))}

      {live && (
        <Turn
          msg={{ role: "assistant", content: live, agentId }}
          index={messages.length}
          noBorder
        />
      )}

      {streaming && (
        <div className="grid grid-cols-[2.25rem_1fr] gap-x-3 py-5 sm:grid-cols-[3.5rem_1fr] sm:gap-x-4">
          <span />
          <div className="flex items-start gap-4">
            <Spinner size={34} />
            <div className="space-y-1 pt-1">
              {statuses.slice(-3).map((s, i) => (
                <p key={i} className="font-mono text-[12px] text-muted">
                  <span className="text-accent">→</span> {s}
                </p>
              ))}
              <p className="caret font-mono text-[12px] text-faint">
                {live ? "writing" : "on the record"}
              </p>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
