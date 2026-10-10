import { Icon } from "@iconify/react";
import { useT } from "../i18n.jsx";
import { navigateTo } from "../hashRouter.js";
import VizFrame from "./VizFrame";

/**
 * Decodes vehicle `events` (output_schema.md §1): each is a trigger → result
 * pair stored as nested objects that the generic table builder flattens into an
 * unreadable `trigger.class` / `result.class` grid. This renders them as a
 * readable "when X happens → do Y" list, linking any spawned entity by its
 * `instance_class` + `instance_key`.
 */
const TRIGGER_ICON = {
  timer: "mdi:timer-outline",
  health: "mdi:heart-pulse",
  receive_damage: "mdi:shield-off-outline",
  weapon_hit: "mdi:crosshairs",
  enter: "mdi:login",
  exit: "mdi:logout",
  destroy: "mdi:fire",
  cleanup: "mdi:broom",
};
const RESULT_ICON = {
  spawn: "mdi:rocket-launch-outline",
  explosion: "mdi:explosion",
  reward: "mdi:gift-outline",
  damage: "mdi:flash-outline",
  effect: "mdi:sparkles",
};

function humanize(s) {
  return String(s ?? "").replace(/_/g, " ").trim() || "—";
}

export default function VehicleEventsVisualization({ item }) {
  const t = useT();
  const events = item?.events;
  if (!Array.isArray(events) || events.length === 0) return null;

  return (
    <VizFrame icon="mdi:swap-horizontal" title={t("events")} count={t("count_items", events.length)} lead={t("viz_lead_events", events.length)}>
      <dl className="article-rows">
        {events.map((ev, i) => {
          const trig = ev.trigger || {};
          const res = ev.result || {};
          const trigVal = trig.value != null && trig.value !== "" ? ` · ${trig.value}` : "";
          const linkClass = res.instance_class;
          const linkKey = res.instance_key || res.key;
          const hasLink = Boolean(linkClass && linkKey);
          const min = res.min_amount, max = res.max_amount;
          const amount = (typeof min === "number" || typeof max === "number") ? ` ×${min ?? 0}–${max ?? 0}` : "";
          const resVal = res.xp != null ? ` · ${res.xp}` : "";
          return (
            <div className="article-row" key={i}>
              <dt>
                <Icon icon={TRIGGER_ICON[trig.class] || "mdi:lightning-bolt-outline"} style={{ fontSize: 11, marginRight: 5, verticalAlign: "-1px" }} />
                {humanize(trig.class)}{trigVal}
              </dt>
              <dd style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Icon icon="mdi:arrow-right-thin" style={{ fontSize: 14, color: "var(--border-heavy)", flexShrink: 0 }} />
                <span style={{ color: hasLink ? "var(--accent)" : "var(--success)", fontWeight: 700 }}>
                  <Icon icon={RESULT_ICON[res.class] || "mdi:check-circle-outline"} style={{ fontSize: 12, marginRight: 4, verticalAlign: "-1px" }} />
                  {humanize(res.class)}{amount}{resVal}
                </span>
                {hasLink && (
                  <a
                    href={`/params/${linkClass}/${linkKey}`}
                    onClick={(e) => { e.preventDefault(); navigateTo(`/params/${linkClass}/${linkKey}`); }}
                    className="article-link"
                    title={linkKey}
                  >
                    {humanize(linkKey.split(".")[0])}
                  </a>
                )}
                {ev.key && <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xs)" }}>{humanize(ev.key)}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </VizFrame>
  );
}
