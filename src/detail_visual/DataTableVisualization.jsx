import { Icon } from "@iconify/react";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import { useI18n } from "../i18n.jsx";
import { navigateTo } from "../hashRouter.js";
import VizFrame from "./VizFrame";

/**
 * The named lists the game's scripts hold — three record types with the same
 * shape of answer ("a variable holds this list of things") and one component:
 *
 *   string_table   `values: ["tank.vehicle", …]`      array<string> literals
 *   value_table    `entries: [{key, value}]`           dictionary literals
 *   resource_list  `items: [{key, class}]`             named Resource lists
 *
 * These are not filler. `AgentManager.m_rewardVehicles` *is* the list of
 * vehicles an agent can be rewarded with, and a drop table's members are the
 * drop table. So each member links to its own page when the target exists.
 */

/* A `key.class` string (the game's own naming) is resolved against the data:
 * if `data[class][key]` exists the member is a real record and becomes a link. */
function RefChip({ refKey, cls, data }) {
  const { translate } = useI18n();
  const item = cls ? data?.[cls]?.[refKey] : undefined;
  const iconUrl = useItemIcon(item || { hud_icon_filename: null });

  const fallback =
    cls === "weapon" ? "mdi:sword" :
    cls === "carry_item" ? "mdi:package-variant-closed" :
    cls === "projectile" ? "mdi:missile" :
    cls === "vehicle" ? "mdi:truck" :
    "mdi:help-circle-outline";

  const name = translate(item?.name) || String(refKey).split(".")[0];

  if (!item) {
    return (
      <span className="article-chip" style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: "var(--font-xs)", fontFamily: "var(--font-mono)",
      }} title={refKey}>
        <Icon icon={fallback} style={{ fontSize: 12, color: "var(--text-dim)" }} />
        {refKey}
      </span>
    );
  }

  return (
    <a
      className="article-chip"
      href={`/params/${cls}/${refKey}`}
      onClick={(e) => { e.preventDefault(); navigateTo(`/params/${cls}/${refKey}`); }}
      title={refKey}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--font-xs)" }}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="" style={{ width: 16, height: 16, objectFit: "contain", imageRendering: "pixelated" }} />
      ) : (
        <Icon icon={fallback} style={{ fontSize: 12, color: "var(--text-muted)" }} />
      )}
      {name}
    </a>
  );
}

/* `emp_grenade.projectile` → the class is the last dot segment. */
function classOf(refStr) {
  const s = String(refStr);
  const i = s.lastIndexOf(".");
  return i > 0 ? s.slice(i + 1) : null;
}

export default function DataTableVisualization({ item }) {
  const { t } = useI18n();
  const { data } = useData();
  if (!item) return null;

  const type = item.type;
  if (type !== "string_table" && type !== "value_table" && type !== "resource_list") return null;

  const values = Array.isArray(item.values) ? item.values : [];
  const entries = Array.isArray(item.entries) ? item.entries : [];
  const items = Array.isArray(item.items) ? item.items : [];
  const total = values.length + entries.length + items.length;
  if (total === 0) return null;

  const title =
    type === "string_table" ? t("string_table_title") :
    type === "value_table" ? t("value_table_title") :
    t("resource_list_title");

  /* Which variable this list lives in — the key is `owner.variable`, and the
   * variable is the part that means anything to a reader. */
  const declaration = [item.owner, item.variable].filter(Boolean).join(".");

  return (
    <VizFrame
      icon="mdi:table"
      title={title}
      count={t("table_items", total)}
      lead={t("viz_lead_data_table")}
    >
      {declaration && (
        <div style={{
          marginTop: 8, fontSize: "var(--font-xs)", color: "var(--text-muted)",
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        }}>
          <Icon icon="mdi:variable" style={{ fontSize: 13 }} />
          <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{declaration}</code>
          {item.function && <span style={{ color: "var(--text-dim)" }}>· {item.function}()</span>}
        </div>
      )}

      {values.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("table_values")}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {values.map((v, i) => (
              <RefChip key={`${v}-${i}`} refKey={v} cls={classOf(v)} data={data} />
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("table_items")}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {items.map((it, i) => (
              <RefChip key={`${it?.key}-${i}`} refKey={it?.key} cls={it?.class} data={data} />
            ))}
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("table_entries")}</h3>
          <dl className="article-rows">
            {entries.map((e, i) => (
              <div className="article-row" key={`${e?.key}-${i}`}>
                <dt style={{ fontFamily: "var(--font-mono)" }}>{e?.key}</dt>
                <dd style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  {e?.value === "" || e?.value == null ? "—" : String(e.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </VizFrame>
  );
}
