"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth, firebaseEnabled, signInWithGoogle } from "@/lib/firebase";

/**
 * Requires Google sign-in when Firebase is configured; otherwise passes
 * straight through (local mode). Children receive the workspace.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(!firebaseEnabled);

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
        <span className="font-mono text-xs tracking-widest text-muted caret">
          AUTHENTICATING
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grain flex h-screen flex-col items-center justify-center bg-paper px-6">
        <p className="rise rise-1 font-mono text-[11px] tracking-[0.25em] text-accent">
          PRIVILEGED &amp; CONFIDENTIAL
        </p>
        <h1 className="rise rise-2 mt-4 font-serif text-5xl text-ink">
          CounselOS
        </h1>
        <p className="rise rise-3 mt-3 max-w-sm text-center text-sm text-muted">
          The AI workspace for attorneys. Sign in with the firm account on the
          approved list.
        </p>
        <button
          onClick={() => signInWithGoogle()}
          className="rise rise-4 mt-8 border border-line-strong bg-panel px-6 py-3 font-sans text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Continue with Google
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
