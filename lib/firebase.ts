/**
 * Firebase: Google + email/password auth, with Storage initialized for the
 * cloud file phase. When NEXT_PUBLIC_FIREBASE_API_KEY is unset the app runs
 * in local mode (no auth, files on this machine only).
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type Auth,
} from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export const firebaseEnabled = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
);

let app: FirebaseApp | null = null;

function firebaseApp(): FirebaseApp | null {
  if (!firebaseEnabled) return null;
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  }
  return app;
}

export function firebaseAuth(): Auth | null {
  const a = firebaseApp();
  return a ? getAuth(a) : null;
}

export function firebaseStorage(): FirebaseStorage | null {
  const a = firebaseApp();
  return a ? getStorage(a) : null;
}

export async function signInWithGoogle() {
  const auth = firebaseAuth();
  if (!auth) return null;
  const res = await signInWithPopup(auth, new GoogleAuthProvider());
  return res.user;
}

export async function signInWithEmail(email: string, password: string) {
  const auth = firebaseAuth();
  if (!auth) return null;
  const res = await signInWithEmailAndPassword(auth, email, password);
  return res.user;
}

export async function signUpWithEmail(email: string, password: string) {
  const auth = firebaseAuth();
  if (!auth) return null;
  const res = await createUserWithEmailAndPassword(auth, email, password);
  return res.user;
}

export async function signOut() {
  const auth = firebaseAuth();
  if (auth) await fbSignOut(auth);
}

/** Friendly messages for the auth codes attorneys will actually hit. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account already exists for that email — sign in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/too-many-requests":
      return "Too many attempts — wait a moment and try again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was closed before finishing.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorized in Firebase — add it under Authentication → Settings → Authorized domains.";
    default:
      return (err as Error)?.message ?? "Sign-in failed.";
  }
}
