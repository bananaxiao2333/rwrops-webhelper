/* ───────────────────────────────────────────────────
 *  StallGenerator.jsx — RWR Item Stall / WTS Generator
 *  · Grid layout, drag-reorder, edit modal
 *  · PNG export (html2canvas), JSON export
 *  · Collapsible preview settings & responsive mobile layout
 * ─────────────────────────────────────────────────── */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useLocalStorage } from "@reactuses/core";
import { Icon } from "@iconify/react";
import html2canvas from "html2canvas";
import { useData } from "../DataContext.jsx";
import { useI18n } from "../i18n.jsx";
import { useItemIcon } from "../assetLoader.jsx";

/* ── Constants ── */
const DEFAULT_TYPES = new Set(["carry_item", "weapon", "projectile"]);
const TYPE_COLORS = { weapon: "#f59e0b", carry_item: "#8899aa", projectile: "#ef4444" };
function makeKey(type, id) { return `${type}::${id}`; }
function fmtPrice(n, short) {
  const v = Math.round(n);
  if (!short) return String(v);
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(v);
}

/* ── Mobile hook ── */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => { const h = () => setM(window.innerWidth < bp); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [bp]);
  return m;
}

/* ── Item thumbnail ── */
function ItemThumb({ item, size = 48 }) {
  const iconUrl = useItemIcon(item);
  if (!iconUrl) return <div style={{ width: size, height: size, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: size * 0.35, opacity: 0.3 }}>?</div>;
  return <img crossOrigin="anonymous" src={iconUrl} alt="" style={{ width: size, height: size, flexShrink: 0, objectFit: "contain", imageRendering: "pixelated" }} />;
}

/* ═══════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════ */
export default function StallGenerator() {
  const { data } = useData();
  const { translate, t } = useI18n();
  const isMobile = useIsMobile();

  /* ── Stall data (persisted via useLocalStorage) ── */
  const STORAGE_KEY = "rwrops_stall_v2";
  const DEFAULT_PC = { textSize: 14, fgColor: "#e8edf3", bgColor: "transparent", forceWidth: 0, titleAlign: "left", subtitleAlign: "left", showTitle: true, showSubtitle: true, showKey: false, showPrice: true, showDiscount: true, showQuantity: true, shortPrice: false, boldPrice: false, focusPrice: false };

  const [saved, setSaved] = useLocalStorage(STORAGE_KEY, { title: "", subtitle: "", rawItems: [], pc: DEFAULT_PC });

  const title = saved.title;
  const subtitle = saved.subtitle;
  const pc = saved.pc;

  const setTitle = useCallback((v) => setSaved(p => ({ ...p, title: typeof v === "function" ? v(p.title) : v })), [setSaved]);
  const setSubtitle = useCallback((v) => setSaved(p => ({ ...p, subtitle: typeof v === "function" ? v(p.subtitle) : v })), [setSaved]);
  const setPc = useCallback((v) => setSaved(p => ({ ...p, pc: typeof v === "function" ? v(p.pc) : v })), [setSaved]);
  const updPc = useCallback((patch) => setPc(p => ({ ...p, ...patch })), [setPc]);

  /* ── Search ── */
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const searchRef = useRef(null);

  /* ── Edit modal ── */
  const [editing, setEditing] = useState(null);
  /* ── Settings ── */
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [exportMsg, setExportMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const importRef = useRef(null);

  /* ── Drag ── */
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  /* ── Search pool ── */
  const searchPool = useMemo(() => {
    if (!data) return [];
    const r = [];
    for (const t of DEFAULT_TYPES) {
      const b = data[t]; if (!b) continue;
      for (const [id, item] of Object.entries(b))
        r.push({ key: makeKey(t, id), type: t, id, item, name: item.name ? translate(String(item.name)) : id });
    }
    return r;
  }, [data, translate]);

  /* ── Reconstruct item from search pool ── */
  const fixItems = useCallback((raw) => raw.map(si => {
    if (si.item) return si;
    const entry = searchPool.find(r => r.key === si.key);
    return { ...si, item: entry?.item || null, name: si.name || entry?.name || si.id };
  }), [searchPool]);

  // Derived: items with item field reconstructed
  const items = useMemo(() => fixItems(saved.rawItems), [saved.rawItems, fixItems]);

  // strip item field before saving
  const setItems = useCallback((fn) => setSaved(p => {
    const next = typeof fn === "function" ? fn(fixItems(p.rawItems)) : fn;
    return { ...p, rawItems: next.map(si => ({ key: si.key, type: si.type, id: si.id, name: si.name, quantity: si.quantity, price: si.price, discount: si.discount })) };
  }), [setSaved, fixItems]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return searchPool.filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)).slice(0, 20);
  }, [query, searchPool]);
  useEffect(() => { setSelectedIdx(-1); }, [searchResults.length]);

  /* ── Add ── */
  const addItem = useCallback((r) => {
    if (items.some(si => si.key === r.key)) { setQuery(""); setShowDropdown(false); return; }
    setItems(p => [...p, { key: r.key, type: r.type, id: r.id, item: r.item, name: r.name, quantity: 1, price: r.item?.inventory_price ?? 0, discount: 0 }]);
    setQuery(""); setShowDropdown(false);
  }, [items]);
  const removeItem = useCallback((idx) => { setItems(p => p.filter((_, i) => i !== idx)); setEditing(null); }, []);
  const updateItem = useCallback((idx, patch) => { setItems(p => { const n = [...p]; n[idx] = { ...n[idx], ...patch }; return n; }); }, []);

  /* ── Drag ── */
  const hDragStart = useCallback((e, i) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; }, []);
  const hDragOver = useCallback((e, i) => { e.preventDefault(); setDragOverIdx(i); }, []);
  const hDragLeave = useCallback(() => setDragOverIdx(null), []);
  const hDrop = useCallback((e, to) => {
    e.preventDefault();
    if (dragIdx == null || dragIdx === to) { setDragIdx(null); setDragOverIdx(null); return; }
    setItems(p => {
      const n = [...p];
      const [m] = n.splice(dragIdx, 1);
      n.splice(to, 0, m);
      return n;
    });
    setDragIdx(null); setDragOverIdx(null);
  }, [dragIdx]);

  /* ── PNG ── */
  const pngRef = useRef(null);
  const exportPNG = useCallback(async () => {
    if (!pngRef.current) return;
    try {
      setExportMsg(t("tools_stall_exporting"));
      const el = pngRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: pc.bgColor === "transparent" ? null : pc.bgColor,
        scale: 2, useCORS: true,
        width: el.scrollWidth, height: el.scrollHeight,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll("input.preview-title, input.preview-subtitle").forEach(inp => {
            const div = clonedDoc.createElement("div");
            div.textContent = inp.value || inp.placeholder || "";
            for (const s of inp.style) div.style[s] = inp.style[s];
            div.style.cssText = inp.style.cssText;
            inp.replaceWith(div);
          });
        },
      });
      canvas.toBlob(b => { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "rwrops-stall.png"; a.click(); URL.revokeObjectURL(u); setExportMsg(t("tools_stall_export_done")); setTimeout(() => setExportMsg(""), 2000); });
    } catch { setExportMsg(""); }
  }, [pc.bgColor, t]);

  /* ── JSON ── */
  const exportJSON = useCallback(() => {
    const p = { title, subtitle, items: items.map(si => ({ key: si.key, type: si.type, id: si.id, name: si.name, quantity: si.quantity, price: si.price, discount: si.discount })), previewCfg: pc };
    const b = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "rwrops-stall.json"; a.click();
    setExportMsg(t("tools_stall_export_done")); setTimeout(() => setExportMsg(""), 2000);
  }, [title, subtitle, items, pc, t]);

  /* ── JSON import ── */
  const importJSON = useCallback(() => { importRef.current?.click(); }, []);
  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        setSaved(p => ({
          title: d.title ?? p.title,
          subtitle: d.subtitle ?? p.subtitle,
          rawItems: Array.isArray(d.items) ? d.items.map(si => ({ key: si.key, type: si.type, id: si.id, name: si.name, quantity: si.quantity ?? 1, price: si.price ?? 0, discount: si.discount ?? 0 })) : p.rawItems,
          pc: d.previewCfg ? { ...p.pc, ...d.previewCfg } : p.pc,
        }));
        setExportMsg(t("tools_stall_import_done"));
        setTimeout(() => setExportMsg(""), 2000);
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [t]);

  /* ── Reset ── */
  const doReset = useCallback(() => {
    setSaved({ title: "", subtitle: "", rawItems: [], pc: DEFAULT_PC });
    setConfirmReset(false);
  }, [setSaved]);

  /* ── Text copy ── */
  const copyText = useCallback(() => {
    const lines = [];
    if (title.trim()) lines.push(title.trim());
    if (subtitle.trim()) lines.push(subtitle.trim());
    if (lines.length > 0) lines.push("");
    for (const si of items) {
      const disc = si.discount > 0 ? ` (-${si.discount}%)` : "";
      const fp = si.discount > 0 ? `  →  RP ${fmtPrice(Math.round(si.price * (1 - si.discount / 100)), pc.shortPrice)}` : "";
      const qty = si.quantity > 1 ? ` ×${si.quantity}` : "";
      lines.push(`• ${si.name}${qty}  RP ${fmtPrice(si.price, pc.shortPrice)}${disc}${fp}`);
    }
    lines.push("");
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setExportMsg(t("tools_stall_copy_text_done"));
      setTimeout(() => setExportMsg(""), 2000);
    }).catch(() => {});
  }, [items, title, subtitle, pc, t]);

  /* ── Clipboard image (PNG) ── */
  const copyPNG = useCallback(async () => {
    if (!pngRef.current) return;
    try {
      setExportMsg(t("tools_stall_exporting"));
      const el = pngRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: pc.bgColor === "transparent" ? null : pc.bgColor,
        scale: 2, useCORS: true,
        width: el.scrollWidth, height: el.scrollHeight,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll("input.preview-title, input.preview-subtitle").forEach(inp => {
            const div = clonedDoc.createElement("div");
            div.textContent = inp.value || inp.placeholder || "";
            for (const s of inp.style) div.style[s] = inp.style[s];
            div.style.cssText = inp.style.cssText;
            inp.replaceWith(div);
          });
        },
      });
      const dataUrl = canvas.toDataURL("image/png");
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setExportMsg(t("tools_stall_copy_clipboard_done"));
      } catch {
        const a = document.createElement("a"); a.href = dataUrl; a.download = "rwrops-stall.png"; a.click();
        setExportMsg(t("tools_stall_export_done"));
      }
      setTimeout(() => setExportMsg(""), 2000);
    } catch { setExportMsg(""); }
  }, [pc.bgColor, t]);

  /* ── Keyboard ── */
  const handleKeyDown = useCallback((e) => {
    if (!showDropdown || !searchResults.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(p => Math.min(p + 1, searchResults.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(p => Math.max(p - 1, 0)); }
    else if (e.key === "Enter" && selectedIdx >= 0) { e.preventDefault(); addItem(searchResults[selectedIdx]); }
    else if (e.key === "Escape") setShowDropdown(false);
  }, [showDropdown, searchResults, selectedIdx, addItem]);

  useEffect(() => { const h = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);

  /* ── Derived ── */
  const M = isMobile;
  const hasForce = pc.forceWidth > 0;
  const previewStyle = {
    background: pc.bgColor, color: pc.fgColor, fontSize: pc.textSize,
    maxWidth: hasForce ? pc.forceWidth : 720,
    width: hasForce ? pc.forceWidth : "100%", minWidth: M ? 0 : 360,
    fontFamily: "var(--font-mono)", padding: M ? "12px 8px" : "16px",
  };
  /* ── Responsive sizes ── */
  const toolbarPad = M ? "8px 10px" : "10px 20px";
  const toolbarGap = M ? 6 : 8;
  const inputH = M ? 44 : 34;
  const btnPad = M ? "6px 10px" : "3px 8px";
  const btnIcon = M ? 18 : 14;

  if (!data) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{t("initializing")}...</div>;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: "var(--font-mono)", background: "var(--bg-deep)", overflow: "hidden" }}>
      {/* ═══ TOOLBAR ═══ */}
      <div style={{ padding: toolbarPad, borderBottom: "1px solid var(--border-subtle)", flexShrink: 0, display: "flex", flexDirection: "column", gap: toolbarGap }}>
        {/* Row 1: Search bar */}
        <div ref={searchRef} style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border-mid)", background: "var(--bg-base)", padding: M ? "3px 10px" : "3px 8px", minHeight: inputH }}>
            <Icon icon="ph:magnifying-glass" width={M ? 16 : 14} height={M ? 16 : 14} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
            <input value={query} onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => { if (query.trim()) setShowDropdown(true); }} onKeyDown={handleKeyDown}
              placeholder={t("tools_stall_search_placeholder")}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: M ? "max(16px, var(--font-base))" : "var(--font-sm)", fontFamily: "var(--font-mono)", padding: "4px 6px", minWidth: 0, lineHeight: M ? 1.4 : undefined }} />
          </div>
          {showDropdown && query.trim() && (
            <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 40, maxHeight: M ? 340 : 280, overflowY: "auto", background: "var(--bg-surface)", border: "1px solid var(--border-mid)", borderTop: "none", boxShadow: "var(--shadow-md)" }}>
              {searchResults.length === 0 ? (
                <div style={{ padding: M ? 16 : 12, color: "var(--text-muted)", fontSize: "var(--font-sm)", textAlign: "center" }}>{t("tools_stall_search_no_results")}</div>
              ) : searchResults.map((r, i) => (
                <div key={r.key} onClick={() => addItem(r)} onMouseEnter={() => setSelectedIdx(i)}
                  style={{ display: "flex", alignItems: "center", gap: M ? 10 : 8, padding: M ? "8px 12px" : "5px 10px", cursor: "pointer", background: i === selectedIdx ? "var(--bg-elevated)" : "transparent", borderBottom: "1px solid var(--border-subtle)", minHeight: M ? 48 : undefined }}>
                  <ItemThumb item={r.item} size={M ? 32 : 24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "var(--text-primary)", fontSize: M ? "var(--font-base)" : "var(--font-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "var(--font-xxs)", marginTop: 1 }}>
                      <span style={{ color: TYPE_COLORS[r.type] || "var(--text-muted)" }}>{t(r.type)}</span>{" · "}{r.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 2: Action buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: toolbarGap, alignItems: "center" }}>
          <ToolBtn icon="ph:image" label={M ? "" : t("tools_stall_export_png")} title={t("tools_stall_export_png")} onClick={exportPNG} size={btnIcon} pad={btnPad} />
          <ToolBtn icon="ph:copy" label={M ? "" : t("tools_stall_copy_clipboard")} title={t("tools_stall_copy_clipboard")} onClick={copyPNG} size={btnIcon} pad={btnPad} />
          <span style={{ color: "var(--border-mid)", margin: "0 2px", display: M ? "none" : "inline" }}>│</span>
          <ToolBtn icon="ph:text-align-left" label={M ? "" : t("tools_stall_copy_text")} title={t("tools_stall_copy_text")} onClick={copyText} size={btnIcon} pad={btnPad} />
          <ToolBtn icon="ph:file-json" label={M ? "" : t("tools_stall_export_json")} title={t("tools_stall_export_json")} onClick={exportJSON} size={btnIcon} pad={btnPad} />
          <ToolBtn icon="ph:file-arrow-up" label={M ? "" : t("tools_stall_import_json")} title={t("tools_stall_import_json")} onClick={importJSON} size={btnIcon} pad={btnPad} />
          <span style={{ flex: 1 }} />
          <ToolBtn icon="ph:arrow-counter-clockwise" label={M ? "" : t("tools_stall_reset")} title={t("tools_stall_reset")} onClick={() => setConfirmReset(true)} size={btnIcon} pad={btnPad} />
          <span style={{ color: "var(--border-mid)", margin: "0 2px" }}>│</span>
          <ToolBtn icon={settingsOpen ? "ph:caret-up" : "ph:gear"} label={M ? "" : t("tools_stall_settings")} title={t("tools_stall_settings")} onClick={() => setSettingsOpen(!settingsOpen)} active={settingsOpen} size={btnIcon} pad={btnPad} />
          {exportMsg && <span style={{ color: "var(--success)", fontSize: "var(--font-xs)", whiteSpace: "nowrap" }}>{exportMsg}</span>}
        </div>
      </div>

      {/* ═══ PREVIEW ═══ */}
      <div style={{ flex: 1, overflow: "auto", padding: M ? "10px" : "16px 20px", display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative" }}>
          <div ref={pngRef} style={previewStyle}>
          {pc.showTitle && (
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("tools_stall_title_placeholder")}
              className="preview-title"
              style={{ background: "transparent", border: "none", outline: "none", color: "inherit", fontWeight: 700, fontSize: "1.6em", lineHeight: 1.3, fontFamily: "var(--font-display)", letterSpacing: "0.04em", width: "100%", padding: "0.15em 0 0 0", textAlign: pc.titleAlign, minHeight: M ? 40 : undefined }} />
          )}
          {pc.showSubtitle && (
            <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder={t("tools_stall_subtitle_placeholder")}
              className="preview-subtitle"
              style={{ background: "transparent", border: "none", outline: "none", color: "inherit", opacity: 0.7, fontSize: "1em", fontFamily: "var(--font-mono)", width: "100%", marginTop: 4, padding: 0, textAlign: pc.subtitleAlign, minHeight: M ? 32 : undefined }} />
          )}
          {/* Items grid — vertical cards, center aligned */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: M ? 10 : 14, marginTop: (pc.showTitle || pc.showSubtitle) ? (M ? 12 : 16) : 0 }}>
            {items.map((si, idx) => {
              const realIdx = items.indexOf(si);
              const fp = Math.round(si.price * (1 - si.discount / 100));
              return (
                <div key={si.key} draggable
                  onDragStart={e => hDragStart(e, realIdx)} onDragOver={e => hDragOver(e, realIdx)}
                  onDragLeave={hDragLeave} onDrop={e => hDrop(e, realIdx)}
                  onClick={() => setEditing({ idx: realIdx, item: si })}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                    gap: M ? 2 : 3, padding: M ? "4px" : "6px",
                    width: M ? 90 : 110,
                    cursor: "grab", userSelect: "none",
                    opacity: dragIdx === realIdx ? 0.35 : 1,
                    transition: "opacity var(--dur-fast) ease",
                  }}
                >
                  <ItemThumb item={si.item} size={M ? 56 : 64} />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%", wordBreak: "break-word" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.82em", lineHeight: 1.2, fontFamily: "var(--font-display)" }}>{si.name}</span>
                    {pc.showKey && <span style={{ fontSize: "0.55em", opacity: 0.4, fontFamily: "var(--font-mono)" }}>{si.id}</span>}
                    {pc.showPrice && !pc.focusPrice && (
                      <span style={{ fontSize: "0.68em", opacity: 0.75, lineHeight: 1.2, fontWeight: pc.boldPrice ? 700 : undefined }}>
                        {pc.showQuantity && si.quantity > 1 && <span style={{ color: "#f59e0b" }}>×{si.quantity} </span>}
                        RP {fmtPrice(si.price, pc.shortPrice)}
                        {pc.showDiscount && si.discount > 0 && <span style={{ color: "#ef4444", marginLeft: 2 }}>-{si.discount}%</span>}
                        {pc.showDiscount && si.discount > 0 && <span style={{ color: "#22c55e", marginLeft: 2 }}>→ {fmtPrice(fp, pc.shortPrice)}</span>}
                      </span>
                    )}
                    {pc.showPrice && pc.focusPrice && (
                      <span style={{ fontSize: "1.1em", opacity: 0.9, lineHeight: 1.2, fontWeight: pc.boldPrice ? 800 : 700, fontFamily: "var(--font-display)", color: "#f59e0b" }}>
                        {pc.showQuantity && si.quantity > 1 && <span style={{ fontWeight: 400 }}>×{si.quantity} </span>}
                        RP {fmtPrice(si.price, pc.shortPrice)}
                      </span>
                    )}
                    {pc.showPrice && pc.focusPrice && pc.showDiscount && si.discount > 0 && (
                      <span style={{ fontSize: "0.68em", opacity: 0.75, fontWeight: pc.boldPrice ? 700 : undefined }}>
                        <span style={{ color: "#ef4444" }}>-{si.discount}%</span>
                        <span style={{ color: "#22c55e", marginLeft: 4 }}>→ RP {fmtPrice(fp, pc.shortPrice)}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div style={{ color: "inherit", opacity: 0.3, fontSize: "0.85em", padding: M ? "24px 0" : "20px 0", width: "100%", textAlign: "center" }}>{t("tools_stall_empty_short")}</div>
            )}
          </div>
          {/* Timestamp watermark */}
          <div style={{ marginTop: M ? 10 : 14, paddingTop: M ? 6 : 8, textAlign: "right", fontSize: "0.6em", opacity: 0.4, fontFamily: "var(--font-mono)" }}>
            {new Date().toLocaleString()}
          </div>
          </div>
          {/* Drag-resize handle */}
          <ResizeHandle onResize={(w) => updPc({ forceWidth: w })} M={M} />
        </div>
      </div>

      {/* ═══ SETTINGS PANEL ═══ */}
      {settingsOpen && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-base)", padding: M ? "8px 10px" : "12px 20px", flexShrink: 0, display: "flex", flexWrap: "wrap", gap: M ? 8 : 14, alignItems: "center", fontSize: "var(--font-xs)", maxHeight: M ? "40vh" : 180, overflowY: "auto" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "var(--font-xxs)" }}>{t("tools_stall_text_size")}</span>
            <input type="range" min={10} max={28} value={pc.textSize} onChange={e => updPc({ textSize: Number(e.target.value) })} style={{ width: M ? 60 : 80, accentColor: "var(--accent)" }} />
            <span style={{ color: "var(--accent)", width: 20, textAlign: "right", fontSize: "var(--font-xxs)" }}>{pc.textSize}</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "var(--font-xxs)" }}>{t("tools_stall_force_width")}</span>
            <input type="number" min={0} max={2000} step={10} value={pc.forceWidth} onChange={e => updPc({ forceWidth: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 50, background: "var(--bg-deep)", border: "1px solid var(--border-mid)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)", padding: "3px 4px", outline: "none", minHeight: M ? 30 : undefined }} />
            <span style={{ color: "var(--text-dim)", fontSize: "var(--font-xxs)" }}>px</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "var(--font-xxs)" }}>{t("tools_stall_fg_color")}</span>
            <input type="color" value={pc.fgColor} onChange={e => updPc({ fgColor: e.target.value })} style={{ width: M ? 28 : 24, height: M ? 28 : 24, border: "1px solid var(--border-mid)", borderRadius: 3, cursor: "pointer", background: "transparent", padding: 0 }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "var(--font-xxs)" }}>{t("tools_stall_bg_color")}</span>
            <input type="color" value={pc.bgColor} onChange={e => updPc({ bgColor: e.target.value })} style={{ width: M ? 28 : 24, height: M ? 28 : 24, border: "1px solid var(--border-mid)", borderRadius: 3, cursor: "pointer", background: "transparent", padding: 0 }} />
          </label>
          <span style={{ color: "var(--border-mid)", margin: "0 2px", display: M ? "none" : "inline" }}>│</span>
          <VisToggle label={t("tools_stall_show_title")} checked={pc.showTitle} onChange={() => updPc({ showTitle: !pc.showTitle })} M={M} />
          <AlignBtn label={t("tools_stall_align_title")} val={pc.titleAlign} onChange={(v) => updPc({ titleAlign: v })} M={M} />
          <VisToggle label={t("tools_stall_show_subtitle")} checked={pc.showSubtitle} onChange={() => updPc({ showSubtitle: !pc.showSubtitle })} M={M} />
          <AlignBtn label={t("tools_stall_align_subtitle")} val={pc.subtitleAlign} onChange={(v) => updPc({ subtitleAlign: v })} M={M} />
          <VisToggle label="KEY" checked={pc.showKey} onChange={() => updPc({ showKey: !pc.showKey })} M={M} />
          <VisToggle label={t("tools_stall_price")} checked={pc.showPrice} onChange={() => updPc({ showPrice: !pc.showPrice })} M={M} />
          <VisToggle label={t("tools_stall_short_price")} checked={pc.shortPrice} onChange={() => updPc({ shortPrice: !pc.shortPrice })} M={M} />
          <VisToggle label={t("tools_stall_bold_price")} checked={pc.boldPrice} onChange={() => updPc({ boldPrice: !pc.boldPrice })} M={M} />
          <VisToggle label={t("tools_stall_focus_price")} checked={pc.focusPrice} onChange={() => updPc({ focusPrice: !pc.focusPrice })} M={M} />
          <VisToggle label={t("tools_stall_discount")} checked={pc.showDiscount} onChange={() => updPc({ showDiscount: !pc.showDiscount })} M={M} />
          <VisToggle label={t("tools_stall_quantity")} checked={pc.showQuantity} onChange={() => updPc({ showQuantity: !pc.showQuantity })} M={M} />
        </div>
      )}

      {/* ── Hidden file input for JSON import ── */}
      <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />

      {/* ═══ EDIT MODAL ═══ */}
      {editing && (
        <EditModal
          si={items[editing.idx]}
          idx={editing.idx}
          onUpdate={(p) => updateItem(editing.idx, p)}
          onRevert={(orig) => updateItem(editing.idx, orig)}
          onRemove={() => removeItem(editing.idx)}
          onClose={() => setEditing(null)}
          t={t} isMobile={isMobile}
        />
      )}

      {/* ═══ CONFIRM RESET MODAL ═══ */}
      {confirmReset && (
        <div onClick={() => setConfirmReset(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", animation: "fade-in 0.15s ease both", fontFamily: "var(--font-mono)" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-surface)", border: "1px solid var(--danger)", boxShadow: "var(--shadow-md)", padding: "24px 28px", maxWidth: 340, textAlign: "center", animation: "scale-in 0.2s var(--ease-out) both" }}>
            <div style={{ color: "var(--danger)", fontSize: "var(--font-lg)", fontWeight: 700, marginBottom: 8 }}>{t("tools_stall_reset_confirm")}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "var(--font-sm)", marginBottom: 20 }}>{t("tools_stall_reset_warn")}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmReset(false)} style={{ padding: "8px 18px", background: "transparent", border: "1px solid var(--border-mid)", color: "var(--text-muted)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)" }}>{t("tools_stall_cancel")}</button>
              <button onClick={doReset} style={{ padding: "8px 18px", background: "var(--danger)", border: "none", color: "#fff", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)", fontWeight: 700 }}>{t("tools_stall_reset")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared checkbox dot ── */
function TglDot({ on }) {
  return <span style={{ width: 8, height: 8, flexShrink: 0, border: "1px solid var(--border-mid)", background: on ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <span style={{ color: "#000", fontSize: 5 }}>&#10003;</span>}</span>;
}

/* ── Toolbar button ── */
function ToolBtn({ icon, label, title, onClick, active, size, pad }) {
  return (
    <button onClick={onClick} title={title || label}
      style={{ display: "flex", alignItems: "center", gap: label ? 4 : 0, padding: pad, background: active ? "var(--bg-elevated)" : "var(--bg-surface)", border: `1px solid ${active ? "var(--accent)" : "var(--border-subtle)"}`, color: active ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: "var(--font-xs)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", minHeight: 28, transition: "all var(--dur-fast) ease" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = active ? "var(--accent)" : "var(--border-subtle)"; e.currentTarget.style.color = active ? "var(--accent)" : "var(--text-muted)"; }}>
      <Icon icon={icon} width={size} height={size} />
      {label && <span>{label}</span>}
    </button>
  );
}

/* ── Visibility toggle ── */
function VisToggle({ label, checked, onChange, M }) {
  return (
    <label onClick={onChange} style={{ display: "flex", alignItems: "center", gap: M ? 6 : 4, cursor: "pointer", userSelect: "none", color: checked ? "var(--accent)" : "var(--text-muted)", fontSize: "var(--font-xxs)", padding: M ? "4px 8px" : "2px 6px", border: `1px solid ${checked ? "var(--accent)" : "var(--border-subtle)"}`, minHeight: M ? 28 : undefined }}>
      <TglDot on={checked} />{label}
    </label>
  );
}

/* ── Alignment cycle button ── */
const ALIGN_ICONS = { left: "ph:text-align-left", center: "ph:text-align-center", right: "ph:text-align-right" };
function AlignBtn({ label, val, onChange, M }) {
  const next = val === "left" ? "center" : val === "center" ? "right" : "left";
  return (
    <label onClick={() => onChange(next)} title={`${label}: ${val}`}
      style={{ display: "flex", alignItems: "center", gap: M ? 4 : 3, cursor: "pointer", userSelect: "none", color: "var(--text-muted)", fontSize: "var(--font-xxs)", padding: M ? "4px 6px" : "2px 4px", border: "1px solid var(--border-subtle)", minHeight: M ? 28 : undefined }}>
      <Icon icon={ALIGN_ICONS[val] || ALIGN_ICONS.left} width={M ? 12 : 10} height={M ? 12 : 10} />
      {label}
    </label>
  );
}

/* ── Edit modal ── */
function EditModal({ si, idx, onUpdate, onRemove, onRevert, onClose, t, isMobile }) {
  const M = isMobile;
  const mW = M ? "92vw" : 320;
  const mPad = M ? "20px 16px" : "20px 24px";

  // save snapshot on mount, revert on ✕
  const snapRef = useRef(null);
  if (!snapRef.current) {
    snapRef.current = { quantity: si.quantity, price: si.price, discount: si.discount };
  }
  const handleClose = useCallback(() => {
    if (snapRef.current) {
      const s = snapRef.current;
      if (s.quantity !== si.quantity || s.price !== si.price || s.discount !== si.discount) {
        onRevert(s);
      }
    }
    onClose();
  }, [si, onRevert, onClose]);

  return (
    <div onClick={handleClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: M ? "flex-end" : "center", justifyContent: "center", animation: "fade-in 0.15s ease both", fontFamily: "var(--font-mono)" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-surface)", border: "1px solid var(--accent)", boxShadow: "var(--shadow-md), var(--glow-accent)",
        padding: mPad, width: "100%", maxWidth: mW,
        borderRadius: M ? "12px 12px 0 0" : undefined,
        animation: M ? "slide-up 0.2s var(--ease-out) both" : "scale-in 0.2s var(--ease-out) both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <ItemThumb item={si.item} size={M ? 48 : 40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: M ? "var(--font-md)" : "var(--font-base)", fontFamily: "var(--font-display)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{si.name}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "var(--font-xxs)" }}>{si.id}</div>
          </div>
          <span onClick={handleClose} style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: M ? "var(--font-lg)" : "var(--font-base)", padding: M ? "8px 10px" : "2px 6px" }}>✕</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: M ? 14 : 12 }}>
          <Row label={t("tools_stall_quantity")} M={M}>
            <input type="number" min={1} max={999} value={si.quantity} onChange={e => onUpdate({ quantity: Math.max(1, parseInt(e.target.value) || 1) })} style={numStyle(M)} />
          </Row>
          <Row label={t("tools_stall_price") + " (RP)"} M={M}>
            <input type="number" min={0} max={999999} value={si.price} onChange={e => onUpdate({ price: Math.max(0, parseInt(e.target.value) || 0) })} style={numStyle(M)} />
          </Row>
          <Row label={t("tools_stall_discount") + " (%)"} M={M}>
            <input type="number" min={0} max={99} value={si.discount} onChange={e => onUpdate({ discount: Math.min(99, Math.max(0, parseInt(e.target.value) || 0)) })} style={numStyle(M)} />
          </Row>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: M ? 18 : 16, justifyContent: "space-between" }}>
          <button onClick={() => { onRemove(); onClose(); }}
            style={{ padding: M ? "10px 16px" : "6px 14px", background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: M ? "var(--font-base)" : "var(--font-sm)", letterSpacing: "0.06em", minHeight: M ? 44 : undefined }}>
            {t("tools_stall_remove")}
          </button>
          <button onClick={onClose}
            style={{ padding: M ? "10px 16px" : "6px 14px", background: "var(--accent)", border: "none", color: "var(--bg-deep)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: M ? "var(--font-base)" : "var(--font-sm)", fontWeight: 700, letterSpacing: "0.06em", minHeight: M ? 44 : undefined }}>
            {t("tools_stall_done")}
          </button>
        </div>
      </div>
    </div>
  );
}
function Row({ label, children, M }) {
  return <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
    <span style={{ color: "var(--text-muted)", fontSize: M ? "var(--font-sm)" : "var(--font-sm)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{label}</span>
    {children}
  </label>;
}
function numStyle(M) {
  return { width: 80, background: "var(--bg-deep)", border: "1px solid var(--border-mid)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: M ? "max(16px, var(--font-sm))" : "var(--font-sm)", padding: M ? "8px" : "5px 8px", outline: "none", textAlign: "right", minHeight: M ? 40 : undefined };
}

/* ── Drag-resize handle ── */
function ResizeHandle({ onResize, M }) {
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const nodeRef = useRef(null);

  useEffect(() => {
    if (!nodeRef.current) return;
    const el = nodeRef.current;
    const parent = el.parentElement;

    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      startX.current = e.clientX;
      startW.current = parent.getBoundingClientRect().width;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const diff = e.clientX - startX.current;
      const w = Math.max(200, Math.min(2000, Math.round(startW.current + diff)));
      onResize(w);
    };
    const onUp = () => { setDragging(false); };
    el.addEventListener("mousedown", onDown);
    if (dragging) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, onResize]);

  return (
    <>
      <div ref={nodeRef}
        style={{
          position: "absolute", right: -6, top: 0, bottom: 0,
          width: 12, cursor: "col-resize",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: dragging ? 0.8 : 0.2,
          transition: "opacity var(--dur-fast) ease",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.6"}
        onMouseLeave={e => { if (!dragging) e.currentTarget.style.opacity = "0.2"; }}
      >
        <span style={{ color: "var(--accent)", fontSize: M ? 14 : 10, lineHeight: 1, userSelect: "none" }}>
          {dragging ? "∥" : "┃"}
        </span>
      </div>
      {dragging && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, cursor: "col-resize" }} />
      )}
    </>
  );
}
