import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { useT } from "./i18n.jsx";
import { useData } from "./DataContext.jsx";
import { visualizationComponents } from "./detail_visual/VisualizationComponentPool";

/**
 * A guided tour of the whole site.
 *
 * The tour is a SPA driver: it navigates from the home page to a category, into
 * real item pages, then on to the guides and the tools, spotlighting the
 * relevant region on each step.
 *
 * The item-page steps are not hard-coded here — they are *collected* from the
 * visualization registry (see VisualizationComponentPool.tourStepsFor). Each
 * visualization declares its own tour title/body next to its implementation, so
 * adding a visualization (or editing its copy) updates the tour automatically.
 *
 * Because the tour must land on records that actually render a section, it
 * features two records — a weapon (performance/modifiers/supply/…) and an
 * exchangeable item (how-to-obtain) — and skips any step whose record is absent.
 */
const STORAGE_KEY = "rwrops_tour_done";

const FIXED_HEAD = [
  { key: "welcome", route: "/", target: null, place: "center", titleKey: "tour_welcome_title", bodyKey: "tour_welcome_body" },
  { key: "search", route: "/", target: '[data-tour="search"]', place: "bottom", titleKey: "tour_search_title", bodyKey: "tour_search_body" },
  { key: "package", route: "/", target: '[data-tour="package"]', place: "bottom", titleKey: "tour_package_title", bodyKey: "tour_package_body" },
  { key: "nav", route: "/", target: '[data-tour="nav"]', place: "bottom", titleKey: "tour_nav_title", bodyKey: "tour_nav_body" },
  { key: "index", route: "/", target: '[data-tour="index"]', place: "center", titleKey: "tour_index_title", bodyKey: "tour_index_body" },
  { key: "category", route: "/params/weapon", target: '[data-tour="list"]', place: "center", titleKey: "tour_category_title", bodyKey: "tour_category_body" },
];
const FIXED_TAIL = [
  { key: "docs", route: "/docs", target: '[data-tour="docs"]', place: "center", titleKey: "tour_docs_title", bodyKey: "tour_docs_body" },
  { key: "tools", route: "/tools", target: '[data-tour="tools"]', place: "center", titleKey: "tour_tools_title", bodyKey: "tour_tools_body" },
  { key: "end", route: "/", target: null, place: "center", titleKey: "tour_end_title", bodyKey: "tour_end_body" },
];

/* Find a record the tour can land on to show a given visualization: the first
 * record (of the types that make sense for it) where it actually renders. */
function findItemFor(entry, data) {
  const test = entry.renders || entry.shouldRender;
  const types = entry.findTypes || Object.keys(data || {});
  for (const type of types) {
    const bucket = data?.[type];
    if (!bucket) continue;
    for (const [key, rec] of Object.entries(bucket)) {
      try { if (test(rec, data)) return { type, key, item: rec }; } catch { /* skip malformed */ }
    }
  }
  return null;
}

function rendersHere(entry, item, data) {
  const test = entry.renders || entry.shouldRender;
  try { return test(item, data); } catch { return false; }
}

/* The item-page steps are collected from the visualization registry: for every
 * visualization that declares tour text, the tour navigates to a record where
 * it renders and spotlights it — reusing the current record while it keeps
 * working, so consecutive sections on one page don't re-navigate. A
 * visualization that renders nowhere in this package simply gets no step. */
function buildSteps(data) {
  const steps = [...FIXED_HEAD];
  let current = null;
  let detailAdded = false;

  for (const entry of visualizationComponents) {
    if (!entry.tour) continue;
    if (!current || !rendersHere(entry, current.item, data)) {
      current = findItemFor(entry, data);
    }
    if (!current) continue;   // nothing in this package renders it → skip the step

    if (!detailAdded) {
      steps.push({
        key: "detail",
        route: `/params/${current.type}/${current.key}`,
        target: '[data-tour="article"]', place: "center",
        titleKey: "tour_detail_title", bodyKey: "tour_detail_body",
      });
      detailAdded = true;
    }
    steps.push({
      key: `viz_${entry.name}`,
      route: `/params/${current.type}/${current.key}`,
      target: `[data-share-id="vis_${entry.name}"]`, place: "dock",
      titleKey: entry.tour.titleKey, bodyKey: entry.tour.bodyKey,
    });
  }

  steps.push(...FIXED_TAIL);
  return steps;
}

// eslint-disable-next-line react-refresh/only-export-components
export function tourSeen() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
}

const CARD_W = 400;

export default function Tour({ open, onClose, onNavigate }) {
  const t = useT();
  const { data } = useData();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  const steps = useMemo(() => buildSteps(data), [data]);
  const settledRef = useRef(false);
  const initRef = useRef(false);
  const navRef = useRef(onNavigate);
  useEffect(() => { navRef.current = onNavigate; }, [onNavigate]);

  const goTo = useCallback((i) => {
    const idx = Math.max(0, Math.min(steps.length - 1, i));
    setStep(idx);
    settledRef.current = false;
    const route = steps[idx]?.route;
    if (route) navRef.current?.(route);
  }, [steps]);

  // On open, start from the home page so the tour always begins in the same place.
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const route = steps[0]?.route;
    if (route) navRef.current?.(route);
  }, [steps]);

  const measure = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth, h = window.innerHeight;
    setVp((p) => (p.w === w && p.h === h ? p : { w, h }));

    const s = steps[step];
    if (!s?.target) { setRect(null); return; }
    const el = document.querySelector(s.target);
    if (!el || (el.offsetWidth === 0 && el.offsetHeight === 0)) { setRect(null); return; }

    const r = el.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(4, r.top - pad);
    const left = Math.max(4, r.left - pad);
    const right = Math.min(w - 4, r.right + pad);
    const bottom = Math.min(h - 4, r.bottom + pad);
    setRect({ top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) });

    // Pull an off-screen target into view once per step (e.g. the data index).
    if (!settledRef.current) {
      settledRef.current = true;
      if (r.top < 0 || r.bottom > h) el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [steps, step]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const id = setInterval(measure, 300);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      clearInterval(id);
    };
  }, [open, measure]);

  if (!open || steps.length === 0) return null;

  const safeStep = Math.min(step, steps.length - 1);
  const current = steps[safeStep];
  const isLast = safeStep === steps.length - 1;
  const next = () => (isLast ? finish() : goTo(safeStep + 1));
  const back = () => goTo(safeStep - 1);
  const finish = () => { markSeen(); onClose(); };
  const skip = () => { markSeen(); onClose(); };

  const cardW = Math.min(CARD_W, vp.w - 32);
  const cardStyle = {
    position: "fixed", width: cardW, zIndex: 10001,
    background: "var(--bg-surface)", border: "1px solid var(--accent)",
    padding: "18px 20px",
  };
  const CARD_H = 210;
  if (current.place === "dock") {
    // Docked to the bottom so it never covers the section it is describing.
    cardStyle.bottom = 24;
    cardStyle.left = "50%";
    cardStyle.transform = "translateX(-50%)";
  } else if (rect && current.place === "bottom" && rect.top + rect.height + 14 + CARD_H < vp.h) {
    cardStyle.top = rect.top + rect.height + 14;
    cardStyle.left = Math.max(16, Math.min(rect.left, vp.w - cardW - 16));
  } else if (rect && current.place === "top" && rect.top - 14 - CARD_H > 0) {
    cardStyle.top = rect.top - 14 - CARD_H;
    cardStyle.left = Math.max(16, Math.min(rect.left, vp.w - cardW - 16));
  } else {
    cardStyle.top = "50%";
    cardStyle.left = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000 }} role="dialog" aria-modal="true" aria-label={t("tour_label")}>
      {rect ? (
        <div style={{
          position: "fixed",
          top: rect.top, left: rect.left, width: rect.width, height: rect.height,
          boxShadow: "0 0 0 9999px rgba(3,5,9,0.74)",
          border: "1px solid var(--accent)",
          pointerEvents: "none",
          transition: "top 0.22s var(--ease-out), left 0.22s var(--ease-out), width 0.22s var(--ease-out), height 0.22s var(--ease-out)",
        }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(3,5,9,0.74)" }} onClick={skip} />
      )}

      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Icon icon="mdi:compass-outline" style={{ fontSize: 16, color: "var(--accent)" }} />
          <span style={{ fontSize: "var(--font-base)", fontWeight: 700, color: "var(--text-primary)" }}>
            {t(current.titleKey)}
          </span>
          <button onClick={skip} aria-label={t("tour_skip")}
            style={{ marginLeft: "auto", cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)", display: "flex", padding: 2 }}>
            <Icon icon="mdi:close" style={{ fontSize: 16 }} />
          </button>
        </div>

        <p style={{ fontSize: "var(--font-sm)", lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
          {t(current.bodyKey)}
        </p>

        <div style={{ marginTop: 18 }}>
          {/* A single progress bar scales to any number of steps; a row of dots
              per step became unreadably tight once the tour grew. */}
          <div style={{ height: 3, background: "var(--border-subtle)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${((safeStep + 1) / steps.length) * 100}%`,
              background: "var(--accent)",
              transition: "width 0.25s var(--ease-out)",
            }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
              {t("tour_step", safeStep + 1, steps.length)}
            </span>
            <span style={{ flex: 1 }} />
            {safeStep > 0 && (
              <button onClick={back}
                style={{ cursor: "pointer", padding: "6px 14px", background: "none", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontSize: "var(--font-xs)" }}>
                {t("tour_back")}
              </button>
            )}
            <button onClick={next}
              style={{ cursor: "pointer", padding: "6px 16px", background: "var(--accent)", border: "1px solid var(--accent)", color: "var(--bg-deep)", fontSize: "var(--font-xs)", fontWeight: 700 }}>
              {isLast ? t("tour_done") : t("tour_next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
