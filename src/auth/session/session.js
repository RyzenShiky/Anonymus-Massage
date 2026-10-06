import { watchAuth, logout as fbLogout } from "../../firebase/auth.js";
import { getProfileByUid } from "../../features/profile/profile.service.js";

let currentUser = null;
let currentProfile = null;
let ready = false;
const listeners = new Set();

export function getUser() { return currentUser; }
export function getProfile() { return currentProfile; }
export function isSessionReady() { return ready; }

export function onSession(cb) {
  listeners.add(cb);
  if (ready) cb(currentUser, currentProfile);
  return () => listeners.delete(cb);
}

function emit() {
  for (const cb of listeners) cb(currentUser, currentProfile);
}

export function initSession() {
  return watchAuth(async (user) => {
    currentUser = user;
    try {
      currentProfile = user ? await getProfileByUid(user.uid) : null;
    } catch (e) {
      console.warn("[session] profile load failed", e);
      currentProfile = null;
    }
    ready = true;
    emit();
  });
}

export function whenReady() {
  if (ready) return Promise.resolve({ user: currentUser, profile: currentProfile });
  return new Promise((resolve) => {
    const off = onSession((user, profile) => {
      off();
      resolve({ user, profile });
    });
  });
}

export async function logout() {
  await fbLogout();
  currentUser = null;
  currentProfile = null;
  emit();
}

export function requireAuth(redirect = "login.html") {
  if (!ready) return false;
  if (!currentUser) {
    location.href = redirect + "?next=" + encodeURIComponent(location.pathname + location.search);
    return false;
  }
  return true;
}
