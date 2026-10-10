import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";
import { navigateTo } from "../hashRouter.js";

/**
 * Decodes vehicle `events` (output_schema.md §1): each is a trigger → result
 * pair stored as nested objects that the generic table builder flattens into an
 * unreadable `trigger.class` / `result.class` grid. This renders them as a
 * readable "when X happens → do Y" timeline, linking any spawned entity by its
 * `instance_class` + `instance_key` (e.g. projectile/debri_stun,
 * carry_item/vest3.carry_item) so the reader can jump straight to it.
 */
const TRIGGER_ICON = {
  timer: "mdi:timer-outline",
  health: "mdi:heart-pulse",
  receive_damage: "mdi:shield-off-outline",
  weapon_hit: "mdi:crosshairs",
  enter: "mdi:login",
  exit: "mdi:logout",
  destroy: "mdi:fire",
  cleanup: "mdi:broom",
};
const RESULT_ICON = {
  spawn: "mdi:rocket-launch-outline",
  explosion: "mdi:explosion",
  reward: "mdi:gift-outline",
  damage: "mdi:flash-outline",
  effect: "mdi:sparkles",
};

function humanize(s) {
  return String(s ?? "").replace(/_/g, " ").trim() || "—";
}

export default function VehicleEventsVisualization({ item }) {
  const t = useT();
  const events = item?.events;
  if (!Array.isArray(events) || events.length === 0) return null;

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
        <Icon icon="mdi:swap-horizontal" style={{ fontSize: "var(--font-md)" }} />
        {t("events")}
        <span style={{
          marginLeft: "auto", fontSize: "var(--font-xxs)", fontWeight: 600,
          color: "var(--text-muted)", letterSpacing: "0.06em",
        }}>{t("count_items", events.length)}</span>
      </div>

      <div>
        {events.map((ev, i) => {
          const trig = ev.trigger || {};
          const res = ev.result || {};
          const trigVal = trig.value != null && trig.value !== "" ? ` · ${trig.value}` : "";
          const linkClass = res.instance_class;
          const linkKey = res.instance_key || res.key;
          const hasLink = Boolean(linkClass && linkKey);
          // Spawn results carry a loot range; reward/explosion carry a value.
          const min = res.min_amount, max = res.max_amount;
          const amount = (typeof min === "number" || typeof max === "number")
            ? ` ×${min ?? 0}–${max ?? 0}`
            : "";
          const resVal = res.xp != null ? ` · ${res.xp}` : "";
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
              borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none",
              background: i % 2 ? "var(--bg-base)" : "transparent",
              animation: `fade-in 0.2s var(--ease-smooth) ${0.04 + i * 0.03}s both`,
            }}>
              {/* Trigger */}
              <span style={{
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                color: "var(--info)", fontSize: "var(--font-xs)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 84,
              }}>
                <Icon icon={TRIGGER_ICON[trig.class] || "mdi:lightning-bolt-outline"} style={{ fontSize: 13 }} />
                {humanize(trig.class)}{trigVal}
              </span>

              <Icon icon="mdi:arrow-right-thin" style={{ fontSize: 14, color: "var(--border-mid)", flexShrink: 0 }} />

              {/* Result */}
              <span style={{
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                color: hasLink ? "var(--accent)" : "var(--success)",
                fontSize: "var(--font-xs)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 70,
              }}>
                <Icon icon={RESULT_ICON[res.class] || "mdi:check-circle-outline"} style={{ fontSize: 13 }} />
                {humanize(res.class)}{amount}{resVal}
              </span>

              <span style={{ flex: 1, minWidth: 0, fontSize: "var(--font-xxs)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ev.key ? humanize(ev.key) : ""}
              </span>

              {hasLink && (
                <a
                  href={`/params/${linkClass}/${linkKey}`}
                  onClick={(e) => { e.preventDefault(); navigateTo(`/params/${linkClass}/${linkKey}`); }}
                  style={{
                    fontSize: "var(--font-xxs)", color: "var(--accent)", textDecoration: "underline",
                    textDecorationStyle: "dotted", textUnderlineOffset: 2, cursor: "pointer",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--amber)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                  title={linkKey}
                >
                  {humanize(linkKey.split(".")[0])}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
