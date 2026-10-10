import { Icon } from "@iconify/react";
import React, { useMemo, useState } from "react";
import { useI18n } from "../i18n.jsx";
import { useData } from "../DataContext.jsx";

const COMBAT_CLASSES = [
  "projectile_hit_result",
  "projectile_blast_result",
  "melee_hit_result",
];

const CLASS_ICONS = {
  projectile_hit_result: "mdi:target",
  projectile_blast_result: "mdi:explosion",
  melee_hit_result: "mdi:sword",
  speed: "mdi:speedometer",
  hit_success_probability: "mdi:crosshairs",
  detectability: "mdi:eye-outline",
};

const CLASS_I18N_KEYS = {
  projectile_hit_result: "class_projectile",
  projectile_blast_result: "class_blast",
  melee_hit_result: "class_melee",
  speed: "class_speed",
  hit_success_probability: "class_hit_prob",
  detectability: "class_detect",
};

function classLabel(cls, t) {
  return t(CLASS_I18N_KEYS[cls] || cls);
}

/* ── helpers ── */

function resolveKey(ref) {
  if (!ref) return null;
  if (typeof ref === "object") return ref.key || ref.name || null;
  const s = String(ref);
  const dot = s.lastIndexOf(".");
  return dot > 0 ? s.slice(dot + 1) : s;
}

function resolveName(item) {
  if (!item) return "?";
  if (typeof item.name === "string" && item.name) return item.name;
  return resolveKey(item.key) || item.key || "?";
}

function getCommonness(item) {
  const c = item.commonness;
  if (c == null) return null;
  if (typeof c === "number") return c;
  if (typeof c?.value === "number") return c.value;
  if (typeof c?.commonness_value === "number") return c.commonness_value;
  return null;
}

function parseModifiers(source) {
  const arr = source || [];
  const combat = [];
  for (const m of arr) {
    if (!m.class) continue;
    if (COMBAT_CLASSES.includes(m.class)) {
      combat.push({
        class: m.class,
        input: m.input_character_state || "any",
        output: m.output_character_state || "none",
      });
    }
  }
  return combat;
}

function getProtectionCategories(item) {
  const combat = parseModifiers(item?.modifiers || item?.events);
  const full = [];
  const wear = [];
  const none = [];

  for (const cls of COMBAT_CLASSES) {
    const mod = combat.find(c => c.class === cls);
    if (mod) {
      if (mod.output === "none") {
        full.push(mod);
      } else {
        wear.push(mod);
      }
    } else {
      none.push(cls);
    }
  }
  return { full, wear, none };
}

/* ── sub-components ── */

function CommonnessBar({ value }) {
  if (value == null) return null;
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  const hue = pct > 60 ? "var(--success)" : pct > 30 ? "var(--amber)" : "var(--danger)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <div style={{
        flex: 1, height: 6,
        background: "var(--bg-deep)",
        borderRadius: 3, overflow: "hidden",
        maxWidth: 140,
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: hue, borderRadius: 3 }} />
      </div>
      <span style={{
        fontSize: "var(--font-xs)", fontWeight: 800,
        color: hue, fontFamily: "var(--font-mono)",
        minWidth: 36, textAlign: "right",
      }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

/* ── Protection badge bar ── */

function ProtectionBar({ full, wear, none, t }) {
  if (!full.length && !wear.length && !none.length) return null;

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Full protection — green */}
      {full.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "3px 8px",
          background: "var(--tint-ok)",
          border: "1px solid var(--tint-ok)",
        }}>
          <Icon icon="mdi:shield-check" style={{ fontSize: 13, color: "var(--success)", flexShrink: 0 }} />
          <span style={{
            fontSize: "var(--font-xxs)", fontWeight: 800,
            color: "var(--success)", textTransform: "uppercase",
            letterSpacing: "0.06em", flexShrink: 0,
          }}>
            {t("protection_full")}
          </span>
          <span style={{ color: "var(--tint-ok)", fontSize: 10 }}>·</span>
          <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {full.map(m => (
              <span key={m.class} style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: "var(--font-xxs)", fontWeight: 700,
                textTransform: "uppercase", color: "var(--success)",
                cursor: "default",
              }}
                title={`${classLabel(m.class, t)}\n${t("mod_input")}: ${m.input}  ${t("mod_output")}: ${m.output}`}
              >
                <Icon icon={CLASS_ICONS[m.class] || "mdi:shield"} style={{ fontSize: 9 }} />
                {classLabel(m.class, t)}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* Causes wear — yellow/amber */}
      {wear.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "3px 8px",
          background: "var(--tint-warn)",
          border: "1px solid var(--tint-warn)",
        }}>
          <Icon icon="mdi:shield-half" style={{ fontSize: 13, color: "var(--amber)", flexShrink: 0 }} />
          <span style={{
            fontSize: "var(--font-xxs)", fontWeight: 800,
            color: "var(--amber)", textTransform: "uppercase",
            letterSpacing: "0.06em", flexShrink: 0,
          }}>
            {t("protection_wear")}
          </span>
          <span style={{ color: "var(--tint-warn)", fontSize: 10 }}>·</span>
          <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {wear.map(m => (
              <span key={m.class} style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: "var(--font-xxs)", fontWeight: 700,
                textTransform: "uppercase", color: "var(--amber)",
                cursor: "default",
              }}
                title={`${classLabel(m.class, t)}\n${t("mod_input")}: ${m.input}  ${t("mod_output")}: ${m.output}`}
              >
                <Icon icon={CLASS_ICONS[m.class] || "mdi:shield"} style={{ fontSize: 9 }} />
                {classLabel(m.class, t)}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* No protection — red */}
      {none.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "3px 8px",
          background: "var(--tint-bad)",
          border: "1px solid var(--tint-bad)",
        }}>
          <Icon icon="mdi:shield-off" style={{ fontSize: 13, color: "var(--danger)", flexShrink: 0 }} />
          <span style={{
            fontSize: "var(--font-xxs)", fontWeight: 800,
            color: "var(--danger)", textTransform: "uppercase",
            letterSpacing: "0.06em", flexShrink: 0,
          }}>
            {t("no_protection")}
          </span>
          <span style={{ color: "var(--tint-bad)", fontSize: 10 }}>·</span>
          <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {none.map(cls => (
              <span key={cls} style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: "var(--font-xxs)", fontWeight: 700,
                textTransform: "uppercase", color: "var(--danger)",
                cursor: "default",
              }}
                title={`${classLabel(cls, t)}\n${t("mod_no_entry")}`}
              >
                <Icon icon={CLASS_ICONS[cls] || "mdi:shield-off"} style={{ fontSize: 9 }} />
                {classLabel(cls, t)}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── One state on the rail ──
 * Collapsed by default: a 45-state chain rendered as 45 full cards is a page
 * nobody scrolls. The row carries what you scan for (name, protection counts,
 * commonness); the badges only open on demand. */
function StateRow({ entry, index, isCurrent, isFirst, isLast, routes, t, translate, open, onToggle }) {
  const commonness = useMemo(() => getCommonness(entry.item), [entry]);
  const { full, wear, none } = useMemo(() => getProtectionCategories(entry.item), [entry]);

  const displayName = (() => {
    const n = resolveName(entry.item);
    return translate(n) || n;
  })();

  const dotColor = isCurrent
    ? "var(--accent)"
    : isFirst
      ? "var(--success)"
      : isLast
        ? "var(--danger)"
        : "var(--border-heavy)";

  return (
    <li className="chain-item" style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}>
      <span className="chain-dot" style={{ background: dotColor }} data-current={isCurrent || undefined} />

      <button
        type="button"
        className="chain-head"
        onClick={onToggle}
        aria-expanded={open}
        title={`${entry.key} — ${t(open ? "chain_collapse" : "chain_expand")}`}
      >
        <span className="chain-index">#{String(index + 1).padStart(2, "0")}</span>
        <span className="chain-name" data-current={isCurrent || undefined}>
          {isCurrent && "★ "}{displayName}
        </span>
        <span className="chain-key">{entry.key}</span>

        <span className="chain-badges">
          {full.length > 0 && (
            <span className="chain-badge" data-kind="full">
              <Icon icon="mdi:shield-check" />{full.length}
            </span>
          )}
          {wear.length > 0 && (
            <span className="chain-badge" data-kind="wear">
              <Icon icon="mdi:shield-half" />{wear.length}
            </span>
          )}
          {none.length > 0 && (
            <span className="chain-badge" data-kind="none">
              <Icon icon="mdi:shield-off" />{none.length}
            </span>
          )}
        </span>

        <span className="chain-common" data-empty={commonness == null || undefined}>
          {commonness == null ? "—" : `${Math.round(commonness * 100)}%`}
        </span>
        <Icon icon="mdi:chevron-down" className="chain-chev" data-open={open || undefined} />
      </button>

      {open && (
        <div className="chain-body">
          <CommonnessBar value={commonness} />
          <ProtectionBar full={full} wear={wear} none={none} t={t} />
          {entry.next && (
            <div className="chain-note">
              <Icon icon="mdi:swap-vertical" style={{ fontSize: 10 }} />
              <span className="chain-note-key">{t("consumes")}</span>
              <span style={{ color: "var(--text-dim)" }}>→</span>
              <span className="chain-note-key">{entry.next}</span>
            </div>
          )}
          {routes?.length > 0 && (
            <div className="chain-note">
              <Icon icon="mdi:source-branch" style={{ fontSize: 10 }} />
              <span>{t("chain_routes")}</span>
              {routes.map(r => <span key={r} className="chain-note-key">{r}</span>)}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/* ── Chain builder ──
 * `transform_on_consume` is a graph, not a list. Three things it can do that a
 * naive forward walk gets wrong:
 *   1. Loop. `vest_exo_ai_4` transforms into itself, which froze the tab —
 *      the walk had no visited set.
 *   2. Dangle. `god_vest_2 → god_vest_3` and three others point at items this
 *      package does not ship; the old code dropped the edge and the chain just
 *      stopped, looking like a final state.
 *   3. Merge. `vest_elf_bomber` and `vest_elf_bomber_ally` both transform into
 *      `elf_bomber_1`, so the shared tail was rendered twice under a misleading
 *      "BRANCH" divider. */
function buildEcosystem(carryItems, currentKey) {
  const forward = new Map();   // key -> target key (present in the index)
  const backward = new Map();  // key -> Set(keys that transform into it)
  const dangling = new Map();  // key -> target key this package does not ship

  for (const [key, ci] of Object.entries(carryItems)) {
    const target = resolveKey(ci?.transform_on_consume);
    if (!target) continue;
    if (carryItems[target]) {
      forward.set(key, target);
      if (!backward.has(target)) backward.set(target, new Set());
      backward.get(target).add(key);
    } else {
      dangling.set(key, target);
    }
  }

  // Connected component of the current item, both directions.
  const connected = new Set();
  if (currentKey && carryItems[currentKey]) {
    const queue = [currentKey];
    while (queue.length) {
      const k = queue.pop();
      if (connected.has(k)) continue;
      connected.add(k);
      const f = forward.get(k);
      if (f && !connected.has(f)) queue.push(f);
      for (const p of backward.get(k) ?? []) if (!connected.has(p)) queue.push(p);
    }
  }

  const parentsIn = (k) => [...(backward.get(k) ?? [])].filter(p => connected.has(p));
  const roots = [...connected].filter(k => parentsIn(k).length === 0);

  const chains = roots.map(root => {
    const items = [];
    const seen = new Set();
    let cursor = root;
    while (cursor && connected.has(cursor) && !seen.has(cursor)) {
      seen.add(cursor);
      items.push({ key: cursor, item: carryItems[cursor], next: forward.get(cursor) ?? null });
      cursor = forward.get(cursor) ?? null;
    }
    // Why the walk stopped, when it stopped for a reason other than "no more".
    const lastKey = items[items.length - 1]?.key;
    const tail = cursor && seen.has(cursor)
      ? { kind: "loop", key: cursor }
      : dangling.has(lastKey)
        ? { kind: "missing", key: dangling.get(lastKey) }
        : null;
    return { root, items, tail };
  }).filter(c => c.items.length > 0);

  // Prefer the chain that actually contains the item being viewed; merges put
  // it in more than one.
  const primary = chains.find(c => c.items.some(e => e.key === currentKey)) ?? chains[0] ?? null;
  const otherRoots = primary ? roots.filter(r => r !== primary.root) : [];

  // Sources that feed the primary chain from outside it.
  const chainKeys = new Set(primary?.items.map(e => e.key) ?? []);
  const routesFor = (key) =>
    [...(backward.get(key) ?? [])].filter(p => !chainKeys.has(p));

  const standalone =
    !primary && currentKey && carryItems[currentKey]
      ? [{ key: currentKey, item: carryItems[currentKey], next: null }]
      : [];

  return { primary, otherRoots, routesFor, standalone };
}

/* ── Main component ── */

export default function ClothingVisualization({ item }) {
  const { t, translate } = useI18n();
  const { data } = useData();
  const carryItems = data?.carry_item;
  const currentKey = item?.key;

  const [openKey, setOpenKey] = useState(currentKey);

  const { primary, otherRoots, routesFor, standalone } = useMemo(
    () => (carryItems && Object.keys(carryItems).length
      ? buildEcosystem(carryItems, currentKey)
      : { primary: null, otherRoots: [], routesFor: () => [], standalone: [] }),
    [carryItems, currentKey]
  );

  const totalNodes = (primary?.items.length ?? 0) + standalone.length;
  if (totalNodes === 0) return null;

  const rows = primary?.items ?? standalone;

  return (
    <div className="chain-panel">
      <div className="chain-header">
        <div className="chain-title">
          <Icon icon="mdi:swap-vertical-bold" style={{ fontSize: "var(--font-md)" }} />
          {t("degradation_chain")}
        </div>
        <div className="chain-meta">
          {otherRoots.length > 0 && (
            <span className="chain-meta-item">
              {otherRoots.length + 1} {t("chain_routes")}
            </span>
          )}
          <span className="chain-meta-item">
            {totalNodes} {totalNodes === 1 ? t("state") : t("states")}
          </span>
        </div>
      </div>

      <ol className="chain-list">
        {rows.map((entry, i) => (
          <StateRow
            key={entry.key}
            entry={entry}
            index={i}
            isCurrent={entry.key === currentKey}
            isFirst={i === 0}
            isLast={i === rows.length - 1 && !primary?.tail}
            routes={routesFor(entry.key)}
            t={t}
            translate={translate}
            open={openKey === entry.key}
            onToggle={() => setOpenKey(k => (k === entry.key ? null : entry.key))}
          />
        ))}

        {/* The chain continues into something this package does not ship. */}
        {primary?.tail && (
          <li className="chain-item chain-tail" style={{ animationDelay: "320ms" }}>
            <span className="chain-dot" data-tail={primary.tail.kind} />
            <div className="chain-tail-body">
              <Icon
                icon={primary.tail.kind === "loop" ? "mdi:restart" : "mdi:help-circle-outline"}
                style={{ fontSize: 12 }}
              />
              <span className="chain-note-key">{primary.tail.key}</span>
              <span>
                {primary.tail.kind === "loop" ? t("chain_loops") : t("chain_missing")}
              </span>
            </div>
          </li>
        )}
      </ol>

      {otherRoots.length > 0 && (
        <div className="chain-footnote">
          <Icon icon="mdi:source-branch" style={{ fontSize: 10 }} />
          {t("chain_also_from")}
          {otherRoots.map(r => <span key={r} className="chain-note-key">{r}</span>)}
        </div>
      )}
    </div>
  );
}
