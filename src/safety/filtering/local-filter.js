const BLOCK = [
  /\bkys\b/i,
  /\bkill yourself\b/i,
  /\bnigger\b/i,
  /\bfaggot\b/i,
  /\bbunuh diri\b/i,
];

export function localToxicityCheck(text) {
  for (const re of BLOCK) {
    if (re.test(text)) return { ok: false, reason: "Message blocked by safety filter" };
  }
  if ((text.match(/https?:\/\//gi) || []).length > 3)
    return { ok: false, reason: "Too many links" };
  return { ok: true };
}

export function makeAnonSessionId() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
