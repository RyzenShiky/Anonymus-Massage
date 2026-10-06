import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js";
import { firebaseConfig } from "../core/config/firebase.config.js";
import { RECAPTCHA_SITE_KEY } from "../core/config/app-check.config.js";

export const app = initializeApp(firebaseConfig);
export const analytics = null;

if (typeof self !== "undefined" && location.hostname === "localhost") {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

export let appCheck = null;
if (RECAPTCHA_SITE_KEY) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
} else {
  console.info("[app-check] Set RECAPTCHA_SITE_KEY in src/core/config/app-check.config.js");
}

export async function initAppCheck() {
  return appCheck;
}
