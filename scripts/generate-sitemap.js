#!/usr/bin/env node
/* ───────────────────────────────────────────────────
 *  scripts/generate-sitemap.js
 *  Build-time sitemap + robots.txt generator
 *  Scans docs/articles/*.{md,mdx} for slugs
 *  Run: node scripts/generate-sitemap.js [SITE_URL]
 * ─────────────────────────────────────────────────── */

import { readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = process.argv[2] || "https://rwrops.079682.xyz";
const DOCS_DIR = resolve(__dirname, "..", "docs", "articles");
const OUT_DIR = resolve(__dirname, "..", "dist");

// ── Discover article slugs ──
function getArticleSlugs() {
  const files = readdirSync(DOCS_DIR);
  const slugs = new Set();
  const slugDates = {}; // { slug: '2024-01-15' }
  const SKIP = ["rwr-images", "images", "rwr-guide-images"];

  for (const file of files) {
    const match = file.match(/^(.+)\.(\w{2})\.(md|mdx)$/);
    if (!match) continue;
    const [, slug, lang, ext] = match;
    if (SKIP.includes(slug)) continue;
    slugs.add(slug);
    // Use file mtime as lastmod fallback
    slugDates[slug] = slugDates[slug] || new Date().toISOString().split("T")[0];
  }

  return { slugs: [...slugs].sort(), dates: slugDates };
}

// ── Static routes always available ──
const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/params", priority: "0.8", changefreq: "weekly" },
  { path: "/docs", priority: "0.9", changefreq: "weekly" },
  { path: "/tools", priority: "0.7", changefreq: "monthly" },
];

// ── Category routes (game data) ──
const CATEGORIES = [
  "weapon", "vehicle", "carry_item", "projectile",
  "call", "achievement", "faction", "rank",
  "stance", "map_config", "command", "command_config", "event",
];

function generateSitemap() {
  const { slugs, dates } = getArticleSlugs();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Static routes
  for (const r of STATIC_ROUTES) {
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}${r.path}</loc>\n`;
    xml += `    <changefreq>${r.changefreq}</changefreq>\n`;
    xml += `    <priority>${r.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // Category routes
  for (const cat of CATEGORIES) {
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}/params/${cat}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  }

  // Tools routes
  const TOOLS = [
    { path: "/tools/stall", priority: "0.6", changefreq: "monthly" },
    { path: "/tools/showcase", priority: "0.5", changefreq: "monthly" },
    { path: "/tools/metagen", priority: "0.6", changefreq: "monthly" },
  ];
  for (const t of TOOLS) {
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}${t.path}</loc>\n`;
    xml += `    <changefreq>${t.changefreq}</changefreq>\n`;
    xml += `    <priority>${t.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // Article routes
  for (const slug of slugs) {
    const lastmod = dates[slug] || new Date().toISOString().split("T")[0];
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}/docs/${slug}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += "</urlset>\n";
  return xml;
}

function generateRobots() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
}

// ── Main ──
const sitemap = generateSitemap();
const robots = generateRobots();

writeFileSync(resolve(OUT_DIR, "sitemap.xml"), sitemap, "utf-8");
writeFileSync(resolve(OUT_DIR, "robots.txt"), robots, "utf-8");

console.log(`✅ Generated sitemap.xml (${sitemap.split("\n").length} lines)`);
console.log(`✅ Generated robots.txt`);
console.log(`   Sitemap: ${SITE_URL}/sitemap.xml`);
