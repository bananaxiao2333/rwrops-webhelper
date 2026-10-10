import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import { useT } from "./i18n.jsx";

/**
 * A short guided tour of the wiki.
 *
 * The site is deep — a page can carry ballistics charts, spawn rarity, unlock
 * gates and event graphs — and a first-time visitor has no way to know that
 * depth is there. The tour walks through the shell (search, packages, sections)
 * and the two big ideas (the data index and how to read a page), spotlighting
 * each region. It is dismissible, remembers that it ran, and can be replayed
 * from the "?" button in the header.
 */
const STORAGE_KEY = "rwrops_tour_done";

/* Each step either points at a `data-tour` element or centres a card. */
const STEPS = [
  { key: "welcome", target: null, place: "center" },
  { key: "search", target: '[data-tour="search"]', place: "bottom" },
  { key: "package", target: '[data-tour="package"]', place: "bottom" },
  { key: "nav", target: '[data-tour="nav"]', place: "bottom" },
  { key: "index", target: '[data-tour="index"]', place: "top" },
  { key: "detail", target: null, place: "center" },
  { key: "tools", target: '[data-tour="tools"]', place: "top" },
  { key: "end", target: null, place: "center" },
];

// eslint-disable-next-line react-refresh/only-export-components
export function tourSeen() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
}

const CARD_W = 360;

export default function Tour({ open, onClose }) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));

  const current = STEPS[step];

  const measure = useCallback(() => {
    if (typeof window === "undefined") return;
    setVw(window.innerWidth);
    if (!current?.target) { setRect(null); return; }
    const el = document.querySelector(current.target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { setRect(null); return; }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [current]);

  useEffect(() => {
    if (!open) return;
    // Deferred so the first measure is not a synchronous setState in the effect.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const id = setInterval(measure, 350);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      clearInterval(id);
    };
  }, [open, measure, step]);

  if (!open) return null;

  const pad = 6;
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  const isLast = step === STEPS.length - 1;
  const next = () => (isLast ? finish() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const finish = () => { markSeen(); onClose(); };
  const skip = () => { markSeen(); onClose(); };

  const cardW = Math.min(CARD_W, vw - 32);
  let cardStyle = {
    position: "fixed", width: cardW, zIndex: 10001,
    background: "var(--bg-surface)", border: "1px solid var(--accent)",
    padding: "18px 20px",
  };
  if (!spot || current.place === "center") {
    cardStyle = { ...cardStyle, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else if (current.place === "bottom") {
    cardStyle = {
      ...cardStyle,
      top: Math.min(spot.top + spot.height + 14, (typeof window !== "undefined" ? window.innerHeight : 800) - 220),
      left: Math.max(16, Math.min(spot.left, vw - cardW - 16)),
    };
  } else {
    cardStyle = {
      ...cardStyle,
      top: Math.max(16, spot.top - 200),
      left: Math.max(16, Math.min(spot.left, vw - cardW - 16)),
    };
  }

  const title = t(`tour_${current.key}_title`);
  const body = t(`tour_${current.key}_body`);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000 }} role="dialog" aria-modal="true" aria-label={t("tour_label")}>
      {spot ? (
        <div style={{
          position: "fixed",
          top: spot.top, left: spot.left, width: spot.width, height: spot.height,
          boxShadow: "0 0 0 9999px rgba(3,5,9,0.74)",
          border: "1px solid var(--accent)",
          pointerEvents: "none",
          transition: "all 0.22s var(--ease-out)",
        }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(3,5,9,0.74)" }} onClick={skip} />
      )}

      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Icon icon="mdi:compass-outline" style={{ fontSize: 16, color: "var(--accent)" }} />
          <span style={{ fontSize: "var(--font-base)", fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
          <button onClick={skip} aria-label={t("tour_skip")}
            style={{ marginLeft: "auto", cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)", display: "flex", padding: 2 }}>
            <Icon icon="mdi:close" style={{ fontSize: 16 }} />
          </button>
        </div>

        <p style={{ fontSize: "var(--font-sm)", lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
          {body}
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
