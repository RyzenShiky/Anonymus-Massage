import { requestNotificationPermission } from "../../infrastructure/notifications/fcm.client.js";

const BASE_TITLE = document.title;
const seen = new Set();
let primed = false;

function setBadge(n) {
  document.title = n ? `(${n}) ${BASE_TITLE}` : BASE_TITLE;
  if (n) navigator.setAppBadge?.(n);
  else navigator.clearAppBadge?.();
}

async function showSystemNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body: "Ada pesan anonim baru di inbox-mu", tag: "new-message", renotify: true };
  try {
    await navigator.serviceWorker.register("./sw.js");
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("anonmsg", opts);
  } catch {
    new Notification("anonmsg", opts);
  }
}

/** Panggil di setiap snapshot inbox. */
export function handleInboxSnapshot(items, { onNew } = {}) {
  const live = items.filter((m) => m.status !== "deleted");
  const fresh = live.filter((m) => !seen.has(m.id) && !m.read);
  live.forEach((m) => seen.add(m.id));
  setBadge(live.filter((m) => !m.read).length);
  if (!primed) {
    primed = true;
    return;
  }
  if (!fresh.length) return;
  onNew?.(fresh.length);
  if (document.hidden) showSystemNotification();
}

export async function enableAlerts() {
  const r = await requestNotificationPermission();
  if (r.ok && "serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (_) {}
  }
  return r;
}
