import { Icon } from "@iconify/react";
import { useT, useI18n } from "../i18n.jsx";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import { navigateTo } from "../hashRouter.js";
import VizFrame from "./VizFrame";

/**
 * "How to obtain" — every path that yields this item:
 *
 *   exchange_sources  [{ category, input: [{class, key}] }]  — the exchange
 *     sets that produce it. The schema stores the *inputs* and the category but
 *     not the drop chance, so the chance is recovered from the prize pools: the
 *     category's pools live on the input item's `exchange_prizes`, and this
 *     item's probability is its weight ÷ the pool's total weight.
 *
 *   reward_sources  [{ group, source, consumer }]  — the weighted reward tables
 *     that can hand it out, emitted for weapon / carry_item / vehicle /
 *     projectile. A *pointer*, not a copy: the table itself is a `reward_pool`
 *     record keyed by `group`, which is where the weights (and so the real
 *     odds) live. This covers what the exchange sets do not — the stage crates
 *     and agent rewards a game mode drops in.
 *
 *   command_config.actions  [{ type, class, key }]  — in-game commands that
 *     spawn/grant the item (e.g. `/god` → spawn god_vest). Found by scanning
 *     every command for an action that names this key.
 */
function sourceChance(src, itemKey, data) {
  for (const inp of src.input || []) {
    const host = data?.[inp.class]?.[inp.key];
    for (const ep of host?.exchange_prizes || []) {
      if (ep.category !== src.category) continue;
      for (const pool of ep.prize_pools || []) {
        const total = pool.reduce((s, p) => s + (p.score || 0), 0);
        const me = pool.find((p) => p.key === itemKey);
        if (me && total > 0) return { prob: (me.score || 0) / total, count: me.count };
      }
    }
  }
  return null;
}

/* The odds implied by a reward table: this item's weight ÷ that pool's total
 * weight. Read off the `reward_pool` record the pointer names. */
function rewardChance(group, itemKey, data) {
  const table = data?.reward_pool?.[group];
  for (const pool of table?.pools || []) {
    if (!Array.isArray(pool)) continue;
    const total = pool.reduce((s, p) => s + (Number(p.score) || 0), 0);
    const me = pool.find((p) => p && p.key === itemKey);
    if (me && total > 0) return { prob: (Number(me.score) || 0) / total, count: me.count };
  }
  return null;
}

function ItemLink({ cls, itemKey, data, translate }) {
  const item = data?.[cls]?.[itemKey];
  const iconUrl = useItemIcon(item || { hud_icon_filename: null });
  const name = translate(item?.name) || String(itemKey).split(".")[0];
  const fallback =
    cls === "weapon" ? "mdi:sword" :
    cls === "carry_item" ? "mdi:package-variant-closed" :
    cls === "projectile" ? "mdi:missile" :
    cls === "vehicle" ? "mdi:truck" :
    "mdi:help-circle-outline";
  return (
    <a
      className="article-chip"
      href={`/params/${cls}/${itemKey}`}
      onClick={(e) => { e.preventDefault(); navigateTo(`/params/${cls}/${itemKey}`); }}
      title={itemKey}
      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" style={{ width: 18, height: 18, objectFit: "contain", imageRendering: "pixelated" }} />
      ) : (
        <Icon icon={fallback} style={{ fontSize: 14, color: "var(--text-muted)" }} />
      )}
      <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
    </a>
  );
}

export default function AcquisitionVisualization({ item }) {
  const t = useT();
  const { translate } = useI18n();
  const { data } = useData();

  const sources = item?.exchange_sources || [];
  const rewards = item?.reward_sources || [];

  // Scan every command for an action that names this item. Cheap (a few
  // hundred commands) and keeps the component free of a manual memo the React
  // Compiler would flag.
  const commands = (() => {
    const cmds = data?.command_config;
    if (!cmds || !item?.key) return [];
    const out = [];
    for (const [ck, cmd] of Object.entries(cmds)) {
      const hits = (cmd.actions || []).filter((a) => a && a.key === item.key);
      if (hits.length) {
        out.push({
          key: ck,
          command: cmd.command || ck,
          types: [...new Set(hits.map((a) => a.type).filter(Boolean))],
        });
      }
    }
    return out;
  })();

  if (sources.length === 0 && rewards.length === 0 && commands.length === 0) return null;

  return (
    <VizFrame icon="mdi:map-marker-path" title={t("how_to_obtain")} lead={t("viz_lead_acquisition")}>
      {sources.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("sources_title")}</h3>
          <dl className="article-rows">
            {sources.map((src, i) => {
              const chance = sourceChance(src, item.key, data);
              return (
                <div className="article-row" key={i}>
                  <dt>{src.category?.replace("Setup ", "") || `Set ${i + 1}`}</dt>
                  <dd style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                      {(src.input || []).map((inp, ii) => (
                        <ItemLink key={ii} cls={inp.class} itemKey={inp.key} data={data} translate={translate} />
                      ))}
                    </span>
                    <Icon icon="mdi:arrow-right-thin" style={{ fontSize: 14, color: "var(--border-heavy)" }} />
                    {chance ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--amber)" }}>
                        {t("chance", (chance.prob * 100).toFixed(chance.prob < 0.01 ? 2 : 1))}
                        {chance.count > 1 && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> ×{chance.count}</span>}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xs)" }}>—</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {rewards.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("reward_sources_title")}</h3>
          <dl className="article-rows">
            {rewards.map((r, i) => {
              const chance = rewardChance(r.group, item.key, data);
              return (
                <div className="article-row" key={`${r.group}-${i}`}>
                  <dt>
                    <a
                      className="article-chip"
                      href={`/params/reward_pool/${r.group}`}
                      onClick={(e) => { e.preventDefault(); navigateTo(`/params/reward_pool/${r.group}`); }}
                      title={r.group}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)" }}
                    >
                      <Icon icon="mdi:dice-multiple" style={{ fontSize: 11, color: "var(--accent)" }} />
                      {r.group}
                    </a>
                  </dt>
                  <dd style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {r.consumer && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                        {r.consumer}
                      </span>
                    )}
                    {r.label && (
                      <span style={{ fontSize: "var(--font-xs)", color: "var(--text-dim)" }}>· {r.label}</span>
                    )}
                    {chance ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--amber)" }}>
                        {t("chance", (chance.prob * 100).toFixed(chance.prob < 0.01 ? 2 : 1))}
                        {chance.count > 1 && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> ×{chance.count}</span>}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xs)" }}>—</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {commands.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("via_command")}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {commands.map((c) => (
              <a
                key={c.key}
                className="article-chip"
                href={`/params/command_config/${c.key}`}
                onClick={(e) => { e.preventDefault(); navigateTo(`/params/command_config/${c.key}`); }}
                title={c.key}
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Icon icon="mdi:terminal" style={{ fontSize: 12, color: "var(--accent)" }} />
                /{c.command}
                {c.types.length > 0 && (
                  <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)" }}>· {c.types.join("/")}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </VizFrame>
  );
}
