/**
 * Firm context injection (server-side), gated by email domain.
 *
 * The firm's company profile is NOT hard-prompted into every agent. It's only
 * attached when the signed-in user's email is on the firm's domain (derived
 * from the employee profiles, plus the optional FIRM_DOMAINS env override).
 * Anyone else — a different firm, or an unauthenticated/mobile session with no
 * email — gets a clean, firm-neutral assistant. This keeps the product
 * multi-tenant: one firm's profile never leaks into another's session.
 *
 * Profiles live in firm/ as markdown with YAML-ish frontmatter:
 *   emails:
 *     - jsheehe@sheeheandassociates.com
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface EmployeeProfile {
  name: string;
  emails: string[];
  body: string;
}

interface FirmData {
  company: string;
  employees: EmployeeProfile[];
}

let cache: FirmData | null = null;

function load(): FirmData {
  if (cache) return cache;
  const dir = join(process.cwd(), "firm");
  const company = readFileSync(join(dir, "company-profile.md"), "utf-8");

  const empDir = join(dir, "employees");
  const employees: EmployeeProfile[] = readdirSync(empDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = readFileSync(join(empDir, f), "utf-8");
      const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const head = fm?.[1] ?? "";
      const name = head.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? f;
      const emails = [...head.matchAll(/-\s*([^\s#]+@[^\s#]+)/g)].map((m) =>
        m[1].toLowerCase(),
      );
      const body = fm ? raw.slice(fm[0].length).trim() : raw;
      return { name, emails, body };
    });

  cache = { company, employees };
  return cache;
}

/** The set of email domains that count as "the firm" (employees + env override). */
function firmDomains(employees: EmployeeProfile[]): Set<string> {
  const fromEnv = (process.env.FIRM_DOMAINS ?? "")
    .toLowerCase()
    .split(/[,\s]+/)
    .map((d) => d.trim())
    .filter(Boolean);
  const fromEmployees = employees
    .flatMap((e) => e.emails)
    .map((em) => em.split("@")[1])
    .filter(Boolean);
  return new Set([...fromEnv, ...fromEmployees]);
}

const NEUTRAL_NOTE =
  "\n\n[No firm profile is attached to this session. Act as a general-purpose " +
  "legal assistant for the signed-in user. Do not reference any specific law " +
  "firm, its staff, or its matters.]";

/**
 * Context block appended to every system prompt — but only the firm's own
 * people get the firm profile. Fails soft: if the firm files are unreadable,
 * chat still works without them.
 */
export function firmContext(userEmail?: string | null): string {
  try {
    const { company, employees } = load();
    const domain = userEmail?.toLowerCase().split("@")[1];
    const isFirmUser = !!domain && firmDomains(employees).has(domain);

    // Not a firm work email (or no email at all) — keep it firm-neutral.
    if (!isFirmUser) return NEUTRAL_NOTE;

    let ctx =
      "\n\n[FIRM CONTEXT — the signed-in user works at this firm. Ground all " +
      "work in its practice scope, posture, and jurisdiction.]\n" +
      company;

    const me = employees.find((e) =>
      e.emails.includes(userEmail!.toLowerCase()),
    );
    if (me) {
      ctx +=
        `\n\n[CURRENT USER — the signed-in user is ${me.name}. Address ` +
        "them accordingly and tailor work to their role and practice focus.]\n" +
        me.body;
    }
    return ctx;
  } catch {
    return "";
  }
}
