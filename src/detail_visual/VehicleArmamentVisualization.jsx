import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";
import { navigateTo } from "../hashRouter.js";

/**
 * Decodes a vehicle's `turrets` (output_schema.md §1). Each turret is
 * `{ offset, weapon_key, weapon_offset, weapon_recoil, max_rotation_step,
 * rotation, rotation_range }` — the generic table view flattened it into an
 * unreadable column grid and, worse, hid the one useful fact: which weapon the
 * vehicle actually mounts. This renders the armament as a list of mounted
 * weapons, each linked to its weapon page, with recoil and traverse arc.
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
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ color: "var(--text-secondary)", fontWeight: 700 }}>{value}</span>
    </span>
  );
}

export default function VehicleArmamentVisualization({ item }) {
  const t = useT();
  const turrets = item?.turrets;
  if (!Array.isArray(turrets) || turrets.length === 0) return null;

  return (
    <div style={{
      border: "1px solid var(--border-subtle)", background: "var(--bg-surface)",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{
        padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "var(--font-display)",
      }}>
        <Icon icon="mdi:target" style={{ fontSize: "var(--font-md)" }} />
        {t("armament")}
        <span style={{
          marginLeft: "auto", fontSize: "var(--font-xxs)", fontWeight: 600,
          color: "var(--text-muted)", letterSpacing: "0.06em",
        }}>{t("count_items", turrets.length)}</span>
      </div>

      <div>
        {turrets.map((tur, i) => {
          const wk = tur.weapon_key;
          const base = wk ? String(wk).split(".")[0] : null;
          const arc = toDeg(tur.rotation_range);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
              borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none",
              background: i % 2 ? "var(--bg-base)" : "transparent",
              animation: `fade-in 0.2s var(--ease-smooth) ${0.04 + i * 0.03}s both`,
            }}>
              <span style={{
                width: 22, height: 22, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border-subtle)", background: "var(--bg-deep)",
                fontSize: "var(--font-xxs)", fontWeight: 700, color: "var(--accent)",
              }}>{i + 1}</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                {wk ? (
                  <a
                    href={`/params/weapon/${wk}`}
                    onClick={(e) => { e.preventDefault(); navigateTo(`/params/weapon/${wk}`); }}
                    title={wk}
                    style={{
                      fontSize: "var(--font-sm)", fontWeight: 700, color: "var(--accent)",
                      textDecoration: "underline", textDecorationStyle: "dotted",
                      textUnderlineOffset: 2, textTransform: "capitalize",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--amber)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
                  >
                    <Icon icon="mdi:gun" style={{ fontSize: 12, marginRight: 4, verticalAlign: "-1px" }} />
                    {humanize(base)}
                  </a>
                ) : (
                  <span style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
                    <Icon icon="mdi:gun-off" style={{ fontSize: 12, marginRight: 4 }} />
                    {t("no_weapon")}
                  </span>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 3, fontSize: "var(--font-xs)", flexWrap: "wrap" }}>
                  <Stat label={t("recoil")} value={tur.weapon_recoil} />
                  {arc != null && <Stat label={t("arc")} value={`${arc}°`} />}
                  <Stat label={t("traverse")} value={tur.max_rotation_step} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
