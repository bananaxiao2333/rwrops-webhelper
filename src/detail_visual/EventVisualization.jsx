import { Icon } from "@iconify/react";
import React, { useState } from "react";
import { useT } from "../i18n.jsx";
import VizFrame from "./VizFrame";

const ICON_MAP = {
  projectile_blast_result: "mdi:explosion",
  projectile_hit_result: "mdi:target",
  melee_hit_result: "mdi:sword",
  speed: "mdi:speedometer",
  hit_success_probability: "mdi:crosshairs",
  detectability: "mdi:eye-outline",
  spawn: "mdi:plus-circle",
  reward: "mdi:gift",
  faction_resources: "mdi:currency-usd",
};

export default function EventVisualization({ item }) {
  const t = useT();
  const [expandedId, setExpandedId] = useState(null);

  /* weapon/carry_item modifiers and vehicle events are decoded by the
   * dedicated Modifiers / VehicleEvents visualizations; this generic fallback
   * only kicks in for other types. */
  if (!item || item.type === "weapon" || item.type === "carry_item" || item.type === "vehicle" ||
      (!item.modifiers && !item.events)) return null;

  const eventsSource = item.events || item.modifiers || [];
  const events = [];

  eventsSource.forEach((modifier, index) => {
    if (modifier.class && !["speed", "hit_success_probability", "detectability"].includes(modifier.class)) {
      const consumesItem = modifier.consumes_item !== undefined
        ? modifier.consumes_item
        : item.transform_on_consume ? true : false;
      events.push({
        id: `combat-${index}`,
        type: "combat_result",
        class: modifier.class,
        inputState: modifier.input_character_state || "any",
        outputState: modifier.output_character_state || "none",
        consumesItem,
      });
    } else if (modifier.class && ["speed", "hit_success_probability", "detectability"].includes(modifier.class)) {
      events.push({
        id: `stat-${index}`,
        type: "stat_modifier",
        class: modifier.class,
        value: modifier.value || 0,
      });
    }
  });

  if (events.length === 0) return null;

  return (
    <VizFrame icon="mdi:lightning-bolt" title={t("events_modifiers")} lead={t("viz_lead_events_modifiers")}>
      <div>
        {events.map((event, idx) => {
          const isExpanded = expandedId === event.id;
          return (
            <React.Fragment key={event.id}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : event.id)}
                style={{
                  cursor: "pointer", userSelect: "none",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 14px",
                  borderBottom: isExpanded ? "none" : "1px solid var(--border-subtle)",
                  background: isExpanded ? "var(--bg-elevated)" : "transparent",
                  animation: `fade-in 0.2s var(--ease-out) ${0.04 + idx * 0.035}s both`,
                  transition: "background var(--dur-fast) var(--ease-smooth)",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", fontSize: "var(--font-xxs)", fontWeight: 700,
                  border: `1px solid ${event.type === "combat_result" ? "var(--danger)" : "var(--info)"}`,
                  color: event.type === "combat_result" ? "var(--danger)" : "var(--info)",
                  textTransform: "uppercase", flexShrink: 0,
                }}>
                  <Icon icon={event.type === "combat_result" ? "mdi:sword-cross" : "mdi:chart-line"}
                    style={{ fontSize: 10 }} />
                  {event.type === "combat_result" ? t("state") : t("stats")}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                  <Icon icon={ICON_MAP[event.class] || "mdi:information-outline"}
                    style={{ fontSize: "var(--font-base)", color: "var(--accent)", flexShrink: 0 }} />
                  <span style={{
                    textTransform: "uppercase", fontSize: "var(--font-sm)",
                    color: "var(--text-primary)", fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {event.class}
                  </span>
                </div>

                <span style={{
                  fontSize: "var(--font-xs)", color: "var(--text-secondary)", flexShrink: 0,
                }}>
                  {event.type === "combat_result"
                    ? `${event.inputState} → ${event.outputState}`
                    : `${(event.value * 100).toFixed(1)}%`}
                </span>

                <span style={{ flexShrink: 0, minWidth: 28, textAlign: "right" }}>
                  {event.consumesItem !== undefined ? (
                    event.consumesItem ? (
                      <span style={{ color: "var(--danger)", fontWeight: 600, fontSize: "var(--font-xxs)" }}>
                        <Icon icon="mdi:delete" style={{ fontSize: 11, marginRight: 2 }} />
                        {t("consumes")}
                      </span>
                    ) : (
                      <span style={{ color: "var(--success)", fontSize: "var(--font-xxs)" }}>
                        <Icon icon="mdi:check" style={{ fontSize: 11 }} />
                      </span>
                    )
                  ) : (
                    <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)" }}>—</span>
                  )}
                </span>

                <Icon icon={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"}
                  style={{ fontSize: 14, color: "var(--text-dim)", flexShrink: 0 }} />
              </div>

              {isExpanded && (
                <div style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: "var(--bg-elevated)",
                  padding: "10px 16px 12px",
                  animation: "fade-in 0.15s var(--ease-smooth) both",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "var(--font-sm)" }}>
                    {Object.entries(event).filter(([k]) => k !== "id").map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: 12 }}>
                        <span style={{ color: "var(--text-muted)", minWidth: 80, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {k}
                        </span>
                        <span style={{ color: "var(--text-primary)" }}>
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {expandedId && (
        <div style={{
          padding: "5px 14px",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <Icon icon="mdi:mouse" style={{ fontSize: 10 }} />
          {t("click_collapse")}
        </div>
      )}
    </VizFrame>
  );
}
