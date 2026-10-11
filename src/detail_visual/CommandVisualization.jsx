import { useState } from "react";
import { Icon } from "@iconify/react";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import { useI18n } from "../i18n.jsx";
import { navigateTo } from "../hashRouter.js";
import VizFrame from "./VizFrame";

/* Four tiers, not two: reading the whole script layer turned up `player` and
 * `supporter` alongside the admin/moderator pair the two-file extractor knew. */
const PERM_COLORS = {
  admin: { text: "var(--danger)" },
  moderator: { text: "var(--accent)" },
  supporter: { text: "var(--amber)" },
  player: { text: "var(--info)" },
};
const PERM_ICON = {
  admin: "mdi:shield-crown-outline",
  moderator: "mdi:shield-edit-outline",
  supporter: "mdi:shield-star-outline",
  player: "mdi:account-outline",
};

/* One icon per action verb, so a 5-step command can be skimmed by shape. */
const ACTION_ICON = {
  spawn: "mdi:plus-circle-outline",
  destroy_vehicles: "mdi:car-off",
  emoticon: "mdi:emoticon-outline",
  animate: "mdi:animation-play-outline",
  send_xml: "mdi:xml",
  send_xml_class: "mdi:xml",
  send_xml_element: "mdi:xml",
  chat_reply: "mdi:message-reply-outline",
  kick_player: "mdi:account-remove-outline",
  lookup_player_sid: "mdi:account-search-outline",
  fill_inventory: "mdi:package-variant-plus",
};

/* What an action says, in the order that reads best. `key` and `class` are the
 * last resort because they are identifiers, not prose. */
function actionText(action) {
  return action.message || action.xml || action.animation || action.class ||
    action.key || action.variable || "";
}

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
        animation: `fade-in 0.2s var(--ease-out) ${0.04 + index * 0.03}s both`,
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
          <Icon icon={ACTION_ICON[action.type] || "mdi:plus-circle-outline"} style={{ fontSize: 10 }} />
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
        <Icon icon={ACTION_ICON[action.type] || "mdi:code-tags"} style={{ fontSize: 10 }} />
        {action.type}
      </span>

      {action.target && (
        <span style={{
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          fontFamily: "var(--font-mono)", flexShrink: 0,
        }}>
          → {action.target}
        </span>
      )}

      <span style={{
        fontSize: "var(--font-xs)", color: "var(--text-secondary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        fontFamily: "var(--font-mono)",
      }}>
        {actionText(action)}
      </span>
    </div>
  );
}

export default function CommandVisualization({ item }) {
  const { data } = useData();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  if (!item || item.type !== "command_config") return null;

  const actions = item.actions || [];
  const permColor = PERM_COLORS[item.permission] || PERM_COLORS.admin;
  const permLabel =
    item.permission === "admin" ? t("perm_admin") :
    item.permission === "moderator" ? t("perm_moderator") :
    item.permission === "player" ? t("perm_player") :
    item.permission === "supporter" ? t("perm_supporter") :
    item.permission;

  /* The command's own .as file is one of the new `as_module` records, so the
   * provenance line is a link into the script layer rather than dead text. */
  const scriptKey = item.source && data?.as_module?.[item.source] ? item.source : null;

  /* One-click copy of the in-game command, so a player can paste it straight
   * into chat. Falls back to a temporary textarea where the async clipboard
   * API is unavailable (insecure origin). */
  const copyCommand = () => {
    const text = `/${item.command}`;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1200); };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {});
      return;
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch { /* clipboard unavailable — no-op */ }
  };

  return (
    <VizFrame
      icon="mdi:terminal"
      title={`/${item.command}`}
      lead={item.description || t("viz_lead_command")}
      actions={
        <>
          <span style={{
            fontSize: "var(--font-xxs)", fontWeight: 600,
            padding: "2px 8px",
            border: `1px solid ${permColor.text}`,
            color: permColor.text,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            <Icon icon={PERM_ICON[item.permission] || "mdi:shield-key"} style={{ fontSize: 10, marginRight: 3 }} />
            {permLabel}
          </span>
          <button
            onClick={copyCommand}
            aria-label={t("share_copy")}
            title={t("share_copy")}
            style={{
              cursor: "pointer",
              padding: "2px 8px",
              border: `1px solid ${copied ? "var(--success)" : "var(--border-subtle)"}`,
              background: "transparent",
              color: copied ? "var(--success)" : "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-xxs)",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}
          >
            <Icon icon={copied ? "mdi:check" : "mdi:content-copy"} style={{ fontSize: 11 }} />
            {copied ? t("share_copied") : t("share_copy")}
          </button>
        </>
      }
    >
      {item.effects && (
        <div style={{
          marginTop: 8,
          fontSize: "var(--font-xs)", color: "var(--text-muted)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Icon icon="mdi:lightning-bolt-outline" style={{ fontSize: 12 }} />
          {item.effects}
        </div>
      )}

      {item.source && (
        <div style={{
          marginTop: 8, fontSize: "var(--font-xs)", color: "var(--text-muted)",
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        }}>
          <Icon icon="mdi:file-code-outline" style={{ fontSize: 12 }} />
          {t("command_source")}
          {scriptKey ? (
            <a
              href={`/params/as_module/${scriptKey}`}
              onClick={(e) => { e.preventDefault(); navigateTo(`/params/as_module/${scriptKey}`); }}
              style={{
                fontFamily: "var(--font-mono)", color: "var(--accent)",
                textDecoration: "underline", textDecorationStyle: "dotted",
                textUnderlineOffset: 2,
              }}
            >
              {item.source}
            </a>
          ) : (
            <code style={{ fontFamily: "var(--font-mono)" }}>{item.source}</code>
          )}
        </div>
      )}

      {actions.length > 0 ? (
        <div>
          <div className="viz-block-title" style={{ marginTop: 12 }}>
            <Icon icon="mdi:format-list-numbered" style={{ fontSize: 12, marginRight: 5, verticalAlign: "-1px" }} />
            {t("actions_label", actions.length)}
          </div>
          {actions.map((action, i) => (
            <ActionRow key={i} action={action} index={i} data={data} />
          ))}
        </div>
      ) : (
        /* 24 of the 232 commands only got a name and a permission: their handler
         * calls a script function the extractor does not model yet. Say so
         * rather than render an empty section. */
        <p className="viz-lead" style={{ marginTop: 12 }}>{t("no_actions")}</p>
      )}
    </VizFrame>
  );
}
