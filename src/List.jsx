import { Fragment, useMemo, useState } from "react";
import { useI18n } from "./i18n.jsx";
import { useItemIcon, hasAsset, useAssetIndexReady, iconFieldFor } from "./assetLoader.jsx";
import { STATS, entityCategory, entityTitle, sortByStat, statCells } from "./entityStats.js";
import { buildGroups, collapseToGroups, GROUPED_TYPES } from "./itemGroups.js";
import InboxOutlined from "@mui/icons-material/InboxOutlined";

const TYPE_COLOR = {
  vehicle: "#6b8ca4",
  weapon: "#f59e0b",
  carry_item: "#8899aa",
  projectile: "#ef4444",
  call: "#8b5cf6",
  achievement: "#22c55e",
  faction: "#f97316",
  map_config: "#06b6d4",
  command_config: "#ec4899",
  language: "#14b8a6",
};

/* ── Tile: icon, readable title, and this type's real stats ──
 * It used to show the entity's internal key (`bunny_mgl.weapon`) and a fake
 * "heat" tint derived from averaged raw fields, so nothing on screen told a
 * reader what the thing was or let them compare two of them. */
function Tile({ item, type, color, onClick, isMobile, ambiguous, stateCount = 1 }) {
  const { value: uiValue, t } = useI18n();
  const iconUrl = useItemIcon(item);
  const [broken, setBroken] = useState(false);
  const stats = statCells(type, item, isMobile ? 2 : 4);
  const isAI = item.key?.toLowerCase().includes("_ai.") || item.name?.toLowerCase().includes("_ai");

  return (
    <button
      type="button"
      onClick={onClick}
      title={item.key}
      className="wiki-tile"
      style={{
        "--tile-accent": color,
        gridTemplateColumns: `${isMobile ? 28 : 40}px minmax(0, 1fr)`,
        padding: isMobile ? "6px 8px" : "8px 10px",
        gap: isMobile ? 6 : 10,
      }}
    >
      <span className="wiki-tile-icon">
        {iconUrl && !broken
          ? <img src={iconUrl} alt="" loading="lazy" onError={() => setBroken(true)} />
          : <span className="wiki-tile-icon-blank" />}
      </span>

      <span className="wiki-tile-body">
        <span className="wiki-tile-title" style={{ fontSize: isMobile ? "var(--font-sm)" : "var(--font-md)" }}>
          {isAI && <span className="wiki-tile-ai">AI</span>}
          {uiValue(entityTitle(item))}
          {/* One card can stand for several states of the same thing, so say so
              — otherwise the count looks like records went missing. */}
          {stateCount > 1 && (
            <span className="wiki-tile-states" title={t("state_count_hint")}>
              {stateCount}&#8202;{t("states")}
            </span>
          )}
          {ambiguous && <span className="wiki-tile-key">{item.key}</span>}
        </span>
        {stats.length > 0 && (
          <span className="wiki-tile-stats">
            {stats.map((s) => (
              <span key={s.field} className="wiki-tile-stat">
                <b>{s.label}</b>
                {s.value}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

/* ── List ── */
export default function List({ data, type, searchText, isMobile, priceFilter, exchangeSourceFilter, exchangePrizeFilter, groupStates = true, sinkIconless = true }) {
  const { value: uiValue, tag: uiTag, t } = useI18n();
  const items = useMemo(() => Object.values(data), [data]);
  const color = TYPE_COLOR[type] || "#556677";
  const statFields = useMemo(() => (STATS[type] || []).map(([field]) => field), [type]);
  const iconReady = useAssetIndexReady();

  const [sortState, setSortState] = useState(null);
  /* Default to the alphabetical index: leading with "highest kill chance"
   * puts joke weapons and modded outliers at the top of every list, which is
   * a bad first screen. Every stat column is one click away. */
  const sort = useMemo(() => {
    if (sortState && (sortState === "name" || sortState === "key" || statFields.includes(sortState))) {
      return sortState;
    }
    return "name";
  }, [sortState, statFields]);

  const sortOptions = useMemo(() => {
    const cols = STATS[type] || [];
    const opts = [{ key: "name", label: t("name_label") }, { key: "key", label: t("key_label") }];
    for (const [field, label] of cols) opts.push({ key: field, label });
    return opts;
  }, [type, t]);

  const filtered = useMemo(() => {
    let result = items;
    if (priceFilter) {
      result = result.filter(i => i.inventory_price !== undefined || i.inventory?.price !== undefined);
    }
    if (exchangeSourceFilter) {
      result = result.filter(i => i.exchange_sources && i.exchange_sources.length > 0);
    }
    if (exchangePrizeFilter) {
      result = result.filter(i => i.exchange_prizes && i.exchange_prizes.length > 0);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(i => {
        const rawName = String(i.name || "").toLowerCase();
        const transName = String(uiValue(entityTitle(i))).toLowerCase();
        const rawKey = String(i.key || "").toLowerCase();
        return rawName.includes(q) || transName.includes(q) || rawKey.includes(q);
      });
    }
    return result;
  }, [items, searchText, uiValue, priceFilter, exchangeSourceFilter, exchangePrizeFilter]);

  const sorted = useMemo(() => {
    if (sort === "name") return [...filtered].sort((a, b) => entityTitle(a).localeCompare(entityTitle(b)));
    if (sort === "key") return [...filtered].sort((a, b) => String(a.key || "").localeCompare(String(b.key || "")));
    return sortByStat(filtered, sort);
  }, [filtered, sort]);

  /* Alternate states of one thing are one entry, not several. Collapsed first,
   * then the icon partition below — a group renders its representative's icon,
   * so partitioning on any other member would leave an icon-less card in the
   * top half. */
  const collapsed = useMemo(() => {
    if (!groupStates || !GROUPED_TYPES.has(type)) {
      return sorted.map((item) => ({ key: item.key, item, states: [item.key] }));
    }
    const byKey = Object.fromEntries(sorted.map((i) => [i.key, i]));
    return collapseToGroups(sorted, buildGroups(byKey, type));
  }, [sorted, type, groupStates]);

  /* Records with no icon sink to the bottom, so a list leads with the entries a
   * reader can actually recognise. It is a stable partition *after* the chosen
   * sort, so the sort still holds inside each half. Held back until the asset
   * index arrives — before that every record looks icon-less and the list would
   * shuffle for no reason. */
  const entries = useMemo(() => {
    if (!sinkIconless || !iconReady) return collapsed;
    const withIcon = [];
    const withoutIcon = [];
    for (const entry of collapsed) {
      (hasAsset(iconFieldFor(entry.item)) ? withIcon : withoutIcon).push(entry);
    }
    return withoutIcon.length === 0 ? collapsed : [...withIcon, ...withoutIcon];
  }, [collapsed, sinkIconless, iconReady]);

  /* Group by the game's own `tags`, which is the only usable taxonomy the data
   * has — `weapon.class` is a bare integer. */
  const groups = useMemo(() => {
    const buckets = new Map();
    for (const entry of entries) {
      const key = entityCategory(entry.item) ?? "";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(entry);
    }
    const rest = buckets.get("")?.length ?? 0;
    /* Heading every group only helps when the categories actually cover the
     * list; 323 vehicles with 307 uncategorised reads better flat. */
    if (buckets.size < 2 || rest > entries.length * 0.5) return null;
    return [...buckets.entries()].sort((a, b) => {
      if (a[0] === "") return 1;
      if (b[0] === "") return -1;
      return b[1].length - a[1].length;
    });
  }, [entries]);

  /* Several records share a display name — three different vehicles are all
   * called "Leopold II Tank". Those rows carry their key so the list stays
   * navigable; unique names don't need it. */
  const ambiguous = useMemo(() => {
    const seen = new Map();
    for (const item of items) {
      const title = entityTitle(item);
      seen.set(title, (seen.get(title) ?? 0) + 1);
    }
    return new Set([...seen].filter(([, n]) => n > 1).map(([title]) => title));
  }, [items]);

  const minColWidth = isMobile ? 150 : 260;
  const barGap = isMobile ? 4 : 8;
  const filterActive = priceFilter || exchangeSourceFilter || exchangePrizeFilter;
  const filterLabels = [
    priceFilter && t("filter_only_priced"),
    exchangeSourceFilter && t("filter_exchange_source"),
    exchangePrizeFilter && t("filter_exchange_prize"),
  ].filter(Boolean);

  return (
    <div className="wiki-list">
      {/* Toolbar: count on the left, sort fields on the right */}
      <div className="wiki-bar" style={{ gap: barGap, padding: isMobile ? "4px 6px 3px" : "6px 12px 4px" }}>
        <span className="wiki-bar-dot" style={{ background: color, width: isMobile ? 7 : 10, height: isMobile ? 7 : 10 }} />
        {!isMobile && <span style={{ color: "var(--text-muted)" }}>{t(type)}</span>}
        <span style={{ color: "var(--border-mid)" }}>|</span>
        {/* Cards / records — they differ once state groups collapse. */}
        <span style={{ color: "var(--accent)" }} title={t("state_count_hint")}>
          {entries.length}/{items.length}
        </span>

        <span style={{ flex: 1 }} />

        {sortOptions.map((opt, i) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSortState(opt.key)}
            aria-pressed={sort === opt.key}
            className="wiki-sort"
            style={{ marginLeft: i > 0 ? (isMobile ? 2 : 4) : 0 }}
            title={opt.label}
          >
            {isMobile ? opt.label.slice(0, 6) : opt.label}
          </button>
        ))}
      </div>

      <div className="wiki-scroll" style={{ margin: filterActive ? (isMobile ? 3 : 4) : 0, border: filterActive ? "1px solid var(--accent-dim)" : "none" }}>
        {filterActive && (
          <div className="wiki-filter-flag" style={{ padding: isMobile ? "1px 5px" : "2px 8px", gap: isMobile ? 2 : 6 }}>
            <span style={{ fontWeight: 600 }}>{t("filter_label")}</span>
            {filterLabels.map((l) => <span key={l} style={{ color: "var(--text-muted)" }}>{l}</span>)}
          </div>
        )}

        {entries.length === 0 ? (
          <div className="wiki-empty">
            <InboxOutlined style={{ fontSize: 36, opacity: 0.4 }} />
            <span>{t("empty_list")}</span>
            {priceFilter && <span style={{ fontSize: "var(--font-xs)", color: "var(--text-dim)" }}>({t("filter_only_priced")})</span>}
          </div>
        ) : (
          <div className="wiki-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))`, gap: isMobile ? 2 : 4, padding: isMobile ? "3px 4px" : "4px 6px" }}>
            {(groups ?? [["", entries]]).map(([cat, groupEntries]) => (
              <Fragment key={cat || "__rest"}>
                {groups && (
                  <h2 className="wiki-group">
                    {cat ? uiTag(cat.replace(/\s+/g, "_")) : t("other")}
                    <span className="wiki-group-count">{groupEntries.length}</span>
                  </h2>
                )}
                {groupEntries.map((entry) => (
                  <Tile
                    key={entry.key}
                    item={entry.item}
                    type={type}
                    color={color}
                    isMobile={isMobile}
                    stateCount={entry.states.length}
                    ambiguous={ambiguous.has(entityTitle(entry.item))}
                    onClick={() => { window.history.pushState(null, "", `/params/${type}/${entry.key}`); window.dispatchEvent(new PopStateEvent("popstate")); }}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
