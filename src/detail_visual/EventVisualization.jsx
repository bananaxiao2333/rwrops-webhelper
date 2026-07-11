import { Icon } from "@iconify/react";
import React, { useState } from "react";

const ICON_MAP = {
  projectile_blast_result: "mdi:explosion",
  projectile_hit_result: "mdi:target",
  melee_hit_result: "mdi:sword",
  speed: "mdi:speedometer",
  hit_success_probability: "mdi:accuracy",
  detectability: "mdi:eye-outline",
  spawn: "mdi:plus-circle",
  reward: "mdi:gift",
  faction_resources: "mdi:currency-usd",
};

import { useT } from "../i18n.jsx";

export default function EventVisualization({ item }) {
  const t = useT();
  const [expandedId, setExpandedId] = useState(null);

  if (!item || (!item.modifiers && !item.events)) return null;

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
    <div style={{
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-base)", fontWeight: 700,
        color: "var(--accent)", textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
        {t("events_modifiers")}
      </div>

      <div style={{ overflow: "auto", maxWidth: "100%" }}>
      <table style={{
        minWidth: 480,
        width: "100%", tableLayout: "fixed",
        borderCollapse: "collapse",
        fontSize: "var(--font-sm)", color: "var(--text-primary)",
      }}>
        <colgroup>
          <col style={{ width: "20%" }} />
          <col style={{ width: "35%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "15%" }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-mid)" }}>
            {[t("start"), t("class_label"), t("details_label"), t("consumes")].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "7px 12px",
                color: "var(--text-muted)", fontSize: 8,
                fontWeight: 600, letterSpacing: "0.1em",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((event, idx) => {
            const isExpanded = expandedId === event.id;
            return (
              <React.Fragment key={event.id}>
                <tr onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  style={{
                    cursor: "pointer",
                    borderBottom: isExpanded ? "none" : "1px solid var(--border-subtle)",
                    background: isExpanded ? "var(--bg-elevated)" : idx % 2 ? "var(--bg-base)" : "transparent",
                  }}
                >
                  <td style={{ padding: "7px 12px", whiteSpace: "nowrap" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 6px", fontSize: "var(--font-xxs)", fontWeight: 700,
                      border: "1px solid var(--border-mid)",
                      color: event.type === "combat_result" ? "var(--danger)" : "var(--info)",
                      textTransform: "uppercase",
                    }}>
                      {event.type === "combat_result" ? t("state") : t("stats")}
                    </span>
                  </td>
                  <td style={{ padding: "7px 12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon icon={ICON_MAP[event.class] || "mdi:information-outline"}
                        style={{ fontSize: "var(--font-base)", color: "var(--accent)", flexShrink: 0 }} />
                      <span style={{ textTransform: "uppercase", fontSize: "var(--font-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.class}</span>
                    </div>
                  </td>
                  <td style={{ padding: "7px 12px", fontSize: "var(--font-sm)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                    {event.type === "combat_result"
                      ? `${event.inputState} → ${event.outputState}`
                      : `${(event.value * 100).toFixed(1)}%`}
                  </td>
                  <td style={{ padding: "7px 12px" }}>
                    {event.consumesItem !== undefined ? (
                      event.consumesItem ? (
                        <span style={{ color: "var(--danger)", fontWeight: 600 }}>YES</span>
                      ) : (
                        <span style={{ color: "var(--success)" }}>NO</span>
                      )
                    ) : (
                      <span style={{ color: "var(--text-dim)" }}>—</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
                    <td colSpan={4} style={{ padding: "10px 16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--font-sm)", fontFamily: "var(--font-mono)" }}>
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
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      </div>

      {expandedId && (
        <div style={{
          padding: "6px 14px",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
        }}>
          {t("click_collapse")}
        </div>
      )}
    </div>
  );
}
