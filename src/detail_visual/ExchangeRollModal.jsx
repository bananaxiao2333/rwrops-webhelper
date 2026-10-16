import { useState, useRef } from "react";
import { useItemIcon } from "../assetLoader.jsx";
import { useI18n } from "../i18n.jsx";
import { Icon } from "@iconify/react";
import { rewardTables, poolsOf, tableLabel } from "./rewardTables.js";

function pickFromPool(pool) {
  const total = pool.reduce((s, p) => s + (p.score || 0), 0);
  if (total <= 0) return pool[0] || null;
  let r = Math.random() * total;
  for (const item of pool) {
    r -= item.score || 0;
    if (r <= 0) return item;
  }
  return pool[pool.length - 1];
}

function PrizeResult({ entry, data, delay }) {
  const item = data?.[entry.class]?.[entry.key];
  const iconUrl = useItemIcon(item || { hud_icon_filename: null });
  const { translate, t } = useI18n();

  return (
    <a
      href={`/params/${entry.class}/${entry.key}`}
      onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", `/params/${entry.class}/${entry.key}`); window.dispatchEvent(new PopStateEvent("popstate")); }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-base)",
        cursor: "pointer", textDecoration: "none",
        animation: `prize-reveal 0.35s var(--ease-smooth) ${delay}s both`,
        transition: "border-color 0.12s var(--ease-smooth)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
    >
      <div style={{
        width: 32, height: 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border-mid)",
        background: "var(--bg-void)",
        flexShrink: 0,
      }}>
        {iconUrl ? (
          <img src={iconUrl} alt="" style={{ width: 24, height: 24, objectFit: "contain", imageRendering: "pixelated" }} />
        ) : (
          <Icon icon="mdi:help-circle-outline" style={{ fontSize: 18, color: "var(--text-muted)" }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "var(--font-sm)", fontWeight: 600,
          color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {translate(item?.name) || entry.key}
        </div>
        <div style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", marginTop: 1 }}>
          {translate(entry.class) || t(entry.class) || entry.class}
          {entry.count > 1 && ` ×${entry.count}`}
        </div>
      </div>
    </a>
  );
}

/* ── Result tile (own component for hook safety) ── */
function ResultTile({ entry, data, index }) {
  const type = entry.class;
  const item = data?.[type]?.[entry.key];
  const iconUrl = useItemIcon(item || { hud_icon_filename: null });
  const { translate, t } = useI18n();

  const colorBase =
    type === "weapon" ? [245, 158, 11] :
    type === "carry_item" ? [136, 153, 170] :
    type === "projectile" ? [239, 68, 68] :
    type === "vehicle" ? [107, 140, 164] :
    [245, 158, 11];
  const [r, g, b] = colorBase;

  return (
    <a
      href={`/params/${type}/${entry.key}`}
      onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", `/params/${type}/${entry.key}`); window.dispatchEvent(new PopStateEvent("popstate")); }}
      style={{
        background: iconUrl
          ? `url(${iconUrl}) left center / contain no-repeat, rgb(${r},${g},${b})`
          : `rgb(${r},${g},${b})`,
        padding: "8px 10px",
        cursor: "pointer",
        border: "1px solid transparent",
        textDecoration: "none",
        transition: "all 0.15s ease",
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        minHeight: 56,
        animation: `scale-in 0.25s var(--ease-smooth) ${0.08 + index * 0.03}s both`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "scale(1.03)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "scale(1)"; }}
    >
      {entry.count > 1 && (
        <div style={{
          position: "absolute", top: 3, left: 3,
          background: "var(--accent)",
          color: "var(--bg-deep)",
          fontSize: "var(--font-xxs)", fontWeight: 800,
          padding: "0 5px",
          lineHeight: "16px",
          fontFamily: "var(--font-mono)",
        }}>
          ×{entry.count}
        </div>
      )}
      <div style={{ textAlign: "right", maxWidth: "70%" }}>
        <div style={{
          fontSize: "var(--font-sm)", fontWeight: 700,
          fontFamily: "var(--font-display)",
          color: "#fff", letterSpacing: "0.03em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {translate(item?.name) || entry.key}
        </div>
        <div style={{
          fontSize: "var(--font-xxs)",
          color: "var(--bg-elevated)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {translate(type) || t(type) || type}
        </div>
      </div>
    </a>
  );
}

function SpeechBubble({ text, highlight }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      backgroundColor: "var(--bg-base)",
      border: "1px solid var(--border-mid)",
      padding: "12px 14px",
      maxWidth: "100%",
    }}>
      <div style={{
        width: 10, height: 10,
        borderLeft: "1px solid var(--border-mid)",
        borderBottom: "1px solid var(--border-mid)",
        background: "var(--bg-base)",
        transform: "rotate(45deg)",
        flexShrink: 0, marginTop: 4,
      }} />
      <div style={{
        fontSize: "var(--font-sm)", color: "var(--text-secondary)",
        lineHeight: 1.6, fontFamily: "var(--font-text)", fontStyle: "italic",
      }}>
        {text}
        {highlight && <span style={{ color: "var(--accent)", fontWeight: 600 }}> {highlight}</span>}
      </div>
    </div>
  );
}

export default function ExchangeRollModal({ data, item, onClose }) {
  const { t, translate } = useI18n();
  const timerRef = useRef(null);

  const [drawCount, setDrawCount] = useState(1);
  const [inputStr, setInputStr] = useState("1");
  const [phase, setPhase] = useState("setup");
  const [results, setResults] = useState([]);

  // The tables this item can trigger; each table's pools are what a draw picks
  // from. Resolved from the `reward_pool` records the item points at.
  const tables = rewardTables(item, data, "reward_inputs");
  const pools = poolsOf(tables);
  const categoryLabel = tables.length ? tableLabel(tables[0].table, tables[0].group) : "";
  const inputName = translate(item?.name) || item?.key?.split(".")[0] || "";

  const handleStart = () => {
    if (pools.length === 0) return;
    setPhase("waiting");

    const allResults = [];
    for (let d = 0; d < drawCount; d++) {
      allResults.push(pools.map(pool => pickFromPool(pool)));
    }
    setResults(allResults);

    timerRef.current = setTimeout(() => setPhase("reveal"), 1500);
  };

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onClose();
  };

  useState(() => () => { if (timerRef.current) clearTimeout(timerRef.current); });

  const totalPoolItems = pools.reduce((s, p) => s + p.length, 0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-deep)",
      backdropFilter: "blur(4px)",
      animation: "fade-in 0.2s ease both",
      fontFamily: "var(--font-mono)",
    }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{
        width: "min(560px, 94vw)",
        maxHeight: "90vh",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-mid)",
        boxShadow: "none",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        animation: "scale-in 0.3s var(--ease-smooth) both",
      }}>
        <div style={{
          padding: "14px 18px",
          borderBottom: "2px solid var(--accent)",
          background: "var(--tint-warn)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon icon="mdi:gift-open-outline" style={{ fontSize: 20, color: "var(--accent)" }} />
          <span style={{ fontSize: "var(--font-md)", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {t("exchange_title")} · {t("roll_draw")}
          </span>
          <span onClick={handleClose}
            style={{ marginLeft: "auto", cursor: "pointer", fontSize: 18, color: "var(--text-dim)", padding: "2px 6px" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
          >&#10005;</span>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "18px" }}>
          {/* ── SETUP ── */}
          {phase === "setup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>{t("roll_draw_count")}:</span>
                <input type="number" min={1} max={999}
                  value={inputStr}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") { setInputStr(""); return; }
                    const v = parseInt(raw, 10);
                    if (!isNaN(v) && v >= 1 && v <= 999) {
                      setInputStr(raw);
                      setDrawCount(v);
                    }
                  }}
                  onBlur={() => {
                    const v = parseInt(inputStr, 10);
                    if (isNaN(v) || v < 1) { setInputStr("1"); setDrawCount(1); }
                    else if (v > 999) { setInputStr("999"); setDrawCount(999); }
                  }}
                  style={{
                    width: 50, padding: "3px 6px", textAlign: "center",
                    background: "var(--bg-base)", color: "var(--accent)",
                    border: "1px solid var(--border-mid)",
                    fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)",
                    fontWeight: 700, outline: "none",
                  }}
                />
                {[1, 5, 10, 25, 50, 100].map(n => {
                  const isActive = drawCount === n;
                  return (
                    <span key={n} onClick={() => { setDrawCount(n); setInputStr(String(n)); }}
                      style={{
                        padding: "3px 8px", cursor: "pointer",
                        border: isActive ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                        background: isActive ? "var(--tint-warn)" : "var(--bg-base)",
                        color: isActive ? "var(--accent)" : "var(--text-muted)",
                        fontSize: "var(--font-xs)", fontWeight: isActive ? 700 : 400,
                        transition: "all 0.12s var(--ease-smooth)",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = "var(--accent-dim)"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                    >{n}</span>
                  );
                })}
              </div>

              {categoryLabel && (
                <SpeechBubble text={t("roll_let's_see") + "..."} />
              )}

              <div style={{
                fontSize: "var(--font-xs)", color: "var(--text-dim)", textAlign: "center",
                padding: "10px", border: "1px solid var(--border-subtle)", background: "var(--bg-base)",
              }}>
                {pools.length} {t(pools.length > 1 ? "roll_pools" : "roll_pool")} · {totalPoolItems} {t("roll_items")}
              </div>

              <button onClick={handleStart}
                style={{
                  padding: "10px 32px", alignSelf: "center",
                  background: "transparent", border: "2px solid var(--accent)",
                  color: "var(--accent)", fontSize: "var(--font-md)", fontWeight: 700,
                  fontFamily: "var(--font-display)", letterSpacing: "0.15em", textTransform: "uppercase",
                  cursor: "pointer", transition: "all 0.2s var(--ease-smooth)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent)";
                  e.currentTarget.style.color = "var(--bg-deep)";
                  e.currentTarget.style.boxShadow = "0 0 24px var(--tint-warn)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--accent)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >{t("roll_start")}</button>
            </div>
          )}

          {/* ── WAITING ── */}
          {phase === "waiting" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 0" }}>
              <SpeechBubble
                text={t("roll_let's_see")}
                highlight={inputName || categoryLabel}
              />
              <div style={{
                color: "var(--accent)", fontSize: "var(--font-lg)",
                fontFamily: "var(--font-display)", letterSpacing: "0.12em",
                animation: "breathe 0.9s ease-in-out infinite",
              }}>{t("roll_scanning")}</div>
            </div>
          )}

          {/* ── REVEAL — merged card grid ── */}
          {phase === "reveal" && (() => {
            // Flatten all draws, merge duplicates by key+class, sum count
            const merged = new Map();
            for (const draw of results) {
              for (const prize of draw) {
                if (!prize) continue;
                const id = prize.key + "::" + prize.class;
                if (merged.has(id)) {
                  merged.get(id).count += (prize.count || 1);
                } else {
                  merged.set(id, { ...prize, count: prize.count || 1 });
                }
              }
            }
            // Sort by price descending (no-price items last)
            function itemPrice(type, key) {
              const item = data?.[type]?.[key];
              const raw = item?.inventory_price ?? item?.inventory?.price;
              return raw !== undefined && raw !== null ? parseFloat(raw) : -1;
            }
            const tileItems = Array.from(merged.values()).sort((a, b) => {
              const pa = itemPrice(a.class, a.key);
              const pb = itemPrice(b.class, b.key);
              if (pa === -1 && pb === -1) return 0;
              if (pa === -1) return 1;
              if (pb === -1) return -1;
              return pb - pa;
            });

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{
                  padding: "8px 12px", textAlign: "center",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-base)",
                  fontSize: "var(--font-sm)", color: "var(--amber)", fontWeight: 600,
                  animation: "fade-in 0.3s var(--ease-smooth) both",
                }}>
                  {t("roll_result", (inputName || categoryLabel) + "!")}
                </div>

                {/* Tile grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 4,
                }}>
                  {tileItems.map((entry, i) => (
                    <ResultTile key={entry.key} entry={entry} data={data} index={i} />
                  ))}
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button onClick={() => { setPhase("setup"); setResults([]); }}
                    style={{
                      padding: "8px 20px", background: "transparent",
                      border: "1px solid var(--accent)", color: "var(--accent)",
                      fontSize: "var(--font-sm)", fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      cursor: "pointer", transition: "all 0.15s var(--ease-smooth)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "var(--bg-deep)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
                  >{t("roll_again")}</button>
                  <button onClick={handleClose}
                    style={{
                      padding: "8px 20px", background: "transparent",
                      border: "1px solid var(--border-mid)", color: "var(--text-muted)",
                      fontSize: "var(--font-sm)", fontWeight: 600,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.1em", textTransform: "uppercase",
                      cursor: "pointer", transition: "all 0.15s var(--ease-smooth)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--danger)"; e.currentTarget.style.color = "var(--danger)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-mid)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                  >{t("roll_close")}</button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <style>{`
        @keyframes prize-reveal {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
