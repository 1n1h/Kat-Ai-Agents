import { NextRequest } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { RAW_TYPES, mdToPdf, mdToDocx, csvToXlsx } from "@/lib/docConvert";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Download a file from a case's working directory, optionally converted:
 *   ?to=pdf|docx  (from .md/.txt)   ?to=xlsx  (from .csv)   default: raw
 */

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const matterId = q.get("matterId") ?? "general";
  const name = basename(q.get("name") ?? "");
  const to = q.get("to");
  if (!name) {
    return Response.json({ error: "Missing file name." }, { status: 400 });
  }

  const path = join(
    process.cwd(),
    "uploads",
    sanitize(matterId) || "general",
    name,
  );
  if (!existsSync(path)) {
    return Response.json({ error: "File not found." }, { status: 404 });
  }

  const ext = extname(name).toLowerCase();
  const stem = name.slice(0, name.length - ext.length);
  const dispo = (filename: string) =>
    `attachment; filename="${filename.replace(/[^\w. -]/g, "_")}"`;

  try {
    if (to === "pdf" || to === "docx") {
      const text = readFileSync(path, "utf-8");
      const buf = to === "pdf" ? await mdToPdf(text) : await mdToDocx(text);
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": RAW_TYPES[`.${to}`],
          "Content-Disposition": dispo(`${stem}.${to}`),
        },
      });
    }
    if (to === "xlsx") {
      const buf = await csvToXlsx(readFileSync(path, "utf-8"));
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": RAW_TYPES[".xlsx"],
          "Content-Disposition": dispo(`${stem}.xlsx`),
        },
      });
    }
    // raw download
    const buf = readFileSync(path);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": RAW_TYPES[ext] ?? "application/octet-stream",
        "Content-Disposition": dispo(name),
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Conversion failed." },
      { status: 500 },
    );
  }
}
