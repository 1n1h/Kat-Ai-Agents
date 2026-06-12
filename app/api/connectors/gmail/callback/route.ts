import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Google OAuth callback: verify state, exchange the code, store the refresh
 * token in an httpOnly cookie. Note: while the consent screen is in Testing,
 * Google expires refresh tokens after 7 days — reconnecting is expected.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("g_oauth_state")?.value;

  const home = (note: string) =>
    NextResponse.redirect(new URL(`/?connector=${note}`, req.nextUrl.origin));

  if (!clientId || !clientSecret) return home("gmail-misconfigured");
  if (!code || !state || !expected || state !== expected) {
    return home("gmail-failed");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: `${req.nextUrl.origin}/api/connectors/gmail/callback`,
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) return home("gmail-failed");
  const tok = (await tokenRes.json()) as { refresh_token?: string };
  if (!tok.refresh_token) return home("gmail-failed");

  const res = home("gmail-connected");
  res.cookies.set("g_refresh", tok.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  res.cookies.delete("g_oauth_state");
  return res;
}
