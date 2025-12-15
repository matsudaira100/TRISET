import { WORD_SETS } from "./word.js";

const DEFAULT_BLOCK_TYPES = ["1", "2", "3", "4", "L", "J", "Z", "S", "T", "U", "O", "V"];
const NGSL_KEYS = ["NGSL1", "NGSL2", "NGSL3", "NGSL4", "NGSL5", "NGSL6", "NGSL7"];

function normalizeWord(entry) {
  if (typeof entry === "string") {
    return { en: entry, ja: "" };
  }
  if (entry && typeof entry === "object") {
    return { en: entry.en ?? "", ja: entry.ja ?? "" };
  }
  return { en: "", ja: "" };
}

function cloneWord(entry) {
  const normalized = normalizeWord(entry);
  return { en: (normalized.en ?? "").toLowerCase(), ja: normalized.ja };
}

function buildLengthFilteredSet(min, max) {
  const seen = new Set();
  const result = [];
  for (const key of NGSL_KEYS) {
    const list = WORD_SETS[key] ?? [];
    for (const entry of list) {
      const normalized = normalizeWord(entry);
      const en = (normalized.en ?? "").toLowerCase();
      if (!en) continue;
      if (en.length < min || en.length > max) continue;
      if (seen.has(en)) continue;
      seen.add(en);
      result.push({ en, ja: normalized.ja });
    }
  }
  return result;
}

function ensureGeneratedWordSets() {
  WORD_SETS.short = WORD_SETS.short ?? buildLengthFilteredSet(1, 3);
  WORD_SETS.medium = WORD_SETS.medium ?? buildLengthFilteredSet(4, 6);
  WORD_SETS.long = WORD_SETS.long ?? buildLengthFilteredSet(7, 9);
  WORD_SETS.extraLong = WORD_SETS.extraLong ?? buildLengthFilteredSet(10, 14);
}

ensureGeneratedWordSets();

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function getWordSetNames() {
  return Object.keys(WORD_SETS);
}

export { ensureGeneratedWordSets };

export function getRandomWordSet(countOrName = DEFAULT_BLOCK_TYPES.length, maybeName) {
  let count = DEFAULT_BLOCK_TYPES.length;
  let setName = "classic";

  if (typeof countOrName === "number") {
    count = countOrName;
    if (typeof maybeName === "string") setName = maybeName;
  } else if (typeof countOrName === "string") {
    setName = countOrName;
    if (typeof maybeName === "number") count = maybeName;
  }

  const baseSet = (WORD_SETS[setName] ?? WORD_SETS.classic).map(cloneWord);
  const pool = baseSet.map(cloneWord);
  while (pool.length < count) {
    pool.push(...baseSet.map(cloneWord));
  }
  shuffle(pool);
  return pool.slice(0, count).map(cloneWord);
}

export function buildWordMap(words, types = DEFAULT_BLOCK_TYPES) {
  const source = (Array.isArray(words) ? words : []).map(cloneWord);
  if (!source.length) {
    return Object.fromEntries(types.map(type => [type, { en: "xxxxx", ja: "" }]));
  }
  const pool = source.slice();
  while (pool.length < types.length) {
    pool.push(...source.map(cloneWord));
  }
  return Object.fromEntries(types.map((type, i) => [type, cloneWord(pool[i % pool.length]) ]));
}

export function registerWordSet(name, words) {
  if (!name) throw new Error("Word set name is required.");
  if (!Array.isArray(words)) throw new Error("Word set must be an array of words.");
  WORD_SETS[name] = words.map(normalizeWord);
}
