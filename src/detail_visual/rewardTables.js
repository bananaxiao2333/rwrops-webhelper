/**
 * The reward contract (parser: "extract the whole AngelScript layer").
 *
 * A table is ONE record — `reward_pool`, keyed by the function that declares
 * it — holding two optional halves:
 *
 *   input   the items you hand over (`Resource(...)`) — ticket exchanges only
 *   pools   the weighted tables you draw from (`ScoredResource` literals)
 *
 * Entities never copy a table; they carry pointers to it:
 *
 *   reward_inputs   I am an input  — the tables I can trigger
 *   reward_sources  I am a prize   — the tables that can hand me out
 *
 * Both pointers are `[{ group, source }]`, so every read goes through the
 * `reward_pool` record. This module is that one read path — the old
 * `exchange_prizes` / `exchange_sources` pair described the same tables twice
 * and was dropped by the parser.
 */

/** Resolve a record's pointers into the tables they name (missing ones dropped). */
export function rewardTables(item, data, pointer) {
  const refs = item?.[pointer];
  if (!Array.isArray(refs)) return [];
  const out = [];
  for (const ref of refs) {
    const group = ref?.group;
    if (!group) continue;
    const table = data?.reward_pool?.[group];
    if (!table) continue;
    out.push({ group, source: ref.source || table._source || "", table });
  }
  return out;
}

/** This item's odds in a table: its weight ÷ that pool's total weight. */
export function tableChance(table, itemKey) {
  for (const pool of table?.pools || []) {
    if (!Array.isArray(pool)) continue;
    const total = pool.reduce((s, p) => s + (Number(p?.score) || 0), 0);
    const me = pool.find((p) => p && p.key === itemKey);
    if (me && total > 0) return { prob: (Number(me.score) || 0) / total, count: me.count };
  }
  return null;
}

/** Every weighted pool across the given tables, flattened. */
export function poolsOf(tables) {
  return tables.flatMap((t) => (Array.isArray(t.table?.pools) ? t.table.pools : []));
}

/** A readable name for a table: its humanised title, else the raw group. */
export function tableLabel(table, group) {
  const title = table?.title;
  if (title) return title;
  return String(group || "").replace(/^setup/, "") || String(group || "");
}
