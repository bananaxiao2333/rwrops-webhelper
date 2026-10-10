import { useEffect, useState, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { useT } from "./i18n.jsx";
import { useData } from "./DataContext.jsx";

/**
 * A guided tour of the whole site.
 *
 * This is a SPA, so the tour does not just spotlight one page — it *drives* the
 * app: it navigates from the home page to a category, into a real item page,
 * then on to the guides and the tools, spotlighting the relevant region on each.
 * That is the only honest way to show how deep the site goes, since a first-time
 * visitor would otherwise never click through all of it.
 *
 * Each step names a route and a `data-tour` target. On advance the tour
 * navigates, then polls for the target element (pages render asynchronously)
 * and moves the spotlight. Dismissible, remembered, replayable from the "?".
 */
const STORAGE_KEY = "rwrops_tour_done";

/* `route: "ITEM"` resolves at runtime to a real record so the tour lands on a
 * populated detail page rather than an empty one. */
const STEPS = [
  { key: "welcome", route: "/", target: null, place: "center" },
  { key: "search", route: "/", target: '[data-tour="search"]', place: "bottom" },
  { key: "package", route: "/", target: '[data-tour="package"]', place: "bottom" },
  { key: "nav", route: "/", target: '[data-tour="nav"]', place: "bottom" },
  { key: "index", route: "/", target: '[data-tour="index"]', place: "center" },
  { key: "category", route: "/params/weapon", target: '[data-tour="list"]', place: "center" },
  { key: "detail", route: "ITEM", target: '[data-tour="article"]', place: "center" },
  // The item page's visualization sections — the site's actual depth. Each
  // section is tagged with data-share-id by the visualization pool.
  { key: "viz_gun", route: null, target: '[data-share-id="vis_Gun Performance"]', place: "dock" },
  { key: "viz_modifiers", route: null, target: '[data-share-id="vis_Modifiers"]', place: "dock" },
  { key: "viz_supply", route: null, target: '[data-share-id="vis_Supply"]', place: "dock" },
  { key: "viz_acquisition", route: null, target: '[data-share-id="vis_Acquisition"]', place: "dock" },
  { key: "docs", route: "/docs", target: '[data-tour="docs"]', place: "center" },
  { key: "tools", route: "/tools", target: '[data-tour="tools"]', place: "center" },
  { key: "end", route: "/", target: null, place: "center" },
];

// eslint-disable-next-line react-refresh/only-export-components
export function tourSeen() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
}

const CARD_W = 380;

export default function Tour({ open, onClose, onNavigate }) {
  const t = useT();
  const { data } = useData();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  const navRef = useRef(onNavigate);
  navRef.current = onNavigate;
  const stepRef = useRef(step);
  stepRef.current = step;
  const settledRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const routeFor = useCallback((s) => {
    if (!s?.route) return null;
    if (s.route === "ITEM") {
      const d = dataRef.current;
      const entries = d?.weapon ? Object.entries(d.weapon) : [];
      // Prefer a weapon that actually renders the sections the tour points at,
      // so the spotlight steps land on real content rather than an empty page.
      const rich = entries.find(([, w]) =>
        Array.isArray(w.modifiers) && w.modifiers.length &&
        w.projectile_result_kill_probability !== undefined &&
        Array.isArray(w.capacities) && w.capacities.length);
      const key = rich?.[0] || entries[0]?.[0];
      return key ? `/params/weapon/${key}` : "/params/weapon";
    }
    return s.route;
  }, []);

  const goTo = useCallback((i) => {
    const idx = Math.max(0, Math.min(STEPS.length - 1, i));
    setStep(idx);
    settledRef.current = false;
    const route = routeFor(STEPS[idx]);
    if (route) navRef.current?.(route);
  }, [routeFor]);

  // On open, start at the home page so the tour always begins from the same place.
  useEffect(() => {
    const route = routeFor(STEPS[0]);
    if (route) navRef.current?.(route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const measure = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth, h = window.innerHeight;
    setVp((p) => (p.w === w && p.h === h ? p : { w, h }));

    const s = STEPS[stepRef.current];
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
  }, []);

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
  }, [open, measure, step]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const next = () => (isLast ? finish() : goTo(step + 1));
  const back = () => goTo(step - 1);
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
            {t(`tour_${current.key}_title`)}
          </span>
          <button onClick={skip} aria-label={t("tour_skip")}
            style={{ marginLeft: "auto", cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)", display: "flex", padding: 2 }}>
            <Icon icon="mdi:close" style={{ fontSize: 16 }} />
          </button>
        </div>

        <p style={{ fontSize: "var(--font-sm)", lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
          {t(`tour_${current.key}_body`)}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {STEPS.map((s, i) => (
              <span key={s.key} style={{
                width: 6, height: 6, borderRadius: "50%",
                background: i === step ? "var(--accent)" : "var(--border-heavy)",
              }} />
            ))}
          </div>
          <span style={{ fontSize: "var(--font-xxs)", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            {t("tour_step", step + 1, STEPS.length)}
          </span>
          <span style={{ flex: 1 }} />
          {step > 0 && (
            <button onClick={back}
              style={{ cursor: "pointer", padding: "5px 12px", background: "none", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontSize: "var(--font-xs)" }}>
              {t("tour_back")}
            </button>
          )}
          <button onClick={next}
            style={{ cursor: "pointer", padding: "5px 14px", background: "var(--accent)", border: "1px solid var(--accent)", color: "var(--bg-deep)", fontSize: "var(--font-xs)", fontWeight: 700 }}>
            {isLast ? t("tour_done") : t("tour_next")}
          </button>
        </div>
      </div>
    </div>
  );
}
