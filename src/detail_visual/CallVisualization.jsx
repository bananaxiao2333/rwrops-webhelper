import { Icon } from "@iconify/react";
import { useI18n } from "../i18n.jsx";

export default function CallVisualization({ item }) {
  const { translate, t } = useI18n();
  if (!item || item.type !== "call") return null;
  const rounds = item.rounds || [];
  const inventory = item.inventory || {};

  const deployTypes = [];
  if (rounds.length > 0) {
    const types = new Set(rounds.map(r => r.instance_class).filter(Boolean));
    if (types.has("vehicle") || types.has("soldier")) deployTypes.push(...types);
  }

  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", fontFamily: "var(--font-mono)" }}>
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "var(--font-display)",
      }}>
        <Icon icon="mdi:radio-tower" style={{ fontSize: "var(--font-md)" }} />
        {t("radio_call")}
      </div>

      <div style={{ display: "flex", gap: 12, padding: "10px 14px", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 5 }}>
          {item.initiation_comment1 && (
            <div style={{
              fontSize: "var(--font-base)", color: "var(--text-muted)",
              fontStyle: "italic", padding: "5px 10px",
              borderLeft: "2px solid var(--border-mid)",
              animation: "fade-in 0.25s var(--ease-smooth) 0.06s both",
              fontFamily: "var(--font-text)", lineHeight: 1.5,
              background: "linear-gradient(90deg, var(--bg-base) 0%, transparent 100%)",
            }}>
              <Icon icon="mdi:radio-handheld" style={{ fontSize: 12, marginRight: 6, color: "var(--text-dim)" }} />
              "{translate(item.initiation_comment1)}"
            </div>
          )}
          {item.acknowledge_comment && (
            <div style={{
              fontSize: "var(--font-base)", color: "var(--accent-dim)",
              fontStyle: "italic", padding: "5px 10px",
              borderLeft: "2px solid var(--accent)",
              animation: "fade-in 0.25s var(--ease-smooth) 0.1s both",
              fontFamily: "var(--font-text)", lineHeight: 1.5,
              background: "linear-gradient(90deg, var(--bg-base) 0%, transparent 100%)",
            }}>
              <Icon icon="mdi:check-circle-outline" style={{ fontSize: 12, marginRight: 6, color: "var(--accent-dim)" }} />
              "{translate(item.acknowledge_comment)}"
            </div>
          )}
          {item.launch_comment && (
            <div style={{
              fontSize: "var(--font-base)", color: "var(--text-secondary)",
              fontStyle: "italic", padding: "5px 10px",
              borderLeft: "2px solid var(--border-mid)",
              animation: "fade-in 0.25s var(--ease-smooth) 0.14s both",
              fontFamily: "var(--font-text)", lineHeight: 1.5,
              background: "linear-gradient(90deg, var(--bg-base) 0%, transparent 100%)",
            }}>
              <Icon icon="mdi:rocket-launch" style={{ fontSize: 12, marginRight: 6, color: "var(--text-dim)" }} />
              "{translate(item.launch_comment)}"
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "flex-start", animation: "fade-in 0.25s var(--ease-smooth) 0.08s both" }}>
          {deployTypes.map(dt => (
            <span key={dt} style={{
              padding: "3px 8px", fontSize: "var(--font-xs)", fontWeight: 700,
              border: "1px solid var(--accent)",
              color: "var(--accent)", textTransform: "uppercase",
              display: "inline-flex", alignItems: "center", gap: 4,
              letterSpacing: "0.06em",
            }}>
              <Icon icon={dt === "vehicle" ? "mdi:truck" : "mdi:account-multiple"}
                style={{ fontSize: "var(--font-sm)" }} />
              {dt === "vehicle" ? t("vehicle_drop") : t("infantry_drop")}
            </span>
          ))}
          {item.notify_metagame ? (
            <span style={{
              padding: "3px 8px", fontSize: "var(--font-xs)", fontWeight: 700,
              border: "1px solid var(--danger)", color: "var(--danger)",
              display: "inline-flex", alignItems: "center", gap: 4,
              letterSpacing: "0.06em",
            }}>
              <Icon icon="mdi:broadcast" style={{ fontSize: 11 }} />
              {t("global_notify")}
            </span>
          ) : null}
          {inventory.price > 0 && (
            <span style={{
              padding: "3px 8px", fontSize: "var(--font-xs)",
              border: "1px solid var(--border-mid)", color: "var(--text-muted)",
              display: "inline-flex", alignItems: "center", gap: 4,
              fontFamily: "var(--font-mono)",
            }}>
              <Icon icon="mdi:currency-usd" style={{ fontSize: 11 }} />
              ${inventory.price}
            </span>
          )}
        </div>
      </div>

      {rounds.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{
            padding: "6px 14px", fontSize: "var(--font-xs)", color: "var(--text-muted)",
            letterSpacing: "0.06em",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Icon icon="mdi:timeline-clock-outline" style={{ fontSize: 11 }} />
            {t("deployment_waves")}
          </div>
          {rounds.map((r, i) => {
            const totalDelay = (r.launch_time || 0) + (r.spawn_time || 0) || 1;
            const launchPct = ((r.launch_time || 0) / totalDelay) * 100;
            const spawnPct = ((r.spawn_time || 0) / totalDelay) * 100;
            return (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "center",
                padding: "8px 14px",
                borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none",
                background: i % 2 ? "var(--bg-base)" : "transparent",
                animation: `fade-in 0.25s var(--ease-smooth) ${0.08 + i * 0.04}s both`,
                transition: "background var(--dur-fast) var(--ease-smooth)",
              }}>
                <span style={{
                  fontSize: "var(--font-sm)", color: "var(--accent)", fontWeight: 700,
                  fontFamily: "var(--font-display)", minWidth: 24,
                }}>
                  {i + 1}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--font-sm)", color: "var(--text-primary)", textTransform: "uppercase", fontWeight: 600 }}>
                    {r.instance_key ? translate(r.instance_key) : (r.instance_class || "—")}
                    {r.instances > 1 && <span style={{ color: "var(--text-muted)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>×{r.instances}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: "var(--font-xxs)", color: "var(--text-dim)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                    <span>{t("launch")}: {r.launch_time || 0}s</span>
                    <span>{t("spawn")}: {r.spawn_time || 0}s</span>
                    {r.vertical_offset_at_spawn > 0 && <span>{t("alt")}: {r.vertical_offset_at_spawn}m</span>}
                  </div>
                </div>

                <div style={{
                  width: 80, height: 6, background: "var(--border-subtle)", flexShrink: 0,
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{
                    width: `${launchPct}%`, height: "100%",
                    background: "var(--accent)",
                    position: "absolute", left: 0, top: 0,
                    transition: "width var(--dur-norm) var(--ease-smooth)",
                  }} />
                  <div style={{
                    left: `${launchPct}%`,
                    width: `${spawnPct}%`, height: "100%",
                    background: "var(--danger)",
                    position: "absolute", top: 0,
                    transition: "width var(--dur-norm) var(--ease-smooth)",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {item.capacities && Array.isArray(item.capacities) && item.capacities.length > 0 && (
        <div style={{
          padding: "6px 14px", borderTop: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <Icon icon="mdi:lock-outline" style={{ fontSize: 10 }} />
          {t("unlock")}: {t("rank")} {item.capacities.map(c => (c.source_value * 100).toFixed(0) + "%").join(" → ")}
        </div>
      )}
    </div>
  );
}
