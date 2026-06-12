import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

/**
 * Begin Dropbox OAuth. Redirects to Dropbox's consent screen; the callback
 * route exchanges the code. offline access => refresh token, so the
 * connection survives beyond the first 4-hour access token.
 */
export async function GET(req: NextRequest) {
  const key = process.env.DROPBOX_APP_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "DROPBOX_APP_KEY is not configured." },
      { status: 500 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${req.nextUrl.origin}/api/connectors/dropbox/callback`;

  const url = new URL("https://www.dropbox.com/oauth2/authorize");
  url.searchParams.set("client_id", key);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("token_access_type", "offline");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  // CSRF guard: callback must present the same state
  res.cookies.set("dbx_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 600,
    path: "/",
  });
  return res;
}
