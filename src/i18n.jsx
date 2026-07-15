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
      const tr = uiTranslations[langCode]?.[key] || uiTranslations.en[key] || key;
      if (args.length === 0) return tr;
      return tr.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ""));
    },
    };
  }, [locale, languages, lookup, langCode]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}
