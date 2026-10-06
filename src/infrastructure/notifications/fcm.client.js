/**
 * FCM client shell — register token after permission grant.
 * Sending is always server-side (functions/notifications).
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return { ok: false, reason: "unsupported" };
  const perm = await Notification.requestPermission();
  return { ok: perm === "granted", permission: perm };
}

export const NOTIFICATION_PREFS_DEFAULT = {
  anonymousMessage: true,
  conversationReply: true,
  revealRequest: true,
  circleInvite: true,
  moderationDecision: true,
};
