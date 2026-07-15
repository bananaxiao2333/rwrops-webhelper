import { Icon } from "@iconify/react";
import React, { useMemo } from "react";
import { useT } from "../i18n.jsx";
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
  const stats = [];
  for (const m of arr) {
    if (!m.class) continue;
    if (COMBAT_CLASSES.includes(m.class)) {
      combat.push({
        class: m.class,
        input: m.input_character_state || "any",
        output: m.output_character_state || "none",
      });
    } else if (["speed", "hit_success_probability", "detectability"].includes(m.class)) {
      stats.push({ class: m.class, value: m.value || 0 });
    }
  }
  return { combat, stats };
}

function getProtected(item) {
  const { combat } = parseModifiers(item?.modifiers || item?.events);
  const has = new Set(combat.map(c => c.class));
  return {
    protects: COMBAT_CLASSES.filter(c => has.has(c)),
    vulnerable: COMBAT_CLASSES.filter(c => !has.has(c)),
  };
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

function CombatResults({ combat, t }) {
  if (!combat.length) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: "var(--text-dim)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: 3,
      }}>
        <Icon icon="mdi:sword-cross" style={{ fontSize: 9, marginRight: 3, verticalAlign: "middle" }} />
        {t("combat")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {combat.map((c, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: "var(--font-xs)", padding: "1px 0",
          }}>
            <Icon icon={CLASS_ICONS[c.class] || "mdi:information"}
              style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }} />
            <span style={{
              fontWeight: 600, color: "var(--text-muted)",
              textTransform: "uppercase", minWidth: 40,
            }}>
              {c.input}
            </span>
            <span style={{ color: "var(--text-dim)", fontSize: 10 }}>→</span>
            <span style={{
              fontWeight: 700, textTransform: "uppercase",
              color: c.output === "none" ? "var(--danger)" : "var(--text-primary)",
            }}>
              {c.output}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 600, color: "var(--text-muted)",
              marginLeft: 2,
            }}>
              ({classLabel(c.class, t)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatModifiers({ stats, t }) {
  if (!stats.length) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: "var(--text-dim)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: 3,
      }}>
        <Icon icon="mdi:chart-line" style={{ fontSize: 9, marginRight: 3, verticalAlign: "middle" }} />
        {t("stats")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {stats.map((s, i) => {
          const pct = (s.value * 100).toFixed(1);
          const pos = s.value >= 0;
          const barPct = Math.min(Math.abs(s.value) * 100, 100);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: "var(--font-xs)",
            }}>
              <Icon icon={CLASS_ICONS[s.class] || "mdi:information"}
                style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }} />
              <span style={{
                fontWeight: 600, color: "var(--text-muted)",
                textTransform: "uppercase", minWidth: 64,
              }}>
                {classLabel(s.class, t)}
              </span>
              <div style={{
                flex: 1, height: 4,
                background: "var(--bg-deep)", borderRadius: 2,
                overflow: "hidden", maxWidth: 80,
              }}>
                <div style={{
                  width: `${barPct}%`, height: "100%",
                  background: pos ? "var(--success)" : "var(--danger)",
                  borderRadius: 2,
                }} />
              </div>
              <span style={{
                fontWeight: 700, fontFamily: "var(--font-mono)",
                color: pos ? "var(--success)" : "var(--danger)",
                minWidth: 50, textAlign: "right",
              }}>
                {pos ? "+" : ""}{pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProtectionBadges({ protects, vulnerable, t }) {
  if (!protects.length && !vulnerable.length) return null;
  return (
    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
      {protects.map(c => (
        <span key={c} style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          fontSize: "var(--font-xxs)", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.04em",
          padding: "2px 7px",
          background: "color-mix(in srgb, var(--success) 15%, transparent)",
          border: "1px solid color-mix(in srgb, var(--success) 40%, transparent)",
          color: "var(--success)",
        }}>
          <Icon icon="mdi:shield-check" style={{ fontSize: 10 }} />
          {classLabel(c, t)}
        </span>
      ))}
      {vulnerable.length > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          fontSize: "var(--font-xxs)", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.04em",
          padding: "2px 7px",
          background: "color-mix(in srgb, var(--danger) 15%, transparent)",
          border: "1px solid color-mix(in srgb, var(--danger) 40%, transparent)",
          color: "var(--danger)",
        }}>
          <Icon icon="mdi:alert-circle" style={{ fontSize: 10 }} />
          {vulnerable.length === COMBAT_CLASSES.length
            ? t("no_protection")
            : vulnerable.map(c => classLabel(c, t)).join(" ")}
        </span>
      )}
    </div>
  );
}

function ItemCard({ entry, isCurrent, accent, t }) {
  const { combat, stats } = useMemo(() => parseModifiers(entry.item.modifiers || entry.item.events), [entry]);
  const { protects, vulnerable } = useMemo(() => getProtected(entry.item), [entry]);
  const commonness = useMemo(() => getCommonness(entry.item), [entry]);

  const accentColor = isCurrent
    ? "var(--accent)"
    : accent === "first"
      ? "var(--success)"
      : accent === "last"
        ? "var(--danger)"
        : "var(--border-mid)";

  return (
    <div style={{
      border: "1px solid var(--border-subtle)",
      borderLeft: `4px solid ${accentColor}`,
      background: isCurrent ? "var(--bg-elevated)" : "var(--bg-surface)",
      padding: "12px 16px",
      position: "relative",
      transition: "border-color var(--dur-fast) var(--ease-smooth), background var(--dur-fast) var(--ease-smooth)",
      boxShadow: isCurrent
        ? "0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), 0 2px 8px rgba(0,0,0,0.12)"
        : "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      {isCurrent && (
        <div style={{
          position: "absolute", top: 6, right: 8,
          display: "flex", alignItems: "center", gap: 3,
          fontSize: "var(--font-xxs)", fontWeight: 800,
          color: "var(--accent)",
          letterSpacing: "0.06em",
          fontFamily: "var(--font-mono)",
        }}>
          <Icon icon="mdi:target" style={{ fontSize: 11 }} />
          {t("current")}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, maxWidth: "90%" }}>
        <span style={{
          fontSize: "var(--font-md)", fontWeight: 800,
          color: isCurrent ? "var(--accent)" : "var(--text-primary)",
          fontFamily: "var(--font-display)", textTransform: "uppercase",
          lineHeight: 1.2,
        }}>
          {isCurrent && "★ "}{entry.name}
        </span>
        <span style={{
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          fontFamily: "var(--font-mono)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {entry.key}
        </span>
      </div>
      <CommonnessBar value={commonness} />
      <CombatResults combat={combat} t={t} />
      <StatModifiers stats={stats} t={t} />
      <ProtectionBadges protects={protects} vulnerable={vulnerable} t={t} />
    </div>
  );
}

function ChainConnector({ triggerLabel, t }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "4px 0",
    }}>
      <div style={{ width: 2, height: 14, background: "var(--border-mid)" }} />
      {triggerLabel && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: "var(--font-xxs)", fontWeight: 700,
          color: "var(--text-muted)", textTransform: "uppercase",
          letterSpacing: "0.06em",
          padding: "2px 10px",
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-base)",
          fontFamily: "var(--font-mono)",
          whiteSpace: "nowrap",
        }}>
          <Icon icon="mdi:delete" style={{ fontSize: 10, color: "var(--danger)" }} />
          <span style={{ color: "var(--danger)" }}>{t("consumes")}</span>
          <span style={{ color: "var(--text-dim)" }}>→</span>
          {triggerLabel}
        </span>
      )}
      <div style={{
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderTop: "7px solid var(--border-mid)",
      }} />
      <div style={{ width: 2, height: 4, background: "var(--border-mid)" }} />
    </div>
  );
}

/* ── Main component ── */

export default function ClothingVisualization({ item }) {
  const t = useT();
  const { data } = useData();
  const carryItems = data?.carry_item;
  const currentKey = item?.key;

  const ecosystem = useMemo(() => {
    if (!carryItems || Object.keys(carryItems).length === 0) {
      return { chains: [], standalone: [] };
    }

    const forward = {};
    const backward = {};

    for (const key of Object.keys(carryItems)) {
      const ci = carryItems[key];
      if (ci.transform_on_consume) {
        const target = resolveKey(ci.transform_on_consume);
        if (target && carryItems[target]) {
          forward[key] = target;
          if (!backward[target]) backward[target] = [];
          backward[target].push(key);
        }
      }
    }

    const connected = new Set();
    if (currentKey && carryItems[currentKey]) {
      const queue = [currentKey];
      while (queue.length) {
        const k = queue.shift();
        if (connected.has(k)) continue;
        connected.add(k);
        if (forward[k] && !connected.has(forward[k])) queue.push(forward[k]);
        if (backward[k]) backward[k].forEach(p => { if (!connected.has(p)) queue.push(p); });
      }
    }

    const chainRoots = [...connected].filter(k => !backward[k] || !backward[k].some(p => connected.has(p)));
    const chains = chainRoots
      .map(root => {
        const items = [];
        let cursor = root;
        while (cursor && connected.has(cursor)) {
          items.push({
            key: cursor,
            name: resolveName(carryItems[cursor]),
            item: carryItems[cursor],
          });
          cursor = forward[cursor] || null;
        }
        return items;
      })
      .filter(ch => ch.length > 0);

    const standalone = [];
    if (!connected.size || chains.length === 0) {
      if (currentKey && carryItems[currentKey]) {
        standalone.push({
          key: currentKey,
          name: resolveName(carryItems[currentKey]),
          item: carryItems[currentKey],
        });
      }
    }

    return { chains, standalone };
  }, [carryItems, currentKey]);

  const { chains, standalone } = ecosystem;
  const totalNodes = chains.reduce((s, ch) => s + ch.length, 0) + standalone.length;
  if (totalNodes === 0) return null;

  return (
    <div style={{
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{
        padding: "12px 18px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        animation: "fade-in 0.3s var(--ease-smooth) both",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          fontSize: "var(--font-base)", fontWeight: 700,
          color: "var(--accent)", textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: "var(--font-display)",
        }}>
          <Icon icon="mdi:swap-vertical-bold" style={{ fontSize: "var(--font-md)" }} />
          {t("degradation_chain")}
        </div>
        <span style={{
          fontSize: "var(--font-xs)", fontWeight: 600,
          color: "var(--text-muted)", textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          {totalNodes} {totalNodes === 1 ? t("state") : t("states")}
        </span>
      </div>

      <div style={{ padding: "16px 18px 18px" }}>
        {chains.map((chain, ci) => {
          const chainLen = chain.length;
          return (
            <div key={`ch-${ci}`} style={{ animation: `fade-in 0.3s var(--ease-smooth) ${ci * 0.06}s both` }}>
              {chain.map((entry, ei) => (
                <div key={entry.key}>
                  <ItemCard
                    entry={entry}
                    isCurrent={entry.key === currentKey}
                    t={t}
                    accent={
                      chainLen === 1
                        ? "single"
                        : ei === 0
                          ? "first"
                          : ei === chainLen - 1
                            ? "last"
                            : "middle"
                    }
                  />
                  {ei < chainLen - 1 && (() => {
                    const curItem = entry.item;
                    let trigger = entry.key;
                    if (curItem.transform_on_consume) {
                      const ref = resolveKey(curItem.transform_on_consume);
                      if (ref) trigger = ref;
                    }
                    return <ChainConnector triggerLabel={trigger} t={t} />;
                  })()}
                </div>
              ))}
              {ci < chains.length - 1 && (
                <div style={{
                  textAlign: "center", padding: "10px 0",
                  fontSize: "var(--font-xxs)",
                  color: "var(--text-dim)", fontWeight: 600,
                  letterSpacing: "0.15em",
                  fontFamily: "var(--font-mono)",
                }}>
                  ——— {t("branch")} ———
                </div>
              )}
            </div>
          );
        })}

        {standalone.map(entry => (
          <div key={entry.key} style={{
            animation: "fade-in 0.3s var(--ease-smooth) 0.1s both",
            marginTop: chains.length > 0 ? 10 : 0,
          }}>
            <ItemCard
              entry={entry}
              isCurrent={entry.key === currentKey}
              t={t}
              accent="single"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
