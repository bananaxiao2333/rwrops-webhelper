/* ───────────────────────────────────────────────────
 *  ToolsListPage.jsx — Tools hub listing
 *  Shown at /tools — lists all available tools.
 *  Icons: Phosphor via @iconify/react (no emoji)
 * ─────────────────────────────────────────────────── */
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useI18n, useT } from "../i18n.jsx";

/* ── Tool definitions (extensible) ── */
const TOOLS = [
  {
    id: "stall",
    labelKey: "tools_stall",
    descKey: "tools_stall_desc",
    icon: "ph:storefront",
    path: "/tools/stall",
  },
];

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

export default function ToolsListPage() {
  const { lang } = useI18n();
  const t = useT();
  const isMobile = useIsMobile();

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--bg-deep)",
    }}>
      {/* Scanline */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(245,158,11,0.02) 3px, rgba(245,158,11,0.02) 6px)",
      }} />

      <div style={{
        position: "relative", zIndex: 1, flex: 1, overflow: "auto",
        padding: isMobile ? "20px 14px" : "40px 56px",
      }}>
        {/* Header */}
        <div style={{
          marginBottom: isMobile ? 20 : 32,
          animation: "fade-in 0.4s var(--ease-smooth) both",
        }}>
          <div style={{
            fontSize: isMobile ? "clamp(18px, 5vw, 28px)" : "clamp(28px, 3vw, 40px)",
            fontWeight: 700,
            fontFamily: "var(--font-display)", letterSpacing: "0.10em",
            color: "var(--text-primary)",
            display: "flex", alignItems: "center", gap: isMobile ? 8 : 14,
          }}>
            {/* Header icon circle */}
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: isMobile ? 32 : 44, height: isMobile ? 32 : 44,
              border: "2px solid var(--accent)", borderRadius: "50%",
              color: "var(--accent)", flexShrink: 0,
            }}>
              <Icon icon="ph:wrench" width={isMobile ? 18 : 24} height={isMobile ? 18 : 24} />
            </span>
            <span>{t("nav_tools")}</span>
          </div>
          <div style={{
            height: 1, width: isMobile ? 60 : 100,
            background: "linear-gradient(to right, var(--accent), transparent)",
            marginTop: isMobile ? 6 : 10,
          }} />
        </div>

        {/* Count */}
        <div style={{
          fontSize: "var(--font-xs)", color: "var(--text-muted)",
          fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: isMobile ? 12 : 16,
          animation: "fade-in 0.3s ease 0.15s both",
        }}>
          {t("tools_count", TOOLS.length)}
        </div>

        {/* Tool cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 10 }}>
          {TOOLS.map((tool, i) => (
            <a key={tool.id} href={tool.path}
              onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", tool.path); window.dispatchEvent(new PopStateEvent("popstate")); }}
              style={{
                display: "flex", alignItems: "center", gap: isMobile ? 12 : 16,
                padding: isMobile ? "14px 14px" : "18px 22px",
                border: "1px solid var(--border-subtle)",
                borderLeft: "3px solid var(--border-subtle)",
                background: "var(--bg-surface)",
                textDecoration: "none", cursor: "pointer",
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
                animation: `fade-in 0.35s var(--ease-smooth) ${0.2 + i * 0.08}s both`,
                transition: "all var(--dur-fast) var(--ease-smooth)",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.borderLeftColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "var(--glow-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-subtle)";
                e.currentTarget.style.borderLeftColor = "var(--border-subtle)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Icon */}
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
                flexShrink: 0,
                color: "var(--accent)", opacity: 0.7,
              }}>
                <Icon icon={tool.icon} width={isMobile ? 28 : 36} height={isMobile ? 28 : 36} />
              </span>

              {/* Text */}
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, letterSpacing: "0.06em",
                  fontSize: isMobile ? "var(--font-base)" : "var(--font-md)",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}>
                  {t(tool.labelKey)}
                </div>
                <div style={{
                  fontSize: "var(--font-xs)", color: "var(--text-muted)",
                  marginTop: isMobile ? 2 : 4, lineHeight: 1.5,
                  maxWidth: 520,
                }}>
                  {t(tool.descKey)}
                </div>
              </span>

              {/* Arrow */}
              <span style={{
                color: "var(--accent)", flexShrink: 0,
                opacity: 0.4, transition: "opacity var(--dur-fast) var(--ease-smooth), transform var(--dur-fast) var(--ease-smooth)",
              }} className="card-arrow">
                <Icon icon="ph:arrow-up-right" width={isMobile ? 14 : 18} height={isMobile ? 14 : 18} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
