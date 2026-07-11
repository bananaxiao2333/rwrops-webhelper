import { useMemo, useState, useEffect } from "react";
import { useI18n } from "./i18n.jsx";
import { useItemIcon } from "./assetLoader.jsx";
import InboxOutlined from "@mui/icons-material/InboxOutlined";

const TYPE_CONFIG = {
  vehicle:     { label: "VEHICLE", colorBase: [107, 140, 164], sizeChain: [{key:"mass",weight:2},{key:"max_speed",weight:1},{key:"max_health",weight:1},{key:null,default:5}] },
  weapon:      { label: "WEAPON", colorBase: [245, 158, 11], sizeChain: [{key:"projectile_result_kill_probability",weight:3},{key:"projectiles_per_shot",weight:2},{key:"retrigger_time",weight:1},{key:"magazine_size",weight:1},{key:null,default:0.5}] },
  carry_item:  { label: "CARRY ITEM", colorBase: [136, 153, 170], sizeChain: [{key:"inventory_price",weight:2},{key:"commonness_value",weight:1},{key:"inventory_encumbrance",weight:1},{key:null,default:3}] },
  projectile:  { label: "PROJECTILE", colorBase: [239, 68, 68], sizeChain: [{key:"pulldown_in_air",weight:1},{key:"projectile_speed",weight:1},{key:null,default:0.5}] },
  call:        { label: "CALL", colorBase: [139, 92, 246], sizeChain: [{key:"rounds",weight:2},{key:"inventory",weight:1},{key:null,default:1}] },
  achievement: { label: "ACHIEVEMENT", colorBase: [34, 197, 94], sizeChain: [{key:"levels",weight:2},{key:"criteria_list",weight:1},{key:null,default:1}] },
  faction:     { label: "FACTION", colorBase: [249, 115, 22], sizeChain: [{key:"soldiers",weight:3},{key:"ranks",weight:2},{key:null,default:1}] },
};

function resolveSizeValue(item, chain) {
  let total = 0, count = 0;
  for (const step of chain) {
    if (step.key === null) continue; // skip fallback in loop
    const raw = item[step.key];
    if (raw === undefined || raw === null) continue;
    let v;
    if (Array.isArray(raw)) {
      v = raw.length;                     // array → length
    } else if (typeof raw === "number") {
      v = raw;
    } else if (typeof raw === "boolean") {
      v = raw ? 1 : 0;
    } else {
      v = Number(raw);
      if (isNaN(v)) continue;
    }
    total += v * (step.weight || 1);
    count++;
  }
  return count > 0
    ? total / count
    : (chain.find(s => s.key === null)?.default || 50);
}

function normalize(v, min, max) { const d = (max - min) || 1; return Math.max(0.03, Math.min(1, (v - min) / d)); }

/* ── Tile: icon as CSS background-layer, text floats above ── */
function Tile({ item, config, norm, onClick, isMobile, index = 0 }) {
  const { translate, t } = useI18n();
  const [iconLoaded, setIconLoaded] = useState(false);
  // Use item.color (faction) if available, else config.colorBase
  const [r, g, b] = item.color
    ? [(item.color[0] * 255) | 0, (item.color[1] * 255) | 0, (item.color[2] * 255) | 0]
    : config.colorBase;
  const iconUrl = useItemIcon(item);
  const solidBg = `rgba(${r},${g},${b},${0.2 + norm * 0.7})`;

  const isAI = item.key?.toLowerCase().includes("_ai.") || item.name?.toLowerCase().includes("_ai");

  // Preload icon, flip loaded state when ready
  useEffect(() => {
    if (!iconUrl) { setIconLoaded(true); return; }
    const img = new Image();
    img.onload = () => setIconLoaded(true);
    img.onerror = () => setIconLoaded(true);
    img.src = iconUrl;
  }, [iconUrl]);

  const compositeBg = iconUrl && iconLoaded
    ? `url(${iconUrl}) left center / contain no-repeat, ${solidBg}`
    : solidBg;

  return (
    <div onClick={onClick} style={{
      background: compositeBg,
      padding: isMobile ? "6px 8px" : "10px 14px",
      cursor: "pointer",
      border: "1px solid transparent",
      transition: "all 0.15s ease",
      width: "100%", height: "100%",
      position: "relative",
      display: "flex", alignItems: "center", justifyContent: "flex-end",
      animation: `scale-in 0.25s var(--ease-smooth) ${(index % 30) * 0.025}s both`,
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.zIndex = "2"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "1"; }}
    >
      {/* Loading spinner overlay */}
      {iconUrl && !iconLoaded && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 56,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 16, height: 16,
            border: "2px solid var(--border-mid)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "boot-spin 0.8s linear infinite",
          }} />
        </div>
      )}
      {/* AI badge */}
      {isAI && (
        <div style={{
          position: "absolute", top: 2, left: 4,
          fontSize: "var(--font-base)", fontWeight: 800,
          fontFamily: "var(--font-mono)",
          color: "#fff", background: "var(--danger)",
          padding: "1px 4px", letterSpacing: "0.1em",
        }}>
          AI
        </div>
      )}
      {/* Text (right-aligned, above background) */}
      <div style={{ textAlign: "right", maxWidth: "65%" }}>
        <div style={{
          fontSize: "var(--font-md)",
          fontWeight: 700, fontFamily: "var(--font-display)",
          color: "#ffffff", letterSpacing: "0.03em",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {translate(item.name || item.key || "—")}
        </div>
        <div style={{
          fontSize: "var(--font-sm)",
          color: "rgba(255,255,255,0.6)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1,
          textShadow: "0 1px 3px rgba(0,0,0,0.7)",
        }}>
          {String(item.key || "")}
        </div>
      </div>


    </div>
  );
}

/* ── List ── */
export default function List({ data, type, searchText, isMobile, priceFilter, exchangeSourceFilter, exchangePrizeFilter }) {
  const { translate, t } = useI18n();
  const items = useMemo(() => Object.values(data), [data]);
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.carry_item;

  const norms = useMemo(() => {
    const vals = items.map(item => resolveSizeValue(item, config.sizeChain));
    const min = Math.min(...vals); const max = Math.max(...vals);
    return vals.map(v => normalize(v, min, max));
  }, [items, config]);

  const filtered = useMemo(() => {
    let result = items;
    // Price filter
    if (priceFilter) {
      result = result.filter(i => i.inventory_price !== undefined || i.inventory?.price !== undefined);
    }
    // Exchange source filter
    if (exchangeSourceFilter) {
      result = result.filter(i => i.exchange_sources && i.exchange_sources.length > 0);
    }
    // Exchange prize filter
    if (exchangePrizeFilter) {
      result = result.filter(i => i.exchange_prizes && i.exchange_prizes.length > 0);
    }
    // Search filter
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(i => {
        const rawName = String(i.name || "").toLowerCase();
        const transName = String(translate(i.name || "")).toLowerCase();
        const rawKey = String(i.key || "").toLowerCase();
        return rawName.includes(q) || transName.includes(q) || rawKey.includes(q);
      });
    }
    return result;
  }, [items, searchText, translate, priceFilter, exchangeSourceFilter, exchangePrizeFilter]);

  // Sort state
  const [sort, setSort] = useState("heat"); // heat | name | key
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const idxMap = new Map(items.map((item, i) => [item.key, norms[i] || 0]));
    if (sort === "name") arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    if (sort === "key") arr.sort((a, b) => String(a.key || "").localeCompare(String(b.key || "")));
    if (sort === "heat") arr.sort((a, b) => (idxMap.get(b.key) || 0) - (idxMap.get(a.key) || 0));
    return arr;
  }, [filtered, sort, items, norms]);

  const SORT_OPTIONS = [
    { key: "heat", label: t("heat"), sign: "〰" },
    { key: "name", label: t("name_label"), sign: "A" },
    { key: "key", label: t("key_label"), sign: "#" },
  ];

  const minColWidth = isMobile ? 100 : 130;
  const barGap = isMobile ? 4 : 8;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "var(--font-mono)" }}>
      {/* Toolbar: minimal on mobile */}
      <div style={{
        display: "flex", gap: barGap, fontSize: "var(--font-sm)",
        color: "#3a4a5a",
        padding: isMobile ? "4px 6px 3px" : "6px 12px 4px",
        flexShrink: 0, borderBottom: "1px solid var(--border-subtle)",
        alignItems: "center",
        animation: "slide-down 0.25s var(--ease-smooth) both",
      }}>
        <span style={{ display: "inline-block", width: isMobile ? 7 : 10, height: isMobile ? 7 : 10, background: `rgb(${config.colorBase.join(",")})`, opacity: 0.8, flexShrink: 0 }} />
        <span style={{ color: "var(--text-muted)" }}>{isMobile ? "" : t(type)}</span>
        <span style={{ color: "var(--border-mid)" }}>|</span>
        <span style={{ color: "var(--accent)" }}>{filtered.length}/{items.length}</span>

        <span style={{ flex: 1 }} />

        {/* Sort chips */}
        {SORT_OPTIONS.map((opt, i) => {
          const isActive = sort === opt.key;
          return (
            <span key={opt.key} onClick={() => setSort(opt.key)} style={{
              cursor: "pointer",
              padding: isMobile ? "1px 4px" : "2px 6px",
              fontSize: "var(--font-sm)",
              fontFamily: "var(--font-mono)",
              color: isActive ? "var(--accent)" : "#3a4a5a",
              borderBottom: isActive ? "1px solid var(--accent)" : "1px solid transparent",
              transform: `rotate(${i % 2 === 0 ? -1.5 : 2}deg)`,
              transition: "all 0.15s ease",
              letterSpacing: isMobile ? "0.06em" : "0.1em",
              marginLeft: i > 0 ? (isMobile ? 2 : i * 4) : 0,
            }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-muted)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "#3a4a5a"; }}
            >
              <span style={{ marginRight: isMobile ? 2 : 3 }}>{opt.sign}</span>
              {isMobile ? "" : opt.label}
            </span>
          );
        })}
      </div>

      {/* ── Filter frame indicator ── */}
      {(() => {
        const filterActive = priceFilter || exchangeSourceFilter || exchangePrizeFilter;
        const filterLabels = [];
        if (priceFilter) filterLabels.push(t("filter_only_priced"));
        if (exchangeSourceFilter) filterLabels.push(t("filter_exchange_source"));
        if (exchangePrizeFilter) filterLabels.push(t("filter_exchange_prize"));

        return (
          <div style={{
            flex: 1, overflow: "auto", position: "relative",
            margin: filterActive ? (isMobile ? 3 : 4) : 0,
            border: filterActive ? `1px solid var(--accent-dim)` : "none",
            transition: "border var(--dur-fast) var(--ease-smooth)",
          }}>
            {/* Corner label */}
            {filterActive && (
              <div style={{
                position: "absolute", top: 0, right: 0, zIndex: 10,
                background: "var(--bg-surface)",
                padding: isMobile ? "1px 5px" : "2px 8px",
                display: "flex", gap: isMobile ? 2 : 6,
                fontSize: "var(--font-xxs)",
                color: "var(--accent)",
                letterSpacing: "0.05em",
                borderLeft: "1px solid var(--accent-dim)",
                borderBottom: "1px solid var(--accent-dim)",
                pointerEvents: "none",
              }}>
                <span style={{ fontWeight: 600 }}>{t("filter_label")}</span>
                {filterLabels.map((l, i) => (
                  <span key={i} style={{
                    color: "var(--text-muted)",
                    whiteSpace: isMobile ? "nowrap" : undefined,
                  }}>
                    {i > 0 && <span style={{ margin: "0 1px", color: "var(--border-mid)" }}>|</span>}
                    {l}
                  </span>
                ))}
              </div>
            )}

            {/* Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`,
              gridAutoRows: isMobile ? "minmax(46px, auto)" : "minmax(64px, auto)",
              gap: isMobile ? 2 : 3,
              padding: isMobile ? "3px 4px" : "4px 6px",
            }}>
              {sorted.length === 0 ? (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  color: "var(--text-muted)", fontSize: "var(--font-base)",
                  fontFamily: "var(--font-mono)",
                  gap: isMobile ? 6 : 8,
                  opacity: 0.6,
                }}>
                  <InboxOutlined style={{ fontSize: 36, opacity: 0.4 }} />
                  <span>{t("empty_list")}</span>
                  {priceFilter && <span style={{ fontSize: "var(--font-xs)", color: "var(--text-dim)" }}>({t("filter_only_priced")})</span>}
                </div>
              ) : (
                sorted.map((item) => {
                  const idx = items.indexOf(item);
                  const norm = norms[idx] || 0.5;
                  return (
                    <Tile key={item.key} item={item} config={config} norm={norm} index={idx} isMobile={isMobile}
                      onClick={() => { window.history.pushState(null, "", `/params/${type}/${item.key}`); window.dispatchEvent(new PopStateEvent("popstate")); }}
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
