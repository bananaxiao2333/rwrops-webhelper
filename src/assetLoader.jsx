import { useState, useEffect } from "react";
import { getDataSource, fetchFromSource } from "./dataSource.js";

/* ── Lazy-load asset index from data source ── */
let _index = null;
let _indexPromise = null;
let _reverseMap = null; // basename → flat filename (fast direct lookup)

async function loadIndex() {
  if (_indexPromise) return _indexPromise;
  _indexPromise = (async () => {
    try {
      const resp = await fetchFromSource("assets/_index.json");
      _index = await resp.json();
      // Build reverse lookup: basename → flat filename
      _reverseMap = {};
      for (const [origPath, flatName] of Object.entries(_index)) {
        const basename = origPath.replace(/\\/g, "/").split("/").pop();
        if (basename && !_reverseMap[basename]) {
          _reverseMap[basename] = flatName;
        }
      }
    } catch {
      // No index available — assets will resolve via direct URL guess
      _index = {};
      _reverseMap = {};
    }
  })();
  return _indexPromise;
}

/* ── Resolve asset URL by filename ── */
function assetUrl(flatName) {
  const { assetsUrl } = getDataSource();
  return `${assetsUrl}/${flatName}`;
}

/* ── Find flat filename for a given original filename ── */
function resolveFlat(filename) {
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

  // 3. Bare name (no extension)
  const bare = filename.replace(/\.\w+$/, "");
  if (bare !== filename && _reverseMap && _reverseMap[bare]) return _reverseMap[bare];

  // 4. Fallback: use filename directly
  return filename;
}

/* ── Hook: load any asset by filename ── */
export function useAsset(filename) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!filename) return;
    let cancelled = false;

    loadIndex().then(() => {
      if (cancelled) return;
      const flat = resolveFlat(filename);
      if (flat) setUrl(assetUrl(flat));
    });

    return () => { cancelled = true; };
  }, [filename]);

  return url;
}

/* ── Hook: resolve first available icon from multiple sources ── */
export function useItemIcon(item) {
  const file =
    item?.hud_icon_filename ||
    item?.hud_icon?.filename ||
    item?.icon?.filename ||
    item?.icon_file ||
    null;
  return useAsset(file);
}

/* ── Check if an asset exists ── */
export function hasAsset(filename) {
  if (!_index) return false;
  return !!resolveFlat(filename);
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
    for (const [orig, flat] of Object.entries(_index)) {
      if (orig.endsWith(value) || orig.replace(/\\/g, "/").endsWith(value)) {
        return orig.replace(/\\/g, "/");
      }
    }
  }
  return value;
}
