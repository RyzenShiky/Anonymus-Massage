import {
  db, doc, getDoc, setDoc, serverTimestamp,
} from "../../firebase/firestore.js";
import { writeBatch } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { toUsername } from "../../core/utilities/slug.js";

export async function getProfileByUid(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getProfileByUsername(username) {
  const u = toUsername(username);
  if (!u) return null;
  const snap = await getDoc(doc(db, "publicProfiles", u));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createOrUpdateProfile(uid, data) {
  const userRef = doc(db, "users", uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    const prev = existing.data();
    const locked = prev.username;
    const patch = { updatedAt: serverTimestamp() };
    if (data.displayName !== undefined) patch.displayName = String(data.displayName).slice(0, 40);
    if (data.bio !== undefined) patch.bio = String(data.bio).slice(0, 200);
    if (data.avatarColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(data.avatarColor)) {
      patch.avatarColor = data.avatarColor;
    }
    if (data.inboxOpen !== undefined) patch.inboxOpen = !!data.inboxOpen;
    if (data.isGuest !== undefined) patch.isGuest = !!data.isGuest;

    await setDoc(userRef, patch, { merge: true });

    const pub = { uid, username: locked, updatedAt: serverTimestamp() };
    if (patch.displayName !== undefined) pub.displayName = patch.displayName;
    if (patch.bio !== undefined) pub.bio = patch.bio;
    if (patch.avatarColor !== undefined) pub.avatarColor = patch.avatarColor;
    if (patch.inboxOpen !== undefined) pub.inboxOpen = patch.inboxOpen;
    await setDoc(doc(db, "publicProfiles", locked), pub, { merge: true });

    return { ...prev, ...patch, username: locked, uid };
  }

  const username = toUsername(data.username);
  if (!username) throw new Error("Username required");
  const displayName = String(data.displayName || username).slice(0, 40);
  const bio = String(data.bio || "Ask me anything").slice(0, 200);
  const avatarColor = data.avatarColor && /^#[0-9a-fA-F]{6}$/.test(data.avatarColor)
    ? data.avatarColor
    : "#5b5ce2";
  const inboxOpen = data.inboxOpen !== false;

  const claimRef = doc(db, "usernames", username);
  const claim = await getDoc(claimRef);
  if (claim.exists() && claim.data().uid !== uid) {
    throw new Error("Username already taken");
  }

  const batch = writeBatch(db);
  if (!claim.exists()) {
    batch.set(claimRef, { uid, createdAt: serverTimestamp() });
  }
  batch.set(userRef, {
    uid,
    username,
    displayName,
    bio,
    avatarColor,
    inboxOpen,
    isGuest: data.isGuest === true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, "publicProfiles", username), {
    uid,
    username,
    displayName,
    bio,
    avatarColor,
    inboxOpen,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return { uid, username, displayName, bio, avatarColor, inboxOpen };
}

export function publicLink(username) {
  // Works on GitHub Pages (no Hosting rewrites) and Firebase Hosting
  const url = new URL("u.html", location.href);
  url.searchParams.set("u", String(username || "").toLowerCase());
  return url.href;
}
