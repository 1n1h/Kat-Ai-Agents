# Drafting chain: Lex Draft + Cite Check

The first write-access agent in the system, plus the validator that gates it. Together they stand up the builder-validator pattern for real.

## Why these two ship together
Sol Vance and Cass Mercer are read-only analysts that produce cited findings, ranked redlines, and `[VERIFY]` lists with nothing downstream to consume them. Lex Draft is that consumer: it turns findings + a template into a document. A drafter is exactly where the no-fabricated-citations rule and the validator-returns-to-orchestrator rule get tested, so the validator is built alongside it.

## Roles

### Lex Draft (`drafter/`) — builder
- Write access (`Read`, `Write`, `Edit`).
- Drafts only what upstream agents cited or the template fixes. Inferences stay in fenced `DRAFTING NOTE` blocks. Gaps surface as `[CITATION NEEDED ...]` or carried-forward `[VERIFY]`.
- Drafts from findings, never beyond them. Never invents authority.

### Cite Check (`validator/`) — validator
- No write access (`Read` only). Has a fixed 9-item rubric.
- Emits PASS or FAIL with source-anchored reasons. Never edits, never produces replacement text.
- On FAIL, returns control to the orchestrator. It does NOT loop back to the drafter. The orchestrator decides whether to re-delegate.

## Flow
```
Sol / Cass  ->  findings package
                     |
            orchestrator (Task)
                     v
                Lex Draft  ->  draft
                     |
            orchestrator (Task)
                     v
               Cite Check
                /        \
             PASS        FAIL --> back to orchestrator (not the drafter)
```

Subagents run in isolated context. There is no free agent-to-agent talk; the orchestrator mediates every hop via the `Task` tool.

## Two-register discipline carried here
- ASSERTED text: source-grounded only, anchored inline.
- DRAFTING NOTE: labeled, fenced, falsifiable, never document-body fact.
- Cass `[VERIFY]`, Sol Theories, and Mind Palace reconstructions never get promoted into asserted propositions.

## Files
```
drafter/
  drafter.system.md   persona — nearly all tuning lives here
  drafter.agent.ts    runnable; loads the .md as prompt; exports drafterAgent
validator/
  validator.system.md persona / rubric
  validator.agent.ts  runnable; loads the .md as prompt; exports validatorAgent
README.md
```

## Model note
Subagent `model` takes short names only (`"sonnet" | "opus" | "haiku"`). Both default to `"sonnet"`; bump the drafter to `"opus"` for high-stakes documents. Full model IDs belong on the orchestrator only.

## Deferred (feeds this chain)
- Matter-type templates for Sol (baseline of a complete record).
- Clause-baseline playbooks for Cass (NDA, MSA, SaaS, employment).
These become the `template` input Lex Draft fills.
