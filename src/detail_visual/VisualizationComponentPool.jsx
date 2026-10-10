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
import AcquisitionVisualization from "./AcquisitionVisualization";
import VehicleArmamentVisualization from "./VehicleArmamentVisualization";
import VehicleEventsVisualization from "./VehicleEventsVisualization";
import VisualizationErrorBoundary from "./ErrorBoundary";

/* eslint-disable react-refresh/only-export-components */
/*
 * The registry. Each entry carries its own `tour` descriptor (title/body i18n
 * keys) so the guided tour's content lives with the visualization it describes
 * rather than being hard-coded in Tour.jsx — the tour just collects these.
 */
const visualizationComponents = [
  { name: "Rank", component: RankVisualization, shouldRender: (item) => item && Array.isArray(item.capacities) && item.capacities.some(c => c.source === "rank"),
    tour: { titleKey: "unlock_rank", bodyKey: "viz_tour_rank" } },
  { name: "Exchange", component: ExchangeVisualization, shouldRender: (item) => item && (item.exchange_prizes || item.exchange_sources),
    tour: { titleKey: "exchange_title", bodyKey: "viz_tour_exchange" } },
  { name: "Clothing", component: ClothingVisualization, shouldRender: (item) => item && item.type === "carry_item",
    tour: { titleKey: "degradation_chain", bodyKey: "viz_tour_clothing" } },
  { name: "Command", component: CommandVisualization, shouldRender: (item) => item && item.type === "command_config",
    tour: { titleKey: "command_config", bodyKey: "viz_tour_command" } },
  { name: "Projectile", component: ProjectileVisualization, shouldRender: (item) => item && (
    item.projectile_speed !== undefined || item.projectiles_per_shot !== undefined ||
    item.projectile_file !== undefined || item.projectile_result_class !== undefined ||
    item.type === "projectile" || item.class !== undefined || item.radius !== undefined ||
    item.triggers !== undefined),
    tour: { titleKey: "projectile_data", bodyKey: "viz_tour_projectile" } },
  { name: "Gun Performance", component: GunPerformanceVisualization, shouldRender: (item) => item && (
    item.projectile_result_kill_probability !== undefined || item.retrigger_time !== undefined ||
    item.magazine_size !== undefined || item.can_shoot_standing !== undefined ||
    item.suppressed !== undefined),
    tour: { titleKey: "gun_performance", bodyKey: "viz_tour_gun" } },
  { name: "Modifiers", component: ModifiersVisualization, shouldRender: (item) => item &&
    (item.type === "weapon" || item.type === "carry_item") &&
    Array.isArray(item.modifiers) && item.modifiers.length > 0,
    tour: { titleKey: "modifiers", bodyKey: "viz_tour_modifiers" } },
  { name: "Supply", component: SupplyVisualization, shouldRender: (item) => item &&
    ((item.commonness && typeof item.commonness === "object") ||
     (Array.isArray(item.capacities) && item.capacities.length) ||
     (item.inventory && typeof item.inventory === "object")),
    tour: { titleKey: "supply", bodyKey: "viz_tour_supply" } },
  // Exchange sources + command paths. The command scan needs the full dataset,
  // so the component guards internally and this only gates by item type.
  { name: "Acquisition", component: AcquisitionVisualization, shouldRender: (item) => item &&
    ["carry_item", "weapon", "vehicle", "projectile", "call"].includes(item.type),
    tour: { titleKey: "how_to_obtain", bodyKey: "viz_tour_acquisition" } },
  { name: "Stance", component: StanceVisualization, shouldRender: (item) => item && Array.isArray(item.stances) && item.stances.length > 0,
    tour: { titleKey: "stances", bodyKey: "viz_tour_stance" } },
  { name: "Vehicle", component: VehicleVisualization, shouldRender: (item) => item && item.type === "vehicle",
    tour: { titleKey: "vehicle_3d", bodyKey: "viz_tour_vehicle" } },
  { name: "Armament", component: VehicleArmamentVisualization, shouldRender: (item) => item && item.type === "vehicle" && Array.isArray(item.turrets) && item.turrets.length > 0,
    tour: { titleKey: "armament", bodyKey: "viz_tour_armament" } },
  { name: "Vehicle Events", component: VehicleEventsVisualization, shouldRender: (item) => item && Array.isArray(item.events) && item.events.length > 0,
    tour: { titleKey: "events", bodyKey: "viz_tour_events" } },
  { name: "Event", component: EventVisualization, shouldRender: (item) => item &&
    item.type !== "weapon" && item.type !== "carry_item" && item.type !== "vehicle" &&
    (item.events !== undefined || item.modifiers !== undefined),
    tour: { titleKey: "events_modifiers", bodyKey: "viz_tour_event" } },
  { name: "Call", component: CallVisualization, shouldRender: (item) => item && item.type === "call",
    tour: { titleKey: "radio_call", bodyKey: "viz_tour_call" } },
  { name: "Achievement", component: AchievementVisualization, shouldRender: (item) => item && item.type === "achievement",
    tour: { titleKey: "achievement_label", bodyKey: "viz_tour_achievement" } },
  { name: "Faction", component: FactionVisualization, shouldRender: (item) => item && item.type === "faction",
    tour: { titleKey: "faction_label", bodyKey: "viz_tour_faction" } },
  { name: "Map", component: MapVisualization, shouldRender: (item) => item && item.type === "map_config",
    tour: { titleKey: "map_label", bodyKey: "viz_tour_map" } },
];

export { visualizationComponents };

/**
 * Tour steps for the visualizations that render on this record. The tour calls
 * this to build its item-page walkthrough from the same registry the page uses,
 * so a new visualization declares its tour text once and it appears in the tour.
 */
export function tourStepsFor(item) {
  if (!item) return [];
  return visualizationComponents
    .filter((e) => e.tour && e.shouldRender(item))
    .map((e) => ({
      name: e.name,
      target: `[data-share-id="vis_${e.name}"]`,
      place: "dock",
      titleKey: e.tour.titleKey,
      bodyKey: e.tour.bodyKey,
    }));
}

export default function VisualizationComponentPool({ item, onDataNavigate, onOpenRoll }) {
  const active = visualizationComponents.filter((entry) => entry.shouldRender(item));
  if (active.length === 0) return null;

  return (
    <>
      {active.map((entry, idx) => {
        const Comp = entry.component;
        return (
          <div key={entry.name} data-share-id={`vis_${entry.name}`} style={{
            animation: `fade-in 0.3s var(--ease-out) ${0.06 * idx}s both`,
          }}>
            <VisualizationErrorBoundary>
              <Comp item={item} onDataNavigate={onDataNavigate} onOpenRoll={onOpenRoll} />
            </VisualizationErrorBoundary>
          </div>
        );
      })}
    </>
  );
}
