import { NextRequest } from "next/server";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";

export const runtime = "nodejs";

const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
const safeName = (s: string) =>
  basename(s).replace(/[^a-zA-Z0-9 ._()-]/g, "_").slice(0, 120);

function matterDir(matterId: string): string {
  const dir = join(process.cwd(), "uploads", sanitize(matterId) || "general");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** GET /api/files?matterId=… — list files in the matter's working directory */
export async function GET(req: NextRequest) {
  const matterId = req.nextUrl.searchParams.get("matterId") ?? "general";
  const dir = matterDir(matterId);
  const files = readdirSync(dir)
    .filter((f) => statSync(join(dir, f)).isFile())
    .map((f) => {
      const st = statSync(join(dir, f));
      return { name: f, size: st.size, modified: st.mtimeMs };
    })
    .sort((a, b) => b.modified - a.modified);
  return Response.json({ files });
}

/** POST /api/files — multipart upload into the matter's working directory */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const matterId = (form.get("matterId") as string) ?? "general";
  const dir = matterDir(matterId);

  const saved: string[] = [];
  for (const entry of form.getAll("files")) {
    if (!(entry instanceof File)) continue;
    const name = safeName(entry.name || "upload");
    const buf = Buffer.from(await entry.arrayBuffer());
    writeFileSync(join(dir, name), buf);
    saved.push(name);
  }
  return Response.json({ saved });
}
