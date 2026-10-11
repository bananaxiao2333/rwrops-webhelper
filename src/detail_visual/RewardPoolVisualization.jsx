import { Icon } from "@iconify/react";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import { useI18n } from "../i18n.jsx";
import { navigateTo } from "../hashRouter.js";
import VizFrame from "./VizFrame";

/**
 * A weighted reward table (`reward_pool`) read out of the game's scripts.
 *
 * The shape is `pools: [[{key, class, score, count}]]` — an array of *separate*
 * pools, each drawn independently: one entry comes out of a pool, picked with
 * probability `score ÷ Σscore` inside that pool. So the honest thing to show is
 * both numbers: the raw weight (what the script literally says) and the chance
 * it actually implies (what a player feels).
 *
 * These tables are the reason `reward_sources` exists on entities: a weapon
 * whose page says "from reward pools" points back at one of these records.
 */
function PoolEntry({ entry, data, total, maxScore }) {
  const { translate } = useI18n();
  const type = entry.class;
  const item = data?.[type]?.[entry.key];
  const iconUrl = useItemIcon(item || { hud_icon_filename: null });

  const fallback =
    type === "weapon" ? "mdi:sword" :
    type === "carry_item" ? "mdi:package-variant-closed" :
    type === "projectile" ? "mdi:missile" :
    type === "vehicle" ? "mdi:truck" :
    "mdi:help-circle-outline";

  const score = Number(entry.score) || 0;
  const prob = total > 0 ? score / total : 0;
  const ratio = maxScore > 0 ? score / maxScore : 0;
  const pctStr = prob < 0.01 ? (prob * 100).toFixed(2) : (prob * 100).toFixed(1);
  const name = translate(item?.name) || String(entry.key).split(".")[0];

  return (
    <a
      href={`/params/${type}/${entry.key}`}
      onClick={(e) => { e.preventDefault(); navigateTo(`/params/${type}/${entry.key}`); }}
      title={entry.key}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 8px", textDecoration: "none",
        // The weight bar is a solid accent rule of varying thickness, so the
        // ranking survives a monochrome screen.
        borderLeft: `${1 + Math.round(ratio * 3)}px solid var(--accent)`,
        transition: "background var(--dur-fast) var(--ease-smooth)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{
        width: 26, height: 26, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border-subtle)",
      }}>
        {iconUrl ? (
          <img src={iconUrl} alt="" style={{ width: 20, height: 20, objectFit: "contain", imageRendering: "pixelated" }} />
        ) : (
          <Icon icon={fallback} style={{ fontSize: 15, color: "var(--text-muted)" }} />
        )}
      </span>

      <span style={{
        flex: 1, minWidth: 0, fontSize: "var(--font-sm)", color: "var(--text-primary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {name}
      </span>

      {entry.count > 1 && (
        <span style={{ fontSize: "var(--font-xxs)", fontWeight: 700, color: "var(--accent)", flexShrink: 0, fontFamily: "var(--font-mono)" }}>
          ×{entry.count}
        </span>
      )}

      <span style={{
        fontSize: "var(--font-xxs)", color: "var(--text-dim)", flexShrink: 0,
        fontFamily: "var(--font-mono)", minWidth: 34, textAlign: "right",
      }}>
        {score.toFixed(score % 1 === 0 ? 0 : 1)}
      </span>

      <span style={{
        fontSize: "var(--font-xxs)", fontWeight: 700, color: "var(--amber)",
        minWidth: 48, textAlign: "right", flexShrink: 0,
        fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)",
      }}>
        {pctStr}%
      </span>
    </a>
  );
}

export default function RewardPoolVisualization({ item }) {
  const { t } = useI18n();
  const { data } = useData();
  if (!item || item.type !== "reward_pool") return null;

  const pools = Array.isArray(item.pools) ? item.pools.filter((p) => Array.isArray(p) && p.length) : [];
  if (pools.length === 0) return null;

  const totalEntries = pools.reduce((s, p) => s + p.length, 0);

  return (
    <VizFrame
      icon="mdi:dice-multiple"
      title={t("reward_pool_title")}
      count={t("pool_entries", totalEntries)}
      lead={t("viz_lead_reward_pool")}
    >
      {item.consumer && (
        <div style={{
          marginTop: 8, fontSize: "var(--font-xs)", color: "var(--text-muted)",
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        }}>
          <Icon icon="mdi:account-arrow-right-outline" style={{ fontSize: 13 }} />
          {t("consumer_label")}
          <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{item.consumer}</code>
          {item.label && <span style={{ color: "var(--text-dim)" }}>· {item.label}</span>}
        </div>
      )}

      {pools.map((pool, pi) => {
        const total = pool.reduce((s, p) => s + (Number(p.score) || 0), 0);
        const maxScore = Math.max(...pool.map((p) => Number(p.score) || 0), 0);
        return (
          <div className="viz-block" key={pi}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              paddingBottom: 4, marginBottom: 2,
              borderBottom: "1px solid var(--border-subtle)",
              fontSize: "var(--font-xxs)", color: "var(--text-muted)", letterSpacing: "0.06em",
            }}>
              <span>{t("pool_label", pi + 1)}</span>
              <span style={{ display: "flex", gap: 12, fontFamily: "var(--font-mono)" }}>
                <span>{t("items_count", pool.length)}</span>
                <span style={{ color: "var(--amber)" }}>Σ {total.toFixed(1)}</span>
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[...pool]
                .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
                .map((entry, i) => (
                  <PoolEntry key={`${entry.key}-${i}`} entry={entry} data={data} total={total} maxScore={maxScore} />
                ))}
            </div>
          </div>
        );
      })}
    </VizFrame>
  );
}
