import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from "react";
import { useData } from "./DataContext.jsx";

import enLabels from "./i18n/en.json";
import deLabels from "./i18n/de.json";
import cnLabels from "./i18n/cn.json";
import ruLabels from "./i18n/ru.json";
import esLabels from "./i18n/es.json";
import frLabels from "./i18n/fr.json";

const LANG_KEY = "rwrops_lang";
const I18nCtx = createContext({ lang: "en", t: (k) => k, translate: (s) => s });

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  return useContext(I18nCtx);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT() {
  return useContext(I18nCtx).t;
}

/* A miss used to return the key itself, which made every `t(k) || fallback`
 * call site dead code and rendered unmapped entity fields as raw, uppercased
 * keys — `FIELD_NEXT_IN_CHAINS`, `FIELD__SOURCE`. Turn a miss into readable
 * text instead: drop the `field_` namespace and the injected `_` prefix. */
function humanizeKey(key) {
  const s = String(key).replace(/^field_/, "").replace(/^_+/, "").replace(/[_.]+/g, " ").trim();
  return s || String(key);
}

/* ── UI-only translations (from i18n/ per-language files) ── */
const uiTranslations = {
  en: enLabels,
  de: deLabels,
  cn: cnLabels,
  ru: ruLabels,
  es: esLabels,
  fr: frLabels,
};

/* ── Build lookup from game's language data ── */
function buildLookup(data, locale) {
  if (!data?.language) return {};
  const lang = data.language[locale] || data.language.en;
  if (!lang?.texts) return {};
  const map = {};
  for (const t of lang.texts) {
    if (t.key && t.translation) map[t.key.toLowerCase()] = t.translation;
  }
  return map;
}

export function I18nProvider({ children }) {
  const { data, languages } = useData();
  const [locale, setLocale] = useState(() => {
    const s = localStorage.getItem(LANG_KEY);
    return s || "en";
  });

  const lookup = useMemo(() => buildLookup(data, locale), [data, locale]);
  const langMap = { kr: "ko" };
  const langCode = langMap[locale] || locale.split("-")[0];
  const cacheRef = useRef({ locale: null, map: new Map() });

  // Clear translate cache when locale changes
  useEffect(() => {
    cacheRef.current = { locale, map: new Map() };
  }, [locale]);

  const value = useMemo(() => {
    /* The site's own table for the active locale, then the English one as the
     * shared fallback — a key translated in one locale still beats a raw id. */
    const site = (key) => uiTranslations[langCode]?.[key] ?? uiTranslations.en[key];
    const game = (text) => {
      const s = String(text ?? "");
      if (!s) return undefined;
      const hit = lookup[s.toLowerCase()];
      return hit === undefined || hit === s ? undefined : hit;
    };

    return {
    lang: locale,
    languages,
    setLang: (l) => { localStorage.setItem(LANG_KEY, l); setLocale(l); },
    /* ── Translate from game data texts (cached O(1)) ── */
    translate: (text) => {
      if (text == null || text === "") return "—";
      const cache = cacheRef.current.map;
      if (cache.has(text)) return cache.get(text);
      const key = String(text).toLowerCase();
      const result = lookup[key] || String(text);
      cache.set(text, result);
      return result;
    },
    /* ── UI string lookup ── */
    t: (key, ...args) => {
      const tr = uiTranslations[langCode]?.[key] ?? uiTranslations.en[key] ?? humanizeKey(key);
      if (args.length === 0) return tr;
      return tr.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
    },

    /* ── Two-stage lookup for displayed metadata ──────────────────────────
     * Everything the page prints about a record goes through the site's own
     * string table first and the game's language data second, so a translated
     * field or value wins over a raw identifier in either source. */
    label: (name) => site(`field_${name}`) ?? site(name) ?? game(name) ?? humanizeKey(name),
    value: (text) => {
      if (text == null || text === "") return "—";
      const s = String(text);
      return site(s) ?? game(s) ?? s;
    },
    tag: (name) => site(`tag_${name}`) ?? site(name) ?? game(name) ?? name,
    };
  }, [locale, languages, lookup, langCode]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}
