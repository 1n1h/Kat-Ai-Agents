"use client";

import { useState } from "react";
import { saveMyProfile, type EmployeeProfile } from "@/lib/team";

const ROLES = [
  "Attorney",
  "Of Counsel",
  "Paralegal",
  "Legal Assistant",
  "Operations / Admin",
];

const ATTORNEYS = ["Phillip J. Sheehe", "Johanna Elizabeth Sheehe", "N/A"];

/**
 * One-time wizard for access-granted users without a profile. Creates the
 * employee profile that rides along as agent context.
 */
export default function Onboarding({
  uid,
  email,
  defaultName,
  onDone,
}: {
  uid: string;
  email: string;
  defaultName: string;
  onDone: (p: EmployeeProfile) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState("");
  const [supports, setSupports] = useState("");
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);

  const needsSupports = role === "Paralegal" || role === "Legal Assistant";
  const canFinish = name.trim().length > 1 && role;

  async function finish() {
    if (!canFinish || busy) return;
    setBusy(true);
    const profile: EmployeeProfile = {
      name: name.trim(),
      email: email.toLowerCase(),
      role,
      supports: needsSupports && supports !== "N/A" ? supports : undefined,
      focus: focus.trim() || undefined,
      createdAt: Date.now(),
    };
    try {
      await saveMyProfile(uid, profile);
      onDone(profile);
    } finally {
      setBusy(false);
    }
  }

  const label =
    "block font-sans text-[11px] font-semibold tracking-[0.18em] text-muted uppercase";
  const input =
    "mt-1.5 w-full rounded-xl border border-line bg-input px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent";

  return (
    <div className="grain fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-paper p-4">
      <div className="pop w-full max-w-md rounded-2xl border border-line-strong bg-panel p-7 shadow-2xl">
        <p className="font-mono text-[10.5px] tracking-[0.25em] text-accent">
          WELCOME TO THE FIRM&apos;S WORKSPACE
        </p>
        <h1 className="mt-2 font-serif text-2xl text-ink">
          Set up your profile
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          This tells the AI team who you are so its work fits your role.
          Takes thirty seconds; your administrator can adjust it later.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className={label}>Your name</label>
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </div>

          <div>
            <label className={label}>Your role</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-[13.5px] transition-colors ${
                    role === r
                      ? "border-accent bg-accent-wash text-ink"
                      : "border-line text-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {needsSupports && (
            <div>
              <label className={label}>Primarily supporting</label>
              <select
                className={input}
                value={supports}
                onChange={(e) => setSupports(e.target.value)}
              >
                <option value="">Select…</option>
                {ATTORNEYS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={label}>
              Practice focus / responsibilities{" "}
              <span className="normal-case tracking-normal text-faint">
                (optional)
              </span>
            </label>
            <textarea
              className={`${input} min-h-20 resize-none`}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. First-party insurance defense, hurricane claims, deposition scheduling…"
            />
          </div>

          <button
            onClick={() => void finish()}
            disabled={!canFinish || busy}
            className="w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-paper transition-colors hover:bg-accent-soft disabled:opacity-40"
          >
            {busy ? "Saving…" : "Enter the workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
