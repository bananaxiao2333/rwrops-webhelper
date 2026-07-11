/* ───────────────────────────────────────────────────
 *  GlobalSearch.jsx  —  全局搜索弹窗
 *  · 搜索游戏数据 × Docs 文章
 *  · 首选语言优先，结果按类别分组
 *  · Ctrl+K 快捷键 / 点击搜索图标触发
 * ─────────────────────────────────────────────────── */
import { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "./i18n.jsx";
import { searchArticles, buildSearchIndex } from "./docs.js";

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
    } catch (_) { /* ignore */ }
  }, [docsReady]);

  useEffect(() => {
    if (open) {
      initDocs();
      setQuery("");
      setResults({ data: [], docs: [] });
      setSelectedIdx(0);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initDocs]);

  // 搜索执行
  useEffect(() => {
    if (!open || !query.trim()) {
      setResults({ data: [], docs: [] });
      return;
    }
    if (!data && !docsReady) return;

    setLoading(true);

    const timer = setTimeout(() => {
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
                path: `#/params/${type}/${key}`,
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
            path: `#/docs/${r.slug}?hl=${encodeURIComponent(q)}`,
          }));
        } catch (_) { /* ignore */ }
      }

      setResults({ data: dataResults.slice(0, 15), docs: docResults.slice(0, 10) });
      setSelectedIdx(0);
      setLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, open, data, docsReady, lang, translate]);

  // 扁平化所有结果用于键盘导航
  const allResults = useCallback(() => {
    const flat = [];
    for (const r of results.data) flat.push(r);
    for (const r of results.docs) flat.push(r);
    return flat;
  }, [results]);

  const totalCount = results.data.length + results.docs.length;

  const handleKey = useCallback((e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (!totalCount) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, totalCount - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const flat = allResults();
      const r = flat[selectedIdx];
      if (r) { onNavigate(r.path); onClose(); }
    }
  }, [totalCount, selectedIdx, onClose, onNavigate, allResults]);

  // 扁平结果供外部索引访问
  const flat = allResults();

  if (!open) return null;

  return (
    <div style={{
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
        borderRadius: 6, boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column",
        fontFamily: "var(--font-mono)",
        animation: "fade-in 0.18s var(--ease-smooth) 0.05s both",
      }}>
        {/* Header + Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)",
        }}>
          <span style={{ color: "var(--accent)", fontSize: "var(--font-lg)" }}>&#8981;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search") + "..."}
            style={{
              flex: 1, background: "transparent", border: "none",
              color: "var(--text-primary)", fontSize: "var(--font-base)",
              fontFamily: "inherit", outline: "none",
            }}
          />
          {query && (
            <span onClick={() => setQuery("")}
              style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
              &#10005;
            </span>
          )}
          <span onClick={onClose}
            style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "var(--font-base)" }}>
            &#10005;
          </span>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
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
                  <div key={`data-${r.section}-${r.key}`}
                    onClick={() => { onNavigate(r.path); onClose(); }}
                    style={{
                      padding: "8px 16px", cursor: "pointer",
                      background: isSel ? "var(--bg-elevated)" : "transparent",
                      borderLeft: isSel ? "3px solid var(--accent)" : "3px solid transparent",
                      transition: "background var(--dur-fast) var(--ease-smooth)",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? "var(--bg-elevated)" : "transparent"; }}
                  >
                    <span style={{
                      flexShrink: 0, fontSize: "var(--font-xxs)", fontWeight: 700,
                      color: "var(--accent)", background: "var(--bg-surface)",
                      padding: "1px 5px", borderRadius: 2,
                      border: "1px solid var(--border-subtle)",
                    }}>
                      {TYPE_LABELS[r.section] || r.section.slice(0, 4).toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "var(--font-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
                        {r.label}
                      </span>
                      <span style={{
                        marginLeft: 8, fontSize: "var(--font-xxs)",
                        color: "var(--text-dim)", textTransform: "uppercase",
                      }}>
                        {r.section}
                      </span>
                    </span>
                  </div>
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
                  <div key={`docs-${r.key}-${r.section}`}
                    onClick={() => { onNavigate(r.path); onClose(); }}
                    style={{
                      padding: "8px 16px", cursor: "pointer",
                      background: isSel ? "var(--bg-elevated)" : "transparent",
                      borderLeft: isSel ? "3px solid var(--accent)" : "3px solid transparent",
                      transition: "background var(--dur-fast) var(--ease-smooth)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSel ? "var(--bg-elevated)" : "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: "var(--font-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
                        {r.label}
                      </span>
                      <span style={{
                        fontSize: "var(--font-xxs)", padding: "1px 6px", borderRadius: 2,
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
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
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
