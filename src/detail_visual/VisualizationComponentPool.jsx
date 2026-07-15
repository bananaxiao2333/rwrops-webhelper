import StanceVisualization from "./StanceVisualization";
import VehicleVisualization from "./VehicleVisualization";
import EventVisualization from "./EventVisualization";
import GunPerformanceVisualization from "./GunPerformanceVisualization";
import ProjectileVisualization from "./ProjectileVisualization";
import CallVisualization from "./CallVisualization";
import AchievementVisualization from "./AchievementVisualization";
import FactionVisualization from "./FactionVisualization";
import MapVisualization from "./MapVisualization";
import RankVisualization from "./RankVisualization";
import ExchangeVisualization from "./ExchangeVisualization";
import CommandVisualization from "./CommandVisualization";
import VisualizationErrorBoundary from "./ErrorBoundary";

const visualizationComponents = [
  { component: RankVisualization, shouldRender: (item) => item && Array.isArray(item.capacities) && item.capacities.some(c => c.source === "rank") },
  { component: ExchangeVisualization, shouldRender: (item) => item && (item.exchange_prizes || item.exchange_sources) },
  { component: CommandVisualization, shouldRender: (item) => item && item.type === "command_config" },
  { component: ProjectileVisualization, shouldRender: (item) => item && (
    item.projectile_speed !== undefined || item.projectiles_per_shot !== undefined ||
    item.projectile_file !== undefined || item.projectile_result_class !== undefined ||
    item.type === "projectile" || item.class !== undefined || item.radius !== undefined ||
    item.triggers !== undefined) },
  { component: GunPerformanceVisualization, shouldRender: (item) => item && (
    item.projectile_result_kill_probability !== undefined || item.retrigger_time !== undefined ||
    item.magazine_size !== undefined || item.can_shoot_standing !== undefined ||
    item.suppressed !== undefined) },
  { component: StanceVisualization, shouldRender: (item) => item && Array.isArray(item.stances) && item.stances.length > 0 },
  { component: VehicleVisualization, shouldRender: (item) => item && item.type === "vehicle" },
  { component: EventVisualization, shouldRender: (item) => item && (item.events !== undefined || item.modifiers !== undefined) },
  { component: CallVisualization, shouldRender: (item) => item && item.type === "call" },
  { component: AchievementVisualization, shouldRender: (item) => item && item.type === "achievement" },
  { component: FactionVisualization, shouldRender: (item) => item && item.type === "faction" },
  { component: MapVisualization, shouldRender: (item) => !!item },
];

export default function VisualizationComponentPool({ item, onDataNavigate, onOpenRoll }) {
  const hasContent = visualizationComponents.some(({ shouldRender }) => shouldRender(item));
  if (!hasContent) return null;

  let visIndex = 0;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "1rem",
      backgroundColor: "var(--bg-base)", padding: "1rem",
      border: "1px solid var(--border-subtle)",
      transition: "border-color var(--dur-fast) var(--ease-smooth)",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
    >
      {visualizationComponents.map((entry) => {
        const Comp = entry.component;
        if (entry.shouldRender(item)) {
          const idx = visIndex++;
          return (
            <div key={idx} style={{
              animation: `fade-in 0.3s var(--ease-smooth) ${0.06 * idx}s both`,
            }}>
              <VisualizationErrorBoundary>
                <Comp item={item} onDataNavigate={onDataNavigate} onOpenRoll={onOpenRoll} />
              </VisualizationErrorBoundary>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
