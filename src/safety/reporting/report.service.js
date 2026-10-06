import { db, collection, addDoc, serverTimestamp } from "../../firebase/firestore.js";
import { auth } from "../../firebase/auth.js";

export async function reportContent({ targetType, targetId, reason, messageBody }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to report");
  await addDoc(collection(db, "reports"), {
    reporterUid: user.uid,
    targetType: String(targetType || "message").slice(0, 32),
    targetId: String(targetId || "").slice(0, 128),
    reason: String(reason || "").slice(0, 500),
    messageBody: String(messageBody || "").slice(0, 2000),
    createdAt: serverTimestamp(),
    status: "open",
  });
}
