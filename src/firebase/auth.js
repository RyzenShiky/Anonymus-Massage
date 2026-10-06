import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { app } from "./app.js";

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function loginEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  return cred;
}

export async function loginGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function loginGuest() {
  return signInAnonymously(auth);
}

export async function logout() {
  return signOut(auth);
}
