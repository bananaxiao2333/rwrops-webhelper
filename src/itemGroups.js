/**
 * One item, many states.
 *
 * RWR models a thing and its alternate states as *separate records*:
 *
 *   weapon      `ac556.weapon` <-> `ac556_b.weapon`   (via `next_in_chains`)
 *   carry_item  `vest1` -> `vest1_2` -> `vest1_3`     (via `transform_on_consume`)
 *
 * They are one article — a rifle with and without its bayonet, a vest before
 * and after it wears out — so a flat list is both wrong and unusable. It is
 * wrong because 65 weapon groups and 45 carry-item groups (450 of 576 items!)
 * read as separate things; it is unusable because a 46-state vest buries every
 * other vest. The list shows one card per group and names the state count.
 *
 * 131 of 431 weapons and 450 of 576 carry items collapse this way.
 */

/** The keys a record points at, for the given type's state model. */
const STATE_EDGES = {
  weapon: (item) =>
    (Array.isArray(item?.next_in_chains) ? item.next_in_chains : [])
      .map((c) => (typeof c === "string" ? c : c?.key))
      .filter(Boolean),
  carry_item: (item) => {
    const t = item?.transform_on_consume;
    const key = typeof t === "string" ? t : t?.key;
    return key ? [key] : [];
  },
};

/** Types whose records can carry alternate states. */
export const GROUPED_TYPES = new Set(Object.keys(STATE_EDGES));

/**
 * Collapse `items` ({key: record}) into state groups.
 *
 * Returns null for a type with no state model, so callers can skip the work.
 * `groupOf` maps every key to its group id; `groups` maps a group id to its
 * member keys. Group id is the representative key.
 */
export function buildGroups(items, type) {
  const edges = STATE_EDGES[type];
  if (!edges || !items) return null;

  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(x) !== root) { const next = parent.get(x); parent.set(x, root); x = next; }
    return root;
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const incoming = new Map();   // key -> how many members point at it
  for (const key of Object.keys(items)) {
    find(key);
    for (const target of edges(items[key])) {
      if (!Object.prototype.hasOwnProperty.call(items, target) || target === key) continue;
      union(key, target);
      incoming.set(target, (incoming.get(target) ?? 0) + 1);
    }
  }

  const buckets = new Map();
  for (const key of Object.keys(items)) {
    const root = find(key);
    if (!buckets.has(root)) buckets.set(root, []);
    buckets.get(root).push(key);
  }

  const groupOf = new Map();
  const groups = new Map();
  for (const members of buckets.values()) {
    members.sort();
    // Representative: the state nothing else points at (the pristine one —
    // `vest1`, not `vest1_2`). Mutual weapon links have no such root, so fall
    // back to the lexicographically first, which puts `ac556.weapon` ahead of
    // `ac556_b.weapon` because "." sorts before "_".
    const root = members.find((k) => !incoming.get(k)) ?? members[0];
    groups.set(root, members);
    for (const k of members) groupOf.set(k, root);
  }

  return { groupOf, groups };
}

/**
 * Reduce a list of records to one entry per state group.
 * Returns `{ key, item, states }` where `states` is every member key (length 1
 * for ungrouped records), so the caller can render a badge without a lookup.
 */
export function collapseToGroups(records, grouping) {
  if (!grouping) return records.map((item) => ({ key: item.key, item, states: [item.key] }));
  const seen = new Set();
  const out = [];
  for (const item of records) {
    const root = grouping.groupOf.get(item.key) ?? item.key;
    if (seen.has(root)) continue;
    seen.add(root);
    out.push({ key: root, item: records.find((r) => r.key === root) ?? item, states: grouping.groups.get(root) ?? [item.key] });
  }
  return out;
}
