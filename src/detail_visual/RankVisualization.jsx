import { useMemo } from "react";
import { useData } from "../DataContext.jsx";
import { useI18n } from "../i18n.jsx";

/* ── Extract unlock XP from item.capacities ──
   Pick the rank-sourced entry with the highest value, use its source_value. */
function getUnlockXp(item) {
  const caps = item.capacities;
  if (!Array.isArray(caps) || caps.length === 0) return null;
  const rankCaps = caps.filter(c => c.source === "rank");
  if (rankCaps.length === 0) return null;
  // Highest value wins
  const best = rankCaps.reduce((a, b) => (b.value || 0) > (a.value || 0) ? b : a);
  return best.source_value !== undefined ? best.source_value : null;
}

function FactionRow({ faction, rankName, xpNeeded, factionColor, pct }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 10px", borderBottom: "1px solid var(--border-subtle)",
      fontSize: "var(--font-sm)", fontFamily: "var(--font-mono)",
    }}>
      <div style={{ width: 8, height: 8, background: factionColor, flexShrink: 0, borderRadius: "50%" }} />
      <span style={{ color: "var(--text-muted)", minWidth: 80, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        {faction}
      </span>
      <div style={{ flex: 1, height: 4, background: "var(--border-subtle)", minWidth: 60, maxWidth: 160, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: factionColor, opacity: 0.6 }} />
      </div>
      <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "var(--font-sm)", minWidth: 60 }}>
        {rankName}
      </span>
      <span style={{ color: "var(--text-dim)", fontSize: 8, whiteSpace: "nowrap" }}>
        {xpNeeded >= 1000 ? (xpNeeded / 1000).toFixed(xpNeeded >= 100000 ? 0 : 1) + "K" : String(xpNeeded)} XP
      </span>
    </div>
  );
}

export default function RankVisualization({ item }) {
  const { data } = useData();
  const { translate, t } = useI18n();

  const xpNeeded = useMemo(() => getUnlockXp(item), [item]);
  const factions = useMemo(() => {
    if (!data?.faction) return [];
    return Object.entries(data.faction)
      .filter(([, f]) => f.ranks && Array.isArray(f.ranks) && f.ranks.length > 0)
      .map(([key, f]) => {
        const fc = f.color
          ? `rgb(${(f.color[0] * 255).toFixed(0)}, ${(f.color[1] * 255).toFixed(0)}, ${(f.color[2] * 255).toFixed(0)})`
          : "var(--accent)";
        const lastRank = f.ranks[f.ranks.length - 1];
        const pct = Math.min((xpNeeded / (lastRank?.xp || 1)) * 100, 100);
        const rankName = translate(f.ranks.find(r => r.xp >= xpNeeded)?.name || lastRank?.name || "");
        return { key, color: fc, rankName, pct };
      })
      .filter(r => r.pct > 0);
  }, [data, xpNeeded, translate]);

  if (xpNeeded === null) return null;
  if (xpNeeded <= 0) return null;
    return Object.entries(data.faction)
      .filter(([, f]) => f.ranks && Array.isArray(f.ranks) && f.ranks.length > 0)
      .map(([key, f]) => {
        const ranks = f.ranks;
        const maxXp = ranks[ranks.length - 1].xp;
        const color = f.color
          ? `rgb(${(f.color[0] * 255).toFixed(0)}, ${(f.color[1] * 255).toFixed(0)}, ${(f.color[2] * 255).toFixed(0)})`
          : "var(--accent)";
        return { key, name: f.name || key, ranks, maxXp, color };
      });
  }, [data]);

  if (factions.length === 0) return null;

  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", fontFamily: "var(--font-mono)" }}>
      <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)", fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {t("unlock_rank")}
      </div>
      <div style={{ maxHeight: 240, overflow: "auto" }}>
        {factions.map(f => {
          let matchedRank = null;
          for (let i = f.ranks.length - 1; i >= 0; i--) {
            if (f.ranks[i].xp * 10 <= xpNeeded) { matchedRank = f.ranks[i]; break; }
          }
          if (!matchedRank) return null;

          const rankName = translate(matchedRank.name) || matchedRank.name;
          const xpDisplay = Math.round(xpNeeded * 1000);
          const pct = f.maxXp > 0 ? Math.min(((xpNeeded / 10) / f.maxXp) * 100, 100) : 0;

          return (
            <FactionRow key={f.key} faction={translate(f.name) || f.key}
              rankName={rankName} xpNeeded={xpDisplay}
              factionColor={f.color} pct={pct} />
          );
        })}
      </div>
    </div>
  );
}
