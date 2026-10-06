import React, { useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import html2canvas from "html2canvas";
import { useT } from "./i18n.jsx";
import { useShare } from "./ShareContext.jsx";

/* ── Section tree ── */

function SectionTree({ sections, selected, onToggle, depth }) {
  return (
    <div style={{ paddingLeft: depth * 14 }}>
      {sections.map(s => {
        const isSel = selected.has(s.id);
        const hasChildren = s.children && s.children.length > 0;
        return (
          <div key={s.id}>
            <div
              onClick={() => onToggle(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "3px 0", cursor: "pointer",
                userSelect: "none",
                opacity: isSel ? 1 : 0.55,
                transition: "opacity var(--dur-fast) var(--ease-smooth)",
              }}
            >
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 14, height: 14,
                border: `2px solid ${isSel ? "var(--accent)" : "var(--border-mid)"}`,
                background: isSel ? "var(--accent)" : "transparent",
                fontSize: 8, fontWeight: 800, color: "#000",
                flexShrink: 0,
              }}>
                {isSel ? "✓" : ""}
              </span>
              {s.icon && (
                <Icon icon={s.icon} style={{ fontSize: 12, color: "var(--accent)", flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: "var(--font-xs)", fontWeight: 600,
                color: "var(--text-primary)", textTransform: "uppercase",
                fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
              }}>
                {s.label}
              </span>
            </div>
            {hasChildren && (
              <SectionTree
                sections={s.children}
                selected={selected}
                onToggle={onToggle}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Collect all leaf section IDs from the tree ── */

function collectLeafIds(sections, selected) {
  const ids = [];
  const walk = (list) => {
    list.forEach(s => {
      if (!selected.has(s.id)) return;
      if (s.children && s.children.length > 0) {
        walk(s.children);
      } else {
        ids.push(s.id);
      }
    });
  };
  walk(sections);
  return ids;
}

/* ── Main modal ── */

export default function ShareModal({ onClose }) {
  const t = useT();
  const { sections } = useShare();

  const [selected, setSelected] = useState(() => {
    const all = new Set();
    const walk = (list) => {
      list.forEach(s => { all.add(s.id); if (s.children) walk(s.children); });
    };
    walk(sections);
    return all;
  });
  const [captured, setCaptured] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setCaptured(null);
  };

  const selectAll = () => {
    const all = new Set();
    const walk = (list) => list.forEach(s => { all.add(s.id); if (s.children) walk(s.children); });
    walk(sections);
    setSelected(all);
    setCaptured(null);
  };

  const deselectAll = () => { setSelected(new Set()); setCaptured(null); };

  const allSelected = (() => {
    let total = 0;
    const walk = (list) => list.forEach(s => { total++; if (s.children) walk(s.children); });
    walk(sections);
    return selected.size >= total;
  })();

  const handleCapture = useCallback(async () => {
    const leafIds = collectLeafIds(sections, selected);
    if (leafIds.length === 0) return;

    setCapturing(true);
    setCopied(false);

    try {
      const parts = [];

      for (const id of leafIds) {
        const el = document.querySelector(`[data-share-id="${id}"]`);
        if (!el) continue;
        try {
          const canvas = await html2canvas(el, {
            useCORS: true,
            backgroundColor: "#080c12",
            scale: 2,
            logging: false,
            width: el.scrollWidth,
            height: el.scrollHeight,
            onclone: (doc) => {
              // html2canvas < 1.5 can't parse modern CSS color() function.
              // Override computed color-related properties to use hex values.
              const fix = doc.createElement("style");
              fix.textContent = `
                * {
                  --accent-glow: var(--tint-warn) !important;
                  --glow-accent: 0 0 12px var(--tint-warn) !important;
                  --glow-success: 0 0 8px var(--tint-ok) !important;
                  --dot-color: var(--tint-warn) !important;
                }
              `;
              doc.head.appendChild(fix);
            },
          });
          parts.push(canvas.toDataURL("image/png"));
        } catch (e) {
          console.warn(`ShareModal: skipping "${id}" — capture failed:`, e.message);
        }
      }

      if (parts.length === 0) {
        setCapturing(false);
        return;
      }

      // Combine multiple images into one canvas
      if (parts.length === 1) {
        setCaptured(parts[0]);
      } else {
        const imgs = await Promise.all(parts.map(src => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        }));

        const gap = 8;
        const maxW = Math.max(...imgs.map(img => img.width));
        const totalH = imgs.reduce((sum, img) => sum + img.height + gap, 0) - gap;

        const combined = document.createElement("canvas");
        combined.width = maxW;
        combined.height = totalH;
        const ctx = combined.getContext("2d");

        ctx.fillStyle = "#080c12";
        ctx.fillRect(0, 0, maxW, totalH);

        let y = 0;
        for (const img of imgs) {
          const x = Math.round((maxW - img.width) / 2);
          ctx.drawImage(img, x, y);
          y += img.height + gap;
        }

        setCaptured(combined.toDataURL("image/png"));
      }
    } catch (err) {
      console.warn("Capture failed:", err);
    }

    setCapturing(false);
  }, [sections, selected]);

  const handleCopy = async () => {
    if (!captured) return;
    try {
      const blob = await (await fetch(captured)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: download */ }
  };

  const handleDownload = () => {
    if (!captured) return;
    const a = document.createElement("a");
    a.href = captured;
    a.download = "share.png";
    a.click();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-deep)",
        fontFamily: "var(--font-mono)",
        animation: "fade-in 0.2s var(--ease-smooth) both",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          width: "min(90vw, 520px)",
          maxHeight: "min(90vh, 640px)",
          display: "flex", flexDirection: "column",
          boxShadow: "none",
          animation: "scale-in 0.25s var(--ease-smooth) both",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          <Icon icon="mdi:share-variant" style={{ fontSize: "var(--font-md)", color: "var(--accent)" }} />
          <span style={{
            fontSize: "var(--font-base)", fontWeight: 700,
            color: "var(--accent)", textTransform: "uppercase",
            letterSpacing: "0.08em", fontFamily: "var(--font-display)", flex: 1,
          }}>
            {t("share_title")}
          </span>
          <span
            onClick={onClose}
            style={{ cursor: "pointer", color: "var(--text-dim)", fontSize: "var(--font-md)", lineHeight: 1, padding: "0 4px" }}
          >
            ✕
          </span>
        </div>

        {/* ── Section tree ── */}
        <div style={{
          flex: 1, overflow: "auto",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          {sections.length === 0 ? (
            <div style={{ fontSize: "var(--font-xs)", color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>
              {t("share_no_sections")}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span
                  onClick={selectAll}
                  style={{
                    fontSize: "var(--font-xxs)", fontWeight: 700, cursor: "pointer",
                    color: allSelected ? "var(--text-dim)" : "var(--accent)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    transition: "color var(--dur-fast) var(--ease-smooth)",
                  }}
                >
                  <Icon icon="mdi:checkbox-marked" style={{ fontSize: 10, marginRight: 3, verticalAlign: "middle" }} />
                  {t("share_select_all")}
                </span>
                <span
                  onClick={deselectAll}
                  style={{
                    fontSize: "var(--font-xxs)", fontWeight: 700, cursor: "pointer",
                    color: selected.size === 0 ? "var(--text-dim)" : "var(--accent)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    transition: "color var(--dur-fast) var(--ease-smooth)",
                  }}
                >
                  <Icon icon="mdi:checkbox-blank-outline" style={{ fontSize: 10, marginRight: 3, verticalAlign: "middle" }} />
                  {t("share_deselect_all")}
                </span>
              </div>
              <SectionTree sections={sections} selected={selected} onToggle={toggle} depth={0} />
            </>
          )}
        </div>

        {/* ── Captured preview ── */}
        {captured && (
          <div style={{
            borderBottom: "1px solid var(--border-subtle)",
            padding: "8px 16px", maxHeight: 200, overflow: "auto",
            background: "var(--bg-deep)",
            display: "flex", justifyContent: "center",
          }}>
            <img src={captured} alt="captured" style={{
              maxWidth: "100%", maxHeight: 180,
              objectFit: "contain",
              border: "1px solid var(--border-subtle)",
            }} />
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{
          display: "flex", gap: 8, justifyContent: "flex-end",
          padding: "10px 16px",
        }}>
          {captured && (
            <>
              <span
                onClick={handleCopy}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "5px 14px", cursor: "pointer",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "var(--font-xxs)", fontWeight: 700,
                  color: copied ? "var(--success)" : "var(--accent)",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  fontFamily: "var(--font-mono)",
                  transition: "color var(--dur-fast) var(--ease-smooth)",
                }}
              >
                <Icon icon={copied ? "mdi:check" : "mdi:content-copy"} style={{ fontSize: 11 }} />
                {copied ? t("share_copied") : t("share_copy")}
              </span>
              <span
                onClick={handleDownload}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "5px 14px", cursor: "pointer",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "var(--font-xxs)", fontWeight: 700,
                  color: "var(--accent)", textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontFamily: "var(--font-mono)",
                  transition: "color var(--dur-fast) var(--ease-smooth)",
                }}
              >
                <Icon icon="mdi:download" style={{ fontSize: 11 }} />
                {t("share_download")}
              </span>
            </>
          )}
          <span
            onClick={handleCapture}
            disabled={capturing}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "5px 14px", cursor: capturing ? "wait" : "pointer",
              border: "1px solid var(--accent)",
              fontSize: "var(--font-xxs)", fontWeight: 700,
              color: "var(--accent)", textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: "var(--font-mono)",
              opacity: capturing ? 0.6 : 1,
              transition: "background var(--dur-fast) var(--ease-smooth), color var(--dur-fast) var(--ease-smooth)",
            }}
            onMouseEnter={e => { if (!capturing) { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#000"; }}}
            onMouseLeave={e => { if (!capturing) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}}
          >
            <Icon icon={capturing ? "mdi:loading" : "mdi:camera"} style={{ fontSize: 11, animation: capturing ? "boot-spin 0.8s linear infinite" : "none" }} />
            {capturing ? t("share_capturing") : t("share_capture")}
          </span>
        </div>
      </div>
    </div>
  );
}
