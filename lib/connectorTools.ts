/**
 * Connector tools (server-side): the agents' hands into Dropbox, Outlook,
 * and Gmail. Refresh tokens come from httpOnly cookies; short-lived access
 * tokens are minted here on demand and cached briefly in-process.
 *
 * One registry drives everything: Anthropic tool definitions for the cloud
 * path, zod shapes for the local Agent SDK MCP server, and the executors.
 */

export interface ConnectorTokens {
  dropbox?: string;
  outlook?: string;
  gmail?: string;
}

/* ── access-token minting (cached ~50 min per refresh token) ── */

const accessCache = new Map<string, { token: string; exp: number }>();

async function mint(
  cacheKey: string,
  fetcher: () => Promise<string>,
): Promise<string> {
  const hit = accessCache.get(cacheKey);
  if (hit && hit.exp > Date.now()) return hit.token;
  const token = await fetcher();
  accessCache.set(cacheKey, { token, exp: Date.now() + 50 * 60 * 1000 });
  return token;
}

async function dropboxAccess(refresh: string): Promise<string> {
  return mint(`dbx:${refresh.slice(-12)}`, async () => {
    const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.DROPBOX_APP_KEY}:${process.env.DROPBOX_APP_SECRET}`,
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh,
      }),
    });
    if (!res.ok) throw new Error("Dropbox token refresh failed — reconnect Dropbox.");
    return ((await res.json()) as { access_token: string }).access_token;
  });
}

async function msAccess(refresh: string): Promise<string> {
  return mint(`ms:${refresh.slice(-12)}`, async () => {
    const res = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MS_CLIENT_ID ?? "",
          client_secret: process.env.MS_CLIENT_SECRET ?? "",
          grant_type: "refresh_token",
          refresh_token: refresh,
        }),
      },
    );
    if (!res.ok) throw new Error("Microsoft token refresh failed — reconnect Outlook.");
    return ((await res.json()) as { access_token: string }).access_token;
  });
}

async function googleAccess(refresh: string): Promise<string> {
  return mint(`g:${refresh.slice(-12)}`, async () => {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: refresh,
      }),
    });
    if (!res.ok) throw new Error("Google token refresh failed — reconnect Gmail.");
    return ((await res.json()) as { access_token: string }).access_token;
  });
}

/* ── small helpers ── */

const stripHtml = (s: string) =>
  s
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const cap = (s: string, n = 24000) =>
  s.length > n ? `${s.slice(0, n)}\n…[truncated]` : s;

const b64url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf-8",
  );

/* ── tool registry ── */

type ParamType = "string" | "number";

interface ToolSpec {
  name: string;
  connector: keyof ConnectorTokens;
  description: string;
  params: Record<
    string,
    { type: ParamType; description: string; required?: boolean }
  >;
  exec: (
    input: Record<string, unknown>,
    access: string,
  ) => Promise<string>;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

export const CONNECTOR_TOOLS: ToolSpec[] = [
  /* ── Dropbox ── */
  {
    name: "dropbox_search",
    connector: "dropbox",
    description:
      "Search the connected Dropbox for files by name or content keywords. " +
      "Returns matching file paths to use with dropbox_read_file.",
    params: {
      query: { type: "string", description: "Search terms", required: true },
    },
    exec: async (input, access) => {
      const res = await fetch(
        "https://api.dropboxapi.com/2/files/search_v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: str(input.query),
            options: { max_results: 20, filename_only: false },
          }),
        },
      );
      if (!res.ok) return `Dropbox search failed (${res.status}).`;
      const data = (await res.json()) as {
        matches?: {
          metadata?: {
            metadata?: { path_display?: string; name?: string; size?: number };
          };
        }[];
      };
      const rows = (data.matches ?? [])
        .map((m) => m.metadata?.metadata)
        .filter(Boolean)
        .map((f) => `${f!.path_display} (${f!.size ?? "?"} bytes)`);
      return rows.length ? rows.join("\n") : "No matches.";
    },
  },
  {
    name: "dropbox_list",
    connector: "dropbox",
    description:
      "List a Dropbox folder's contents. Use path \"\" for the root.",
    params: {
      path: {
        type: "string",
        description: 'Folder path, e.g. "/Cases/Smith" — "" for root',
      },
    },
    exec: async (input, access) => {
      const res = await fetch(
        "https://api.dropboxapi.com/2/files/list_folder",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: str(input.path), limit: 100 }),
        },
      );
      if (!res.ok) return `Dropbox list failed (${res.status}) — check the path.`;
      const data = (await res.json()) as {
        entries?: {
          ".tag": string;
          name: string;
          path_display?: string;
          size?: number;
        }[];
      };
      const rows = (data.entries ?? []).map(
        (e) =>
          `${e[".tag"] === "folder" ? "📁" : "📄"} ${e.path_display ?? e.name}${
            e.size != null ? ` (${e.size} bytes)` : ""
          }`,
      );
      return rows.length ? rows.join("\n") : "Empty folder.";
    },
  },
  {
    name: "dropbox_read_file",
    connector: "dropbox",
    description:
      "Read a text-based file (txt, md, csv, json, html...) from Dropbox by " +
      "path. Binary formats (pdf, docx) can't be read this way — say so " +
      "and suggest the user upload them into the case instead.",
    params: {
      path: { type: "string", description: "Full file path", required: true },
    },
    exec: async (input, access) => {
      const res = await fetch(
        "https://content.dropboxapi.com/2/files/download",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access}`,
            "Dropbox-API-Arg": JSON.stringify({ path: str(input.path) }),
          },
        },
      );
      if (!res.ok) return `Dropbox download failed (${res.status}) — check the path.`;
      const buf = Buffer.from(await res.arrayBuffer());
      const slice = buf.subarray(0, 200000);
      let nulls = 0;
      for (const b of slice.subarray(0, 2000)) if (b === 0) nulls++;
      if (nulls > 10) {
        return "This is a binary file (PDF/DOCX/image) — it can't be read as text here. Ask the user to upload it into the case working directory instead.";
      }
      return cap(slice.toString("utf-8"));
    },
  },

  /* ── Outlook / Microsoft Graph ── */
  {
    name: "outlook_search_mail",
    connector: "outlook",
    description:
      "Search the connected Outlook mailbox. Returns subjects, senders, " +
      "dates, previews, and message ids for outlook_read_mail.",
    params: {
      query: {
        type: "string",
        description: "Search terms (sender, subject, keywords)",
        required: true,
      },
      count: { type: "number", description: "Max results (default 10)" },
    },
    exec: async (input, access) => {
      const top = Math.min(num(input.count, 10), 25);
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$search="${encodeURIComponent(
          str(input.query).replace(/"/g, ""),
        )}"&$top=${top}&$select=id,subject,from,receivedDateTime,bodyPreview`,
        { headers: { Authorization: `Bearer ${access}` } },
      );
      if (!res.ok) return `Outlook search failed (${res.status}).`;
      const data = (await res.json()) as {
        value?: {
          id: string;
          subject?: string;
          from?: { emailAddress?: { name?: string; address?: string } };
          receivedDateTime?: string;
          bodyPreview?: string;
        }[];
      };
      const rows = (data.value ?? []).map(
        (m) =>
          `[${m.id}]\n  ${m.receivedDateTime} — ${m.from?.emailAddress?.name ?? ""} <${m.from?.emailAddress?.address ?? ""}>\n  Subject: ${m.subject}\n  ${m.bodyPreview ?? ""}`,
      );
      return rows.length ? rows.join("\n\n") : "No messages found.";
    },
  },
  {
    name: "outlook_read_mail",
    connector: "outlook",
    description: "Read a full Outlook message by id (from outlook_search_mail).",
    params: {
      id: { type: "string", description: "Message id", required: true },
    },
    exec: async (input, access) => {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(
          str(input.id),
        )}?$select=subject,from,toRecipients,ccRecipients,receivedDateTime,body`,
        { headers: { Authorization: `Bearer ${access}` } },
      );
      if (!res.ok) return `Outlook read failed (${res.status}).`;
      const m = (await res.json()) as {
        subject?: string;
        from?: { emailAddress?: { name?: string; address?: string } };
        toRecipients?: { emailAddress?: { address?: string } }[];
        receivedDateTime?: string;
        body?: { contentType?: string; content?: string };
      };
      const body =
        m.body?.contentType === "html"
          ? stripHtml(m.body.content ?? "")
          : (m.body?.content ?? "");
      return cap(
        `Subject: ${m.subject}\nFrom: ${m.from?.emailAddress?.name} <${m.from?.emailAddress?.address}>\nTo: ${(m.toRecipients ?? [])
          .map((r) => r.emailAddress?.address)
          .join(", ")}\nDate: ${m.receivedDateTime}\n\n${body}`,
      );
    },
  },
  {
    name: "outlook_calendar",
    connector: "outlook",
    description:
      "List upcoming events on the connected Outlook calendar.",
    params: {
      days: {
        type: "number",
        description: "How many days ahead to look (default 7)",
      },
    },
    exec: async (input, access) => {
      const days = Math.min(num(input.days, 7), 60);
      const start = new Date().toISOString();
      const end = new Date(Date.now() + days * 86400000).toISOString();
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${start}&endDateTime=${end}&$orderby=start/dateTime&$top=30&$select=subject,start,end,location,organizer`,
        {
          headers: {
            Authorization: `Bearer ${access}`,
            Prefer: 'outlook.timezone="Eastern Standard Time"',
          },
        },
      );
      if (!res.ok) return `Calendar lookup failed (${res.status}).`;
      const data = (await res.json()) as {
        value?: {
          subject?: string;
          start?: { dateTime?: string };
          end?: { dateTime?: string };
          location?: { displayName?: string };
        }[];
      };
      const rows = (data.value ?? []).map(
        (e) =>
          `${e.start?.dateTime} → ${e.end?.dateTime}  ${e.subject}${
            e.location?.displayName ? ` @ ${e.location.displayName}` : ""
          }`,
      );
      return rows.length
        ? `Times are US Eastern.\n${rows.join("\n")}`
        : `No events in the next ${days} days.`;
    },
  },
  {
    name: "outlook_create_draft",
    connector: "outlook",
    description:
      "Create a DRAFT email in the connected Outlook account (never sends). " +
      "The user reviews and sends it from Outlook themselves.",
    params: {
      to: {
        type: "string",
        description: "Recipient email(s), comma-separated",
        required: true,
      },
      subject: { type: "string", description: "Subject line", required: true },
      body: { type: "string", description: "Plain-text body", required: true },
    },
    exec: async (input, access) => {
      const res = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: str(input.subject),
          body: { contentType: "Text", content: str(input.body) },
          toRecipients: str(input.to)
            .split(",")
            .map((a) => ({ emailAddress: { address: a.trim() } }))
            .filter((r) => r.emailAddress.address),
        }),
      });
      if (!res.ok) return `Draft creation failed (${res.status}).`;
      return "Draft created in Outlook — the user can review and send it from their Drafts folder.";
    },
  },

  /* ── Gmail ── */
  {
    name: "gmail_search",
    connector: "gmail",
    description:
      "Search the connected Gmail (supports Gmail query syntax like " +
      "from:, subject:, newer_than:7d). Returns ids for gmail_read.",
    params: {
      query: { type: "string", description: "Gmail search query", required: true },
      count: { type: "number", description: "Max results (default 8)" },
    },
    exec: async (input, access) => {
      const max = Math.min(num(input.count, 8), 15);
      const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
          str(input.query),
        )}&maxResults=${max}`,
        { headers: { Authorization: `Bearer ${access}` } },
      );
      if (!listRes.ok) return `Gmail search failed (${listRes.status}).`;
      const list = (await listRes.json()) as { messages?: { id: string }[] };
      if (!list.messages?.length) return "No messages found.";
      const rows: string[] = [];
      for (const m of list.messages) {
        const r = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${access}` } },
        );
        if (!r.ok) continue;
        const d = (await r.json()) as {
          id: string;
          snippet?: string;
          payload?: { headers?: { name: string; value: string }[] };
        };
        const h = (n: string) =>
          d.payload?.headers?.find(
            (x) => x.name.toLowerCase() === n.toLowerCase(),
          )?.value ?? "";
        rows.push(
          `[${d.id}]\n  ${h("Date")} — ${h("From")}\n  Subject: ${h("Subject")}\n  ${d.snippet ?? ""}`,
        );
      }
      return rows.join("\n\n") || "No messages found.";
    },
  },
  {
    name: "gmail_read",
    connector: "gmail",
    description: "Read a full Gmail message by id (from gmail_search).",
    params: {
      id: { type: "string", description: "Message id", required: true },
    },
    exec: async (input, access) => {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
          str(input.id),
        )}?format=full`,
        { headers: { Authorization: `Bearer ${access}` } },
      );
      if (!res.ok) return `Gmail read failed (${res.status}).`;
      interface Part {
        mimeType?: string;
        body?: { data?: string };
        parts?: Part[];
      }
      const d = (await res.json()) as {
        payload?: Part & {
          headers?: { name: string; value: string }[];
        };
      };
      const h = (n: string) =>
        d.payload?.headers?.find(
          (x) => x.name.toLowerCase() === n.toLowerCase(),
        )?.value ?? "";
      function findText(p?: Part, want = "text/plain"): string | null {
        if (!p) return null;
        if (p.mimeType === want && p.body?.data) return b64url(p.body.data);
        for (const c of p.parts ?? []) {
          const hit = findText(c, want);
          if (hit) return hit;
        }
        return null;
      }
      const body =
        findText(d.payload) ??
        (() => {
          const html = findText(d.payload, "text/html");
          return html ? stripHtml(html) : "";
        })();
      return cap(
        `Subject: ${h("Subject")}\nFrom: ${h("From")}\nTo: ${h("To")}\nDate: ${h("Date")}\n\n${body || "(no readable body)"}`,
      );
    },
  },
];

/* ── consumers ── */

export function availableTools(tokens: ConnectorTokens): ToolSpec[] {
  return CONNECTOR_TOOLS.filter((t) => Boolean(tokens[t.connector]));
}

/** Anthropic Messages API tool definitions for the cloud path. */
export function anthropicToolDefs(tokens: ConnectorTokens) {
  return availableTools(tokens).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(t.params).map(([k, p]) => [
          k,
          { type: p.type, description: p.description },
        ]),
      ),
      required: Object.entries(t.params)
        .filter(([, p]) => p.required)
        .map(([k]) => k),
    },
  }));
}

/** Run one connector tool; always resolves to a string for the model. */
export async function executeConnectorTool(
  name: string,
  input: Record<string, unknown>,
  tokens: ConnectorTokens,
): Promise<string> {
  const tool = CONNECTOR_TOOLS.find((t) => t.name === name);
  if (!tool) return `Unknown tool: ${name}`;
  const refresh = tokens[tool.connector];
  if (!refresh) return `${tool.connector} is not connected.`;
  try {
    const access =
      tool.connector === "dropbox"
        ? await dropboxAccess(refresh)
        : tool.connector === "outlook"
          ? await msAccess(refresh)
          : await googleAccess(refresh);
    return await tool.exec(input, access);
  } catch (err) {
    return err instanceof Error ? err.message : "Tool call failed.";
  }
}
