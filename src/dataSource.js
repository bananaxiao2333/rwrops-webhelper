/**
 * Centralized data source resolver.
 * Shared by DataContext and assetLoader to keep env-reading in one place.
 */

let _cached = null;

export function getDataSource() {
  if (_cached) return _cached;
  const base = import.meta.env.VITE_DATA_SOURCE || "/data";
  const isRemote = /^https?:\/\//i.test(base);
  _cached = {
    base,
    isRemote: isRemote,
    dataUrl: `${base}/result.json`,
    metadataUrl: `${base}/metadata.yaml`,
    assetsUrl: `${base}/assets`,
  };
  return _cached;
}

/**
 * Fetch a resource from the data source.
 * `rel` is relative to the base directory (e.g. "assets/_index.json").
 */
export async function fetchFromSource(rel) {
  const { base } = getDataSource();
  const url = `${base}/${rel}`;
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
