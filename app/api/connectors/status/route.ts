import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/** Which connectors this browser has authorized (cookie-based). */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    dropbox: Boolean(req.cookies.get("dbx_refresh")?.value),
  });
}

/** Disconnect: { id: "dropbox" } clears that connector's tokens. */
export async function POST(req: NextRequest) {
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  const res = NextResponse.json({ ok: true });
  if (id === "dropbox") res.cookies.delete("dbx_refresh");
  return res;
}
