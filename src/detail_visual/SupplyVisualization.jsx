import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";
import VizFrame from "./VizFrame";

/**
 * Decodes supply-side detail that would otherwise land in the raw block:
 *   commonness {value, can_respawn_with, in_stock}  — spawn weight / rarity
 *   capacities [{value, source, source_value}]       — unlock gate (usually rank)
 *   inventory  {encumbrance, price}                  — cost to call / pick up
 * (output_schema.md §2/§4/§5.) Rendered as article rows so a reader sees
 * "Rare · unlocks at rank 100" at a glance.
 */
function rarityTier(v) {
  if (v == null) return { label: "—", tone: "info" };
  if (v >= 0.5) return { label: "Common", tone: "success" };
  if (v >= 0.1) return { label: "Frequent", tone: "success" };
  if (v >= 0.01) return { label: "Uncommon", tone: "info" };
  if (v >= 0.001) return { label: "Rare", tone: "amber" };
  return { label: "Very Rare", tone: "danger" };
}

const TONE = {
  success: "var(--success)",
  danger: "var(--danger)",
  amber: "var(--amber)",
  info: "var(--info)",
};


export default function SupplyVisualization({ item }) {
  const t = useT();
  // The schema allows commonness to be either a nested object or three flat
  // sibling scalars (`commonness_value` / `_in_stock` / `_can_respawn_with`);
  // normalise both shapes into the object the row renderer expects.
  let commonness = item?.commonness;
  if (!commonness || typeof commonness !== "object") {
    if (item?.commonness_value != null) {
      commonness = {
        value: item.commonness_value,
        in_stock: item.commonness_in_stock,
        can_respawn_with: item.commonness_can_respawn_with,
      };
    }
  }
  const capacities = item?.capacities;
  const inventory = item?.inventory;

  const weight = typeof commonness?.value === "number" ? commonness.value : null;
  const tier = rarityTier(weight);
  const tierColor = TONE[tier.tone] || "var(--info)";
  // A capacity with value 0 is "no gate" (available from the start), so it is
  // noise on the page — only real requirements are listed.
  const gates = (Array.isArray(capacities) ? capacities : []).filter((c) => (c.value ?? 0) > 0);
  const hasCost = inventory && typeof inventory === "object" && (inventory.price != null || inventory.encumbrance != null);

  // Only render a section when at least one row has content — an item with a
  // zeroed-out commonness and a rank-0 gate has nothing to say here.
  if (!(weight != null && weight > 0) && gates.length === 0 && !hasCost) return null;

  return (
    <VizFrame icon="mdi:package-variant-closed" title={t("supply")} lead={t("viz_lead_supply")}>
      <dl className="article-rows">
        {/* Rarity / spawn weight — only when something actually spawns
            (commonness 0 means the item is never dropped, e.g. projectiles). */}
        {weight != null && weight > 0 && (
          <div className="article-row">
            <dt>{t("rarity")}</dt>
            <dd>
              <span style={{ fontWeight: 700, color: tierColor }}>{tier.label}</span>
              <span style={{ marginLeft: 8, fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                {t("spawn_weight", weight.toFixed(weight < 0.01 ? 4 : 2))}
              </span>
              <span style={{ display: "inline-block", marginLeft: 10, width: 90, height: 4, background: "var(--border-subtle)", verticalAlign: "middle", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.min(100, weight * 100)}%`, background: tierColor }} />
              </span>
              <span style={{ marginLeft: 10, fontSize: "var(--font-xxs)", color: "var(--text-dim)" }}>
                {commonness.can_respawn_with != null && t(commonness.can_respawn_with ? "respawns_with" : "no_respawn")}
                {commonness.in_stock != null && <> · {t(commonness.in_stock ? "in_stock" : "not_in_stock")}</>}
              </span>
            </dd>
          </div>
        )}

        {/* Unlock gate */}
        {gates.length > 0 && (
          <div className="article-row">
            <dt>{t("unlock")}</dt>
            <dd>
              <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                {gates.map((c, i) => (
                  <span key={i} className="article-chip" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon icon="mdi:flag-outline" style={{ fontSize: 11, color: "var(--text-muted)" }} />
                    {t("requires")} {t(c.source)} {c.value}
                  </span>
                ))}
              </span>
            </dd>
          </div>
        )}

        {/* Cost */}
        {hasCost && (
          <div className="article-row">
            <dt>{t("cost")}</dt>
            <dd>
              {inventory.price != null && <><b style={{ color: "var(--accent)" }}>{inventory.price}</b> {t("price_unit")}</>}
              {inventory.price != null && inventory.encumbrance != null && <span style={{ color: "var(--text-dim)" }}> · </span>}
              {inventory.encumbrance != null && <><b>{inventory.encumbrance}</b> {t("weight_unit")}</>}
            </dd>
          </div>
        )}
      </dl>
    </VizFrame>
  );
}
