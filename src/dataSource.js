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
