import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";

/**
 * Decodes supply-side detail that currently lands in the raw block:
 *   commonness {value, can_respawn_with, in_stock}  — spawn weight / rarity
 *   capacities [{value, source, source_value}]       — unlock gate (usually rank)
 *   inventory  {encumbrance, price}                  — cost to call / pick up
 * (output_schema.md §2/§4/§5.) Presented as three readable bands instead of a
 * nested-object dump, so a reader sees "Rare · unlocks at rank 100" at a glance.
 */
function rarityTier(v) {
  if (v == null) return { label: "—", tone: "info" };
  if (v >= 0.5) return { label: "Common", tone: "success" };
  if (v >= 0.1) return { label: "Frequent", tone: "success" };
  if (v >= 0.01) return { label: "Uncommon", tone: "info" };
  if (v >= 0.001) return { label: "Rare", tone: "amber" };
  return { label: "Very Rare", tone: "danger" };
}

function Band({ icon, title, tone = "info", children }) {
  const accent = tone === "success" ? "var(--success)" : tone === "danger" ? "var(--danger)"
    : tone === "amber" ? "var(--amber)" : "var(--info)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderTop: "1px solid var(--border-subtle)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, minWidth: 96 }}>
        <Icon icon={icon} style={{ fontSize: 14, color: accent }} />
        <span style={{
          fontSize: "var(--font-xxs)", fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "var(--text-muted)",
        }}>{title}</span>
      </span>
      <div style={{ flex: 1, minWidth: 0, color: "var(--text-primary)", fontSize: "var(--font-sm)" }}>{children}</div>
    </div>
  );
}

export default function SupplyVisualization({ item }) {
  const t = useT();
  // The schema allows commonness to be either a nested object or three flat
  // sibling scalars (`commonness_value` / `_in_stock` / `_can_respawn_with`);
  // normalise both shapes into the object the band renderer expects.
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

  const has =
    (commonness && typeof commonness === "object") ||
    (Array.isArray(capacities) && capacities.length) ||
    (inventory && typeof inventory === "object");

  if (!has) return null;

  const tier = rarityTier(commonness?.value);
  const weight = typeof commonness?.value === "number" ? commonness.value : null;
  const capTone = tier.tone === "danger" ? "var(--danger)" : tier.tone === "amber" ? "var(--amber)"
    : tier.tone === "success" ? "var(--success)" : "var(--info)";

  return (
    <div style={{
      border: "1px solid var(--border-subtle)", background: "var(--bg-surface)",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "var(--font-display)",
      }}>
        <Icon icon="mdi:package-variant-closed" style={{ fontSize: "var(--font-md)" }} />
        {t("supply")}
      </div>

      {/* Rarity / spawn weight — only when something actually spawns
          (commonness 0 means the item is never dropped, e.g. projectiles). */}
      {weight != null && weight > 0 && (
        <Band icon="mdi:chart-bubble" title={t("rarity")} tone={tier.tone}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontWeight: 800, color: capTone, letterSpacing: "0.02em", textTransform: "uppercase",
            }}>{tier.label}</span>
            <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-muted)" }}>
              {t("spawn_weight", weight.toFixed(weight < 0.01 ? 4 : 2))}
            </span>
            <span style={{
              flex: 1, minWidth: 60, height: 4, background: "var(--border-subtle)", overflow: "hidden", maxWidth: 120,
            }}>
              <span style={{ display: "block", height: "100%", width: `${Math.min(100, weight * 100)}%`, background: capTone }} />
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: "var(--font-xxs)", color: "var(--text-dim)" }}>
            {commonness.can_respawn_with != null && (
              <span>{t(commonness.can_respawn_with ? "respawns_with" : "no_respawn")}</span>
            )}
            {commonness.in_stock != null && (
              <span>{t(commonness.in_stock ? "in_stock" : "not_in_stock")}</span>
            )}
          </div>
        </Band>
      )}

      {/* Unlock gate */}
      {Array.isArray(capacities) && capacities.length > 0 && (
        <Band icon="mdi:lock-open-outline" title={t("unlock")}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {capacities.map((c, i) => (
              <span key={i} style={{
                fontSize: "var(--font-xs)", color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)", padding: "1px 7px",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <Icon icon="mdi:flag-outline" style={{ fontSize: 11, color: "var(--text-muted)" }} />
                {t("requires")} {humanizeSource(c.source)} {c.value}
              </span>
            ))}
          </div>
        </Band>
      )}

      {/* Cost */}
      {inventory && (inventory.price != null || inventory.encumbrance != null) && (
        <Band icon="mdi:scale-balance" title={t("cost")}>
          <span style={{ display: "inline-flex", gap: 14, flexWrap: "wrap" }}>
            {inventory.price != null && (
              <span><b style={{ color: "var(--accent)" }}>{inventory.price}</b> {t("price_unit")}</span>
            )}
            {inventory.encumbrance != null && (
              <span><b style={{ color: "var(--text-primary)" }}>{inventory.encumbrance}</b> {t("weight_unit")}</span>
            )}
          </span>
        </Band>
      )}
    </div>
  );
}

function humanizeSource(s) {
  if (!s) return "—";
  return String(s).replace(/_/g, " ");
}
