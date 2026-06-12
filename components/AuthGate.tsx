"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  authErrorMessage,
  firebaseAuth,
  firebaseEnabled,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase";

/**
 * Requires sign-in (Google or email) when Firebase is configured; otherwise
 * passes straight through (local mode).
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(!firebaseEnabled);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecked(true);
    });
  }, []);

  if (!firebaseEnabled) return <>{children}</>;

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <span className="caret font-mono text-[12px] tracking-widest text-muted">
          AUTHENTICATING
        </span>
      </div>
    );
  }

  if (user) return <>{children}</>;

  async function run(fn: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    void run(() =>
      mode === "signin"
        ? signInWithEmail(email.trim(), password)
        : signUpWithEmail(email.trim(), password),
    );
  }

  return (
    <div className="grain flex h-screen flex-col items-center justify-center bg-paper px-6">
      <p className="rise rise-1 font-mono text-[12px] tracking-[0.25em] text-accent">
        PRIVILEGED &amp; CONFIDENTIAL
      </p>
      <h1 className="rise rise-2 mt-4 font-serif text-5xl text-ink">
        CounselOS
      </h1>
      <p className="rise rise-3 mt-3 max-w-sm text-center text-[14px] text-muted">
        The AI workspace for attorneys.
      </p>

      <div className="rise rise-4 mt-8 w-full max-w-sm rounded-2xl border border-line-strong bg-panel p-6 shadow-2xl">
        <button
          onClick={() => void run(signInWithGoogle)}
          disabled={busy}
          className="w-full rounded-xl border border-line-strong bg-input px-4 py-3 text-[15px] font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-[11px] tracking-widest text-faint">
            OR
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submitEmail} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-input px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
          />
          <input
            type="password"
            required
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-input px-4 py-2.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
          />
          {error && <p className="text-[13px] text-accent">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-[15px] font-semibold text-paper transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError("");
          }}
          className="mt-4 w-full text-center text-[13px] text-muted transition-colors hover:text-ink"
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
