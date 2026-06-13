/**
 * Public legal & government research tools (API-key based, server-side).
 *
 * Keys come from env — set them in .env.local for local dev and in Vercel
 * (Project → Settings → Environment Variables) for production:
 *
 *   DATA_GOV_API_KEY         → Regulations.gov, GovInfo, Congress.gov
 *                              (one api.data.gov key covers all three)
 *   COURTLISTENER_API_TOKEN  → CourtListener case-law search
 *
 * A tool is only offered to the agents when its key is configured, and every
 * call fails soft — a missing key or a flaky endpoint never breaks chat.
 */

type Param = {
  type: "string" | "number";
  description: string;
  required?: boolean;
};

interface ResearchTool {
  name: string;
  description: string;
  params: Record<string, Param>;
  key: "datagov" | "courtlistener";
}

const DATA_GOV = () => process.env.DATA_GOV_API_KEY?.trim();
const COURTLISTENER = () => process.env.COURTLISTENER_API_TOKEN?.trim();

export const RESEARCH_TOOLS: ResearchTool[] = [
  {
    name: "courtlistener_search",
    description:
      "Search U.S. case law (court opinions) on CourtListener. Returns case " +
      "names, courts, dates, citations, and links — real, citable authority. " +
      "Use this instead of recalling citations from memory.",
    params: {
      query: {
        type: "string",
        description: "Search terms, party names, or the legal issue.",
        required: true,
      },
      court: {
        type: "string",
        description:
          'Optional court id, e.g. "scotus", "ca11" (11th Cir.), "flsd" ' +
          '(S.D. Fla.), "flmd" (M.D. Fla.), "fla" (Fla. Supreme Court).',
      },
    },
    key: "courtlistener",
  },
  {
    name: "regulations_search",
    description:
      "Search U.S. federal regulations, proposed rules, notices, and public " +
      "comments on Regulations.gov. Returns titles, agencies, dates, docket ids.",
    params: {
      query: { type: "string", description: "Search terms.", required: true },
    },
    key: "datagov",
  },
  {
    name: "govinfo_search",
    description:
      "Search official U.S. government publications on GovInfo — the Code of " +
      "Federal Regulations (CFR), the U.S. Code, the Federal Register, bills, " +
      "and court materials. Returns titles, collections, dates, and links.",
    params: {
      query: { type: "string", description: "Search terms.", required: true },
      collection: {
        type: "string",
        description:
          'Optional collection code, e.g. "CFR", "USCODE", "FR" (Federal ' +
          'Register), "BILLS".',
      },
    },
    key: "datagov",
  },
  {
    name: "congress_bill",
    description:
      "Look up a specific federal bill on Congress.gov by congress number, " +
      "bill type, and number. Returns title, sponsor, policy area, and the " +
      "latest action.",
    params: {
      congress: {
        type: "number",
        description: "Congress number, e.g. 118.",
        required: true,
      },
      billType: {
        type: "string",
        description:
          'Bill type: "hr", "s", "hjres", "sjres", "hconres", "sconres", ' +
          '"hres", or "sres".',
        required: true,
      },
      billNumber: {
        type: "number",
        description: "The bill number.",
        required: true,
      },
    },
    key: "datagov",
  },
];

const keyReady = (t: ResearchTool) =>
  t.key === "datagov" ? !!DATA_GOV() : !!COURTLISTENER();

const RESEARCH_NAMES = new Set(RESEARCH_TOOLS.map((t) => t.name));
export const isResearchTool = (name: string) => RESEARCH_NAMES.has(name);

/** Anthropic tool defs for the research tools whose API key is configured. */
export function researchToolDefs() {
  return RESEARCH_TOOLS.filter(keyReady).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(t.params).map(([k, p]) => [
          k,
          { type: p.type, description: p.description },
        ]),
      ),
      required: Object.entries(t.params)
        .filter(([, p]) => p.required)
        .map(([k]) => k),
    },
  }));
}

/** The configured research tools with their raw param specs (for the SDK MCP). */
export function availableResearchTools() {
  return RESEARCH_TOOLS.filter(keyReady).map((t) => ({
    name: t.name,
    description: t.description,
    params: t.params,
  }));
}

/** A line for the system prompt naming which research tools are live. */
export function researchGuidance(): string {
  const ready = RESEARCH_TOOLS.filter(keyReady).map((t) => t.name);
  if (!ready.length) return "";
  return (
    "\n\n[RESEARCH TOOLS — look up primary legal authority directly with: " +
    ready.join(", ") +
    ". Prefer these (and web_search) over recalling citations from memory; " +
    "cite only what you actually retrieve, with links. If a lookup returns " +
    "nothing, say so — never invent authority.]"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJson(url: string, init?: RequestInit, timeoutMs = 15000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON body */
    }
    if (!res.ok) {
      const msg =
        json?.error?.message ||
        json?.message ||
        text.slice(0, 200) ||
        res.statusText;
      throw new Error(`${res.status} ${msg}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

const strip = (s: string) => s.replace(/<\/?[^>]+>/g, "").trim();

export async function executeResearchTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  try {
    switch (name) {
      case "courtlistener_search":
        return await courtlistener(input);
      case "regulations_search":
        return await regulations(input);
      case "govinfo_search":
        return await govinfo(input);
      case "congress_bill":
        return await congress(input);
      default:
        return `Unknown research tool: ${name}`;
    }
  } catch (e) {
    return `Research lookup failed (${name}): ${
      e instanceof Error ? e.message : String(e)
    }`;
  }
}

async function courtlistener(input: Record<string, unknown>): Promise<string> {
  const token = COURTLISTENER();
  if (!token)
    return "CourtListener is not configured (COURTLISTENER_API_TOKEN missing).";
  const q = String(input.query ?? "").trim();
  if (!q) return "Provide a query.";
  const params = new URLSearchParams({ q, type: "o", order_by: "score desc" });
  if (input.court) params.set("court", String(input.court));
  const json = await fetchJson(
    `https://www.courtlistener.com/api/rest/v4/search/?${params}`,
    { headers: { Authorization: `Token ${token}` } },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (json?.results ?? []).slice(0, 8) as any[];
  if (!results.length) return `No CourtListener opinions found for "${q}".`;
  return results
    .map((r, i) => {
      const link = r.absolute_url
        ? `https://www.courtlistener.com${r.absolute_url}`
        : "";
      const cite = Array.isArray(r.citation)
        ? r.citation.join(", ")
        : r.citation ?? "";
      const snip = r.snippet ? `\n   ${strip(String(r.snippet)).slice(0, 240)}` : "";
      return `${i + 1}. ${r.caseName ?? "(case)"} — ${r.court ?? ""} ${
        r.dateFiled ?? ""
      }${cite ? ` · ${cite}` : ""}${link ? `\n   ${link}` : ""}${snip}`;
    })
    .join("\n\n");
}

async function regulations(input: Record<string, unknown>): Promise<string> {
  const key = DATA_GOV();
  if (!key)
    return "Regulations.gov is not configured (DATA_GOV_API_KEY missing).";
  const q = String(input.query ?? "").trim();
  if (!q) return "Provide a query.";
  const url =
    `https://api.regulations.gov/v4/documents?filter[searchTerm]=${encodeURIComponent(q)}` +
    `&page[size]=10&sort=-postedDate&api_key=${key}`;
  const json = await fetchJson(url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (json?.data ?? []).slice(0, 8) as any[];
  if (!data.length) return `No Regulations.gov documents found for "${q}".`;
  return data
    .map((d, i) => {
      const a = d.attributes ?? {};
      return `${i + 1}. ${a.title ?? "(document)"} — ${a.agencyId ?? ""} · ${
        a.documentType ?? ""
      } · ${a.postedDate ?? ""}\n   docket: ${a.docketId ?? ""}  ·  https://www.regulations.gov/document/${d.id}`;
    })
    .join("\n\n");
}

async function govinfo(input: Record<string, unknown>): Promise<string> {
  const key = DATA_GOV();
  if (!key) return "GovInfo is not configured (DATA_GOV_API_KEY missing).";
  const q = String(input.query ?? "").trim();
  if (!q) return "Provide a query.";
  const query = input.collection
    ? `${q} collection:${String(input.collection)}`
    : q;
  const json = await fetchJson(`https://api.govinfo.gov/search?api_key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      pageSize: 10,
      offsetMark: "*",
      sorts: [{ field: "relevancy", sortOrder: "DESC" }],
    }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (json?.results ?? []).slice(0, 8) as any[];
  if (!results.length) return `No GovInfo results for "${q}".`;
  return results
    .map((r, i) => {
      const pid = r.packageId ?? "";
      return `${i + 1}. ${r.title ?? "(publication)"} — ${
        r.collectionName ?? r.collectionCode ?? ""
      } · ${r.dateIssued ?? ""}${
        pid ? `\n   https://www.govinfo.gov/app/details/${pid}` : ""
      }`;
    })
    .join("\n\n");
}

async function congress(input: Record<string, unknown>): Promise<string> {
  const key = DATA_GOV();
  if (!key) return "Congress.gov is not configured (DATA_GOV_API_KEY missing).";
  const congress = Number(input.congress);
  const billType = String(input.billType ?? "").toLowerCase();
  const num = Number(input.billNumber);
  if (!congress || !billType || !num)
    return "Provide congress (number), billType (e.g. hr, s), and billNumber.";
  const json = await fetchJson(
    `https://api.congress.gov/v3/bill/${congress}/${billType}/${num}?format=json&api_key=${key}`,
  );
  const b = json?.bill;
  if (!b)
    return `No bill found: ${billType.toUpperCase()} ${num} (Congress ${congress}).`;
  const sponsor =
    Array.isArray(b.sponsors) && b.sponsors[0] ? b.sponsors[0].fullName ?? "" : "";
  const action = b.latestAction
    ? `${b.latestAction.actionDate ?? ""} — ${b.latestAction.text ?? ""}`
    : "";
  return (
    `${b.type ?? billType.toUpperCase()} ${b.number ?? num} (Congress ${congress})\n` +
    `Title: ${b.title ?? "(untitled)"}\n` +
    `Sponsor: ${sponsor || "—"}\n` +
    `Policy area: ${b.policyArea?.name ?? "—"}\n` +
    `Latest action: ${action || "—"}\n` +
    `https://www.congress.gov/bill/${congress}th-congress/${
      billType === "hr"
        ? "house-bill"
        : billType === "s"
          ? "senate-bill"
          : billType
    }/${num}`
  );
}
