import { Icon } from "@iconify/react";
import React from "react";
import { useT } from "../i18n.jsx";

const ICON_MAP = {
  projectile_blast_result: "mdi:explosion",
  projectile_hit_result: "mdi:target",
  melee_hit_result: "mdi:sword",
  speed: "mdi:speedometer",
  hit_success_probability: "mdi:crosshairs",
  detectability: "mdi:eye-outline",
};

const CLASS_LABELS = {
  projectile_blast_result: "BLAST",
  projectile_hit_result: "PROJECTILE",
  melee_hit_result: "MELEE",
  speed: "SPEED",
  hit_success_probability: "HIT",
  detectability: "DETECT",
};

function FlowArrow({ label, consumes }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      flexShrink: 0,
    }}>
      <div style={{
        width: 20, height: 2,
        background: "var(--border-mid)", flexShrink: 0,
      }} />
      <span style={{
        fontSize: "var(--font-xxs)", fontWeight: 600,
        color: "var(--text-muted)", textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <div style={{
        width: 0, height: 0,
        borderTop: "4px solid transparent",
        borderBottom: "4px solid transparent",
        borderLeft: "6px solid var(--border-mid)",
        flexShrink: 0,
      }} />
      {consumes && (
        <span style={{ color: "var(--danger)", fontSize: "var(--font-xxs)", fontWeight: 700, marginLeft: 2 }}>
          <Icon icon="mdi:delete" style={{ fontSize: 10, marginRight: 1 }} />
          DESTROY
        </span>
      )}
    </div>
  );
}

function StateBox({ children, type }) {
  const borderColor = type === "input"
    ? "var(--info)"
    : type === "output"
      ? "var(--danger)"
      : "var(--border-mid)";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px",
      border: `1px solid ${borderColor}`,
      background: type === "event" ? "var(--bg-elevated)" : "var(--bg-base)",
      fontWeight: 700,
      fontSize: "var(--font-xxs)",
      color: type === "event" ? "var(--accent)" : "var(--text-primary)",
      textTransform: "uppercase",
      letterSpacing: type === "event" ? "0.08em" : "0.04em",
      whiteSpace: "nowrap",
      fontFamily: "var(--font-mono)",
    }}>
      {children}
    </div>
  );
}

export default function ClothingVisualization({ item }) {
  const t = useT();
  if (!item || item.type !== "carry_item") return null;

  const eventsSource = item.events || item.modifiers || [];
  const combatResults = [];
  const statModifiers = [];

  eventsSource.forEach((modifier) => {
    if (!modifier.class) return;
    if (!["speed", "hit_success_probability", "detectability"].includes(modifier.class)) {
      combatResults.push({
        class: modifier.class,
        inputState: modifier.input_character_state || "any",
        outputState: modifier.output_character_state || "none",
        consumesItem: modifier.consumes_item !== undefined
          ? modifier.consumes_item
          : !!item.transform_on_consume,
      });
    } else {
      statModifiers.push({
        class: modifier.class,
        value: modifier.value || 0,
      });
    }
  });

  const hasContent = combatResults.length > 0 || statModifiers.length > 0 || item.transform_on_consume || item.slot;
  if (!hasContent) return null;

  const commonnessVal = item.commonness !== undefined
    ? (typeof item.commonness === "number" ? item.commonness : item.commonness_value ?? item.commonness?.value)
    : null;

  return (
    <div style={{
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
      fontFamily: "var(--font-mono)",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        animation: "fade-in 0.3s var(--ease-smooth) both",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontSize: "var(--font-base)", fontWeight: 700,
          color: "var(--accent)", textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontFamily: "var(--font-display)",
        }}>
          <Icon icon="mdi:package-variant-closed" style={{ fontSize: "var(--font-md)" }} />
          {t("carry_item")}
        </div>
        {item.slot !== undefined && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: "var(--font-xxs)", fontWeight: 600,
            color: "var(--text-muted)", textTransform: "uppercase",
            letterSpacing: "0.06em",
            padding: "3px 8px",
            border: "1px solid var(--border-mid)",
          }}>
            <Icon icon="mdi:tag" style={{ fontSize: 10 }} />
            {t("field_slot")}: {String(item.slot)}
          </div>
        )}
      </div>

      {/* ── Rarity bar ── */}
      {commonnessVal !== null && (
        <div style={{
          padding: "6px 14px",
          borderBottom: combatResults.length > 0 || statModifiers.length > 0 || item.transform_on_consume
            ? "1px solid var(--border-subtle)" : "none",
          display: "flex", alignItems: "center", gap: 10,
          animation: "fade-in 0.3s var(--ease-smooth) 0.04s both",
        }}>
          <span style={{
            fontSize: "var(--font-xxs)", fontWeight: 600,
            color: "var(--text-muted)", textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            {t("field_commonness")}:
          </span>
          <div style={{
            flex: 1, height: 6,
            background: "var(--bg-deep)",
            borderRadius: 3,
            overflow: "hidden",
            maxWidth: 120,
          }}>
            <div style={{
              width: `${Math.min(commonnessVal * 100, 100)}%`,
              height: "100%",
              background: commonnessVal > 0.6
                ? "var(--success)"
                : commonnessVal > 0.3
                  ? "var(--amber)"
                  : "var(--danger)",
              borderRadius: 3,
              transition: "width 0.3s ease",
            }} />
          </div>
          <span style={{
            fontSize: "var(--font-xxs)", fontWeight: 700,
            color: commonnessVal > 0.6
              ? "var(--success)"
              : commonnessVal > 0.3
                ? "var(--amber)"
                : "var(--danger)",
            fontFamily: "var(--font-mono)",
          }}>
            {(commonnessVal * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* ── State transitions (combat results) ── */}
      {combatResults.length > 0 && (
        <div>
          <div style={{
            padding: "8px 14px 4px",
            fontSize: "var(--font-xxs)", fontWeight: 700,
            color: "var(--text-muted)", textTransform: "uppercase",
            letterSpacing: "0.1em",
            display: "flex", alignItems: "center", gap: 6,
            animation: "fade-in 0.3s var(--ease-smooth) 0.08s both",
          }}>
            <Icon icon="mdi:graph" style={{ fontSize: 11 }} />
            {t("state")}
          </div>
          <div style={{ padding: "4px 14px 10px" }}>
            {combatResults.map((cr, idx) => (
              <div
                key={`cr-${idx}`}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  flexWrap: "wrap",
                  padding: "4px 0",
                  animation: `fade-in 0.2s var(--ease-smooth) ${0.1 + idx * 0.04}s both`,
                }}
              >
                <StateBox type="input">{cr.inputState}</StateBox>
                <FlowArrow
                  label={CLASS_LABELS[cr.class] || cr.class}
                  consumes={cr.consumesItem}
                />
                <StateBox type="output">{cr.outputState}</StateBox>
                <span style={{
                  fontSize: "var(--font-xxs)", color: "var(--text-dim)",
                  marginLeft: 4,
                }}>
                  <Icon icon={ICON_MAP[cr.class] || "mdi:information-outline"}
                    style={{ fontSize: 10, marginRight: 2, verticalAlign: "middle" }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stat modifiers ── */}
      {statModifiers.length > 0 && (
        <div>
          <div style={{
            padding: "6px 14px 4px",
            fontSize: "var(--font-xxs)", fontWeight: 700,
            color: "var(--text-muted)", textTransform: "uppercase",
            letterSpacing: "0.1em",
            display: "flex", alignItems: "center", gap: 6,
            borderTop: combatResults.length > 0 ? "1px solid var(--border-subtle)" : "none",
            animation: "fade-in 0.3s var(--ease-smooth) 0.12s both",
          }}>
            <Icon icon="mdi:chart-line" style={{ fontSize: 11 }} />
            {t("stats")}
          </div>
          <div style={{ padding: "4px 14px 10px" }}>
            {statModifiers.map((sm, idx) => {
              const pct = (sm.value * 100).toFixed(1);
              const isPositive = sm.value >= 0;
              const barPct = Math.min(Math.abs(sm.value) * 100, 100);
              return (
                <div
                  key={`sm-${idx}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "4px 0",
                    animation: `fade-in 0.2s var(--ease-smooth) ${0.14 + idx * 0.04}s both`,
                  }}
                >
                  <Icon icon={ICON_MAP[sm.class] || "mdi:information-outline"}
                    style={{ fontSize: 12, color: "var(--accent)", flexShrink: 0 }} />
                  <span style={{
                    fontSize: "var(--font-xxs)", fontWeight: 600,
                    color: "var(--text-primary)", textTransform: "uppercase",
                    minWidth: 80,
                    letterSpacing: "0.04em",
                  }}>
                    {CLASS_LABELS[sm.class] || sm.class}
                  </span>
                  <div style={{
                    flex: 1, height: 4,
                    background: "var(--bg-deep)",
                    borderRadius: 2,
                    overflow: "hidden",
                    maxWidth: 80,
                  }}>
                    <div style={{
                      width: `${barPct}%`,
                      height: "100%",
                      background: isPositive ? "var(--success)" : "var(--danger)",
                      borderRadius: 2,
                    }} />
                  </div>
                  <span style={{
                    fontSize: "var(--font-xxs)", fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: isPositive ? "var(--success)" : "var(--danger)",
                    minWidth: 50, textAlign: "right",
                  }}>
                    {isPositive ? "+" : ""}{pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Degradation chain ── */}
      {item.transform_on_consume && (
        <div>
          <div style={{
            padding: "6px 14px 4px",
            fontSize: "var(--font-xxs)", fontWeight: 700,
            color: "var(--text-muted)", textTransform: "uppercase",
            letterSpacing: "0.1em",
            display: "flex", alignItems: "center", gap: 6,
            borderTop: "1px solid var(--border-subtle)",
            animation: "fade-in 0.3s var(--ease-smooth) 0.16s both",
          }}>
            <Icon icon="mdi:swap-horizontal" style={{ fontSize: 11 }} />
            {t("field_transform_on_consume")}
          </div>
          <div style={{
            padding: "4px 14px 10px",
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            animation: "fade-in 0.3s var(--ease-smooth) 0.18s both",
          }}>
            <span style={{
              fontSize: "var(--font-sm)", fontWeight: 600,
              color: "var(--text-primary)", textTransform: "uppercase",
            }}>
              {typeof item.transform_on_consume === "object" && item.transform_on_consume.name
                ? item.transform_on_consume.name
                : String(item.transform_on_consume)}
            </span>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: "var(--font-xxs)", fontWeight: 600,
              color: "var(--danger)", textTransform: "uppercase",
            }}>
              <Icon icon="mdi:delete" style={{ fontSize: 11 }} />
              <span>{t("consumes")}</span>
              <Icon icon="mdi:arrow-right" style={{ fontSize: 11 }} />
            </div>
            {item.transform_on_consume.key ? (
              <span style={{
                fontSize: "var(--font-sm)", fontWeight: 600,
                color: "var(--accent)", textTransform: "uppercase",
                textDecoration: "underline", textDecorationStyle: "dotted",
                textUnderlineOffset: 2,
              }}>
                {item.transform_on_consume.key}
              </span>
            ) : (
              <span style={{
                fontSize: "var(--font-sm)", fontWeight: 600,
                color: "var(--info)", textTransform: "uppercase",
              }}>
                {typeof item.transform_on_consume === "string"
                  ? item.transform_on_consume
                  : String(item.transform_on_consume)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
