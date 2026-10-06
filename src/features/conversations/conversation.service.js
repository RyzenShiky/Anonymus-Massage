/**
 * Client-side conversation repository.
 * Permission / reveal / rate-limit authority = Cloud Functions (stubs in functions/).
 */
import {
  db, collection, addDoc, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp,
} from "../../firebase/firestore.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export async function startConversationFromMessage({ messageId, recipientUid, sessionId }) {
  const ref = await addDoc(collection(db, "conversations"), {
    messageId: messageId || null,
    recipientUid,
    sessionId: sessionId || null,
    status: "open",
    revealA: false,
    revealB: false,
    mutualReveal: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function watchConversations(uid, cb) {
  const q = query(
    collection(db, "conversations"),
    where("recipientUid", "==", uid),
    orderBy("updatedAt", "desc"),
    limit(40)
  );
  return onSnapshot(q, (snap) => {
    cb(null, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => cb(err, []));
}

export async function sendConversationMessage(conversationId, { body, fromRecipient }) {
  const text = String(body || "").trim().slice(0, 2000);
  if (!text) throw new Error("Empty message");
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    body: text,
    fromRecipient: !!fromRecipient,
    anonymous: !fromRecipient,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "conversations", conversationId), { updatedAt: serverTimestamp() });
}

export function watchConversationMessages(conversationId, cb) {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    cb(null, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => cb(err, []));
}

/** UI-only request — server must finalize mutual reveal */
export async function requestReveal(conversationId, side) {
  const field = side === "A" ? "revealA" : "revealB";
  await updateDoc(doc(db, "conversations", conversationId), {
    [field]: true,
    revealRequestedAt: serverTimestamp(),
  });
  // TODO: call functions/mutual-reveal/create-request
}
