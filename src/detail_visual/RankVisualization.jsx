import { useMemo } from "react";
import { useData } from "../DataContext.jsx";
import { useI18n } from "../i18n.jsx";
import { useAsset } from "../assetLoader.jsx";

/* ── Extract unlock XP from item.capacities ──
   Pick the rank-sourced entry with the highest value, use its source_value. */
function getUnlockXp(item) {
  const caps = item.capacities;
  if (!Array.isArray(caps) || caps.length === 0) return null;
  const rankCaps = caps.filter(c => c.source === "rank");
  if (rankCaps.length === 0) return null;
  const best = rankCaps.reduce((a, b) => (b.value || 0) > (a.value || 0) ? b : a);
  return best.source_value !== undefined ? best.source_value : null;
}

/* ── Compact XP display (e.g. "500 XP", "1.5K XP") ── */
function fmtXp(val) {
  if (val >= 100000) return (val / 1000).toFixed(0) + "K";
  if (val >= 1000) return (val / 1000).toFixed(1) + "K";
  return String(val);
}

/* ── Small rank icon badge for the progression band ── */
function RankBadge({ rank, isMatched, isPast, factionColor }) {
  const url = useAsset(rank.hud_icon?.filename);
  const label = String(rank.xp || "");
  return (
    <div style={{
      width: 20, height: 20, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: `1px solid ${isMatched ? factionColor : "var(--border-subtle)"}`,
      background: isMatched ? `${factionColor}22` : isPast ? "var(--bg-surface)" : "transparent",
      boxShadow: isMatched ? `0 0 6px ${factionColor}44` : "none",
      overflow: "hidden",
    }}>
      {url ? (
        <img src={url} alt=""
          style={{ width: 18, height: 18, objectFit: "contain", imageRendering: "auto" }} />
      ) : (
        <span style={{
          fontSize: 8, fontWeight: isMatched ? 700 : 400,
          color: isMatched ? factionColor : isPast ? "var(--text-muted)" : "var(--text-dim)",
          fontFamily: "var(--font-mono)",
        }}>
          {label.slice(0, 4)}
        </span>
      )}
    </div>
  );
}

/* ── Per-faction rank progression card ── */
function FactionRankCard({ faction, xpNeeded, factionColor, idx }) {
  const { translate } = useI18n();
  const { ranks, name, maxXp } = faction;

  let matchedRank = null;
  let matchedIdx = -1;
  for (let i = ranks.length - 1; i >= 0; i--) {
    if (ranks[i].xp * 10 <= xpNeeded) { matchedRank = ranks[i]; matchedIdx = i; break; }
  }
  if (!matchedRank) return null;

  const pct = maxXp > 0 ? Math.min(((xpNeeded / 10) / maxXp) * 100, 100) : 0;
  const xpDisplay = Math.round(xpNeeded * 1000);
  const rankName = translate(matchedRank.name) || matchedRank.name;
  const factionName = translate(name);

  return (
    <div style={{
      border: "1px solid var(--border-subtle)",
      borderTop: `3px solid ${factionColor}`,
      background: "var(--bg-base)",
      animation: `fade-in 0.25s var(--ease-smooth) ${0.06 + idx * 0.06}s both`,
    }}>
      {/* Header: faction name + rank position */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, background: factionColor, borderRadius: "50%", flexShrink: 0 }} />
          <span style={{
            fontSize: "var(--font-sm)", fontWeight: 700, color: "var(--text-primary)",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {factionName}
          </span>
        </div>
        <span style={{
          fontSize: "var(--font-xxs)", color: "var(--text-muted)",
          fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
        }}>
          RANK {matchedIdx + 1}/{ranks.length}
        </span>
      </div>

      {/* Rank progression band */}
      <div style={{
        padding: "10px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center",
      }}>
        {ranks.map((r, i) => {
          const isMatched = i === matchedIdx;
          const isPast = i < matchedIdx;
          const rankLabel = translate(r.name) || r.name;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 3,
            }}>
              {i > 0 && (
                <div style={{
                  width: 8, height: 1,
                  background: isPast ? factionColor : "var(--border-subtle)",
                  opacity: isPast ? 0.5 : 1,
                  marginRight: 2,
                  transition: "background var(--dur-fast) var(--ease-smooth)",
                }} />
              )}
              <RankBadge rank={r} isMatched={isMatched} isPast={isPast} factionColor={factionColor} />
              <span style={{
                fontSize: "var(--font-xxs)", whiteSpace: "nowrap",
                color: isMatched ? factionColor : isPast ? "var(--text-muted)" : "var(--text-dim)",
                fontWeight: isMatched ? 700 : 400,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                transition: "color var(--dur-fast) var(--ease-smooth)",
              }}>
                {rankLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* XP progress bar */}
      <div style={{
        padding: "8px 12px",
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: "var(--font-mono)",
      }}>
        <div style={{
          flex: 1, height: 6, minWidth: 60,
          background: "var(--border-subtle)",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: `linear-gradient(90deg, ${factionColor}88, ${factionColor})`,
            transition: "width var(--dur-norm) var(--ease-smooth)",
          }} />
        </div>
        <span style={{
          fontSize: "var(--font-sm)", fontWeight: 700,
          color: factionColor,
          minWidth: 38, textAlign: "right",
        }}>
          {pct.toFixed(0)}%
        </span>
        <span style={{
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          whiteSpace: "nowrap",
        }}>
          {fmtXp(xpDisplay)} XP
        </span>
        <span style={{
          fontSize: "var(--font-xxs)", color: "var(--text-muted)",
          whiteSpace: "nowrap", fontFamily: "var(--font-text)",
        }}>
          {rankName}
        </span>
      </div>
    </div>
  );
}

/* ── Main export ── */
export default function RankVisualization({ item }) {
  const { data } = useData();
  const { t } = useI18n();

  const xpNeeded = useMemo(() => getUnlockXp(item), [item]);
  const factions = useMemo(() => {
    if (!data?.faction) return [];
    return Object.entries(data.faction)
      .filter(([, f]) => f.ranks && Array.isArray(f.ranks) && f.ranks.length > 0)
      .map(([key, f]) => {
        const fc = f.color
          ? `rgb(${(f.color[0] * 255).toFixed(0)}, ${(f.color[1] * 255).toFixed(0)}, ${(f.color[2] * 255).toFixed(0)})`
          : "var(--accent)";
        const ranks = f.ranks;
        const maxXp = ranks[ranks.length - 1].xp;
        return { key, name: f.name || key, color: fc, ranks, maxXp };
      });
  }, [data]);

  if (xpNeeded === null) return null;
  if (xpNeeded <= 0) return null;
  if (!factions || factions.length === 0) return null;

  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
      <div style={{
        padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        fontFamily: "var(--font-display)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: "var(--font-sm)" }}>◆</span>
        {t("unlock_rank")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: 1 }}>
        {factions.map((f, i) => (
          <FactionRankCard key={f.key}
            faction={f} xpNeeded={xpNeeded}
            factionColor={f.color} idx={i} />
        ))}
      </div>
    </div>
  );
}
