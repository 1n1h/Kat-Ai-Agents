/**
 * Vera — The Actualizer
 * A standalone strategy & self-mastery coaching agent built on the Claude Agent SDK.
 *
 * Run standalone now; later register the same `veraAgent` definition as a
 * subagent in your legal orchestrator's `agents` map.
 *
 * Setup:
 *   npm install @anthropic-ai/claude-agent-sdk
 *   export ANTHROPIC_API_KEY=...   (or use your Claude plan per the SDK docs)
 *   npx tsx vera.agent.ts
 */

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { query } from "@anthropic-ai/claude-agent-sdk";

const SYSTEM_PROMPT = readFileSync(
  new URL("./vera.system.md", import.meta.url),
  "utf8",
);

/**
 * Portable agent definition. This is the object you reuse when wiring Vera
 * into the orchestrator as a subagent (the orchestrator lists it under `agents`
 * and invokes it via the Task tool).
 */
export const veraAgent = {
  description:
    "Strategy and self-mastery thinking partner. Asks the sharp question, " +
    "names the gap between stated goals and actual behavior, holds the frame. " +
    "Grounded in what the person says — no mind-reading, no diagnosis.",
  prompt: SYSTEM_PROMPT,
  // Coaching is a pure conversation. No file/bash/web tools by default —
  // this keeps her in her lane and removes whole classes of failure.
  tools: [],
  model: "claude-opus-4-8",
};

async function main() {
  const rl = createInterface({ input, output });
  console.log(
    "\nVera — The Actualizer.  (type 'exit' to end)\n" +
      "Bring the strategy question, the identity question, the friction you can't name.\n",
  );

  // Maintain full turn history; the SDK has no memory between calls.
  const history: { role: "user" | "assistant"; content: string }[] = [];

  while (true) {
    const userText = (await rl.question("you  › ")).trim();
    if (!userText || userText.toLowerCase() === "exit") break;
    history.push({ role: "user", content: userText });

    let assistantText = "";
    const stream = query({
      prompt: history.map((m) => `${m.role}: ${m.content}`).join("\n\n"),
      options: {
        systemPrompt: SYSTEM_PROMPT,
        model: "claude-opus-4-8",
        allowedTools: [], // conversation only
      },
    });

    process.stdout.write("\nVera › ");
    for await (const msg of stream) {
      if (msg.type === "assistant") {
        for (const block of msg.message.content) {
          if (block.type === "text") {
            process.stdout.write(block.text);
            assistantText += block.text;
          }
        }
      }
    }
    process.stdout.write("\n\n");
    history.push({ role: "assistant", content: assistantText });
  }

  rl.close();
  console.log("\nOne thing. Go do it.\n");
}

main().catch((err) => {
  console.error("Vera error:", err);
  process.exit(1);
});
