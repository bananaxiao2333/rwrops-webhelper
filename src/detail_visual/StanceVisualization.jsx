import { useState, useEffect } from "react";
import { useT } from "../i18n.jsx";

const stanceImageModules = import.meta.glob("./stance_img/*.png", { eager: false });

export default function StanceVisualization({ item }) {
  const t = useT();
  const [stanceImages, setStanceImages] = useState({});

  if (!item?.stances || !Array.isArray(item.stances) || item.stances.length === 0) return null;

  const itemAccuracyFactor = item.accuracy_factor || 1.0;

  useEffect(() => {
    let cancelled = false;
    const loadImages = async () => {
      const images = {};
      const stanceKeys = ['crouch_moving', 'crouching', 'over_wall', 'prone', 'prone_moving', 'running', 'standing', 'walking'];
      for (const key of stanceKeys) {
        const modulePath = `./stance_img/${key}.png`;
        if (stanceImageModules[modulePath]) {
          try {
            const module = await stanceImageModules[modulePath]();
            images[key] = module.default;
          } catch (error) {
            console.warn(`Failed to load stance image for ${key}:`, error);
          }
        }
      }
      if (!cancelled) setStanceImages(images);
    };
    loadImages();
    return () => { cancelled = true; };
  }, []);

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
        {t("stances")}
      </div>
      <div style={{
        padding: "6px 14px",
        fontSize: "var(--font-xs)", color: "var(--text-muted)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        {t("stance_acc").replace("{0}", itemAccuracyFactor)}
      </div>
      <table style={{
        width: "100%", borderCollapse: "collapse",
        fontSize: "var(--font-sm)", color: "var(--text-primary)",
      }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-mid)" }}>
            {[t("stance"), t("state"), t("accuracy"), t("start")].map((h, i) => (
              <th key={i} style={{
                textAlign: i === 0 ? "center" : "left",
                padding: "7px 12px",
                color: "var(--text-muted)", fontSize: "var(--font-xs)",
                fontWeight: 600, letterSpacing: "0.1em",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {item.stances.map((stance, index) => {
            const finalAccuracy = stance.accuracy * itemAccuracyFactor;
            const stanceImage = stanceImages[stance.state_key];
            return (
              <tr key={index} style={{
                borderBottom: "1px solid var(--border-subtle)",
                background: index % 2 ? "var(--bg-base)" : "transparent",
              }}>
                <td style={{ padding: "6px 12px", textAlign: "center" }}>
                  {stanceImage ? (
                    <img src={stanceImage} alt={stance.state_key}
                      style={{ width: 28, height: 28, objectFit: "contain", imageRendering: "pixelated" }} />
                  ) : (
                    <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xs)" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "6px 12px", textTransform: "uppercase", fontSize: "var(--font-sm)" }}>
                  {t(stance.state_key)}
                </td>
                <td style={{ padding: "6px 12px", color: "var(--info)", fontSize: "var(--font-sm)" }}>
                  {stance.accuracy}
                </td>
                <td style={{ padding: "6px 12px", color: "var(--accent)", fontWeight: 600, fontSize: "var(--font-sm)" }}>
                  {finalAccuracy.toFixed(3)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
