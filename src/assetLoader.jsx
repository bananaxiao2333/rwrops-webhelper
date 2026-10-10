import { useState, useEffect } from "react";
import { getDataSource, subscribe } from "./dataSource.js";

/* ── Lazy-load asset index from data source ──
 * The index maps a package-relative path to a name in the shared asset pool, so
 * it is per package and has to be thrown away when the package changes. */
let _index = null;
let _indexPromise = null;
let _reverseMap = null; // basename → flat filename (fast direct lookup)
let _reverseFlat = null; // flattened path → package-relative path

subscribe(() => { _index = null; _indexPromise = null; _reverseMap = null; _reverseFlat = null; });

async function loadIndex() {
  if (_indexPromise) return _indexPromise;
  _indexPromise = (async () => {
    try {
      const resp = await fetch(getDataSource().indexUrl);
      if (!resp.ok) throw new Error(`asset index [${resp.status}]`);
      _index = await resp.json();
      // Build reverse lookup: basename → flat filename
      _reverseMap = {};
      _reverseFlat = {};
      for (const [origPath, flatName] of Object.entries(_index)) {
        const norm = origPath.replace(/\\/g, "/");
        const basename = norm.split("/").pop();
        if (basename && !_reverseMap[basename]) {
          _reverseMap[basename] = flatName;
        }
        // The extractor used to hand out derived fields pre-flattened
        // (`maps_map13_mask1.png` rather than `maps/map13/mask1.png`). Those
        // values still arrive whenever the referenced file is absent, so index
        // the flattened form too and map it back to the real path.
        const flat = norm.replace(/\//g, "_");
        if (flat && !_reverseFlat[flat]) _reverseFlat[flat] = norm;
      }
    } catch {
      // No index available — assets will resolve via direct URL guess
      _index = {};
      _reverseMap = {};
      _reverseFlat = {};
    }
  })();
  return _indexPromise;
}

/* ── Resolve asset URL by filename ── */
function assetUrl(flatName) {
  const { assetsUrl } = getDataSource();
  return `${assetsUrl}/${flatName}`;
}

/* ── Find flat filename for a given original filename ──
 * Returns null when the pool genuinely has nothing for this name. Callers that
 * need to tell "still loading" from "not in the pool" should use
 * `useAssetState`; `resolveFlat` keeps the old string-in/string-out shape for
 * the places that only want a URL. */
function lookupFlat(filename) {
  if (!filename) return null;

  // 1. Direct basename match in reverse map
  if (_reverseMap && _reverseMap[filename]) return _reverseMap[filename];

  // 2. Search index: original path ends with filename
  if (_index) {
    for (const [origPath, flatName] of Object.entries(_index)) {
      const norm = origPath.replace(/\\/g, "/");
      if (norm.endsWith("/" + filename) || norm === filename) {
        return flatName;
      }
    }
  }

  // 3. Flattened form of a real path (`maps_map13_mask1.png` → mask1)
  if (_reverseFlat && _reverseFlat[filename]) {
    const orig = _reverseFlat[filename];
    if (_index[orig]) return _index[orig];
  }

  // 4. Bare name (no extension)
  const bare = filename.replace(/\.\w+$/, "");
  if (bare !== filename && _reverseMap && _reverseMap[bare]) return _reverseMap[bare];

  return null;
}

/* ── Hook: load any asset by filename ──
 * `missing` is true only for a name that was *declared* but is not in the pool;
 * a null/empty name is simply "nothing to show". */
const IDLE = { url: null, missing: false };

export function useAssetState(filename) {
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    if (!filename) return;
    let cancelled = false;

    loadIndex().then(() => {
      if (cancelled) return;
      const flat = lookupFlat(filename);
      setState({
        key: filename,
        url: flat ? assetUrl(flat) : null,
        missing: !flat,
      });
    });

    return () => { cancelled = true; };
  }, [filename]);

  // Until the effect catches up with a new filename, report "loading" rather
  // than handing back the previous asset's URL.
  if (!filename) return IDLE;
  return state.key === filename ? state : IDLE;
}

/* ── Hook: load any asset by filename (URL only) ── */
export function useAsset(filename) {
  return useAssetState(filename).url;
}

/* ── Hook: is the asset index loaded? ──
 * `hasAsset` answers synchronously but is only meaningful once the index has
 * arrived, so anything that needs a synchronous icon check (the list sorts
 * icon-less records to the bottom) re-renders when this flips. */
export function useAssetIndexReady() {
  const [, setTick] = useState(0);   // forces a re-render when the index lands
  useEffect(() => {
    let cancelled = false;
    const bump = () => { if (!cancelled) setTick((n) => n + 1); };
    const unsubscribe = subscribe(bump);
    loadIndex().then(bump);
    return () => { cancelled = true; unsubscribe(); };
  }, []);
  return !!_index;
}

/* ── The icon field a record declares, if any ──
 * Exported so callers that need a synchronous check (list sorting) use the
 * same precedence the icon component does. */
export function iconFieldFor(item) {
  return (
    item?.hud_icon_filename ||
    item?.hud_icon?.filename ||
    item?.icon?.filename ||
    item?.icon_file ||
    null
  );
}

/* ── Hook: resolve first available icon from multiple sources ── */
export function useItemIcon(item) {
  return useAsset(iconFieldFor(item));
}

/* ── Check if an asset exists ── */
export function hasAsset(filename) {
  if (!_index) return false;
  // `resolveFlat` falls back to the raw name, so it is never falsy for a
  // non-empty input — asking it "does this exist" always said yes.
  return !!lookupFlat(filename);
}

/* ── Reverse lookup: flat filename → original path(s) ── */
function getFlatToOrig() {
  const map = {};
  if (!_index) return map;
  for (const [orig, flat] of Object.entries(_index)) {
    if (!map[flat]) map[flat] = [];
    map[flat].push(orig);
  }
  return map;
}

/* ── Get display value: if it's an indexed asset, show original path ── */
export function displayPath(value) {
  if (typeof value !== "string") return value;
  const flatToOrig = getFlatToOrig();
  const origins = flatToOrig[value];
  if (origins && origins.length > 0) return origins[0].replace(/\\/g, "/");
  if (_index) {
    for (const [orig] of Object.entries(_index)) {
      if (orig.endsWith(value) || orig.replace(/\\/g, "/").endsWith(value)) {
        return orig.replace(/\\/g, "/");
      }
    }
  }
  return value;
}
