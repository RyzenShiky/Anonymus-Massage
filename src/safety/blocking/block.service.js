import { db, doc, setDoc, serverTimestamp } from "../../firebase/firestore.js";
import { auth } from "../../firebase/auth.js";

export async function blockSession(sessionId) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in required");
  const id = `${user.uid}_${String(sessionId).slice(0, 64)}`;
  await setDoc(doc(db, "blocks", id), {
    blockerUid: user.uid,
    sessionId: String(sessionId).slice(0, 64),
    createdAt: serverTimestamp(),
  });
}
