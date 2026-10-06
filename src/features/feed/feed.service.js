/**
 * Global feed client — only reads approved public posts.
 * Create path must go through Cloud Functions + moderation (never direct publish).
 */
import { db, collection, query, where, orderBy, limit, onSnapshot } from "../../firebase/firestore.js";

export function watchPublicFeed(cb) {
  const q = query(
    collection(db, "feedPosts"),
    where("visibility", "==", "public"),
    where("moderationStatus", "==", "approved"),
    orderBy("publishedAt", "desc"),
    limit(30)
  );
  return onSnapshot(q, (snap) => {
    cb(null, snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => cb(err, []));
}
