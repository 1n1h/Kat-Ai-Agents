import { NextRequest } from "next/server";
import { RAW_TYPES, mdToPdf, mdToDocx, csvToXlsx } from "@/lib/docConvert";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Convert posted document content to a downloadable file — no filesystem, so
 * it works on the cloud deploy. Used for documents the agent drafts in the
 * cloud path (which has no working directory).
 *
 * POST { name, content, to }  where to = "pdf" | "docx" | "xlsx" | "md" | "txt"
 */
export async function POST(req: NextRequest) {
  let body: { name?: string; content?: string; to?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }
  const content = body.content ?? "";
  const to = (body.to ?? "md").toLowerCase();
  const rawStem = (body.name ?? "document").replace(/\.[^.]+$/, "");
  const stem = rawStem.replace(/[^\w. -]/g, "_") || "document";
  if (!content.trim()) {
    return Response.json({ error: "No content." }, { status: 400 });
  }

  const dispo = (filename: string) => `attachment; filename="${filename}"`;

  try {
    if (to === "pdf" || to === "docx") {
      const buf = to === "pdf" ? await mdToPdf(content) : await mdToDocx(content);
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": RAW_TYPES[`.${to}`],
          "Content-Disposition": dispo(`${stem}.${to}`),
        },
      });
    }
    if (to === "xlsx") {
      const buf = await csvToXlsx(content);
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": RAW_TYPES[".xlsx"],
          "Content-Disposition": dispo(`${stem}.xlsx`),
        },
      });
    }
    // raw markdown / text
    const ext = to === "txt" ? ".txt" : ".md";
    return new Response(content, {
      headers: {
        "Content-Type": RAW_TYPES[ext],
        "Content-Disposition": dispo(`${stem}${ext}`),
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Conversion failed." },
      { status: 500 },
    );
  }
}
