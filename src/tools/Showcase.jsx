/* ───────────────────────────────────────────────────
 *  Showcase.jsx — 3D 实体展台
 *  · 中心直立图标卡片 + 摄像机自动旋转
 *  · 四周 HTML 数值叠加层
 *  · 自动循环切换实体
 * ─────────────────────────────────────────────────── */
import { useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Plane } from "@react-three/drei";
import { useI18n } from "../i18n.jsx";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import * as THREE from "three";

/* ── 带纹理的直立卡片 ── */
function IconCard({ iconUrl }) {
  const texture = useMemo(() => {
    if (!iconUrl) return null;
    const t = new THREE.TextureLoader().load(iconUrl);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [iconUrl]);

  return (
    <group>
      {/* Pedestal */}
      <mesh position={[0, -1.4, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.2, 16]} />
        <meshStandardMaterial color="#1e2d3d" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Glow ring */}
      <mesh position={[0, -1.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.02, 8, 32]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {/* Card plane */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1.6, 1.6]} />
        {texture ? (
          <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
        ) : (
          <meshStandardMaterial color="#131a24" roughness={0.5} />
        )}
      </mesh>
      {/* Card border */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[1.7, 1.7]} />
        <meshBasicMaterial color="#f59e0b" side={THREE.BackSide} opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

/* ── 从数据池中选一个随机实体 ── */
function pickRandom(items, avoid) {
  if (items.length <= 1) return 0;
  let i;
  do { i = Math.floor(Math.random() * items.length); } while (i === avoid && items.length > 1);
  return i;
}

/* ═══════════════════════════════════════════════════
 *  MAIN
 *  ═══════════════════════════════════════════════════ */
export default function Showcase() {
  const { translate } = useI18n();
  const { data } = useData();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const pool = useMemo(() => {
    if (!data) return [];
    const items = [];
    for (const type of ["weapon", "vehicle", "carry_item"]) {
      const bucket = data[type];
      if (!bucket) continue;
      for (const [key, entity] of Object.entries(bucket)) {
        if (typeof entity !== "object" || entity === null) continue;
        items.push({ type, key, entity });
      }
    }
    // Shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.slice(0, 200);
  }, [data]);

  const [index, setIndex] = useState(0);
  const current = pool[index];

  // Auto-cycle
  useEffect(() => {
    if (!pool.length) return;
    const t = setInterval(() => setIndex((i) => pickRandom(pool, i)), 10000);
    return () => clearInterval(t);
  }, [pool.length]);

  // Keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); setIndex((i) => (i + 1) % pool.length); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setIndex((i) => (i - 1 + pool.length) % pool.length); }
      if (e.key === "Escape") { window.history.back(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [pool.length]);

  if (!current) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080c12", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>Loading...</div>;
  }

  const entity = current.entity;
  const iconUrl = useItemIcon(entity);
  const name = translate(entity.name || current.key)?.slice(0, 30) || current.key;

  // Type-specific stats for overlay
  const stats = [];
  if (current.type === "weapon") {
    if (entity.projectile_result_kill_probability != null) stats.push({ label: "KILL", value: `${(entity.projectile_result_kill_probability * 100).toFixed(0)}%` });
    if (entity.retrigger_time != null) stats.push({ label: "RATE", value: `${entity.retrigger_time.toFixed(2)}s` });
    if (entity.magazine_size != null && entity.magazine_size > 0) stats.push({ label: "MAG", value: String(entity.magazine_size) });
    if (entity.projectiles_per_shot != null && entity.projectiles_per_shot > 1) stats.push({ label: "PEL", value: String(entity.projectiles_per_shot) });
    if (entity.projectile_speed != null) stats.push({ label: "VEL", value: `${entity.projectile_speed.toFixed(0)}m/s` });
    if (entity.inventory_price != null) stats.push({ label: "PRICE", value: `$${entity.inventory_price}` });
  } else if (current.type === "vehicle") {
    if (entity.max_speed != null) stats.push({ label: "SPD", value: entity.max_speed.toFixed(1) });
    if (entity.max_health != null) stats.push({ label: "HP", value: String(entity.max_health) });
    if (entity.mass != null) stats.push({ label: "MASS", value: `${entity.mass.toFixed(0)}kg` });
    if (entity.acceleration != null) stats.push({ label: "ACC", value: entity.acceleration.toFixed(2) });
    if (entity.respawn_time != null) stats.push({ label: "RSPN", value: `${entity.respawn_time}s` });
  } else {
    const price = entity.inventory_price;
    if (price != null) stats.push({ label: "PRICE", value: `$${price}` });
    if (entity.inventory_encumbrance != null) stats.push({ label: "WGT", value: `${entity.inventory_encumbrance.toFixed(1)}kg` });
    if (entity.commonness_value != null) stats.push({ label: "RARITY", value: entity.commonness_value.toFixed(2) });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#080c12", overflow: "hidden" }}>
      {/* 3D canvas */}
      <Canvas camera={{ position: [0, 0.3, 3.5], fov: 50 }} style={{ position: "absolute", inset: 0 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[2, 2, 3]} intensity={2} color="#f59e0b" angle={0.3} penumbra={0.5} />
        <pointLight position={[-2, -1, -1]} intensity={0.3} color="#3b82f6" />
        <IconCard iconUrl={iconUrl} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.5}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>

      {/* HTML overlay — name & stats around the card */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", padding: isMobile ? 16 : 32 }}>
        {/* Type badge */}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--accent)", letterSpacing: "0.2em", marginBottom: 4, opacity: 0.7 }}>
          {current.type.toUpperCase()}
        </div>
        {/* Name */}
        <div style={{ fontFamily: "var(--font-display)", fontSize: isMobile ? "clamp(16px,4vw,28px)" : "clamp(22px,2.5vw,36px)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em", textShadow: "0 2px 16px rgba(0,0,0,0.9)", textAlign: "center", maxWidth: "80vw" }}>
          {name}
        </div>
        {/* Stats row */}
        {stats.length > 0 && (
          <div style={{ display: "flex", gap: isMobile ? 12 : 20, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: "center", animation: `fade-in 0.3s var(--ease-smooth) ${i * 0.08}s both` }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", color: "var(--text-dim)", letterSpacing: "0.1em" }}>{s.label}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--font-md)", fontWeight: 700, color: "var(--accent)" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top-right: count */}
      <div style={{ position: "absolute", top: 20, right: 24, fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", color: "var(--text-dim)", opacity: 0.4 }}>
        {index + 1} / {pool.length}
      </div>

      {/* Bottom hint */}
      <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", color: "var(--text-muted)", opacity: 0.25 }}>
        ← → navigate · auto-cycle 10s
      </div>
    </div>
  );
}
