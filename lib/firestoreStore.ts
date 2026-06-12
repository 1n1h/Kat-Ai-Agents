/**
 * Cloud persistence for cases and threads: users/{uid}/matters and
 * users/{uid}/threads in Firestore (per the published security rules —
 * each user can only touch their own tree). Signed-in sessions sync in
 * realtime across devices; local mode stays on localStorage.
 */

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type { Matter, Thread, WorkspaceState } from "./store";

/** Firestore rejects undefined values — strip them structurally. */
const clean = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function watchWorkspace(
  uid: string,
  cb: (state: WorkspaceState) => void,
): () => void {
  const db = firebaseDb();
  if (!db) return () => undefined;

  let matters: Matter[] = [];
  let threads: Thread[] = [];
  let gotM = false;
  let gotT = false;
  const emit = () => {
    if (gotM && gotT) {
      cb({
        matters: [...matters].sort((a, b) => a.createdAt - b.createdAt),
        threads,
      });
    }
  };

  const u1 = onSnapshot(
    collection(db, "users", uid, "matters"),
    (snap) => {
      matters = snap.docs.map((d) => d.data() as Matter);
      gotM = true;
      emit();
    },
    () => undefined, // permission/offline errors: stay on local state
  );
  const u2 = onSnapshot(
    collection(db, "users", uid, "threads"),
    (snap) => {
      threads = snap.docs.map((d) => d.data() as Thread);
      gotT = true;
      emit();
    },
    () => undefined,
  );
  return () => {
    u1();
    u2();
  };
}

export async function saveMatter(uid: string, m: Matter): Promise<void> {
  const db = firebaseDb();
  if (!db) return;
  await setDoc(doc(db, "users", uid, "matters", m.id), clean(m));
}

export async function saveThread(uid: string, t: Thread): Promise<void> {
  const db = firebaseDb();
  if (!db) return;
  await setDoc(doc(db, "users", uid, "threads", t.id), clean(t));
}

export async function deleteThreadDoc(uid: string, id: string): Promise<void> {
  const db = firebaseDb();
  if (!db) return;
  await deleteDoc(doc(db, "users", uid, "threads", id));
}

export async function deleteMatterDoc(uid: string, id: string): Promise<void> {
  const db = firebaseDb();
  if (!db) return;
  await deleteDoc(doc(db, "users", uid, "matters", id));
}

/** One-time upload of pre-sync local conversations into the user's tree. */
export async function migrateLocal(
  uid: string,
  state: WorkspaceState,
): Promise<void> {
  const db = firebaseDb();
  if (!db) return;
  const batch = writeBatch(db);
  for (const m of state.matters.slice(0, 200)) {
    batch.set(doc(db, "users", uid, "matters", m.id), clean(m));
  }
  for (const t of state.threads.slice(0, 250)) {
    batch.set(doc(db, "users", uid, "threads", t.id), clean(t));
  }
  await batch.commit();
}
