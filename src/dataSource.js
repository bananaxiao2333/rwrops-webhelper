/**
 * Centralized data source resolver.
 *
 * The deployed data site now serves one dataset per game package:
 *
 *   /packages.json                 index of selectable packages
 *   /packages/<id>/result.json     that package's records
 *   /packages/<id>/metadata.yaml   build stats for that package
 *   /packages/<id>/assets.json     package-relative path -> file in the pool
 *   /assets/<name>                 ONE content-addressed pool shared by all
 *
 * The shared pool is why `assetsUrl` is resolved from the site root rather than
 * from the package directory: a texture reachable through both `vanilla` and
 * `classic`'s layer stack is stored once, under one name.
 *
 * A data source without `packages.json` is the pre-multi-package layout
 * (`/result.json`, `/assets/_index.json`). We fall back to it instead of
 * failing, so the frontend can ship before the data does and either side can be
 * rolled back on its own (AGENTS.md §5.5).
 */

const DEFAULT_PACKAGE = "vanilla";
const PACKAGE_KEY = "rwrops_package";

function baseUrl() {
  return import.meta.env.VITE_DATA_SOURCE || "/data";
}

function sourceFor(packageId) {
  const base = baseUrl();
  const isRemote = /^https?:\/\//i.test(base);

  if (packageId) {
    return {
      base,
      isRemote,
      packageId,
      multi: true,
      dataUrl: `${base}/packages/${packageId}/result.json`,
      metadataUrl: `${base}/packages/${packageId}/metadata.yaml`,
      indexUrl: `${base}/packages/${packageId}/assets.json`,
      assetsUrl: `${base}/assets`,
    };
  }

  // Pre-multi-package layout: one dataset at the root.
  return {
    base,
    isRemote,
    packageId: null,
    multi: false,
    dataUrl: `${base}/result.json`,
    metadataUrl: `${base}/metadata.yaml`,
    indexUrl: `${base}/assets/_index.json`,
    assetsUrl: `${base}/assets`,
  };
}

/* ── Active source ─────────────────────────────────────────────────────── */

let _activeId = null;
let _cached = null;

export function getDataSource() {
  // Built lazily: this module is also imported by plain-Node tests, where
  // `import.meta.env` does not exist.
  if (!_cached) _cached = sourceFor(_activeId);
  return _cached;
}

export function getActivePackage() {
  return _activeId;
}

/* Subscribers are told when the active package changes so the asset index cache
 * can be dropped; without that, icons keep resolving against the previous
 * package's map. */
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setActivePackage(packageId) {
  const id = packageId || null;
  if (id === _activeId) return;
  _activeId = id;
  _cached = sourceFor(id);
  for (const fn of listeners) fn(_cached);
}

/**
 * Fetch the package index. Resolves to null when the source is the legacy
 * single-dataset layout, which is a normal state rather than an error.
 */
export async function fetchPackages() {
  const url = `${baseUrl()}/packages.json`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status !== 404) throw new Error(`Package index failed [${resp.status}]: ${url}`);
      console.warn("[rwrops] no packages.json — falling back to the single-dataset layout");
      return null;
    }
    const payload = await resp.json();
    const list = Array.isArray(payload?.packages) ? payload.packages : [];
    return list.length ? list : null;
  } catch (err) {
    console.warn("[rwrops] package index unavailable:", err.message);
    return null;
  }
}

/** Package chosen last visit, if it is still served. */
export function storedPackage(packages) {
  const saved = localStorage.getItem(PACKAGE_KEY);
  if (saved && packages.some((p) => p.id === saved)) return saved;
  if (packages.some((p) => p.id === DEFAULT_PACKAGE)) return DEFAULT_PACKAGE;
  return packages[0]?.id ?? null;
}

export function rememberPackage(id) {
  if (id) localStorage.setItem(PACKAGE_KEY, id);
}

/* ── The package belongs in the URL ──────────────────────────────────────────
 * It is part of the identity of every page: vanilla's `map13` and classic's
 * `map13` are different datasets. Keeping it only in localStorage meant a
 * copied link could not say which package it pointed at, so it rides in the
 * query string (`?pkg=classic`) and the router re-stamps it on every
 * navigation. */
export const PACKAGE_PARAM = "pkg";

/** Package id from the current URL, or null. */
export function packageFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get(PACKAGE_PARAM);
  } catch {
    return null;
  }
}

/** `path` with the active package stamped on. Used by the router. */
export function withPackage(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  const id = getActivePackage();
  if (!id) return path;
  const [base, hash = ""] = String(path).split("#");
  const [pathname, search = ""] = base.split("?");
  const params = new URLSearchParams(search);
  params.set(PACKAGE_PARAM, id);
  return `${pathname}?${params.toString()}${hash ? "#" + hash : ""}`;
}

/* ── Fetch a resource relative to the active source ────────────────────── */

export async function fetchFromSource(rel) {
  const url = `${getDataSource().base}/${rel}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Fetch failed [${resp.status}]: ${url}`);
  return resp;
}

/* ── result.json is a flat record list; the app wants {type: {key: entity}} ──
 * Contract: rwrops/output_schema.md §顶层结构. A flat list is the only lossless
 * shape -- 295 of 2063 records share a (type, key) with another record, so a
 * plain nested dictionary silently drops them.
 */
export const SCHEMA_VERSION = 2;

export function indexRecords(payload) {
  if (payload?.schema === SCHEMA_VERSION) {
    const out = {};
    for (const r of payload.records) {
      const t = r.type ?? "unknown";
      const id = r.key ?? r._id;
      const bucket = (out[t] ??= {});
      const prev = bucket[id];
      if (!prev) {
        bucket[id] = { ...r, _variants: [r] };
        continue;
      }
      // The same (type, key) can be defined in several files and those files
      // are often complementary, not duplicates: `language.cn` is metadata in
      // languages/cn/language.xml and 911 translation strings in
      // languages/cn/misc_text_vanilla.xml. Keeping only one of them silently
      // dropped 167 records and left the game-data translation stage with
      // nothing to read. Merge the definitions, keep them all for the page.
      const variants = [...prev._variants, r];
      bucket[id] = combine(variants);
    }
    return out;
  }
  // Transition shim: the previously deployed result.json had no envelope at
  // all. Lets the frontend ship before the data does, and lets either one be
  // rolled back on its own. Remove once schema 2 has been live a while.
  if (!Array.isArray(payload) && payload && !("schema" in payload)) {
    console.warn("[rwrops] legacy result.json shape (no schema field) — data source is stale");
    return payload;
  }
  throw new Error(
    `Unsupported result.json schema ${payload?.schema} (expected ${SCHEMA_VERSION})`
  );
}

const countFields = (r) => Object.keys(r).filter((k) => !k.startsWith("_")).length;

/* Richest definition first, then every other one fills the gaps it left. */
function combine(variants) {
  const ordered = [...variants].sort((a, b) => countFields(b) - countFields(a));
  const merged = { ...ordered[0] };
  for (const v of ordered.slice(1)) {
    for (const [k, val] of Object.entries(v)) {
      if (k.startsWith("_")) continue;
      const cur = merged[k];
      if (cur === undefined || cur === null) merged[k] = val;
      else if (Array.isArray(cur) && Array.isArray(val) && val.length > cur.length) merged[k] = val;
    }
  }
  merged._variants = variants;
  return merged;
}
