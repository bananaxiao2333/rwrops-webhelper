import { useI18n } from "../i18n.jsx";
import { useAsset } from "../assetLoader.jsx";

/* ── Faction rank tree visualization ── */
export default function FactionVisualization({ item }) {
  const { translate, t } = useI18n();
  if (!item || item.type !== "faction") return null;
  const factionColor = item.color
    ? `rgb(${(item.color[0] * 255).toFixed(0)}, ${(item.color[1] * 255).toFixed(0)}, ${(item.color[2] * 255).toFixed(0)})`
    : "var(--accent)";

  const ranks = item.ranks || [];
  const soldierCount = item.soldiers ? item.soldiers.length : 0;

  const iconList = [
    { label: t("chat"), file: item.chat_icon },
    { label: t("supporter"), file: item.chat_icon_supporter },
    { label: t("commander"), file: item.chat_icon_commander },
    { label: t("campaign"), file: item.campaign_icon },
  ].filter(x => x.file);

  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", fontFamily: "var(--font-mono)" }}>
      {/* Header with faction color */}
      <div style={{
        padding: "12px 16px", borderBottom: `2px solid ${factionColor}`,
        fontSize: "var(--font-md)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 12, height: 12, background: factionColor, flexShrink: 0 }} />
          <span style={{ fontSize: "var(--font-md)" }}>{t("faction")}</span>
        </div>
        <span style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", fontWeight: 400 }}>
          {ranks.length} {t("ranks")} · {soldierCount} {t("templates")}
        </span>
      </div>

      {/* Faction icon badges */}
      {iconList.length > 0 && (
        <div style={{
          display: "flex", gap: 6, padding: "8px 14px",
          borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap", flexShrink: 0,
          alignItems: "center",
          animation: "fade-in 0.25s var(--ease-smooth) 0.06s both",
        }}>
          {iconList.map((ic, i) => (
            <div key={i} style={{ animation: `fade-in 0.25s var(--ease-smooth) ${0.08 + i * 0.04}s both` }}>
              <FactionIcon file={ic.file} label={ic.label} factionColor={factionColor} />
            </div>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
            {t("queue")}: {item.radio_queue_size || 0}
          </span>
        </div>
      )}

      {/* Soldiers summary */}
      {item.soldiers && item.soldiers.length > 0 && (
        <div style={{ display: "flex", gap: 8, padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
          {item.soldiers.map((s, i) => (
            <div key={i} style={{
              border: "1px solid var(--border-subtle)", padding: "6px 10px",
              background: "var(--bg-base)", flex: "1 1 160px",
              animation: `fade-in 0.25s var(--ease-smooth) ${0.08 + i * 0.04}s both`,
            }}>
              <div style={{ fontSize: "var(--font-sm)", color: "var(--text-primary)", letterSpacing: "0.06em" }}>
                {translate(s.name)}
              </div>
              {s.item_existence && s.item_existence.length > 0 && (
                <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {s.item_existence.map((ie, ji) => (
                    <span key={ji} style={{
                      fontSize: "var(--font-xxs)", padding: "1px 5px",
                      border: "1px solid var(--border-subtle)", color: "var(--text-muted)",
                    }}>
                      {ie.class}×SLOT{ie.slot} {(ie.probability * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rank ladder */}
      {ranks.length > 0 && (
        <div>
          {ranks.map((rank, i) => {
            const isMajor = i > 0 && rank.xp >= ranks[i - 1].xp * 5;
            return (
              <div key={i} style={{
                display: "flex", gap: 8, alignItems: "center",
                padding: "8px 14px",
                borderBottom: "1px solid var(--border-subtle)",
                background: isMajor ? "var(--bg-elevated)" : (i % 2 ? "var(--bg-base)" : "transparent"),
                animation: `fade-in 0.2s var(--ease-smooth) ${0.04 + i * 0.025}s both`,
              }}>
                <RankIcon filename={rank.hud_icon?.filename} rankNum={i + 1} isMajor={isMajor} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: "var(--font-sm)", color: "var(--text-primary)", textTransform: "uppercase", fontWeight: 600 }}>
                {translate(rank.name)}
              </div>
                  {rank.hud_icon?.filename && (
                    <div style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
                      {rank.hud_icon.filename}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)", minWidth: 64, textAlign: "right", flexShrink: 0, fontFamily: "var(--font-display)",
                }}>
                  {(rank.xp * 10000).toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Sub-component: rank icon from PNG ── */
function RankIcon({ filename, rankNum, isMajor }) {
  const url = useAsset(filename);
  return (
    <div style={{
      width: 40, height: 40, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {url ? (
        <img src={url} alt=""
          style={{ width: 40, height: 40, objectFit: "contain", imageRendering: "auto" }} />
      ) : (
        <span style={{
          width: 40, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${isMajor ? "var(--accent)" : "var(--border-mid)"}`,
          fontSize: "var(--font-base)", fontWeight: 800, color: isMajor ? "var(--accent)" : "var(--text-muted)",
          fontFamily: "var(--font-display)",
        }}>
          {rankNum}
        </span>
      )}
    </div>
  );
}

/* ── Sub-component: faction icon badge ── */
function FactionIcon({ file, label, factionColor }) {
  const url = useAsset(file);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      border: `1px solid ${factionColor}`, padding: "2px 8px",
      fontSize: "var(--font-xxs)", color: "var(--text-primary)",
      minHeight: 24,
    }}>
      {url ? (
        <img src={url} alt="" style={{ width: 24, height: 24, objectFit: "contain", imageRendering: "auto" }} />
      ) : (
        <div style={{ width: 24, height: 24, background: factionColor, opacity: 0.3, borderRadius: 2 }} />
      )}
      <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
    </div>
  );
}