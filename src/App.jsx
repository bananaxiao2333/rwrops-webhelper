import { useHashRoute, useRouteParams, navigateTo } from "./hashRouter.js";
import { useNavigate, useLocation } from "react-router-dom";
import { PACKAGE_PARAM, withPackage } from "./dataSource.js";
import { useI18n } from "./i18n.jsx";
import { HomePage, extractAllKeywords } from "./routes.jsx";
import { sectionEnabled } from "./sections.js";
import SEO from "./SEO.jsx";
import ExchangeRollModal from "./detail_visual/ExchangeRollModal";
import DocsPage, { DocsListPage } from "./DocsPage.jsx";
import { getArticleSlugsSync, getAllArticleMetas } from "./docsLazy.js";
import GlobalSearch from "./GlobalSearch.jsx";
import { lazy, Suspense } from "react";
import { Icon } from "@iconify/react";
const ToolsListPage = lazy(() => import("./tools/ToolsListPage.jsx"));
import { TOOLS } from "./tools/ToolsListPage.jsx";
const StallGenerator = lazy(() => import("./tools/StallGenerator.jsx"));
const MetaGen = lazy(() => import("./tools/MetaGen.jsx"));
const Showcase = lazy(() => import("./tools/Showcase.jsx"));
import ErrorBoundary from "./ErrorBoundary.jsx";
import { ShareProvider } from "./ShareContext.jsx";
import ShareModal from "./ShareModal.jsx";
import Tour, { tourSeen } from "./Tour.jsx";

/* ── Language first-time picker modal ── */
import List from "./List.jsx";
import Detail from "./Detail.jsx";
import { useEffect, useState, useMemo, useRef } from "react";
import { useData } from "./DataContext.jsx";

function LanguageModal({ languages, onSelect }) {
  const [show, setShow] = useState(true);

  const handlePick = (locale) => {
    setShow(false);
    setTimeout(() => onSelect(locale), 150);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select language"
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-deep)",
        fontFamily: "var(--font-body)",
        animation: "fade-in 0.3s ease both",
      }}
    >
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "28px 32px",
        minWidth: 260,
        textAlign: "center",
        boxShadow: "none",
        animation: "scale-in 0.3s var(--ease-out) both",
      }}>
        <div style={{
          fontSize: "var(--font-md)", fontWeight: 700, color: "var(--accent)",
          letterSpacing: "-0.01em",
          fontFamily: "var(--font-display)", marginBottom: 6,
        }}>
          Select Language
        </div>
        <div style={{
          height: 1, width: 60,
          background: "var(--accent)",
          margin: "0 auto 16px",
        }} />
        {languages.length === 0 && (
          <div style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", padding: "12px 0" }}>
            Loading...
          </div>
        )}
        <div role="listbox" aria-label="Available languages" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {languages.map((l, i) => (
            <button
              key={l.locale}
              onClick={() => handlePick(l.locale)}
              role="option"
              aria-selected={false}
              style={{
                padding: "8px 16px", cursor: "pointer", fontSize: "var(--font-base)",
                color: "var(--text-primary)",
                border: "none",
                borderBottom: i < languages.length - 1 ? "1px solid var(--border-subtle)" : "none",
                background: "transparent",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.01em",
                animation: `fade-in 0.2s ease ${0.1 + i * 0.04}s both`,
                transition: "background var(--dur-fast) ease",
                textAlign: "left",
                width: "100%",
                borderRadius: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{l.code.toUpperCase()}</span>
                <span style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", fontWeight: 400 }}>{l.name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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

/* ── auto theme detection hook ── */
function useTheme() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = (e) => {
      document.documentElement.classList.toggle("light-theme", e.matches);
    };
    apply(mq);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
}

/* ── Persistent Status Bar (RXSEND-inspired header) ── */
function StatusBar({ viewName, count, isMobile, onSidebarToggle, onSearchOpen, onShareOpen, showShare, onNav, activeSection, onTourOpen }) {
  const { t } = useI18n();
  const gap = isMobile ? 4 : 8;
  return (
    <header role="banner" className="site-header" style={{
      height: isMobile ? 38 : 46,
      display: "flex", alignItems: "stretch",
      padding: isMobile ? "0 6px" : "0 8px",
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Hamburger + Logo + Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10, flexShrink: 0 }}>
        {isMobile && (
          <button
            onClick={onSidebarToggle}
            aria-label="Toggle navigation menu"
            aria-expanded={false}
            style={{
              cursor: "pointer", fontSize: "var(--font-base)", lineHeight: 1,
              color: "var(--text-muted)", padding: "2px 4px",
              background: "none", border: "none", fontFamily: "inherit",
            }}
          >
            &#9776;
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/icon.svg" alt="RWROPS"
            style={{
              width: isMobile ? 16 : 20,
              height: isMobile ? 16 : 20,
              flexShrink: 0,
            }}
          />
          {!isMobile && (
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span style={{
                fontSize: "var(--font-sm)", fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.02em",
              }}>
                RWROPS
              </span>
              <span style={{
                fontSize: 9, fontWeight: 400,
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.04em",
              }}>
                Web Helper
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav items (desktop only) */}
      {!isMobile && (
        <nav aria-label="Main sections" data-tour="nav" style={{
          display: "flex", alignItems: "stretch", height: "100%",
          marginLeft: 4,
        }}>
          {NAV_SECTIONS.filter(sec => sectionEnabled(sec.id)).map(section => (
            <button
              key={section.id}
              onClick={() => onNav(section.path)}
              className={`header-nav-btn${section.id === activeSection ? ' active' : ''}`}
              aria-current={section.id === activeSection ? 'page' : undefined}
            >
              {t(section.labelKey)}
            </button>
          ))}
        </nav>
      )}

      {/* Current view indicator */}
      <div style={{
        display: "flex", alignItems: "center",
        marginLeft: isMobile ? 4 : 10, gap: 4,
        fontSize: "var(--font-xs)", color: "var(--text-muted)",
        fontFamily: "var(--font-mono)", flexShrink: 0,
        minWidth: 0, overflow: "hidden",
      }}>
        {!isMobile && <span style={{ color: "var(--border-mid)", flexShrink: 0 }}>/</span>}
        <span style={{ color: "var(--accent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{viewName}</span>
        {count !== undefined && (
          <><span style={{ color: "var(--border-mid)", flexShrink: 0 }}>/</span><span style={{ flexShrink: 0 }}>{count}</span></>
        )}
      </div>

      <span style={{ flex: 1, minWidth: gap }} />

      {/* Search trigger */}
      <button
        onClick={onSearchOpen}
        aria-label="Open search"
        data-tour="search"
        style={{
          border: "1px solid var(--border-subtle)",
          padding: isMobile ? "2px 6px" : "3px 10px",
          background: "var(--bg-deep)",
          display: "flex", alignItems: "center", gap: 4,
          cursor: "pointer", fontFamily: "inherit", fontSize: "inherit",
          borderRadius: "var(--radius-sm)",
          transition: "border-color var(--dur-fast) var(--ease-smooth)",
        }}
      >
        <span style={{ color: "var(--accent)", fontSize: "var(--font-xs)" }}>&#8981;</span>
        {!isMobile && (
          <span style={{
            color: "var(--text-muted)", fontSize: "var(--font-xs)",
            fontFamily: "var(--font-mono)",
          }}>
            {t("search")}
          </span>
        )}
        {!isMobile && (
          <span style={{
            fontSize: 9, color: "var(--text-dim)",
            border: "1px solid var(--border-subtle)", padding: "0 3px",
            borderRadius: 2, lineHeight: "14px",
          }}>
            Ctrl+K
          </span>
        )}
      </button>

      {/* Share button (params only) */}
      {showShare && (
        <button
          onClick={onShareOpen}
          aria-label="Open share menu"
          style={{
            border: "1px solid var(--border-subtle)",
            padding: isMobile ? "2px 6px" : "3px 6px",
            background: "var(--bg-deep)",
            display: "flex", alignItems: "center",
            cursor: "pointer", fontFamily: "inherit", fontSize: "inherit",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <Icon icon="mdi:share-variant" style={{ fontSize: 11, color: "var(--accent)" }} />
        </button>
      )}

      {/* Guided tour — replayable */}
      <button
        onClick={onTourOpen}
        aria-label={t("tour_label")}
        title={t("tour_label")}
        style={{
          border: "1px solid var(--border-subtle)",
          padding: isMobile ? "2px 6px" : "3px 8px",
          background: "var(--bg-deep)",
          display: "flex", alignItems: "center",
          cursor: "pointer", fontFamily: "inherit", fontSize: "inherit",
          borderRadius: "var(--radius-sm)",
          marginLeft: 4,
        }}
      >
        <Icon icon="mdi:help-circle-outline" style={{ fontSize: 13, color: "var(--accent)" }} />
      </button>

      {/* Language switch */}
      <PackageSelector isMobile={isMobile} />
      <LanguageSelector />
    </header>
  );
}

/* ── Package selector ──────────────────────────────────────────────────────
 * The data site serves one dataset per game package (vanilla, classic, ww2_base,
 * …). Switching remounts the whole record set, so this lives in the status bar
 * next to the language switch rather than inside a page. */
function PackageSelector({ isMobile }) {
  const { packages, packageId, selectPackage, switching } = useData();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!packages || packages.length < 2) return null;

  const current = packages.find((p) => p.id === packageId);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "stretch" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav_package")}
        data-tour="package"
        style={{
          cursor: "pointer", padding: "3px 6px",
          border: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xs)",
          color: switching ? "var(--text-muted)" : "var(--text-primary)",
          fontFamily: "var(--font-mono)",
          background: "none",
          borderRadius: "var(--radius-sm)",
          marginLeft: 4,
          display: "flex", alignItems: "center", gap: 4,
          maxWidth: isMobile ? 92 : 160,
        }}
      >
        <span style={{ color: "var(--accent)", flexShrink: 0 }}>&#9635;</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {switching ? "…" : (current?.id ?? packageId ?? "?")}
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t("nav_package")}
          style={{
            position: "absolute", top: "100%", right: 0, zIndex: 30,
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            minWidth: 230, maxHeight: 320, overflowY: "auto",
          }}
          onMouseLeave={() => setOpen(false)}
        >
          {packages.map((p) => (
            <button
              key={p.id}
              role="option"
              aria-selected={p.id === packageId}
              onClick={() => { selectPackage(p.id); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                padding: "5px 10px", cursor: "pointer", fontSize: "var(--font-sm)",
                color: p.id === packageId ? "var(--accent)" : "var(--text-primary)",
                background: p.id === packageId ? "var(--bg-elevated)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                textAlign: "left",
                borderRadius: 0,
              }}
            >
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.id}</span>
                <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-muted)", flexShrink: 0 }}>
                  {p.records != null ? p.records.toLocaleString() : ""}
                </span>
              </span>
              {p.layers?.length > 1 && (
                <span style={{
                  display: "block", fontSize: "var(--font-xxs)", color: "var(--text-dim)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {p.layers.join(" + ")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Language selector (from data) ── */
function LanguageSelector() {
  const { lang, setLang, languages } = useI18n();
  const [open, setOpen] = useState(false);

  const current = languages.find(l => l.locale === lang);
  const label = current ? current.code.toUpperCase() : lang.toUpperCase();

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "stretch" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        style={{
          cursor: "pointer", padding: "3px 6px",
          border: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xs)",
          color: "var(--accent)",
          fontFamily: "var(--font-mono)",
          background: "none",
          borderRadius: "var(--radius-sm)",
          marginLeft: 4,
        }}
      >
        {label}
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          style={{
            position: "absolute", top: "100%", right: 0, zIndex: 30,
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            minWidth: 80, maxHeight: 200, overflowY: "auto",
          }}
          onMouseLeave={() => setOpen(false)}
        >
          {languages.map(l => (
            <button
              key={l.locale}
              role="option"
              aria-selected={l.locale === lang}
              onClick={() => { setLang(l.locale); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                padding: "4px 10px", cursor: "pointer", fontSize: "var(--font-sm)",
                color: l.locale === lang ? "var(--accent)" : "var(--text-primary)",
                background: l.locale === lang ? "var(--bg-elevated)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                textAlign: "left",
                borderRadius: 0,
              }}
            >
              {l.code} · {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Navigation section descriptor ── */
const NAV_SECTIONS = [
  { id: "home",   labelKey: "nav_home",   path: "/",            icon: "\u{2302}" },  // ⌂
  { id: "params", labelKey: "nav_params", path: "/params",      icon: "\u{2699}",   // ⚙
    dynamic: "categories", childPath: (id) => `/params/${id}` },
  { id: "docs",   labelKey: "nav_docs",   path: "/docs",        icon: "\u{2261}",
    dynamic: "articles" },
  { id: "tools", labelKey: "nav_tools", path: "/tools",      icon: "\u{2692}",
    dynamic: "tools" },
];

/* ── Sidebar: section-driven navigation panel ── */
function SidebarPanel({ sections, activeSection, activeType, activeDocSlug, toolsSlug, isMobile, priceFilter, onPriceFilterChange, exchangeSourceFilter, onExchangeSourceFilterChange, exchangePrizeFilter, onExchangePrizeFilterChange, groupStates, onGroupStatesChange, sinkIconless, onSinkIconlessChange, onNav, articleMetas = {} }) {
  const { translate, t } = useI18n();
  const [filterOpen, setFilterOpen] = useState(false);

  const linkBase = {
    display: "flex", alignItems: "center", gap: isMobile ? 2 : 6,
    padding: isMobile ? "5px 6px" : "6px 10px",
    color: "var(--text-muted)",
    borderLeft: "2px solid transparent",
    textDecoration: "none", cursor: "pointer",
    fontSize: "var(--font-sm)", letterSpacing: "0.08em",
  };
  const linkActive = { color: "var(--accent)", borderLeft: "2px solid var(--accent)", background: "var(--bg-surface)" };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)",
    }}>
      {/* Section-level navigation — scrollable */}
      <div style={{ overflowY: "auto", flex: 1, padding: isMobile ? "6px 0" : "8px 0" }}>
        {sections.map((section) => {
          const secActive = section.id === activeSection || (section.id === "home" && !activeSection);
          const secOn = section.id === activeSection;
          return (
            <div key={section.id}>
              {/* Section header */}
              <a
                href={section.path}
                onClick={(e) => { e.preventDefault(); onNav?.(); navigateTo(section.path); }}
                style={{
                  ...linkBase,
                  ...(secActive ? linkActive : {}),
                  letterSpacing: "0.12em", fontWeight: 600,
                }}
              >
                <span style={{ width: 14, textAlign: "center", flexShrink: 0 }}>{section.icon}</span>
                <span style={{ textTransform: "uppercase" }}>{t(section.labelKey)}</span>
              </a>

              {/* Children (only render when this section is active & has them) */}
              {secOn && section.children && section.children.length > 0 && (
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 4, marginTop: 2 }}>
                  {section.children.map((child, ci) => {
                    const childActive = child.id === (
                      section.id === "docs" ? activeDocSlug :
                      section.id === "tools" ? toolsSlug :
                      activeType
                    );
                    return (
                      <a
                        key={child.id}
                        href={child.path}
                        onClick={(e) => { e.preventDefault(); onNav?.(); navigateTo(child.path); }}
                        style={{
                          ...linkBase,
                          paddingLeft: isMobile ? 20 : 24,
                          ...(childActive ? linkActive : {}),
                          animation: `fade-in 0.2s var(--ease-smooth) ${ci * 0.03}s both`,
                        }}
                      >
                        <span style={{ fontSize: "var(--font-xxs)", opacity: 0.5 }}>&#9656;</span>
                        <span style={{ textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                          {section.dynamic === "articles" ? (articleMetas[child.id]?.title || child.id) : (t(child.labelKey) || translate(child.labelKey))}
                        </span>
                        {child.count != null && (
                          <span style={{ marginLeft: "auto", color: "var(--text-muted)", flexShrink: 0, fontSize: "var(--font-xxs)" }}>
                            {child.count}
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter — only for params section */}
      {activeSection === "params" && (
        <div style={{ position: "relative", borderTop: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            aria-expanded={filterOpen}
            style={{
              padding: isMobile ? "6px 8px" : "8px 10px",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              color: priceFilter ? "var(--accent)" : "var(--text-muted)",
              background: "none", border: "none",
              fontFamily: "inherit", fontSize: "inherit",
              width: "100%", textAlign: "left",
            }}
          >
            <span>&#9776;</span>
            <span style={{ flex: 1 }}>{t("filter")}</span>
            {(priceFilter || exchangeSourceFilter || exchangePrizeFilter || !groupStates || !sinkIconless) && <span style={{ color: "var(--success)", fontSize: 8 }} aria-label="Filter active">&#9679;</span>}
          </button>
          {filterOpen && (
            <div style={{
              position: "absolute", bottom: "100%", left: 0, right: 0,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)", borderBottom: "none",
              borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
              zIndex: 20,
            }}>
              {[
                { label: t("filter_only_priced"), value: priceFilter, onChange: onPriceFilterChange },
                { label: t("filter_exchange_source"), value: exchangeSourceFilter, onChange: onExchangeSourceFilterChange },
                { label: t("filter_exchange_prize"), value: exchangePrizeFilter, onChange: onExchangePrizeFilterChange },
                { label: t("filter_group_states"), value: groupStates, onChange: onGroupStatesChange },
                { label: t("filter_sink_iconless"), value: sinkIconless, onChange: onSinkIconlessChange },
              ].map((opt, i) => (
                <label key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: isMobile ? "6px 8px" : "8px 10px",
                    cursor: "pointer", userSelect: "none", color: "var(--text-primary)",
                    borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={opt.value}
                    onChange={() => { opt.onChange(!opt.value); }}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar shell (desktop inline / mobile overlay) ── */
function CategoryTree({ sections, activeSection, activeType, activeDocSlug, toolsSlug, isMobile, sidebarOpen, onClose, priceFilter, onPriceFilterChange, exchangeSourceFilter, onExchangeSourceFilterChange, exchangePrizeFilter, onExchangePrizeFilterChange, groupStates, onGroupStatesChange, sinkIconless, onSinkIconlessChange, articleMetas = {} }) {
  const { t } = useI18n();
  const nav = <SidebarPanel sections={sections} activeSection={activeSection} activeType={activeType} activeDocSlug={activeDocSlug} toolsSlug={toolsSlug} isMobile={isMobile}
    priceFilter={priceFilter} onPriceFilterChange={onPriceFilterChange}
    exchangeSourceFilter={exchangeSourceFilter} onExchangeSourceFilterChange={onExchangeSourceFilterChange}
    exchangePrizeFilter={exchangePrizeFilter} onExchangePrizeFilterChange={onExchangePrizeFilterChange}
    groupStates={groupStates} onGroupStatesChange={onGroupStatesChange}
    sinkIconless={sinkIconless} onSinkIconlessChange={onSinkIconlessChange}
    onNav={onClose} articleMetas={articleMetas} />;

  if (isMobile) {
    if (!sidebarOpen) return null;
    const panelWidth = Math.min(280, window.innerWidth * 0.78);
    return (
      <>
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "var(--bg-deep)",
          animation: "fade-in 0.2s ease both",
        }} />
        <div className="site-sidebar" style={{
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 101,
          width: panelWidth,
          borderRight: "1px solid var(--border-subtle)",
          display: "flex", flexDirection: "column",
          animation: "slide-in-left 0.25s var(--ease-out) both",
          fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 10px 6px", flexShrink: 0,
            borderBottom: "1px solid var(--border-subtle)",
          }}>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", letterSpacing: "0.12em" }}>
              {t("omni")}
            </span>
            <button onClick={onClose} aria-label="Close navigation menu" style={{
              cursor: "pointer", padding: "2px 6px", color: "var(--text-muted)",
              fontSize: "var(--font-base)", background: "none", border: "none",
              fontFamily: "inherit",
            }}>&#10005;</button>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {nav}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="site-sidebar" style={{
      flexShrink: 0, overflow: "hidden",
      borderRight: "1px solid var(--border-subtle)",
      maxWidth: 260,
    }}>
      {nav}
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const { data, packageId, switching } = useData();
  const route = useHashRoute();
  useRouteParams(data);
  const navigate = useNavigate();

  const { lang, languages, setLang, t, translate } = useI18n();
  const [showLangModal, setShowLangModal] = useState(!localStorage.getItem("rwrops_lang"));

  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [priceFilter, setPriceFilter] = useState(false);
  const [exchangeSourceFilter, setExchangeSourceFilter] = useState(false);
  const [exchangePrizeFilter, setExchangePrizeFilter] = useState(false);
  /* Display shaping, not filtering — but it belongs in the same menu because it
   * is the same kind of decision about what the list shows. Both default on. */
  const [groupStates, setGroupStates] = useState(true);
  const [sinkIconless, setSinkIconless] = useState(true);
  const [rollItem, setRollItem] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [articleMetas, setArticleMetas] = useState({});
  const isMobile = useIsMobile();
  useTheme();
  const typeList = useMemo(() => {
    if (!data) return [];
    return Object.keys(data).map(type => ({ type, count: Object.keys(data[type]).length }));
  }, [data]);

  const segmentsList = route.segments;
  const isHome = segmentsList.length === 0;
  const activeSection = isHome ? null : segmentsList[0];
  const isParams = activeSection === "params";
  const isDocs = activeSection === "docs";
  const isTools = activeSection === "tools";
  const activeType = isParams ? segmentsList[1] || null : null;
  const activeDocSlug = isDocs ? (segmentsList[1] || "").split("?")[0] || null : null;
  const toolsSlug = isTools ? (segmentsList[1] || null) : null;
  const itemKey = isParams ? segmentsList[2] || null : null;

  // Global search keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* First-visit tour. Wait for the data and the language picker so the two
   * modals never stack, and only on the home page where the tour's anchors
   * exist. Once dismissed it stays dismissed until replayed from the "?" button. */
  useEffect(() => {
    if (!data || showLangModal || tourSeen()) return;
    if (segmentsList.length !== 0) return;   // home only
    const id = setTimeout(() => setTourOpen(true), 900);
    return () => clearTimeout(id);
  }, [data, showLangModal, segmentsList.length]);

  // Build nav sections: config + dynamic children
  // Use sync fallback initially — slugs derived from file glob, no docs.js needed
  const articleSlugs = useMemo(() => getArticleSlugsSync(), []);
  const navSections = useMemo(() => NAV_SECTIONS.filter((sec) => sectionEnabled(sec.id)).map((sec) => {
    if (sec.dynamic === "categories") {
      return { ...sec, children: typeList.map((t) => ({
        id: t.type, labelKey: t.type, path: `/params/${t.type}`, count: t.count,
      }))};
    }
    if (sec.dynamic === "articles") {
      return { ...sec, children: articleSlugs.map((slug) => ({
        id: slug, path: `/docs/${slug}`,
      }))};
    }
    if (sec.dynamic === "tools") {
      return { ...sec, children: TOOLS.map((t) => ({
        id: t.id, labelKey: t.labelKey, path: t.path,
      }))};
    }
    return sec;
  }), [typeList, articleSlugs]);

  // Initialize route + redirect bare /params to first category
  useEffect(() => {
    if (segmentsList.length === 1 && segmentsList[0] === "params" && typeList.length > 0) {
      navigate(`/params/${typeList[0].type}`, { replace: true });
    }
  }, [typeList, segmentsList, navigate]);

  // A parked section has no navigation entry, so a bookmarked or shared link
  // to it would otherwise render an orphaned page.
  useEffect(() => {
    if (activeSection && !sectionEnabled(activeSection)) navigate("/", { replace: true });
  }, [activeSection, navigate]);

  // Switching package remounts every record, so a deep link into the previous
  // package's data (an item key that may not exist here) would land on
  // "ITEM NOT FOUND". Return to the index instead.
  //
  // Compare against the *previous* package rather than "have we resolved yet":
  // StrictMode runs effects twice on mount, so a mount-only guard redirects away
  // from every deep link in dev.
  const prevPackage = useRef(null);
  useEffect(() => {
    if (packageId == null) return;
    if (prevPackage.current !== null && prevPackage.current !== packageId) {
      // `withPackage` because React Router replaces the whole URL here, query
      // string included — without it the switch would drop the package the
      // link is supposed to name.
      navigate(withPackage("/"), { replace: true });
    }
    prevPackage.current = packageId;
  }, [packageId, navigate]);

  /* Keep the package in the URL, whatever navigation just happened.
   *
   * The package is part of the identity of a page — vanilla's `map13` and
   * classic's `map13` are different data — so a copied link has to say which
   * one it is. Navigation here is a mix of React Router's `navigate()` and
   * hand-rolled `history.pushState`, and neither preserves a query string, so
   * re-stamp it after every route change instead of chasing ~20 call sites.
   * `replaceState` keeps this out of the history stack. */
  const routeLocation = useLocation();
  useEffect(() => {
    if (!packageId || packageId.startsWith("__")) return;   // "__legacy__" = pre-multi-package layout
    const url = new URL(window.location.href);
    if (url.searchParams.get(PACKAGE_PARAM) === packageId) return;
    url.searchParams.set(PACKAGE_PARAM, packageId);
    window.history.replaceState(null, "", url);
  }, [packageId, routeLocation]);

  // Load article metadata for sidebar titles
  useEffect(() => {
    getAllArticleMetas(lang).then(setArticleMetas);
  }, [lang]);

  if (sectionEnabled("tools") && isTools && toolsSlug === "showcase") {
    return <Suspense fallback={<div className="loading-spinner" style={{ margin: "40vh auto" }} />}><Showcase /></Suspense>;
  }

  return (
    <ShareProvider>
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh",
      background: "var(--bg-deep)",
    }}>
      {/* ── SEO meta tags ── */}
      {(() => {
        let seoTitle = "";
        let seoDesc = "";
        let seoPath = route.path;
        if (isHome) {
          seoTitle = t("omni_parser");
          seoDesc = t("subtitle");
        } else if (isDocs && activeDocSlug) {
          // Doc article page — use frontmatter metadata
          const meta = articleMetas[activeDocSlug];
          seoTitle = meta?.title || activeDocSlug;
          seoDesc = meta?.description || "";
          seoPath = `/docs/${activeDocSlug}`;
        } else if (isDocs) {
          // Docs list page
          seoTitle = t("nav_docs");
          seoDesc = `${t("nav_docs")} — ${articleSlugs.length} articles`;
        } else if (isParams && itemKey && data?.[activeType]?.[itemKey]) {
          const item = data[activeType][itemKey];
          const itemName = item.name ? (typeof item.name === "string" ? item.name : String(item.name)) : itemKey;
          const translatedName = translate(itemName);
          seoTitle = `${translatedName} — ${t(activeType)}`;
          seoDesc = `${t(activeType)}: ${itemKey} — ${translatedName}`;
        } else if (isParams && activeType) {
          const count = data?.[activeType] ? Object.keys(data[activeType]).length : 0;
          seoTitle = t(activeType);
          seoDesc = `${t(activeType)} — ${count} ${t("units")}`;
        } else if (isTools && toolsSlug) {
          const toolMeta = TOOLS.find((t) => t.id === toolsSlug);
          seoTitle = toolMeta ? t(toolMeta.labelKey) : t("nav_tools");
          seoDesc = toolMeta ? t(toolMeta.descKey) : "";
        } else if (isTools) {
          seoTitle = t("nav_tools");
          seoDesc = t("tools_count", TOOLS.length);
        }
        return <SEO title={seoTitle} description={seoDesc} canonicalPath={seoPath} lang={lang} />;
      })()}
      {/* Status Bar */}
      <StatusBar
        viewName={isHome ? t("omni_parser") : isDocs ? t("nav_docs") : isTools ? t("nav_tools") : (itemKey ? itemKey.toUpperCase() : (activeType || "").toUpperCase())}
        count={activeType && data?.[activeType] ? Object.keys(data[activeType]).length : undefined}
        isMobile={isMobile}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        onSearchOpen={() => setGlobalSearchOpen(true)}
        showShare={isParams && itemKey !== null}
        onShareOpen={() => setShareOpen(true)}
        onNav={(path) => navigate(path)}
        activeSection={activeSection}
        onTourOpen={() => setTourOpen(true)}
      />

      {/* Dataset switch in flight — the page stays up, so say what is happening */}
      {switching && (
        <div
          role="status"
          aria-live="polite"
          style={{
            height: 2, flexShrink: 0, position: "relative", overflow: "hidden",
            background: "var(--border-subtle)",
          }}
        >
          <div style={{
            position: "absolute", inset: 0, width: "40%",
            background: "var(--accent)",
            animation: "slide-in-left 1s var(--ease-smooth) infinite alternate",
          }} />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar: desktop inline, mobile overlay */}
        {isMobile ? (
          <CategoryTree
            sections={navSections}
            activeSection={activeSection}
            activeType={activeType}
            activeDocSlug={activeDocSlug}
            toolsSlug={toolsSlug}
            isMobile={isMobile}
            sidebarOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            priceFilter={priceFilter}
            onPriceFilterChange={setPriceFilter}
            exchangeSourceFilter={exchangeSourceFilter}
            onExchangeSourceFilterChange={setExchangeSourceFilter}
            exchangePrizeFilter={exchangePrizeFilter}
            onExchangePrizeFilterChange={setExchangePrizeFilter}
            groupStates={groupStates}
            onGroupStatesChange={setGroupStates}
            sinkIconless={sinkIconless}
            onSinkIconlessChange={setSinkIconless}
            articleMetas={articleMetas}
          />
        ) : !isHome ? (
          <CategoryTree
            sections={navSections}
            activeSection={activeSection}
            activeType={activeType}
            activeDocSlug={activeDocSlug}
            toolsSlug={toolsSlug}
            isMobile={isMobile}
            priceFilter={priceFilter}
            onPriceFilterChange={setPriceFilter}
            exchangeSourceFilter={exchangeSourceFilter}
            onExchangeSourceFilterChange={setExchangeSourceFilter}
            exchangePrizeFilter={exchangePrizeFilter}
            onExchangePrizeFilterChange={setExchangePrizeFilter}
            groupStates={groupStates}
            onGroupStatesChange={setGroupStates}
            sinkIconless={sinkIconless}
            onSinkIconlessChange={setSinkIconless}
            articleMetas={articleMetas}
          />
        ) : null}

        {/* Main Area */}
        <main id="main-content" aria-label="Main content" style={{
          flex: 1,
          overflow: "auto",
          background: "var(--bg-deep)",
        }}>
           <ErrorBoundary t={t} key={route.path}>
          <Suspense fallback={<div className="loading-spinner" style={{ margin: "20vh auto" }} />}>
          {isHome ? (
            <HomePage
              allKeywords={extractAllKeywords(data)}
              data={data}
              onTourOpen={() => setTourOpen(true)}
            />
          ) : isDocs && activeDocSlug ? (
            <DocsPage slug={activeDocSlug} />
          ) : isDocs && !activeDocSlug ? (
            <DocsListPage isMobile={isMobile} />
          ) : activeType && data?.[activeType] && !itemKey ? (
            <List
              data={data[activeType]}
              type={activeType}
              isMobile={isMobile}
              priceFilter={priceFilter}
              exchangeSourceFilter={exchangeSourceFilter}
              exchangePrizeFilter={exchangePrizeFilter}
              groupStates={groupStates}
              sinkIconless={sinkIconless}
            />
          ) : activeType && data?.[activeType]?.[itemKey] ? (
            <Detail
              item={data[activeType][itemKey]}
              type={activeType}
              onBack={() => { navigate(`/params/${activeType}`); }}
              onOpenRoll={(item) => setRollItem(item)}
            />
           ) : isTools && toolsSlug === "stall" ? (
            <Suspense fallback={<div className="loading-spinner" style={{ margin: "20vh auto" }} />}>
              <StallGenerator />
            </Suspense>
           ) : isTools && toolsSlug === "metagen" ? (
            <Suspense fallback={<div className="loading-spinner" style={{ margin: "20vh auto" }} />}>
              <MetaGen />
            </Suspense>
           ) : isTools ? (
            <Suspense fallback={<div className="loading-spinner" style={{ margin: "20vh auto" }} />}>
              <ToolsListPage />
            </Suspense>
           ) : activeType ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", color: "var(--danger)", marginBottom: "0.5rem" }}>&#9608;</div>
                <p>{!data?.[activeType] ? `TYPE "${activeType}" NOT FOUND` : `ITEM "${itemKey}" NOT FOUND`}</p>
              </div>
            </div>
           ) : null}
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      {showLangModal && languages.length > 0 && (
        <LanguageModal
          languages={languages}
          onSelect={(locale) => { setLang(locale); setShowLangModal(false); }}
        />
      )}

      {/* ── Guided tour ── (remount on open so it always restarts at step 1) */}
      <Tour key={tourOpen ? "tour-open" : "tour-closed"} open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* ── Global Search Modal ── */}
      <GlobalSearch
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        data={data}
        onNavigate={(path) => { navigate(path); }}
      />

      {/* ── Footer ── */}
      {rollItem && rollItem.exchange_prizes && (
        <ExchangeRollModal
          exchangePrizes={rollItem.exchange_prizes}
          item={rollItem}
          data={data}
          onClose={() => setRollItem(null)}
        />
      )}

      {/* ── Share Modal ── */}
      {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}

      {(() => {
        const year = new Date().getFullYear();
        return (
          <footer style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-base)",
            padding: "6px 20px",
            flexShrink: 0,
            fontSize: "var(--font-sm)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            textAlign: "center",
            letterSpacing: "0.03em",
          }}>
            {t("footer_credit", year)}
          </footer>
        );
      })()}
    </div>
    </ShareProvider>
  );
}
