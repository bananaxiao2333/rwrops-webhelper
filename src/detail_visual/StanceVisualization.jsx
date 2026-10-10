import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";
import VizFrame from "./VizFrame";

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
    <VizFrame icon="mdi:run" title={t("stances")} lead={t("stance_acc").replace("{0}", itemAccuracyFactor)}>
      <dl className="article-rows">
        {item.stances.map((stance, index) => {
          const finalAccuracy = stance.accuracy * itemAccuracyFactor;
          const stanceImage = stanceImages[stance.state_key];
          const pct = finalAccuracy / maxAccuracy;
          return (
            <div className="article-row" key={index}>
              <dt>
                {stanceImage ? (
                  <img src={stanceImage} alt={stance.state_key}
                    style={{ width: 18, height: 18, objectFit: "contain", imageRendering: "pixelated", marginRight: 5, verticalAlign: "-5px" }} />
                ) : (
                  <Icon icon="mdi:run-fast" style={{ fontSize: 12, marginRight: 5, verticalAlign: "-1px" }} />
                )}
                {t(stance.state_key)}
              </dt>
              <dd style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: "0 0 120px", height: 4, background: "var(--border-subtle)", overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${pct * 100}%`, background: "var(--info)" }} />
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--info)" }}>
                  {(finalAccuracy * 100).toFixed(1)}%
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xs)" }}>
                  {t("accuracy")} {stance.accuracy}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </VizFrame>
  );
}
