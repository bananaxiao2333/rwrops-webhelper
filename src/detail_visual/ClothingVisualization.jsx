import { Icon } from "@iconify/react";
import React, { useMemo } from "react";
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
          background: "color-mix(in srgb, var(--success) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--success) 35%, transparent)",
        }}>
          <Icon icon="mdi:shield-check" style={{ fontSize: 13, color: "var(--success)", flexShrink: 0 }} />
          <span style={{
            fontSize: "var(--font-xxs)", fontWeight: 800,
            color: "var(--success)", textTransform: "uppercase",
            letterSpacing: "0.06em", flexShrink: 0,
          }}>
            {t("protection_full")}
          </span>
          <span style={{ color: "color-mix(in srgb, var(--success) 60%, transparent)", fontSize: 10 }}>·</span>
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
          background: "color-mix(in srgb, var(--amber) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--amber) 35%, transparent)",
        }}>
          <Icon icon="mdi:shield-half" style={{ fontSize: 13, color: "var(--amber)", flexShrink: 0 }} />
          <span style={{
            fontSize: "var(--font-xxs)", fontWeight: 800,
            color: "var(--amber)", textTransform: "uppercase",
            letterSpacing: "0.06em", flexShrink: 0,
          }}>
            {t("protection_wear")}
          </span>
          <span style={{ color: "color-mix(in srgb, var(--amber) 60%, transparent)", fontSize: 10 }}>·</span>
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
          background: "color-mix(in srgb, var(--danger) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--danger) 35%, transparent)",
        }}>
          <Icon icon="mdi:shield-off" style={{ fontSize: 13, color: "var(--danger)", flexShrink: 0 }} />
          <span style={{
            fontSize: "var(--font-xxs)", fontWeight: 800,
            color: "var(--danger)", textTransform: "uppercase",
            letterSpacing: "0.06em", flexShrink: 0,
          }}>
            {t("no_protection")}
          </span>
          <span style={{ color: "color-mix(in srgb, var(--danger) 60%, transparent)", fontSize: 10 }}>·</span>
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

/* ── Item card ── */

function ItemCard({ entry, isCurrent, accent, t, translate }) {
  const commonness = useMemo(() => getCommonness(entry.item), [entry]);
  const { full, wear, none } = useMemo(() => getProtectionCategories(entry.item), [entry]);

  const accentColor = isCurrent
    ? "var(--accent)"
    : accent === "first"
      ? "var(--success)"
      : accent === "last"
        ? "var(--danger)"
        : "var(--border-mid)";

  const displayName = (() => {
    const n = resolveName(entry.item);
    const tn = translate(n);
    return tn || n;
  })();

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
          {isCurrent && "★ "}{displayName}
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
      <ProtectionBar full={full} wear={wear} none={none} t={t} />
    </div>
  );
}

/* ── Chain connector ── */

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
  const { t, translate } = useI18n();
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
                    translate={translate}
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
              translate={translate}
              accent="single"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
