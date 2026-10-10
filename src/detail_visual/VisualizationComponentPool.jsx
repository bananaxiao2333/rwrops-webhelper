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
import ClothingVisualization from "./ClothingVisualization";
import CommandVisualization from "./CommandVisualization";
import ModifiersVisualization from "./ModifiersVisualization";
import SupplyVisualization from "./SupplyVisualization";
import VehicleArmamentVisualization from "./VehicleArmamentVisualization";
import VehicleEventsVisualization from "./VehicleEventsVisualization";
import VisualizationErrorBoundary from "./ErrorBoundary";

/* eslint-disable react-refresh/only-export-components */
const visualizationComponents = [
  { name: "Rank", component: RankVisualization, shouldRender: (item) => item && Array.isArray(item.capacities) && item.capacities.some(c => c.source === "rank") },
  { name: "Exchange", component: ExchangeVisualization, shouldRender: (item) => item && (item.exchange_prizes || item.exchange_sources) },
  { name: "Clothing", component: ClothingVisualization, shouldRender: () => true },
  { name: "Command", component: CommandVisualization, shouldRender: (item) => item && item.type === "command_config" },
  { name: "Projectile", component: ProjectileVisualization, shouldRender: (item) => item && (
    item.projectile_speed !== undefined || item.projectiles_per_shot !== undefined ||
    item.projectile_file !== undefined || item.projectile_result_class !== undefined ||
    item.type === "projectile" || item.class !== undefined || item.radius !== undefined ||
    item.triggers !== undefined) },
  { name: "Gun Performance", component: GunPerformanceVisualization, shouldRender: (item) => item && (
    item.projectile_result_kill_probability !== undefined || item.retrigger_time !== undefined ||
    item.magazine_size !== undefined || item.can_shoot_standing !== undefined ||
    item.suppressed !== undefined) },
  { name: "Modifiers", component: ModifiersVisualization, shouldRender: (item) => item &&
    (item.type === "weapon" || item.type === "carry_item") &&
    Array.isArray(item.modifiers) && item.modifiers.length > 0 },
  { name: "Supply", component: SupplyVisualization, shouldRender: (item) => item &&
    ((item.commonness && typeof item.commonness === "object") ||
     (Array.isArray(item.capacities) && item.capacities.length) ||
     (item.inventory && typeof item.inventory === "object")) },
  { name: "Stance", component: StanceVisualization, shouldRender: (item) => item && Array.isArray(item.stances) && item.stances.length > 0 },
  { name: "Vehicle", component: VehicleVisualization, shouldRender: (item) => item && item.type === "vehicle" },
  { name: "Armament", component: VehicleArmamentVisualization, shouldRender: (item) => item && item.type === "vehicle" && Array.isArray(item.turrets) && item.turrets.length > 0 },
  { name: "Vehicle Events", component: VehicleEventsVisualization, shouldRender: (item) => item && Array.isArray(item.events) && item.events.length > 0 },
  { name: "Event", component: EventVisualization, shouldRender: (item) => item &&
    item.type !== "weapon" && item.type !== "carry_item" && item.type !== "vehicle" &&
    (item.events !== undefined || item.modifiers !== undefined) },
  { name: "Call", component: CallVisualization, shouldRender: (item) => item && item.type === "call" },
  { name: "Achievement", component: AchievementVisualization, shouldRender: (item) => item && item.type === "achievement" },
  { name: "Faction", component: FactionVisualization, shouldRender: (item) => item && item.type === "faction" },
  { name: "Map", component: MapVisualization, shouldRender: (item) => !!item },
];

export { visualizationComponents };

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
            <div key={idx} data-share-id={`vis_${entry.name}`} style={{
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
