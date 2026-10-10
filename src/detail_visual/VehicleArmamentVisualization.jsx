import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";
import { navigateTo } from "../hashRouter.js";
import VizFrame from "./VizFrame";

/**
 * Decodes a vehicle's `turrets` (output_schema.md §1). Each turret is
 * `{ offset, weapon_key, weapon_offset, weapon_recoil, max_rotation_step,
 * rotation, rotation_range }`. The one useful fact the generic table view hid
 * is which weapon the vehicle actually mounts — this lists them, links each to
 * its weapon page, and shows recoil and traverse arc.
 */
function humanize(s) {
  return String(s ?? "").replace(/[_.]+/g, " ").trim() || "—";
}

/* rotation_range is stored in radians; a turret arc reads far better in
 * degrees ("110°" vs "1.92"). */
function toDeg(rad) {
  return typeof rad === "number" ? Math.round((rad * 180) / Math.PI) : null;
}

function Stat({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <span className="viz-stat">
      <span className="viz-stat-label">{label}</span>
      <span className="viz-stat-value">{value}</span>
    </span>
  );
}

export default function VehicleArmamentVisualization({ item }) {
  const t = useT();
  const turrets = item?.turrets;
  if (!Array.isArray(turrets) || turrets.length === 0) return null;

  return (
    <VizFrame icon="mdi:target" title={t("armament")} count={t("count_items", turrets.length)} lead={t("viz_lead_armament", turrets.length)}>
      <dl className="article-rows">
        {turrets.map((tur, i) => {
          const wk = tur.weapon_key;
          const base = wk ? String(wk).split(".")[0] : null;
          const arc = toDeg(tur.rotation_range);
          return (
            <div className="article-row" key={i}>
              <dt>{t("turret")} {i + 1}</dt>
              <dd>
                {wk ? (
                  <a
                    href={`/params/weapon/${wk}`}
                    onClick={(e) => { e.preventDefault(); navigateTo(`/params/weapon/${wk}`); }}
                    className="article-link"
                    title={wk}
                    style={{ textTransform: "capitalize", fontWeight: 600 }}
                  >
                    <Icon icon="mdi:gun" style={{ fontSize: 12, marginRight: 4, verticalAlign: "-1px" }} />
                    {humanize(base)}
                  </a>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>
                    <Icon icon="mdi:gun-off" style={{ fontSize: 12, marginRight: 4 }} />
                    {t("no_weapon")}
                  </span>
                )}
                <div className="viz-stats" style={{ marginTop: 4 }}>
                  <Stat label={t("recoil")} value={tur.weapon_recoil} />
                  {arc != null && <Stat label={t("arc")} value={`${arc}°`} />}
                  <Stat label={t("traverse")} value={tur.max_rotation_step} />
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
    </VizFrame>
  );
}
