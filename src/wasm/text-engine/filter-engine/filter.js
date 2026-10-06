const LIST = [
  "kys", "nigger", "faggot",
  "bunuh diri", "mati saja", "setan kau",
];

export function matchProfanity(normalized) {
  const hits = [];
  for (const w of LIST) {
    // word boundary-ish: not substring of longer token
    const re = new RegExp(`(?:^|[^a-z0-9_])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9_])`, "i");
    if (re.test(" " + normalized + " ")) hits.push(w);
  }
  return hits;
}
