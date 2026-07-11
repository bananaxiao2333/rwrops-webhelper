import { useState, useEffect } from "react";

/* ── Load index mapping: original_path → flat_filename ── */
import assetIndex from "../data/assets/_index.json";

/* ── Scan ALL PNGs and SVGs under assets/ (any depth) ── */
const pngModules = import.meta.glob("../data/assets/**/*.png", {
  query: { format: "url" },
  import: "default",
  eager: false,
});
const svgModules = import.meta.glob("../data/assets/**/*.svg", {
  query: { format: "url" },
  import: "default",
  eager: false,
});
const assetModules = { ...pngModules, ...svgModules };

/* ── Build reverse lookup: basename → module loader ── */
const reverseMap = {};
for (const path of Object.keys(assetModules)) {
  const name = path.split("/").pop();
  if (!reverseMap[name]) reverseMap[name] = assetModules[path];
}

/* ── Resolve asset by filename or path ── */
function resolveAsset(filename) {
  if (!filename) return null;
  // Try direct match by name first
  if (reverseMap[filename]) return reverseMap[filename];
  // Look up in index: original path → flat filename
  for (const [origPath, flatName] of Object.entries(assetIndex)) {
    const norm = origPath.replace(/\\/g, "/");
    if (norm.endsWith("/" + filename) || norm === filename) {
      if (reverseMap[flatName]) return reverseMap[flatName];
    }
  }
  // Try without extension
  const bare = filename.replace(/\.\w+$/, "");
  if (reverseMap[bare]) return reverseMap[bare];
  return null;
}

/* ── Hook: load any asset by filename (original name or flat name) ── */
export function useAsset(filename) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!filename) return;
    let cancelled = false;
    const loader = resolveAsset(filename);
    if (loader) {
      loader().then((u) => { if (!cancelled) setUrl(u); });
    }
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

/* ── Synchronous check if an asset exists ── */
export function hasAsset(filename) {
  return !!resolveAsset(filename);
}

/* ── Reverse lookup: flat filename → original path(s) ── */
const flatToOrig = {};
for (const [orig, flat] of Object.entries(assetIndex)) {
  if (!flatToOrig[flat]) flatToOrig[flat] = [];
  flatToOrig[flat].push(orig);
}

/* ── Get display value: if it's an indexed asset, show original path ── */
export function displayPath(value) {
  if (typeof value !== "string") return value;
  const origins = flatToOrig[value];
  if (origins && origins.length > 0) return origins[0].replace(/\\/g, "/");
  // Also check if value matches the end of any original path
  for (const [orig, flat] of Object.entries(assetIndex)) {
    if (orig.endsWith(value) || orig.replace(/\\/g, "/").endsWith(value)) {
      return orig.replace(/\\/g, "/");
    }
  }
  return value;
}
