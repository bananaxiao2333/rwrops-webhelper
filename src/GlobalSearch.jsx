/* ───────────────────────────────────────────────────
 *  GlobalSearch.jsx  —  全局搜索弹窗
 *  · 搜索游戏数据 × Docs 文章
 *  · 首选语言优先，结果按类别分组
 *  · Ctrl+K 快捷键 / 点击搜索图标触发
 * ─────────────────────────────────────────────────── */
import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "./i18n.jsx";
import { searchArticles, buildSearchIndex } from "./docsLazy.js";

const LANG_NAMES = { cn: "中文", en: "EN", de: "DE", es: "ES", fr: "FR", ru: "RU" };
const TYPE_LABELS = {
  weapon: "WPN", vehicles: "VEH", carry_item: "ITEM",
  projectile: "PROJ", call: "CALL", achievement: "ACHV",
  faction: "FACT", rank: "RANK", stance: "STNC",
  map_config: "MAP", language: "LANG",
};

/* ══════════════════════════════════════════════════
 *  全局搜索弹窗
 * ══════════════════════════════════════════════════ */
export default function GlobalSearch({ open, onClose, data, onNavigate }) {
  const { lang, translate, t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ data: [], docs: [] });
  const [loading, setLoading] = useState(false);
  const [docsReady, setDocsReady] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  // 构建 docs 索引
  const initDocs = useCallback(async () => {
    if (docsReady) return;
    try {
      await buildSearchIndex();
      setDocsReady(true);
    } catch { /* ignore */ }
  }, [docsReady]);

  const prevSearchOpen = useRef(false);
  useEffect(() => {
    if (open && !prevSearchOpen.current) {
      queueMicrotask(() => {
        initDocs();
        setQuery("");
        setResults({ data: [], docs: [] });
        setSelectedIdx(0);
        setLoading(false);
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    prevSearchOpen.current = open;
  }, [open, initDocs]);

  // 搜索执行
  useEffect(() => {
    if (!open || !query.trim() || (!data && !docsReady)) return;

    const timer = setTimeout(() => {
      setLoading(true);
      const q = query.trim().toLowerCase();

      // 1. 游戏数据搜索
      const dataResults = [];
      if (data) {
        for (const [type, items] of Object.entries(data)) {
          if (!items || typeof items !== "object") continue;
          for (const [key, item] of Object.entries(items)) {
            const rawName = String(item.name || "").toLowerCase();
            const transName = String(translate(item.name || "")).toLowerCase();
            const rawKey = String(key || "").toLowerCase();

            if (rawName.includes(q) || transName.includes(q) || rawKey.includes(q)) {
              dataResults.push({
                type: "data",
                section: type,
                label: transName || rawName || rawKey,
                key,
                path: `/params/${type}/${key}`,
              });
            }
          }
        }
      }

      // 2. Docs 搜索
      let docResults = [];
      if (docsReady) {
        try {
          docResults = (searchArticles(q, lang) || []).map((r) => ({
            type: "docs",
            section: r.lang,
            label: r.title,
            key: r.slug,
            snippet: r.snippet,
            path: `/docs/${r.slug}?hl=${encodeURIComponent(q)}`,
          }));
        } catch { /* ignore */ }
      }

      setResults({ data: dataResults.slice(0, 15), docs: docResults.slice(0, 10) });
      setSelectedIdx(0);
      setLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, open, data, docsReady, lang, translate]);

  const totalCount = results.data.length + results.docs.length;

  const handleKey = useCallback((e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (!totalCount) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, totalCount - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const all = [...results.data, ...results.docs];
      const r = all[selectedIdx];
      if (r) { onNavigate(r.path); onClose(); }
    }
  }, [totalCount, selectedIdx, onClose, onNavigate, results]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      aria-describedby="search-footer"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.8)",
        display: "flex", justifyContent: "center", paddingTop: "10vh",
        animation: "fade-in 0.12s var(--ease-smooth) both",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div onKeyDown={handleKey} style={{
        width: "min(600px, 92vw)", maxHeight: "75vh",
        background: "var(--bg-deep)", border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column",
        fontFamily: "var(--font-body)",
        animation: "fade-in 0.18s var(--ease-smooth) 0.05s both",
      }}>
        {/* Header + Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)",
        }}>
          <span style={{ color: "var(--accent)", fontSize: "var(--font-lg)" }} aria-hidden="true">&#8981;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search") + "..."}
            aria-label={t("search")}
            style={{
              flex: 1, background: "transparent", border: "none",
              color: "var(--text-primary)", fontSize: "var(--font-base)",
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              aria-label="Clear search"
              style={{
                cursor: "pointer", color: "var(--text-muted)", fontSize: "var(--font-sm)",
                background: "none", border: "none", padding: 0, fontFamily: "inherit",
              }}>
              &#10005;
            </button>
          )}
          <button onClick={onClose}
            aria-label="Close search"
            style={{
              cursor: "pointer", color: "var(--text-muted)", fontSize: "var(--font-base)",
              background: "none", border: "none", padding: 0, fontFamily: "inherit",
            }}>
            &#10005;
          </button>
        </div>

        {/* Results */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {loading && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
              <div style={{ width: 20, height: 20, border: "2px solid var(--border-mid)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "boot-spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              Searching…
            </div>
          )}

          {!loading && query.trim() === "" && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
              {t("search")}...
            </div>
          )}

          {!loading && query.trim() !== "" && totalCount === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
              {t("doc_search_no_results", query)}
            </div>
          )}

          {/* Game Data */}
          {results.data.length > 0 && (
            <>
              <div style={{
                padding: "6px 16px", fontSize: "var(--font-xxs)",
                  color: "var(--success, #4ade80)", textTransform: "uppercase",
                  letterSpacing: "0.1em", fontWeight: 600,
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                  GAME DATA
                </div>
              {results.data.map((r, ri) => {
                const idx = ri;
                const isSel = selectedIdx === idx;
                return (
                  <button
                    key={`data-${r.section}-${r.key}`}
                    onClick={() => { onNavigate(r.path); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%",
                      padding: "8px 16px", cursor: "pointer",
                      background: isSel ? "var(--bg-elevated)" : "transparent",
                      border: "none",
                      borderLeft: isSel ? "3px solid var(--accent)" : "3px solid transparent",
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background var(--dur-fast) var(--ease-smooth)",
                      fontFamily: "inherit", fontSize: "inherit",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? "var(--bg-elevated)" : "transparent"; }}
                  >
                    <span style={{
                      flexShrink: 0, fontSize: "var(--font-xxs)", fontWeight: 700,
                      color: "var(--accent)", background: "var(--bg-surface)",
                      padding: "1px 5px", borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}>
                      {TYPE_LABELS[r.section] || r.section.slice(0, 4).toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                        {r.label}
                      </span>
                      <span style={{
                        marginLeft: 8, fontSize: "var(--font-xxs)",
                        color: "var(--text-dim)",
                      }}>
                        {r.section}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* Docs */}
          {results.docs.length > 0 && (
            <>
              <div style={{
                padding: "6px 16px", fontSize: "var(--font-xxs)",
                  color: "var(--accent)", textTransform: "uppercase",
                  letterSpacing: "0.1em", fontWeight: 600,
                  marginTop: results.data.length > 0 ? 4 : 0,
                  borderBottom: "1px solid var(--border-subtle)",
                }}>
                  DOCS
              </div>
              {results.docs.map((r, di) => {
                const idx = results.data.length + di;
                const isSel = selectedIdx === idx;
                return (
                  <button
                    key={`docs-${r.key}-${r.section}`}
                    onClick={() => { onNavigate(r.path); onClose(); }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "8px 16px", cursor: "pointer",
                      background: isSel ? "var(--bg-elevated)" : "transparent",
                      border: "none",
                      borderLeft: isSel ? "3px solid var(--accent)" : "3px solid transparent",
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background var(--dur-fast) var(--ease-smooth)",
                      fontFamily: "inherit", fontSize: "inherit",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? "var(--bg-elevated)" : "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                        {r.label}
                      </span>
                      <span style={{
                        fontSize: "var(--font-xxs)", padding: "1px 6px", borderRadius: "var(--radius-sm)",
                        background: "var(--bg-surface)", color: "var(--text-muted)",
                        border: "1px solid var(--border-subtle)",
                      }}>
                        {LANG_NAMES[r.section] || r.section.toUpperCase()}
                      </span>
                    </div>
                    {r.snippet && (
                      <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", lineHeight: 1.5 }}
                        dangerouslySetInnerHTML={{ __html: r.snippet }} />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div id="search-footer" style={{
          padding: "6px 16px", borderTop: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          display: "flex", justifyContent: "space-between",
        }}>
          <span>↑↓ · Enter · Esc</span>
          {query.trim() && <span>{totalCount} result{totalCount !== 1 ? "s" : ""}</span>}
        </div>
      </div>
    </div>
  );
}
