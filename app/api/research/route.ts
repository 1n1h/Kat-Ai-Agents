import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const strip = (s: string) => s.replace(/<\/?[^>]+>/g, "").trim();

/**
 * Structured case-law search for the mobile Research tab. Wraps CourtListener
 * v4 and returns clean JSON rows (the agent tool returns formatted text; this
 * returns data the UI can render and link).
 *
 * POST { query, court? } -> { results: [{ name, court, date, citation, url, snippet }] }
 */
export async function POST(req: NextRequest) {
  const token = process.env.COURTLISTENER_API_TOKEN?.trim();
  if (!token) {
    return Response.json(
      { error: "Case-law search isn't configured." },
      { status: 500 },
    );
  }

  let body: { query?: string; court?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const q = (body.query ?? "").trim();
  if (!q) return Response.json({ error: "Enter a search." }, { status: 400 });

  const params = new URLSearchParams({ q, type: "o", order_by: "score desc" });
  if (body.court) params.set("court", String(body.court));

  try {
    const res = await fetch(
      `https://www.courtlistener.com/api/rest/v4/search/?${params}`,
      { headers: { Authorization: `Token ${token}` } },
    );
    if (!res.ok) {
      return Response.json(
        { error: "Search is unavailable right now." },
        { status: 502 },
      );
    }
    const json = (await res.json()) as { results?: unknown[] };
    const results = (json.results ?? []).slice(0, 20).map((r) => {
      const o = r as Record<string, unknown>;
      const cite = Array.isArray(o.citation)
        ? (o.citation as string[]).join(", ")
        : (o.citation as string) ?? "";
      return {
        name: (o.caseName as string) ?? "(case)",
        court: (o.court as string) ?? "",
        date: (o.dateFiled as string) ?? "",
        citation: cite,
        url: o.absolute_url
          ? `https://www.courtlistener.com${o.absolute_url}`
          : "",
        snippet: o.snippet ? strip(String(o.snippet)).slice(0, 240) : "",
      };
    });
    return Response.json({ results });
  } catch {
    return Response.json(
      { error: "Search failed. Please try again." },
      { status: 502 },
    );
  }
}
