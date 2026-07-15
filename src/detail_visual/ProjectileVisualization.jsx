import { useMemo } from "react";
import { useT } from "../i18n.jsx";

/* ── Section helper ── */
const sectionStyle = {
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-surface)",
  fontFamily: "var(--font-mono)",
  marginBottom: 6,
};
const headerStyle = {
  padding: "9px 14px",
  borderBottom: "1px solid var(--border-subtle)",
  fontSize: "var(--font-base)", fontWeight: 700,
  color: "var(--accent)", textTransform: "uppercase",
  letterSpacing: "0.08em",
};
const fieldRowStyle = {
  display: "flex", flexWrap: "wrap",
};
const fieldStyle = {
  flex: "1 1 160px",
  padding: "6px 14px",
  borderRight: "1px solid var(--border-subtle)",
};
const fieldLabelStyle = {
  fontSize: "var(--font-xs)", color: "var(--text-muted)",
  letterSpacing: "0.08em", marginBottom: 2,
};
const fieldValueStyle = {
  fontSize: "var(--font-base)", color: "var(--text-primary)",
  wordBreak: "break-all",
};

/* ── Render a list of fields ── */
function Fields({ fields }) {
  if (!fields || fields.length === 0) return null;
  return (
    <div style={fieldRowStyle}>
      {fields.map((f, i) => (
        <div key={i} style={{ ...fieldStyle, borderRight: i < fields.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
          <div style={fieldLabelStyle}>{f.label}</div>
          <div style={fieldValueStyle}>{f.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, children }) {
  if (!children) return null;
  return (
    <div style={sectionStyle}>
      <div style={headerStyle}>{title}</div>
      {children}
    </div>
  );
}

/* ── Tag display ── */
function safeStr(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return v.name || v.key || v.class || v.fileref || JSON.stringify(v);
  return String(v);
}

function Tags({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ padding: "6px 14px", display: "flex", flexWrap: "wrap", gap: 4 }}>
      {items.map((t, i) => (
        <span key={i} style={{
          fontSize: "var(--font-sm)", padding: "1px 6px",
          background: "var(--bg-deep, rgba(0,0,0,0.3))",
          border: "1px solid var(--border-subtle)",
          borderRadius: 3, color: "var(--text-secondary)",
        }}>{safeStr(t)}</span>
      ))}
    </div>
  );
}

/* ── Format a number ── */
function fmt(n) {
  if (n === undefined || n === null) return null;
  if (typeof n === "object") return safeStr(n);
  if (typeof n !== "number") return String(n);
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(3).replace(/\.?0+$/, "");
}

/* ── Sound list helper ── */
function fmtSounds(sounds) {
  if (!Array.isArray(sounds)) return null;
  const classes = [...new Set(sounds.map(s => s.class).filter(Boolean))];
  return classes.join(", ") || null;
}

/* ── Projectile Visualization ── */
export default function ProjectileVisualization({ item }) {
  const t = useT();

  if (!item) return null;
  if (item.type !== "projectile") return null;

  const inv = item.inventory || {};
  const common = item.commonness || {};

  /* ── 1. Ballistics ── */
  const ballistics = useMemo(() => {
    const f = [];
    // Standard projectile
    if (item.projectile_speed !== undefined)
      f.push({ label: t("field_projectile_speed"), value: fmt(item.projectile_speed) + " m/s" });
    if (item.projectiles_per_shot !== undefined)
      f.push({ label: t("field_projectiles_per_shot"), value: fmt(item.projectiles_per_shot) });
    if (item.pulldown_in_air !== undefined)
      f.push({ label: t("field_pulldown_in_air"), value: fmt(item.pulldown_in_air) });
    // Throwable
    if (item.throwable_max_speed !== undefined)
      f.push({ label: t("field_throwable_max_speed"), value: fmt(item.throwable_max_speed) + " m/s" });
    if (item.throwable_near_far_distance !== undefined)
      f.push({ label: t("field_throwable_near_far_distance"), value: fmt(item.throwable_near_far_distance) + "m" });
    if (item.throwable_curve_height !== undefined)
      f.push({ label: t("field_throwable_curve_height"), value: fmt(item.throwable_curve_height) + "m" });
    if (item.throwable_randomness !== undefined)
      f.push({ label: t("field_throwable_randomness"), value: fmt(item.throwable_randomness) });
    if (item.throwable_speed_estimation_near !== undefined)
      f.push({ label: t("field_throwable_speed_estimation_near"), value: fmt(item.throwable_speed_estimation_near) + " m/s" });
    if (item.throwable_speed_estimation_far !== undefined)
      f.push({ label: t("field_throwable_speed_estimation_far"), value: fmt(item.throwable_speed_estimation_far) + " m/s" });
    return f;
  }, [item, t]);

  /* ── 2. Effect / Damage ── */
  const effects = useMemo(() => {
    const f = [];
    if (item.result_class)
      f.push({ label: t("field_result_class"), value: item.result_class });
    if (item.result_damage !== undefined)
      f.push({ label: t("field_result_damage"), value: fmt(item.result_damage) });
    if (item.result_radius !== undefined)
      f.push({ label: t("field_result_radius"), value: fmt(item.result_radius) + "m" });
    if (item.result_push !== undefined)
      f.push({ label: t("field_result_push"), value: fmt(item.result_push) });
    if (item.result_key)
      f.push({ label: t("field_result_key"), value: item.result_key });
    if (item.result_character_state)
      f.push({ label: t("field_result_character_state"), value: item.result_character_state });
    if (item.radius !== undefined)
      f.push({ label: t("field_radius"), value: fmt(item.radius * 100) + "cm" });
    return f;
  }, [item, t]);

  /* ── 3. Trigger / Behavior ── */
  const behavior = useMemo(() => {
    const f = [];
    if (item.class)
      f.push({ label: t("field_class"), value: item.class });
    if (item.trigger_class)
      f.push({ label: t("field_trigger_class"), value: item.trigger_class });
    if (item.trigger_time_to_live !== undefined)
      f.push({ label: t("field_trigger_time_to_live"), value: fmt(item.trigger_time_to_live) + "s" });
    if (item.slot !== undefined)
      f.push({ label: t("field_slot"), value: fmt(item.slot) });
    if (item.can_be_disarmed !== undefined)
      f.push({ label: t("field_can_be_disarmed"), value: item.can_be_disarmed ? t("yes") : t("no") });
    if (item.can_be_detected_by_driver !== undefined)
      f.push({ label: t("field_can_be_detected_by_driver"), value: item.can_be_detected_by_driver ? t("yes") : t("no") });
    if (item.can_be_detected_by_footmen !== undefined)
      f.push({ label: t("field_can_be_detected_by_footmen"), value: item.can_be_detected_by_footmen ? t("yes") : t("no") });
    if (item.drop_count_factor_on_death !== undefined)
      f.push({ label: t("field_drop_count_factor_on_death"), value: fmt(item.drop_count_factor_on_death) });
    return f;
  }, [item, t]);

  /* ── 4. Economy ── */
  const economy = useMemo(() => {
    const f = [];
    if (inv.price !== undefined)
      f.push({ label: t("field_inventory_price"), value: "$" + fmt(inv.price) });
    if (inv.encumbrance !== undefined)
      f.push({ label: t("field_inventory_encumbrance"), value: fmt(inv.encumbrance) + " kg" });
    if (common.commonness_value !== undefined)
      f.push({ label: t("field_commonness_value"), value: fmt(common.commonness_value) });
    if (common.commonness_in_stock !== undefined)
      f.push({ label: t("field_commonness_in_stock"), value: fmt(common.commonness_in_stock) });
    if (common.can_respawn_with !== undefined)
      f.push({ label: t("field_commonness_can_respawn_with"), value: common.can_respawn_with ? t("yes") : t("no") });
    if (item.in_stock !== undefined)
      f.push({ label: t("field_in_stock"), value: item.in_stock ? t("yes") : t("no") });
    return f;
  }, [item, t, inv, common]);

  /* ── 5. Lifetime / Config ── */
  const config = useMemo(() => {
    const f = [];
    if (item.time_to_live !== undefined)
      f.push({ label: t("field_time_to_live"), value: fmt(item.time_to_live) + "s" });
    if (item.time_to_live_out_in_the_open !== undefined)
      f.push({ label: t("field_time_to_live_out_in_the_open"), value: fmt(item.time_to_live_out_in_the_open) + "s" });
    if (item.use_time_to_live !== undefined)
      f.push({ label: t("field_use_time_to_live"), value: item.use_time_to_live ? t("yes") : t("no") });
    if (item.inherit_from)
      f.push({ label: t("field_inherit_from"), value: item.inherit_from });
    if (item.on_ground_up && Array.isArray(item.on_ground_up))
      f.push({ label: t("field_on_ground_up"), value: item.on_ground_up.map(v => fmt(v)).join(", ") });
    return f;
  }, [item, t]);

  /* ── 6. Visual / Audio ── */
  const visual = useMemo(() => {
    const f = [];
    if (item.model_mesh)
      f.push({ label: t("field_model_mesh"), value: item.model_mesh });
    if (item.hud_icon_filename)
      f.push({ label: t("field_hud_icon_filename"), value: item.hud_icon_filename });
    if (item.effects && Array.isArray(item.effects)) {
      const classes = [...new Set(item.effects.map(e => e?.class || safeStr(e)).filter(Boolean))];
      if (classes.length > 0) f.push({ label: t("field_effects"), value: classes.join(", ") });
    }
    if (item.sounds && Array.isArray(item.sounds)) {
      const s = fmtSounds(item.sounds);
      if (s) f.push({ label: t("field_sounds"), value: s });
    }
    if (item.trails && Array.isArray(item.trails)) {
      f.push({ label: t("field_trails"), value: item.trails.map(tr => safeStr(tr.fileref || tr)).join(", ").slice(0, 80) });
    }
    return f;
  }, [item, t]);

  /* ── 7. Tags ── */
  const tags = item.tags;

  /* ── 8. Capacities ── */
  const caps = useMemo(() => {
    if (!Array.isArray(item.capacities) || item.capacities.length === 0) return null;
    return item.capacities.map((c) => ({
      label: safeStr(c.source) || t("unknown"),
      value: c.source_value !== undefined
        ? `${fmt(c.value)} @ ${t("rank")} ${fmt(c.source_value)}`
        : fmt(c.value),
    }));
  }, [item, t]);

  const sections = [
    ballistics.length > 0 && { title: t("ballistics"), children: <Fields fields={ballistics} /> },
    effects.length > 0 && { title: t("results"), children: <Fields fields={effects} /> },
    behavior.length > 0 && { title: t("behavior"), children: <Fields fields={behavior} /> },
    economy.length > 0 && { title: t("economy"), children: <Fields fields={economy} /> },
    config.length > 0 && { title: t("config"), children: <Fields fields={config} /> },
    visual.length > 0 && { title: t("visual"), children: <Fields fields={visual} /> },
    caps && { title: t("capacities"), children: <Fields fields={caps} /> },
    tags && Array.isArray(tags) && tags.length > 0 && {
      title: t("field_tags"),
      children: <Tags items={tags} />,
    },
  ].filter(Boolean);

  if (sections.length === 0) return null;

  return (
    <div>
      {sections.map((s, i) => (
        <Section key={i} title={s.title}>{s.children}</Section>
      ))}
    </div>
  );
}