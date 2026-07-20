import { useState, useEffect } from "react";
import { useT } from "./i18n.jsx";
import { useData } from "./DataContext.jsx";
import { ArticleList } from "./DocsPage.jsx";
import { TOOLS } from "./tools/ToolsListPage.jsx";

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
          background: `linear-gradient(180deg, ${meta.color}, ${meta.color}88)`,
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
      <span>{totalEntities} {t("entities")}</span>
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
export function HomePage({ allKeywords = [], data }) {
  const isMobile = useIsMobile();
  const t = useT();
  const { metadata } = useData();
  const totalCount = allKeywords.length;
  const categories = data ? Object.keys(data).map(type => ({
    type,
    count: Object.keys(data[type]).length,
  })) : [];

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

        {/* Category grid */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 10,
          animation: "fade-in 0.5s var(--ease-smooth) 0.15s both",
        }}>
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

        {/* Bottom sections: Docs + Tools */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 20 : 40,
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: isMobile ? 20 : 24,
          animation: "fade-in 0.5s var(--ease-smooth) 0.3s both",
        }}>
          {/* Articles */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontSize: "var(--font-base)",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 12,
              fontFamily: "var(--font-body)",
            }}>
              {t("nav_docs")}
            </h2>
            <ArticleList isMobile={isMobile} />
          </div>

          {/* Tools */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontSize: "var(--font-base)",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 12,
              fontFamily: "var(--font-body)",
            }}>
              {t("nav_tools")}
            </h2>
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
        </div>

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
