import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "../core/config/firebase.config.js";
import { RECAPTCHA_SITE_KEY } from "../core/config/app-check.config.js";

const NAME = "anonSender";
let senderAppCheck = null;

export function getSenderApp() {
  const existing = getApps().find((a) => a.name === NAME);
  if (existing) return existing;
  const app = initializeApp(firebaseConfig, NAME);
  if (RECAPTCHA_SITE_KEY) {
    senderAppCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } else {
    console.info("[app-check] sender app: no site key — Enforce will block sends");
  }
  return app;
}

export function getSenderAuth() {
  return getAuth(getSenderApp());
}

let senderDb;
export function getSenderDb() {
  senderDb ??= initializeFirestore(getSenderApp(), { experimentalAutoDetectLongPolling: true });
  return senderDb;
}

export async function ensureSenderAnonymous() {
  getSenderApp(); // ensure App Check attached
  const auth = getSenderAuth();
  if (auth.currentUser?.isAnonymous) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}
