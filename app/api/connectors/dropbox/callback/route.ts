import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Dropbox OAuth callback: verify state, exchange the code for tokens, and
 * keep the refresh token in an httpOnly cookie (never readable by page JS).
 * Access tokens are minted on demand from the refresh token by the tools
 * that use them.
 */
export async function GET(req: NextRequest) {
  const key = process.env.DROPBOX_APP_KEY;
  const secret = process.env.DROPBOX_APP_SECRET;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get("dbx_oauth_state")?.value;

  const home = (note: string) =>
    NextResponse.redirect(new URL(`/?connector=${note}`, req.nextUrl.origin));

  if (!key || !secret) return home("dropbox-misconfigured");
  if (!code || !state || !expected || state !== expected) {
    return home("dropbox-failed");
  }

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: `${req.nextUrl.origin}/api/connectors/dropbox/callback`,
  });

  const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!tokenRes.ok) return home("dropbox-failed");
  const tok = (await tokenRes.json()) as {
    refresh_token?: string;
    account_id?: string;
  };
  if (!tok.refresh_token) return home("dropbox-failed");

  const res = home("dropbox-connected");
  res.cookies.set("dbx_refresh", tok.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 365, // revoke via Dropbox or Disconnect
    path: "/",
  });
  res.cookies.delete("dbx_oauth_state");
  return res;
}
