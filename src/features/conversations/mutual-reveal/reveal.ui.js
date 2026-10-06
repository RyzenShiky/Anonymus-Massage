/** Mutual reveal UI helpers — finalization is server-authoritative. */
export function revealStatusLabel(conv) {
  if (conv.mutualReveal) return "Identities revealed";
  if (conv.revealA && conv.revealB) return "Both consented — awaiting finalize";
  if (conv.revealA || conv.revealB) return "Reveal requested — waiting for other party";
  return "Still anonymous";
}
