/* Self-check for itemGroups.js — `npm test`. Plain node:assert, no framework.
 *
 * The relations are the whole point: 131 of 431 weapons and 450 of 576 carry
 * items are alternate states of something else, so getting the representative
 * or the membership wrong shows a reader a different thing than the game does.
 */
import assert from "node:assert/strict";
import { buildGroups, collapseToGroups, GROUPED_TYPES } from "./itemGroups.js";

const weapon = (next) => ({ next_in_chains: next });
const gear = (transform) => ({ transform_on_consume: transform });

/* ── buildGroups: which types have a state model ─────────────────────────── */

assert.ok(GROUPED_TYPES.has("weapon") && GROUPED_TYPES.has("carry_item"));
assert.equal(GROUPED_TYPES.has("vehicle"), false, "vehicles have no state relation");

/* A type with no model returns null so the caller can skip the work entirely. */
assert.equal(buildGroups({ "deco.vehicle": {} }, "vehicle"), null);
assert.equal(buildGroups({ "a.weapon": weapon([]) }, "nope"), null);
assert.equal(buildGroups(null, "weapon"), null);

/* ── weapon configurations ───────────────────────────────────────────────── */

/* The link is mutual, so neither is "pristine" — fall back to the first key
 * lexicographically, which puts `ac556.weapon` ahead of `ac556_b.weapon`
 * because "." sorts before "_". */
{
  const { groupOf, groups } = buildGroups(
    {
      "ac556.weapon": weapon(["ac556_b.weapon"]),
      "ac556_b.weapon": weapon(["ac556.weapon"]),
    },
    "weapon",
  );
  assert.equal(groupOf.get("ac556_b.weapon"), "ac556.weapon");
  assert.deepEqual(groups.get("ac556.weapon"), ["ac556.weapon", "ac556_b.weapon"]);
}

/* A link object rather than a bare string is the other shape the extractor
 * emits; both must resolve to the same key. */
{
  const { groups } = buildGroups(
    { "a.weapon": weapon([{ key: "b.weapon" }]), "b.weapon": weapon([{ key: "a.weapon" }]) },
    "weapon",
  );
  assert.equal(groups.get("a.weapon").length, 2);
}

/* ── carry_item degradation chains ───────────────────────────────────────── */

/* The representative is the form nothing turns into — `vest1`, not `vest1_3`. */
{
  const { groupOf, groups } = buildGroups(
    { vest1: gear("vest1_2"), vest1_2: gear("vest1_3"), vest1_3: gear(null) },
    "carry_item",
  );
  assert.equal(groupOf.get("vest1_3"), "vest1", "every member maps to the pristine form");
  assert.deepEqual(groups.get("vest1"), ["vest1", "vest1_2", "vest1_3"]);
}

/* A 46-long chain is one group, not 46 entries — the reason grouping exists. */
{
  const items = {};
  for (let i = 1; i <= 46; i += 1) items[`snowman_${i}`] = gear(i < 46 ? `snowman_${i + 1}` : null);
  const { groups } = buildGroups(items, "carry_item");
  assert.equal(groups.size, 1, "one group, not 46");
  assert.equal(groups.get("snowman_1").length, 46);
}

/* ── links that must not create a group ──────────────────────────────────── */

/* Every record is its own representative when nothing relates it, and `groups`
 * carries a single-member entry for it. `collapseToGroups` relies on that, so
 * an ungrouped record still produces exactly one card. */
for (const [type, items] of [
  /* `vest_exo_ai_4 -> vest_exo_ai_4` is real data; a self-link is not a state. */
  ["carry_item", { "vest_exo_ai_4": gear("vest_exo_ai_4") }],
  /* A target outside the view is ignored rather than invented, so the same
   * group can look smaller inside a filtered list. */
  ["carry_item", { vest1_2: gear("vest1_3") }],
  ["weapon", { "a.weapon": weapon([]) }],
]) {
  const key = Object.keys(items)[0];
  const { groupOf, groups } = buildGroups(items, type);
  assert.equal(groupOf.get(key), key, `${key} is its own representative`);
  assert.equal(groups.get(key).length, 1, `${key} must not be grouped with anything`);
}

/* ── collapseToGroups ────────────────────────────────────────────────────── */

/* No grouping available → every record is its own entry, states of length 1, so
 * the caller can render a badge without a lookup either way. */
{
  const rows = [{ key: "a.weapon" }, { key: "b.weapon" }];
  assert.deepEqual(collapseToGroups(rows, null), [
    { key: "a.weapon", item: rows[0], states: ["a.weapon"] },
    { key: "b.weapon", item: rows[1], states: ["b.weapon"] },
  ]);
}

/* A group collapses to one entry, keyed on the representative, and the entry
 * carries the representative's own record — not whichever member came first. */
{
  const rows = [{ key: "vest1_3", n: 3 }, { key: "vest1", n: 1 }, { key: "vest1_2", n: 2 }];
  const grouping = buildGroups(
    { vest1: gear("vest1_2"), vest1_2: gear("vest1_3"), vest1_3: gear(null) },
    "carry_item",
  );
  const out = collapseToGroups(rows, grouping);
  assert.equal(out.length, 1, "three states, one card");
  assert.equal(out[0].key, "vest1");
  assert.equal(out[0].item.n, 1, "the pristine state's record, not the first one listed");
  assert.deepEqual(out[0].states, ["vest1", "vest1_2", "vest1_3"]);
}

/* Ungrouped records pass through untouched alongside grouped ones. */
{
  const rows = [{ key: "lottery" }, { key: "vest1" }, { key: "vest1_2" }];
  const grouping = buildGroups({ vest1: gear("vest1_2"), vest1_2: gear(null) }, "carry_item");
  assert.deepEqual(collapseToGroups(rows, grouping).map((e) => e.key), ["lottery", "vest1"]);
}

/* A collapsed group keeps the position of its first member, so grouping does not
 * reorder the list a reader just sorted. */
{
  const rows = [{ key: "b.weapon" }, { key: "a.weapon" }, { key: "c.weapon" }];
  const grouping = buildGroups(
    { "a.weapon": weapon(["b.weapon"]), "b.weapon": weapon(["a.weapon"]) },
    "weapon",
  );
  const out = collapseToGroups(rows, grouping);
  assert.deepEqual(out.map((e) => e.key), ["a.weapon", "c.weapon"], "one card, first position kept");
}

/* A group whose members are all filtered out cannot strand an entry: only the
 * records passed in are considered. */
{
  const rows = [{ key: "vest1_3" }];
  const grouping = buildGroups(
    { vest1: gear("vest1_2"), vest1_2: gear("vest1_3"), vest1_3: gear(null) },
    "carry_item",
  );
  const out = collapseToGroups(rows, grouping);
  assert.equal(out.length, 1);
  assert.equal(out[0].key, "vest1", "keyed on the representative even when it is not in view");
  assert.equal(out[0].item.key, "vest1_3", "so the entry falls back to a record that is");
}

console.log("itemGroups: ok");
