/* ───────────────────────────────────────────────────
 *  Showcase.jsx — 全屏 3D 实体展示器
 *  · 随机预加载武器/载具/携带物
 *  · 3D 渲染（载具） / 数据卡片（武器/物品）
 *  · 自动循环切换 + 键盘导航
 *  · 粒子背景 + 全屏沉浸
 * ─────────────────────────────────────────────────── */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@iconify/react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box, Cylinder, Sphere, Plane, Text } from "@react-three/drei";
import { useI18n } from "../i18n.jsx";
import { useData } from "../DataContext.jsx";

/* ── 粒子背景 ── */
function ParticleField({ count = 120 }) {
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 40,
        y: (Math.random() - 0.5) * 30,
        z: (Math.random() - 0.5) * 20,
        s: Math.random() * 0.04 + 0.02,
      });
    }
    return arr;
  }, [count]);

  return (
    <>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.s, 4, 4]} />
          <meshBasicMaterial color="#f59e0b" opacity={0.3 + Math.random() * 0.3} transparent />
        </mesh>
      ))}
    </>
  );
}

/* ── 简易载具 3D ── */
function SimpleVehicle3D({ item }) {
  const extent = item.extent || [3, 1, 5];
  const w = Math.abs(extent[0]) || 2;
  const h = Math.abs(extent[1]) || 1;
  const d = Math.abs(extent[2]) || 4;
  const color = "#5c6b7a";

  return (
    <group>
      <Plane args={[20, 20]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <meshStandardMaterial color="#0d1117" roughness={0.6} />
      </Plane>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Wheels */}
      {[-1, 1].flatMap((xSide) =>
        [-1, 1].map((zSide) => (
          <mesh key={`${xSide}-${zSide}`} position={[xSide * (w / 2 - 0.3), 0.5, zSide * (d / 2 - 0.6)]}>
            <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} rotation={[Math.PI / 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
          </mesh>
        ))
      )}
      {/* Cabin */}
      <mesh position={[0, h + 0.3, d * 0.2]}>
        <boxGeometry args={[w * 0.6, 0.5, d * 0.35]} />
        <meshStandardMaterial color="#3a5a8a" roughness={0.1} metalness={0.3} opacity={0.4} transparent />
      </mesh>
    </group>
  );
}

/* ── 武器旋转卡片 ── */
function WeaponCard3D({ item }) {
  const killProb = item.projectile_result_kill_probability;
  const rate = item.retrigger_time;
  const mag = item.magazine_size;

  return (
    <group>
      <Plane args={[16, 16]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <meshStandardMaterial color="#0d1117" roughness={0.6} />
      </Plane>
      {/* Abstract weapon shape */}
      <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.25, 3, 8]} />
        <meshStandardMaterial color="#8899aa" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0.8, 0.3, 0]}>
        <boxGeometry args={[1.6, 0.3, 0.4]} />
        <meshStandardMaterial color="#5c6b7a" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Kill probability orb */}
      {killProb != null && (
        <mesh position={[1.5, 0.6, 0]} scale={[killProb * 2, killProb * 2, killProb * 2]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color={killProb > 0.5 ? "#ef4444" : "#f59e0b"} roughness={0.1} emissive={killProb > 0.5 ? "#ef4444" : "#f59e0b"} emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}

/* ── 物品旋转对象 ── */
function ItemModel3D({ item }) {
  const price = item.inventory_price;
  return (
    <group>
      <Plane args={[16, 16]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <meshStandardMaterial color="#0d1117" roughness={0.6} />
      </Plane>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={price > 100 ? "#f59e0b" : "#8899aa"} roughness={0.2} metalness={0.5} />
      </mesh>
      {price != null && (
        <mesh position={[-1.2, 0.8, 0]} scale={[0.4, 0.4, 0.4]}>
          <boxGeometry args={[1, 1.5, 0.3]} />
          <meshStandardMaterial color="#22c55e" roughness={0.1} emissive="#22c55e" emissiveIntensity={0.3} />
        </mesh>
      )}
    </group>
  );
}

/* ═══════════════════════════════════════════════════
 *  MAIN
 *  ═══════════════════════════════════════════════════ */
export default function Showcase() {
  const { translate, t } = useI18n();
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
    return items;
  }, [data]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const current = pool[index] || null;

  // Auto-advance
  useEffect(() => {
    if (paused || !pool.length) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % pool.length), 8000);
    return () => clearInterval(t);
  }, [paused, pool.length]);

  // Keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); setIndex((i) => (i - 1 + pool.length) % pool.length); }
      if (e.key === "ArrowRight") { e.preventDefault(); setIndex((i) => (i + 1) % pool.length); }
      if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
      if (e.key === "Escape") { window.history.back(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [pool.length]);

  if (!current) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-deep)", fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>
        Loading...
      </div>
    );
  }

  const entity = current.entity;
  const name = translate(entity.name || current.key) || entity.name || current.key;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#080c12", overflow: "hidden" }}>
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 3, 10], fov: 45 }} style={{ position: "absolute", inset: 0 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#f59e0b" />
        <pointLight position={[-3, 2, -3]} intensity={0.5} color="#3b82f6" />
        <ParticleField count={150} />
        <group rotation={[0, 0, 0]}>
          {current.type === "vehicle" && <SimpleVehicle3D item={entity} />}
          {current.type === "weapon" && <WeaponCard3D item={entity} />}
          {current.type === "carry_item" && <ItemModel3D item={entity} />}
        </group>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.4}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>

      {/* Overlay */}
      {showOverlay && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: isMobile ? 20 : 40 }}>
          {/* Type badge */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--accent)", letterSpacing: "0.15em", marginBottom: 8, opacity: 0.7 }}>
            [{current.type.toUpperCase()}]
          </div>
          {/* Name */}
          <div style={{ fontFamily: "var(--font-display)", fontSize: isMobile ? "clamp(20px,5vw,36px)" : "clamp(28px,3vw,48px)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.04em", textShadow: "0 2px 12px rgba(0,0,0,0.8)", maxWidth: 600 }}>
            {name}
          </div>
          {/* Key */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)", color: "var(--text-dim)", marginTop: 4, opacity: 0.5 }}>
            {current.key}
          </div>

          {/* Controls hint */}
          <div style={{ marginTop: 24, fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", color: "var(--text-muted)", display: "flex", gap: 16, alignItems: "center", opacity: 0.4 }}>
            <span>← → nav</span>
            <span>Space {paused ? "▶" : "⏸"}</span>
            <span>Esc back</span>
            <span style={{ flex: 1 }} />
            <span>{index + 1} / {pool.length}</span>
          </div>
        </div>
      )}

      {/* Navigation dots */}
      <div style={{ position: "absolute", top: isMobile ? 16 : 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
        {pool.slice(0, 40).map((_, i) => (
          <div key={i}
            onClick={() => { setIndex(i); setPaused(true); }}
            style={{
              width: i === index ? 8 : 4, height: 4,
              background: i === index ? "var(--accent)" : "var(--border-mid)",
              borderRadius: 2, cursor: "pointer", pointerEvents: "auto",
              transition: "all var(--dur-fast) var(--ease-smooth)",
            }}
          />
        ))}
      </div>

      {/* Pause indicator */}
      {paused && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "var(--accent)", opacity: 0.6, pointerEvents: "none", animation: "breathe 2s ease infinite" }}>
          <Icon icon="ph:pause-circle" width={48} />
        </div>
      )}
    </div>
  );
}
