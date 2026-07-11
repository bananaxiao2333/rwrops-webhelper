import { Icon } from "@iconify/react";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import { useI18n } from "../i18n.jsx";

/* ── Permission badge colors ── */
const PERM_COLORS = {
  moderator: { bg: "var(--accent-dim)", text: "var(--accent)" },
  admin: { bg: "var(--danger)", text: "var(--danger)" },
};

/* ── Render an action row ── */
function ActionRow({ action, index, data }) {
  const { translate } = useI18n();
  // Spawn action — show item icon + link
  if (action.type === "spawn") {
    const fullKey = action.key;
    const type = action.class;
    const item = data?.[type]?.[fullKey];
    const iconUrl = useItemIcon(item || { hud_icon_filename: null });

    const fallbackIcon =
      type === "weapon" ? "mdi:sword" :
      type === "carry_item" ? "mdi:package-variant-closed" :
      type === "projectile" ? "mdi:missile" :
      type === "vehicle" ? "mdi:truck" :
      "mdi:help-circle-outline";

    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 14px",
        borderTop: index > 0 ? "1px solid var(--border-subtle)" : "none",
        background: index % 2 ? "var(--bg-base)" : "transparent",
        animation: `fade-in 0.2s var(--ease-smooth) ${0.06 + index * 0.03}s both`,
      }}>
        <span style={{
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          minWidth: 24, fontWeight: 700,
        }}>
          #{index + 1}
        </span>

        {/* Action type badge */}
        <span style={{
          fontSize: "var(--font-xxs)", fontWeight: 700,
          padding: "2px 6px",
          border: "1px solid var(--success)",
          color: "var(--success)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          flexShrink: 0,
        }}>
          {action.type}
        </span>

        {/* Item icon */}
        {iconUrl ? (
          <img src={iconUrl} alt="" style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0, imageRendering: "pixelated" }} />
        ) : (
          <Icon icon={fallbackIcon} style={{ fontSize: 18, flexShrink: 0, color: "var(--text-muted)" }} />
        )}

        {/* Item link */}
        <a
          href={`/params/${type}/${fullKey}`}
          onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", `/params/${type}/${fullKey}`); window.dispatchEvent(new PopStateEvent("popstate")); }}
          style={{
            color: "var(--accent)",
            textDecoration: "underline",
            textDecorationStyle: "dotted",
            textUnderlineOffset: 2,
            cursor: "pointer",
            fontSize: "var(--font-sm)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--amber)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
          title={fullKey}
        >
          {translate(item?.name) || fullKey}
        </a>

        {/* Type badge */}
        <span style={{
          fontSize: "var(--font-xxs)",
          color: "var(--text-muted)",
          padding: "1px 5px",
          border: "1px solid var(--border-subtle)",
          flexShrink: 0,
          marginLeft: "auto",
        }}>
          {type}
        </span>
      </div>
    );
  }

  // Non-spawn action — show type and details
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 14px",
      borderTop: index > 0 ? "1px solid var(--border-subtle)" : "none",
      background: index % 2 ? "var(--bg-base)" : "transparent",
      animation: `fade-in 0.2s var(--ease-smooth) ${0.06 + index * 0.03}s both`,
    }}>
      <span style={{
        fontSize: "var(--font-xxs)", color: "var(--text-dim)",
        minWidth: 24, fontWeight: 700,
      }}>
        #{index + 1}
      </span>

      <span style={{
        fontSize: "var(--font-xs)", fontWeight: 700,
        padding: "2px 6px",
        border: "1px solid var(--border-mid)",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        flexShrink: 0,
      }}>
        {action.type}
      </span>

      <span style={{
        fontSize: "var(--font-xs)",
        color: "var(--text-secondary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {action.message || action.xml || action.variable || action.text || action.detail || ""}
      </span>
    </div>
  );
}

/* ── CommandVisualization ── */
export default function CommandVisualization({ item }) {
  const { data } = useData();
  const { t } = useI18n();
  if (!item || item.type !== "command_config") return null;

  const actions = item.actions || [];
  const permColor = PERM_COLORS[item.permission] || PERM_COLORS.admin;

  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${permColor.bg}`,
        fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Icon icon="mdi:terminal" style={{ fontSize: "var(--font-md)" }} />
        <span>/{item.command}</span>
        <span style={{
          marginLeft: "auto",
          fontSize: "var(--font-xxs)", fontWeight: 600,
          padding: "2px 8px",
          border: `1px solid ${permColor.text}`,
          color: permColor.text,
          textTransform: "uppercase",
        }}>
          {item.permission}
        </span>
      </div>

      {/* Description */}
      {item.description && (
        <div style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: "var(--font-sm)",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-text)",
          lineHeight: 1.5,
          fontStyle: "italic",
          animation: "fade-in 0.25s var(--ease-smooth) 0.06s both",
        }}>
          {item.description}
        </div>
      )}

      {/* Effects summary */}
      {item.effects && (
        <div style={{
          padding: "6px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xxs)",
          color: "var(--text-dim)",
          display: "flex", alignItems: "center", gap: 6,
          animation: "fade-in 0.2s var(--ease-smooth) 0.08s both",
        }}>
          <Icon icon="mdi:lightning-bolt-outline" style={{ fontSize: 12 }} />
          {item.effects}
        </div>
      )}

      {/* Actions timeline */}
      {actions.length > 0 && (
        <div>
          <div style={{
            padding: "6px 14px",
            fontSize: "var(--font-xs)", color: "var(--text-muted)",
            letterSpacing: "0.06em",
            borderBottom: "1px solid var(--border-subtle)",
          }}>
            {t("actions_label", actions.length)}
          </div>

          {actions.map((action, i) => (
            <ActionRow key={i} action={action} index={i} data={data} />
          ))}
        </div>
      )}
    </div>
  );
}
