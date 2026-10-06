export function toUsername(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 24);
}

export function isValidUsername(u) {
  return /^[a-z0-9_]{3,24}$/.test(u);
}

const RESERVED = new Set([
  "admin","administrator","support","help","anonmsg","official","mod","moderator",
  "system","root","null","undefined","api","login","register","settings","inbox","security","privacy",
]);
export function isReservedUsername(u) {
  return RESERVED.has(String(u || "").toLowerCase());
}
