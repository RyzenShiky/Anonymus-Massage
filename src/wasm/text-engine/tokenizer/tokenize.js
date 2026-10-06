export function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(s) {
  return normalize(s).split(/[^a-z0-9_]+/).filter(Boolean);
}
