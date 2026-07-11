import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useT } from "./i18n.jsx";
import { useI18n } from "./i18n.jsx";
import { getArticle, getArticleMeta, getArticleSlugs, getAllArticleMetas, searchArticles, buildSearchIndex } from "./docs.js";
import SEO, { ArticleStructuredData } from "./SEO.jsx";

// ── 语言名称映射 ──
const LANG_NAMES = { cn: "中文", en: "EN", de: "DE", es: "ES", fr: "FR", ru: "RU" };

/* ── Lightweight Markdown → HTML converter ── */
function mdToHtml(text, highlightTerms) {
  const lines = text.split("\n");
  const out = [];
  let inCode = false;
  let codeBuf = [];
  let inTable = false;
  let tableHtml = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) {
      if (inCode) {
        out.push(`<pre class="doc-code"><code>${mdEscape(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else { inCode = true; codeBuf = []; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }
    if (/^---+$/.test(line.trim())) { out.push("<hr />"); continue; }
    if (line.trim() === "") { out.push(""); continue; }

    if (line.trimStart().startsWith("|")) {
      const cells = line.split("|").filter(Boolean);
      if (!inTable) { inTable = true; tableHtml = "<table>\n"; }
      if (/^[\s:-]+$/.test(cells.join(""))) continue;
      const tag = tableHtml.includes("<thead>") || tableHtml.includes("<tr><t") ? "td" : "th";
      tableHtml += "<tr>" + cells.map(c => `<${tag}>${mdInline(c.trim())}</${tag}>`).join("") + "</tr>\n";
      if (tag === "th") tableHtml += "</thead>\n<tbody>\n";
      continue;
    }
    if (inTable) { out.push(tableHtml + "</tbody></table>"); inTable = false; tableHtml = ""; }

    if (line.trimStart().startsWith(">")) {
      out.push(`<blockquote>${mdInline(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }
    if (/^\s*[-*+]\s/.test(line)) {
      out.push(`<li>${mdInline(line.replace(/^\s*[-*+]\s/, ""))}</li>`);
      continue;
    }
    if (/^\s*\d+[.)]\s/.test(line)) {
      out.push(`<li>${mdInline(line.replace(/^\s*\d+[.)]\s*/, ""))}</li>`);
      continue;
    }
    // HTML passthrough
    if (/^\s*</.test(line)) {
      out.push(line);
      continue;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (hMatch) {
      const hText = hMatch[2].replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      const hId = hText.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "");
      out.push(`<h${hMatch[1].length} id="${hId}">${mdInline(hMatch[2])}</h${hMatch[1].length}>`);
      continue;
    }
    out.push(`<p>${mdInline(line)}</p>`);
  }

  if (inCode) out.push(`<pre class="doc-code"><code>${mdEscape(codeBuf.join("\n"))}</code></pre>`);
  if (inTable) out.push(tableHtml + "</tbody></table>");

  let html = out.join("\n").replace(/(<li>[\s\S]*?)(<\/li>\n)(?!<li>)/g, "<ul>$1$2</ul>\n");

  // 关键词高亮（在 code/pre 标签之外）
  if (highlightTerms && highlightTerms.length > 0) {
    html = applyHighlight(html, highlightTerms);
  }

  return html;
}

function mdInline(text) {
  return mdEscape(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}
function mdEscape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ── 高亮关键词（跳过 HTML 标签和 pre/code 块内部） ── */
function applyHighlight(html, terms) {
  // 用占位符保护 pre/code 块
  const protectedBlocks = [];
  let safe = html.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    protectedBlocks.push(match);
    return `@@BLOCK${protectedBlocks.length - 1}@@`;
  });

  // 构建高亮正则（大小写不敏感）
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  safe = safe.replace(re, '<mark class="doc-highlight">$1</mark>');

  // 还原受保护块
  safe = safe.replace(/@@BLOCK(\d+)@@/g, (_, i) => protectedBlocks[Number(i)]);

  return safe;
}

/* ── Article list component (used on HomePage) ── */
export function ArticleList({ isMobile }) {
  const { lang } = useI18n();
  const slugs = useMemo(() => getArticleSlugs(), []);
  const [metas, setMetas] = useState({});

  useEffect(() => {
    getAllArticleMetas(lang).then(setMetas);
  }, [lang]);

  return (
    <div>
      {slugs.map((slug) => {
        const meta = metas[slug] || getArticleMeta(slug, lang);
        return (
          <a key={slug} href={`/docs/${slug}`}
            onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", `/docs/${slug}`); window.dispatchEvent(new PopStateEvent("popstate")); }}
            style={{
              display: "flex", alignItems: "center", gap: isMobile ? 6 : 10,
              padding: isMobile ? "8px 10px" : "10px 14px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)", textDecoration: "none", cursor: "pointer",
              fontSize: isMobile ? "var(--font-sm)" : "var(--font-base)",
              color: "var(--text-primary)", fontFamily: "var(--font-mono)",
              animation: "fade-in 0.3s var(--ease-smooth) both",
              transition: "border-color var(--dur-fast) var(--ease-smooth)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
          >
            <span style={{ fontSize: isMobile ? "var(--font-base)" : "var(--font-lg)", flexShrink: 0 }}>{'\u2261'}</span>
            <span style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {meta.title}
              </div>
              {meta.description && (
                <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                  {meta.description}
                </div>
              )}
            </span>
            <span style={{ color: "var(--accent)", fontSize: "var(--font-sm)" }}>&#9654;</span>
          </a>
        );
      })}
    </div>
  );
}

const DOC_CSS = `
.doc-content h1 { font-size: var(--font-hg); font-family: var(--font-display); font-weight: 700; letter-spacing: 0.06em; margin: 0 0 24px; color: var(--accent); }
.doc-content h2 { font-size: var(--font-xl); font-family: var(--font-display); font-weight: 600; margin: 28px 0 12px; color: var(--text-primary); border-bottom: 1px solid var(--border-subtle); padding-bottom: 6px; }
.doc-content h3 { font-size: var(--font-lg); font-family: var(--font-display); font-weight: 600; margin: 20px 0 8px; color: var(--text-secondary); }
.doc-content p  { margin: 0 0 12px; color: var(--text-primary); }
.doc-content strong { color: var(--accent); font-weight: 700; }
.doc-content code { background: var(--bg-elevated); padding: 2px 5px; border-radius: 2px; font-size: 0.9em; color: var(--amber); }
.doc-content pre.doc-code { background: var(--bg-base); border: 1px solid var(--border-subtle); padding: 12px 16px; overflow-x: auto; margin: 12px 0; }
.doc-content pre.doc-code code { background: none; padding: 0; color: var(--text-primary); }
.doc-content blockquote { border-left: 3px solid var(--accent); margin: 12px 0; padding: 8px 16px; background: var(--bg-surface); color: var(--text-muted); font-style: italic; }
.doc-content ul, .doc-content ol { margin: 8px 0; padding-left: 24px; }
.doc-content li { margin: 4px 0; }
.doc-content hr { border: none; border-top: 1px solid var(--border-subtle); margin: 24px 0; }
.doc-content table { border-collapse: collapse; margin: 12px 0; width: 100%; font-size: var(--font-sm); }
.doc-content th, .doc-content td { border: 1px solid var(--border-subtle); padding: 6px 12px; text-align: left; }
.doc-content th { background: var(--bg-surface); color: var(--accent); font-weight: 600; }
.doc-content td { color: var(--text-primary); }
.doc-content a { color: var(--accent); text-decoration: underline; }
.doc-content mark.doc-highlight { background: rgba(245,158,11,0.35); color: var(--text-primary); border-radius: 2px; padding: 1px 2px; }
`;

/* ══════════════════════════════════════════════════
 *  Search Modal
 *  · 全屏半透明遮罩 + 居中面板
 *  · 实时搜索，首选语言优先
 *  · 键盘导航：↑↓ Enter Esc
 * ══════════════════════════════════════════════════ */
function SearchModal({ open, onClose, lang, onSelectArticle }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasIndex, setHasIndex] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  // 首次打开时构建索引
  const initIndex = useCallback(async () => {
    if (hasIndex) return;
    setLoading(true);
    try {
      await buildSearchIndex();
      setHasIndex(true);
    } catch { /* ignore */ }
    setLoading(false);
  }, [hasIndex]);

  useEffect(() => {
    if (open) {
      initIndex();
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initIndex]);

  // 防抖搜索
  useEffect(() => {
    if (!hasIndex) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setResults(searchArticles(query, lang));
      setSelectedIdx(0);
    }, 120);
    return () => clearTimeout(timer);
  }, [query, hasIndex, lang]);

  // 键盘导航
  const handleKey = useCallback((e) => {
    if (e.key === "Escape") { onClose(); return; }
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const r = results[selectedIdx];
      if (r) { onSelectArticle(r.slug, r.lang, query); onClose(); }
    }
  }, [results, selectedIdx, onClose, onSelectArticle, query]);

  if (!open) return null;

  // 按语言分组
  const preferred = results.filter((r) => r.lang === lang);
  const other = results.filter((r) => r.lang !== lang);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.75)",
      display: "flex", justifyContent: "center", paddingTop: "12vh",
      animation: "fade-in 0.15s var(--ease-smooth) both",
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{DOC_CSS}</style>
      <div onKeyDown={handleKey} style={{
        width: "min(640px, 92vw)", maxHeight: "70vh",
        background: "var(--bg-deep)", border: "1px solid var(--border-subtle)",
        borderRadius: 6, boxShadow: "var(--shadow-lg)",
        display: "flex", flexDirection: "column",
        fontFamily: "var(--font-mono)",
        animation: "fade-in 0.2s var(--ease-smooth) 0.05s both",
      }}>
        {/* Search input */}
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
            placeholder={t("doc_search_placeholder")}
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
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {loading && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
              <div style={{ width: 20, height: 20, border: "2px solid var(--border-mid)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "boot-spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              {t("doc_search_loading")}
            </div>
          )}

          {!loading && hasIndex && !query.trim() && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
              {t("doc_search_empty")}
            </div>
          )}

          {!loading && hasIndex && query.trim() && results.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
              {t("doc_search_no_results", query)}
            </div>
          )}

          {results.length > 0 && (
            <>
              {preferred.length > 0 && (
                <>
                  <div style={{ padding: "6px 16px", fontSize: "var(--font-xxs)", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                    {t("doc_search_preferred")}
                  </div>
                  {preferred.map((r) => renderResult(r, selectedIdx === results.indexOf(r), () => { onSelectArticle(r.slug, r.lang, query); onClose(); }))}
                </>
              )}
              {other.length > 0 && (
                <>
                  <div style={{ padding: "6px 16px", fontSize: "var(--font-xxs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginTop: preferred.length > 0 ? 8 : 0 }}>
                    {t("doc_search_other")}
                  </div>
                  {other.map((r) => renderResult(r, selectedIdx === results.indexOf(r), () => { onSelectArticle(r.slug, r.lang, query); onClose(); }))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "8px 16px", borderTop: "1px solid var(--border-subtle)",
          fontSize: "var(--font-xxs)", color: "var(--text-dim)",
          display: "flex", justifyContent: "space-between",
        }}>
          <span>↑↓ {t("roll_next")} · Enter · Esc</span>
          {hasIndex && <span>{results.length} {results.length === 1 ? "result" : "results"}</span>}
        </div>
      </div>
    </div>
  );
}

function renderResult(r, isSelected, onClick) {
  return (
    <div key={`${r.slug}-${r.lang}`}
      onClick={onClick}
      style={{
        padding: "10px 16px", cursor: "pointer",
        background: isSelected ? "var(--bg-elevated)" : "transparent",
        borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
        transition: "background var(--dur-fast) var(--ease-smooth)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "var(--bg-elevated)" : "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: "var(--font-sm)", fontWeight: 700, color: "var(--text-primary)" }}>{r.title}</span>
        <span style={{
          fontSize: "var(--font-xxs)", padding: "1px 6px", borderRadius: 2,
          background: "var(--bg-surface)", color: "var(--text-muted)",
          border: "1px solid var(--border-subtle)",
        }}>
          {LANG_NAMES[r.lang] || r.lang.toUpperCase()}
        </span>
      </div>
      {r.snippet && (
        <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: r.snippet }} />
      )}
    </div>
  );
}

/* ── Docs list page (shown on #/docs) ── */
export function DocsListPage({ isMobile }) {
  const { lang } = useI18n();
  const t = useT();
  const slugs = useMemo(() => getArticleSlugs(), []);
  const [metas, setMetas] = useState({});
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    getAllArticleMetas(lang).then(setMetas);
  }, [lang]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSelectArticle = (targetSlug, _lang, query) => {
    const hl = query ? `?hl=${encodeURIComponent(query)}` : "";
    window.history.pushState(null, "", `/docs/${targetSlug}${hl}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "var(--bg-deep)",
    }}>
      {/* Scanline */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(245,158,11,0.02) 3px, rgba(245,158,11,0.02) 6px)",
      }} />

      <div style={{
        position: "relative", zIndex: 1, flex: 1, overflow: "auto",
        padding: isMobile ? "20px 14px" : "40px 56px",
      }}>
        {/* Header */}
        <div style={{
          marginBottom: isMobile ? 20 : 32,
          animation: "fade-in 0.4s var(--ease-smooth) both",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{
              fontSize: isMobile ? "clamp(18px, 5vw, 28px)" : "clamp(28px, 3vw, 40px)",
              fontWeight: 700,
              fontFamily: "var(--font-display)", letterSpacing: "0.10em",
              color: "var(--text-primary)",
              display: "flex", alignItems: "center", gap: isMobile ? 8 : 14,
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: isMobile ? 32 : 44, height: isMobile ? 32 : 44,
                border: "2px solid var(--accent)", borderRadius: "50%",
                fontSize: isMobile ? "var(--font-base)" : "var(--font-lg)",
                color: "var(--accent)", flexShrink: 0,
              }}>
                {'\u2261'}
              </span>
              <span>{t("nav_docs")}</span>
            </div>
            <div style={{
              height: 1, width: isMobile ? 60 : 100,
              background: "linear-gradient(to right, var(--accent), transparent)",
              marginTop: isMobile ? 6 : 10,
            }} />
          </div>

          {/* Search button */}
          <button onClick={() => setSearchOpen(true)}
            title={t("doc_search_shortcut")}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: isMobile ? "8px 14px" : "10px 18px",
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)", cursor: "pointer",
              fontSize: "var(--font-sm)", fontFamily: "var(--font-mono)",
              borderRadius: 4,
              transition: "border-color var(--dur-fast) var(--ease-smooth), color var(--dur-fast) var(--ease-smooth)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <span>&#8981;</span>
            <span>{isMobile ? "" : t("doc_search_shortcut")}</span>
          </button>
        </div>

        {/* Count */}
        <div style={{
          fontSize: "var(--font-xs)", color: "var(--text-muted)",
          fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: isMobile ? 12 : 16,
          animation: "fade-in 0.3s ease 0.15s both",
        }}>
          {t("doc_articles_count", slugs.length)}
        </div>

        {/* Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 10 }}>
          {slugs.map((slug, i) => {
            const meta = metas[slug] || getArticleMeta(slug, lang);
            return (
              <a key={slug} href={`/docs/${slug}`}
                onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", `/docs/${slug}`); window.dispatchEvent(new PopStateEvent("popstate")); }}
                style={{
                  display: "flex", alignItems: "center", gap: isMobile ? 10 : 14,
                  padding: isMobile ? "12px 14px" : "16px 20px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  textDecoration: "none", cursor: "pointer",
                  fontSize: isMobile ? "var(--font-sm)" : "var(--font-base)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                  animation: `fade-in 0.35s var(--ease-smooth) ${0.2 + i * 0.08}s both`,
                  transition: "border-color var(--dur-fast) var(--ease-smooth), box-shadow var(--dur-fast) var(--ease-smooth)",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.boxShadow = "var(--glow-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                  background: "var(--accent)",
                  opacity: 0,
                  transition: "opacity var(--dur-fast) var(--ease-smooth)",
                }} className="card-accent-bar" />
                <span style={{
                  fontSize: isMobile ? "var(--font-lg)" : "var(--font-hg)", flexShrink: 0,
                  color: "var(--accent)", opacity: 0.5,
                }}>
                  {'\u2261'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, letterSpacing: "0.06em",
                    fontSize: isMobile ? "var(--font-base)" : "var(--font-md)",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                  }}>
                    {meta.title}
                  </div>
                  {meta.description && (
                    <div style={{
                      fontSize: "var(--font-xs)",
                      color: "var(--text-muted)", marginTop: isMobile ? 2 : 4,
                      lineHeight: 1.4,
                    }}>
                      {meta.description}
                    </div>
                  )}
                  <div style={{
                    fontSize: "var(--font-xxs)", color: "var(--text-dim)", marginTop: isMobile ? 2 : 4,
                  }}>
                    {slug}
                  </div>
                </span>
                <span style={{
                  color: "var(--accent)", fontSize: isMobile ? "var(--font-sm)" : "var(--font-base)",
                  flexShrink: 0, opacity: 0.6,
                }}>&#8594;</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Search modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} lang={lang}
        onSelectArticle={handleSelectArticle} />
    </div>
  );
}

/* ── Parse headings from markdown body ── */
function parseHeadings(body) {
  const heads = [];
  const lines = body.split("\n");
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)/);
    if (m) {
      const level = m[1].length;
      const text = m[2].replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      const id = text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "");
      heads.push({ level, text, id });
    }
  }
  return heads;
}

/* ── Document outline toggle ── */
function DocToc({ headings, isMobile }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (headings.length === 0) return null;

  return (
    <>
      <button onClick={() => setOpen(!open)} style={{
        position: "fixed", left: isMobile ? 6 : 12, bottom: isMobile ? 50 : 70,
        zIndex: 50, cursor: "pointer",
        width: 30, height: 30,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
        color: open ? "var(--accent)" : "var(--text-muted)",
        fontSize: "var(--font-sm)", fontFamily: "var(--font-mono)",
        transition: "all var(--dur-fast) var(--ease-smooth)",
        boxShadow: "var(--shadow-md)",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
        title="Table of Contents"
      >
        {open ? '\u2715' : '\u2630'}
      </button>
      {open && (
        <div style={{
          position: "fixed", left: isMobile ? 6 : 12, bottom: isMobile ? 82 : 104,
          zIndex: 50,
          maxWidth: isMobile ? 220 : 280, maxHeight: "50vh", overflowY: "auto",
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-md)", padding: "8px 0",
          fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)",
          animation: "fade-in 0.2s var(--ease-smooth) both",
        }}>
          <div style={{
            padding: "4px 12px 6px",
            borderBottom: "1px solid var(--border-subtle)",
            color: "var(--accent)", fontWeight: 600,
            letterSpacing: "0.1em", fontSize: "var(--font-xxs)",
            textTransform: "uppercase",
          }}>
            {t("doc_outline")}
          </div>
          {headings.map((h, i) => {
            const indent = (h.level - 1) * 12;
            return (
              <a key={i} href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
                  if (isMobile) setOpen(false);
                }}
                style={{
                  display: "block",
                  padding: "4px 12px 4px " + (12 + indent) + "px",
                  color: h.level === 1 ? "var(--text-primary)" : "var(--text-muted)",
                  textDecoration: "none", cursor: "pointer",
                  fontSize: h.level === 1 ? "var(--font-xs)" : "var(--font-xxs)",
                  fontWeight: h.level <= 2 ? 600 : 400,
                  borderLeft: h.level === 1 ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "background var(--dur-fast) var(--ease-smooth)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {h.text}
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ── Docs viewer page ── */
export default function DocsPage({ slug }) {
  const { lang } = useI18n();
  const t = useT();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ title: slug, description: "" });
  const [resolvedLang, setResolvedLang] = useState(null);
  const [highlightTerms, setHighlightTerms] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const loadArticle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metaResult, articleResult] = await Promise.all([
        getAllArticleMetas(lang).then(m => m[slug] || getArticleMeta(slug, lang)),
        getArticle(slug, lang),
      ]);
      setMeta(metaResult);
      setArticle(articleResult);
      setResolvedLang(articleResult?.resolvedLang || null);

      // 从 URL search 读取搜索词用于高亮
      const raw = window.location.search;
      const hMatch = raw.match(/[?&]hl=([^&]+)/);
      if (hMatch) {
        try {
          setHighlightTerms(decodeURIComponent(hMatch[1]).split(",").filter(Boolean));
        } catch { setHighlightTerms([]); }
      } else {
        setHighlightTerms([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug, lang]);

  useEffect(() => { loadArticle(); }, [loadArticle]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const headings = useMemo(() => article?.body ? parseHeadings(article.body) : [], [article?.body]);
  const html = useMemo(() => article?.body ? mdToHtml(article.body, highlightTerms) : "", [article?.body, highlightTerms]);

  // ── 自动滚动到第一个高亮位置 ──
  useEffect(() => {
    if (!highlightTerms.length || !html) return;
    const timer = setTimeout(() => {
      const first = document.querySelector(".doc-content .doc-highlight");
      if (first) {
        first.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [html, highlightTerms]);

  const handleSelectArticle = useCallback((targetSlug, _lang, query) => {
    const hl = query ? `?hl=${encodeURIComponent(query)}` : "";
    window.history.pushState(null, "", `/docs/${targetSlug}${hl}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
        fontFamily: "var(--font-mono)", color: "var(--text-muted)", flexDirection: "column", gap: 12,
      }}>
        <div style={{ width: 24, height: 24, border: "2px solid var(--border-mid)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "boot-spin 0.8s linear infinite" }} />
        <span>{meta.title}</span>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", height: "100%",
        fontFamily: "var(--font-mono)", color: "var(--text-muted)", flexDirection: "column", gap: 12,
      }}>
        <div style={{ fontSize: "2rem", color: "var(--danger)" }}>&#9608;</div>
        <p>{t("doc_not_found", slug)}</p>
        {error && <p style={{ fontSize: "var(--font-xs)" }}>{error}</p>}
        <a href="/" onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); }}
          style={{ color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}>
          {t("nav_home")}
        </a>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 900, margin: "0 auto",
      padding: "32px 24px 48px",
      fontFamily: "var(--font-mono)",
      color: "var(--text-primary)",
      lineHeight: 1.8,
      fontSize: "var(--font-base)",
      position: "relative",
    }}>
      {/* ── SEO ── */}
      <SEO
        title={meta.title}
        description={meta.description}
        canonicalPath={`/docs/${slug}`}
        lang={resolvedLang || lang}
        langAlt={(() => {
          const allSlugs = getArticleSlugs();
          return allSlugs.map((s) => ({ lang: s === slug ? (resolvedLang || lang) : "en", url: `/docs/${s}` }));
        })()}
        articleMeta={meta.date ? { publishedTime: meta.date } : undefined}
      />
      <ArticleStructuredData
        title={meta.title}
        description={meta.description}
        slug={slug}
        lang={resolvedLang || lang}
        datePublished={meta.date}
      />
      <style>{DOC_CSS}</style>

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <a href="/" onClick={(e) => { e.preventDefault(); window.history.pushState(null, "", "/"); window.dispatchEvent(new PopStateEvent("popstate")); }}
            style={{ color: "var(--text-muted)", fontSize: "var(--font-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <span>&#8592;</span> {t("nav_home")}
          </a>
          <span style={{ color: "var(--border-mid)" }}>/</span>
          <span style={{ color: "var(--accent)", fontSize: "var(--font-sm)" }}>{t("nav_docs")}</span>
          <span style={{ color: "var(--border-mid)" }}>/</span>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>{meta.title}</span>
        </div>

        {/* Search button in article view */}
        <button onClick={() => setSearchOpen(true)}
          title={t("doc_search_shortcut")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px",
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            color: "var(--text-muted)", cursor: "pointer",
            fontSize: "var(--font-xs)", fontFamily: "var(--font-mono)",
            borderRadius: 4,
            transition: "border-color var(--dur-fast) var(--ease-smooth), color var(--dur-fast) var(--ease-smooth)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <span>&#8981;</span>
          <span>{t("search")}</span>
        </button>
      </div>

      {/* Fallback language banner */}
      {resolvedLang && lang !== resolvedLang && (
        <div style={{
          marginBottom: 16,
          padding: "8px 14px",
          border: "1px solid var(--amber, #f59e0b)",
          borderLeft: "3px solid var(--amber, #f59e0b)",
          background: "var(--bg-surface)",
          color: "var(--amber, #f59e0b)",
          fontSize: "var(--font-xs)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
          animation: "fade-in 0.3s var(--ease-smooth) both",
        }}>
          {t("doc_fallback_banner", lang.toUpperCase(), resolvedLang.toUpperCase())}
        </div>
      )}

      {/* Highlight terms banner */}
      {highlightTerms.length > 0 && (
        <div style={{
          marginBottom: 16,
          padding: "8px 14px",
          border: "1px solid var(--accent)",
          borderLeft: "3px solid var(--accent)",
          background: "var(--bg-surface)",
          color: "var(--text-muted)",
          fontSize: "var(--font-xs)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
          animation: "fade-in 0.3s var(--ease-smooth) both",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>"{highlightTerms.join(", ")}"</span>
          <span style={{ color: "var(--text-dim)" }}>— {highlightTerms.length === 1 ? "highlighted" : `${highlightTerms.length} terms highlighted`}</span>
          <span onClick={() => setHighlightTerms([])}
            style={{ marginLeft: "auto", cursor: "pointer", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
            &#10005;
          </span>
        </div>
      )}

      <div className="doc-content" dangerouslySetInnerHTML={{ __html: html }} />

      <DocToc headings={headings} isMobile={false} />

      {/* Search modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} lang={lang}
        onSelectArticle={handleSelectArticle} />
    </div>
  );
}
