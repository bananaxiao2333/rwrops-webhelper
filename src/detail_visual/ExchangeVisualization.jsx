import { Icon } from "@iconify/react";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import { useI18n } from "../i18n.jsx";

/* ── Item chip with icon, name, and weight ── */
function PrizeChip({ entry, data, maxScore, totalScore }) {
  const { translate } = useI18n();
  const fullKey = entry.key;
  const type = entry.class;
  const item = data?.[type]?.[fullKey];
  const iconUrl = useItemIcon(item || { hud_icon_filename: null });

  const fallbackIcon =
    type === "weapon" ? "mdi:sword" :
    type === "carry_item" ? "mdi:package-variant-closed" :
    type === "projectile" ? "mdi:missile" :
    type === "vehicle" ? "mdi:truck" :
    "mdi:help-circle-outline";

  // Weight bar relative to max weight in pool
  const weightRatio = maxScore > 0 ? entry.score / maxScore : 0;
  const prob = totalScore > 0 ? entry.score / totalScore : 0;
  const pctStr = prob < 0.01 ? (prob * 100).toFixed(2) : (prob * 100).toFixed(1);

  return (
    <a
          href={`#/params/${type}/${fullKey}`}
          onClick={(e) => { e.preventDefault(); window.location.hash = `#/params/${type}/${fullKey}`; }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px",
        border: "1px solid var(--border-subtle)",
        borderLeft: `3px solid color-mix(in srgb, var(--accent) ${weightRatio * 100}%, transparent)`,
        background: `linear-gradient(90deg, rgba(245,158,11,${0.02 + weightRatio * 0.06}) 0%, var(--bg-base) 100%)`,
        cursor: "pointer",
        textDecoration: "none",
        transition: "all 0.15s var(--ease-smooth)",
        fontSize: "var(--font-xs)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.background = `linear-gradient(90deg, rgba(245,158,11,${0.02 + weightRatio * 0.06}) 0%, var(--bg-base) 100%)`;
      }}
      title={fullKey}
    >
      {/* Item icon */}
      <div style={{
        width: 28, height: 28,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border-mid)",
        background: "var(--bg-void)",
        flexShrink: 0,
      }}>
        {iconUrl ? (
          <img src={iconUrl} alt="" style={{ width: 22, height: 22, objectFit: "contain", imageRendering: "pixelated" }} />
        ) : (
          <Icon icon={fallbackIcon} style={{ fontSize: 16, color: "var(--text-muted)" }} />
        )}
      </div>

      {/* Name */}
      <span style={{
        flex: 1, minWidth: 0,
        color: "var(--text-primary)",
        fontSize: "var(--font-sm)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        letterSpacing: "0.02em",
      }}>
        {translate(item?.name) || fullKey.split(".").slice(0, -1).join(".")}
      </span>

      {/* Count badge */}
      {entry.count > 1 && (
        <span style={{
          fontSize: "var(--font-xxs)", fontWeight: 700,
          color: "var(--accent)",
          background: "rgba(245,158,11,0.1)",
          padding: "1px 5px",
          flexShrink: 0,
        }}>
          ×{entry.count}
        </span>
      )}

      {/* Probability */}
      <span style={{
        fontSize: "var(--font-xxs)", fontWeight: 700,
        color: "var(--amber)",
        minWidth: 44, textAlign: "right",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.04em",
        flexShrink: 0,
      }}>
        {pctStr}%
      </span>
    </a>
  );
}

/* ── Inline source chip (own component for hook safety) ── */
function SourceChip({ entry, data, translate }) {
  const item = data?.[entry.class]?.[entry.key];
  const iconUrl = useItemIcon(item || { hud_icon_filename: null });
  return (
    <a
      href={`#/params/${entry.class}/${entry.key}`}
      onClick={(e) => { e.preventDefault(); window.location.hash = `#/params/${entry.class}/${entry.key}`; }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "4px 8px",
        border: "1px solid var(--border-mid)",
        background: "var(--bg-surface)",
        cursor: "pointer", textDecoration: "none",
        transition: "all 0.12s var(--ease-smooth)",
        fontSize: "var(--font-xs)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-mid)";
        e.currentTarget.style.background = "var(--bg-surface)";
      }}
      title={entry.key}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" style={{ width: 18, height: 18, objectFit: "contain", imageRendering: "pixelated" }} />
      ) : (
        <Icon icon="mdi:package-variant-closed" style={{ fontSize: 14, color: "var(--text-muted)" }} />
      )}
      <span style={{ color: "var(--text-primary)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {translate(item?.name) || entry.key.split(".")[0]}
      </span>
    </a>
  );
}

/* ── ExchangeVisualization ── */
export default function ExchangeVisualization({ item, onOpenRoll }) {
  const { data } = useData();
  const { t, translate } = useI18n();
  const exchangePrizes = item?.exchange_prizes;
  const exchangeSources = item?.exchange_sources;

  if (!exchangePrizes && !exchangeSources) return null;

  return (
    <div style={{
      border: "1px solid var(--border-mid)",
      background: "var(--bg-surface)",
      fontFamily: "var(--font-mono)",
      position: "relative",
    }}>
      {/* ── Forward: Exchange Prizes ── */}
      {exchangePrizes && exchangePrizes.length > 0 && (
        <>
          {/* Section header */}
          <div style={{
            padding: "10px 14px",
            borderBottom: "2px solid var(--accent)",
            background: "linear-gradient(180deg, rgba(245,158,11,0.06) 0%, transparent 100%)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Icon icon="mdi:gift-open-outline" style={{ fontSize: 18, color: "var(--accent)" }} />
            <span style={{
              fontSize: "var(--font-base)", fontWeight: 700,
              color: "var(--accent)",
              textTransform: "uppercase", letterSpacing: "0.12em",
            }}>
              {t("exchange_title")}
            </span>
            <span style={{
              marginLeft: "auto",
              fontSize: "var(--font-xxs)", color: "var(--text-muted)",
              letterSpacing: "0.06em",
            }}>
              {exchangePrizes.length} {exchangePrizes.length > 1 ? "SETS" : "SET"}
            </span>
            <span onClick={() => onOpenRoll && onOpenRoll(item)}
              style={{
                cursor: "pointer", userSelect: "none",
                padding: "2px 10px",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                fontSize: "var(--font-xxs)", fontWeight: 700,
                letterSpacing: "0.1em",
                marginLeft: 8,
                transition: "all 0.12s var(--ease-smooth)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.color = "var(--bg-deep)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--accent)";
              }}
            >
              {t("roll_draw")}
            </span>
          </div>

          {exchangePrizes.map((cat, ci) => (
            <div key={ci} style={{
              borderBottom: ci < exchangePrizes.length - 1 ? "1px solid var(--border-heavy)" : "none",
            }}>
              {/* Category label */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px",
                background: "var(--bg-base)",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "var(--font-sm)",
                color: "var(--text-primary)",
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}>
                <span style={{
                  width: 4, height: 14,
                  background: "var(--accent)",
                  flexShrink: 0,
                }} />
                {cat.category?.replace("Setup ", "") || `Set ${ci + 1}`}
              </div>

              {/* Prize pools (auto columns: 1 on mobile, 2-3 on desktop) */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(250px, 100%), 1fr))",
                gap: 8,
                padding: "10px 10px 12px",
              }}>
                {cat.prize_pools.map((pool, pi) => {
                  const maxScore = Math.max(...pool.map(p => p.score), 0);
                  const totalScore = pool.reduce((s, p) => s + p.score, 0);

                  return (
                    <div key={pi} style={{
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-base)",
                      animation: `fade-in 0.3s var(--ease-smooth) ${0.08 + pi * 0.05}s both`,
                    }}>
                      {/* Pool header */}
                      <div style={{
                        padding: "5px 10px",
                        borderBottom: "1px solid var(--border-subtle)",
                        background: "rgba(245,158,11,0.03)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        fontSize: "var(--font-xxs)",
                        color: "var(--text-muted)",
                        letterSpacing: "0.06em",
                      }}>
                        <span>{t("pool_label", pi + 1)}</span>
                        <div style={{ display: "flex", gap: 12 }}>
                          <span>{t("items_count", pool.length)}</span>
                          <span style={{ color: "var(--amber)" }}>
                            Σ {totalScore.toFixed(1)} {t("weight_label")}
                          </span>
                        </div>
                      </div>

                      {/* Weight header */}
                      <div style={{
                        display: "flex",
                        padding: "3px 10px 3px 60px",
                        fontSize: "var(--font-xxxs, 8px)",
                        color: "var(--text-dim)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}>
                        <span style={{ flex: 1 }}>ITEM</span>
                        <span style={{ width: 44, textAlign: "right" }}>%</span>
                      </div>

                      {/* Prize items (sorted by weight desc) */}
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {[...pool].sort((a, b) => (b.score || 0) - (a.score || 0)).map((prize, i) => (
                          <div key={i} style={{
                            borderBottom: i < pool.length - 1 ? "0.5px solid var(--border-subtle)" : "none",
                            animation: `fade-in 0.2s var(--ease-smooth) ${0.1 + i * 0.025}s both`,
                          }}>
                            <PrizeChip entry={prize} data={data} maxScore={maxScore} totalScore={totalScore} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Reverse: Exchange Sources ── */}
      {exchangeSources && exchangeSources.length > 0 && (
        <>
          {exchangePrizes && exchangePrizes.length > 0 && (
            <div style={{ height: 1, background: "var(--border-heavy)" }} />
          )}

          {/* Section header */}
          <div style={{
            padding: "10px 14px",
            borderBottom: "2px solid var(--accent-dim)",
            background: "linear-gradient(180deg, rgba(180,83,9,0.04) 0%, transparent 100%)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Icon icon="mdi:source-branch" style={{ fontSize: 18, color: "var(--accent-dim)" }} />
            <span style={{
              fontSize: "var(--font-base)", fontWeight: 700,
              color: "var(--amber)",
              textTransform: "uppercase", letterSpacing: "0.12em",
            }}>
              {t("sources_title")}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", padding: "10px 14px 12px" }}>
            {exchangeSources.map((src, si) => (
              <div key={si} style={{
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
                padding: "8px 10px",
                border: "1px solid var(--border-subtle)",
                borderLeft: "3px solid var(--accent-dim)",
                background: "var(--bg-base)",
                animation: `fade-in 0.25s var(--ease-smooth) ${0.06 + si * 0.05}s both`,
                marginBottom: si < exchangeSources.length - 1 ? 6 : 0,
              }}>
                {/* Arrow */}
                <span style={{
                  color: "var(--accent-dim)", fontSize: 12,
                  fontWeight: 700, flexShrink: 0,
                  transform: "rotate(90deg)",
                }}>
                  &#9650;
                </span>

                {/* Input items */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
                  {src.input.map((inp, ii) => (
                    <SourceChip key={ii} entry={inp} data={data} translate={translate} />
                  ))}
                </div>

                {/* Category badge */}
                <span style={{
                  fontSize: "var(--font-xxs)",
                  color: "var(--text-dim)",
                  padding: "2px 7px",
                  border: "1px solid var(--border-subtle)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}>
                  {src.category?.replace("Setup ", "")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
