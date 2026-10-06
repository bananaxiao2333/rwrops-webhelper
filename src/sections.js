/**
 * Site sections that are parked.
 *
 * Nothing is deleted when a section goes in here: every route, component and
 * article stays in the tree. Emptying this list brings the navigation, the
 * home-page sections, the route guard and the sitemap back in one go.
 *
 * Plain JS with no JSX so the build scripts can import the same list the app
 * uses — a second copy in `scripts/generate-sitemap.js` would drift and start
 * advertising pages that redirect.
 */
export const DISABLED_SECTIONS = ["docs", "tools"];

export const sectionEnabled = (id) => !DISABLED_SECTIONS.includes(id);
