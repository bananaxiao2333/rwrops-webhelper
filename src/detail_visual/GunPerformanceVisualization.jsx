import { useState, useRef } from "react";
import { useT } from "../i18n.jsx";
import VizFrame from "./VizFrame";

const KillChart = ({ killProbability = 0, decayStart = 0, decayEnd = 0 }) => {
  const startD = decayStart * 100, endD = decayEnd * 100;
  const maxD = Math.max(endD + 10, 100);
  const W = 600, H = 200, pad = { t: 12, r: 16, b: 28, l: 44 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;

  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  if (!killProbability) return null;

  const px = (d) => pad.l + (d / maxD) * iW;
  const py = (p) => pad.t + iH - p * iH;

  const handleMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = W / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const d = ((x - pad.l) / iW) * maxD;
    if (d < 0 || d > maxD) return setHover(null);
    const prob = d <= startD ? killProbability : d >= endD ? 0 : killProbability * (1 - (d - startD) / (endD - startD));
    setHover({ d: Math.round(d), p: prob, x });
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", fontFamily: "var(--font-mono)", minWidth: 260 }}
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
      {yTicks.map(v => (
        <g key={`h${v}`}>
          <line x1={pad.l} y1={py(v)} x2={pad.l + iW} y2={py(v)}
            stroke="var(--border-subtle)" strokeWidth="0.5" strokeDasharray="3,4" />
          <text x={pad.l - 6} y={py(v) + 3} fill="var(--text-dim)" fontSize="11" textAnchor="end">
            {(v * 100).toFixed(0)}%
          </text>
        </g>
      ))}
      <line x1={px(0)} y1={py(killProbability)} x2={px(startD)} y2={py(killProbability)}
        stroke="var(--success)" strokeWidth="2.5" />
      <line x1={px(startD)} y1={py(killProbability)} x2={px(endD)} y2={py(0)}
        stroke="var(--accent-dim)" strokeWidth="2.5" />
      <circle cx={px(startD)} cy={py(killProbability)} r="3" fill="var(--accent)" />
      <circle cx={px(endD)} cy={py(0)} r="3" fill="var(--danger)" />
      {hover && (
        <g>
          <line x1={hover.x} y1={pad.t} x2={hover.x} y2={pad.t + iH}
            stroke="var(--accent)" strokeWidth="1" strokeDasharray="3,3" opacity="0.8" />
          <rect x={hover.x > W / 2 ? hover.x - 72 : hover.x + 4} y={pad.t} width="68" height="34" rx="2"
            fill="var(--bg-elevated)" stroke="var(--accent)" strokeWidth="0.5" opacity="0.95" />
          <text x={hover.x > W / 2 ? hover.x - 36 : hover.x + 38} y={pad.t + 14}
            fill="var(--text-primary)" fontSize="11" textAnchor="middle">
            {hover.d}m
          </text>
          <text x={hover.x > W / 2 ? hover.x - 36 : hover.x + 38} y={pad.t + 26}
            fill="var(--accent)" fontSize="11" fontWeight="700" textAnchor="middle">
            {(hover.p * 100).toFixed(0)}%
          </text>
        </g>
      )}
      <text x={px(startD)} y={py(killProbability) - 10} fill="var(--accent)" fontSize="10" textAnchor="middle">
        {startD.toFixed(0)}m
      </text>
      <text x={px(endD)} y={-4} fill="var(--danger)" fontSize="10" textAnchor="middle">
        {endD.toFixed(0)}m
      </text>
      <text x={pad.l} y={H - 4} fill="var(--text-dim)" fontSize="10">{startD.toFixed(0)}m</text>
      <text x={pad.l + iW} y={H - 4} fill="var(--text-dim)" fontSize="10" textAnchor="end">{maxD.toFixed(0)}m</text>
    </svg>
  );
};

export default function GunPerformanceVisualization({ item }) {
  const t = useT();
  if (!item || (item.projectile_result_kill_probability === undefined
    && item.retrigger_time === undefined
    && item.magazine_size === undefined
    && item.can_shoot_standing === undefined
    && item.suppressed === undefined)) return null;

  const stats = [];
  if (item.projectile_result_kill_probability !== undefined)
    stats.push({ label: t("kill_prob"), value: (item.projectile_result_kill_probability * 100).toFixed(1) + "%", accent: true });
  if (item.projectile_result_kill_decay_start_time !== undefined)
    stats.push({ label: t("decay_at"), value: (item.projectile_result_kill_decay_start_time * 100).toFixed(0) + "m" });
  if (item.projectile_result_kill_decay_end_time !== undefined)
    stats.push({ label: t("zero_at"), value: (item.projectile_result_kill_decay_end_time * 100).toFixed(0) + "m" });
  if (item.retrigger_time !== undefined) {
    const rpm = item.retrigger_time > 0 ? (60 / item.retrigger_time).toFixed(0) : 0;
    stats.push({ label: t("fire_rate"), value: item.retrigger_time.toFixed(3) + "s / " + rpm + t("rpm") });
  }
  if (item.magazine_size !== undefined)
    stats.push({ label: t("magazine"), value: item.magazine_size === -1 ? "∞" : item.magazine_size });
  if (item.projectile_speed !== undefined)
    stats.push({ label: t("mv"), value: item.projectile_speed.toFixed(0) + " m/s" });
  if (item.projectiles_per_shot !== undefined)
    stats.push({ label: t("pellets"), value: item.projectiles_per_shot });
  if (item.accuracy_factor !== undefined)
    stats.push({ label: t("accuracy"), value: item.accuracy_factor.toFixed(3) });
  if (item.sustained_fire_grow_step !== undefined)
    stats.push({ label: t("recoil_step"), value: item.sustained_fire_grow_step.toFixed(3) });
  if (item.sustained_fire_diminish_rate !== undefined)
    stats.push({ label: t("recoil_recovery"), value: item.sustained_fire_diminish_rate.toFixed(3) });
  if (item.sight_range_modifier !== undefined)
    stats.push({ label: t("sight_range"), value: item.sight_range_modifier.toFixed(1) + "x" });
  if (item.can_shoot_standing !== undefined)
    stats.push({ label: t("stance"), value: item.can_shoot_standing ? t("standing") : t("prone_required") });
  if (item.suppressed !== undefined)
    stats.push({ label: t("suppressed"), value: item.suppressed ? t("yes") : t("no") });
  if (item.reload_one_at_a_time !== undefined)
    stats.push({ label: t("reload"), value: item.reload_one_at_a_time ? t("single") : t("full") });

  return (
    <VizFrame icon="mdi:target" title={t("gun_performance")} lead={t("viz_lead_gun_performance")}>
      <div className="viz-stats">
        {stats.map((s, i) => (
          <div key={i} className="viz-stat">
            <span className="viz-stat-label">{s.label}</span>
            <span className={`viz-stat-value${s.accent ? " is-accent" : ""}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {item.projectile_result_kill_probability !== undefined &&
        item.projectile_result_kill_decay_start_time !== undefined &&
        item.projectile_result_kill_decay_end_time !== undefined && (
        <div style={{ padding: "8px 0" }}>
          <KillChart
            killProbability={item.projectile_result_kill_probability}
            decayStart={item.projectile_result_kill_decay_start_time}
            decayEnd={item.projectile_result_kill_decay_end_time}
          />
        </div>
      )}
    </VizFrame>
  );
}
