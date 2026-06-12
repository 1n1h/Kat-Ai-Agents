/**
 * Cloud file storage: on the deployed app (no local disk) uploads go to
 * Firebase Storage, scoped per user and case. Requires sign-in and Storage
 * rules that allow authenticated access.
 */

import {
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytes,
  type StorageReference,
} from "firebase/storage";
import { firebaseAuth, firebaseStorage } from "./firebase";

export interface CloudFile {
  name: string;
  size: number;
  url: string;
}

function matterRef(matterId: string): StorageReference | null {
  const storage = firebaseStorage();
  const uid = firebaseAuth()?.currentUser?.uid;
  if (!storage || !uid) return null;
  const safe = matterId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "general";
  return ref(storage, `matters/${uid}/${safe}`);
}

export async function cloudUpload(
  matterId: string,
  files: File[],
): Promise<string[]> {
  const base = matterRef(matterId);
  if (!base) {
    throw new Error("Cloud uploads need sign-in and Firebase configuration.");
  }
  const saved: string[] = [];
  for (const f of files) {
    const name =
      f.name.replace(/[^a-zA-Z0-9 ._()-]/g, "_").slice(0, 120) || "upload";
    await uploadBytes(ref(base, name), f, {
      contentType: f.type || undefined,
    });
    saved.push(name);
  }
  return saved;
}

export async function cloudList(matterId: string): Promise<CloudFile[]> {
  const base = matterRef(matterId);
  if (!base) return [];
  try {
    const res = await listAll(base);
    return await Promise.all(
      res.items.map(async (item) => {
        const [meta, url] = await Promise.all([
          getMetadata(item),
          getDownloadURL(item),
        ]);
        return { name: item.name, size: meta.size ?? 0, url };
      }),
    );
  } catch {
    return []; // rules denied or bucket unreachable — degrade quietly
  }
}
