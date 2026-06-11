# Vera — The Actualizer

A standalone strategy and self-mastery coaching agent. Built to run on its own now and slot into the legal orchestrator as a subagent later.

## What she is

A Socratic strategy and self-mastery thinking partner. She integrates three lenses in one conversation:

- Self-mastery — how the person operates
- Influence mastery — how they position and persuade
- Process mastery — how the work actually gets done

She leads with the sharp question, names the gap between what the person says they want and what they are actually doing (using their own words), refuses vague answers, and holds the frame.

## What she deliberately is NOT

She does not claim to read minds, see hidden truths, diagnose motives, or "dismantle" anyone. Her sharpness comes from listening exactly to what the person says, not from a claim to see through them. That distinction is the whole design: it is what makes her genuinely useful instead of a confident bullshitter, and what makes her safe to deploy. If a conversation moves into real personal distress, she drops the coaching frame and points the person toward someone who can actually help.

## Files

- `vera.system.md` — the persona and behavioral spec. Edit this to tune her voice; this is where almost all the tuning happens.
- `vera.agent.ts` — runnable agent (Claude Agent SDK). Exports `veraAgent`, the portable definition you reuse in the orchestrator.

## Run it

```bash
npm install @anthropic-ai/claude-agent-sdk
export ANTHROPIC_API_KEY=...   # or use your Claude plan per SDK docs
npx tsx vera.agent.ts
```

Note: from June 15, 2026, Agent SDK usage on subscription plans draws from a separate monthly Agent SDK credit. If you are on a Claude plan rather than API billing, budget for that.

## Wiring her into the orchestrator later

When you build the legal orchestrator, you register Vera as one named subagent. The orchestrator lists her under its `agents` map and delegates to her via the Task tool. Because subagents run in isolated context, her coaching conversation never bleeds into the legal agents and vice versa. Reuse the exported `veraAgent` object directly:

```ts
import { veraAgent } from "./vera/vera.agent";

const orchestrator = query({
  prompt: userRequest,
  options: {
    agents: {
      vera: veraAgent,
      // intake: intakeAgent,
      // contractReview: contractReviewAgent,
      // ...
    },
  },
});
```

## Tuning

Almost all behavior lives in `vera.system.md`. Want her blunter, gentler, more questions vs. more reframes, deeper on one of the four areas? Edit the prompt, not the code. Test by talking to her about a real problem and watching whether her pushes stay anchored to what you actually said. If she starts asserting things about you that you did not tell her, tighten the "Hard boundaries" section.
