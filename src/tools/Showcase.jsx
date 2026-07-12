/* ───────────────────────────────────────────────────
 *  Showcase.jsx — 3D 实体展台 v4
 *  · 不对称布局：图标偏左，文字偏右
 *  · 透明背景 + alpha cutout
 *  · 戏剧化打光 + 宽高比保持
 *  · 右下角倒计时 + 淡入淡出过渡
 *  · 粒子背景 + 随机运镜
 * ─────────────────────────────────────────────────── */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Icon } from "@iconify/react";
import { useI18n } from "../i18n.jsx";
import { useData } from "../DataContext.jsx";
import { useItemIcon } from "../assetLoader.jsx";

/* ── 摄像机旋转 ── */
function CameraRotator() {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.6;
    const r = 6;
    camera.position.set(Math.cos(t) * r, 1.5, Math.sin(t) * r);
    camera.lookAt(-1, 0, 0);
  });
  return null;
}

/* ── 粒子 ── */
function ParticleField({ count = 150 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      // Spherical distribution: random radius between 3-15
      const r = 3 + Math.pow(Math.random(), 0.5) * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i] = r * Math.sin(phi) * Math.cos(theta);
      arr[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i + 2] = r * Math.cos(phi);
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

/* ── 图标卡片（保持宽高比、alpha cutout） ── */
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
      {/* Card with texture */}
      <mesh>
        <planeGeometry args={[w, h]} />
        {tex ? (
          <meshStandardMaterial map={tex} transparent premultipliedAlpha side={THREE.DoubleSide} opacity={opacity}
            roughness={0.05} metalness={0} emissive="#ffffff" emissiveIntensity={0.8} emissiveMap={tex} />
        ) : (
          <meshStandardMaterial color="#131a24" roughness={0.3} opacity={opacity} transparent />
        )}
      </mesh>
      {/* Glow border — bright outer rim */}
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[w + 0.25, h + 0.25]} />
        <meshBasicMaterial color="#fbbf24" side={THREE.BackSide} opacity={0.35 * opacity} transparent />
      </mesh>
      {/* Glow aura — larger softer halo */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[w + 0.6, h + 0.6]} />
        <meshBasicMaterial color="#f59e0b" opacity={0.1 * opacity} transparent />
      </mesh>
      {/* Ground reflection ring */}
      <mesh position={[0, -h/2 - 0.3, 0]} rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[w/2 + 0.2, 0.025, 8, 48]} />
        <meshBasicMaterial color="#f59e0b" opacity={0.5 * opacity} transparent />
      </mesh>
    </group>
  );
}

/* ── 淡入淡出包装 ── */
function FadeTransition({ children }) {
  const [v, setV] = useState(true);
  useEffect(() => { setV(false); const t = setTimeout(() => setV(true), 150); return () => clearTimeout(t); }, [children]);
  return <group>{children}</group>;
}

/* ═══════════════════════════════════════════════════
 *  MAIN
 *  ═══════════════════════════════════════════════════ */
export default function Showcase() {
  const { translate } = useI18n();
  const { data } = useData();

  const pool = useMemo(() => {
    if (!data) return [];
    const items = [];
    for (const type of ["weapon","vehicle","carry_item"]) {
      const b = data[type]; if (!b) continue;
      for (const [k,e] of Object.entries(b)) { if (typeof e==="object"&&e) items.push({type,key:k,entity:e}); }
    }
    for (let i=items.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]]; }
    return items.slice(0, 300);
  }, [data]);

  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(10.0);
  const [transitioning, setTransitioning] = useState(false);
  const current = pool[index];

  // Preload icons for next 5 entities in pool
  const [preloadQueue, setPreloadQueue] = useState([]);
  useEffect(() => {
    const next = [];
    for (let i = 1; i <= 5; i++) {
      const e = pool[(index + i) % pool.length];
      if (e) next.push(e);
    }
    setPreloadQueue(next);
  }, [index, pool]);

  // Timer countdown
  useEffect(() => {
    if (!pool.length) return;
    setTimer(5.0);
    const start = performance.now();
    const iv = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const remaining = Math.max(0, 5 - elapsed);
      setTimer(remaining);
      if (remaining <= 0) clearInterval(iv);
    }, 50);
    return () => clearInterval(iv);
  }, [index, pool.length]);

  // Auto-advance
  useEffect(() => {
    if (!pool.length) return;
    const t = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => { setIndex((i)=>(i+1)%pool.length); setTransitioning(false); }, 200);
    }, 5000);
    return () => clearInterval(t);
  }, [pool.length]);

  // Keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key==="ArrowRight"){e.preventDefault();setTransitioning(true);setTimeout(()=>{setIndex(i=>(i+1)%pool.length);setTransitioning(false)},200);}
      if (e.key==="ArrowLeft"){e.preventDefault();setTransitioning(true);setTimeout(()=>{setIndex(i=>(i-1+pool.length)%pool.length);setTransitioning(false)},200);}
      if (e.key==="Escape")window.history.back();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [pool.length]);

  if (!current) return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#080c12",color:"var(--text-dim)",fontFamily:"var(--font-mono)"}}>Loading...</div>;

  const entity = current.entity;
  const iconUrl = useItemIcon(entity);
  const name = translate(entity.name||current.key)?.slice(0,32) || current.key;

  // Auto-skip entities without icons
  const skipRef = useRef(null);
  useEffect(() => {
    if (!iconUrl && pool.length) {
      skipRef.current = setTimeout(() => setIndex((i) => (i + 1) % pool.length), 100);
    }
    return () => { if (skipRef.current) clearTimeout(skipRef.current); };
  }, [iconUrl, pool.length]);

  if (!iconUrl && pool.length) {
    return (
      <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#080c12",color:"var(--text-dim)",fontFamily:"var(--font-mono)"}}>
        <Icon icon="ph:spinner" width={24} style={{opacity:0.3}} />
      </div>
    );
  }

  // Stats
  const stats = [];
  if (current.type==="weapon") {
    if (entity.projectile_result_kill_probability!=null) stats.push({l:"KILL",v:`${(entity.projectile_result_kill_probability*100).toFixed(0)}%`});
    if (entity.retrigger_time!=null) stats.push({l:"RATE",v:`${entity.retrigger_time.toFixed(2)}s`});
    if (entity.magazine_size>0) stats.push({l:"MAG",v:String(entity.magazine_size)});
    if (entity.inventory_price!=null) stats.push({l:"PRICE",v:`$${entity.inventory_price}`});
  } else if (current.type==="vehicle") {
    if (entity.max_speed!=null) stats.push({l:"SPD",v:entity.max_speed.toFixed(1)});
    if (entity.max_health!=null) stats.push({l:"HP",v:String(entity.max_health)});
    if (entity.mass!=null) stats.push({l:"MASS",v:`${entity.mass.toFixed(0)}kg`});
  } else {
    const p = entity.inventory_price; if (p!=null) stats.push({l:"PRICE",v:`$${p}`});
    if (entity.inventory_encumbrance!=null) stats.push({l:"WGT",v:`${entity.inventory_encumbrance.toFixed(1)}kg`});
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const op = transitioning ? 0.3 : 1;

  return (
    <div style={{position:"fixed",inset:0,background:"#080c12",overflow:"hidden",cursor:"grab"}}>
      <Canvas camera={{position:[0,1.5,6],fov:48}} style={{position:"absolute",inset:0}}>
        {/* Front directional — even illumination from camera direction */}
        <directionalLight position={[0,1,5]} intensity={3.5} color="#ffffff" />
        {/* Rim light — warm amber for depth */}
        <spotLight position={[-2,0.5,-1]} intensity={3} color="#f59e0b" angle={1} penumbra={0.5} />
        {/* Side fill — cool blue */}
        <pointLight position={[2,1,3]} intensity={2.5} color="#93c5fd" />
        {/* Ground fill — soft uplight */}
        <pointLight position={[0,-2,2]} intensity={2} color="#64748b" />
        {/* Ambient — bright base illumination */}
        <ambientLight intensity={1.5} />
        <ParticleField count={300} />
        <IconCard iconUrl={iconUrl} opacity={op} />
        <CameraRotator />
      </Canvas>

      {/* HTML overlay — asymmetric: text on left side */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"flex-start",padding:isMobile?16:40}}>
        <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--font-xs)",color:"var(--accent)",letterSpacing:"0.2em",marginBottom:4,opacity:0.7*op,transition:"opacity 0.2s ease"}}>
          {current.type.toUpperCase()}
        </div>
        <div style={{fontFamily:"var(--font-display)",fontSize:isMobile?"clamp(16px,4vw,28px)":"clamp(22px,2.5vw,36px)",fontWeight:700,color:"var(--text-primary)",letterSpacing:"0.04em",textShadow:"0 2px 16px rgba(0,0,0,0.9)",textAlign:"left",maxWidth:"55vw",opacity:op,transition:"opacity 0.2s ease"}}>
          {name}
        </div>
        {stats.length>0 && (
          <div style={{display:"flex",gap:isMobile?12:20,marginTop:12,flexWrap:"wrap",justifyContent:"flex-start"}}>
            {stats.map((s,i)=>(
              <div key={i} style={{textAlign:"center",opacity:op,transition:"opacity 0.2s ease"}}>
                <div style={{fontFamily:"var(--font-mono)",fontSize:"var(--font-xxs)",color:"var(--text-dim)",letterSpacing:"0.1em"}}>{s.l}</div>
                <div style={{fontFamily:"var(--font-display)",fontSize:"var(--font-md)",fontWeight:700,color:"var(--accent)"}}>{s.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Countdown — bottom right */}
      <div style={{position:"absolute",bottom:isMobile?16:28,right:isMobile?16:28,fontFamily:"var(--font-mono)",fontSize:"var(--font-md)",color:"var(--accent)",opacity:0.5}}>
        {timer.toFixed(1)}s
      </div>

      {/* Index top right */}
      <div style={{position:"absolute",top:20,right:24,fontFamily:"var(--font-mono)",fontSize:"var(--font-xxs)",color:"var(--text-dim)",opacity:0.35}}>
        {index+1}/{pool.length}
      </div>

      {/* Hidden preloader for next icons */}
      <div style={{position:"absolute",width:0,height:0,overflow:"hidden",opacity:0}}>
        {preloadQueue.map((item) => (
          <IconPreloader key={`pre-${item.type}.${item.key}`} entity={item.entity} />
        ))}
      </div>
    </div>
  );
}

/* ── Hidden icon preloader (resolves useItemIcon, warms browser cache) ── */
function IconPreloader({ entity }) {
  const url = useItemIcon(entity);
  return url ? <img src={url} alt="" style={{width:1,height:1}} /> : null;
}
