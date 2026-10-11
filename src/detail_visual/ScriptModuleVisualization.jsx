import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useData } from "../DataContext.jsx";
import { useI18n } from "../i18n.jsx";
import { navigateTo } from "../hashRouter.js";
import VizFrame from "./VizFrame";

/**
 * One file of the game's AngelScript layer (`as_module`).
 *
 * This is the layer the XML side has no equivalent for: a game mode is *wired
 * together* here. Four things come out of each file, and they answer different
 * questions a mod author actually asks:
 *
 *   includes      what this file depends on (so: what must exist alongside it)
 *   classes       what it defines, and what each one derives from
 *   trackers      the systems it assembles at start-up, grouped by owner
 *   xml_classes   the instructions it sends back to the engine
 *
 * Includes are bare filenames, so they are resolved against the other
 * `as_module` keys to become links — the dependency graph is the point.
 */

/* A chip that is a link when the target exists in this package, and plain text
 * when it does not (an engine-provided include, or a file from another layer). */
function RefChip({ label, href, title }) {
  const style = {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: "var(--font-xs)", fontFamily: "var(--font-mono)",
  };
  if (!href) {
    return (
      <span className="article-chip" style={{ ...style, color: "var(--text-muted)" }} title={title}>
        <Icon icon="mdi:file-outline" style={{ fontSize: 11, opacity: 0.6 }} />
        {label}
      </span>
    );
  }
  return (
    <a
      className="article-chip"
      href={href}
      onClick={(e) => { e.preventDefault(); navigateTo(href); }}
      title={title || label}
      style={style}
    >
      <Icon icon="mdi:file-code-outline" style={{ fontSize: 11, color: "var(--accent)" }} />
      {label}
    </a>
  );
}

export default function ScriptModuleVisualization({ item }) {
  const { t } = useI18n();
  const { data } = useData();

  /* includes are written as bare filenames (`tracker.as`); the record keys are
   * layer-relative paths. Index by basename so an include can become a link. */
  const byBasename = useMemo(() => {
    const map = new Map();
    for (const key of Object.keys(data?.as_module || {})) {
      const base = key.split("/").pop();
      if (base && !map.has(base)) map.set(base, key);
    }
    return map;
  }, [data]);

  if (!item || item.type !== "as_module") return null;

  const includes = Array.isArray(item.includes) ? item.includes : [];
  const classes = Array.isArray(item.classes) ? item.classes : [];
  const trackers = Array.isArray(item.trackers) ? item.trackers : [];
  const xmlClasses = Array.isArray(item.xml_classes) ? item.xml_classes : [];

  if (includes.length + classes.length + trackers.length + xmlClasses.length === 0) return null;

  const resolve = (name) => {
    const base = String(name).split("/").pop();
    const key = byBasename.get(base);
    return key ? `/params/as_module/${key}` : null;
  };

  return (
    <VizFrame
      icon="mdi:file-code-outline"
      title={t("as_module_title")}
      count={includes.length > 0 ? t("table_items", includes.length) : undefined}
      lead={t("viz_lead_script_module")}
    >
      {includes.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("script_includes")}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {includes.map((inc, i) => (
              <RefChip
                key={`${inc}-${i}`}
                label={String(inc).split("/").pop()}
                title={inc}
                href={resolve(inc)}
              />
            ))}
          </div>
        </div>
      )}

      {classes.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("script_classes")}</h3>
          <dl className="article-rows">
            {classes.map((cls, i) => (
              <div className="article-row" key={`${cls?.name}-${i}`}>
                <dt style={{ fontFamily: "var(--font-mono)" }}>{cls?.name}</dt>
                <dd style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {cls?.base ? (
                    <>
                      <Icon icon="mdi:arrow-left-thin" style={{ fontSize: 14, color: "var(--border-heavy)" }} />
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{cls.base}</span>
                    </>
                  ) : (
                    <span style={{ color: "var(--text-dim)" }}>—</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {trackers.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("script_trackers")}</h3>
          {trackers.map((group, gi) => {
            const names = Array.isArray(group?.trackers) ? group.trackers : [];
            if (names.length === 0) return null;
            return (
              <div key={`${group?.owner}-${gi}`} style={{ marginTop: 8 }}>
                {group?.owner && (
                  <div style={{
                    fontSize: "var(--font-xxs)", color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)", marginBottom: 4,
                  }}>
                    {group.owner}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {names.map((n, i) => (
                    <span key={`${n}-${i}`} className="article-chip" style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: "var(--font-xs)", fontFamily: "var(--font-mono)",
                    }}>
                      <Icon icon="mdi:progress-wrench" style={{ fontSize: 11, color: "var(--accent)" }} />
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {xmlClasses.length > 0 && (
        <div className="viz-block">
          <h3 className="viz-block-title">{t("script_xml_classes")}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {xmlClasses.map((x, i) => (
              <span key={`${x}-${i}`} className="article-chip" style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: "var(--font-xs)", fontFamily: "var(--font-mono)",
              }}>
                <Icon icon="mdi:xml" style={{ fontSize: 11, color: "var(--text-muted)" }} />
                {x}
              </span>
            ))}
          </div>
        </div>
      )}
    </VizFrame>
  );
}
