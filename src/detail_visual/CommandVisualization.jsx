import { Icon } from "@iconify/react";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import { useI18n } from "../i18n.jsx";

const PERM_COLORS = {
  moderator: { accent: "var(--accent-dim)", text: "var(--accent)" },
  admin: { accent: "var(--danger)", text: "var(--danger)" },
};

function ActionRow({ action, index, data }) {
  const { translate } = useI18n();
  const fullKey = action.key || "";
  const type = action.class || "";
  const item = data?.[type]?.[fullKey];
  const iconUrl = useItemIcon(item || { hud_icon_filename: null });

  if (action.type === "spawn") {
    const fallbackIcon =
      type === "weapon" ? "mdi:sword" :
      type === "carry_item" ? "mdi:package-variant-closed" :
      type === "projectile" ? "mdi:missile" :
      type === "vehicle" ? "mdi:truck" :
      "mdi:help-circle-outline";

    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 14px",
        borderTop: index > 0 ? "1px solid var(--border-subtle)" : "none",
        background: index % 2 ? "var(--bg-base)" : "transparent",
        animation: `fade-in 0.2s var(--ease-smooth) ${0.04 + index * 0.03}s both`,
        transition: "background var(--dur-fast) var(--ease-smooth)",
      }}>
        <span style={{
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          fontFamily: "var(--font-mono)", minWidth: 22, fontWeight: 700,
        }}>
          #{index + 1}
        </span>

        <span style={{
          fontSize: "var(--font-xxs)", fontWeight: 700,
          padding: "2px 7px",
          border: "1px solid var(--success)",
          color: "var(--success)",
          textTransform: "uppercase", letterSpacing: "0.06em",
          display: "inline-flex", alignItems: "center", gap: 3,
          flexShrink: 0,
        }}>
          <Icon icon="mdi:plus-circle-outline" style={{ fontSize: 10 }} />
          {action.type}
        </span>

        <div style={{
          width: 24, height: 24, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-deep)",
        }}>
          {iconUrl ? (
            <img src={iconUrl} alt="" style={{ width: 18, height: 18, objectFit: "contain", imageRendering: "pixelated" }} />
          ) : (
            <Icon icon={fallbackIcon} style={{ fontSize: 14, color: "var(--text-muted)" }} />
          )}
        </div>

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
            transition: "color var(--dur-fast) var(--ease-smooth)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--amber)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
          title={fullKey}
        >
          {translate(item?.name) || fullKey}
        </a>

        <span style={{
          fontSize: "var(--font-xxs)", color: "var(--text-muted)",
          padding: "1px 6px", border: "1px solid var(--border-subtle)",
          flexShrink: 0, marginLeft: "auto", fontFamily: "var(--font-mono)",
        }}>
          {type}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 14px",
      borderTop: index > 0 ? "1px solid var(--border-subtle)" : "none",
      background: index % 2 ? "var(--bg-base)" : "transparent",
      animation: `fade-in 0.2s var(--ease-smooth) ${0.04 + index * 0.03}s both`,
      transition: "background var(--dur-fast) var(--ease-smooth)",
    }}>
      <span style={{
        fontSize: "var(--font-xxs)", color: "var(--text-dim)",
        fontFamily: "var(--font-mono)", minWidth: 22, fontWeight: 700,
      }}>
        #{index + 1}
      </span>

      <span style={{
        fontSize: "var(--font-xs)", fontWeight: 700,
        padding: "2px 7px",
        border: "1px solid var(--border-mid)",
        color: "var(--text-muted)",
        textTransform: "uppercase", flexShrink: 0,
        display: "inline-flex", alignItems: "center", gap: 3,
      }}>
        <Icon icon="mdi:code-tags" style={{ fontSize: 10 }} />
        {action.type}
      </span>

      <span style={{
        fontSize: "var(--font-xs)", color: "var(--text-secondary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        fontFamily: "var(--font-mono)",
      }}>
        {action.message || action.xml || action.variable || action.text || action.detail || ""}
      </span>
    </div>
  );
}

export default function CommandVisualization({ item }) {
  const { data } = useData();
  const { t } = useI18n();
  if (!item || item.type !== "command_config") return null;

  const actions = item.actions || [];
  const permColor = PERM_COLORS[item.permission] || PERM_COLORS.admin;

  return (
    <div style={{ border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", fontFamily: "var(--font-mono)" }}>
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${permColor.accent}`,
        fontSize: "var(--font-base)", fontWeight: 700, color: "var(--accent)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 8,
        fontFamily: "var(--font-display)",
      }}>
        <Icon icon="mdi:terminal" style={{ fontSize: "var(--font-md)" }} />
        <span style={{ fontFamily: "var(--font-mono)" }}>/{item.command}</span>
        <span style={{
          marginLeft: "auto",
          fontSize: "var(--font-xxs)", fontWeight: 600,
          padding: "2px 8px",
          border: `1px solid ${permColor.text}`,
          color: permColor.text,
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          <Icon icon={item.permission === "moderator" ? "mdi:shield-edit-outline" : "mdi:shield-key"}
            style={{ fontSize: 10, marginRight: 3 }} />
          {item.permission}
        </span>
      </div>

      {item.description && (
        <div style={{
          padding: "8px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: "var(--font-sm)", color: "var(--text-secondary)",
          fontFamily: "var(--font-text)", lineHeight: 1.5,
          fontStyle: "italic",
          animation: "fade-in 0.25s var(--ease-smooth) 0.06s both",
        }}>
          {item.description}
        </div>
      )}

      {item.effects && (
        <div style={{
          padding: "6px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          display: "flex", alignItems: "center", gap: 6,
          animation: "fade-in 0.2s var(--ease-smooth) 0.08s both",
        }}>
          <Icon icon="mdi:lightning-bolt-outline" style={{ fontSize: 12 }} />
          {item.effects}
        </div>
      )}

      {actions.length > 0 && (
        <div>
          <div style={{
            padding: "6px 14px",
            fontSize: "var(--font-xs)", color: "var(--text-muted)",
            letterSpacing: "0.06em",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Icon icon="mdi:format-list-numbered" style={{ fontSize: 11 }} />
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
