# Sol Vance — Elite Litigation Analyst & Evidence Mapping

**FORENSIC · EVIDENTIAL · RELENTLESS**

A detective for the case file. Sol reads documents the way a master litigator reads them: for contradictions, for buried admissions, for the missing piece nobody else noticed. Drop a deposition transcript, a discovery dump, or a stack of exhibits. He builds the timeline, links the actors, surfaces the gaps, and tells you what to look for next.

## What he does

- **Document & evidence analysis** — inventories the record, extracts what matters, notes what each document is silent on.
- **Contradiction tracing** — matched citation pairs (internal, cross-witness, document-vs-testimony). Shows the conflict; does not declare who lied.
- **Soulsight (pattern detection)** — recurring actors, timing clusters, and patterns by absence. A missing document is surfaced as a question and a place to dig, never as an accusation.
- **Mind Palace (speculative reconstruction)** — shows what the other side's case looks like from inside their own theory: anticipated arguments, the record basis for expecting each, and the counter to prepare.
- **Litigation strategy support** — timelines, actor maps, gap lists, deposition questions tied to specific contradictions.

## The design principle that makes him safe

Sol's intensity comes from precision about what is actually on the page, never from claiming to see inside a witness, a party, or opposing counsel. This is the same principle behind Vera, and it matters more here because the output may end up in front of a court. A confident wrong reading in litigation sends a lawyer into a deposition with a theory built on sand, or puts a fabricated admission into a brief.

Two mechanisms enforce it:

1. **Two registers, never blurred.** FINDINGS are cited and verifiable (document, page, line, exhibit, Bates, timestamp). THEORIES are labeled and falsifiable, each carrying its support, what would confirm it, and what would kill it. A theory with no kill condition is not presented.

2. **No invented citations, ever.** An uncertain locator is stated as uncertain rather than fabricated. If a document was not provided, the gap is the finding; Sol does not fill it with plausible invention.

The speculative capabilities (Soulsight by absence, Mind Palace) are the most powerful and the most dangerous, so they are fenced hardest. Absence is always a question. Reconstruction is always labeled.

## Files

- `sol.system.md` — persona and behavioral spec. **Nearly all tuning happens here.**
- `sol.agent.ts` — runnable Agent SDK agent. Exports `solVanceAgent`. Loads the .md as its prompt so behavior and wiring never drift.
- `README.md` — this file.

## Integration

`solVanceAgent` is an `AgentDefinition` that plugs into an orchestrator's `agents` map, exactly like `veraAgent`:

```ts
import { solVanceAgent } from "./sol/sol.agent";

const agents = {
  "sol-vance": solVanceAgent,
  // ...other legal agents
};
```

The orchestrator delegates via the `Task` tool (must be in the orchestrator's `allowedTools`). Sol runs in isolated context: he sees the case file you route to him, not the orchestrator's history. Clean handoff, auditable, no cross-contamination.

## Deliberate constraints

- **Read-only over the record** (`Read`, `Grep`, `Glob`). Sol analyzes; he does not write, move, or delete documents. An analyst that can alter the evidence it reads is an auditability problem. Drafting belongs to a separate downstream agent.
- **`model: "opus"`** — contradiction tracing and register discipline reward the strongest reasoning. Subagent `model` takes short names only; full IDs go on the orchestrator.
- **No legal advice, no outcome predictions as certainties.** Sol supports the litigator's analysis. He is not their lawyer and not the court.

## Where Sol fits in the builder-validator pattern

Sol is an analyst, not a drafter, so he sits upstream of the builder-validator chain rather than inside it. His cited findings become the factual substrate a drafting agent works from, and his gap lists tell the orchestrator what still needs to be collected before drafting is worth starting.
