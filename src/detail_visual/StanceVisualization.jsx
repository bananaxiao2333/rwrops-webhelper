import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";

const stanceImageModules = import.meta.glob("./stance_img/*.png", { eager: false });

export default function StanceVisualization({ item }) {
  const t = useT();
  const [stanceImages, setStanceImages] = useState({});
  const itemAccuracyFactor = item?.accuracy_factor || 1.0;

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

  if (!item?.stances || !Array.isArray(item.stances) || item.stances.length === 0) return null;

  const maxAccuracy = Math.max(...item.stances.map(s => s.accuracy * itemAccuracyFactor), 0.001);

  return (
    <div style={{
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "var(--font-display)",
      }}>
        <Icon icon="mdi:run" style={{ fontSize: "var(--font-md)" }} />
        {t("stances")}
      </div>

      <div style={{
        padding: "6px 14px", fontSize: "var(--font-xs)", color: "var(--text-muted)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <Icon icon="mdi:target" style={{ fontSize: 11, color: "var(--info)" }} />
        {t("stance_acc").replace("{0}", itemAccuracyFactor)}
      </div>

      <div>
        {item.stances.map((stance, index) => {
          const finalAccuracy = stance.accuracy * itemAccuracyFactor;
          const stanceImage = stanceImages[stance.state_key];
          const pct = finalAccuracy / maxAccuracy;
          return (
            <div key={index} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 10px",
              borderBottom: index < item.stances.length - 1 ? "1px solid var(--border-subtle)" : "none",
              background: index % 2 ? "var(--bg-base)" : "transparent",
              animation: `fade-in 0.2s var(--ease-smooth) ${0.04 + index * 0.035}s both`,
            }}>
              <div style={{
                width: 32, height: 32, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-deep)",
              }}>
                {stanceImage ? (
                  <img src={stanceImage} alt={stance.state_key}
                    style={{ width: 26, height: 26, objectFit: "contain", imageRendering: "pixelated" }} />
                ) : (
                  <Icon icon="mdi:run-fast" style={{ fontSize: 16, color: "var(--text-dim)" }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "var(--font-sm)", textTransform: "uppercase",
                  color: "var(--text-primary)", fontWeight: 600, letterSpacing: "0.04em",
                }}>
                  {t(stance.state_key)}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginTop: 3,
                }}>
                  <div style={{
                    flex: 1, height: 3, background: "var(--border-subtle)", overflow: "hidden", maxWidth: 140,
                  }}>
                    <div style={{
                      width: `${pct * 100}%`, height: "100%",
                      background: `linear-gradient(90deg, var(--info)88, var(--info))`,
                      transition: "width var(--dur-norm) var(--ease-smooth)",
                    }} />
                  </div>
                  <span style={{ fontSize: "var(--font-xxs)", color: "var(--info)", fontWeight: 700 }}>
                    {(finalAccuracy * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)" }}>
                  {t("accuracy")}
                </div>
                <div style={{ fontSize: "var(--font-sm)", fontWeight: 700, color: "var(--accent)" }}>
                  {stance.accuracy}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
