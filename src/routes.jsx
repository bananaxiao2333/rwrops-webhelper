import { useState, useEffect } from "react";
import { useT } from "./i18n.jsx";
import { useData } from "./DataContext.jsx";
import { ArticleList } from "./DocsPage.jsx";
import { TOOLS } from "./tools/ToolsListPage.jsx";
import { sectionEnabled } from "./sections.js";

/* ── mobile detection hook ── */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

/* ── CategoryCard — reusable card tile ── */
function CategoryCard({ cat, meta, index, style, isMobile }) {
  const t = useT();

  return (
    <a
      href={`/params/${cat.type}`}
      onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", `/params/${cat.type}`); window.dispatchEvent(new PopStateEvent("popstate")); }}
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: isMobile ? "14px" : "18px 20px",
        cursor: "pointer",
        transition: "all var(--dur-fast) var(--ease-smooth)",
        textDecoration: "none",
        animation: `fade-in 0.4s var(--ease-smooth) ${0.2 + index * 0.06}s both`,
        minWidth: isMobile ? 140 : 170,
        flex: "1 1 auto",
        background: "var(--bg-surface)",
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, marginBottom: isMobile ? 4 : 8,
      }}>
        <div style={{
          width: isMobile ? 4 : 5, height: isMobile ? 20 : 28,
          background: meta.color,
          flexShrink: 0,
          borderRadius: 3,
        }} />
        <div style={{
          fontSize: isMobile ? "clamp(16px, 3.5vw, 20px)" : "clamp(20px, 2vw, 24px)",
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.01em",
          color: "var(--text-primary)",
        }}>{meta.label}</div>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginLeft: isMobile ? 14 : 15,
      }}>
        <span style={{
          fontSize: "var(--font-xxs)",
          fontWeight: 600,
          color: meta.color,
          fontFamily: "var(--font-mono)",
        }}>
          {meta.num}
        </span>
        <span style={{
          fontSize: "var(--font-xs)",
          color: "var(--text-muted)",
        }}>
          {t("units_indexed", cat.count)}
        </span>
      </div>
    </a>
  );
}

/* ── Metadata Footer ── */
function MetadataFooter({ metadata, isMobile }) {
  const t = useT();
  if (!metadata) return null;

  const ts = metadata.timestamp
    ? new Date(metadata.timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })
    : "—";
  const totalEntities = metadata.entity_counts
    ? Object.values(metadata.entity_counts).reduce((s, v) => s + v, 0)
    : 0;

  return (
    <div style={{
      borderTop: "1px solid var(--border-subtle)",
      padding: isMobile ? "8px 0" : "10px 0",
      display: "flex", flexWrap: "wrap",
      gap: isMobile ? 6 : 12, alignItems: "center",
      fontSize: "var(--font-xs)",
      fontFamily: "var(--font-mono)",
      color: "var(--text-muted)",
      width: "100%",
    }}>
      <span style={{ color: "var(--accent)", fontWeight: 600 }}>{t("metadata_title")}</span>
      <span aria-hidden="true" style={{ color: "var(--border-subtle)" }}>·</span>
      <span>{ts}</span>
      <span aria-hidden="true" style={{ color: "var(--border-subtle)" }}>·</span>
      <span>{totalEntities} {t("records")}</span>
      {metadata.assets && (
        <>
          <span aria-hidden="true" style={{ color: "var(--border-subtle)" }}>·</span>
          <span>{metadata.assets.exported} {t("metadata_assets_exported")}</span>
        </>
      )}
    </div>
  );
}

/* ── HomePage ── */
export function HomePage({ data, onTourOpen }) {
  const isMobile = useIsMobile();
  const t = useT();
  const { metadata } = useData();
  const categories = data ? Object.keys(data).map(type => ({
    type,
    count: Object.keys(data[type]).length,
  })) : [];
  /* Count the index, not the keyword list: a title with no `name` still has a
   * page, and `allKeywords` only holds the ones that do have one. */
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  const sectionHead = {
    fontSize: "var(--font-base)",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 12,
    fontFamily: "var(--font-body)",
  };

  const palette = [
    "#6b8ca4", "#f59e0b", "#8899aa", "#ef4444",
    "#8b5cf6", "#22c55e", "#f97316", "#06b6d4",
    "#ec4899", "#14b8a6", "#eab308", "#a855f7",
  ];
  const categoryMeta = Object.fromEntries(
    categories.map((cat, i) => [
      cat.type,
      { label: t(cat.type), color: palette[i % palette.length], num: String(i + 1).padStart(2, "0") },
    ])
  );

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      minHeight: isMobile ? "100dvh" : "100vh",
      background: "var(--bg-deep)",
      fontFamily: "var(--font-body)",
    }}>
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: isMobile ? "24px 16px" : "40px 56px",
        gap: isMobile ? 24 : 40,
      }}>
        {/* Brand header */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 16 : 48,
          animation: "fade-in 0.5s var(--ease-smooth) both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src="/icon.svg" alt="RWROPS"
              style={{ width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, flexShrink: 0 }}
            />
            <div>
              <h1 style={{
                fontSize: isMobile ? "clamp(24px, 6vw, 36px)" : "clamp(36px, 3.5vw, 48px)",
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                lineHeight: 1.1,
              }}>
                {t("omni")} {t("parser")}
              </h1>
              <p style={{
                fontSize: "var(--font-base)",
                color: "var(--text-muted)",
                marginTop: 4,
                fontFamily: "var(--font-body)",
              }}>
                {t("subtitle")}
              </p>
            </div>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: "var(--font-sm)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}>
            <span>{categories.length} {t("categories")}</span>
            <span style={{ color: "var(--border-subtle)" }}>·</span>
            <span>{totalCount} {t("entities")}</span>
          </div>
        </div>

        {/* A wiki front page says what it is before it lists anything. The
            depth here is easy to miss, so the intro explains what the site is,
            what you can do with it, and how to read a page — in plain words. */}
        <div style={{
          maxWidth: "80ch",
          display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20,
          animation: "fade-in 0.5s var(--ease-smooth) 0.1s both",
        }}>
          <p style={{ fontSize: "var(--font-base)", lineHeight: 1.75, color: "var(--text-secondary)", margin: 0 }}>
            {t("home_intro")}
          </p>
          <p style={{ fontSize: "var(--font-base)", lineHeight: 1.75, color: "var(--text-secondary)", margin: 0 }}>
            {t("home_intro_2")}
          </p>

          <div>
            <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              {t("home_what_title")}
            </h3>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
              {["home_what_1", "home_what_2", "home_what_3", "home_what_4"].map((k) => (
                <li key={k} style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", lineHeight: 1.7, color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0 }}>—</span>
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ borderLeft: "2px solid var(--border-mid)", paddingLeft: 14 }}>
            <h3 style={{ fontSize: "var(--font-base)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
              {t("home_read_title")}
            </h3>
            <p style={{ fontSize: "var(--font-sm)", lineHeight: 1.75, color: "var(--text-secondary)", margin: 0 }}>
              {t("home_read_body")}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={onTourOpen}
              style={{
                cursor: "pointer", padding: "9px 20px",
                background: "var(--accent)", border: "1px solid var(--accent)",
                color: "var(--bg-deep)", fontFamily: "var(--font-body)",
                fontSize: "var(--font-sm)", fontWeight: 700, borderRadius: "var(--radius-sm)",
              }}
            >
              {t("home_tour_cta")}
            </button>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>{t("home_tour_hint")}</span>
          </div>
        </div>

        {/* Guides before the data index: a wiki leads with its writing. */}
        {sectionEnabled("docs") && (
          <section style={{ animation: "fade-in 0.5s var(--ease-smooth) 0.15s both" }}>
            <h2 style={sectionHead}>{t("nav_docs")}</h2>
            <ArticleList isMobile={isMobile} />
          </section>
        )}

        {/* Data index */}
        <section data-tour="index" style={{ animation: "fade-in 0.5s var(--ease-smooth) 0.2s both" }}>
          <h2 style={sectionHead}>{t("home_index")}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {categories.map((cat, i) => {
            const meta = categoryMeta[cat.type] || { label: cat.type.toUpperCase(), color: "#556677", num: String(i + 1).padStart(2, "0") };
            return (
              <CategoryCard
                key={cat.type}
                cat={cat}
                meta={meta}
                index={i}
                isMobile={isMobile}
              />
            );
          })}
          </div>
        </section>

        {/* Tools */}
        {sectionEnabled("tools") && (
        <section data-tour="tools" style={{ animation: "fade-in 0.5s var(--ease-smooth) 0.3s both" }}>
          <h2 style={sectionHead}>{t("nav_tools")}</h2>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {TOOLS.map((tool) => (
                <a key={tool.id} href={tool.path}
                  onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", tool.path); window.dispatchEvent(new PopStateEvent("popstate")); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface)",
                    textDecoration: "none",
                    fontSize: "var(--font-sm)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                    transition: "border-color var(--dur-fast) var(--ease-smooth), box-shadow var(--dur-fast) var(--ease-smooth)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                    {t(tool.labelKey)}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "var(--font-xs)", flex: 1 }}>
                    {t(tool.descKey)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Metadata footer */}
        <MetadataFooter metadata={metadata} isMobile={isMobile} />
      </div>
    </div>
  );
}

/* ── Static type icons ── */
// eslint-disable-next-line react-refresh/only-export-components
export const typeIcons = {
  vehicle: "mdi:truck",
  weapon: "mdi:sword",
  carry_item: "mdi:package-variant-closed",
  projectile: "mdi:missile",
};

/* ── Helpers ── */
// eslint-disable-next-line react-refresh/only-export-components
export const extractAllKeywords = (data) => {
  if (!data) return [];
  const keywords = [];
  Object.values(data).forEach((items) => {
    Object.values(items).forEach((entity) => {
      if (entity.name && String(entity.name).trim()) keywords.push(entity.name);
    });
  });
  return keywords;
};

// eslint-disable-next-line react-refresh/only-export-components
export const navConfig = [
  { label: "DASHBOARD", icon: "mdi:home", path: "/" },
];
