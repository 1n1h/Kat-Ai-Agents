"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth, firebaseEnabled } from "@/lib/firebase";
import LandingPage from "@/components/landing/LandingPage";

/**
 * Routing front door:
 *   - Firebase enabled + signed out → marketing landing (sign-in lives there).
 *   - Firebase enabled + signed in  → the workspace (children).
 *   - Firebase disabled (local dev) → straight to the workspace, unless
 *     ?preview=landing is set, so the landing can be viewed without auth.
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

  if (!firebaseEnabled) {
    const preview =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("preview") === "landing";
    return preview ? <LandingPage /> : <>{children}</>;
  }

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

  return <LandingPage />;
}
