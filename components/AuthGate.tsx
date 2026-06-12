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
    <div className="grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-paper px-6">
      {/* ambient accent glow behind the card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% 38%, var(--color-accent-wash), transparent 70%)",
        }}
      />

      {/* glass card */}
      <div className="rise rise-2 relative z-10 flex w-full max-w-sm flex-col items-center rounded-3xl border border-line bg-gradient-to-b from-white/[0.06] to-transparent p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-wash shadow-lg">
          <span className="font-serif text-2xl text-accent">✳</span>
        </div>
        <h1 className="font-serif text-3xl text-ink">
          Counsel<span className="text-accent">OS</span>
        </h1>
        <p className="mt-2 mb-6 font-mono text-[10.5px] tracking-[0.25em] text-accent">
          PRIVILEGED &amp; CONFIDENTIAL
        </p>

        <form onSubmit={submitEmail} className="flex w-full flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-input px-5 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
          />
          <input
            type="password"
            required
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-input px-5 py-3 text-[15px] text-ink outline-none placeholder:text-faint focus:border-accent"
          />
          {error && <p className="text-left text-[13px] text-accent">{error}</p>}

          <hr className="border-line opacity-60" />

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-semibold text-paper shadow transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            {busy
              ? "One moment…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>

          <button
            type="button"
            onClick={() => void run(signInWithGoogle)}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-line-strong bg-input px-5 py-3 text-[15px] font-medium text-ink shadow transition-all hover:brightness-110 disabled:opacity-50"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <button
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError("");
          }}
          className="mt-5 text-center text-[13px] text-muted transition-colors hover:text-ink"
        >
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <span className="text-ink underline underline-offset-2">
                Sign up
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span className="text-ink underline underline-offset-2">
                Sign in
              </span>
            </>
          )}
        </button>
      </div>

      <p className="rise rise-4 relative z-10 mt-10 text-center text-[13px] text-muted">
        The AI workspace for attorneys — analysis, drafting, and citation
        check, on the record.
      </p>
    </div>
  );
}
