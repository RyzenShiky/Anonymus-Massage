import {
  db, doc, getDoc, updateDoc, collection, addDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp,
} from "../../firebase/firestore.js";
import { auth } from "../../firebase/auth.js";
import { ensureSenderAnonymous, getSenderDb } from "../../firebase/sender-app.js";

export function newThreadSecret() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** @param {import('firebase/firestore').Firestore} [database] */
export async function getThread(secret, database = db) {
  const snap = await getDoc(doc(database, "threads", secret));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function watchThreadMessages(secret, cb, database = db) {
  const q = query(
    collection(database, "threads", secret, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => cb(null, snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => cb(err, [])
  );
}

export async function sendThreadMessage(secret, body, database = null) {
  const text = String(body || "").trim().slice(0, 2000);
  if (!text) throw new Error("Empty");

  const primary = auth.currentUser;
  let writeDb = database;
  let authorUid;

  if (!writeDb) {
    const threadPrimary = await getThread(secret, db).catch(() => null);
    if (primary && threadPrimary &&
        (primary.uid === threadPrimary.recipientUid || primary.uid === threadPrimary.creatorUid)) {
      writeDb = db;
      authorUid = primary.uid;
    } else {
      const u = await ensureSenderAnonymous();
      writeDb = getSenderDb();
      const thread = await getThread(secret, writeDb);
      if (!thread || thread.creatorUid !== u.uid) {
        throw new Error("Sender session lost — cannot reply from this device");
      }
      authorUid = u.uid;
    }
  } else {
    const u = writeDb === db ? primary : await ensureSenderAnonymous();
    if (!u) throw new Error("Not signed in");
    authorUid = u.uid;
  }

  await addDoc(collection(writeDb, "threads", secret, "messages"), {
    body: text,
    authorUid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(writeDb, "threads", secret), { updatedAt: serverTimestamp() });
}

export async function requestRevealAsRecipient() {
  throw new Error("Reveal disabled until redesigned (anon sender uid ≠ profile uid)");
}

export async function revealAsSender() {
  throw new Error("Reveal disabled until redesigned");
}

export function listLocalSecrets() {
  try {
    return JSON.parse(localStorage.getItem("thread_secrets") || "{}");
  } catch {
    return {};
  }
}
