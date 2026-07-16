/**
 * check-i18n.js — scan source for t() calls and verify all keys exist in en.json
 *
 * Usage:  node scripts/check-i18n.js
 *         node scripts/check-i18n.js --fix   (not yet implemented)
 */
import { readFileSync, readdirSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = join(fileURLToPath(import.meta.url), "..");
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const LOCALE = join(ROOT, "src/i18n/en.json");

const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

// ── helpers ──

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      files.push(...collectFiles(full));
    } else if (entry.isFile() && EXTENSIONS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

// ── main ──

const en = JSON.parse(readFileSync(LOCALE, "utf-8"));
const knownKeys = new Set(Object.keys(en));

const files = collectFiles(SRC);
const usedKeys = new Set();
const missing = new Set();
let totalCalls = 0;

for (const file of files) {
  const content = readFileSync(file, "utf-8");
  // Match t("key") or t('key')  — simple regex, no template literals
  const regex = /\bt\(\s*["']([a-z_][a-z0-9_.]*)["']\s*(?:,|\))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    totalCalls++;
    usedKeys.add(key);
    if (!knownKeys.has(key)) {
      missing.add(key);
      console.warn(`  MISSING  ${key}  (${file.replace(SRC + "/", "")})`);
    }
  }
}

// Also report keys in en.json that are never used
const unused = [...knownKeys].filter(k => !usedKeys.has(k));

console.log(`\nTotal t() calls: ${totalCalls}`);
console.log(`Unique keys used: ${usedKeys.size}`);
console.log(`Keys in en.json:  ${knownKeys.size}`);
console.log(`Missing from en.json: ${missing.size}`);
console.log(`Unused in source: ${unused.length}`);

if (missing.size > 0) {
  console.log(`\n❌ ${missing.size} key(s) missing from en.json — add them before deploying`);
  process.exit(1);
}

if (unused.length > 200) {
  console.log(`\nℹ  ${unused.length} keys in en.json are not referenced in source (may be legacy or used dynamically)`);
} else if (unused.length > 0) {
  console.log(`\nℹ  Unused keys: ${unused.join(", ")}`);
}

console.log("\n✅ All t() keys exist in en.json");
