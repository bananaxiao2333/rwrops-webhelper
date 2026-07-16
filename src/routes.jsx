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
  const padding = isMobile
    ? "10px 12px"
    : index === 0
      ? "20px 18px"
      : index === 1
        ? "18px 16px"
        : "16px 14px";
  const rotate = isMobile
    ? (index === 0 ? -1 : index === 1 ? 1.5 : index === 2 ? -0.5 : 1)
    : [1, -2, 1.5, -1.5, 1, -1, 0.5][index] || 0;

  return (
    <a
      href={`/params/${cat.type}`}
      onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", `/params/${cat.type}`); window.dispatchEvent(new PopStateEvent("popstate")); }}
      style={{
        border: "1px solid var(--border-mid)",
        padding,
        cursor: "pointer",
        transform: `rotate(${rotate}deg)`,
        transition: "all var(--dur-fast) var(--ease-smooth)",
        textDecoration: "none",
        animation: `scale-in 0.35s var(--ease-smooth) ${0.3 + index * 0.08}s both`,
        minWidth: isMobile ? 140 : 160,
        flex: "1 1 auto",
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "var(--glow-accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-mid)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{
        fontSize: isMobile ? "clamp(8px, 2vw, 10px)" : "clamp(8px, 0.8vw, 10px)",
        letterSpacing: "0.2em", color: meta.color,
        marginBottom: isMobile ? 5 : 10,
      }}>
        {t("category")} {meta.num}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, marginBottom: isMobile ? 3 : 6 }}>
        <div style={{ width: 3, height: isMobile ? 18 : 24, background: meta.color, flexShrink: 0 }} />
        <div style={{
          fontSize: isMobile ? "clamp(14px, 3.5vw, 18px)" : "clamp(18px, 2vw, 22px)",
          fontWeight: 700,
          fontFamily: "var(--font-display)", letterSpacing: "0.06em",
          color: meta.color,
        }}>{meta.label}</div>
      </div>
      <div style={{
        fontSize: isMobile ? "clamp(7px, 1.5vw, 9px)" : "clamp(8px, 0.8vw, 10px)",
        color: "var(--text-muted)",
        marginLeft: isMobile ? 9 : 13,
      }}>
        {t("units_indexed", cat.count)}
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
  const _unused_totalAssets = metadata.assets
    ? metadata.assets.exported + metadata.assets.skipped
    : 0;

  const gap = isMobile ? 6 : 12;
  const fontSize = isMobile ? "clamp(6px, 1.5vw, 8px)" : "clamp(8px, 0.7vw, 10px)";
  const labelColor = "#4a5a6a";
  const valueColor = "var(--text-muted)";
  const sepColor = "var(--border-subtle)";

  return (
    <div style={{
      borderTop: "1px solid var(--border-subtle)",
      padding: isMobile ? "6px 14px" : "8px 56px",
      display: "flex", flexWrap: "wrap",
      gap, alignItems: "center",
      fontSize, fontFamily: "var(--font-mono)",
      animation: "fade-in 0.5s var(--ease-smooth) 0.7s both",
      width: "100%",
      color: valueColor,
      letterSpacing: "0.04em",
    }}>
      <span style={{ color: "var(--accent)", fontWeight: 700, marginRight: gap }}>
        {t("metadata_title")}
      </span>
      <span style={{ color: sepColor }}>│</span>
      <span style={{ color: labelColor }}>{t("metadata_timestamp")}</span>
      <span>{ts}</span>
      <span style={{ color: sepColor }}>│</span>
      <span style={{ color: labelColor }}>{t("metadata_config_file")}</span>
      <span>{metadata.config_file || "—"}</span>
      <span style={{ color: sepColor }}>│</span>
      <span style={{ color: labelColor }}>{t("metadata_entity_counts")}</span>
      <span>{totalEntities}</span>
      <span style={{ color: sepColor }}>│</span>
      <span style={{ color: labelColor }}>{t("metadata_assets")}</span>
      <span>{t("metadata_assets_exported")}&nbsp;{metadata.assets?.exported ?? "—"}</span>
      <span>·</span>
      <span>{t("metadata_assets_skipped")}&nbsp;{metadata.assets?.skipped ?? "—"}</span>
      <span style={{ color: sepColor }}>│</span>
      <span style={{ color: labelColor }}>{t("metadata_source_paths")}</span>
      <span style={{ maxWidth: isMobile ? 120 : 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {(metadata.source_paths || []).join(", ") || "—"}
      </span>
    </div>
  );
}

/* ── HomePage: Terminal Boot Screen ── */
export function HomePage({ allKeywords = [], data }) {
  const isMobile = useIsMobile();
  const t = useT();
  const { metadata } = useData();
  const totalCount = allKeywords.length;
  const categories = data ? Object.keys(data).map(type => ({
    type,
    count: Object.keys(data[type]).length,
  })) : [];

  // ── Colour palette, cycled for each category ──
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
      fontFamily: "var(--font-mono)",
      position: "relative",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(245,158,11,0.025) 3px, rgba(245,158,11,0.025) 6px)",
      }} />

      {/* Main layout */}
      <div style={{
        flex: 1, display: "flex",
        flexWrap: isMobile ? undefined : "wrap",
        flexDirection: isMobile ? "column" : "row",
        padding: isMobile ? "16px 14px 12px" : "48px 56px 32px",
        gap: isMobile ? "12px" : "72px",
        position: "relative", zIndex: 1,
      }}>
        {/* LEFT: brand + boot log */}
        <div style={{
          display: "flex", flexDirection: "column",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{ marginBottom: isMobile ? 10 : 40 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: isMobile ? 8 : 14,
              animation: "fade-in 0.4s var(--ease-smooth) both",
            }}>
              <img src="/icon.svg" alt="RWR OPS"
                style={{
                  width: isMobile ? 28 : 44,
                  height: isMobile ? 28 : 44,
                  flexShrink: 0,
                  alignSelf: "flex-end",
                  marginBottom: isMobile ? 2 : 4,
                }}
              />
              <div>
                <div style={{
                  fontSize: isMobile ? "clamp(20px, 6vw, 32px)" : "clamp(42px, 5vw, 64px)",
                  fontWeight: 700,
                  fontFamily: "var(--font-display)", letterSpacing: "0.12em",
                  color: "var(--text-primary)", lineHeight: 0.9,
                }}>{t("omni")}</div>
                <div style={{
                  fontSize: isMobile ? "clamp(20px, 6vw, 32px)" : "clamp(42px, 5vw, 64px)",
                  fontWeight: 700,
                  fontFamily: "var(--font-display)", letterSpacing: "0.12em",
                  color: "var(--text-primary)", lineHeight: 0.9,
                }}>{t("parser")}</div>
              </div>
            </div>

            <div style={{
              height: "1px",
              width: isMobile ? "120px" : "200px",
              background: "linear-gradient(to right, var(--accent), transparent)",
              margin: isMobile ? "8px 0 12px" : "16px 0 24px",
              animation: "scale-in 0.5s var(--ease-smooth) 0.2s both",
              transformOrigin: "left center",
            }} />
            <div style={{
              fontSize: isMobile ? "clamp(8px, 2vw, 10px)" : "clamp(10px, 1.2vw, 13px)",
              color: "var(--text-muted)", fontFamily: "var(--font-mono)",
              letterSpacing: "0.15em",
              animation: "fade-in 0.4s var(--ease-smooth) 0.25s both",
            }}>
              {t("subtitle")}
            </div>
          </div>

          {/* Boot log */}
          <div style={{
            fontSize: isMobile ? "clamp(7px, 1.8vw, 10px)" : "clamp(9px, 1vw, 11px)",
            color: "#3a4a5a", fontFamily: "var(--font-mono)",
            lineHeight: isMobile ? 1.6 : 2,
          }}>
            <div style={{ animation: "fade-in 0.3s ease 0.35s both" }}><span style={{ color: "var(--success)" }}>[ OK ]</span>&nbsp;&nbsp;{t("manifest_loaded", categories.length)}</div>
            <div style={{ animation: "fade-in 0.3s ease 0.45s both" }}><span style={{ color: "var(--success)" }}>[ OK ]</span>&nbsp;&nbsp;{t("entity_index", totalCount)}</div>
            <div style={{ animation: "fade-in 0.3s ease 0.55s both" }}><span style={{ color: "var(--accent)" }}>[ &gt;&gt; ]</span>&nbsp;&nbsp;{t("awaiting")}</div>
          </div>

          {/* Game intro */}
          <div style={{
            marginTop: isMobile ? 10 : 16, marginBottom: isMobile ? 4 : 8,
            border: "1px solid var(--border-subtle)",
            padding: isMobile ? "8px 10px" : "10px 14px",
            animation: "fade-in 0.4s var(--ease-smooth) 0.6s both",
            display: "flex", alignItems: "flex-start", gap: isMobile ? 8 : 14,
          }}>
            <img src="/rwr-title.png" alt="RWR"
              style={{
                width: isMobile ? 80 : 120,
                height: "auto",
                flexShrink: 0,
                alignSelf: "center",
                imageRendering: "pixelated",
                opacity: 0.85,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: isMobile ? "var(--font-xxs)" : "var(--font-xs)",
                fontWeight: 700, letterSpacing: "0.15em",
                color: "var(--accent)", textTransform: "uppercase",
                marginBottom: isMobile ? 3 : 4,
                fontFamily: "var(--font-mono)",
              }}>
                {t("rwr_intro_title")}
              </div>
              <div style={{
                fontSize: isMobile ? "clamp(6px, 1.5vw, 8px)" : "clamp(8px, 0.7vw, 10px)",
                color: "var(--text-muted)", lineHeight: 1.5,
                fontFamily: "var(--font-mono)",
              }}>
                {t("rwr_intro_desc")}
              </div>
            </div>
          </div>

          {/* Blinking prompt */}
          <div style={{
            marginTop: isMobile ? 6 : 8, display: "flex", alignItems: "center", gap: 6,
            fontSize: "var(--font-sm)", color: "var(--accent)", fontFamily: "var(--font-mono)",
            animation: "fade-in 0.3s ease 0.65s both",
          }}>
            <span>&#9656;</span>
            <span style={{ width: 6, height: 12, background: "var(--accent)", animation: "blink-cursor 0.9s step-end infinite" }} />
            <span style={{ color: "#3a4a5a", marginLeft: 4 }}>{t("select_category")}</span>
          </div>
        </div>

        {/* RIGHT: category cards */}
        <div style={{
          position: "relative", flex: 1,
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: isMobile ? "flex-start" : "center",
        }}>
          {(
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
              justifyContent: "center", width: "100%",
              maxWidth: isMobile ? 340 : 520,
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
          )}
        </div>

        {/* Article list */}
        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: isMobile ? "12px 14px" : "20px 56px",
          width: "100%",
          animation: "fade-in 0.5s var(--ease-smooth) 0.8s both",
        }}>
          <div style={{
            fontSize: isMobile ? "var(--font-xs)" : "var(--font-sm)",
            color: "var(--accent)", fontFamily: "var(--font-mono)",
            letterSpacing: "0.15em", marginBottom: isMobile ? 8 : 12,
            textTransform: "uppercase",
          }}>
            {t("nav_docs")}
          </div>
          <ArticleList isMobile={isMobile} />
        </div>

        {/* Tools section */}
        <div style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: isMobile ? "12px 14px" : "20px 56px",
          width: "100%",
          animation: "fade-in 0.5s var(--ease-smooth) 0.9s both",
        }}>
          <div style={{
            fontSize: isMobile ? "var(--font-xs)" : "var(--font-sm)",
            color: "var(--accent)", fontFamily: "var(--font-mono)",
            letterSpacing: "0.15em", marginBottom: isMobile ? 8 : 12,
            textTransform: "uppercase",
          }}>
            {t("nav_tools")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 6 : 8 }}>
            {TOOLS.map((tool, i) => (
              <a key={tool.id} href={tool.path}
                onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", tool.path); window.dispatchEvent(new PopStateEvent("popstate")); }}
                style={{
                  display: "flex", alignItems: "center", gap: isMobile ? 6 : 8,
                  padding: isMobile ? "6px 10px" : "8px 14px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)", textDecoration: "none", cursor: "pointer",
                  fontSize: isMobile ? "var(--font-sm)" : "var(--font-base)",
                  color: "var(--text-primary)", fontFamily: "var(--font-mono)",
                  animation: `fade-in 0.3s var(--ease-smooth) ${0.2 + i * 0.06}s both`,
                  transition: "border-color var(--dur-fast) var(--ease-smooth)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
              >
                <span style={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)" }}>
                  {t(tool.labelKey)}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--font-xs)", opacity: 0.6 }}>
                  {t(tool.descKey)}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Metadata — at the very bottom */}
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
