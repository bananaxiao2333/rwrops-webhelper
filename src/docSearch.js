/* ───────────────────────────────────────────────────
 *  docSearch.js  —  Docs 全文搜索引擎
 *  · 零依赖，纯 JS
 *  · 构建时索引所有文章段落（跨语言）
 *  · 查询时：首选语言优先 → 其他语言作为补充
 *  · 返回带高亮摘要的排序结果
 * ─────────────────────────────────────────────────── */

// ── 工具：去除 markdown / HTML / 图片标签 ──
function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, "")           // 标题 #
    .replace(/\*\*(.+?)\*\*/g, "$1")       // **bold**
    .replace(/\*(.+?)\*/g, "$1")           // *italic*
    .replace(/`(.+?)`/g, "$1")             // `code`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [link](url)
    .replace(/!\[.*?\]\([^)]+\)/g, "")     // ![img](url)
    .replace(/<[^>]+>/g, "")               // HTML tags
    .replace(/[>\-_*|]/g, " ")             // 残留符号 → 空格
    .replace(/\s+/g, " ")
    .trim();
}

// ── 工具：把文本拆成段落（按空行） ──
function splitParagraphs(body) {
  return body
    .split(/\n{2,}/)
    .map((p) => stripMarkdown(p.trim()))
    .filter((p) => p.length > 10); // 丢弃太短的
}

// ── 工具：分词（支持中英文混合） ──
function tokenize(text) {
  // 中文：按字切；英文/数字：按空格+标点切
  return text
    .toLowerCase()
    .replace(/[\u4e00-\u9fff]/g, " $& ")
    .split(/[^a-z0-9\u4e00-\u9fff]+/)
    .filter(Boolean);
}

// ── 索引缓存 ──
let _index = null;
let _indexPromise = null;

/**
 * 构建搜索索引
 * @param {Function} loadArticle - (slug, lang) => Promise<{body, meta}>
 *   由 docs.js 提供，负责加载原文并剥离 frontmatter
 */
export async function buildSearchIndex(loadArticle) {
  if (_indexPromise) return _indexPromise;
  _indexPromise = (async () => {
    // 从 docs.js 动态导入模块获取 slug 列表（避免循环依赖）
    const { getArticleSlugs } = await import("./docs.js");
    const slugs = getArticleSlugs(); // e.g. ["rwr-guide"]
    const articles = [];

    for (const slug of slugs) {
      // 每个 slug 可能对应多种语言
      const files = import.meta.glob("../docs/articles/*.{md,mdx}", {
        query: "?raw", import: "default", eager: false,
      });

      for (const [key, loader] of Object.entries(files)) {
        const base = key.replace("../docs/articles/", "");
        const dot = base.lastIndexOf(".");
        const stem = base.slice(0, dot);
        const parts = stem.split(".");
        if (parts.length < 2) continue;
        const lang = parts.pop();
        const s = parts.join(".");
        if (s !== slug) continue;

        try {
          const raw = await loader();
          let cleaned = raw
            .replace(/^import\s+.*?;\s*\n?/m, "")   // 去掉 import 行
            .replace(/^\ufeff/, "")
            .replace(/\r\n/g, "\n");

          // 解析 YAML frontmatter
          const fmMatch = cleaned.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
          let title = slug;
          let description = "";
          let body = cleaned;
          if (fmMatch) {
            body = fmMatch[2];
            for (const line of fmMatch[1].split("\n")) {
              const kv = line.match(/^(\w+):\s*(.*)/);
              if (kv) {
                if (kv[1] === "title") title = kv[2].replace(/^['"]|['"]$/g, "").trim();
                if (kv[1] === "description") description = kv[2].replace(/^['"]|['"]$/g, "").trim();
              }
            }
          }

          // 去图片 base64 占位符，避免索引巨大无用数据
          body = body.replace(/\{images\.\w+\}/g, "");
          body = body.replace(/data:image\/[^"]+/g, "");

          const chunks = splitParagraphs(body);

          articles.push({
            slug,
            lang,
            title,
            description,
            chunks,       // 每个元素是一段纯文本
          });
        } catch { /* 跳过无法解析的文件 */ }
      }
    }
    _index = articles;
    return _index;
  })();
  return _indexPromise;
}

/**
 * 搜索文章
 * @param {string} query - 用户输入的查询
 * @param {string} preferredLang - 首选语言代码 (e.g. "cn", "en")
 * @returns {Array<{slug, lang, title, snippet, score}>} - 排序后的结果
 */
export function searchArticles(query, preferredLang = "en") {
  if (!_index) return [];
  const q = query.trim();
  if (!q) return [];

  const queryTokens = tokenize(q);
  const queryLower = q.toLowerCase();

  const results = [];

  for (const article of _index) {
    let bestScore = 0;
    let bestSnippet = "";

    // 标题匹配加权
    const titleTokens = tokenize(article.title);
    const titleMatchCount = queryTokens.filter((t) =>
      titleTokens.some((tt) => tt.includes(t))
    ).length;
    const titleBoost = titleMatchCount / Math.max(queryTokens.length, 1) * 30;

    // 描述匹配
    const descLower = (article.description || "").toLowerCase();
    const descMatch = queryTokens.filter((t) => descLower.includes(t)).length;
    const descBoost = descMatch * 5;

    // 段落匹配（核心评分）
    for (let ci = 0; ci < article.chunks.length; ci++) {
      const chunk = article.chunks[ci];
      const chunkLower = chunk.toLowerCase();
      let score = 0;

      // 精确短语匹配（最高权重）
      if (chunkLower.includes(queryLower)) {
        score += 50;
      }

      // 每个 token 匹配
      for (const token of queryTokens) {
        if (chunkLower.includes(token)) {
          score += 10;
          // 词出现多次加分
          let pos = chunkLower.indexOf(token);
          let occurrences = 0;
          while (pos !== -1 && occurrences < 5) {
            occurrences++;
            pos = chunkLower.indexOf(token, pos + 1);
          }
          score += Math.min(occurrences - 1, 3) * 3;
        }
      }

      // 所有 token 都出现的额外奖励
      const allPresent = queryTokens.every((t) => chunkLower.includes(t));
      if (allPresent && queryTokens.length > 1) score += 20;

      // 邻近加分：token 之间距离越近分越高
      if (allPresent && queryTokens.length > 1) {
        const positions = queryTokens.map((t) => chunkLower.indexOf(t));
        const span = Math.max(...positions) - Math.min(...positions);
        score += Math.max(0, (100 - span) / 10);
      }

      if (score > bestScore) {
        bestScore = score;
        bestSnippet = makeSnippet(chunk, chunkLower, queryTokens, queryLower);
      }
    }

    const totalScore = bestScore + titleBoost + descBoost;
    if (totalScore > 0) {
      results.push({
        slug: article.slug,
        lang: article.lang,
        title: article.title,
        description: article.description,
        snippet: bestSnippet,
        score: totalScore,
      });
    }
  }

  // 排序：首选语言优先，同语言内按分数降序
  results.sort((a, b) => {
    const aPref = a.lang === preferredLang ? 1 : 0;
    const bPref = b.lang === preferredLang ? 1 : 0;
    if (aPref !== bPref) return bPref - aPref;
    return b.score - a.score;
  });

  return results.slice(0, 20);
}

/**
 * 生成带高亮标记的摘要片段
 * @param {string} chunkRaw - 原始段落（未小写化）
 * @param {string} chunkLower - 小写化版本
 * @param {string[]} queryTokens - 查询词
 * @param {string} queryLower - 查询短语（小写）
 * @returns {string} HTML 片段，匹配词包裹在 <mark> 中
 */
function makeSnippet(chunkRaw, chunkLower, queryTokens, queryLower) {
  const maxLen = 140;
  let text = chunkRaw;

  // 找到第一个匹配位置作为截取中心
  let bestPos = -1;
  for (const token of queryTokens) {
    const pos = chunkLower.indexOf(token);
    if (pos !== -1 && (bestPos === -1 || pos < bestPos)) {
      bestPos = pos;
    }
  }

  if (text.length > maxLen) {
    const start = Math.max(0, bestPos - 50);
    const end = Math.min(text.length, start + maxLen);
    text = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  }

  // 高亮：先用正则匹配 queryTokens 中的每个词 + 整个查询短语
  // 为了简单，逐个替换为 <mark>
  let result = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 收集所有需要高亮的区间（按位置排序，避免嵌套/重叠）
  const marks = [];
  // 先匹配完整短语
  const phraseLower = queryLower;
  let idx = 0;
  const lowerResult = result.toLowerCase();
  while ((idx = lowerResult.indexOf(phraseLower, idx)) !== -1) {
    marks.push({ start: idx, end: idx + phraseLower.length });
    idx += phraseLower.length;
  }
  // 再匹配单个 token
  for (const token of queryTokens) {
    if (token === queryLower) continue; // 已被短语覆盖
    let tIdx = 0;
    while ((tIdx = lowerResult.indexOf(token, tIdx)) !== -1) {
      // 检查是否与已有区间重叠
      const overlap = marks.some(
        (m) => tIdx < m.end && tIdx + token.length > m.start
      );
      if (!overlap) {
        marks.push({ start: tIdx, end: tIdx + token.length });
      }
      tIdx += token.length;
    }
  }

  // 排序并去重
  marks.sort((a, b) => a.start - b.start);

  // 合并重叠/相邻区间
  const merged = [];
  for (const m of marks) {
    if (merged.length === 0) {
      merged.push({ ...m });
    } else {
      const last = merged[merged.length - 1];
      if (m.start <= last.end + 1) {
        last.end = Math.max(last.end, m.end);
      } else {
        merged.push({ ...m });
      }
    }
  }

  // 从后往前插入 <mark> 标签以免破坏前面的索引
  let html = result;
  for (let i = merged.length - 1; i >= 0; i--) {
    const { start, end } = merged[i];
    html = html.slice(0, start) + "<mark>" + html.slice(start, end) + "</mark>" + html.slice(end);
  }

  return html;
}

/**
 * 获取索引元信息
 * @returns {{ articleCount: number, langCount: number } | null}
 */
export function getIndexStats() {
  if (!_index) return null;
  const langs = new Set(_index.map((a) => a.lang));
  return { articleCount: _index.length, langCount: langs.size };
}
