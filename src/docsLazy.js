/* ───────────────────────────────────────────────────
 *  docsLazy.js — Lazy wrapper around docs.js
 *  Prevents the heavy docs module (rwr-images, search index)
 *  from being bundled into the main entry chunk.
 *
 *  App.jsx and GlobalSearch.jsx import from here.
 *  DocsPage.jsx still imports directly from docs.js
 *  (it's already route-split, so that's fine).
 * ─────────────────────────────────────────────────── */

let _docsModule = null;

async function _load() {
  if (!_docsModule) {
    _docsModule = import("./docs.js");
  }
  return _docsModule;
}

/** Async — get all known article slugs */
export async function getArticleSlugs() {
  const m = await _load();
  return m.getArticleSlugs();
}

/** Async — batch-load article metadata for a language */
export async function getAllArticleMetas(lang) {
  const m = await _load();
  return m.getAllArticleMetas(lang);
}

/** Async — search articles */
export async function searchArticles(query, lang) {
  const m = await _load();
  return m.searchArticles(query, lang);
}

/** Async — build search index */
export async function buildSearchIndex() {
  const m = await _load();
  return m.buildSearchIndex();
}

/**
 * Sync fallback: resolves the slug list from the import.meta.glob keys
 * without loading the full docs.js module. Used during initial render
 * when docs.js hasn't loaded yet.
 */
export function getArticleSlugsSync() {
  // Directly scan the glob keys (same logic as docs.js getArticleSlugs)
  // This is a tiny function that doesn't pull in docs.js
  try {
    const slugs = new Set();
    const SKIP = ["rwr-images", "images", "rwr-guide-images"];
    const docsModules = import.meta.glob("../docs/articles/*.{md,mdx}", { query: "?raw", import: "default", eager: false });
    for (const key of Object.keys(docsModules)) {
      const base = key.replace("../docs/articles/", "");
      const dot = base.lastIndexOf(".");
      const stem = base.slice(0, dot);
      const parts = stem.split(".");
      if (parts.length < 2) continue;
      parts.pop();
      const slug = parts.join(".");
      if (SKIP.includes(slug)) continue;
      slugs.add(slug);
    }
    return [...slugs].sort();
  } catch {
    return [];
  }
}
