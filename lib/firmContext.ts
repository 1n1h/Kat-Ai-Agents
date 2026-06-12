/**
 * Firm context injection (server-side). Every conversation gets the company
 * profile; if the signed-in email matches an employee profile's frontmatter,
 * that profile rides along too — so Phil's agent knows it's talking to Phil.
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

/**
 * Context block appended to every system prompt. Fails soft: if the firm
 * files are unreadable, chat still works without them.
 */
export function firmContext(userEmail?: string | null): string {
  try {
    const { company, employees } = load();
    let ctx =
      "\n\n[FIRM CONTEXT — this deployment serves the following firm. " +
      "Ground all work in its practice scope, posture, and jurisdiction.]\n" +
      company;

    const me = userEmail
      ? employees.find((e) => e.emails.includes(userEmail.toLowerCase()))
      : undefined;
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
