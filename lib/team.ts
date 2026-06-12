/**
 * Team access + self-onboarded employee profiles.
 *
 * - Admins (ADMIN_EMAILS) grant access by email in Settings → access/{email}
 * - When a granted user signs in without a profile, the onboarding wizard
 *   collects role/details → users/{uid}/profile/self
 * - The profile is sent with each chat request and injected as agent
 *   context, exactly like the hand-written profiles in firm/employees/.
 *
 * Firestore rules must allow the access collection (see HANDOFF.md).
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";

/** Admins who can grant access. Keep in sync with the Firestore rules. */
export const ADMIN_EMAILS = [
  "katherine@amploconsulting.com",
  "travis@curvaapp.com",
];

export const isAdmin = (email?: string | null) =>
  Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));

export interface AccessGrant {
  email: string;
  addedBy: string;
  addedAt: number;
}

export interface EmployeeProfile {
  name: string;
  email: string;
  role: string;
  /** which attorney they support, if any */
  supports?: string;
  /** practice focus / responsibilities in their own words */
  focus?: string;
  createdAt: number;
}

const norm = (email: string) => email.trim().toLowerCase();

export async function grantAccess(
  email: string,
  addedBy: string,
): Promise<void> {
  const db = firebaseDb();
  if (!db) return;
  await setDoc(doc(db, "access", norm(email)), {
    email: norm(email),
    addedBy,
    addedAt: Date.now(),
  });
}

export async function revokeAccess(email: string): Promise<void> {
  const db = firebaseDb();
  if (!db) return;
  await deleteDoc(doc(db, "access", norm(email)));
}

export async function listGrants(): Promise<AccessGrant[]> {
  const db = firebaseDb();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "access"));
    return snap.docs
      .map((d) => d.data() as AccessGrant)
      .sort((a, b) => b.addedAt - a.addedAt);
  } catch {
    return [];
  }
}

export async function hasAccessGrant(email: string): Promise<boolean> {
  const db = firebaseDb();
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, "access", norm(email)));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getMyProfile(
  uid: string,
): Promise<EmployeeProfile | null> {
  const db = firebaseDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid, "profile", "self"));
    return snap.exists() ? (snap.data() as EmployeeProfile) : null;
  } catch {
    return null;
  }
}

export async function saveMyProfile(
  uid: string,
  profile: EmployeeProfile,
): Promise<void> {
  const db = firebaseDb();
  if (!db) return;
  await setDoc(doc(db, "users", uid, "profile", "self"), profile);
}

/** Compact context block for the agents (sent with chat requests). */
export function profileContext(p: EmployeeProfile): string {
  const lines = [
    `Name: ${p.name}`,
    `Role: ${p.role}`,
    p.supports ? `Supports: ${p.supports}` : "",
    p.focus ? `Focus: ${p.focus}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
