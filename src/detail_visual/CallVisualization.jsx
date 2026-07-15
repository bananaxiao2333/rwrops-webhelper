import { Icon } from "@iconify/react";
import { useI18n } from "../i18n.jsx";

/* ── CallVisualization ── */
export default function CallVisualization({ item }) {
  const { translate, t } = useI18n();
  if (!item || item.type !== "call") return null;
  const rounds = item.rounds || [];
  const inventory = item.inventory || {};

  // Determine call type by rounds content
  const deployTypes = [];
  if (rounds.length > 0) {
    const types = new Set(rounds.map(r => r.instance_class).filter(Boolean));
    if (types.has("vehicle") || types.has("soldier")) deployTypes.push(...types);
  }

  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Icon icon="mdi:radio-tower" style={{ fontSize: "var(--font-md)" }} />
        RADIO CALL
      </div>

      {/* Comms — asymmetric: quotes on left, deploy info on right */}
      <div style={{ display: "flex", gap: 12, padding: "10px 14px", flexWrap: "wrap" }}>
        {/* Dialogue block */}
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 4 }}>
          {item.initiation_comment1 && (
            <div style={{ fontSize: "var(--font-base)", color: "var(--text-muted)", fontStyle: "italic", padding: "4px 10px", borderLeft: "2px solid var(--border-mid)", animation: "fade-in 0.25s var(--ease-smooth) 0.06s both", fontFamily: "var(--font-text)", lineHeight: 1.5 }}>
              "{translate(item.initiation_comment1)}"
            </div>
          )}
          {item.acknowledge_comment && (
            <div style={{ fontSize: "var(--font-base)", color: "var(--accent-dim)", fontStyle: "italic", padding: "4px 10px", borderLeft: "2px solid var(--accent)", animation: "fade-in 0.25s var(--ease-smooth) 0.1s both", fontFamily: "var(--font-text)", lineHeight: 1.5 }}>
              "{translate(item.acknowledge_comment)}"
            </div>
          )}
          {item.launch_comment && (
            <div style={{ fontSize: "var(--font-base)", color: "var(--text-secondary)", fontStyle: "italic", padding: "4px 10px", borderLeft: "2px solid var(--border-mid)", animation: "fade-in 0.25s var(--ease-smooth) 0.14s both", fontFamily: "var(--font-text)", lineHeight: 1.5 }}>
              "{translate(item.launch_comment)}"
            </div>
          )}
        </div>

        {/* Metadata badges */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "flex-start", animation: "fade-in 0.25s var(--ease-smooth) 0.08s both" }}>
          {deployTypes.map(dt => (
            <span key={dt} style={{
              padding: "3px 8px", fontSize: "var(--font-xs)", fontWeight: 700,
              border: "1px solid var(--accent)",
              color: "var(--accent)", textTransform: "uppercase",
            }}>
              <Icon icon={dt === "vehicle" ? "mdi:truck" : "mdi:account-multiple"} style={{ fontSize: "var(--font-sm)", marginRight: 4 }} />
              {dt === "vehicle" ? t("vehicle_drop") : t("infantry_drop")}
            </span>
          ))}
          {item.notify_metagame ? (
            <span style={{ padding: "3px 8px", fontSize: "var(--font-xs)", border: "1px solid var(--danger)", color: "var(--danger)" }}>
              GLOBAL NOTIFY
            </span>
          ) : null}
          {inventory.price > 0 && (
            <span style={{ padding: "3px 8px", fontSize: "var(--font-xs)", border: "1px solid var(--border-mid)", color: "var(--text-muted)" }}>
              ${inventory.price}
            </span>
          )}
        </div>
      </div>

      {/* Rounds timeline */}
      {rounds.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ padding: "6px 14px", fontSize: "var(--font-xs)", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
            DEPLOYMENT WAVES
          </div>
          {rounds.map((r, i) => {
            const totalDelay = (r.launch_time || 0) + (r.spawn_time || 0);
            return (
              <div key={i} style={{
                display: "flex", gap: 8, alignItems: "center",
                padding: "6px 14px",
                borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none",
                background: i % 2 ? "var(--bg-base)" : "transparent",
                animation: `fade-in 0.25s var(--ease-smooth) ${0.1 + i * 0.04}s both`,
              }}>
                <span style={{ fontSize: "var(--font-sm)", color: "var(--accent)", fontWeight: 700, minWidth: 20 }}>
                  #{i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--font-sm)", color: "var(--text-primary)", textTransform: "uppercase" }}>
                    {r.instance_key ? translate(r.instance_key) : (r.instance_class || "—")}
                    {r.instances > 1 && <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>×{r.instances}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: "var(--font-xxs)", color: "var(--text-muted)", marginTop: 2 }}>
                    <span>LAUNCH: {r.launch_time || 0}s</span>
                    <span>SPAWN: {r.spawn_time || 0}s</span>
                    {r.vertical_offset_at_spawn > 0 && <span>ALT: {r.vertical_offset_at_spawn}m</span>}
                  </div>
                </div>
                {/* visual bar */}
                <div style={{
                  width: 60, height: 4, background: "var(--border-subtle)", borderRadius: 2, flexShrink: 0,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    width: `${((r.launch_time || 0) / (totalDelay || 1)) * 100}%`,
                    height: "100%", background: "var(--accent)",
                    position: "absolute", left: 0, top: 0,
                  }} />
                  <div style={{
                    left: `${((r.launch_time || 0) / (totalDelay || 1)) * 100}%`,
                    width: `${((r.spawn_time || 0) / (totalDelay || 1)) * 100}%`,
                    height: "100%", background: "var(--danger)",
                    position: "absolute", top: 0,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Capacities if present */}
      {item.capacities && Array.isArray(item.capacities) && item.capacities.length > 0 && (
        <div style={{ padding: "6px 14px", borderTop: "1px solid var(--border-subtle)", fontSize: "var(--font-xxs)", color: "var(--text-dim)" }}>
          UNLOCK: RANK {item.capacities.map(c => (c.source_value * 100).toFixed(0) + "%").join(" → ")}
        </div>
      )}
    </div>
  );
}
