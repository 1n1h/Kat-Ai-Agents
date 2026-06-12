import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Microsoft OAuth callback: verify state, exchange the code, store the
 * refresh token in an httpOnly cookie (page JS can never read it).
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("ms_oauth_state")?.value;

  const home = (note: string) =>
    NextResponse.redirect(new URL(`/?connector=${note}`, req.nextUrl.origin));

  if (!clientId || !clientSecret) return home("outlook-misconfigured");
  if (!code || !state || !expected || state !== expected) {
    return home("outlook-failed");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: `${req.nextUrl.origin}/api/connectors/outlook/callback`,
  });

  const tokenRes = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!tokenRes.ok) return home("outlook-failed");
  const tok = (await tokenRes.json()) as { refresh_token?: string };
  if (!tok.refresh_token) return home("outlook-failed");

  const res = home("outlook-connected");
  res.cookies.set("ms_refresh", tok.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 90, // MS refresh tokens live ~90 days of inactivity
    path: "/",
  });
  res.cookies.delete("ms_oauth_state");
  return res;
}
