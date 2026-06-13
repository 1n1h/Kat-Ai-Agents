/**
 * Mock Trial — client-safe case catalog for the mobile simulator.
 * Mirrors the web app's lib/mockTrial.ts. The /api/mock-trial endpoint is
 * shared; this is just the data the lobby + side-select render.
 */

export type TrialRoleId = "you" | "counsel" | "judge";

export interface CaseSide {
  key: string;
  label: string;
  counsel: string;
  goal: string;
  weapons: string[];
  risk: string;
}

export interface TrialCase {
  id: string;
  title: string;
  year: string;
  category: string;
  glyph: string;
  heat: number;
  blurb: string;
  sides: Record<string, CaseSide>;
  judge: string;
  stakes: string;
  historicalVerdict: string;
  principle: string;
}

export const MAX_ROUNDS = 4;

export const TRIAL_ROLES: Record<TrialRoleId, { label: string; color: string }> = {
  you: { label: "You", color: "#5d7f4e" },
  counsel: { label: "Opposing Counsel", color: "#5b86b3" },
  judge: { label: "The Bench", color: "#c9a55c" },
};

export const CASES: TrialCase[] = [
  {
    id: "oj",
    title: "People v. O.J. Simpson",
    year: "1995",
    category: "Criminal",
    glyph: "✦",
    heat: 5,
    blurb:
      "The trial of the century. DNA, race, celebrity, and the Dream Team against the LAPD.",
    sides: {
      prosecution: {
        key: "prosecution",
        label: "Prosecution",
        counsel: "Marcia Clark",
        goal: "Prove Simpson committed the murders beyond a reasonable doubt.",
        weapons: ["Blood at the scene", "DNA matching", "Domestic-violence history", "Bruno Magli prints", "No alibi"],
        risk: "LAPD evidence-handling misconduct and Detective Fuhrman's exposed racism.",
      },
      defense: {
        key: "defense",
        label: "Defense",
        counsel: "Johnnie Cochran",
        goal: "Create reasonable doubt by attacking evidence integrity and LAPD conduct.",
        weapons: ["The glove doesn't fit", "Planted-evidence theory", "Fuhrman tapes", "Sample degradation", "Chain-of-custody gaps"],
        risk: "The DNA evidence is overwhelming if the jury trusts the LAPD.",
      },
    },
    judge: "Judge Lance Ito",
    stakes: "Double murder — life in prison vs. acquittal.",
    historicalVerdict: "NOT GUILTY (1995) — the jury deliberated only four hours.",
    principle: "Reasonable doubt, chain of custody, Fourth Amendment.",
  },
  {
    id: "roe",
    title: "Roe v. Wade",
    year: "1973",
    category: "Constitutional",
    glyph: "⚖",
    heat: 5,
    blurb:
      "Jane Roe challenged Texas's near-total abortion ban — reshaping constitutional privacy law.",
    sides: {
      plaintiff: {
        key: "plaintiff",
        label: "Plaintiff (Roe)",
        counsel: "Sarah Weddington",
        goal: "Establish a constitutional right to abortion under the Fourteenth Amendment.",
        weapons: ["Griswold privacy precedent", "Fourteenth Amendment liberty", "Viability consensus", "No first-trimester state interest"],
        risk: "No explicit constitutional text — the right must be argued as implied.",
      },
      defense: {
        key: "defense",
        label: "State of Texas",
        counsel: "Jay Floyd",
        goal: "Defend the statute as a valid exercise of state police power.",
        weapons: ["Compelling interest in life", "Historical prohibitions", "Authority to regulate medicine", "No explicit right"],
        risk: "Griswold already recognized a privacy right that is hard to distinguish.",
      },
    },
    judge: "Justice Harry Blackmun",
    stakes: "A constitutional right binding on all fifty states.",
    historicalVerdict: "7–2 for ROE (later overturned by Dobbs, 2022).",
    principle: "Fourteenth Amendment, privacy, state police power.",
  },
  {
    id: "brown",
    title: "Brown v. Board of Education",
    year: "1954",
    category: "Civil Rights",
    glyph: "✸",
    heat: 5,
    blurb:
      "Thurgood Marshall argued that 'separate but equal' was a constitutional lie.",
    sides: {
      plaintiff: {
        key: "plaintiff",
        label: "Plaintiff (Brown)",
        counsel: "Thurgood Marshall",
        goal: "Overturn Plessy — segregated schools are inherently unequal.",
        weapons: ["Clark doll studies", "'Separate but equal' never achieved", "Equal protection", "Education as citizenship"],
        risk: "Plessy is 58-year-old Supreme Court precedent.",
      },
      defense: {
        key: "defense",
        label: "State of Kansas",
        counsel: "Paul Wilson",
        goal: "Defend segregated schools under Plessy.",
        weapons: ["Plessy binding precedent", "Facilities are equal", "State authority over education", "Judicial deference"],
        risk: "There is no way to prove psychological equality.",
      },
    },
    judge: "Chief Justice Earl Warren",
    stakes: "Desegregation of every public school in America.",
    historicalVerdict: "UNANIMOUS 9–0 for BROWN.",
    principle: "Fourteenth Amendment equal protection; overturning Plessy.",
  },
  {
    id: "miranda",
    title: "Miranda v. Arizona",
    year: "1966",
    category: "Criminal",
    glyph: "◆",
    heat: 4,
    blurb:
      "Ernesto Miranda confessed after two hours of interrogation — never told his rights.",
    sides: {
      defendant: {
        key: "defendant",
        label: "Defense (Miranda)",
        counsel: "John Flynn",
        goal: "Suppress the confession — the police violated the Fifth and Sixth Amendments.",
        weapons: ["Right against self-incrimination", "Right to counsel", "Coercive environment", "No knowing waiver"],
        risk: "Miranda signed a statement saying he understood his rights.",
      },
      prosecution: {
        key: "prosecution",
        label: "State of Arizona",
        counsel: "Gary Nelson",
        goal: "Uphold the conviction — the confession was voluntary.",
        weapons: ["Signed rights form", "No physical coercion", "Voluntary statement", "Other evidence"],
        risk: "Interrogation isolation creates inherent pressure — the Court is skeptical.",
      },
    },
    judge: "Chief Justice Earl Warren",
    stakes: "Defines interrogation rights for every arrest in America.",
    historicalVerdict: "5–4 for MIRANDA — warnings required nationwide.",
    principle: "Fifth and Sixth Amendments; custodial interrogation.",
  },
  {
    id: "apple_samsung",
    title: "Apple Inc. v. Samsung",
    year: "2012",
    category: "IP / Tech",
    glyph: "▣",
    heat: 4,
    blurb:
      "Apple claimed Samsung copied the iPhone — a billion dollars and a decade of design IP at stake.",
    sides: {
      plaintiff: {
        key: "plaintiff",
        label: "Plaintiff (Apple)",
        counsel: "Harold McElhinny",
        goal: "Prove Samsung willfully copied iPhone design and utility patents.",
        weapons: ["Side-by-side comparisons", "'Copy Apple' documents", "Design-patent infringement", "Bounce-back scroll patent"],
        risk: "Samsung argues the design patents cover functional elements.",
      },
      defense: {
        key: "defense",
        label: "Defense (Samsung)",
        counsel: "Charles Verhoeven",
        goal: "Invalidate the patents as obvious or functional.",
        weapons: ["Prior art", "Ornamental-only scope", "Android licensed separately", "Cross-claims"],
        risk: "Internal 'catch up to Apple' emails look terrible.",
      },
    },
    judge: "Judge Lucy Koh",
    stakes: "A $1.05 billion verdict.",
    historicalVerdict: "Samsung liable — $1.05B (reduced to $539M on appeal).",
    principle: "Design patents, trade dress, willful infringement.",
  },
  {
    id: "enron",
    title: "U.S. v. Skilling (Enron)",
    year: "2006",
    category: "White Collar",
    glyph: "❖",
    heat: 4,
    blurb:
      "Enron's CEO faced 28 counts after a collapse that wiped out $74B and 20,000 jobs.",
    sides: {
      prosecution: {
        key: "prosecution",
        label: "Federal Prosecution",
        counsel: "Sean Berkowitz",
        goal: "Prove Skilling knowingly defrauded investors.",
        weapons: ["Mark-to-market fraud", "Off-book SPEs", "$60M stock sold", "Cooperating executives"],
        risk: "Skilling claims he relied on the accountants and lawyers.",
      },
      defense: {
        key: "defense",
        label: "Defense (Skilling)",
        counsel: "Daniel Petrocelli",
        goal: "Show Skilling had no criminal intent.",
        weapons: ["Specific-intent requirement", "Reliance on auditors", "Market-driven collapse", "Held stock too long to be dumping"],
        risk: "Cooperating witnesses are devastating on the stand.",
      },
    },
    judge: "Judge Simeon Lake",
    stakes: "24 years in prison.",
    historicalVerdict: "GUILTY on 19 of 28 counts — 24 years (served 12).",
    principle: "Securities fraud, honest-services fraud, conspiracy.",
  },
  {
    id: "microsoft",
    title: "U.S. v. Microsoft",
    year: "2001",
    category: "Antitrust",
    glyph: "⬡",
    heat: 3,
    blurb:
      "The DOJ accused Microsoft of bundling IE with Windows to crush Netscape. A breakup loomed.",
    sides: {
      prosecution: {
        key: "prosecution",
        label: "DOJ Prosecution",
        counsel: "David Boies",
        goal: "Prove illegal monopoly maintenance by tying IE to Windows.",
        weapons: ["Gates's deposition", "'Cut off their air supply' emails", "OEM contracts", "0% to 90% share"],
        risk: "Microsoft argues bundling benefits consumers.",
      },
      defense: {
        key: "defense",
        label: "Defense (Microsoft)",
        counsel: "John Warden",
        goal: "Argue integration is normal innovation that benefits consumers.",
        weapons: ["Free browser, no harm", "Competitive market", "Integration is progress", "No price increases"],
        risk: "The internal emails about destroying competitors are catastrophic.",
      },
    },
    judge: "Judge Thomas Penfield Jackson",
    stakes: "A potential breakup of Microsoft.",
    historicalVerdict: "Liable at trial; reversed on appeal; later settled.",
    principle: "Sherman Antitrust Act, monopolization, tying.",
  },
];

export const caseById = (id: string) => CASES.find((c) => c.id === id);

export const opposingKey = (c: TrialCase, yourKey: string) =>
  Object.keys(c.sides).find((k) => k !== yourKey) ?? yourKey;
