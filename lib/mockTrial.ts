/**
 * Mock Trial — client-safe data & types.
 *
 * The case catalog (landmark trials to argue against the AI) plus the display
 * metadata for the trial "law agents" (counsel / bench / jury). No node imports
 * here — this is shared with the client game UI. The agent *system prompts*
 * live server-side in agents/trial.ts.
 */

export type TrialRoleId = "you" | "counsel" | "judge" | "jury";

/** A side of a case (one is played by the human, the other by AI counsel). */
export interface CaseSide {
  /** stable key used to pick the human's side ("plaintiff", "defense", …) */
  key: string;
  /** courtroom label, e.g. "Plaintiff (Roe)" */
  label: string;
  /** the real attorney who argued it — the AI adopts this when it plays */
  counsel: string;
  /** what this side is trying to achieve */
  goal: string;
  /** the strongest points available to this side (shown as clickable chips) */
  weapons: string[];
  /** the side's biggest exposure */
  risk: string;
}

export interface TrialCase {
  id: string;
  title: string;
  year: string;
  category: string;
  /** one-glyph mnemonic for the lobby card */
  glyph: string;
  /** 1–5 — how charged / hard the case is */
  heat: number;
  blurb: string;
  /** keyed by side.key */
  sides: Record<string, CaseSide>;
  judge: string;
  stakes: string;
  /** revealed only after the user's trial concludes */
  historicalVerdict: string;
  /** the doctrine in play — also seeds the CourtListener grounding query */
  principle: string;
  /** extra search terms for grounding (defaults to title + category) */
  searchTerms?: string;
}

export const TRIAL_CATEGORIES = [
  "All",
  "Criminal",
  "Civil Rights",
  "Constitutional",
  "IP / Tech",
  "White Collar",
  "Antitrust",
] as const;

/**
 * Trial role display metadata. Colors map onto the Lex palette: brass for the
 * bench, a cool navy-steel for AI counsel, a sage green for the human, jade for
 * the jury — all legible on the cream and navy themes.
 */
export const TRIAL_ROLES: Record<
  TrialRoleId,
  { label: string; color: string; tint: string }
> = {
  you: { label: "You", color: "#5d7f4e", tint: "rgba(124,154,109,0.16)" },
  counsel: { label: "Opposing Counsel", color: "#5b86b3", tint: "rgba(91,134,179,0.16)" },
  judge: { label: "The Bench", color: "#c9a55c", tint: "rgba(201,165,92,0.16)" },
  jury: { label: "Jury", color: "#7c9a6d", tint: "rgba(124,154,109,0.16)" },
};

export const MAX_ROUNDS = 4;

export const CASES: TrialCase[] = [
  {
    id: "oj",
    title: "People v. O.J. Simpson",
    year: "1995",
    category: "Criminal",
    glyph: "✦",
    heat: 5,
    blurb:
      "The trial of the century. DNA, race, celebrity, and the Dream Team against the LAPD — a double-murder prosecution that gripped the nation.",
    sides: {
      prosecution: {
        key: "prosecution",
        label: "Prosecution",
        counsel: "Marcia Clark",
        goal: "Prove Simpson murdered Nicole Brown Simpson and Ron Goldman beyond a reasonable doubt.",
        weapons: [
          "Blood evidence at the scene",
          "DNA matching",
          "History of domestic violence",
          "Bruno Magli shoe prints",
          "No alibi for the time of the murders",
        ],
        risk: "LAPD evidence-handling misconduct and Detective Fuhrman's exposed racism.",
      },
      defense: {
        key: "defense",
        label: "Defense",
        counsel: "Johnnie Cochran",
        goal: "Create reasonable doubt by attacking evidence integrity and exposing LAPD misconduct.",
        weapons: [
          "The glove doesn't fit",
          "LAPD planted evidence",
          "Fuhrman caught using slurs on tape",
          "Blood-sample degradation",
          "Chain-of-custody failures",
        ],
        risk: "The DNA evidence is overwhelming if the jury trusts the LAPD.",
      },
    },
    judge: "Judge Lance Ito",
    stakes: "Double murder — life in prison vs. acquittal.",
    historicalVerdict: "NOT GUILTY (1995) — the jury deliberated only four hours.",
    principle: "Reasonable doubt, chain of custody, Fourth Amendment.",
    searchTerms: "murder reasonable doubt chain of custody",
  },
  {
    id: "roe",
    title: "Roe v. Wade",
    year: "1973",
    category: "Constitutional",
    glyph: "⚖",
    heat: 5,
    blurb:
      "Jane Roe challenged Texas's near-total abortion ban. The decision reshaped constitutional privacy law and American politics for fifty years.",
    sides: {
      plaintiff: {
        key: "plaintiff",
        label: "Plaintiff (Roe)",
        counsel: "Sarah Weddington",
        goal: "Establish a constitutional right to abortion under the Fourteenth Amendment right to privacy.",
        weapons: [
          "Griswold v. Connecticut privacy precedent",
          "Fourteenth Amendment liberty interest",
          "Medical consensus on viability",
          "No compelling state interest in the first trimester",
        ],
        risk: "No explicit constitutional text — the right must be argued as implied.",
      },
      defense: {
        key: "defense",
        label: "State of Texas",
        counsel: "Jay Floyd",
        goal: "Defend the Texas statute as a valid exercise of the state's police power to protect potential life.",
        weapons: [
          "Compelling state interest in protecting life",
          "Historical abortion prohibitions",
          "Legislative authority to regulate medicine",
          "Absence of an explicit constitutional right",
        ],
        risk: "Griswold already recognized a privacy right that is hard to distinguish away.",
      },
    },
    judge: "Justice Harry Blackmun",
    stakes: "A constitutional right to abortion — binding on all fifty states.",
    historicalVerdict: "7–2 for ROE — the right was established (later overturned by Dobbs, 2022).",
    principle: "Fourteenth Amendment, right to privacy, state police power.",
    searchTerms: "right to privacy substantive due process",
  },
  {
    id: "brown",
    title: "Brown v. Board of Education",
    year: "1954",
    category: "Civil Rights",
    glyph: "✸",
    heat: 5,
    blurb:
      "Thurgood Marshall argued before the Supreme Court that 'separate but equal' was a constitutional lie. A unanimous Court agreed.",
    sides: {
      plaintiff: {
        key: "plaintiff",
        label: "Plaintiff (Brown)",
        counsel: "Thurgood Marshall",
        goal: "Overturn Plessy v. Ferguson — prove segregated schools are inherently unequal under the Fourteenth Amendment.",
        weapons: [
          "The Clark doll studies",
          "'Separate but equal' was never achieved",
          "Fourteenth Amendment equal protection",
          "Education as the foundation of citizenship",
        ],
        risk: "Plessy is 58-year-old Supreme Court precedent — very hard to overturn.",
      },
      defense: {
        key: "defense",
        label: "State of Kansas",
        counsel: "Paul Wilson",
        goal: "Defend segregated schools under Plessy — separate but equal facilities satisfy the Constitution.",
        weapons: [
          "Plessy v. Ferguson binding precedent",
          "Physical facilities are equal",
          "State authority over education",
          "Judicial deference to the legislature",
        ],
        risk: "There is no way to prove psychological equality — the doll studies are devastating.",
      },
    },
    judge: "Chief Justice Earl Warren",
    stakes: "Desegregation of every public school in America.",
    historicalVerdict: "UNANIMOUS 9–0 for BROWN — segregation held unconstitutional.",
    principle: "Fourteenth Amendment equal protection; overturning Plessy.",
    searchTerms: "equal protection school segregation",
  },
  {
    id: "miranda",
    title: "Miranda v. Arizona",
    year: "1966",
    category: "Criminal",
    glyph: "◆",
    heat: 4,
    blurb:
      "Ernesto Miranda confessed after two hours of interrogation — never told he could stay silent or have a lawyer. His confession was the whole case.",
    sides: {
      defendant: {
        key: "defendant",
        label: "Defense (Miranda)",
        counsel: "John Flynn",
        goal: "Suppress the confession — the police violated the Fifth and Sixth Amendments.",
        weapons: [
          "Fifth Amendment right against self-incrimination",
          "Sixth Amendment right to counsel",
          "Coercive interrogation environment",
          "No knowing waiver of rights",
        ],
        risk: "Miranda signed a statement saying he understood his rights.",
      },
      prosecution: {
        key: "prosecution",
        label: "State of Arizona",
        counsel: "Gary Nelson",
        goal: "Uphold the conviction — Miranda confessed voluntarily and signed an acknowledgment of rights.",
        weapons: [
          "Signed rights-acknowledgment form",
          "No physical coercion",
          "A voluntary statement",
          "Conviction supported by other evidence",
        ],
        risk: "Interrogation-room isolation creates inherent pressure — the Court is already skeptical.",
      },
    },
    judge: "Chief Justice Earl Warren",
    stakes: "Defines police-interrogation rights for every arrest in America.",
    historicalVerdict: "5–4 for MIRANDA — Miranda warnings required nationwide.",
    principle: "Fifth and Sixth Amendments; custodial interrogation.",
    searchTerms: "custodial interrogation self-incrimination confession",
  },
  {
    id: "apple_samsung",
    title: "Apple Inc. v. Samsung Electronics",
    year: "2012",
    category: "IP / Tech",
    glyph: "▣",
    heat: 4,
    blurb:
      "Apple claimed Samsung copied the iPhone — patents, trade dress, everything. A billion dollars on the line, and a decade of smartphone design IP at stake.",
    sides: {
      plaintiff: {
        key: "plaintiff",
        label: "Plaintiff (Apple)",
        counsel: "Harold McElhinny",
        goal: "Prove Samsung willfully copied iPhone design patents, trade dress, and utility patents.",
        weapons: [
          "Side-by-side iPhone / Galaxy comparisons",
          "Internal Samsung 'copy Apple' documents",
          "Design-patent infringement",
          "Utility patents on bounce-back scrolling",
        ],
        risk: "Samsung will argue the design patents are too broad and cover functional elements.",
      },
      defense: {
        key: "defense",
        label: "Defense (Samsung)",
        counsel: "Charles Verhoeven",
        goal: "Invalidate Apple's patents as obvious or functional and prove independent development.",
        weapons: [
          "Prior-art references predating the iPhone",
          "Design patents cover only ornamental features",
          "Android licensed separately",
          "Cross-claim on Samsung's own patents",
        ],
        risk: "Internal emails referencing 'catching up to Apple' look terrible.",
      },
    },
    judge: "Judge Lucy Koh",
    stakes: "A $1.05 billion verdict — the shape of smartphone competition.",
    historicalVerdict: "Samsung liable — $1.05B (later reduced to $539M on appeal).",
    principle: "Design patents, trade dress, willful infringement.",
    searchTerms: "design patent trade dress infringement",
  },
  {
    id: "enron",
    title: "U.S. v. Skilling (Enron)",
    year: "2006",
    category: "White Collar",
    glyph: "❖",
    heat: 4,
    blurb:
      "Enron CEO Jeff Skilling faced 28 counts of fraud after a collapse that wiped out $74 billion and 20,000 jobs.",
    sides: {
      prosecution: {
        key: "prosecution",
        label: "Federal Prosecution",
        counsel: "Sean Berkowitz",
        goal: "Prove Skilling knowingly defrauded investors by hiding Enron's true condition.",
        weapons: [
          "Mark-to-market accounting fraud",
          "Off-book SPEs hiding debt",
          "$60M in stock sold while urging employees to buy",
          "Cooperating-executive testimony",
        ],
        risk: "Skilling will claim he relied on the accountants and lawyers.",
      },
      defense: {
        key: "defense",
        label: "Defense (Skilling)",
        counsel: "Daniel Petrocelli",
        goal: "Show Skilling had no criminal intent — he believed the business model was sound.",
        weapons: [
          "Honest-services fraud requires specific intent",
          "Reliance on Arthur Andersen audits",
          "Collapse caused by market conditions",
          "He held his stock too long to be 'dumping'",
        ],
        risk: "Cooperating witnesses who lived it are devastating on the stand.",
      },
    },
    judge: "Judge Simeon Lake",
    stakes: "24 years in prison — accountability for corporate fraud.",
    historicalVerdict: "GUILTY on 19 of 28 counts — 24 years (served 12).",
    principle: "Securities fraud, honest-services fraud, conspiracy.",
    searchTerms: "securities fraud honest services intent",
  },
  {
    id: "microsoft",
    title: "U.S. v. Microsoft",
    year: "2001",
    category: "Antitrust",
    glyph: "⬡",
    heat: 3,
    blurb:
      "The DOJ accused Microsoft of illegally bundling Internet Explorer with Windows to crush Netscape. A breakup was on the table.",
    sides: {
      prosecution: {
        key: "prosecution",
        label: "DOJ Prosecution",
        counsel: "David Boies",
        goal: "Prove Microsoft illegally maintained its monopoly by tying IE to Windows and pressuring OEMs.",
        weapons: [
          "Gates's evasive deposition",
          "'Cut off Netscape's air supply' emails",
          "OEM contracts blocking rival browsers",
          "IE share went from 0% to 90%",
        ],
        risk: "Microsoft will argue bundling benefits consumers — hard to show concrete harm.",
      },
      defense: {
        key: "defense",
        label: "Defense (Microsoft)",
        counsel: "John Warden",
        goal: "Argue that integrating the browser into the OS benefits consumers and is normal innovation.",
        weapons: [
          "Consumers get a free browser — no harm",
          "The browser market stays competitive",
          "Integration is progress, not exclusion",
          "No evidence of price increases",
        ],
        risk: "The internal emails about destroying competitors are catastrophic.",
      },
    },
    judge: "Judge Thomas Penfield Jackson",
    stakes: "A potential breakup of Microsoft into two companies.",
    historicalVerdict: "Liable at trial; breakup ordered then reversed on appeal; eventual settlement.",
    principle: "Sherman Antitrust Act, monopolization, tying.",
    searchTerms: "monopolization tying Sherman Act",
  },
];

export const caseById = (id: string) => CASES.find((c) => c.id === id);

/** The side key the AI argues, given the side the human picked. */
export const opposingKey = (c: TrialCase, yourKey: string) =>
  Object.keys(c.sides).find((k) => k !== yourKey) ?? yourKey;

/**
 * Build a compact, model-facing brief of the case for the system prompts —
 * shared by the API route. Kept here so the catalog and the brief never drift.
 */
export function caseBrief(c: TrialCase): string {
  const sides = Object.values(c.sides)
    .map(
      (s) =>
        `- ${s.label} (${s.counsel}): goal — ${s.goal} Strengths: ${s.weapons.join(
          "; ",
        )}. Exposure: ${s.risk}`,
    )
    .join("\n");
  return [
    `Case: ${c.title} (${c.year}) · ${c.category}`,
    `Presiding: ${c.judge}`,
    `Stakes: ${c.stakes}`,
    `Doctrine in play: ${c.principle}`,
    `Sides:\n${sides}`,
  ].join("\n");
}
