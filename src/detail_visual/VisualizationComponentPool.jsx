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
import RewardPoolVisualization from "./RewardPoolVisualization";
import ScriptModuleVisualization from "./ScriptModuleVisualization";
import DataTableVisualization from "./DataTableVisualization";
import VisualizationErrorBoundary from "./ErrorBoundary";

/* eslint-disable react-refresh/only-export-components */

/* ── Precise "does this actually render" checks ──
 * `shouldRender` is the pool's gate; for a few visualizations it is coarser than
 * the component's own guard, which would make the tour spotlight an empty
 * section. `renders` (where present) is the exact condition, and needs the
 * dataset for the ones that depend on it. */
function rankRenders(item) {
  return !!item && Array.isArray(item.capacities) &&
    item.capacities.some((c) => c.source === "rank" && (c.source_value ?? 0) > 0);
}
function supplyRenders(item) {
  if (!item) return false;
  const cm = item.commonness;
  const weight = cm && typeof cm === "object" ? cm.value : item.commonness_value;
  const hasRarity = typeof weight === "number" && weight > 0;
  const hasGate = Array.isArray(item.capacities) && item.capacities.some((c) => (c.value ?? 0) > 0);
  const inv = item.inventory;
  const hasCost = inv && typeof inv === "object" && (inv.price != null || inv.encumbrance != null);
  return hasRarity || hasGate || hasCost;
}
/* "Projectile data" only when there is real ballistics/impact content. The old
 * gate also matched a bare `class`/`radius`, which weapons and other records
 * carry as meaningless integers, so the section showed up empty on their pages. */
function projectileRenders(item) {
  if (!item) return false;
  return item.type === "projectile" ||
    item.projectile_speed !== undefined ||
    item.projectiles_per_shot !== undefined ||
    item.projectile_file !== undefined ||
    item.projectile_result_class !== undefined ||
    item.trigger_class !== undefined ||
    item.result_class !== undefined ||
    (Array.isArray(item.triggers) && item.triggers.length > 0);
}
function eventRenders(item) {
  if (!item) return false;
  if (item.type === "weapon" || item.type === "carry_item" || item.type === "vehicle") return false;
  return (item.events || item.modifiers || []).some((m) => m && m.class);
}
/* Acquisition shows exchange sources, reward tables AND command paths; any one
 * of them is content. */
function acquisitionRenders(item, data) {
  if (!item) return false;
  if (Array.isArray(item.exchange_sources) && item.exchange_sources.length) return true;
  if (Array.isArray(item.reward_sources) && item.reward_sources.length) return true;
  const cmds = data?.command_config;
  if (!cmds) return false;
  for (const cmd of Object.values(cmds)) {
    if ((cmd.actions || []).some((a) => a && a.key === item.key)) return true;
  }
  return false;
}
/* Clothing needs a place in the carry_item transform graph. */
function clothingRenders(item, data) {
  if (!item || item.type !== "carry_item" || !data?.carry_item) return false;
  const target = (ci) => (typeof ci?.transform_on_consume === "string" ? ci.transform_on_consume : ci?.transform_on_consume?.key);
  if (target(item)) return true;
  return Object.values(data.carry_item).some((ci) => target(ci) === item.key);
}

/*
 * The registry. Each entry carries its own `tour` descriptor (title/body i18n
 * keys) so the guided tour's content lives with the visualization it describes
 * rather than being hard-coded in Tour.jsx — the tour just collects these.
 */
/* `findTypes` lists the record types the tour should search to find a page
 * where this visualization actually renders. */
const visualizationComponents = [
  { name: "Rank", component: RankVisualization, shouldRender: rankRenders, findTypes: ["weapon", "carry_item", "call", "projectile", "vehicle"],
    tour: { titleKey: "unlock_rank", bodyKey: "viz_tour_rank" } },
  { name: "Exchange", component: ExchangeVisualization, shouldRender: (item) => item && Array.isArray(item.exchange_prizes) && item.exchange_prizes.length > 0, findTypes: ["weapon", "carry_item", "vehicle"],
    tour: { titleKey: "exchange_title", bodyKey: "viz_tour_exchange" } },
  { name: "Clothing", component: ClothingVisualization, shouldRender: (item) => item && item.type === "carry_item", renders: clothingRenders, findTypes: ["carry_item"],
    tour: { titleKey: "degradation_chain", bodyKey: "viz_tour_clothing" } },
  { name: "Command", component: CommandVisualization, shouldRender: (item) => item && item.type === "command_config", findTypes: ["command_config"],
    tour: { titleKey: "command_config", bodyKey: "viz_tour_command" } },
  { name: "Projectile", component: ProjectileVisualization, shouldRender: projectileRenders, findTypes: ["projectile"],
    tour: { titleKey: "projectile_data", bodyKey: "viz_tour_projectile" } },
  { name: "Gun Performance", component: GunPerformanceVisualization, shouldRender: (item) => item && (
    item.projectile_result_kill_probability !== undefined || item.retrigger_time !== undefined ||
    item.magazine_size !== undefined || item.can_shoot_standing !== undefined ||
    item.suppressed !== undefined), findTypes: ["weapon"],
    tour: { titleKey: "gun_performance", bodyKey: "viz_tour_gun" } },
  { name: "Modifiers", component: ModifiersVisualization, shouldRender: (item) => item &&
    (item.type === "weapon" || item.type === "carry_item") &&
    Array.isArray(item.modifiers) && item.modifiers.length > 0, findTypes: ["weapon", "carry_item"],
    tour: { titleKey: "modifiers", bodyKey: "viz_tour_modifiers" } },
  { name: "Supply", component: SupplyVisualization, shouldRender: supplyRenders, findTypes: ["weapon", "carry_item", "projectile"],
    tour: { titleKey: "supply", bodyKey: "viz_tour_supply" } },
  // Exchange sources + command paths. Type-gated here; the exact condition
  // needs the dataset (commands), so `renders` carries it.
  { name: "Acquisition", component: AcquisitionVisualization, shouldRender: (item) => item &&
    ["carry_item", "weapon", "vehicle", "projectile", "call"].includes(item.type), renders: acquisitionRenders,
    findTypes: ["carry_item", "weapon", "vehicle", "projectile", "call"],
    tour: { titleKey: "how_to_obtain", bodyKey: "viz_tour_acquisition" } },
  { name: "Stance", component: StanceVisualization, shouldRender: (item) => item && Array.isArray(item.stances) && item.stances.length > 0, findTypes: ["weapon"],
    tour: { titleKey: "stances", bodyKey: "viz_tour_stance" } },
  { name: "Vehicle", component: VehicleVisualization, shouldRender: (item) => item && item.type === "vehicle", findTypes: ["vehicle"],
    tour: { titleKey: "vehicle_3d", bodyKey: "viz_tour_vehicle" } },
  { name: "Armament", component: VehicleArmamentVisualization, shouldRender: (item) => item && item.type === "vehicle" && Array.isArray(item.turrets) && item.turrets.length > 0, findTypes: ["vehicle"],
    tour: { titleKey: "armament", bodyKey: "viz_tour_armament" } },
  { name: "Vehicle Events", component: VehicleEventsVisualization, shouldRender: (item) => item && Array.isArray(item.events) && item.events.length > 0, findTypes: ["vehicle"],
    tour: { titleKey: "events", bodyKey: "viz_tour_events" } },
  { name: "Event", component: EventVisualization, shouldRender: eventRenders, findTypes: ["projectile", "call", "achievement", "map_config", "faction", "command_config"],
    tour: { titleKey: "events_modifiers", bodyKey: "viz_tour_event" } },
  { name: "Call", component: CallVisualization, shouldRender: (item) => item && item.type === "call", findTypes: ["call"],
    tour: { titleKey: "radio_call", bodyKey: "viz_tour_call" } },
  { name: "Achievement", component: AchievementVisualization, shouldRender: (item) => item && item.type === "achievement", findTypes: ["achievement"],
    tour: { titleKey: "achievement_label", bodyKey: "viz_tour_achievement" } },
  { name: "Faction", component: FactionVisualization, shouldRender: (item) => item && item.type === "faction", findTypes: ["faction"],
    tour: { titleKey: "faction_label", bodyKey: "viz_tour_faction" } },
  { name: "Map", component: MapVisualization, shouldRender: (item) => item && item.type === "map_config" &&
    ("frame_image" in item || "heightmap" in item || "mask_image" in item), findTypes: ["map_config"],
    tour: { titleKey: "map_label", bodyKey: "viz_tour_map" } },
  /* ── The script layer ──
   * These three came out of reading every `.as` file instead of two, so they
   * are the newest content on the site and the deepest: a game mode is wired
   * together here, and a mod author has nowhere else to read it. */
  { name: "Reward Pool", component: RewardPoolVisualization, shouldRender: (item) => item && item.type === "reward_pool" &&
    Array.isArray(item.pools) && item.pools.length > 0, findTypes: ["reward_pool"],
    tour: { titleKey: "reward_pool_title", bodyKey: "viz_tour_reward_pool" } },
  { name: "Script Module", component: ScriptModuleVisualization, shouldRender: (item) => item && item.type === "as_module" &&
    ((item.includes || []).length + (item.classes || []).length + (item.trackers || []).length + (item.xml_classes || []).length > 0),
    findTypes: ["as_module"],
    tour: { titleKey: "as_module_title", bodyKey: "viz_tour_script_module" } },
  { name: "Data Table", component: DataTableVisualization, shouldRender: (item) => item &&
    ["string_table", "value_table", "resource_list"].includes(item.type) &&
    ((item.values || []).length + (item.entries || []).length + (item.items || []).length > 0),
    findTypes: ["string_table", "value_table", "resource_list"],
    tour: { titleKey: "data_table_title", bodyKey: "viz_tour_data_table" } },
];

export { visualizationComponents };

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
