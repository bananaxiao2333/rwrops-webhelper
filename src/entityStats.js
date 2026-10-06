/**
 * Per-type headline stats and display titles.
 *
 * One table drives three surfaces: the list tile, the list's sort chips and
 * the detail-page hero. A field a record lacks is skipped instead of rendered
 * as "—", because the game's XML is genuinely sparse — only 211 of 432 weapons
 * carry `projectile_result_kill_probability` and 241 of 379 vehicles carry
 * `max_health`; the rest are decoration records that have no stats at all.
 */

/* ── value formatters; each returns null to mean "nothing to show" ──
 * The XML encodes "not applicable" as a negative number in several fields
 * (`retrigger_time: -1` on 72 single-shot weapons, `magazine_size: -1`), and
 * `projectile_result_kill_probability` goes above 1 on 17 weapons where it
 * means "always kills" rather than a 501% chance. */
const num = (v) => (typeof v === "number" ? String(Math.round(v * 1000) / 1000) : null);
const pct = (v) => (typeof v !== "number" ? null : v > 1 ? "≥100%" : `${(v * 100).toFixed(0)}%`);
const sec = (v) => (typeof v !== "number" || v < 0 ? null : `${v.toFixed(2)}s`);
const mag = (v) => (v === -1 ? "∞" : num(v));
const pos = (v) => (typeof v === "number" && v < 0 ? null : num(v));
const count = (v) => (Array.isArray(v) && v.length > 0 ? String(v.length) : null);
const str = (v) => (v == null || v === "" ? null : String(v));
const bool = (v) => (v == null ? null : v ? "YES" : "NO");

/* ── [field, label, formatter]; order is display order, so the first three are
 * what the list tile and the detail hero show ── */
export const STATS = {
  weapon: [
    ["projectile_result_kill_probability", "KILL%", pct],
    ["retrigger_time", "RATE", sec],
    ["magazine_size", "MAG", mag],
    ["inventory_price", "PRICE", num],
    ["inventory_encumbrance", "WGT", num],
  ],
  vehicle: [
    ["max_health", "HP", num],
    ["max_speed", "SPD", num],
    ["mass", "KG", num],
  ],
  carry_item: [
    ["inventory_price", "PRICE", num],
    ["inventory_encumbrance", "WGT", pos],
  ],
  projectile: [
    ["class", "CLASS", str],
    ["result_damage", "DMG", num],
    ["result_radius", "BLAST", num],
  ],
  call: [
    ["rounds", "ROUNDS", count],
    ["notify_metagame", "GLOBAL", bool],
  ],
  achievement: [
    ["levels", "LEVELS", count],
    ["criteria_list", "CRITERIA", count],
  ],
  faction: [
    ["soldiers", "SOLDIERS", count],
    ["ranks", "RANKS", count],
  ],
  map_config: [
    ["min_factions", "MIN", num],
    ["max_factions", "MAX", num],
    ["include_layers", "LAYERS", count],
  ],
  command_config: [["permission", "PERM", str]],
  language: [
    ["locale", "LOCALE", str],
    ["texts", "TEXTS", count],
  ],
};

const TYPE_SUFFIX =
  /\.(weapon|vehicle|carry_item|projectile|call|command_config|map_config|faction|achievement|language)$/;

/**
 * Readable title for a record.
 *
 * 527 of 2063 records carry no `name` — every command_config and map_config,
 * 237 of 379 vehicles, 11 of 21 languages. Those used to render as a blank
 * heading over an internal file key like `deco_car1_brown.vehicle`. Fall back
 * to the key with its type suffix and separators turned into words.
 */
export function entityTitle(item) {
  const name = String(item?.name ?? "").trim();
  if (name) return name;
  const key = String(item?.key ?? "").trim();
  if (!key || key === "?") return "—";
  const base = key.split("@")[0].replace(TYPE_SUFFIX, "");
  const words = base.replace(/[_.]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return key;
  // ponytail: a guess from the key, so it reads "Map1 2" where the game would
  // say "Map 1 (alt)". Upgrade path is for the extractor to emit the display
  // name, which only it can know.
  return words.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/* ── the stats a given record actually has, capped at `limit` ── */
export function statCells(type, item, limit = Infinity) {
  const out = [];
  for (const [field, label, fmt] of STATS[type] || []) {
    const value = fmt(item?.[field]);
    if (value == null) continue;
    out.push({ field, label, value, sort: sortKey(item[field]) });
    if (out.length >= limit) break;
  }
  return out;
}

/* Arrays sort by length, booleans as 0/1, so "biggest first" is meaningful for
 * every stat rather than only the numeric ones. */
function sortKey(v) {
  if (Array.isArray(v)) return v.length;
  if (typeof v === "boolean") return v ? 1 : 0;
  return typeof v === "number" ? v : null;
}

export function sortByStat(items, field, dir = "desc") {
  const sign = dir === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = sortKey(a?.[field]);
    const bv = sortKey(b?.[field]);
    if (av === null) return 1; // records without the field always sink
    if (bv === null) return -1;
    return (av - bv) * sign;
  });
}

/* ─────────────────────────────────────────────────────────────────────────
 * Article layer: what a content page leads with and how it labels values.
 * ───────────────────────────────────────────────────────────────────────── */

/* Physical units, so a reader sees "100 m/s" instead of a bare 100 in a table
 * of bare numbers. Anything absent here is a dimensionless count or a name. */
const UNIT = {
  projectile_speed: " m/s",
  max_speed: " m/s",
  max_reverse_speed: " m/s",
  acceleration: " m/s²",
  max_rotation: " °/s",
  max_water_depth: " m",
  radius: " m",
  result_radius: " m",
  respawn_time: " s",
  trigger_time_to_live: " s",
  time_to_live_out_in_the_open: " s",
  player_death_drop_owner_lock_time: " s",
  acknowledge_time: " s",
  sight_range_modifier: "×",
  accuracy_factor: "×",
  sustained_fire_grow_step: "×",
  sustained_fire_diminish_rate: "×",
};
/* A field with a STATS formatter already carries its own unit (`sec` appends
 * "s"), so the UNIT suffix is applied only where the value is otherwise bare. */

/* The ordered set of fields a content page puts in its stat block, standing in
 * for the community wiki's hand-written "击杀几率：46% / 射速：681/min" list.
 * These are the fields a reader compares weapons by; the rest of the record is
 * still on the page, just below the fold. */
export const FACTS = {
  weapon: [
    "projectile_result_kill_probability", "magazine_size", "retrigger_time",
    "projectile_speed", "accuracy_factor", "sustained_fire_grow_step",
    "sustained_fire_diminish_rate", "sight_range_modifier", "can_shoot_standing",
    "suppressed", "projectiles_per_shot", "inventory_price", "inventory_encumbrance",
    "inherit_from",
  ],
  vehicle: [
    "max_health", "max_speed", "mass", "acceleration", "max_reverse_speed",
    "max_rotation", "max_water_depth", "respawn_time", "map_index", "inherit_from",
  ],
  carry_item: [
    "inventory_price", "inventory_encumbrance", "slot",
    "time_to_live_out_in_the_open", "player_death_drop_owner_lock_time",
    "model_mesh", "inherit_from",
  ],
  projectile: [
    "class", "result_class", "result_damage", "result_radius", "result_push",
    "trigger_class", "trigger_time_to_live", "pulldown_in_air", "radius",
    "slot", "inherit_from",
  ],
  call: ["notify_metagame", "rounds", "acknowledge_time", "inherit_from"],
  achievement: ["levels", "criteria_list"],
  faction: [
    "soldiers", "ranks", "radio_queue_size", "supporter_high_skinpack_xp",
    "map_view_color_intensity", "firstnames_file", "lastnames_file", "inherit_from",
  ],
  map_config: ["min_factions", "max_factions", "custom_bases", "heightmap", "mask_image"],
  command_config: ["command", "permission"],
  language: ["locale", "encoding", "font_key"],
};

/* `weapon.class` is a bare integer (0/2/4) and tells a reader nothing, so the
 * game's own `tags` are the only usable taxonomy. `denied_in_penalty` is a rule
 * flag, not a category, hence the allow-list. */
const CATEGORY_TAGS = [
  "assault", "cqb", "sniper", "machine gun", "machinegun", "shotgun", "bazooka",
  "mortar", "engineer", "stealth", "medikit", "wrench", "bandage", "bodyguard",
  "bodyguards", "tank", "apc", "helicopter", "plane", "boat", "car", "truck",
];

/* Synonyms the game spells two ways; without this the weapon list renders two
 * separate "Machine Gun" headings. */
const TAG_ALIAS = { machinegun: "machine gun", bodyguards: "bodyguard" };

export function entityCategory(item) {
  const names = (item?.tags || []).map((t) => (typeof t === "string" ? t : t?.name)).filter(Boolean);
  const found = names.find((n) => CATEGORY_TAGS.includes(String(n).toLowerCase()));
  if (!found) return null;
  const lower = String(found).toLowerCase();
  return TAG_ALIAS[lower] ?? lower;
}

const FORMATTERS = Object.fromEntries(
  Object.values(STATS).flat().map(([field, , fmt]) => [field, fmt]),
);

/* Stat-block rows: the fields this record actually has, formatted and labelled
 * by XML field name so the page can look up a translated label for each.
 * Booleans come back as {kind:"bool"} so the caller can render a localized
 * yes/no instead of the 0/1 the raw record stores. */
export function detailFacts(type, item, limit = Infinity) {
  const out = [];
  for (const field of FACTS[type] || []) {
    const raw = item?.[field];
    if (raw === undefined || raw === null) continue;
    if (typeof raw === "boolean") {
      out.push({ field, value: raw ? "yes" : "no", kind: "bool" });
    } else {
      const fmt = FORMATTERS[field];
      let value = fmt ? fmt(raw) : raw;
      if (value == null) continue;
      if (typeof value === "number") value = Math.round(value * 1000) / 1000;
      out.push({
        field,
        value: `${value}${typeof value === "number" ? UNIT[field] || "" : ""}`,
        kind: "text",
      });
    }
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Turn an array of records into a table spec, or null if it can't be one.
 *
 * The old page printed these as `[0] 键 fire / 文件引用 m249_shot.wav [1] …`,
 * which is the "猎奇" part of a raw dump: `animations`, `sounds`, `stances`,
 * `ranks` and `soldiers` are all genuinely tabular. One level of nesting is
 * flattened into dotted columns (`rank.title`); nested arrays are dropped,
 * because a cell that is itself a list is what the raw view is for.
 */
export function tableFor(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 120) return null;
  const objects = value.filter((v) => v && typeof v === "object" && !Array.isArray(v));
  if (objects.length !== value.length) return null;

  const flat = objects.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith("_")) continue;
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        for (const [k2, v2] of Object.entries(v)) {
          if (k2.startsWith("_")) continue;
          if (v2 !== null && typeof v2 === "object") continue;
          out[`${k}.${k2}`] = v2;
        }
      } else if (v === null || typeof v !== "object") {
        out[k] = v;
      }
    }
    return out;
  });

  const columns = [];
  for (const row of flat) {
    for (const k of Object.keys(row)) if (!columns.includes(k)) columns.push(k);
  }
  if (columns.length === 0 || columns.length > 8) return null;

  return { columns, rows: flat.map((r) => columns.map((c) => r[c])) };
}

/* True when a value can be shown inline on the page rather than in the raw
 * block: a scalar, or an array the table builder can handle. */
export function isInlineValue(value) {
  if (value === null) return true;
  if (typeof value !== "object") return true;
  return tableFor(value) !== null;
}

/* Fields shown in the stat block or as a table; everything else is "other". */
export function factFields(type) {
  return FACTS[type] || [];
}
