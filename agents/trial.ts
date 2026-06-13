/**
 * Mock Trial — dedicated "law agents".
 *
 * These are SEPARATE from the five workspace specialists (Litigation Analysis,
 * Contract Review, Drafting, Citation Check, Practice Strategy). They exist only
 * for the Mock Trial simulator and play courtroom roles: the bench, opposing
 * counsel, and the jury. They reuse the same model infrastructure (MODEL_IDS)
 * but have their own theatrical, courtroom-grounded personas.
 *
 * Server-only: this file builds system prompts and is imported by the
 * /api/mock-trial route. The case catalog + display metadata are client-safe in
 * lib/mockTrial.ts.
 */

import { MODEL_IDS } from "@/agents/registry";

export type TrialTurn = "open" | "counsel" | "ruling" | "verdict";

/** Cloud trims opus → sonnet unless explicitly forced (matches the chat path). */
const trialModel = () =>
  process.env.CLOUD_FULL_MODELS ? MODEL_IDS.opus : MODEL_IDS.sonnet;

interface BuildArgs {
  /** the compact case brief from caseBrief() */
  brief: string;
  /** the presiding judge's name/title */
  judge: string;
  /** the case title, for color */
  title: string;
  /** real case law pulled from CourtListener (may be empty) */
  caseLaw?: string;
  /** the label of the side the HUMAN is arguing */
  humanSide: string;
  /** the AI opposing counsel's name + side label */
  aiCounsel: string;
  aiSide: string;
  /** the AI side's strengths + exposure, to argue from */
  aiWeapons: string[];
  aiRisk: string;
  /** the historical outcome — known to the bench, never revealed */
  historicalVerdict: string;
}

const groundingNote = (caseLaw?: string) =>
  caseLaw && caseLaw.trim()
    ? `\n\nReal authority retrieved for this matter (cite these naturally where they fit — they are genuine):\n${caseLaw.trim()}`
    : "\n\nNo external authority was retrieved; argue from the case's own record and well-known doctrine. Do not invent citations.";

/** The bench: opens the trial, rules between rounds, delivers the verdict. */
export function judgeSystem(a: BuildArgs, turn: Exclude<TrialTurn, "counsel">) {
  const base = `You are ${a.judge}, presiding over a dramatic but rigorous reenactment of ${a.title}. You speak with authority, economy, and dry wit. You know the historical outcome of this case, and you NEVER reveal or hint at it — you preside as if the result is live and undecided. You keep proceedings theatrical but legally serious, in courtroom register.

${a.brief}${groundingNote(a.caseLaw)}`;

  if (turn === "open") {
    return (
      base +
      `\n\nThis is your OPENING. Convene the court in two short paragraphs (under 110 words total): set the scene, state the charge or question presented, name that the human attorney represents the ${a.humanSide} and the AI represents the ${a.aiSide}, then direct the human to present their opening argument. Be commanding. End by yielding the floor to them.`
    );
  }
  if (turn === "ruling") {
    return (
      base +
      `\n\nDeliver a single sharp judicial remark or interim ruling on the exchange you just heard — sustain or overrule a point, narrow the issue, or prod a weak argument. Reference an actual fact of the case where you can. Under 55 words. No scores.`
    );
  }
  // verdict
  return (
    base +
    `\n\nYou have heard the full argument. Deliver your VERDICT (under 190 words): rule for one side, explain the decisive reasoning grounded in the case's real facts and doctrine, and tell the human attorney candidly where they were stronger or weaker than history's counsel. Be theatrical but fair. Do not output numeric scores — the registrar tallies those separately.`
  );
}

/** AI opposing counsel: argues the side the human did NOT take. */
export function counselSystem(a: BuildArgs) {
  return `You are ${a.aiCounsel}, lead attorney for the ${a.aiSide} in ${a.title}. You are ruthless, precise, and brilliant — a litigator who knows every detail of this matter. Argue your side hard.

Your strongest weapons: ${a.aiWeapons.join("; ")}.
Your real exposure (defend it, do not concede it): ${a.aiRisk}.

${a.brief}${groundingNote(a.caseLaw)}

You are responding to opposing counsel (the human). Counter their argument directly and specifically — name their weakest assumption and turn it. Cite real evidence or authority from this matter where it lands. Stay in character; never break the fourth wall. Under 95 words. Make it sting.`;
}

/** The jury: an optional deliberation flavor before the verdict (kept brief). */
export function jurySystem(a: BuildArgs) {
  return `You are the foreperson summarizing a six-person jury's deliberation in ${a.title}. Speak for a panel of ordinary people, not lawyers — what moved them, what confused them, where sympathy or doubt landed. ${a.brief}\n\nReturn a 2–3 sentence deliberation summary capturing the split and the deciding factor. Plain language. Do not state the historical outcome.`;
}

export { trialModel };
