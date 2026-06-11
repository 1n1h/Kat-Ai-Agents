/**
 * Firebase is optional until keys exist: when NEXT_PUBLIC_FIREBASE_API_KEY is
 * unset the app runs in local mode (no auth, files on this machine only).
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  type Auth,
} from "firebase/auth";

export const firebaseEnabled = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
);

let app: FirebaseApp | null = null;

export function firebaseAuth(): Auth | null {
  if (!firebaseEnabled) return null;
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  }
  return getAuth(app);
}

export async function signInWithGoogle() {
  const auth = firebaseAuth();
  if (!auth) return null;
  const res = await signInWithPopup(auth, new GoogleAuthProvider());
  return res.user;
}

export async function signOut() {
  const auth = firebaseAuth();
  if (auth) await fbSignOut(auth);
}
