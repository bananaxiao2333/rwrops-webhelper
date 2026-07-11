/* ── Article Registry (lazy loading) ──
 * File naming: docs/articles/{slug}.{lang}.mdx or .md
 * .mdx files use `import { images } from './rwr-images.mdx';`
 *   → import line stripped, {images.img_xxx} replaced with base64
 * .md files rendered as plain raw markdown
 *
 * Slugs and metadata are derived dynamically from the filesystem —
 * no hardcoded registry needed. Add a file and it appears.
 */

// Lazy-loaded article bodies (both .mdx and .md)
const docsModules = import.meta.glob("../docs/articles/*.{md,mdx}", {
  query: "?raw",
  import: "default",
  eager: false,
});

// Lazy-loaded shared image maps (only fetched when resolving .mdx images)
const imagesModule = import.meta.glob("../docs/articles/rwr-images.mdx", {
  query: "?raw",
  import: "default",
  eager: false,
});
const imagesCnModule = import.meta.glob("../docs/articles/images.cn.mdx", {
  query: "?raw",
  import: "default",
  eager: false,
});
const rwrGuideImagesModule = import.meta.glob("../docs/articles/rwr-guide-images.cn.mdx", {
  query: "?raw",
  import: "default",
  eager: false,
});

/* ── Parse export const images = { ... } from raw text ── */
function parseImagesMap(raw) {
  const map = {};
  const re = /\b(img_\w+)\s*:\s*"(data:[^"]+)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

// Singleton cache for merged image map
let _imagesMapPromise = null;
function getImagesMap() {
  if (!_imagesMapPromise) {
    _imagesMapPromise = (async () => {
      const map = {};

      // Load rwr-images.mdx (legacy, for rwr-guide)
      const key1 = "../docs/articles/rwr-images.mdx";
      const loader1 = imagesModule[key1];
      if (loader1) {
        const raw = await loader1();
        Object.assign(map, parseImagesMap(raw));
      }

      // Load images.cn.mdx (new shared images)
      const key2 = "../docs/articles/images.cn.mdx";
      const loader2 = imagesCnModule[key2];
      if (loader2) {
        const raw = await loader2();
        Object.assign(map, parseImagesMap(raw));
      }

      // Load rwr-guide-images.cn.mdx
      const key3 = "../docs/articles/rwr-guide-images.cn.mdx";
      const loader3 = rwrGuideImagesModule[key3];
      if (loader3) {
        const raw = await loader3();
        Object.assign(map, parseImagesMap(raw));
      }

      return map;
    })();
  }
  return _imagesMapPromise;
}

/* ── Strip YAML frontmatter + BOM + normalize line endings ── */
function stripFrontmatter(raw) {
  // Remove BOM, normalize CRLF→LF
  let clean = raw.replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const match = clean.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: clean };
  const [, yaml, body] = match;
  const meta = {};
  for (const line of yaml.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)/);
    if (kv) meta[kv[1]] = kv[2].replace(/^['"]|['"]$/g, "").trim();
  }
  return { meta, body };
}

/* ── Resolve .mdx image references ── */
function stripImportLine(raw) {
  return raw.replace(/^import\s+.*?;\s*\n?/m, "");
}

function resolveImageRefs(body, imagesMap) {
  return body.replace(/\{images\.(\w+)\}/g, (match, name) => {
    return imagesMap[name] || match;
  });
}

/* ── Normalize game language codes to ISO ── */
const LANG_MAP = { kr: "ko" };
function normLang(raw) { return LANG_MAP[raw] || raw; }

/* ══════════════════════════════════════════════════
 * Dynamic slug + metadata derivation from filesystem
 * ══════════════════════════════════════════════════ */

/**
 * Parse a glob key like "../docs/articles/rwr-guide.cn.mdx"
 * into { slug, lang, ext, key }.
 * Returns null for files without a language code suffix (e.g. rwr-images.mdx).
 */
function parseGlobKey(key) {
  const base = key.replace("../docs/articles/", "");
  const dot = base.lastIndexOf(".");
  const ext = base.slice(dot);           // .md or .mdx
  const stem = base.slice(0, dot);       // e.g. "rwr-guide.zh"
  const parts = stem.split(".");
  if (parts.length < 2) return null;     // no lang code → not an article
  const lang = parts.pop();
  const slug = parts.join(".");
  return { slug, lang, ext, key };
}

/** Return all parsed glob entries (excluding non-article files like rwr-images). */
function getGlobEntries() {
  const entries = [];
  for (const key of Object.keys(docsModules)) {
    const p = parseGlobKey(key);
    if (p && p.slug !== "rwr-images" && p.slug !== "images" && p.slug !== "rwr-guide-images") entries.push(p);
  }
  return entries;
}

/* ── Get all article slugs (sync, derived from filesystem glob) ── */
export function getArticleSlugs() {
  const slugs = new Set();
  for (const entry of getGlobEntries()) {
    slugs.add(entry.slug);
  }
  return [...slugs].sort();
}

/* ══════════════════════════════════════════════════
 * Async metadata cache (built from YAML frontmatter)
 * ══════════════════════════════════════════════════ */

const _metaCache = {};    // { slug: { lang: { title, description } } }
let _metaPromise = null;

/**
 * Ensure all article frontmatter metadata is loaded.
 * After this resolves, _metaCache is fully populated.
 */
async function ensureMetaLoaded() {
  if (_metaPromise) return _metaPromise;

  _metaPromise = (async () => {
    const entries = getGlobEntries();

    for (const entry of entries) {
      if (!_metaCache[entry.slug]) _metaCache[entry.slug] = {};
      try {
        const raw = await docsModules[entry.key]();
        // MDX files have `import { images } from '...';` before frontmatter —
        // strip it so stripFrontmatter can find the YAML.
        let content = raw;
        if (entry.ext === ".mdx" || entry.ext === ".md") {
          content = raw.replace(/^import\s+.*?;\s*\n*/m, "");
        }
        // Trim leading whitespace so ^--- in stripFrontmatter matches
        content = content.replace(/^[\s\ufeff]+/, "");
        const { meta } = stripFrontmatter(content);
        _metaCache[entry.slug][entry.lang] = {
          title: meta.title || entry.slug,
          description: meta.description || "",
        };
      } catch (e) {
        // If a file fails to load, skip it silently
        console.warn(`Failed to load metadata for ${entry.slug}.${entry.lang}`, e);
      }
    }

    // Fill 'en' fallback for slugs that have no English variant
    for (const langs of Object.values(_metaCache)) {
      if (!langs.en) {
        const first = Object.values(langs)[0];
        if (first) langs.en = first;
      }
    }
  })();

  return _metaPromise;
}

/**
 * Batch-load all article metadata for a given language.
 * Returns { [slug]: { title, description } }.
 */
export async function getAllArticleMetas(lang = "en") {
  await ensureMetaLoaded();
  const code = normLang(lang);
  const result = {};
  for (const [slug, langs] of Object.entries(_metaCache)) {
    result[slug] = langs[code] || langs.en || { title: slug, description: "" };
  }
  return result;
}

/**
 * Get article metadata synchronously from cache.
 *
 * NOTE: If metadata hasn't been loaded yet (first render cycle),
 * returns { title: slug, description: "" } as a fallback.
 * Components that need accurate titles should use getAllArticleMetas() async.
 */
export function getArticleMeta(slug, lang = "en") {
  const code = normLang(lang);
  const entry = _metaCache[slug];
  if (!entry) return { title: slug, description: "" };
  return entry[code] || entry.en || { title: slug, description: "" };
}

/* ══════════════════════════════════════════════════
 * Content loading (unchanged)
 * ══════════════════════════════════════════════════ */

/* ── Find the best matching loader for a slug+lang ── */
function resolveLoader(slug, code) {
  const candidates = [
    { path: `../docs/articles/${slug}.${code}.mdx`, lang: code },
    { path: `../docs/articles/${slug}.${code}.md`,  lang: code },
    { path: `../docs/articles/${slug}.en.mdx`,       lang: "en" },
    { path: `../docs/articles/${slug}.en.md`,        lang: "en" },
  ];
  for (const c of candidates) {
    if (docsModules[c.path]) return { loader: docsModules[c.path], isMdx: c.path.endsWith(".mdx"), resolvedLang: c.lang };
  }
  // Last resort: scan all keys
  for (const [key, ldr] of Object.entries(docsModules)) {
    const base = key.replace("../docs/articles/", "");
    const dot = base.lastIndexOf(".");
    const ext = base.slice(dot);
    const stem = base.slice(0, dot);
    const parts = stem.split(".");
    const l = parts.pop();
    const s = parts.join(".");
    if (s === slug && l) return { loader: ldr, isMdx: ext === ".mdx", resolvedLang: l };
  }
  return null;
}

/* ══════════════════════════════════════════════════
 *  Search exports — delegates to docSearch.js
 *  ══════════════════════════════════════════════════ */

// Re‑export search; index is built lazily on first call
export { searchArticles, buildSearchIndex, getIndexStats } from "./docSearch.js";

/* ══════════════════════════════════════════════════
 *  Content loading
 *  ══════════════════════════════════════════════════ */

export async function getArticle(slug, lang = "en") {
  const code = normLang(lang);
  const resolved = resolveLoader(slug, code);
  if (!resolved) return null;

  const raw = await resolved.loader();
  const { meta, body } = stripFrontmatter(raw);
  const metaInfo = getArticleMeta(slug, lang);

  let finalBody = body;
  if (resolved.isMdx) {
    finalBody = stripImportLine(body);
    const imagesMap = await getImagesMap();
    finalBody = resolveImageRefs(finalBody, imagesMap);
  }

  return { slug, meta: { ...metaInfo, ...meta }, body: finalBody, resolvedLang: resolved.resolvedLang };
}

/* ── Kick off metadata loading immediately (fire-and-forget) ──
 * This ensures the cache starts populating as soon as the module loads.
 * Components that need titles can wait via getAllArticleMetas(). */
ensureMetaLoaded();
