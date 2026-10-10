import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";
import VizFrame from "./VizFrame";

/**
 * Decodes the `modifiers` array into a plain list of effects.
 *
 * Schema (output_schema.md §2/§4): each modifier is an attribute modifier —
 *   weapon:     { "class": "damage", "value": 1.0 }
 *   carry_item: { "class": "heal", "value": 25.0, "input_character_state": "bleeding",
 *                 "output_character_state": "healthy", "consumes_item": 0 }
 * `class` names the gameplay effect; `value` is either a multiplier (speed,
 * accuracy) or an absolute amount (heal, protection). `input→output` state
 * pairs describe a condition the item cures.
 */
const MODIFIER_META = {
  damage: { label: "damage", icon: "mdi:sword", kind: "mult" },
  heal: { label: "heal", icon: "mdi:heart-plus", kind: "abs" },
  speed: { label: "move speed", icon: "mdi:run-fast", kind: "mult" },
  accuracy: { label: "accuracy", icon: "mdi:crosshairs", kind: "mult" },
  reload_time: { label: "reload time", icon: "mdi:reload", kind: "mult" },
  protection: { label: "protection", icon: "mdi:shield-half-full", kind: "abs" },
  scope: { label: "scope", icon: "mdi:telescope", kind: "state" },
  recoil: { label: "recoil", icon: "mdi:arrow-u-up-right", kind: "mult" },
  range: { label: "range", icon: "mdi:ruler", kind: "abs" },
  noise: { label: "noise", icon: "mdi:volume-high", kind: "abs" },
  stamina: { label: "stamina", icon: "mdi:battery-high", kind: "abs" },
  stealth: { label: "stealth", icon: "mdi:incognito", kind: "abs" },
  weight: { label: "weight", icon: "mdi:weight", kind: "abs" },
};

function humanize(s) {
  return String(s ?? "").replace(/[_.]+/g, " ").trim() || "—";
}

function describe(mod, t) {
  const meta = MODIFIER_META[mod.class] || { label: mod.class, icon: "mdi:chip", kind: "abs" };
  const isState = Boolean(mod.input_character_state || mod.output_character_state);
  const v = typeof mod.value === "number" ? mod.value : null;

  if (isState) {
    return { meta, tone: "success", text: `${humanize(mod.input_character_state)} → ${humanize(mod.output_character_state)}` };
  }
  if (v === null) {
    return { meta, tone: "info", text: t("modifier_applies") };
  }
  if (meta.kind === "mult") {
    if (Math.abs(v) < 0.005) return { meta, tone: "neutral", text: t("no_change") };
    return { meta, tone: v > 0 ? "success" : "danger", text: `×${v.toFixed(2)}` };
  }
  return {
    meta,
    tone: v > 0 ? "success" : v < 0 ? "danger" : "neutral",
    text: `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(v % 1 === 0 ? 0 : 2)}`,
  };
}

const TONE_COLOR = {
  success: "var(--success)",
  danger: "var(--danger)",
  neutral: "var(--text-muted)",
  info: "var(--info)",
};

export default function ModifiersVisualization({ item }) {
  const t = useT();
  const mods = item?.modifiers;
  if (!Array.isArray(mods) || mods.length === 0) return null;

  const lead = item.type === "carry_item"
    ? t("viz_lead_modifiers_use", mods.length)
    : t("viz_lead_modifiers", mods.length);

  return (
    <VizFrame icon="mdi:chip" title={t("modifiers")} count={t("count_items", mods.length)} lead={lead}>
      <dl className="article-rows">
        {mods.map((m, i) => {
          const { meta, tone, text } = describe(m, t);
          return (
            <div className="article-row" key={i}>
              <dt>
                <Icon icon={meta.icon} style={{ fontSize: 11, marginRight: 5, verticalAlign: "-1px" }} />
                {humanize(meta.label)}
              </dt>
              <dd>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: TONE_COLOR[tone] }}>{text}</span>
                {m.consumes_item != null && m.consumes_item > 0 && (
                  <span style={{ marginLeft: 8, fontSize: "var(--font-xxs)", color: "var(--text-dim)" }}>
                    {t("consumes_item", m.consumes_item)}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </VizFrame>
  );
}
