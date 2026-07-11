/* ───────────────────────────────────────────────────
 *  SEO.jsx — Helmet-powered meta tag helper
 *  · Sets <title>, <meta>, OG, Twitter Card tags
 *  · Multi-language aware via canonical + hreflang
 * ─────────────────────────────────────────────────── */
import { Helmet } from "react-helmet-async";

const SITE_NAME = "RWROPS";
const SITE_URL = typeof window !== "undefined" ? window.location.origin : "";
const DEFAULT_DESC =
  "Tactical data terminal for Running with Rifles — browse weapons, vehicles, factions, maps, and community guides.";

/**
 * SEO component — drop anywhere in the tree.
 *
 * @param {{ title, description, ogImage, canonicalPath, lang, langAlt, articleMeta }} props
 *   - title: page title (appended with " — RWROPS")
 *   - description: meta description (160 chars max)
 *   - ogImage: absolute URL for OG image (defaults to /icon.svg)
 *   - canonicalPath: e.g. "/docs/newbie-guide" (without origin)
 *   - lang: current page language (e.g. "en", "cn")
 *   - langAlt: [{ lang, url }] for hreflang alternates
 *   - articleMeta: { publishedTime, modifiedTime, section } for Article schema
 */
export default function SEO({
  title,
  description,
  ogImage,
  canonicalPath,
  lang = "en",
  langAlt = [],
  articleMeta,
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Tactical Data Terminal`;
  const desc = description || DEFAULT_DESC;
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : SITE_URL;
  const ogImg = ogImage || `${SITE_URL}/icon.svg`;

  return (
    <Helmet>
      {/* Basic */}
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />

      {/* Language alternates */}
      <html lang={lang === "cn" ? "zh-Hans" : lang} />
      {langAlt.map((alt) => (
        <link
          key={alt.lang}
          rel="alternate"
          hrefLang={alt.lang === "cn" ? "zh-Hans" : alt.lang}
          href={alt.url.startsWith("http") ? alt.url : `${SITE_URL}${alt.url}`}
        />
      ))}

      {/* Open Graph */}
      <meta property="og:type" content={articleMeta ? "article" : "website"} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={ogImg} />
      <meta property="og:url" content={canonical} />
      <meta property="og:site_name" content={SITE_NAME} />
      {lang && <meta property="og:locale" content={lang === "cn" ? "zh_CN" : `${lang}_${lang.toUpperCase()}`} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImg} />

      {/* Article meta (optional) */}
      {articleMeta?.publishedTime && (
        <meta property="article:published_time" content={articleMeta.publishedTime} />
      )}
      {articleMeta?.modifiedTime && (
        <meta property="article:modified_time" content={articleMeta.modifiedTime} />
      )}
      {articleMeta?.section && (
        <meta property="article:section" content={articleMeta.section} />
      )}
    </Helmet>
  );
}

/**
 * JSON-LD structured data for articles.
 */
export function ArticleStructuredData({ title, description, slug, lang, datePublished, dateModified, image }) {
  const url = `${SITE_URL}/docs/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description || "",
    url,
    inLanguage: lang === "cn" ? "zh-Hans" : lang,
    datePublished: datePublished || undefined,
    dateModified: dateModified || undefined,
    image: image || `${SITE_URL}/icon.svg`,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
}
