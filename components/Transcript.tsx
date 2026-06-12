"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText } from "lucide-react";
import { agentById, type AgentId } from "@/lib/agent-meta";
import type { Msg } from "@/lib/store";
import TurnActions from "./TurnActions";
import Spinner from "./Spinner";

/** Downloadable deliverable written by an agent during a turn. */
function FileChip({ name, matterId }: { name: string; matterId: string }) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  const textish = ext === ".md" || ext === ".txt";
  const isCsv = ext === ".csv";
  const url = (to?: string) =>
    `/api/files/download?matterId=${encodeURIComponent(matterId)}&name=${encodeURIComponent(name)}${to ? `&to=${to}` : ""}`;
  const convBtn =
    "rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted transition-colors hover:border-accent hover:text-accent";

  return (
    <span className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5">
      <FileText className="h-4 w-4 shrink-0 text-accent" />
      <a
        href={url()}
        download
        className="max-w-56 truncate font-mono text-[12px] text-ink hover:text-accent"
        title={`Download ${name}`}
      >
        {name}
      </a>
      {textish && (
        <>
          <a href={url("pdf")} className={convBtn} title="Download as PDF">
            PDF
          </a>
          <a href={url("docx")} className={convBtn} title="Download as Word">
            DOCX
          </a>
        </>
      )}
      {isCsv && (
        <a href={url("xlsx")} className={convBtn} title="Download as Excel">
          XLSX
        </a>
      )}
    </span>
  );
}

/** Bates-style margin numbering — every turn in the record gets a locator. */
const bates = (n: number) => String(n + 1).padStart(3, "0");

function Turn({
  msg,
  index,
  showActions,
  matterId,
}: {
  msg: Msg;
  index: number;
  showActions?: boolean;
  matterId: string;
}) {
  const isUser = msg.role === "user";
  const label = isUser ? "You" : agentById(msg.agentId ?? "auto").name;
  return (
    // Bates locator hangs in the left margin so the text column stays
    // flush with the composer below it
    <div className="relative py-6">
      <span className="absolute top-[1.55rem] -left-12 hidden w-9 text-right font-mono text-[12px] text-faint select-none sm:block">
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
        {!isUser && msg.files && msg.files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {msg.files.map((f) => (
              <FileChip key={f} name={f} matterId={matterId} />
            ))}
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
  matterId,
  bottomRef,
}: {
  messages: Msg[];
  live: string;
  statuses: string[];
  streaming: boolean;
  agentId: AgentId;
  matterId: string;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
      {messages.map((m, i) => (
        <Turn key={i} msg={m} index={i} showActions matterId={matterId} />
      ))}

      {live && (
        <Turn
          msg={{ role: "assistant", content: live, agentId }}
          index={messages.length}
          matterId={matterId}
        />
      )}

      {streaming && (
        <div className="py-5">
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
