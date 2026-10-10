// React Router v7 BrowserRouter compatibility layer
// Replaces the legacy custom hash router with History API routing.
// Exports the same API surface so consumers need minimal changes.

import { useLocation } from "react-router-dom";
import { withPackage } from "./dataSource.js";

/* The URL is the shareable artifact, so it has to name the game package:
 * `/params/map_config/map13` is ambiguous between vanilla's map13 and
 * classic's. Navigation here is a mix of React Router's `navigate()` and
 * hand-rolled `history.pushState`, and neither carries a query string across,
 * so stamp the package onto every URL the router writes — including URLs from
 * call sites added later. `replaceState` matters as much as `pushState`:
 * React Router uses it for redirects, which is exactly how the package switch
 * was losing the parameter. */
function stamp(url) {
  return url == null ? url : withPackage(url);
}

const _pushState = window.history.pushState.bind(window.history);
const _replaceState = window.history.replaceState.bind(window.history);
window.history.pushState = (state, title, url) => _pushState(state, title, stamp(url));
window.history.replaceState = (state, title, url) => _replaceState(state, title, stamp(url));

/**
 * Parse current URL pathname into segments.
 * (Legacy API — kept for compatibility; prefer useHashRoute / useRouteParams.)
 */
export function parseHashPath() {
  const path = window.location.pathname;
  const segments = path.split("/").filter((s) => s.length > 0);
  return {
    path: "/" + segments.join("/"),
    segments,
    type: segments[0] || "",
    itemId: segments[1] || null,
  };
}

/**
 * React hook — reactive route state from BrowserRouter.
 */
export function useHashRoute() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter((s) => s.length > 0);
  return {
    path: location.pathname,
    segments,
    type: segments[0] || "",
    itemId: segments[1] || null,
  };
}

/**
 * Navigate to a new path using History API.
 * Works both inside React (via hook) and outside (via pushState).
 *
 * For use outside React components, falls back to pushState.
 * Inside components, prefer calling useNavigate() directly.
 */
export function navigateTo(path) {
  if (!path.startsWith("/")) path = "/" + path;
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * React hook — resolves route params against data.
 * Returns typeExists, itemExists, item alongside standard route info.
 */
export function useRouteParams(data) {
  const route = useHashRoute();
  const { type, itemId } = route;

  const hasOwn = Object.prototype.hasOwnProperty;
  const typeExists = data && hasOwn.call(data, type);
  const itemExists =
    typeExists && itemId && hasOwn.call(data[type], itemId);

  return {
    ...route,
    typeExists,
    itemExists,
    item: itemExists ? data[type][itemId] : null,
  };
}
