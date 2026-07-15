/* ───────────────────────────────────────────────────
 *  Showcase.jsx — 3D Entity Gallery v5
 *  · Three.js 3D canvas with dynamic camera moves
 *  · Structured HTML overlay: top bar, info card,
 *    navigation controls, timer bar, keyboard hints
 *  · Accessible: ARIA labels, focus management,
 *    reduced-motion support, visible controls
 *  · Tactical terminal aesthetic (dark + amber accent)
 * ─────────────────────────────────────────────────── */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Icon } from "@iconify/react";
import { useI18n, useT } from "../i18n.jsx";
import { useData } from "../DataContext.jsx";
import { useItemIcon, hasAsset } from "../assetLoader.jsx";

/* ── Constants ── */
const DISPLAY_DURATION = 5; // seconds per entity
const ICON_PRELOAD_COUNT = 5;

/* ── 7 Cinematic Camera Moves ── */
const MOVES = [
  (t, dur) => { const p = Math.min(t/dur, 1); const d = 8*(1-p)+3.5*p; return [0, 1.5+0.3*Math.sin(p*2), d]; },
  (t, dur) => { const p = Math.min(t/dur, 1); const d = 3.5*(1-p)+7*p; return [0, 1.5, d]; },
  (t, dur, r) => { const p = Math.min(t/dur, 1); const a = p*Math.PI*1.5; const d = r(4,5.5); return [Math.sin(a)*d, 1+Math.cos(p*2)*0.8, Math.cos(a)*d]; },
  (t, dur) => { const p = Math.min(t/dur, 1); const x = (p-0.5)*6; return [x, 1.5+Math.sin(p*3)*0.3, 5]; },
  (t, dur) => { const p = Math.min(t/dur, 1); const z = 9*(1-p)+3.5*p; const y = 2.5*(1-p)+1.5*p; return [0.3*Math.sin(p*5), y, z]; },
  (t, dur) => { const p = Math.min(t/dur, 1); const a = p*Math.PI*0.9; return [Math.sin(a)*5, 1.2+Math.cos(p*3)*0.5, Math.cos(a)*4.5]; },
  (t, dur) => { const p = Math.min(t/dur, 1); return [Math.sin((p-0.5)*1.6)*4, 1.5+Math.sin(p*4)*0.4, 5+Math.cos((p-0.5)*1.6)*1.5]; },
];

function pickMove(prev) {
  const rest = MOVES.filter((_, i) => i !== prev);
  return { idx: MOVES.indexOf(rest[Math.floor(Math.random() * rest.length)]), dur: 3 + Math.random() * 5 };
}

/* ── Camera Controller ── */
function CameraRotator({ moveIdx, moveKey }) {
  const { camera } = useThree();
  const startRef = useRef(performance.now() / 1000);
  const durRef = useRef(5);
  const oldPosRef = useRef(new THREE.Vector3());
  const paramsRef = useRef({});
  const moveFn = MOVES[moveIdx % MOVES.length];

  useMemo(() => {
    oldPosRef.current.copy(camera.position);
    startRef.current = performance.now() / 1000;
    durRef.current = 3 + Math.random() * 5;
    paramsRef.current = {
      orbitR: 4 + Math.random() * 1.5,
      panH: 0.3 + Math.random() * 0.5,
      dollyCurve: 0.3 + Math.random() * 0.4,
      followArc: 0.8 + Math.random() * 0.4,
    };
  }, [moveKey]);

  useFrame(() => {
    const t = performance.now() / 1000 - startRef.current;
    const p = paramsRef.current;
    const r = (lo, hi) => lo + (p.orbitR % 1) * (hi - lo);
    const [x, y, z] = moveFn(t, durRef.current, r);
    camera.position.set(x, y, z);
    if (t < 0.3) {
      const a = t / 0.3;
      const ease = a < 0.5 ? 2 * a * a : -1 + (4 - 2 * a) * a;
      camera.position.lerpVectors(oldPosRef.current, new THREE.Vector3(x, y, z), ease);
    }
    camera.lookAt(-1, 0, 0);
  });
  return null;
}

/* ── Particle Field ── */
function ParticleField({ count = 300 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      const rad = 3 + Math.pow(Math.random(), 0.5) * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i] = rad * Math.sin(phi) * Math.cos(theta);
      arr[i + 1] = rad * Math.sin(phi) * Math.sin(theta);
      arr[i + 2] = rad * Math.cos(phi);
    }
    return arr;
  }, [count]);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.02; });
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial size={0.08} color="#fbbf24" opacity={0.6} transparent sizeAttenuation />
    </points>
  );
}

/* ── Icon Card (3D plane with texture) ── */
function IconCard({ iconUrl, opacity }) {
  const [tex, setTex] = useState(null);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    if (!iconUrl) { setTex(null); return; }
    const loader = new THREE.TextureLoader();
    loader.load(iconUrl, (t) => {
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.NearestFilter;
      t.colorSpace = THREE.SRGBColorSpace;
      t.premultiplyAlpha = true;
      setTex(t);
      if (t.image) setAspect(t.image.width / Math.max(t.image.height, 1));
    });
  }, [iconUrl]);

  const w = 1.8;
  const h = w / Math.max(aspect, 0.3);
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 1.5) * 0.03;
      groupRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={groupRef} position={[-1.2, 0, 0]}>
      {/* Main card with texture */}
      <mesh>
        <planeGeometry args={[w, h]} />
        {tex ? (
          <meshStandardMaterial map={tex} transparent premultipliedAlpha side={THREE.DoubleSide} opacity={opacity}
            roughness={0.05} metalness={0} emissive="#ffffff" emissiveIntensity={0.8} emissiveMap={tex} />
        ) : (
          <meshStandardMaterial color="#131a24" roughness={0.3} opacity={opacity} transparent />
        )}
      </mesh>
      {/* Glow border */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[w + 0.25, h + 0.25]} />
        <meshBasicMaterial color="#fbbf24" side={THREE.BackSide} opacity={0.35 * opacity} transparent />
      </mesh>
      {/* Soft outer halo */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w + 0.6, h + 0.6]} />
        <meshBasicMaterial color="#f59e0b" opacity={0.1 * opacity} transparent />
      </mesh>
      {/* Ground reflection ring */}
      <mesh position={[0, -h / 2 - 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[w / 2 + 0.2, 0.025, 8, 48]} />
        <meshBasicMaterial color="#f59e0b" opacity={0.5 * opacity} transparent />
      </mesh>
    </group>
  );
}

/* ── Icon Preloader (hidden, warms browser cache) ── */
function IconPreloader({ entity }) {
  const url = useItemIcon(entity);
  return url ? <img src={url} alt="" style={{ width: 1, height: 1 }} /> : null;
}

/* ── Mobile detection hook ── */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

/* ── Reduced motion hook ── */
function useReducedMotion() {
  const [prefers, setPrefers] = useState(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setPrefers(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefers;
}

/* ═══════════════════════════════════════════════════
 *  STATS COMPUTATION
 *  ═══════════════════════════════════════════════════ */
function computeStats(type, entity) {
  const stats = [];
  if (type === "weapon") {
    if (entity.projectile_result_kill_probability != null)
      stats.push({ label: "KILL", value: `${(entity.projectile_result_kill_probability * 100).toFixed(0)}%` });
    if (entity.retrigger_time != null)
      stats.push({ label: "RATE", value: `${entity.retrigger_time.toFixed(2)}s` });
    if (entity.magazine_size > 0)
      stats.push({ label: "MAG", value: String(entity.magazine_size) });
    if (entity.inventory_price != null)
      stats.push({ label: "RP", value: `$${entity.inventory_price}` });
  } else if (type === "vehicle") {
    if (entity.max_speed != null)
      stats.push({ label: "SPD", value: entity.max_speed.toFixed(1) });
    if (entity.max_health != null)
      stats.push({ label: "HP", value: String(entity.max_health) });
    if (entity.mass != null)
      stats.push({ label: "MASS", value: `${entity.mass.toFixed(0)}kg` });
    if (entity.inventory_price != null)
      stats.push({ label: "RP", value: `$${entity.inventory_price}` });
  } else {
    if (entity.inventory_price != null)
      stats.push({ label: "RP", value: `$${entity.inventory_price}` });
    if (entity.inventory_encumbrance != null)
      stats.push({ label: "WGT", value: `${entity.inventory_encumbrance.toFixed(1)}kg` });
  }
  return stats;
}

/* ═══════════════════════════════════════════════════
 *  Stat Chip Component
 *  ═══════════════════════════════════════════════════ */
function StatChip({ label, value, isMobile }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      minWidth: isMobile ? 48 : 64,
      padding: isMobile ? "4px 6px" : "6px 10px",
      background: "rgba(0,0,0,0.35)",
    }}>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--font-xxs)",
        color: "var(--text-dim)",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "var(--font-display)",
        fontSize: isMobile ? "var(--font-base)" : "var(--font-md)",
        fontWeight: 700,
        color: "var(--accent)",
        lineHeight: 1.2,
      }}>
        {value}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
 *  MAIN SHOWCASE COMPONENT
 *  ═══════════════════════════════════════════════════ */
export default function Showcase() {
  const { translate } = useI18n();
  const t = useT();
  const { data } = useData();
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();

  /* ── State ── */
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(DISPLAY_DURATION);
  const [transitioning, setTransitioning] = useState(false);
  const [moveState, setMoveState] = useState(() => pickMove(-1));
  const [preloadQueue, setPreloadQueue] = useState([]);
  const [keyHintsVisible, setKeyHintsVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== "undefined" && !!document.fullscreenElement,
  );

  // Keep ref in sync so interval callbacks always read fresh isPaused
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Sync fullscreen state with browser
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Entity pool (pre-filtered: must have translation + icon filename) ── */
  const rawPool = useMemo(() => {
    if (!data) return [];
    const items = [];
    for (const type of ["weapon", "vehicle", "carry_item"]) {
      const bucket = data[type];
      if (!bucket) continue;
      for (const [k, e] of Object.entries(bucket)) {
        if (typeof e !== "object" || !e) continue;
        // Must have a translated name (not identical to key)
        const rawKey = e.name || k;
        const tr = translate(rawKey);
        if (!tr || tr === "—" || tr === rawKey) continue;
        // Must have an icon filename defined
        const iconFile = e.hud_icon_filename || e.hud_icon?.filename || e.icon?.filename || e.icon_file;
        if (!iconFile) continue;
        items.push({ type, key: k, entity: e });
      }
    }
    // Shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.slice(0, 300);
  }, [data, translate]);

  // Secondary filter: icon file must exist in the asset index (once loaded)
  const [pool, setPool] = useState([]);
  const [poolReady, setPoolReady] = useState(false);
  useEffect(() => {
    if (!rawPool.length) { setPool([]); setPoolReady(false); return; }
    // Try filtering with hasAsset (synchronous after index loads)
    const filtered = rawPool.filter((item) => {
      const e = item.entity;
      const iconFile = e.hud_icon_filename || e.hud_icon?.filename || e.icon?.filename || e.icon_file;
      return hasAsset(iconFile);
    });
    if (filtered.length > 0) {
      setPool(filtered);
      setPoolReady(true);
      return;
    }
    // Index not loaded yet — wait and retry
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      const retry = rawPool.filter((item) => {
        const e = item.entity;
        const iconFile = e.hud_icon_filename || e.hud_icon?.filename || e.icon?.filename || e.icon_file;
        return hasAsset(iconFile);
      });
      if (retry.length > 0 || attempts > 20) {
        clearInterval(iv);
        setPool(retry.length > 0 ? retry : rawPool); // fallback: use unfiltered if index never loads
        setPoolReady(true);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [rawPool]);

  const current = pool[index];

  /* ── Preload upcoming icons ── */
  useEffect(() => {
    const next = [];
    for (let i = 1; i <= ICON_PRELOAD_COUNT; i++) {
      const e = pool[(index + i) % pool.length];
      if (e) next.push(e);
    }
    setPreloadQueue(next);
  }, [index, pool]);

  /* ── Auto-advance ── */
  const advanceTimerRef = useRef(null);

  const advanceEntity = useCallback(() => {
    if (isPausedRef.current) return;
    setTransitioning(true);
    setTimeout(() => {
      setIndex((i) => (i + 1) % pool.length);
      setTransitioning(false);
    }, 250);
  }, [pool.length]);

  useEffect(() => {
    if (!pool.length) return;
    const interval = setInterval(advanceEntity, DISPLAY_DURATION * 1000);
    advanceTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [pool.length, advanceEntity]);

  /* ── Timer countdown ── */
  useEffect(() => {
    if (!pool.length || isPaused) { setTimer(0); return; }
    setTimer(DISPLAY_DURATION);
    const start = performance.now();
    const iv = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const remaining = Math.max(0, DISPLAY_DURATION - elapsed);
      setTimer(remaining);
      if (remaining <= 0) clearInterval(iv);
    }, 50);
    return () => clearInterval(iv);
  }, [index, pool.length, isPaused]);

  /* ── Cycle camera moves ── */
  useEffect(() => {
    if (reducedMotion) return;
    const cycle = () => {
      if (isPausedRef.current) return;
      setMoveState((prev) => pickMove(prev.idx));
    };
    const t = setInterval(cycle, 6000 + Math.random() * 4000);
    return () => clearInterval(t);
  }, [reducedMotion]);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        advanceEntity();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setTransitioning(true);
        setTimeout(() => {
          setIndex((i) => (i - 1 + pool.length) % pool.length);
          setTransitioning(false);
        }, 250);
      }
      if (e.key === " ") {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
      if (e.key === "Escape") {
        window.history.back();
      }
      if (e.key === "?") {
        setKeyHintsVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pool.length, advanceEntity]);

  /* ── Mark canvas ready after initial paint ── */
  useEffect(() => {
    const t = setTimeout(() => setIsCanvasReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  /* ── All hooks must run before any early return ── */
  const entity = current?.entity;
  const iconUrl = useItemIcon(entity);
  const rawKey = entity?.name || current?.key || "";
  const trName = translate(rawKey);
  const hasTranslation = trName && trName !== "—" && trName !== rawKey;
  const name = (hasTranslation ? trName : rawKey).slice(0, 40);
  const stats = current ? computeStats(current.type, entity) : [];

  /* ── Loading guard ── */
  if (!poolReady || !current) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-deep)", color: "var(--text-dim)",
        fontFamily: "var(--font-mono)", flexDirection: "column", gap: 12,
      }}>
        <div style={{ width: 24, height: 24, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span>{poolReady && pool.length === 0 ? "NO ENTITIES MATCH FILTERS" : "LOADING SHOWCASE..."}</span>
      </div>
    );
  }

  const progressPct = isPaused ? 0 : (timer / DISPLAY_DURATION) * 100;
  const isLightTheme = typeof document !== "undefined" && document.documentElement.classList.contains("light-theme");
  const overlayBg = isLightTheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.45)";


  /* ── Navigation helpers ── */
  const goBack = () => window.history.back();
  const goPrev = () => {
    setTransitioning(true);
    setTimeout(() => {
      setIndex((i) => (i - 1 + pool.length) % pool.length);
      setTransitioning(false);
    }, 250);
  };
  const goNext = () => advanceEntity();
  const togglePause = () => setIsPaused((p) => !p);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  const btnStyle = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: isMobile ? 36 : 44, height: isMobile ? 36 : 44,
    border: "none",
    outline: "none",
    background: overlayBg,
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "all var(--dur-fast) var(--ease-smooth)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "var(--bg-deep)",
        overflow: "hidden",
      }}
      role="region"
      aria-label="3D Entity Showcase Gallery"
    >
      {/* ── 3D Canvas ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        pointerEvents: "none",
        opacity: isCanvasReady ? 1 : 0,
        transition: "opacity 0.6s var(--ease-smooth)",
      }}>
        <Canvas
          camera={{ position: [0, 1.5, 6], fov: 48 }}
          style={{ position: "absolute", inset: 0 }}
          gl={{ antialias: true, alpha: false }}
        >
          <directionalLight position={[0, 1, 5]} intensity={3.5} color="#ffffff" />
          <spotLight position={[-2, 0.5, -1]} intensity={3} color="#f59e0b" angle={1} penumbra={0.5} />
          <pointLight position={[2, 1, 3]} intensity={2.5} color="#93c5fd" />
          <pointLight position={[0, -2, 2]} intensity={2} color="#64748b" />
          <ambientLight intensity={1.5} />
          {!reducedMotion && <ParticleField count={300} />}
          <IconCard iconUrl={iconUrl} opacity={transitioning ? 0.25 : 1} />
          {reducedMotion ? null : <CameraRotator moveIdx={moveState.idx} moveKey={moveState.idx} />}
        </Canvas>
      </div>

      {/* ── Canvas loading overlay ── */}
      {!isCanvasReady && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg-deep)", zIndex: 5,
          flexDirection: "column", gap: 16,
        }}>
          <div style={{
            width: 32, height: 32,
            border: "2px solid var(--accent)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-sm)",
            color: "var(--text-dim)",
            letterSpacing: "0.1em",
          }}>
            INITIALIZING 3D ENGINE...
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════
       *  HTML OVERLAY
       *  ═══════════════════════════════════════════ */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        pointerEvents: "none",
        display: "flex", flexDirection: "column",
        padding: isMobile ? "8px" : "16px",
      }}>

        {/* ── TOP BAR ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: isMobile ? 8 : 12,
          pointerEvents: "auto",
        }}>
          {/* Back button */}
          <button
            onClick={goBack}
            aria-label="Back to tools"
            style={{
              ...btnStyle,
              width: isMobile ? 32 : 40,
              height: isMobile ? 32 : 40,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--glow-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <Icon icon="ph:arrow-left" width={isMobile ? 16 : 20} />
          </button>

          {/* Title */}
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: isMobile ? "var(--font-base)" : "var(--font-md)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--accent)",
            textTransform: "uppercase",
          }}>
            {t("tools_showcase")}
          </div>

          <span style={{ flex: 1 }} />

          {/* Entity counter */}
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
            color: "var(--text-muted)",
            background: overlayBg,
            padding: isMobile ? "2px 8px" : "4px 10px",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}>
            <span style={{ color: "var(--accent)" }}>{index + 1}</span>
            <span style={{ color: "var(--text-dim)" }}> / {pool.length}</span>
          </div>

          {/* Pause / Play toggle */}
          <button
            onClick={togglePause}
            aria-label={isPaused ? "Resume auto-play" : "Pause auto-play"}
            style={btnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--glow-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <Icon icon={isPaused ? "ph:play" : "ph:pause"} width={isMobile ? 16 : 20} />
          </button>

          {/* Keyboard hints toggle */}
          <button
            onClick={() => setKeyHintsVisible((v) => !v)}
            aria-label="Show keyboard shortcuts"
            style={{
              ...btnStyle,
              width: isMobile ? 32 : 40,
              height: isMobile ? 32 : 40,
              opacity: keyHintsVisible ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--glow-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <Icon icon="ph:keyboard" width={isMobile ? 14 : 16} />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            style={{
              ...btnStyle,
              width: isMobile ? 32 : 40,
              height: isMobile ? 32 : 40,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "var(--glow-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <Icon icon={isFullscreen ? "ph:arrows-in" : "ph:arrows-out"} width={isMobile ? 16 : 20} />
          </button>
        </div>

        {/* ── Keyboard hints dropdown ── */}
        {keyHintsVisible && (
          <div style={{
            position: "absolute", top: isMobile ? 52 : 64, right: isMobile ? 8 : 16,
            pointerEvents: "auto",
            background: "var(--bg-surface)",
            padding: isMobile ? "12px 14px" : "16px 20px",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-xs)",
            color: "var(--text-secondary)",
            boxShadow: "var(--shadow-md)",
            animation: "scale-in 0.2s var(--ease-out) both",
            zIndex: 10,
            minWidth: isMobile ? 200 : 260,
          }}>
            <div style={{
              fontSize: "var(--font-sm)", fontWeight: 700,
              color: "var(--accent)", letterSpacing: "0.1em",
              marginBottom: 10, textTransform: "uppercase",
            }}>
              KEYBOARD SHORTCUTS
            </div>
            {[
              ["← →", "Previous / Next entity"],
              ["↑ ↓", "Previous / Next entity"],
              ["Space", isPaused ? "Resume auto-play" : "Pause auto-play"],
              ["Esc", "Back to tools"],
              ["?", "Toggle this panel"],
            ].map(([key, desc]) => (
              <div key={key} style={{
                display: "flex", gap: 12,
                padding: "3px 0",
              }}>
                <span style={{
                  color: "var(--accent)",
                  minWidth: isMobile ? 48 : 56,
                  textAlign: "right",
                }}>{key}</span>
                <span style={{ color: "var(--text-muted)" }}>{desc}</span>
              </div>
            ))}
          </div>
        )}

        <span style={{ flex: 1 }} />

        {/* ── BOTTOM AREA ── */}
        <div style={{
          display: "flex", alignItems: "flex-end",
          gap: isMobile ? 8 : 16,
          pointerEvents: "auto",
        }}>
          {/* ── Entity Info Card (bottom-left) ── */}
          <div style={{
            background: overlayBg,
            padding: isMobile ? "10px 12px" : "14px 20px",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            maxWidth: isMobile ? "60vw" : "40vw",
            overflow: "hidden",
            opacity: transitioning ? 0.4 : 1,
            transition: "opacity 0.2s var(--ease-smooth)",
          }}>
            {/* Type badge */}
            <div style={{
              display: "inline-block",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-xxs)",
              color: "var(--accent)",
              letterSpacing: "0.15em",
              padding: "1px 6px",
              marginBottom: isMobile ? 4 : 6,
              textTransform: "uppercase",
            }}>
              {current.type.replace("_", " ")}
            </div>

            {/* Entity name */}
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: isMobile ? "clamp(16px, 4vw, 24px)" : "clamp(20px, 2.5vw, 30px)",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "0.03em",
              lineHeight: 1.15,
              marginBottom: stats.length > 0 ? (isMobile ? 6 : 10) : 0,
              wordBreak: "break-word",
            }}>
              {name}
            </div>

            {/* Stats row */}
            {stats.length > 0 && (
              <div style={{
                display: "flex", gap: isMobile ? 6 : 8,
                flexWrap: "wrap",
              }}>
                {stats.map((s, i) => (
                  <StatChip key={i} label={s.label} value={s.value} isMobile={isMobile} />
                ))}
              </div>
            )}
          </div>

          <span style={{ flex: 1 }} />

          {/* ── Navigation Controls (bottom-right) ── */}
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: isMobile ? 4 : 6,
          }}>
            {/* Prev / Next buttons */}
            <div style={{ display: "flex", gap: isMobile ? 6 : 8 }}>
              <button
                onClick={goPrev}
                aria-label="Previous entity"
                style={btnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--glow-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <Icon icon="ph:caret-left" width={isMobile ? 18 : 22} />
              </button>
              <button
                onClick={goNext}
                aria-label="Next entity"
                style={btnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "var(--glow-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <Icon icon="ph:caret-right" width={isMobile ? 18 : 22} />
              </button>
            </div>

            {/* Keyboard hint pill */}
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-xxs)",
              color: "var(--text-dim)",
              opacity: 0.5,
              letterSpacing: "0.06em",
              textAlign: "center",
              pointerEvents: "none",
            }}>
              {isMobile ? "←  →  to navigate" : "← → arrows  ·  space pause  ·  esc back"}
            </div>
          </div>
        </div>

        {/* ── Timer Progress Bar (bottom edge) ── */}
        <div style={{
          marginTop: isMobile ? 6 : 10,
          height: 2,
          width: "100%",
          background: "rgba(245,158,11,0.1)",
          overflow: "hidden",
          pointerEvents: "none",
        }}>
          <div style={{
            height: "100%",
            width: `${progressPct}%`,
            background: isPaused
              ? "var(--text-dim)"
              : "var(--accent)",
            transition: isPaused ? "width 0.3s var(--ease-smooth)" : "width 0.1s linear",
          }} />
        </div>
      </div>

      {/* ── Hidden icon preloader ── */}
      <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0 }}>
        {preloadQueue.map((item) => (
          <IconPreloader key={`pre-${item.type}.${item.key}`} entity={item.entity} />
        ))}
      </div>
    </div>
  );
}
