import { Icon } from "@iconify/react";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import { useI18n } from "../i18n.jsx";
import { navigateTo } from "../hashRouter.js";

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

  const weightRatio = maxScore > 0 ? entry.score / maxScore : 0;
  const prob = totalScore > 0 ? entry.score / totalScore : 0;
  const pctStr = prob < 0.01 ? (prob * 100).toFixed(2) : (prob * 100).toFixed(1);

  return (
    <a
      href={`/params/${type}/${fullKey}`}
      onClick={(e) => { e.preventDefault(); navigateTo(`/params/${type}/${fullKey}`); }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 8px",
        // Weight used to be a translucent accent wash; a solid accent bar of
        // varying width carries the same signal without any alpha.
        borderLeft: `${1 + Math.round(weightRatio * 3)}px solid var(--accent)`,
        cursor: "pointer", textDecoration: "none",
        fontSize: "var(--font-xs)",
        transition: "background var(--dur-fast) var(--ease-smooth)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      title={fullKey}
    >
      <div style={{
        width: 26, height: 26,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}>
        {iconUrl ? (
          <img src={iconUrl} alt="" style={{ width: 20, height: 20, objectFit: "contain", imageRendering: "pixelated" }} />
        ) : (
          <Icon icon={fallbackIcon} style={{ fontSize: 15, color: "var(--text-muted)" }} />
        )}
      </div>

      <span style={{
        flex: 1, minWidth: 0,
        color: "var(--text-primary)", fontSize: "var(--font-sm)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {translate(item?.name) || fullKey.split(".").slice(0, -1).join(".")}
      </span>

      {entry.count > 1 && (
        <span style={{ fontSize: "var(--font-xxs)", fontWeight: 700, color: "var(--accent)", flexShrink: 0, fontFamily: "var(--font-mono)" }}>
          ×{entry.count}
        </span>
      )}

      <span style={{
        fontSize: "var(--font-xxs)", fontWeight: 700, color: "var(--amber)",
        minWidth: 44, textAlign: "right", fontVariantNumeric: "tabular-nums",
        flexShrink: 0, fontFamily: "var(--font-mono)",
      }}>
        {pctStr}%
      </span>
    </a>
  );
}

function SourceChip({ entry, data, translate }) {
  const item = data?.[entry.class]?.[entry.key];
  const iconUrl = useItemIcon(item || { hud_icon_filename: null });
  return (
    <a
      href={`/params/${entry.class}/${entry.key}`}
      onClick={(e) => { e.preventDefault(); navigateTo(`/params/${entry.class}/${entry.key}`); }}
      className="article-chip"
      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
      title={entry.key}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" style={{ width: 18, height: 18, objectFit: "contain", imageRendering: "pixelated" }} />
      ) : (
        <Icon icon="mdi:package-variant-closed" style={{ fontSize: 14, color: "var(--text-muted)" }} />
      )}
      <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {translate(item?.name) || entry.key.split(".")[0]}
      </span>
    </a>
  );
}

export default function ExchangeVisualization({ item, onOpenRoll }) {
  const { data } = useData();
  const { t, translate } = useI18n();
  const exchangePrizes = item?.exchange_prizes;
  const exchangeSources = item?.exchange_sources;

  if (!exchangePrizes && !exchangeSources) return null;

  return (
    <>
      {exchangePrizes && exchangePrizes.length > 0 && (
        <section className="viz-section">
          <div className="viz-section-title">
            <Icon icon="mdi:gift-open-outline" className="viz-icon" />
            <h2>{t("exchange_title")}</h2>
            <span className="viz-count">{exchangePrizes.length} {exchangePrizes.length > 1 ? "SETS" : "SET"}</span>
            <span className="viz-actions">
              <span onClick={() => onOpenRoll && onOpenRoll(item)}
                style={{
                  cursor: "pointer", userSelect: "none",
                  padding: "2px 10px",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  fontSize: "var(--font-xxs)", fontWeight: 700,
                  letterSpacing: "0.08em",
                  transition: "all var(--dur-fast) var(--ease-smooth)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "var(--bg-deep)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
              >
                <Icon icon="mdi:dice-3" style={{ fontSize: 10, marginRight: 3 }} />
                {t("roll_draw")}
              </span>
            </span>
          </div>

          {exchangePrizes.map((cat, ci) => (
            <div key={ci} className="viz-block">
              <h3 className="viz-block-title">{cat.category?.replace("Setup ", "") || `Set ${ci + 1}`}</h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(250px, 100%), 1fr))",
                gap: 12, marginTop: 6,
              }}>
                {cat.prize_pools.map((pool, pi) => {
                  const maxScore = Math.max(...pool.map(p => p.score), 0);
                  const totalScore = pool.reduce((s, p) => s + p.score, 0);
                  return (
                    <div key={pi}>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        paddingBottom: 4, marginBottom: 2,
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: "var(--font-xxs)", color: "var(--text-muted)", letterSpacing: "0.06em",
                      }}>
                        <span>{t("pool_label", pi + 1)}</span>
                        <span style={{ display: "flex", gap: 12, fontFamily: "var(--font-mono)" }}>
                          <span>{t("items_count", pool.length)}</span>
                          <span style={{ color: "var(--amber)" }}>Σ {totalScore.toFixed(1)}</span>
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {[...pool].sort((a, b) => (b.score || 0) - (a.score || 0)).map((prize, i) => (
                          <PrizeChip key={i} entry={prize} data={data} maxScore={maxScore} totalScore={totalScore} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {exchangeSources && exchangeSources.length > 0 && (
        <section className="viz-section">
          <div className="viz-section-title">
            <Icon icon="mdi:source-branch" className="viz-icon" />
            <h2>{t("sources_title")}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {exchangeSources.map((src, si) => (
              <div key={si} style={{
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
                paddingLeft: 10, borderLeft: "3px solid var(--accent-dim)",
              }}>
                <Icon icon="mdi:arrow-down-thin" style={{ fontSize: 14, color: "var(--accent-dim)", flexShrink: 0 }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
                  {src.input.map((inp, ii) => (
                    <SourceChip key={ii} entry={inp} data={data} translate={translate} />
                  ))}
                </div>
                <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {src.category?.replace("Setup ", "")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
