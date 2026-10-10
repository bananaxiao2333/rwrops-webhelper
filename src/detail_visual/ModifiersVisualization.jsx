import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";

/**
 * Decodes the `modifiers` array into human-readable effect cards.
 *
 * Schema (output_schema.md §2/§4): each modifier is an attribute modifier —
 *   weapon:     { "class": "damage", "value": 1.0 }
 *   carry_item: { "class": "heal", "value": 25.0, "input_character_state": "bleeding",
 *                 "output_character_state": "healthy", "consumes_item": 0 }
 * `class` names the gameplay effect; `value` is either a multiplier (speed,
 * accuracy) or an absolute amount (heal, protection). `input→output` state
 * pairs describe a condition the item cures. This used to render as a raw
 * `[0] 键 damage / 值 1.0` dump; now it reads like a perk list.
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

function EffectPill({ mod, t }) {
  const meta = MODIFIER_META[mod.class] || { label: mod.class, icon: "mdi:chip", kind: "abs" };
  const isState = Boolean(mod.input_character_state || mod.output_character_state);
  const v = typeof mod.value === "number" ? mod.value : null;

  let tone = "info";
  let text;
  if (isState) {
    tone = "success";
    text = `${humanize(mod.input_character_state)} → ${humanize(mod.output_character_state)}`;
  } else if (v === null) {
    tone = "info";
    text = t("modifier_applies");
  } else if (meta.kind === "mult") {
    if (Math.abs(v) < 0.005) { tone = "neutral"; text = t("no_change"); }
    else { tone = v > 0 ? "success" : "danger"; text = `×${(v >= 0 ? "" : "")}${v.toFixed(2)}`; }
  } else {
    tone = v > 0 ? "success" : v < 0 ? "danger" : "neutral";
    text = `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(v % 1 === 0 ? 0 : 2)}`;
  }

  const color = tone === "success" ? "var(--success)" : tone === "danger" ? "var(--danger)"
    : tone === "neutral" ? "var(--text-muted)" : "var(--info)";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 10px",
      borderTop: "1px solid var(--border-subtle)",
      background: "transparent",
      animation: "fade-in 0.2s var(--ease-smooth) both",
    }}>
      <span style={{
        width: 22, height: 22, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border-subtle)", background: "var(--bg-deep)",
      }}>
        <Icon icon={meta.icon} style={{ fontSize: 13, color: "var(--text-secondary)" }} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "var(--font-sm)", textTransform: "capitalize", color: "var(--text-primary)",
          fontWeight: 600, letterSpacing: "0.02em",
        }}>
          {humanize(meta.label)}
        </div>
        {mod.consumes_item != null && mod.consumes_item > 0 && (
          <div style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", marginTop: 1 }}>
            {t("consumes_item", mod.consumes_item)}
          </div>
        )}
      </div>

      <span style={{
        fontSize: "var(--font-sm)", fontWeight: 800, color, flexShrink: 0,
        fontFamily: "var(--font-mono)", letterSpacing: "0.02em",
      }}>
        {text}
      </span>
    </div>
  );
}

export default function ModifiersVisualization({ item }) {
  const t = useT();
  const mods = item?.modifiers;
  if (!Array.isArray(mods) || mods.length === 0) return null;

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
        <Icon icon="mdi:chip" style={{ fontSize: "var(--font-md)" }} />
        {t("modifiers")}
        <span style={{
          marginLeft: "auto", fontSize: "var(--font-xxs)", fontWeight: 600,
          color: "var(--text-muted)", letterSpacing: "0.06em",
        }}>
          {t("count_items", mods.length)}
        </span>
      </div>

      <div>
        {mods.map((m, i) => (
          <EffectPill key={i} mod={m} t={t} />
        ))}
      </div>
    </div>
  );
}
