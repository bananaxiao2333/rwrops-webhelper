/* ───────────────────────────────────────────────────
 *  Showcase.jsx — 3D 数据流墙
 *  · 实体卡片网格布局在 3D 空间
 *  · 每张卡片：图标纹理 + 名称 + 关键数值
 *  · 缓慢滚动 + 自动循环
 *  · 高信息密度，2D 纹理投射到 3D 平面
 * ─────────────────────────────────────────────────── */
import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Plane } from "@react-three/drei";
import { useI18n } from "../i18n.jsx";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";
import * as THREE from "three";

/* ── 单个实体卡片（3D 平面） ── */
function EntityCard({ item, index, total, translateFn }) {
  const iconUrl = useItemIcon(item.entity);
  const texture = useMemo(() => {
    if (!iconUrl) return null;
    const t = new THREE.TextureLoader().load(iconUrl);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.NearestFilter;
    return t;
  }, [iconUrl]);

  // Grid position
  const cols = 5;
  const row = Math.floor(index / cols);
  const col = index % cols;
  const x = (col - (cols - 1) / 2) * 2.8;
  const y = -row * 2.4;
  const z = 0;

  // Key stats
  const name = translateFn(item.entity.name || item.key)?.slice(0, 20) || item.key;
  let statLine = "";
  if (item.type === "weapon") {
    const kp = item.entity.projectile_result_kill_probability;
    const rt = item.entity.retrigger_time;
    if (kp != null) statLine += `kill ${(kp * 100).toFixed(0)}%`;
    if (rt != null) statLine += `  ${rt.toFixed(2)}s`;
    if (item.entity.magazine_size != null) statLine += `  mag ${item.entity.magazine_size}`;
  } else if (item.type === "vehicle") {
    if (item.entity.max_speed != null) statLine += `spd ${item.entity.max_speed.toFixed(1)}`;
    if (item.entity.max_health != null) statLine += `  hp ${item.entity.max_health}`;
    if (item.entity.mass != null) statLine += `  ${item.entity.mass.toFixed(0)}kg`;
  } else {
    const price = item.entity.inventory_price ?? item.entity.inventory?.price;
    if (price != null) statLine += `$ ${price}`;
    if (item.entity.inventory_encumbrance != null) statLine += `  ${item.entity.inventory_encumbrance.toFixed(1)}kg`;
  }

  return (
    <group position={[x, y, z]}>
      {/* Card background */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2.4, 2]} />
        <meshStandardMaterial color="#131a24" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* Border */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[2.3, 1.9]} />
        <meshBasicMaterial color="#1e2d3d" side={THREE.BackSide} />
      </mesh>
      {/* Icon */}
      {texture && (
        <mesh position={[-0.6, 0.15, 0.02]}>
          <planeGeometry args={[1.2, 0.8]} />
          <meshBasicMaterial map={texture} transparent />
        </mesh>
      )}
      {/* Name */}
      <Text position={[0, -0.55, 0.03]} fontSize={0.13} color="#e8edf3" anchorX="center" anchorY="middle" maxWidth={2.1}>
        {name}
      </Text>
      {/* Stats */}
      <Text position={[0, -0.78, 0.03]} fontSize={0.09} color="#f59e0b" anchorX="center" anchorY="middle" maxWidth={2.1}>
        {statLine}
      </Text>
    </group>
  );
}

/* ── 滚动卡片墙 ── */
function CardWall({ items, translateFn }) {
  const groupRef = useRef();
  useFrame((state) => {
    if (groupRef.current) {
      // Slow upward scroll, loop back
      groupRef.current.position.y += 0.003;
      if (groupRef.current.position.y > (Math.ceil(items.length / 5)) * 2.4) {
        groupRef.current.position.y = -5;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -3, 0]}>
      {items.map((item, i) => (
        <EntityCard key={`${item.type}.${item.key}`} item={item} index={i} total={items.length} translateFn={translateFn} />
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════
 *  MAIN
 *  ═══════════════════════════════════════════════════ */
export default function Showcase() {
  const { translate, t } = useI18n();
  const { data } = useData();

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
    // Shuffle for variety
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.slice(0, 120); // first 120 shuffled entries
  }, [data]);

  if (!pool.length) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080c12", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>Loading...</div>;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#080c12", overflow: "hidden", cursor: "grab" }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[0, 2, 6]} intensity={1.2} color="#f59e0b" />
        <pointLight position={[-4, -1, 3]} intensity={0.4} color="#3b82f6" />
        <CardWall items={pool} translateFn={translate} />
      </Canvas>
      {/* Overlay hint */}
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", fontFamily: "var(--font-mono)", fontSize: "var(--font-xxs)", color: "var(--text-muted)", opacity: 0.4 }}>
        {pool.length} entities · auto-scrolling
      </div>
      <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", fontFamily: "var(--font-display)", fontSize: "var(--font-md)", color: "var(--accent)", letterSpacing: "0.15em", opacity: 0.5 }}>
        DATA WALL
      </div>
    </div>
  );
}
