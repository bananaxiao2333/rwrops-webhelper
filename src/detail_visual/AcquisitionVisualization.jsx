import { Icon } from "@iconify/react";
import { useT, useI18n } from "../i18n.jsx";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import { navigateTo } from "../hashRouter.js";
import VizFrame from "./VizFrame";
import { rewardTables, tableChance, tableLabel } from "./rewardTables.js";

/**
 * "How to obtain" — every path that yields this item:
 *
 *   reward_sources  [{ group, source }] — the reward tables that can hand it
 *     out. A *pointer*, not a copy: the table itself is a `reward_pool` record
 *     keyed by `group`, which is where the inputs, the weights, and so the real
 *     odds live. One pointer covers both kinds of table, split here by whether
 *     the table has an `input`:
 *
 *       with an input  a ticket exchange — hand those items over to draw
 *       without one    a stage crate / agent reward the game drops in
 *
 *   command_config.actions  [{ type, class, key }]  — in-game commands that
 *     spawn/grant the item (e.g. `/god` → spawn god_vest). Found by scanning
 *     every command for an action that names this key.
 */

function Chance({ chance, t }) {
  if (!chance) return <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xs)" }}>—</span>;
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--amber)" }}>
      {t("chance", (chance.prob * 100).toFixed(chance.prob < 0.01 ? 2 : 1))}
      {chance.count > 1 && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> ×{chance.count}</span>}
    </span>
  );
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

  const tables = rewardTables(item, data, "reward_sources");
  // A table with an `input` is a ticket exchange ("hand these over"); one
  // without is a drop table the game rolls on its own.
  const exchanges = tables.filter(({ table }) => Array.isArray(table.input) && table.input.length > 0);
  const drops = tables.filter(({ table }) => !(Array.isArray(table.input) && table.input.length > 0));

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

  if (exchanges.length === 0 && drops.length === 0 && commands.length === 0) return null;

  return (
    <VizFrame icon="mdi:map-marker-path" title={t("how_to_obtain")} lead={t("viz_lead_acquisition")}>
      {exchanges.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("sources_title")}</h3>
          <dl className="article-rows">
            {exchanges.map(({ group, table }) => {
              const chance = tableChance(table, item.key);
              return (
                <div className="article-row" key={group}>
                  <dt>{tableLabel(table, group)}</dt>
                  <dd style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                      {(table.input || []).map((inp, ii) => (
                        <ItemLink key={ii} cls={inp.class} itemKey={inp.key} data={data} translate={translate} />
                      ))}
                    </span>
                    <Icon icon="mdi:arrow-right-thin" style={{ fontSize: 14, color: "var(--border-heavy)" }} />
                    <Chance chance={chance} t={t} />
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {drops.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("reward_sources_title")}</h3>
          <dl className="article-rows">
            {drops.map(({ group, table }) => {
              const chance = tableChance(table, item.key);
              return (
                <div className="article-row" key={group}>
                  <dt>
                    <a
                      className="article-chip"
                      href={`/params/reward_pool/${group}`}
                      onClick={(e) => { e.preventDefault(); navigateTo(`/params/reward_pool/${group}`); }}
                      title={group}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)" }}
                    >
                      <Icon icon="mdi:dice-multiple" style={{ fontSize: 11, color: "var(--accent)" }} />
                      {group}
                    </a>
                  </dt>
                  <dd style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {table.consumer && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                        {table.consumer}
                      </span>
                    )}
                    {table.label && (
                      <span style={{ fontSize: "var(--font-xs)", color: "var(--text-dim)" }}>· {table.label}</span>
                    )}
                    <Chance chance={chance} t={t} />
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
