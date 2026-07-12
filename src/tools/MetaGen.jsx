/* ═══════════════════════════════════════════════════════════════
 *  MetaGen.jsx — RWR 信息补充构建器 v2
 *
 *  CONCEPT: 从 result 数据源动态派生所有条目，用户选择字段路径，
 *  系统自动为每个匹配实体生成带路径标注的信息补充文本。
 *
 *  KEY FEATURES:
 *  · 数据树浏览器 — 按实体类型层级浏览所有可用字段
 *  · 字段路径编制器 — 选择路径、配置标签、格式、精度
 *  · 实时预览 — 在实体样本上即时呈现输出
 *  · 多模板系统 — 保存/切换多套配置
 *  · 自定义条目 — 手动 key→text 覆盖
 *  · XML 导出 — 生成 misc_text_vanilla.xml 格式
 *
 *  OUPUT: 数值以路径作为显示 (@path:value)，消除歧义
 * ═══════════════════════════════════════════════════════════════ */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useLocalStorage } from "@reactuses/core";
import { Icon } from "@iconify/react";
import { useI18n } from "../i18n.jsx";
import { useData } from "../DataContext.jsx";
import DEFAULT_CONFIG from "./MetaGenDefaults.js";

/* ───────────────────────────────────────────────────
 *  HELPERS — everything derived from data, no hardcoding
 * ─────────────────────────────────────────────────── */

/** Derive category list from actual data keys (exclude "language"). */
function deriveCategories(data) {
  if (!data) return [];
  return Object.keys(data).filter((k) => k !== "language");
}

/** Deterministic hue from category name (0-360), stable across sessions. */
function catColorHue(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
  return String(Math.abs(hash) % 360);
}

function makeDefaultTemplate(categories) {
  return {
    id: "default",
    name: "Default",
    entityTypes: categories.slice(0, 4),
    fields: [],
    globalSep: "  ",
    showPath: false,
    pathPrefix: "@",
  };
}

/* ───────────────────────────────────────────────────
 *  HELPERS
 * ─────────────────────────────────────────────────── */

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Detect the type category of a value */
function detectType(val) {
  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean") return "boolean";
  if (typeof val === "number") return "number";
  if (typeof val === "string") return "string";
  if (Array.isArray(val)) return "array";
  return "object";
}

/** Format a value for display/preview */
function fmtVal(val, type, precision, translateFn) {
  if (val === null || val === undefined) return "—";
  if (type === "boolean") {
    const s = val ? "TRUE" : "FALSE";
    return translateFn ? translateFn(s) : s;
  }
  if (type === "number") {
    const p = precision ?? 3;
    const r = Math.round(val * Math.pow(10, p)) / Math.pow(10, p);
    return Number.isInteger(r) ? String(r) : r.toFixed(p).replace(/\.?0+$/, "");
  }
  if (type === "array") return `[${val.length}]`;
  if (type === "object") return `{${Object.keys(val).length}}`;
  // String: translate via game data language texts
  if (translateFn) {
    const s = String(val);
    const tr = translateFn(s);
    if (tr && tr !== "—" && tr !== s) return tr;
  }
  return String(val).slice(0, 200);
}

/**
 * Resolve a dotted path (e.g. "weapon.projectile_result_kill_probability")
 * against an entity. The first segment is the category name and is stripped
 * because the entity IS already the category-level object.
 */
function resolveFieldValue(entity, path) {
  const parts = path.split(".");
  // Skip first segment (category name: weapon/vehicle/carry_item/...)
  let cur = entity;
  for (let i = 1; i < parts.length; i++) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

/**
 * Resolve a display name for an entity.
 * Priority: 1) data.language[lang].texts lookup by entityKey,
 *           2) entity.name via translate,
 *           3) entityKey as-is.
 *
 * @param {object} entity - the data entity
 * @param {string} entityKey - key in the category bucket
 * @param {function} translateFn - i18n translate function
 * @param {object|null} langData - data.language[lang] for direct lookup
 */
function resolveEntityName(entity, entityKey, translateFn, langData) {
  // 1) Direct lookup in language data texts by entityKey
  if (langData?.texts) {
    const directMatch = langData.texts.find(
      (t) => t.key?.toLowerCase() === entityKey.toLowerCase()
    );
    if (directMatch?.translation) return directMatch.translation;
  }

  // 2) entity.name via translate
  if (entity?.name && translateFn) {
    const tr = translateFn(entity.name);
    if (tr && tr !== String(entity.name)) return tr;
  }

  // 3) entityKey as-is
  if (entity?.name) return String(entity.name);
  return entityKey;
}

/* ───────────────────────────────────────────────────
 *  HOOK: mobile detection
 * ─────────────────────────────────────────────────── */

function useIsMobile(bp = 768) {
  const [m, setM] = useState(
    typeof window !== "undefined" ? window.innerWidth < bp : false
  );
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

/* ═══════════════════════════════════════════════════
 *  HOOK: build field tree from data
 * ═══════════════════════════════════════════════════ */

/**
 * Scans all entity types and collects every unique field path.
 * Organizes into a hierarchical tree structure.
 *
 * Tree node shape:
 * {
 *   name: string,        // segment name
 *   path: string,        // full dotted path
 *   isLeaf: boolean,     // true if this is a scalar/array field
 *   type: string,        // "number"|"string"|"boolean"|"array"|"object"
 *   categories: string[], // which entity types have this field
 *   sampleValues: any[],  // up to 3 sample values
 *   children: TreeNode[], // for object fields
 * }
 */
function useFieldTree(data, categories) {
  return useMemo(() => {
    if (!data || !categories.length) return [];

    const roots = [];

    for (const cat of categories) {
      const bucket = data[cat];
      if (!bucket) continue;

      const catNode = {
        name: cat,
        path: cat,
        isLeaf: false,
        type: "object",
        categories: [cat],
        sampleValues: [],
        children: [],
      };

      // Collect all field paths from all entities in this category
      const pathSet = new Map(); // path → { types, sampleValues }

      for (const entity of Object.values(bucket)) {
        if (typeof entity !== "object" || entity === null) continue;

        const collect = (obj, prefix, depth) => {
          if (depth > 5) return;
          if (obj === null || obj === undefined) return;

           for (const [key, val] of Object.entries(obj)) {
              if (key.startsWith("_")) continue;
              const type = detectType(val);
              const fullPath = prefix ? `${prefix}.${key}` : `${cat}.${key}`;

              if (type === "object" && !Array.isArray(val)) {
                // Recurse into sub-objects to collect their scalar children
                collect(val, fullPath, depth + 1);
              } else if (type === "array") {
                // Skip arrays entirely
                continue;
              } else {
                // Scalar field — collect
                if (!pathSet.has(fullPath)) {
                  pathSet.set(fullPath, { types: new Set(), sampleValues: [] });
                }
                const entry = pathSet.get(fullPath);
                entry.types.add(type);
                if (entry.sampleValues.length < 3) entry.sampleValues.push(val);
              }
            }
        };

        collect(entity, cat, 0);
      }

      // Convert pathSet to tree
      for (const [fullPath, entry] of pathSet) {
        const parts = fullPath.split(".");
        if (parts.length <= 1) continue; // skip root category

        // Find or create path in tree
        let current = catNode;
        let builtPath = cat;

        for (let i = 1; i < parts.length; i++) {
          const seg = parts[i];
          builtPath = `${builtPath}.${seg}`;
          const isLast = i === parts.length - 1;

          let child = current.children.find(c => c.name === seg);
          if (!child) {
            child = {
              name: seg,
              path: builtPath,
              isLeaf: isLast,
              type: isLast
                ? (entry.types.has("number") ? "number"
                  : entry.types.has("boolean") ? "boolean"
                  : entry.types.has("array") ? "array"
                  : entry.types.has("string") ? "string"
                  : "object")
                : "object",
              categories: [cat],
              sampleValues: isLast ? entry.sampleValues : [],
              children: [],
            };
            current.children.push(child);
          } else if (!child.categories.includes(cat)) {
            child.categories.push(cat);
          }
          current = child;
        }
      }

      // Sort children alphabetically
      const sortChildren = (node) => {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
        for (const child of node.children) {
          if (!child.isLeaf) sortChildren(child);
        }
      };
      sortChildren(catNode);

      roots.push(catNode);
    }

    return roots;
  }, [data, categories]);
}

/* ═══════════════════════════════════════════════════
 *  COMPONENT: Tree Explorer (left panel)
 * ═══════════════════════════════════════════════════ */

function TreeExplorer({
  roots,
  selectedPaths,
  onTogglePath,
  onAddPath,
  activeCategory,
  onSetActiveCategory,
  isMobile,
}) {
  const { t, translate } = useI18n();
  const [expanded, setExpanded] = useState(new Set());

  const toggleExpand = useCallback((path) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const isExpanded = (path) => expanded.has(path);

  const renderNode = (node, depth) => {
    const isCatRoot = depth === 0;
    const isObj = node.type === "object";
    const hasChildren = node.children && node.children.length > 0;
    const canExpand = isObj && hasChildren;
    const expanded_ = isExpanded(node.path);
    const selected = selectedPaths.has(node.path);
    const isActiveCat = activeCategory === node.name;

    const hue = catColorHue(node.name);
    const indent = depth * (isMobile ? 12 : 16);

    return (
      <div key={node.path}>
        {/* Row */}
        <div
          onClick={() => {
            if (canExpand) toggleExpand(node.path);
            if (isCatRoot) onSetActiveCategory(node.name);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: isMobile ? "3px 6px" : "4px 8px",
            paddingLeft: isMobile ? 6 + indent : 8 + indent,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: isMobile ? "var(--font-xs)" : "var(--font-sm)",
            color: isActiveCat
              ? "var(--accent)"
              : node.isLeaf
                ? "var(--text-primary)"
                : "var(--text-secondary)",
            background: isActiveCat
              ? "rgba(245,158,11,0.08)"
              : selected
                ? "rgba(245,158,11,0.04)"
                : "transparent",
            borderLeft: isActiveCat
              ? "2px solid var(--accent)"
              : selected
                ? "2px solid rgba(245,158,11,0.3)"
                : "2px solid transparent",
            transition: "all var(--dur-fast) var(--ease-smooth)",
          }}
        >
          {/* Expand/collapse toggle */}
          {canExpand ? (
            <span style={{
              width: isMobile ? 10 : 12,
              textAlign: "center",
              color: "var(--text-dim)",
              fontSize: isMobile ? "var(--font-xxs)" : "var(--font-xs)",
              transform: expanded_ ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              flexShrink: 0,
            }}>
              &#9654;
            </span>
          ) : (
            <span style={{ width: isMobile ? 10 : 12, flexShrink: 0 }} />
          )}

          {/* Category icon */}
          {isCatRoot && (
            <Icon
              icon="ph:cube"
              width={isMobile ? 10 : 12}
              style={{ color: `hsl(${hue}, 70%, 55%)`, flexShrink: 0 }}
            />
          )}

          {/* Type badge */}
          {node.isLeaf && (
            <span style={{
              fontSize: "var(--font-xxs)",
              color: "var(--text-dim)",
              background: "var(--bg-elevated)",
              padding: "0 3px",
              borderRadius: 2,
              fontFamily: "var(--font-mono)",
              flexShrink: 0,
              minWidth: 16,
              textAlign: "center",
            }}>
              {node.type === "number" ? "#"
                : node.type === "string" ? "abc"
                : node.type === "boolean" ? "01"
                : node.type === "array" ? "[]"
                : "{}"}
            </span>
          )}

          {/* Name */}
          <span style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}>
            {isCatRoot ? t(node.name)
              : t(node.name) !== node.name ? t(node.name)
              : translate(node.name) !== node.name ? translate(node.name)
              : node.name.replace(/_/g, " ")}
          </span>

          {/* Add button for leaf nodes */}
          {node.isLeaf && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (!selected) onAddPath(node.path, node.type, node.sampleValues);
              }}
              style={{
                flexShrink: 0,
                width: isMobile ? 14 : 16,
                height: isMobile ? 14 : 16,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--font-xs)",
                color: selected ? "var(--success)" : "var(--text-dim)",
                background: selected ? "rgba(34,197,94,0.1)" : "transparent",
                border: selected ? "1px solid rgba(34,197,94,0.3)" : "1px solid transparent",
                cursor: selected ? "default" : "pointer",
                transition: "all var(--dur-fast) var(--ease-smooth)",
              }}
              title={selected ? t("tools_metagen_already_added") : t("tools_metagen_add_to_template")}
            >
              {selected ? <Icon icon="ph:check" width={10} /> : "+"}
            </span>
          )}
        </div>

        {/* Children */}
        {canExpand && expanded_ && hasChildren && (
          <div style={{ animation: "slide-down 0.15s var(--ease-smooth) both" }}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "6px 8px" : "8px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-xs)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
      }}>
        <Icon icon="ph:tree-structure" width={12} style={{ color: "var(--accent)" }} />
          <span>{t("tools_metagen_tree_title")}</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)" }}>
            {t("tools_metagen_cats_count", roots.length)}
          </span>
      </div>

      {/* Tree content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {roots.map((root) => renderNode(root, 0))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
 *  COMPONENT: Template Editor (center panel)
 * ═══════════════════════════════════════════════════ */

function FieldConfigRow({ field, onUpdate, onRemove, onToggle, isMobile }) {
  const { t, translate } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const pathSegs = field.path.split(".").slice(1);
  const pathDisplay = pathSegs.map(s => translate(s) !== s ? translate(s) : s.replace(/_/g, " ")).join(" / ");
  const hfc = (k, v) => onUpdate(field.id, { [k]: v });
  const cm = field.condMode || "always";

  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: field.enabled ? "var(--bg-surface)" : "var(--bg-base)", opacity: field.enabled ? 1 : 0.6, transition: "all var(--dur-fast) var(--ease-smooth)" }}>
      <div onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", gap: isMobile ? 3 : 5, padding: isMobile ? "3px 5px" : "4px 7px", fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", cursor: "pointer" }}>
        <span onClick={(e) => { e.stopPropagation(); onToggle(field.id); }} style={{ cursor: "pointer", color: field.enabled ? "var(--success)" : "var(--text-dim)", flexShrink: 0 }}>
          <Icon icon={field.enabled ? "ph:check-circle" : "ph:circle"} width={isMobile ? 12 : 14} />
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)", flexShrink: 0, transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>&#9654;</span>
        <input value={field.label} onChange={(e) => hfc("label", e.target.value)} onClick={(e) => e.stopPropagation()}
          style={{ width: isMobile ? 42 : 56, flexShrink: 0, background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", padding: "1px 3px", outline: "none", textAlign: "center", fontWeight: 700 }}
          title={t("tools_metagen_label_title") || "Label"} />
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)", fontSize: isMobile ? "var(--font-xxs)" : "var(--font-xs)" }}>{pathDisplay}</span>
        <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", background: "var(--bg-elevated)", padding: "0 3px", borderRadius: 2, flexShrink: 0 }}>{field.type}</span>
        {!isMobile && <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-muted)", flexShrink: 0, maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{field.sampleVal != null ? fmtVal(field.sampleVal, field.type, field.precision, translate) : "\u2014"}</span>}
        <span onClick={(e) => { e.stopPropagation(); onRemove(field.id); }} style={{ cursor: "pointer", color: "var(--text-dim)", flexShrink: 0, padding: "0 2px" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}>
          <Icon icon="ph:x" width={isMobile ? 10 : 12} />
        </span>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", padding: isMobile ? "4px 6px" : "5px 8px", display: "flex", flexDirection: "column", gap: 5, background: "var(--bg-base)", animation: "slide-down 0.15s var(--ease-smooth) both" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 1 }}>{t("tools_metagen_prefix")}</span><input value={field.prefix || ""} onChange={e => hfc("prefix", e.target.value)} placeholder={t("tools_metagen_prefix_eg")} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", padding: "2px 4px", outline: "none", borderRadius: 2, width: 54 }} /></div>
            <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 1 }}>{t("tools_metagen_suffix")}</span><input value={field.suffix || ""} onChange={e => hfc("suffix", e.target.value)} placeholder={t("tools_metagen_suffix_eg")} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", padding: "2px 4px", outline: "none", borderRadius: 2, width: 54 }} /></div>
            {field.type === "number" && <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 1 }}>{t("tools_metagen_prec")}</span><select value={field.precision ?? 3} onChange={e => hfc("precision", Number(e.target.value))} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", padding: "1px 3px", outline: "none", borderRadius: 2 }}>{[0,1,2,3,4,5,6].map(p => <option key={p} value={p}>{p}d</option>)}</select></div>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 1 }}>{t("tools_metagen_show")}</span>
              <select value={cm} onChange={e => hfc("condMode", e.target.value)} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", padding: "1px 3px", outline: "none", borderRadius: 2 }}>
                <option value="always">{t("tools_metagen_always")}</option>
                <option value="if_true">{t("tools_metagen_if_true")}</option>
                <option value="if_false">{t("tools_metagen_if_false")}</option>
                <option value="hide_if_true">{t("tools_metagen_unless_true")}</option>
                <option value="hide_if_false">{t("tools_metagen_unless_false")}</option>
                {field.type === "number" && <option value="if_nonzero">{t("tools_metagen_if_nonzero")}</option>}
                {field.type === "string" && <option value="if_nonempty">{t("tools_metagen_if_nonempty")}</option>}
              </select>
            </div>
            {["if_true","if_false","if_nonzero","if_nonempty"].includes(cm) && (
              <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginBottom: 1 }}>{t("tools_metagen_then")}</span>
                <input value={field.condThen || ""} onChange={e => hfc("condThen", e.target.value)} placeholder={t("tools_metagen_then_placeholder")} style={{ background: "var(--bg-deep)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", padding: "2px 4px", outline: "none", borderRadius: 2, width: 80 }} />
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{t("tools_metagen_template")} <span style={{ opacity: 0.4 }}>({"{value}"}/{"{path}"}, {t("tools_metagen_template_hint")}</span></span>
            <input value={field.template || ""} onChange={e => hfc("template", e.target.value)} placeholder="{value}m" style={{ background: "var(--bg-deep)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", padding: "2px 5px", outline: "none", borderRadius: 2 }} />
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  categories,
  onUpdateTemplate,
  onRemoveField,
  onToggleField,
  onUpdateField,
  onClearFields,
  isMobile,
  entityCount,
}) {
  const { t: uiT, translate } = useI18n();

  const toggleEntityType = useCallback((type) => {
    const types = template.entityTypes;
    const next = types.includes(type)
      ? types.filter((tp) => tp !== type)
      : [...types, type];
    onUpdateTemplate({ entityTypes: next });
  }, [template.entityTypes, onUpdateTemplate]);

  /* ── Duplicate detection ── */
  const dupes = useMemo(() => {
    const seen = new Map(); // label → [indices]
    template.fields.forEach((f, i) => {
      const key = f.label.toLowerCase();
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(i);
    });
    const result = [];
    for (const [key, indices] of seen) {
      if (indices.length > 1) result.push({ label: template.fields[indices[0]].label, count: indices.length });
    }
    return result;
  }, [template.fields]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "6px 8px" : "8px 10px",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-xs)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
      }}>
        <Icon icon="ph:sliders" width={12} style={{ color: "var(--accent)" }} />
        <span>{uiT("tools_metagen_composer_title")}</span>
        <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)" }}>
          {uiT("tools_metagen_fields_count", template.fields.length)}
        </span>
        <span style={{ flex: 1 }} />
        {dupes.length > 0 && (
          <span style={{ color: "var(--danger)", fontSize: "var(--font-xxs)", fontWeight: 700, padding: "0 6px", border: "1px solid var(--danger)" }}>
            {uiT("tools_metagen_dupe_count", dupes.length)}
          </span>
        )}
        {template.fields.length > 0 && (
          <span
            onClick={onClearFields}
            style={{
              cursor: "pointer",
              color: "var(--text-dim)",
              fontSize: "var(--font-xxs)",
              padding: "1px 4px",
              transition: "color var(--dur-fast) var(--ease-smooth)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
          >
            <Icon icon="ph:trash" width={10} />
          </span>
        )}
      </div>

      {/* Entity type chips */}
      <div style={{
        padding: isMobile ? "4px 8px" : "6px 10px",
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}>
        {categories.map((cat) => {
          const active = template.entityTypes.includes(cat);
          const hue = catColorHue(cat);
          return (
            <span
              key={cat}
              onClick={() => toggleEntityType(cat)}
              style={{
                cursor: "pointer",
                padding: isMobile ? "1px 6px" : "2px 8px",
                fontSize: "var(--font-xxs)",
                fontFamily: "var(--font-mono)",
                color: active ? `hsl(${hue}, 80%, 60%)` : "var(--text-dim)",
                background: active ? `hsla(${hue}, 50%, 20%, 0.35)` : "var(--bg-deep)",
                border: active
                  ? `1px solid hsla(${hue}, 60%, 45%, 0.5)`
                  : "1px solid var(--border-subtle)",
                borderRadius: 2,
                transition: "all var(--dur-fast) var(--ease-smooth)",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Icon icon="ph:cube" width={8} />
              {uiT(cat)}
              {active && (
                <span style={{ fontSize: "var(--font-xxs)" }}>
                  <Icon icon="ph:check" width={8} />
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Output format settings */}
      <div style={{
        padding: isMobile ? "4px 8px" : "6px 10px",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 4 : 8,
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-xxs)",
        fontFamily: "var(--font-mono)",
        color: "var(--text-muted)",
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        <span style={{ color: "var(--text-dim)" }}>{uiT("tools_metagen_output_label")}</span>
        <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={template.showPath}
            onChange={(e) => onUpdateTemplate({ showPath: e.target.checked })}
            style={{ accentColor: "var(--accent)" }}
          />
          {uiT("tools_metagen_show_paths")}
        </label>
        <span style={{ color: "var(--text-dim)" }}>|</span>
        <span>{uiT("tools_metagen_separator_label")}</span>
        <input
          value={template.globalSep || "  "}
          onChange={(e) => onUpdateTemplate({ globalSep: e.target.value })}
          style={{
            width: 40,
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xxs)",
            padding: "1px 3px",
            outline: "none",
          }}
          placeholder={uiT("tools_metagen_sep_placeholder")}
          title={uiT("tools_metagen_sep_title")}
        />
        <span style={{ color: "var(--text-dim)" }}>|</span>
        <span>{uiT("tools_metagen_path_prefix_label")}</span>
        <input
          value={template.pathPrefix || "@"}
          onChange={(e) => onUpdateTemplate({ pathPrefix: e.target.value })}
          style={{
            width: 30,
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xxs)",
            padding: "1px 3px",
            outline: "none",
          }}
          placeholder={uiT("tools_metagen_prefix_placeholder")}
          title={uiT("tools_metagen_prefix_title")}
        />
      </div>

      {/* Duplicate field banner */}
      {dupes.length > 0 && (
        <div style={{
          padding: "6px 10px",
          background: "rgba(239,68,68,0.12)",
          borderBottom: "1px solid var(--danger)",
          color: "var(--danger)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-xs)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}>
          <Icon icon="ph:warning" width={14} />
          <span>{uiT("tools_metagen_dupe_warn")}</span>
          {dupes.map((d, i) => (
            <span key={i} style={{ background: "rgba(239,68,68,0.2)", padding: "1px 6px", borderRadius: 2, fontWeight: 700 }}>
              "{d.label}" x{d.count}
            </span>
          ))}
        </div>
      )}

      {/* Field list */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "4px" : "6px" }}>
        {template.fields.length === 0 ? (
          <div style={{
            padding: isMobile ? "16px 8px" : "24px 12px",
            textAlign: "center",
            color: "var(--text-dim)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
          }}>
            <Icon icon="ph:empty" width={20} style={{ opacity: 0.3, marginBottom: 6 }} />
            <div>{uiT("tools_metagen_no_fields_tip")}</div>
            <div style={{ marginTop: 4, fontSize: "var(--font-xxs)", opacity: 0.6 }}>
              {uiT("tools_metagen_browse_tree_hint")}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 2 : 3 }}>
            {template.fields.map((field) => (
              <FieldConfigRow
                key={field.id}
                field={field}
                onUpdate={onUpdateField}
                onRemove={onRemoveField}
                onToggle={onToggleField}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div style={{
        padding: isMobile ? "4px 8px" : "6px 10px",
        borderTop: "1px solid var(--border-subtle)",
        fontSize: "var(--font-xxs)",
        color: "var(--text-dim)",
        fontFamily: "var(--font-mono)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}>
        <span>
          {uiT("tools_metagen_active_count", template.fields.filter((f) => f.enabled).length, template.fields.length)}
        </span>
        <span>|</span>
        <span>~{entityCount} {uiT("tools_metagen_entries_count", entityCount)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
 *  COMPONENT: Live Preview (right panel)
 * ═══════════════════════════════════════════════════ */

function renderEntityPreview(entity, entityKey, template, translateFn, langData) {
  const enabledFields = template.fields.filter((f) => f.enabled);
  const parts = [];

  for (const field of enabledFields) {
    const val = resolveFieldValue(entity, field.path);
    if (val === undefined || val === null) continue;

    // Conditional check
    const cm = field.condMode || "always";
    if (cm === "if_true" && !val) continue;
    if (cm === "if_false" && val) continue;
    if (cm === "hide_if_true" && val) continue;
    if (cm === "hide_if_false" && !val) continue;
    if (cm === "if_nonzero" && (typeof val !== "number" || val === 0)) continue;
    if (cm === "if_nonempty" && (typeof val !== "string" || !val.trim())) continue;

    // Format value
    let formatted;
    if (field.template) {
      formatted = field.template.replace(/\{value\}/g, fmtVal(val, field.type, field.precision, translateFn)).replace(/\{path\}/g, field.path);
    } else {
      formatted = fmtVal(val, field.type, field.precision, translateFn);
      if (field.prefix) formatted = field.prefix + formatted;
      if (field.suffix) formatted = formatted + field.suffix;
    }

    // Conditional then text
    const ct = field.condThen;
    if (ct && ["if_true","if_false","if_nonzero","if_nonempty"].includes(cm)) {
      parts.push(ct.replace(/\{value\}/g, formatted));
    } else {
      const label = template.showPath
        ? `${template.pathPrefix || "@"}${field.path}:${formatted}`
        : `${field.label}:${formatted}`;
      parts.push(label);
    }
  }

  if (parts.length === 0) return null;

  const sep = template.globalSep || "  ";
  const name = resolveEntityName(entity, entityKey, translateFn, langData);
  return { key: entityKey, name, type: "", supplement: parts.join(sep), fullText: `${name}  ${parts.join(sep)}` };
}

function LivePreview({ template, data, isMobile, onNavigate }) {
  const { translate, lang, t } = useI18n();
  const langData = useMemo(() => data?.language?.[lang] || data?.language?.en, [data, lang]);

  const previewEntries = useMemo(() => {
    if (!data || template.fields.length === 0) return [];
    const results = [];
    for (const type of template.entityTypes) {
      const bucket = data[type];
      if (!bucket) continue;
      for (const [key, entity] of Object.entries(bucket)) {
        if (typeof entity !== "object" || entity === null) continue;
        const preview = renderEntityPreview(entity, key, template, translate, langData);
        if (preview) results.push({ ...preview, type });
      }
    }
    return results;
  }, [data, template, translate, langData]);

  // Compute column widths from enabled fields for aligned preview
  const enabledFields = template.fields.filter(f => f.enabled);
  const nameColWidth = isMobile ? 90 : 140;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: isMobile ? "6px 8px" : "8px 10px", borderBottom: "1px solid var(--border-subtle)", fontSize: "var(--font-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <Icon icon="ph:eye" width={12} style={{ color: "var(--accent)" }} />
        <span>{t("tools_metagen_preview_title")}</span>
        <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)" }}>{t("tools_metagen_entries_count", previewEntries.length)}</span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "2px 4px" : "4px 8px" }}>
        {previewEntries.length === 0 ? (
          <div style={{ padding: isMobile ? "24px 8px" : "32px 16px", textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)" }}>
            <Icon icon="ph:empty" width={20} style={{ opacity: 0.3 }} />
            <div style={{ marginTop: 4 }}>{template.fields.length === 0 ? t("tools_metagen_add_fields_hint") : t("tools_metagen_no_entities")}</div>
          </div>
        ) : (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: isMobile ? "var(--font-xxs)" : "var(--font-xs)", lineHeight: isMobile ? 1.5 : 1.7 }}>
            {/* Column header */}
            {enabledFields.length > 0 && (
              <div style={{ display: "flex", borderBottom: "1px solid var(--border-mid)", padding: "2px 0", marginBottom: 4, color: "var(--text-dim)", fontWeight: 600, position: "sticky", top: 0, background: "var(--bg-deep)" }}>
                <span style={{ flexShrink: 0, width: nameColWidth, overflow: "hidden", textOverflow: "ellipsis" }}>{t("tools_metagen_name_col")}</span>
                {enabledFields.map(f => (
                  <span key={f.id} style={{ flex: "1 1 0", minWidth: isMobile ? 50 : 70, overflow: "hidden", textOverflow: "ellipsis", padding: "0 4px", textAlign: "right" }}>{f.label}</span>
                ))}
              </div>
            )}
            {previewEntries.map((entry, i) => (
              <div key={`${entry.type}.${entry.key}`} style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.03)", padding: "1px 0", contentVisibility: "auto", containIntrinsicSize: "0 18px", whiteSpace: "nowrap" }}>
                <a href={`/params/${entry.type}/${entry.key}`} onClick={(e) => { e.preventDefault(); if (onNavigate) onNavigate(entry.type, entry.key); }}
                  style={{ flexShrink: 0, width: nameColWidth, overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-primary)", fontWeight: 600, textDecoration: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
                  title={`${entry.type}: ${entry.key}`}>
                  {entry.name}
                </a>
                <span style={{ color: "var(--accent)", flex: 1 }}>{entry.supplement}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomEntriesManager({ entries, onAdd, onRemove, onUpdate, isMobile }) {
  const { t } = useI18n();
  const [newKey, setNewKey] = useState("");
  const [newText, setNewText] = useState("");
  const [editId, setEditId] = useState(null);

  const handleAdd = useCallback(() => {
    const k = newKey.trim();
    if (!k) return;
    onAdd({ key: k, text: newText.trim() });
    setNewKey("");
    setNewText("");
  }, [newKey, newText, onAdd]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "4px 8px" : "5px 10px",
        fontSize: "var(--font-xs)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        <Icon icon="ph:note-pencil" width={12} style={{ color: "var(--accent)" }} />
        <span>{t("tools_metagen_custom_title")}</span>
        <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)" }}>
          {t("tools_metagen_entries_count", entries.length)}
        </span>
      </div>

      {/* Add form */}
      <div style={{
        padding: isMobile ? "4px 8px" : "6px 10px",
        display: "flex",
        gap: 6,
        alignItems: "flex-end",
      }}>
        <input
          type="text"
          placeholder={t("tools_metagen_key_placeholder")}
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newKey.trim()) handleAdd(); }}
          style={{
            flex: "1 1 100px",
            minWidth: 0,
            background: "var(--bg-deep)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
            padding: "3px 6px",
            outline: "none",
          }}
        />
        <input
          type="text"
          placeholder={t("tools_metagen_text_placeholder")}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newKey.trim()) handleAdd(); }}
          style={{
            flex: "1 1 180px",
            minWidth: 0,
            background: "var(--bg-deep)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
            padding: "3px 6px",
            outline: "none",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newKey.trim()}
          style={{
            background: newKey.trim() ? "var(--accent)" : "var(--bg-elevated)",
            color: newKey.trim() ? "var(--text-inverse)" : "var(--text-dim)",
            border: "none",
            cursor: newKey.trim() ? "pointer" : "default",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
            padding: "3px 8px",
            flexShrink: 0,
          }}
        >
          <Icon icon="ph:plus" width={10} />
        </button>
      </div>

      {/* Entry list */}
      {entries.length > 0 && (
        <div style={{ maxHeight: isMobile ? 120 : 150, overflow: "auto" }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 8px",
                borderTop: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-xs)",
              }}
            >
              <span style={{
                color: "var(--accent)",
                flex: "0 0 auto",
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }} title={entry.key}>
                {entry.key}
              </span>

              {editId === entry.id ? (
                <input
                  autoFocus
                  value={entry.text}
                  onChange={(e) => onUpdate(entry.id, { text: e.target.value })}
                  onBlur={() => setEditId(null)}
                  onKeyDown={(e) => { if (e.key === "Enter") setEditId(null); }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "var(--bg-deep)",
                    border: "1px solid var(--accent)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--font-xs)",
                    padding: "1px 4px",
                    outline: "none",
                  }}
                />
              ) : (
                <span
                  onClick={() => setEditId(entry.id)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: entry.text ? "var(--text-primary)" : "var(--text-dim)",
                    cursor: "pointer",
                  }}
                  title={entry.text || t("tools_metagen_empty_click_edit")}
                >
                  {entry.text || "\u00A0"}
                </span>
              )}

              <span
                onClick={() => onRemove(entry.id)}
                style={{
                  cursor: "pointer",
                  color: "var(--text-dim)",
                  flexShrink: 0,
                  padding: "0 2px",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; }}
              >
                <Icon icon="ph:x" width={10} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
 *  COMPONENT: Export Panel
 * ═══════════════════════════════════════════════════ */

function ExportPanel({ template, data, customEntries, isMobile, onExportConfig, onImportConfig }) {
  const { translate, t, lang } = useI18n();
  const [copyMsg, setCopyMsg] = useState("");

  const langData = useMemo(() => data?.language?.[lang] || data?.language?.en, [data, lang]);

  const xmlOutput = useMemo(() => {
    if (!data) return "";

    const lines = [
      '<?xml version="1.0" encoding="utf-8"?>',
      "<translation>",
    ];

    // Custom entries map
    const customMap = new Map(
      (customEntries || []).map((c) => [c.key.toLowerCase(), c.text])
    );

    // Process all matching entities
    for (const type of template.entityTypes) {
      const bucket = data[type];
      if (!bucket) continue;

      for (const [key, entity] of Object.entries(bucket)) {
        if (typeof entity !== "object" || entity === null) continue;

        let text = "";

        // Check custom override
        if (customMap.has(key.toLowerCase())) {
          text = customMap.get(key.toLowerCase());
        } else {
          // Build supplement
          const enabledFields = template.fields.filter((f) => f.enabled);
          const parts = [];

          // Entity name via resolveEntityName (langData → translate fallback)
          const name = resolveEntityName(entity, key, translate, langData);

          for (const field of enabledFields) {
            const val = resolveFieldValue(entity, field.path);
            if (val === undefined || val === null) continue;

            // Conditional check
            const cm = field.condMode || "always";
            if (cm === "if_true" && !val) continue;
            if (cm === "if_false" && val) continue;
            if (cm === "hide_if_true" && val) continue;
            if (cm === "hide_if_false" && !val) continue;
            if (cm === "if_nonzero" && (typeof val !== "number" || val === 0)) continue;
            if (cm === "if_nonempty" && (typeof val !== "string" || !val.trim())) continue;

            let formatted;
            if (field.template) {
              formatted = field.template.replace(/\{value\}/g, fmtVal(val, field.type, field.precision, translate)).replace(/\{path\}/g, field.path);
            } else {
              formatted = fmtVal(val, field.type, field.precision, translate);
              if (field.prefix) formatted = field.prefix + formatted;
              if (field.suffix) formatted = formatted + field.suffix;
            }

            const ct = field.condThen;
            if (ct && ["if_true","if_false","if_nonzero","if_nonempty"].includes(cm)) {
              parts.push(ct.replace(/\{value\}/g, formatted));
            } else if (template.showPath) {
              parts.push(`${template.pathPrefix || "@"}${field.path}:${formatted}`);
            } else {
              parts.push(`${field.label}:${formatted}`);
            }
          }

          if (parts.length > 0) {
            const sep = template.globalSep || "  ";
            text = `${name}  ${parts.join(sep)}`;
          } else {
            text = name;
          }
        }

        lines.push(`\t<text key="${esc(key)}" text="${esc(text)}"/>`);
      }
    }

    // Add custom entries not in data
    for (const c of customEntries || []) {
      const already = template.entityTypes.some((type) => {
        const bucket = data[type];
        return bucket && bucket[c.key] !== undefined;
      });
      if (!already) {
        lines.push(`\t<text key="${esc(c.key)}" text="${esc(c.text)}"/>`);
      }
    }

    lines.push("</translation>");
    return lines.join("\n");
  }, [data, template, customEntries, translate, langData]);

  const entryCount = useMemo(() => {
    if (!data) return 0;
    let count = 0;
    for (const type of template.entityTypes) {
      const bucket = data[type];
      if (bucket) count += Object.keys(bucket).length;
    }
    return count;
  }, [data, template.entityTypes]);

  const downloadXml = useCallback(() => {
    const blob = new Blob([xmlOutput], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "misc_text_vanilla.xml";
    a.click();
    URL.revokeObjectURL(url);
  }, [xmlOutput]);

  const copyXml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(xmlOutput);
      setCopyMsg(t("tools_metagen_copied") || "Copied!");
      setTimeout(() => setCopyMsg(""), 2000);
    } catch {
      // fallback
    }
  }, [xmlOutput, t]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
    }}>
      {/* Export controls */}
      <div style={{
        padding: isMobile ? "4px 8px" : "6px 10px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: "var(--font-xs)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.08em",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <Icon icon="ph:file-code" width={12} style={{ color: "var(--accent)" }} />
          {t("tools_metagen_export_title")}
        </span>

        <span style={{
          fontSize: "var(--font-xxs)",
          color: "var(--text-dim)",
          fontFamily: "var(--font-mono)",
        }}>
          ~{entryCount} {t("tools_metagen_entries_count", entryCount)} · {t("tools_metagen_chars_count", xmlOutput.length.toLocaleString())}
        </span>

        <span style={{ flex: 1 }} />

        <button
          onClick={copyXml}
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
            padding: "4px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all var(--dur-fast) var(--ease-smooth)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
        >
          <Icon icon="ph:copy" width={12} />
          {copyMsg || (isMobile ? "" : t("tools_metagen_copy_xml"))}
        </button>

        <button
          id="metagen-download-btn"
          onClick={downloadXml}
          style={{
            background: "var(--accent)",
            color: "var(--text-inverse)",
            border: "none",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
            padding: "4px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontWeight: 600,
          }}
        >
          <Icon icon="ph:download-simple" width={12} />
          {isMobile ? "" : t("tools_metagen_download_xml")}
        </button>

        {/* Config import/export */}
        {onExportConfig && (
          <button onClick={onExportConfig}
            style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}>
            <Icon icon="ph:export" width={10} />
            {isMobile ? "" : t("tools_metagen_export_cfg_label")}
          </button>
        )}
        {onImportConfig && (
          <button onClick={() => document.getElementById("metagen-cfg-import")?.click()}
            style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}>
            <Icon icon="ph:import" width={10} />
            {isMobile ? "" : t("tools_metagen_import_cfg_label")}
          </button>
        )}
        <input id="metagen-cfg-import" type="file" accept=".json" onChange={onImportConfig} style={{ display: "none" }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
 *  MAIN COMPONENT: MetaGen
 * ═══════════════════════════════════════════════════ */

export default function MetaGen() {
  const { t, lang, translate } = useI18n();
  const { data } = useData();
  const isMobile = useIsMobile();

  /* ── State ── */
  /* ── Derive categories from live data ── */
  const categories = useMemo(() => deriveCategories(data), [data]);

  const STORAGE_KEY = "rwrops_metagen_v5";
  const [saved, setSaved] = useLocalStorage(STORAGE_KEY, DEFAULT_CONFIG);

  const activeTemplate = useMemo(
    () =>
      saved.templates.find((t) => t.id === saved.activeTemplateId) ||
      saved.templates[0],
    [saved.templates, saved.activeTemplateId]
  );

  const [activeCategory, setActiveCategory] = useState(() => categories[0] || "");
  const [treeSearch, setTreeSearch] = useState("");
  const [mobileTab, setMobileTab] = useState("tree"); // tree | composer | preview

  /* ── Derived ── */
  const fieldTree = useFieldTree(data, categories);

  /* ── Dev: log untranslated field/category names ── */
  useEffect(() => {
    if (!fieldTree.length) return;
    const missing = [];
    const seen = new Set();
    const collect = (node) => {
      const tn = t(node.name);
      const trn = translate(node.name);
      if (tn === node.name && trn === node.name && !seen.has(node.name)) {
        seen.add(node.name);
        missing.push(node.name);
      }
      if (node.children) node.children.forEach(collect);
    };
    fieldTree.forEach((r) => { collect(r); if (r.children) r.children.forEach(collect); });
    if (missing.length) console.warn("[MetaGen] untranslated keys (%d):", missing.length, missing);
  }, [fieldTree, t, translate]);

  // Filter tree roots by search
  const filteredRoots = useMemo(() => {
    if (!treeSearch.trim()) return fieldTree;
    const q = treeSearch.toLowerCase();

    const filterNode = (node) => {
      const nameLower = node.name.toLowerCase();
      const nameMatch = nameLower.includes(q)
        || t(node.name).toLowerCase().includes(q)
        || translate(node.name).toLowerCase().includes(q);
      const pathMatch = node.path.toLowerCase().includes(q);
      const childMatches = node.children
        ? node.children.map(filterNode).filter(Boolean)
        : [];

      if (nameMatch || pathMatch || childMatches.length > 0) {
        // If node itself doesn't match but has matching children,
        // keep it with only matching children
        if (!nameMatch && !pathMatch) {
          return { ...node, children: childMatches };
        }
        return { ...node, children: childMatches.length > 0 ? childMatches : node.children };
      }
      return null;
    };

    return fieldTree.map(filterNode).filter(Boolean);
  }, [fieldTree, treeSearch]);

  // Set of selected paths (for tree highlighting)
  const selectedPaths = useMemo(() => {
    const s = new Set();
    for (const f of activeTemplate.fields) {
      s.add(f.path);
    }
    return s;
  }, [activeTemplate.fields]);

  // Entity count estimate
  const entityCount = useMemo(() => {
    if (!data) return 0;
    let count = 0;
    for (const type of activeTemplate.entityTypes) {
      const bucket = data[type];
      if (bucket) count += Object.keys(bucket).length;
    }
    return count;
  }, [data, activeTemplate.entityTypes]);

  /* ── Actions ── */

  const updateTemplate = useCallback(
    (patch) => {
      setSaved((prev) => ({
        ...prev,
        templates: prev.templates.map((t) =>
          t.id === prev.activeTemplateId ? { ...t, ...patch } : t
        ),
      }));
    },
    [setSaved]
  );

  const addField = useCallback(
    (path, type, sampleValues) => {
      if (activeTemplate.fields.some((f) => f.path === path)) return; // already added

      setSaved((prev) => ({
        ...prev,
        templates: prev.templates.map((it) => {
          if (it.id !== prev.activeTemplateId) return it;
          const rawName = path.split(".").pop();
          const label = t(rawName) !== rawName ? t(rawName)
            : translate(rawName) !== rawName ? translate(rawName)
            : rawName.replace(/_/g, " ");
          return {
            ...it,
            fields: [
              ...it.fields,
              {
                id: Date.now(),
                path,
                label,
                enabled: true,
                type,
                precision: type === "number" ? 3 : undefined,
                sampleVal: sampleValues?.[0],
                prefix: "",
                suffix: "",
                condMode: "always",
                condThen: "",
                template: "",
              },
            ],
          };
        }),
      }));
    },
    [activeTemplate.fields, setSaved]
  );

  const removeField = useCallback(
    (fieldId) => {
      setSaved((prev) => ({
        ...prev,
        templates: prev.templates.map((t) =>
          t.id !== prev.activeTemplateId
                        ? t
            : { ...t, fields: t.fields.filter((f) => f.id !== fieldId) }
        ),
      }));
    },
    [setSaved]
  );

  const toggleField = useCallback(
    (fieldId) => {
      setSaved((prev) => ({
        ...prev,
        templates: prev.templates.map((t) =>
          t.id !== prev.activeTemplateId
                        ? t
            : {
                ...t,
                fields: t.fields.map((f) =>
                  f.id === fieldId ? { ...f, enabled: !f.enabled } : f
                ),
              }
        ),
      }));
    },
    [setSaved]
  );

  const updateField = useCallback(
    (fieldId, patch) => {
      setSaved((prev) => ({
        ...prev,
        templates: prev.templates.map((t) =>
          t.id !== prev.activeTemplateId
                        ? t
            : {
                ...t,
                fields: t.fields.map((f) =>
                  f.id === fieldId ? { ...f, ...patch } : f
                ),
              }
        ),
      }));
    },
    [setSaved]
  );

  const clearFields = useCallback(() => {
    setSaved((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id !== prev.activeTemplateId ? t : { ...t, fields: [] }
      ),
    }));
  }, [setSaved]);

  /* ── Custom entries ── */
  const addCustomEntry = useCallback(
    (entry) => {
      setSaved((prev) => ({
        ...prev,
        customEntries: [
          ...prev.customEntries,
          { id: Date.now(), key: entry.key, text: entry.text },
        ],
      }));
    },
    [setSaved]
  );

  const removeCustomEntry = useCallback(
    (id) => {
      setSaved((prev) => ({
        ...prev,
        customEntries: prev.customEntries.filter((c) => c.id !== id),
      }));
    },
    [setSaved]
  );

  const updateCustomEntry = useCallback(
    (id, patch) => {
      setSaved((prev) => ({
        ...prev,
        customEntries: prev.customEntries.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      }));
    },
    [setSaved]
  );

  /* ── Config import/export ── */
  const handleExportConfig = useCallback(() => {
    const cfg = { templates: saved.templates, activeTemplateId: saved.activeTemplateId, customEntries: saved.customEntries };
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rwrops-metagen-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [saved]);

  const handleImportConfig = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const cfg = JSON.parse(reader.result);
        if (cfg.templates && cfg.customEntries) {
          setSaved({ templates: cfg.templates, activeTemplateId: cfg.activeTemplateId || "default", customEntries: cfg.customEntries });
        }
      } catch (_) {}
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [setSaved]);

  /* ── Keyboard: Ctrl+S to download ── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        // trigger download via button click
        const btn = document.getElementById("metagen-download-btn");
        if (btn) btn.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ── Panels ── */
  const treePanel = (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      overflow: "hidden",
    }}>
      {/* Search */}
      <div style={{
        padding: isMobile ? "4px 6px" : "5px 8px",
        flexShrink: 0,
      }}>
        <input
          type="text"
          placeholder={t("tools_metagen_tree_filter")}
          value={treeSearch}
          onChange={(e) => setTreeSearch(e.target.value)}
          style={{
            width: "100%",
            background: "var(--bg-base)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
            padding: "3px 6px",
            outline: "none",
          }}
        />
      </div>
      <TreeExplorer
        roots={filteredRoots}
        selectedPaths={selectedPaths}
        onTogglePath={() => {}}
        onAddPath={addField}
        activeCategory={activeCategory}
        onSetActiveCategory={setActiveCategory}
        isMobile={isMobile}
      />
    </div>
  );

  const composerPanel = (
    <TemplateEditor
      template={activeTemplate}
      categories={categories}
      onUpdateTemplate={updateTemplate}
      onRemoveField={removeField}
      onToggleField={toggleField}
      onUpdateField={updateField}
      onClearFields={clearFields}
      isMobile={isMobile}
      entityCount={entityCount}
    />
  );

  const handleNavigate = useCallback((type, key) => {
    window.history.pushState(null, "", `/params/${type}/${key}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const previewPanel = (
    <LivePreview
      template={activeTemplate}
      data={data}
      isMobile={isMobile}
      onNavigate={handleNavigate}
    />
  );

  /* ── Layout ── */

  if (isMobile) {
    const TABS = [
      { id: "tree", label: "TREE", icon: "ph:tree-structure", panel: treePanel },
      { id: "composer", label: "EDIT", icon: "ph:sliders", panel: composerPanel },
      { id: "preview", label: "VIEW", icon: "ph:eye", panel: previewPanel },
    ];

    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-deep)",
      }}>
        {/* Tab bar */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-base)",
          flexShrink: 0,
        }}>
          {TABS.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              style={{
                flex: 1,
                padding: "6px 4px",
                textAlign: "center",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-xxs)",
                color: mobileTab === tab.id ? "var(--accent)" : "var(--text-dim)",
                borderBottom: mobileTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                transition: "all var(--dur-fast) var(--ease-smooth)",
              }}
            >
              <Icon icon={tab.icon} width={10} />
              {tab.label}
            </div>
          ))}
        </div>

        {/* Active panel */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {TABS.find((t) => t.id === mobileTab)?.panel}
        </div>

        {/* Custom entries + Export */}
        <CustomEntriesManager
          entries={saved.customEntries}
          onAdd={addCustomEntry}
          onRemove={removeCustomEntry}
          onUpdate={updateCustomEntry}
          isMobile={isMobile}
        />
        <ExportPanel
          template={activeTemplate}
          data={data}
          customEntries={saved.customEntries}
          isMobile={isMobile}
          onExportConfig={handleExportConfig}
          onImportConfig={handleImportConfig}
        />
      </div>
    );
  }

  /* Desktop: three-panel layout */
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg-deep)",
    }}>
      {/* Three-panel content */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
      }}>
        {/* Left: Tree Explorer */}
        <div style={{
          width: 240,
          flexShrink: 0,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-base)",
        }}>
          {treePanel}
        </div>

        {/* Center: Template Editor */}
        <div style={{
          width: 320,
          flexShrink: 0,
          borderRight: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
        }}>
          {composerPanel}
        </div>

        {/* Right: Live Preview */}
        <div style={{
          flex: 1,
          background: "var(--bg-deep)",
        }}>
          {previewPanel}
        </div>
      </div>

      {/* Bottom: Custom entries + Export */}
      <CustomEntriesManager
        entries={saved.customEntries}
        onAdd={addCustomEntry}
        onRemove={removeCustomEntry}
        onUpdate={updateCustomEntry}
        isMobile={isMobile}
      />
      <ExportPanel
        template={activeTemplate}
        data={data}
        customEntries={saved.customEntries}
        isMobile={isMobile}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
      />
    </div>
  );
}
