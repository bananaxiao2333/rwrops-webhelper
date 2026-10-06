/* Self-check for entityStats.js — `npm test`. Plain node:assert, no framework. */
import assert from "node:assert/strict";
import { entityTitle, statCells, sortByStat, STATS } from "./entityStats.js";

/* entityTitle: real name wins, key is humanized when there isn't one. */
assert.equal(entityTitle({ name: "M249", key: "m249.weapon" }), "M249");
assert.equal(entityTitle({ key: "deco_car1_brown.vehicle" }), "Deco Car1 Brown");
assert.equal(entityTitle({ key: "modtest" }), "Modtest");
assert.equal(entityTitle({ key: "lobby" }), "Lobby");
assert.equal(entityTitle({ key: "aa-12.weapon" }), "Aa-12");
assert.equal(entityTitle({ key: "a10_gun_run.call", name: "  " }), "A10 Gun Run");
assert.equal(entityTitle({ key: "?" }), "—");
assert.equal(entityTitle({}), "—");
assert.equal(entityTitle({ name: " ", key: "" }), "—");

/* statCells: missing fields are skipped, limit caps the list, -1 magazine is ∞. */
const m249 = {
  projectile_result_kill_probability: 0.58,
  retrigger_time: 0.077,
  magazine_size: -1,
  inventory_price: 249,
  projectile_speed: 100,
};
assert.deepEqual(
  statCells("weapon", m249).map((c) => `${c.label}=${c.value}`),
  ["KILL%=58%", "RATE=0.08s", "MAG=∞", "PRICE=249"],
);
assert.deepEqual(statCells("weapon", m249, 2).map((c) => c.label), ["KILL%", "RATE"]);
assert.deepEqual(statCells("weapon", { key: "deco.weapon" }), [], "no stats → empty, not dashes");
assert.deepEqual(statCells("nope", { a: 1 }), []);
assert.equal(statCells("vehicle", { max_health: 3 })[0].value, "3");

/* The XML's sentinel values must not be printed as if they were measurements:
 * kill probability above 1 means "always kills", and a negative retrigger
 * time means the weapon has no re-trigger at all. */
const kp = (v) => statCells("weapon", { projectile_result_kill_probability: v })[0]?.value;
assert.equal(kp(0.35), "35%");
assert.equal(kp(1), "100%");
assert.equal(kp(5.01), "≥100%");
assert.deepEqual(statCells("weapon", { retrigger_time: -1 }), [], "negative rate is N/A, not -1.00s");
assert.deepEqual(statCells("carry_item", { inventory_encumbrance: -1 }), []);

/* sortByStat: biggest first, records lacking the field sink to the bottom. */
const rows = [{ max_health: 3 }, { max_health: 10 }, { key: "no-stats" }];
assert.deepEqual(
  sortByStat(rows, "max_health").map((r) => r.max_health ?? null),
  [10, 3, null],
);
assert.deepEqual(sortByStat(rows, "max_health", "asc").map((r) => r.max_health ?? null), [3, 10, null]);

/* Every STATS entry must be [field, label, formatter] — a typo here silently
 * blanks a whole column, so assert the shape rather than trusting the table. */
for (const [type, cols] of Object.entries(STATS)) {
  for (const col of cols) {
    assert.equal(col.length, 3, `${type} column ${JSON.stringify(col)} is not [field,label,fmt]`);
    assert.equal(typeof col[0], "string");
    assert.equal(typeof col[1], "string");
    assert.equal(typeof col[2], "function");
  }
}

/* ── article layer ── */
import { detailFacts, entityCategory, isInlineValue, tableFor, FACTS, STATS as S } from "./entityStats.js";

/* detailFacts: unit suffixes and localized-boolean markers. */
const f = (type, item) => Object.fromEntries(detailFacts(type, item).map((x) => [x.field, x]));
assert.equal(f("weapon", m249).projectile_speed.value, "100 m/s");
assert.equal(f("weapon", m249).retrigger_time.value, "0.08s", "must not double the unit suffix");
assert.equal(f("weapon", m249).magazine_size.value, "∞");
assert.deepEqual(
  f("weapon", { suppressed: true, can_shoot_standing: false }),
  { suppressed: { field: "suppressed", value: "yes", kind: "bool" },
    can_shoot_standing: { field: "can_shoot_standing", value: "no", kind: "bool" } },
);
assert.deepEqual(detailFacts("weapon", {}), [], "no facts → no rows");
assert.deepEqual(detailFacts("nope", { a: 1 }), []);

/* tableFor: flat records tabulate; one nesting level is flattened; arrays are
 * dropped rather than blocking the table; over-wide and over-long give up. */
assert.deepEqual(tableFor([{ key: "fire", fileref: "a.wav" }]), {
  columns: ["key", "fileref"], rows: [["fire", "a.wav"]],
});
assert.deepEqual(
  tableFor([{ xp: 0, hud_icon: { filename: "r0.png" } }]).columns,
  ["xp", "hud_icon.filename"],
);
assert.deepEqual(
  tableFor([{ class: "spawn", vehicles: [{ key: "a" }] }]),
  { columns: ["class"], rows: [["spawn"]] },
  "a nested array is dropped, not fatal",
);
assert.equal(tableFor([{ a: { b: { c: 1 } } }]), null, "two levels down stays raw");
assert.equal(tableFor([]), null);
assert.equal(tableFor([1, 2]), null);
assert.equal(tableFor(Array.from({ length: 200 }, (_, i) => ({ i }))), null, "too long to be a table");
assert.equal(tableFor([Object.fromEntries("abcdefghi".split("").map((c) => [c, 1]))]), null);

assert.equal(isInlineValue(5), true);
assert.equal(isInlineValue([{ a: 1 }]), true);
assert.equal(isInlineValue([{ a: { b: { c: 1 } } }]), false);
assert.equal(isInlineValue({ nope: true }), false, "a bare object is not a table");

/* entityCategory picks the game tag, ignoring pure rule flags. */
assert.equal(entityCategory({ tags: [{ name: "denied_in_penalty" }, { name: "assault" }] }), "assault");
assert.equal(entityCategory({ tags: [{ name: "tank" }] }), "tank");
assert.equal(entityCategory({ tags: [{ name: "metal_heavy" }] }), null);
assert.equal(entityCategory({}), null);

/* The two tables must stay in step: a list column with no FACTS entry, or a
 * FACTS field outside the list's formatter table, silently blanks a cell. */
for (const type of Object.keys(FACTS)) {
  for (const field of FACTS[type]) {
    assert.ok(typeof field === "string" && field.length, `${type}: bad field ${field}`);
  }
  assert.ok(S[type] === undefined || FACTS[type].length > 0);
}

console.log("entityStats: ok");
