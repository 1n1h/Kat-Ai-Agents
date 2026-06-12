import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

/**
 * Begin Microsoft OAuth (Outlook / Graph). /common supports both the
 * firm's work accounts and personal accounts (the app is registered as
 * multitenant + personal). offline_access => refresh token.
 */
const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.ReadWrite",
  "Mail.Send",
  "Calendars.ReadWrite",
].join(" ");

export async function GET(req: NextRequest) {
  const clientId = process.env.MS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "MS_CLIENT_ID is not configured." },
      { status: 500 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${req.nextUrl.origin}/api/connectors/outlook/callback`;

  const url = new URL(
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  );
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set("ms_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 600,
    path: "/",
  });
  return res;
}
