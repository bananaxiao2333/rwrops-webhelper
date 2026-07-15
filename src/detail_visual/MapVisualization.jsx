import { useState } from "react";
import { useAsset } from "../assetLoader.jsx";
import { useData } from "../DataContext.jsx";
import { useI18n } from "../i18n.jsx";

/* ── Resolve a file reference to an item's display info ── */
function resolveRef(entry, data) {
  const raw = entry.file || entry.key || "";
  const ref = raw.replace(/\.\w+$/, "");
  const parts = ref.split(".");
  const type = parts.length > 1 ? parts[parts.length - 1] : null;
  const itemKey = raw;

  let itemData = null;
  if (type && data?.[type]) {
    // Try exact key match first
    itemData = data[type][itemKey] || null;
    // If the key includes the type suffix, also try stripping it
    if (!itemData) {
      for (const [k, v] of Object.entries(data[type])) {
        if (k === itemKey || k === ref || k.startsWith(ref + ".")) {
          itemData = v;
          break;
        }
      }
    }
  }

  return { ref, type, itemKey, itemData };
}

/* ── Item list section for a map ── */
function MapItemList({ items, label, icon, data }) {
  const [open, setOpen] = useState(false);
  const { translate } = useI18n();
  if (!items || items.length === 0) return null;

  // Filter out shared XML includes, keep specific item references
  const specific = items
    .map((entry) => ({ entry, resolved: resolveRef(entry, data) }))
    .filter(({ resolved }) => resolved.type && !resolved.ref.startsWith("all_"));

  if (specific.length === 0) return null;

  return (
    <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "7px 14px",
          fontSize: "var(--font-sm)",
          fontWeight: 700,
          color: open ? "var(--accent)" : "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "color 0.15s ease",
        }}
      >
        <span>{open ? "▼" : "▶"}</span>
        {icon && <span style={{ fontSize: "var(--font-base)" }}>{icon}</span>}
        <span>{label}</span>
        <span style={{ color: "var(--text-dim)", fontSize: 9 }}>({specific.length})</span>
      </div>
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            padding: "0 10px 8px 14px",
            fontFamily: "var(--font-mono)",
          }}
        >
          {specific.map(({ resolved }, i) => {
            const name = resolved.itemData
              ? translate(resolved.itemData.name || "") || resolved.itemData.key || resolved.ref
              : resolved.ref;
            return (
              <a
                key={i}
                href={`#/params/${resolved.type}/${resolved.itemKey}`}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.hash = `#/params/${resolved.type}/${resolved.itemKey}`;
                }}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  padding: "5px 8px",
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "var(--text-primary)",
                  borderLeft: "1px solid var(--border-subtle)",
                  transition: "border-color 0.12s ease, background 0.12s ease",
                  fontSize: "var(--font-sm)",
                  animation: `fade-in 0.2s ease ${i * 0.03}s both`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderLeftColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--bg-base)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderLeftColor = "var(--border-subtle)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>
                  {name}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: 8, flexShrink: 0 }}>
                  {resolved.ref}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Opacity slider ── */
function OpacitySlider({ value, onChange, label }) {
  const pct = Math.round(value * 100);
  const active = pct > 0;
  const color = "var(--accent)";
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        color: active ? color : "var(--text-dim)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--font-base)",
        letterSpacing: "0.06em",
        transition: "color 0.15s ease",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 64,
          height: 14,
          borderRadius: 6,
          background: "var(--bg-deep)",
          border: "1px solid var(--border-subtle)",
          flexShrink: 0,
          transition: "border-color 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${pct}%`,
            borderRadius: 6,
            background: active
              ? `linear-gradient(to right, ${color}33, ${color})`
              : "transparent",
            transition: "width 0.08s ease",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: active ? color : "var(--text-muted)",
            boxShadow: active ? `0 0 6px ${color}88` : "none",
            transition: "left 0.08s ease, background 0.15s ease, box-shadow 0.15s ease",
            pointerEvents: "none",
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => onChange(e.target.value / 100)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            margin: 0,
          }}
        />
      </div>
      <span style={{ minWidth: 28 }}>{label}</span>
      <span style={{ color: "var(--text-muted)", minWidth: 20 }}>{pct}%</span>
    </label>
  );
}

/* ── Stacked overlay view ── */
function StackedMapView({ mapEntry }) {
  const { t } = useI18n();
  const baseMapUrl = useAsset(mapEntry?.hud_icon_filename);
  const heightUrl = useAsset(mapEntry?.heightmap);
  const maskUrl = useAsset(mapEntry?.mask_image);
  const objectsUrl = useAsset(mapEntry?.objects_svg);

  const [opacities, setOpacities] = useState({ map: 1.0, height: 0.4, mask: 0.4, objects: 0.6 });
  const setOpacity = (key, val) => setOpacities((p) => ({ ...p, [key]: val }));

  const layers = [];
  if (baseMapUrl) layers.push({ key: "map", label: t("map_label"), url: baseMapUrl });
  if (heightUrl) layers.push({ key: "height", label: t("height_label"), url: heightUrl });
  if (maskUrl) layers.push({ key: "mask", label: t("mask"), url: maskUrl });
  if (objectsUrl) layers.push({ key: "objects", label: t("objects_svg"), url: objectsUrl });

  if (layers.length === 0) return null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "8px 10px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-base)",
        }}
      >
        {layers.map((layer, i) => (
          <div key={layer.key} style={{ animation: `fade-in 0.25s ease ${0.08 * i}s both` }}>
            <OpacitySlider
              label={layer.label}
              value={opacities[layer.key]}
              onChange={(v) => setOpacity(layer.key, v)}
            />
          </div>
        ))}
        <div style={{ flex: 1, minWidth: 0 }} />
        <span
          style={{
            fontSize: "var(--font-sm)",
            color: "var(--text-dim)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            alignSelf: "center",
          }}
        >
          [OVERLAY]
        </span>
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          overflow: "hidden",
          background: "var(--bg-void)",
        }}
      >
        {layers.map((layer) => (
          <img
            key={layer.key}
            src={layer.url}
            alt={layer.label}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              imageRendering: "pixelated",
              opacity: opacities[layer.key],
              transition: "opacity 0.15s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Map visualization ── */
export default function MapVisualization({ item }) {
  // Only render if item has map-specific fields
  const isMap =
    item &&
    ("frame_image" in item || "heightmap" in item || "mask_image" in item);

  if (!isMap) return null;

  const { data } = useData();
  const displayLabel = (item.key || "").replace(/_/g, ".").toUpperCase() || "MAP";
  const baseMapUrl = useAsset(item?.hud_icon_filename);
  const heightUrl = useAsset(item?.heightmap);
  const maskUrl = useAsset(item?.mask_image);
  const frameUrl = useAsset(item?.frame_image);

  const hasStacked = baseMapUrl || heightUrl || maskUrl;
  const hasFrame = !!frameUrl;

  const [splitOpen, setSplitOpen] = useState(false);

  const { t } = useI18n();
  const categories = [
    { key: "vehicles", label: t("vehicles"), icon: "⛟", items: item.vehicles },
    { key: "weapons", label: t("weapons"), icon: "⚔", items: item.weapons },
    { key: "projectiles", label: t("projectiles_label"), icon: "⌲", items: item.projectiles },
    { key: "calls", label: t("calls_label"), icon: "⌕", items: item.calls },
    { key: "carry_items", label: t("carry_items"), icon: "▣", items: item.carry_items },
  ];

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        fontFamily: "var(--font-mono)",
        animation: "fade-in 0.35s ease both",
        transition: "border-color 0.2s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "var(--font-md)",
          fontWeight: 700,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          background: "var(--bg-base)",
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 8px var(--accent)",
            animation: "breathe 2.5s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        <span>MAP · {displayLabel}</span>
      </div>

      {/* Stacked layers */}
      {hasStacked && <StackedMapView mapEntry={item} />}

      {/* Frame (collapsible) */}
      {hasFrame && (
        <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div
            onClick={() => setSplitOpen((o) => !o)}
            style={{
              padding: "8px 14px",
              fontSize: "var(--font-base)",
              fontWeight: 700,
              color: splitOpen ? "var(--accent)" : "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "color 0.15s ease, background 0.15s ease",
              background: splitOpen ? "var(--bg-base)" : "transparent",
            }}
            onMouseEnter={(e) => { if (!splitOpen) e.currentTarget.style.background = "var(--bg-base)"; }}
            onMouseLeave={(e) => { if (!splitOpen) e.currentTarget.style.background = "transparent"; }}
          >
            <span>{splitOpen ? "▼" : "▶"}</span>
            <span>{t("frame")}</span>
          </div>
          {splitOpen && (
            <div style={{ padding: "0 10px 10px" }}>
              <img
                src={frameUrl}
                alt={t("frame")}
                style={{
                  width: "100%",
                  height: "auto",
                  border: "1px solid var(--border-mid)",
                  imageRendering: "pixelated",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Item lists */}
      {categories.map((cat) => (
        <MapItemList key={cat.key} items={cat.items} label={cat.label} icon={cat.icon} data={data} />
      ))}
    </div>
  );
}
