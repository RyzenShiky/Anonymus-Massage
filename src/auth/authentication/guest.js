import { loginGuest } from "../../firebase/auth.js";
import { createOrUpdateProfile } from "../../features/profile/profile.service.js";
import { toUsername } from "../../core/utilities/slug.js";
import { auth } from "../../firebase/auth.js";
import {
  linkWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithPopup,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

export async function continueAsGuest() {
  const cred = await loginGuest();
  const uid = cred.user.uid;
  const username = toUsername("g" + uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toLowerCase());
  await createOrUpdateProfile(uid, {
    username,
    displayName: "Guest",
    bio: "Temporary guest — link an account in Settings to keep this inbox",
    isGuest: true,
  });
  return { user: cred.user, username };
}

/** Upgrade anonymous user to email/password without losing uid/inbox */
export async function linkEmailPassword(email, password) {
  const user = auth.currentUser;
  if (!user || !user.isAnonymous) throw new Error("Not a guest session");
  const credential = EmailAuthProvider.credential(email, password);
  const result = await linkWithCredential(user, credential);
  return result.user;
}

export async function linkGoogle() {
  const user = auth.currentUser;
  if (!user || !user.isAnonymous) throw new Error("Not a guest session");
  const result = await linkWithPopup(user, new GoogleAuthProvider());
  return result.user;
}
