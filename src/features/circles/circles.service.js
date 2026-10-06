/**
 * Circles — who may send anonymous messages.
 * Client CRUD; invite/permission enforcement → functions/circles
 */
import { db, doc, setDoc, getDoc, collection, query, where, limit, serverTimestamp } from "../../firebase/firestore.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export const AUDIENCE = {
  EVERYONE: "everyone",
  FOLLOWERS: "followers",
  FRIENDS: "friends",
  CIRCLE: "circle",
  NOBODY: "nobody",
};

export async function setInboxAudience(uid, audience) {
  await setDoc(doc(db, "userSettings", uid), { inboxAudience: audience, updatedAt: serverTimestamp() }, { merge: true });
}

export async function createCircle(uid, { name, emoji }) {
  const ref = doc(collection(db, "circles"));
  await setDoc(ref, {
    ownerUid: uid,
    name: name || "Circle",
    emoji: emoji || "👥",
    memberUids: [uid],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listCircles(uid) {
  const q = query(collection(db, "circles"), where("memberUids", "array-contains", uid), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
