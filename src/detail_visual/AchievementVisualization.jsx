import { Icon } from "@iconify/react";
import { useMemo } from "react";
import { useI18n } from "../i18n.jsx";

/* ── Achievement milestone visualization ── */
export default function AchievementVisualization({ item }) {
  const { translate } = useI18n();
  if (!item || item.type !== "achievement") return null;
  const levels = item.levels || [];
  const criteria = item.criteria_list || [];

  // Merge criteria thresholds into levels
  const levelData = useMemo(() => {
    if (criteria.length === 0) return levels.map((l, i) => ({ level: l, threshold: null, idx: i }));

    const thresholds = criteria.flatMap(c => c.level_thresholds || []);
    return levels.map((l, i) => ({
      level: l,
      threshold: thresholds[i] || null,
      idx: i,
    }));
  }, [levels, criteria]);

  const maxThreshold = levelData.reduce((m, ld) => {
    const v = ld.threshold?.value || 0;
    return v > m ? v : m;
  }, 0);

  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Icon icon="mdi:trophy" style={{ fontSize: "var(--font-md)" }} />
        ACHIEVEMENT · {item.key}
      </div>

      {/* Criteria description — asymmetric */}
      <div style={{ display: "flex", gap: 8, padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
        {criteria.map((c, ci) => (
          <div key={ci} style={{
            flex: "1 1 180px",
            padding: "6px 10px",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-base)",
            animation: `fade-in 0.25s var(--ease-smooth) ${0.06 + ci * 0.04}s both`,
          }}>
            <div style={{ fontSize: "var(--font-xs)", color: "var(--accent)", textTransform: "uppercase", marginBottom: 3 }}>
              <Icon icon={
                c.class === "vehicle_destroy" ? "mdi:truck" :
                c.class === "kill" ? "mdi:crosshairs" :
                c.class === "death" ? "mdi:skull" :
                c.class === "shot_fired" ? "mdi:gun" :
                c.class === "kill_stab" ? "mdi:knife" :
                c.class === "kill_blast" ? "mdi:explosion" :
                c.class === "vehicle_spot" ? "mdi:binoculars" :
                c.class === "custom_stat" ? "mdi:chart-line" :
                "mdi:information-outline"
              } style={{ fontSize: "var(--font-sm)", marginRight: 4 }} />
              {c.class}
            </div>
            {c.description && (
              <div style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", fontStyle: "italic", fontFamily: "var(--font-text)", lineHeight: 1.5 }}>
                {translate(c.description)}
              </div>
            )}
            {c.vehicles && c.vehicles.length > 0 && (
              <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                {c.vehicles.map((v, vi) => (
                  <span key={vi} style={{
                    fontSize: "var(--font-xxs)", padding: "1px 5px",
                    border: "1px solid var(--border-subtle)", color: "var(--text-dim)",
                  }}>
                    {v.tag || v.key || "—"}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Level progression */}
      {levelData.length > 0 && (
        <div>
          {levelData.map((ld, i) => {
            const rank = ld.level.rank || {};
            const notification = ld.level.notification || {};
            const req = ld.threshold?.value || 0;
            const pct = maxThreshold > 0 ? (req / maxThreshold) * 100 : 0;
            const isLast = i === levelData.length - 1;
            const steamId = ld.level.steam_achievement_id;

            return (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "8px 14px",
                borderBottom: "1px solid var(--border-subtle)",
                background: isLast ? "var(--bg-elevated)" : (i % 2 ? "var(--bg-base)" : "transparent"),
                animation: `fade-in 0.25s var(--ease-smooth) ${0.06 + i * 0.04}s both`,
              }}>
                {/* Level badge */}
                <div style={{
                  width: 32, height: 32, flexShrink: 0,
                  border: `2px solid ${isLast ? "var(--accent)" : "var(--border-mid)"}`,
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "var(--font-sm)", fontWeight: 800,
                  color: isLast ? "var(--accent)" : "var(--text-muted)",
                  background: isLast ? "rgba(245,158,11,0.08)" : "var(--bg-base)",
                  fontFamily: "var(--font-display)",
                }}>
                  {i + 1}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--font-sm)", color: "var(--text-primary)", textTransform: "uppercase", fontWeight: 600 }}>
                    {translate(rank.title) || "—"}
                  </div>
                  {steamId && (
                    <div style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", marginTop: 1 }}>
                      {steamId}
                    </div>
                  )}
                  {req > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 4, background: "var(--border-subtle)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          width: `${pct}%`, height: "100%",
                          background: isLast ? "var(--accent)" : "var(--border-mid)",
                        }} />
                      </div>
                      <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-muted)", flexShrink: 0 }}>
                        {req}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Steam notification */}
      {item.include_in_alltime_stats !== undefined && (
        <div style={{
          padding: "4px 14px", borderTop: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
        }}>
          ALL-TIME STATS: {item.include_in_alltime_stats ? "YES" : "NO"}
        </div>
      )}
    </div>
  );
}
