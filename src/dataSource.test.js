/* Self-check for dataSource.indexRecords — `npm test`.
 *
 * The merge rule here is what keeps the game-data translation stage fed: the
 * same (type, key) is often split across complementary files rather than
 * duplicated, and taking only one of them empties the language table. */
import assert from "node:assert/strict";
import { indexRecords, SCHEMA_VERSION } from "./dataSource.js";

const pack = (records) => indexRecords({ schema: SCHEMA_VERSION, counts: {}, records });

/* The real shape: metadata in one file, 911 translation strings in another. */
const lang = pack([
  { type: "language", key: "cn", id: "ch", name: "Chinese", encoding: "utf-8", _source: "languages/cn/language.xml", _id: "language:cn@a" },
  { type: "language", key: "cn", texts: [{ key: "Private", translation: "列兵" }], _source: "languages/cn/misc_text_vanilla.xml", _id: "language:cn@b" },
]);
assert.equal(lang.language.cn.texts.length, 1, "the translations must survive the merge");
assert.equal(lang.language.cn.name, "Chinese", "and so must the metadata from the other file");
assert.equal(lang.language.cn._variants.length, 2, "both definitions stay reachable");

/* Richest record first, others only fill gaps — no field is silently replaced. */
const fac = pack([
  { type: "faction", key: "Greenbelts", name: "Greenbelts", color: [0, 1, 0], _source: "factions/all_factions.xml" },
  { type: "faction", key: "Greenbelts", name: "OVERRIDE", radio_queue_size: 3, _source: "factions/green.xml" },
]);
assert.equal(fac.faction.Greenbelts.name, "Greenbelts", "the richer definition wins a conflict");
assert.equal(fac.faction.Greenbelts.radio_queue_size, 3, "the poorer one still contributes");

/* Longer array wins; internal keys never leak into the merged entity. */
const arr = pack([
  { type: "weapon", key: "w", tags: [{ name: "a" }], _source: "x" },
  { type: "weapon", key: "w", tags: [{ name: "a" }, { name: "b" }], _source: "y" },
]);
assert.equal(arr.weapon.w.tags.length, 2);
assert.equal(arr.weapon.w._id, undefined);

/* Distinct keys stay distinct, and `_variants` is always present. */
const two = pack([
  { type: "weapon", key: "a", _source: "x" },
  { type: "weapon", key: "b", _source: "x" },
]);
assert.deepEqual(Object.keys(two.weapon).sort(), ["a", "b"]);
assert.equal(two.weapon.a._variants.length, 1);

/* A record with no key falls back to its `_id`, as before. */
const byId = pack([{ type: "achievement", _id: "achievement:x@y", _source: "y" }]);
assert.ok(byId.achievement["achievement:x@y"]);

assert.throws(() => indexRecords({ schema: 99 }), /Unsupported result\.json schema/);
console.log("dataSource: ok");
