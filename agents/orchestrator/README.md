# Atlas — Orchestrator

The front door and mediator of the system. Referenced by every other agent's chain notes but never built as an artifact until now. Atlas is the only component that holds the full picture of a matter as it moves, the only one that delegates, and the only one that carries the full model IDs.

## Why it exists
Every subagent so far describes its role relative to "the orchestrator": Sol and Cass are "upstream of drafting," Lex Draft is delegated "via the Task tool," Cite Check "returns control to the orchestrator on FAIL." That component was assumed everywhere and defined nowhere. Atlas is that component made real. Without it the builder-validator resolution has no home and the no-fabricated-citations chain has nothing carrying its tags forward.

## What it does NOT do
Atlas does no analysis, no drafting, no validation, and discharges no tags. It has the `Task` tool and nothing else: no `Read`, no `Write`, no `Edit`. It never touches a record, a draft, or a source. Anything substantive is delegated.

## Roles it delegates to
```
                         human / matter in
                                |
                                v
                          ┌───────────┐
                          │   ATLAS   │  (Task only; holds full model IDs)
                          └───────────┘
                                |
        ┌───────────────────────┼────────────────────────┐
        v                       v                         v
  intake / triage          Sol Vance                 Cass Mercer
  green/yellow/red       litigation (opus)          contract (opus)
  settles scope          FINDINGS/THEORIES          FINDINGS/[VERIFY]
        |                       \                        /
        |                        \                      /
        |                         v                    v
        |                        findings package (via Atlas)
        |                                 |
        |                                 v
        |                            Lex Draft  (write access — builder)
        |                                 |
        |                          draft (via Atlas)
        |                                 v
        |                            Cite Check  (read-only — validator)
        |                              /        \
        |                           PASS        FAIL
        |                            |            |
        |                            v            v
        |                          done    back to ATLAS
        |                                  (re-delegate / route [VERIFY] / human)
        └─────────────────────────────────────────────┘
                    Atlas mediates every hop
```

## Routing invariants
1. **Scope before substance.** intake/triage settles green/yellow/red before Sol, Cass, or Lex fire.
2. **Analysis before drafting.** Lex Draft is never the first substantive agent; it consumes a Sol or Cass findings package.
3. **One hop at a time.** Atlas passes one subagent's output as the next's input. Subagents never fetch each other's work; they run in isolated context.
4. **Builder-validator resolution lives in Atlas.** On Cite Check FAIL, control returns to Atlas, not to Lex Draft. Atlas decides: re-delegate drafting with the failure notes, route an unresolved `[VERIFY]` to an analyst, or surface to the human. No automatic redraft loop.
5. **Tags carry forward, never discharged.** `[VERIFY]`, `[CITATION NEEDED]`, Theories, and fenced notes travel through Atlas intact. Atlas routes them to an agent that can discharge them (or to the human); it never resolves them by asserting knowledge.

## The model-ID question, resolved
Subagents carry short names (`"opus" | "sonnet" | "haiku"`) only. Atlas holds the one `MODEL_IDS` map that resolves those to concrete strings. Changing the actual model behind "opus" is a single-file edit here and never leaks into a persona. Atlas itself runs on opus because it makes the routing and validator-resolution calls that gate every downstream agent.

## Two registers, carried here too
- **ROUTING DECISION** — what was delegated, to whom, why; anchored to outputs in hand.
- **ORCHESTRATION NOTE** — fenced, labeled, falsifiable sequencing reasoning; never asserted fact.

## Files
```
orchestrator/
  orchestrator.system.md   persona — nearly all tuning lives here
  orchestrator.agent.ts    runnable; loads the .md; exports orchestratorAgent + MODEL_IDS
  README.md
```

## Still open
- **Matter/deadline tracker** — the one genuinely stateful agent. Where matter state lives is unresolved, since subagents are isolated-context. Atlas is stateless per-hop; persistence is a separate decision to make before that agent is built.
- **Citation/authority verifier** — the read-only agent that actually discharges Cass `[VERIFY]` and Lex `[CITATION NEEDED]` against a real source. Atlas currently routes those tags forward but nothing closes them yet. This is the natural next build: it gives Atlas a real target to route tags to.
- **No em dashes** in any drafted content, per house style.
