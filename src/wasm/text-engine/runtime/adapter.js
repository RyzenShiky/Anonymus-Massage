/**
 * Text engine adapter.
 * Today: pure JS. Later: load Emscripten MODULARIZE module from wasm/build/.
 * NEVER treat local filter as security authority.
 */
import { normalize, tokenize } from "../tokenizer/tokenize.js";
import { matchProfanity } from "../filter-engine/filter.js";

export async function analyzeText(raw) {
  const norm = normalize(raw);
  const tokens = tokenize(norm);
  const hits = matchProfanity(norm);
  return {
    ok: hits.length === 0,
    tokens,
    hits,
    stats: { length: norm.length, tokenCount: tokens.length },
    authority: "local-only",
  };
}
