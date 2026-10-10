import { useState, useMemo, useEffect } from "react";
import { useI18n, useT } from "./i18n.jsx";
import { useItemIcon, displayPath } from "./assetLoader.jsx";
import VisualizationComponentPool, { visualizationComponents } from "./detail_visual/VisualizationComponentPool";
import { detailFacts, entityCategory, entityTitle, isInlineValue, tableFor } from "./entityStats.js";
import { useData } from "./DataContext.jsx";
import { useShare } from "./ShareContext.jsx";
import { navigateTo } from "./hashRouter.js";

/* "a Assault" reads wrong. Only English inflects the article this way, and the
 * other locales ship the same sentence for both variants, so the test is a
 * no-op there. `uni-`/`use-`/`eu-`/`ut-` words take "a" despite the vowel
 * ("a Utility", "a unit"). */
function needsAn(label) {
  const word = String(label ?? "").trim();
  if (!/^[aeiou]/i.test(word)) return false;
  return !/^(uni|use|eu|ut)/i.test(word);
}

/* ── Which group each field is filed under on the page ──
 * The stat block (entityStats.FACTS) is always rendered first and its fields
 * are removed from these groups, so nothing appears twice. Anything in neither
 * list still reaches the page, in the collapsed "technical data" block. */
/* Fields claimed by a dedicated visualization (Modifiers / Supply / Vehicle
 * Events). They are removed from the section blocks and from the raw block so
 * the page never shows the same data twice — the viz is the only rendering. */
const VIZ_OWNED = new Set(["modifiers", "events", "commonness", "capacities", "inventory"]);

const SECTIONS = {
  vehicle: [
    { label: "PHYSICAL", keys: ["extent", "collision_model_extent", "offset", "top_offset", "visual_offset", "collision_model_pos"] },
    { label: "CONFIG",   keys: ["tags", "tire_sets", "character_slots", "turrets", "visuals", "effects", "sounds"] },
  ],
  weapon: [
    { label: "HANDLING", keys: ["projectile_result_class", "reload_one_at_a_time", "weak_hand_hold_offset"] },
    { label: "DATA",     keys: ["stances", "animations", "sounds", "model_filename", "class"] },
  ],
  carry_item: [
    { label: "ECONOMY", keys: ["transform_on_consume"] },
    { label: "WORLD",   keys: ["drop_count_factor_on_death", "drop_count_factor_on_player_death", "tags"] },
  ],
  projectile: [
    { label: "BEHAVIOR", keys: ["rotations", "model_mesh"] },
    { label: "EFFECTS",  keys: ["effects", "sounds"] },
  ],
  call: [
    { label: "DIALOGUE", keys: ["initiation_comment1", "initiation_comment2", "acknowledge_comment", "launch_comment"] },
    { label: "INVENTORY", keys: ["hud_icon"] },
  ],
  achievement: [{ label: "CRITERIA", keys: ["criteria_list", "levels", "no_level_title"] }],
  faction: [
    { label: "IDENTITY", keys: ["color", "chat_icon", "chat_icon_supporter", "chat_icon_commander", "campaign_icon", "hud_icon_filename"] },
    { label: "ROSTER",   keys: ["ranks", "soldiers"] },
  ],
  map_config: [
    { label: "MANIFESTS", keys: ["factions", "weapons", "projectiles", "vehicles", "calls", "carry_items"] },
    { label: "LAYERS",    keys: ["include_layers"] },
    { label: "FILES",     keys: ["hud_icon_filename", "frame_image", "heightmap", "mask_image", "objects_svg"] },
  ],
  command_config: [{ label: "DEFINITION", keys: ["actions"] }],
  language: [{ label: "TEXTS", keys: ["texts"] }],
};

/* Fields that name another record and should render as a link. */
const REFERENCE_FIELDS = [
  "projectile_file", "inherit_from", "model_mesh", "model_filename", "transform_on_consume",
  "hud_icon_filename", "heightmap", "mask_image", "frame_image", "objects_svg",
];

/* `_source`/`_id` are written by the extractor, not the game; `_id` only
 * restates type+key+source, and `_source` has its own line in the infobox. */
const isInternal = (key) => key.startsWith("_");

/* ── Format ── */
function fmt(val, translateFn) {
  if (val === undefined || val === null) return "—";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(Math.round(val * 1000) / 1000);
  const s = String(val);
  const displayed = displayPath(s);
  return translateFn ? translateFn(displayed).slice(0, 200) : displayed.slice(0, 200);
}

/* ── Clickable item link ── */
function ItemLink({ text, target, onNavigate }) {
  return (
    <a
      href={`/params/${target.type}/${target.key}`}
      onClick={(e) => { e.preventDefault(); onNavigate(target.type, target.key); }}
      className="article-link"
    >
      {text}
    </a>
  );
}

/* ── Lookup: build { key → {type, key} } map from data ── */
function buildItemLookup(data) {
  const map = new Map();
  if (!data) return map;
  for (const [type, items] of Object.entries(data)) {
    if (typeof items !== "object" || Array.isArray(items)) continue;
    for (const key of Object.keys(items)) {
      map.set(key.toLowerCase(), { type, key });
      const dotIdx = key.lastIndexOf(".");
      if (dotIdx > 0) {
        const base = key.slice(0, dotIdx).toLowerCase();
        if (!map.has(base)) map.set(base, { type, key });
      }
    }
  }
  return map;
}

/* ── Recursive value display for structures a table can't express ── */
function PropVal({ raw, depth, tFn, lookupMap, onNavigate, uiT, uiLabel }) {
  if (raw === undefined || raw === null) return <span style={{ color: "var(--text-dim)" }}>—</span>;
  if (typeof raw === "boolean") return <span>{uiT(raw ? "yes" : "no")}</span>;
  if (typeof raw === "number") return <span>{String(Math.round(raw * 1000) / 1000)}</span>;
  if (typeof raw === "string") {
    const displayText = tFn(displayPath(raw)).slice(0, 300);
    if (lookupMap?.has(raw.toLowerCase())) {
      return <ItemLink text={displayText} target={lookupMap.get(raw.toLowerCase())} onNavigate={onNavigate} />;
    }
    return <span>{displayText}</span>;
  }

  if (Array.isArray(raw)) {
    if (raw.length === 0) return <span style={{ color: "var(--text-dim)" }}>—</span>;
    if (raw.every((v) => v === null || typeof v !== "object")) {
      return <span>{raw.map((v) => fmt(v, tFn)).join(", ")}</span>;
    }
    return (
      <div className="article-nest">
        {raw.map((v, i) => (
          <PropVal key={i} raw={v} depth={depth + 1} tFn={tFn} lookupMap={lookupMap} onNavigate={onNavigate} uiT={uiT} uiLabel={uiLabel} uiLabel={uiLabel} />
        ))}
      </div>
    );
  }

  const keys = Object.keys(raw).filter((k) => !isInternal(k));
  if (keys.length === 0) return <span style={{ color: "var(--text-dim)" }}>—</span>;
  return (
    <FactRows
      rows={keys.map((k) => ({ label: uiLabel(k), node: <PropVal raw={raw[k]} depth={depth + 1} tFn={tFn} lookupMap={lookupMap} onNavigate={onNavigate} uiT={uiT} uiLabel={uiLabel} uiLabel={uiLabel} /> }))}
    />
  );
}

/* ── label/value row list ── */
function FactRows({ rows, compact }) {
  return (
    <dl className={compact ? "article-rows is-compact" : "article-rows"}>
      {rows.map((r, i) => (
        <div className="article-row" key={`${r.label}-${i}`}>
          <dt>{r.label}</dt>
          <dd>{r.node ?? r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Array of flat objects → a real table, not `[0] 键 fire [1] 键 …` ── */
function DataTable({ spec, uiT, uiLabel, tFn, lookupMap, onNavigate }) {
  return (
    <div className="article-table-wrap">
      <table className="article-table">
        <thead>
          <tr>{spec.columns.map((c) => <th key={c}>{uiLabel(c.split(".").pop())}</th>)}</tr>
        </thead>
        <tbody>
          {spec.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>
                  <PropVal raw={cell} depth={1} tFn={tFn} lookupMap={lookupMap} onNavigate={onNavigate} uiT={uiT} uiLabel={uiLabel} uiLabel={uiLabel} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── One property, rendered at the best fidelity the data allows ── */
function Value({ raw, uiT, uiLabel, tFn, lookupMap, onNavigate }) {
  const spec = tableFor(raw);
  if (spec) return <DataTable spec={spec} uiT={uiT} uiLabel={uiLabel} tFn={tFn} lookupMap={lookupMap} onNavigate={onNavigate} />;
  return <PropVal raw={raw} depth={0} tFn={tFn} uiLabel={uiLabel} lookupMap={lookupMap} onNavigate={onNavigate} uiT={uiT} uiLabel={uiLabel} uiLabel={uiLabel} />;
}

/* ── A group of fields: scalars as one labelled grid, records as tables ── */
function FieldGroup({ keys, item, uiT, uiLabel, tFn, lookupMap, onNavigate }) {
  const scalars = keys.filter((k) => !Array.isArray(item[k]));
  const tables = keys.filter((k) => Array.isArray(item[k]));
  const props = { uiT, uiLabel, tFn, lookupMap, onNavigate };

  return (
    <>
      {scalars.length > 0 && (
        <FactRows
          rows={scalars.map((k) => ({
            label: uiLabel(k),
            node: <Value raw={item[k]} {...props} />,
          }))}
        />
      )}
      {tables.map((k) => (
        <div className="article-block" key={k}>
          <h3 className="article-block-title">{uiLabel(k)}</h3>
          <Value raw={item[k]} {...props} />
        </div>
      ))}
    </>
  );
}

/* ── Collapsible group ── */
function Section({ id, label, count, children, open, onToggle, className }) {
  return (
    <section className={`article-section${className ? ` ${className}` : ""}`} data-share-id={id}>
      <button type="button" className="article-section-head" onClick={onToggle} aria-expanded={open}>
        <span className="article-caret" aria-hidden="true">{open ? "▾" : "▸"}</span>
        <h2>{label}</h2>
        {count != null && <span className="article-count">{count}</span>}
      </button>
      {open && <div className="article-section-body">{children}</div>}
    </section>
  );
}

/* ── Detail ── */
export default function Detail({ item, type, onOpenRoll }) {
  const { label: uiLabel, value: uiValue, tag: uiTag } = useI18n();
  const t = useT();
  const { register, clear } = useShare();
  const { data: fullData } = useData();
  const iconUrl = useItemIcon(item);
  const [iconLoaded, setIconLoaded] = useState(false);
  const [closed, setClosed] = useState({});

  const lookupMap = useMemo(() => buildItemLookup(fullData), [fullData]);

  const config = useMemo(() => SECTIONS[type] || [], [type]);
  const facts = useMemo(() => detailFacts(type, item), [type, item]);
  const factFields = useMemo(() => new Set(facts.map((f) => f.field)), [facts]);

  /* Fields built into the stat block or one of the groups below. An array is
   * the exception to the stat-block exclusion: `ranks: 25` in the infobox and
   * the roster table are complementary, not a repeat. Anything that is neither
   * a scalar nor tabulatable is left out here and lands in the raw block. */
  const sections = useMemo(
    () => config.map((s) => ({
      label: s.label,
      keys: s.keys.filter((k) => {
        const v = item?.[k];
        if (v === undefined || isInternal(k) || !isInlineValue(v)) return false;
        return !factFields.has(k) || Array.isArray(v);
      }),
    })).filter((s) => s.keys.length > 0),
    [config, item, factFields],
  );

  const grouped = useMemo(
    () => new Set([...sections.flatMap((s) => s.keys), ...facts.map((f) => f.field)]),
    [sections, facts],
  );
  const looseKeys = useMemo(
    () => Object.keys(item || {}).filter((k) => !grouped.has(k) && !isInternal(k) && !VIZ_OWNED.has(k)),
    [item, grouped],
  );

  const references = useMemo(() => {
    if (!item) return [];
    const out = [];
    for (const field of REFERENCE_FIELDS) {
      const raw = item[field];
      if (typeof raw === "string" && !factFields.has(field) && lookupMap.has(raw.toLowerCase())) {
        out.push({ field, target: lookupMap.get(raw.toLowerCase()) });
      }
    }
    for (const chain of Array.isArray(item.next_in_chains) ? item.next_in_chains : []) {
      const key = typeof chain === "string" ? chain : chain?.key;
      if (key && lookupMap.has(String(key).toLowerCase())) {
        out.push({ field: "next_in_chains", target: lookupMap.get(String(key).toLowerCase()) });
      }
    }
    return out;
  }, [item, lookupMap, factFields]);

  /* "See also": other records sharing this one's game tag, which is the only
   * usable taxonomy the data has — `weapon.class` is a bare integer. */
  const category = entityCategory(item);
  const siblings = useMemo(() => {
    if (!category || !fullData?.[type]) return [];
    const lower = category.toLowerCase();
    return Object.values(fullData[type])
      .filter((r) => r.key !== item?.key && (r.tags || []).some((tg) => String(tg?.name ?? tg).toLowerCase() === lower))
      .slice(0, 10);
  }, [fullData, type, category, item]);

  const categoryLabel = category ? uiTag(String(category).replace(/\s+/g, "_")) : t(type);
  const variants = item?._variants ?? [];
  const title = item ? uiValue(entityTitle(item)) : "";
  /* The game's own language table covers most string values (`moderator`,
   * `assault`), and leaves unknown ones — file paths, base templates — alone. */
  const factText = (f) => (f.kind === "bool" ? t(f.value) : uiValue(f.value));
  const leadFacts = facts.slice(0, 4);

  /* Second sentence of the lead. An encyclopedic lead says what the subject
   * *is and does* before listing numbers, so this comes from the record's own
   * behaviour rather than a field dump: a weapon's alternate configurations, a
   * carry item's transform-on-consume. Empty when the data offers neither. */
  const roleSentence = useMemo(() => {
    if (!item) return "";
    const variants = (Array.isArray(item.next_in_chains) ? item.next_in_chains : [])
      .map((c) => (typeof c === "string" ? c : c?.key))
      .filter(Boolean).length;
    if (variants > 0) return t("article_lead_variants", String(variants + 1));
    const into = typeof item.transform_on_consume === "string"
      ? item.transform_on_consume
      : item.transform_on_consume?.key;
    if (into) return t("article_lead_transform", into);
    return "";
  }, [item, t]);

  useEffect(() => {
    if (!item) return;
    const tree = [{ id: "hero", label: uiValue(entityTitle(item)), type: "hero", icon: "mdi:card-text-outline" }];
    const visChildren = visualizationComponents
      .filter((e) => e.shouldRender(item))
      .map((e) => ({ id: `vis_${e.name}`, label: e.name, type: "visualization", icon: "mdi:eye-outline" }));
    if (visChildren.length) {
      tree.push({ id: "visualizations", label: "VISUALIZATIONS", type: "section", icon: "mdi:chart-box-outline", children: visChildren });
    }
    for (const s of sections) {
      tree.push({ id: `section_${s.label}`, label: t(s.label.toLowerCase()), type: "section", icon: "mdi:code-braces" });
    }
    register(item, type, tree);
    return () => clear();
  }, [item, type, sections, t, uiValue, register, clear]);

  if (!item) return null;

  const navigate = (targetType, targetKey) => {
    window.history.pushState(null, "", `/params/${targetType}/${targetKey}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const toggle = (key) => setClosed((prev) => ({ ...prev, [key]: !prev[key] }));
  const isOpen = (key) => closed[key] !== true;

  const valueProps = { uiT: t, uiLabel, tFn: uiValue, lookupMap, onNavigate: navigate };

  return (
    <div className="article" data-tour="article">
      <article className="article-inner">
        {/* ── Title ── */}
        <header className="article-head" data-share-id="hero">
          <h1>{title}</h1>
          <p className="article-sub">
            <code>{item.key}</code>
            <span className="article-dot">·</span>
            <span className="article-kind">{categoryLabel}</span>
            {item._source && <><span className="article-dot">·</span><code className="article-src">{item._source}</code></>}
          </p>
          <p className="article-lead">
            {t(needsAn(categoryLabel) ? "article_lead_vowel" : "article_lead", title, categoryLabel)}
            {roleSentence && ` ${roleSentence}`}
            {leadFacts.length > 0
              ? ` ${t("article_lead_values",
                  leadFacts.map((f) => `${uiLabel(f.field)} ${factText(f)}`).join(t("fact_sep")))}`
              : (roleSentence ? "" : ` ${t("article_lead_bare_tail")}`)}
          </p>
        </header>

        <div className="article-body">
          {/* ── Infobox ── */}
          <aside className="article-infobox">
            <div className="article-figure">
              {iconUrl && (
                <img src={iconUrl} alt="" onLoad={() => setIconLoaded(true)} onError={() => setIconLoaded(true)}
                  style={{ opacity: iconLoaded ? 1 : 0 }} />
              )}
            </div>
            {facts.length > 0 && (
              <FactRows rows={facts.map((f) => ({ label: uiLabel(f.field), value: factText(f) }))} />
            )}
          </aside>

          <div className="article-main">
            {/* ── Visualizations ── */}
            <VisualizationComponentPool
              item={item}
              onDataNavigate={(targetKey) => { navigateTo(`/params/${type}/${targetKey}`); }}
              onOpenRoll={onOpenRoll}
            />

            {/* ── Grouped properties ── */}
            {sections.map((s) => (
              <Section
                key={s.label}
                id={`section_${s.label}`}
                label={t(s.label.toLowerCase())}
                count={s.keys.length}
                open={isOpen(s.label)}
                onToggle={() => toggle(s.label)}
              >
                <FieldGroup keys={s.keys} item={item} {...valueProps} />
              </Section>
            ))}

            {/* ── See also ── */}
            {(references.length > 0 || siblings.length > 0) && (
              <Section id="section_seealso" label={t("see_also")} open={isOpen("__seealso")} onToggle={() => toggle("__seealso")}>
                {references.length > 0 && (
                  <FactRows rows={references.map((r) => ({
                    label: uiLabel(r.field),
                    node: <ItemLink text={uiValue(entityTitle(fullData[r.target.type][r.target.key]))} target={r.target} onNavigate={navigate} />,
                  }))} />
                )}
                {siblings.length > 0 && (
                  <p className="article-siblings">
                    <span className="article-siblings-label">{t("same_category")}</span>
                    {siblings.map((s) => (
                      <a key={s.key} href={`/params/${type}/${s.key}`} className="article-chip"
                        onClick={(e) => { e.preventDefault(); navigate(type, s.key); }}>
                        {uiValue(entityTitle(s))}
                      </a>
                    ))}
                  </p>
                )}
              </Section>
            )}

            {/* ── Every file that defines this record. A map can override a
                 faction and a mod can redefine an item; showing only the first
                 definition is how 167 of 2063 records went missing. ── */}
            {variants.length > 1 && (
              <Section id="section_definitions" label={t("definitions")} count={variants.length}
                open={isOpen("__defs")} onToggle={() => toggle("__defs")}>
                <div className="article-table-wrap">
                  <table className="article-table">
                    <thead>
                      <tr><th>{t("source_file")}</th><th>{t("field_count")}</th><th /></tr>
                    </thead>
                    <tbody>
                      {variants.map((v, i) => (
                        <tr key={v._source ?? i}>
                          <td><code>{v._source ?? "—"}</code></td>
                          <td>{Object.keys(v).filter((k) => !k.startsWith("_")).length}</td>
                          <td style={{ color: "var(--accent)" }}>{v._source === item._source ? t("in_use") : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {/* ── Everything else, kept for losslessness but below the fold ── */}
            {looseKeys.length > 0 && (
              <Section
                id="section_raw"
                label={`${t("other")} · ${t("raw_fields")}`}
                count={looseKeys.length}
                className="article-section-raw"
                open={closed.__raw === true}
                onToggle={() => toggle("__raw")}
              >
                <FieldGroup keys={looseKeys} item={item} {...valueProps} />
              </Section>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
