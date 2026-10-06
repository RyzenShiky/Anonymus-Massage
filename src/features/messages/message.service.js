import {
  collection, query, where, orderBy, limit, onSnapshot,
  doc, updateDoc, deleteDoc, serverTimestamp,
} from "../../firebase/firestore.js";
import { db } from "../../firebase/firestore.js";
import {
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { ensureSenderAnonymous, getSenderDb, getSenderAuth } from "../../firebase/sender-app.js";
import { newThreadSecret } from "../conversations/thread.service.js";

export async function sendAnonymousMessage({ recipientUid, recipientUsername, body, sessionId }) {
  const text = String(body || "").trim().slice(0, 2000);
  if (!text) throw new Error("Message is empty");
  if (!recipientUid || String(recipientUid).length < 20) throw new Error("Invalid recipient");
  if (recipientUsername && String(recipientUsername).length > 24) {
    throw new Error("Invalid recipient username");
  }

  // Always secondary anonymous app — never permanent account uid
  const user = await ensureSenderAnonymous();
  const sdb = getSenderDb();
  const secret = newThreadSecret();
  const rateRef = doc(sdb, "rateLimits", user.uid);
  const msgRef = doc(collection(sdb, "messages"));
  const threadRef = doc(sdb, "threads", secret);

  const batch = writeBatch(sdb);

  batch.set(rateRef, {
    lastSent: serverTimestamp(),
    count: 1,
  });

  batch.set(threadRef, {
    creatorUid: user.uid,
    recipientUid,
    messageId: msgRef.id,
    status: "open",
    mutualReveal: false,
    revealByRecipient: false,
    revealBySender: false,
    senderUsername: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(msgRef, {
    recipientUid,
    recipientUsername: recipientUsername ? String(recipientUsername).slice(0, 24) : null,
    body: text,
    anonymous: true,
    sessionId: sessionId ? String(sessionId).slice(0, 64) : null,
    threadSecret: secret,
    status: "delivered",
    read: false,
    reaction: null,
    createdAt: serverTimestamp(),
  });

  // Mirror first message into thread so sender sees it in my-sends
  const threadMsgRef = doc(collection(sdb, "threads", secret, "messages"));
  batch.set(threadMsgRef, {
    body: text,
    authorUid: user.uid,
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  try {
    const key = "thread_secrets";
    const bag = JSON.parse(localStorage.getItem(key) || "{}");
    bag[secret] = { recipientUid, at: Date.now(), role: "sender" };
    localStorage.setItem(key, JSON.stringify(bag));
  } catch (_) {}

  return { id: msgRef.id, threadSecret: secret };
}

export function watchInbox(uid, cb) {
  const q = query(
    collection(db, "messages"),
    where("recipientUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => cb(null, snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => cb(err, [])
  );
}

export async function markRead(messageId) {
  await updateDoc(doc(db, "messages", messageId), { read: true });
}

export async function setReaction(messageId, reaction) {
  const allowed = ["❤️", "😂", "👍", "😮", null];
  if (!allowed.includes(reaction)) throw new Error("Invalid reaction");
  await updateDoc(doc(db, "messages", messageId), { reaction });
}

export async function softDeleteMessage(messageId) {
  await updateDoc(doc(db, "messages", messageId), { status: "deleted", body: "" });
}

export async function hardDeleteMessage(messageId) {
  await deleteDoc(doc(db, "messages", messageId));
}
