import { useState, useEffect, useRef, useMemo } from "react";
import { useI18n } from "./i18n.jsx";
import { useItemIcon, displayPath } from "./assetLoader.jsx";
import VisualizationComponentPool from "./detail_visual/VisualizationComponentPool";
import { useData } from "./DataContext.jsx";
import { useT } from "./i18n.jsx";


/* ── Type-specific detail config ── */
const DETAIL_CONFIG = {
  vehicle: {
    heroMetrics: ["max_health", "max_speed", "mass"],
    heroLabels: { max_health: "HP", max_speed: "SPD", mass: "KG" },
    sections: [
      { label: "PHYSICAL",  keys: ["extent", "collision_model_extent", "offset", "top_offset", "visual_offset"] },
      { label: "MOVEMENT",  keys: ["acceleration", "max_reverse_speed", "max_rotation", "max_water_depth"] },
      { label: "CONFIG",    keys: ["respawn_time", "map_index", "tags", "tire_sets", "character_slots", "turrets", "visuals", "events", "effects"] },
    ],
  },
  weapon: {
    heroMetrics: ["projectile_result_kill_probability", "retrigger_time", "magazine_size"],
    heroLabels: { projectile_result_kill_probability: "KILL%", retrigger_time: "RATE", magazine_size: "MAG" },
    sections: [
      { label: "BALLISTICS", keys: ["projectile_speed", "projectiles_per_shot", "projectile_file", "projectile_result_class", "projectile_result_kill_decay_start_time", "projectile_result_kill_decay_end_time"] },
      { label: "HANDLING",   keys: ["accuracy_factor", "sustained_fire_grow_step", "sustained_fire_diminish_rate", "can_shoot_standing", "suppressed", "reload_one_at_a_time", "sight_range_modifier"] },
      { label: "ECONOMY",    keys: ["inventory_price", "inventory_encumbrance", "commonness", "capacities", "inherit_from", "class"] },
      { label: "DATA",       keys: ["stances", "modifiers", "animations", "sounds", "model_filename", "weak_hand_hold_offset"] },
    ],
  },
  carry_item: {
    heroMetrics: ["inventory_price", "inventory_encumbrance"],
    heroLabels: { inventory_price: "PRICE", inventory_encumbrance: "WGT" },
    sections: [
      { label: "ECONOMY", keys: ["commonness_value", "commonness_in_stock", "commonness_can_respawn_with", "capacities"] },
      { label: "WORLD",   keys: ["time_to_live_out_in_the_open", "player_death_drop_owner_lock_time"] },
      { label: "CONFIG",  keys: ["inherit_from", "model_mesh", "slot", "modifiers", "transform_on_consume"] },
    ],
  },
  projectile: {
    heroMetrics: ["slot", "class"],
    heroLabels: { slot: "SLOT", class: "CLASS" },
    sections: [
      { label: "BEHAVIOR", keys: ["result_class", "pulldown_in_air", "rotations"] },
      { label: "RESULTS",  keys: ["results"] },
      { label: "TRIGGERS", keys: ["triggers"] },
      { label: "VISUAL",   keys: ["models"] },
    ],
  },
  call: {
    heroMetrics: ["notify_metagame"],
    heroLabels: { notify_metagame: "GLOBAL" },
    sections: [
      { label: "DIALOGUE", keys: ["initiation_comment1", "initiation_comment2", "acknowledge_comment", "launch_comment"] },
      { label: "INVENTORY", keys: ["inventory"] },
      { label: "CAPACITIES", keys: ["capacities"] },
    ],
  },
  achievement: {
    heroMetrics: ["include_in_alltime_stats"],
    heroLabels: { include_in_alltime_stats: "ALL-TIME" },
    sections: [
      { label: "CRITERIA", keys: ["criteria_list"] },
      { label: "LEVELS",   keys: ["levels"] },
    ],
  },
  faction: {
    heroMetrics: ["radio_queue_size"],
    heroLabels: { radio_queue_size: "QUEUE" },
    sections: [
      { label: "COLORS",   keys: ["color"] },
      { label: "RANKS",    keys: ["ranks"] },
      { label: "SOLDIERS", keys: ["soldiers"] },
      { label: "ICONS",    keys: ["chat_icon", "chat_icon_supporter", "chat_icon_commander", "campaign_icon"] },
    ],
  },
};

/* ── Format ── */
function fmt(val, translateFn) {
  if (val === undefined || val === null) return "—";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(Math.round(val * 1000) / 1000);
  const s = String(val);
  const displayed = displayPath(s);
  return translateFn ? translateFn(displayed).slice(0, 200) : displayed.slice(0, 200);
}

/* ── Hero stat block ── */
function HeroCard({ value, raw, label }) {
  let display = value;
  if (label === "KILL%" && typeof raw === "number") display = (raw * 100).toFixed(0) + "%";
  if (label === "RATE" && typeof raw === "number") display = raw.toFixed(2) + "s";
  if (label === "MAG" && raw === -1) display = "∞";

  return (
    <div style={{
      border: "1px solid var(--border-mid)",
      background: "var(--bg-base)",
      padding: "6px 10px",
      textAlign: "center",
      minWidth: 52,
    }}>
      <div style={{
        fontSize: "var(--font-lg)", fontWeight: 800,
        color: "var(--accent)", lineHeight: 1.1,
        fontFamily: "var(--font-display)",
      }}>
        {String(display)}
      </div>
      <div style={{
        fontSize: "var(--font-xxs)", fontWeight: 600,
        color: "var(--text-muted)",
        marginTop: 3,
        letterSpacing: "0.08em",
      }}>
        {label}
      </div>
    </div>
  );
}

/* ── Lookup: build { key → {type, key} } map from data ── */
function buildItemLookup(data) {
  const map = new Map();
  if (!data) return map;
  for (const [type, items] of Object.entries(data)) {
    if (typeof items !== "object" || Array.isArray(items)) continue;
    for (const key of Object.keys(items)) {
      map.set(key.toLowerCase(), { type, key });
      // Also register the base name (without type suffix)
      const dotIdx = key.lastIndexOf(".");
      if (dotIdx > 0) {
        const base = key.slice(0, dotIdx).toLowerCase();
        if (!map.has(base)) map.set(base, { type, key });
      }
    }
  }
  return map;
}

/* ── Clickable item link ── */
function ItemLink({ text, target, onNavigate }) {
  return (
    <a
      href={`/params/${target.type}/${target.key}`}
      onClick={(e) => { e.preventDefault(); onNavigate(target.type, target.key); }}
      style={{
        color: "var(--accent)",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
        textUnderlineOffset: 2,
        cursor: "pointer",
        transition: "color 0.12s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--amber)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
    >
      {text}
    </a>
  );
}

/* ── Recursive property value display ── */
function PropVal({ raw, depth, tFn, lookupMap, onNavigate, uiT }) {
  if (raw === undefined || raw === null) return <span style={{ color: "var(--text-dim)" }}>—</span>;
  if (typeof raw === "boolean") return <span>{raw ? (uiT ? uiT("yes") : "TRUE") : (uiT ? uiT("no") : "FALSE")}</span>;
  if (typeof raw === "number") return <span>{String(Math.round(raw * 1000) / 1000)}</span>;
  if (typeof raw === "string") {
    const displayText = (tFn ? tFn(displayPath(raw)) : displayPath(raw)).slice(0, 300);
    const rawLower = raw.toLowerCase();
    if (lookupMap?.has(rawLower)) {
      return <ItemLink text={displayText} target={lookupMap.get(rawLower)} onNavigate={onNavigate} />;
    }
    return <span>{displayText}</span>;
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) return <span style={{ color: "var(--text-dim)" }}>[]</span>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", overflowX: "auto" }}>
        {raw.map((item, i) => (
          <div key={i} style={{
            borderLeft: "2px solid var(--border-subtle)",
            paddingLeft: 8,
            marginBottom: 2,
          }}>
            <div style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)", fontWeight: 700, marginBottom: 2 }}>
              [{i}]
            </div>
            <PropVal raw={item} depth={depth + 1} tFn={tFn} lookupMap={lookupMap} onNavigate={onNavigate} uiT={uiT} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof raw === "object") {
    const keys = Object.keys(raw);
    if (keys.length === 0) return <span style={{ color: "var(--text-dim)" }}>{'{}'}</span>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", overflowX: "auto" }}>
        {keys.map(k => (
          <div key={k} style={{
            display: "flex", gap: 6,
            borderBottom: "0.5px solid var(--border-subtle)",
            padding: "3px 0",
          }}>
              <span style={{
                color: "var(--amber)", fontSize: "var(--font-xxs)", fontWeight: 700,
                minWidth: 100, flexShrink: 0,
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {uiT ? uiT("field_" + k) || uiT(k) || k.replace(/_/g, " ") : k.replace(/_/g, " ")}
              </span>
            <div style={{ flex: 1 }}>
              <PropVal raw={raw[k]} depth={depth + 1} tFn={tFn} lookupMap={lookupMap} onNavigate={onNavigate} uiT={uiT} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(raw).slice(0, 200)}</span>;
}

/* ── Property row ── */
function PropRow({ label, raw, tFn, lookupMap, onNavigate, uiT }) {
  const isComplex = typeof raw === "object" && raw !== null;
  return (
    <div style={{ padding: "5px 0", fontSize: "var(--font-sm)" }}>
      <div style={{
        display: "flex", gap: 10,
        marginBottom: isComplex ? 6 : 0,
      }}>
        <span style={{
          color: "var(--amber)", fontWeight: 700,
          minWidth: 130, flexShrink: 0,
          fontSize: "var(--font-base)", textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          {uiT ? uiT("field_" + label) || uiT(label) || label.replace(/_/g, " ") : label.replace(/_/g, " ")}
        </span>
        {!isComplex && (
          <span style={{ color: "var(--text-primary)", wordBreak: "break-word", flex: 1 }}>
            {fmt(raw, tFn)}
          </span>
        )}
      </div>
      {isComplex && (
        <div style={{ paddingLeft: 20, overflowX: "auto", maxWidth: "100%" }}>
          <PropVal raw={raw} depth={0} tFn={tFn} lookupMap={lookupMap} onNavigate={onNavigate} uiT={uiT} />
        </div>
      )}
    </div>
  );
}

/* ── Detail ── */
export default function Detail({ item, type, onOpenRoll }) {
  if (!item) return null;

  const { translate } = useI18n();
  const config = DETAIL_CONFIG[type] || DETAIL_CONFIG.carry_item;
  const [expandedSections, setExpandedSections] = useState({});

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Gate: VisualizationComponentPool has its own internal hasContent check.
  // We pass true here and let the pool decide per-component.
  const hasVisData = true;

  // Clickable item references lookup
  const t = useT();
  const { data: fullData } = useData();
  const lookupMap = useMemo(() => buildItemLookup(fullData), [fullData]);
  const handleItemNavigate = (targetType, targetKey) => {
    window.history.pushState(null, "", `/params/${targetType}/${targetKey}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const iconUrl = useItemIcon(item);
  const [iconLoaded, setIconLoaded] = useState(false);
  const scrollRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // fade/shrink factor: 0 = top, 1 = fully scrolled past
  const fadeT = Math.min(scrollY / 180, 1);
  const cardScale = 1 - fadeT * 0.15;
  const cardOpacity = 1 - fadeT * 0.55;

  const isAI = item.key?.toLowerCase().includes("_ai.") || item.name?.toLowerCase().includes("_ai");
  const tags = [type, ...(item.tags ? (Array.isArray(item.tags) ? item.tags.map(t => t.name || t) : [item.tags]) : []), item.class, item.result_class, item.inherit_from]
    .filter(Boolean).slice(0, isAI ? 7 : 8);

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div ref={scrollRef} style={{
      height: "100%", overflow: "auto",
      background: "var(--bg-void)",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: "clamp(12px, 2vw, 24px)",
      }}>
        {/* ── Floating identity card (sticky top-left, scroll fade) ── */}
        <div
          style={{
            position: "sticky",
            top: "clamp(12px, 2vw, 24px)",
            zIndex: 20,
            isolation: "isolate",
            display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap",
            padding: "14px 18px",
            marginBottom: 24,
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            opacity: cardOpacity,
            transform: `scale(${cardScale})`,
            transformOrigin: "top left",
            animation: "slide-down 0.4s var(--ease-smooth) both",
            transition: "transform var(--dur-fast) var(--ease-smooth), border-color var(--dur-fast) var(--ease-smooth), opacity 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `scale(${cardScale}) translateY(-1px)`;
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = `scale(${cardScale}) translateY(0)`;
            e.currentTarget.style.borderColor = "var(--border-subtle)";
          }}
        >
          {/* Identity block - right aligned, icon on right */}
          <div style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            justifyContent: "flex-end",
            width: "100%",
          }}>
            {/* Info block */}
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 800,
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)", textTransform: "uppercase",
                lineHeight: 1.1,
                display: "inline-block",
                background: "var(--bg-deep)",
                padding: "2px 6px",
                animation: "fade-in 0.3s var(--ease-smooth) 0.08s both",
              }}>
              {translate(item.name || item.key || "—")}
            </div>
            <div style={{
              fontSize: "var(--font-base)", color: "var(--text-muted)", marginTop: 4,
                animation: "fade-in 0.3s var(--ease-smooth) 0.12s both",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 2 : 8,
                alignItems: isMobile ? "flex-end" : "center",
                justifyContent: "flex-end",
              }}>
                <span style={{ background: "var(--bg-deep)", padding: "1px 5px" }}>{item.key}</span>
                {!isMobile && <span style={{ color: "var(--border-mid)" }}>·</span>}
                <span style={{ color: "var(--accent)", textTransform: "uppercase", fontWeight: 600, background: "var(--bg-deep)", padding: "1px 5px" }}>{type}</span>
              </div>
              {/* Tags — collapsed on mobile */}
              {!isMobile && (
              <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {isAI && (
                  <span style={{
                    background: "var(--danger)", color: "#fff",
                    padding: "4px 8px", fontSize: "var(--font-base)", fontWeight: 800,
                    fontFamily: "var(--font-mono)", letterSpacing: "0.1em",
                  }}>AI</span>
                )}
                {tags.map((tag, ti) => (
                  <span key={tag} style={{
                    border: "1px solid var(--border-mid)",
                    padding: "4px 8px", fontSize: "var(--font-base)", fontWeight: 700,
                    color: ti === 0 ? "var(--accent)" : "var(--text-primary)",
                    textTransform: "uppercase",
                    animation: `scale-in 0.2s var(--ease-smooth) ${0.16 + ti * 0.035}s both`,
                  }}>
                    {String(tag).replace(/_/g, " ")}
                  </span>
                ))}
              </div>
              )}
            </div>
            {/* Icon: desktop right / mobile absolute left behind */}
            {iconUrl && (() => {
              const iconStyle = isMobile ? {
                position: "absolute", left: 4, bottom: 4,
                width: 64, height: 64,
                objectFit: "contain",
                zIndex: 1,
                pointerEvents: "none",
              } : {
                width: "clamp(60px, 6vw, 90px)", height: "clamp(60px, 6vw, 90px)",
                flexShrink: 0, alignSelf: "center",
                objectFit: "contain",
                animation: "scale-in 0.35s var(--ease-smooth) both",
              };
              const loadPlaceholder = {
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--bg-base)",
                zIndex: 0,
              };
              return (
                <div style={{ position: "relative", flexShrink: 0, alignSelf: "center", ...(isMobile ? { width: 64, height: 64, position: "absolute", left: 4, bottom: 4, zIndex: 1 } : { width: "clamp(60px, 6vw, 90px)", height: "clamp(60px, 6vw, 90px)" }) }}>
                  {!iconLoaded && (
                    <div style={loadPlaceholder}>
                      <div style={{
                        width: isMobile ? 20 : 28, height: isMobile ? 20 : 28,
                        border: "2px solid var(--border-mid)",
                        borderTopColor: "var(--accent)",
                        borderRadius: "50%",
                        animation: "boot-spin 0.8s linear infinite",
                      }} />
                    </div>
                  )}
                  <img src={iconUrl} alt=""
                    style={{ ...iconStyle, opacity: iconLoaded ? 1 : 0, transition: "opacity 0.25s ease" }}
                    onLoad={() => setIconLoaded(true)}
                    onError={() => setIconLoaded(true)}
                  />
                </div>
              );
            })()}
          </div>
        </div>

        {/* Separator */}
        <div style={{
          height: 3, background: "var(--border-heavy)",
          marginBottom: 20, opacity: 0.3,
          animation: "scale-in 0.4s var(--ease-smooth) 0.22s both",
          transformOrigin: "left center",
        }} />

        {hasVisData && (
          <div style={{ marginBottom: 24 }}>
            <VisualizationComponentPool
              item={item}
              onDataNavigate={(targetKey) => {
                window.location.hash = `#/params/${type}/${targetKey}`;
              }}
              onOpenRoll={onOpenRoll}
            />
          </div>
        )}

        {/* Separator */}
        <div style={{
          height: 3, background: "var(--border-heavy)",
          marginBottom: 20, opacity: 0.3,
          animation: "scale-in 0.4s var(--ease-smooth) 0.15s both",
          transformOrigin: "left center",
        }} />

        {/* ── Property Sections ── */}
        {config.sections.map(section => {
          const sectionKeys = section.keys.filter(k => item[k] !== undefined);
          if (sectionKeys.length === 0) return null;
          const isExpanded = expandedSections[section.label] !== false;

          return (
            <div key={section.label} style={{ marginBottom: 12 }}>
              <div
                onClick={() => toggleSection(section.label)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 0", cursor: "pointer",
                  fontSize: "var(--font-md)", fontWeight: 700,
                  color: "var(--text-muted)", textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  borderBottom: isExpanded ? "2px solid var(--border-mid)" : "2px solid transparent",
                  marginBottom: isExpanded ? 8 : 0,
                }}
              >
                <span style={{
                  display: "inline-block",
                  fontWeight: 800, color: "var(--amber)",
                }}>
                  {isExpanded ? "▼" : "▶"}
                </span>
                <span style={{ color: "var(--text-primary)" }}>{t(section.label.toLowerCase()) || section.label}</span>
                <span style={{ color: "var(--text-dim)", fontSize: 8 }}>
                  ({sectionKeys.length})
                </span>
              </div>
              {isExpanded && (
                <div style={{ paddingLeft: 20, animation: "slide-down 0.25s var(--ease-smooth) both", overflow: "hidden" }}>
                  {sectionKeys.map(key => (
                    <PropRow key={key} label={key} raw={item[key]} tFn={translate} lookupMap={lookupMap} onNavigate={handleItemNavigate} uiT={t} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Unmatched keys ── */}
        {(() => {
          const shown = config.sections.flatMap(s => s.keys);
          shown.push(...config.heroMetrics, "name", "key", "type", "hud_icon_filename", "tags", "class", "result_class", "inherit_from");
          const remaining = Object.keys(item).filter(k => !shown.includes(k));
          if (remaining.length === 0) return null;
          return (
            <div style={{ marginTop: 16 }}>
              <div style={{
                fontSize: "var(--font-sm)", fontWeight: 700,
                color: "var(--text-muted)", textTransform: "uppercase",
                padding: "8px 0", borderBottom: "2px solid var(--border-mid)",
                marginBottom: 8, letterSpacing: "0.1em",
              }}>
                {t("other")} ({remaining.length})
              </div>
              <div style={{ paddingLeft: 20 }}>
                {remaining.map(key => (
                  <PropRow key={key} label={key} raw={item[key]} tFn={translate} lookupMap={lookupMap} onNavigate={handleItemNavigate} uiT={t} />
                ))}
              </div>
            </div>
          );
        })()}


      </div>
    </div>
  );
}
