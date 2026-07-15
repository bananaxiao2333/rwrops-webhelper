import { Icon } from "@iconify/react";
import React, { useState, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Box, Cylinder, Sphere, Plane } from "@react-three/drei";
import { useAsset } from "../assetLoader.jsx";
import { useI18n } from "../i18n.jsx";

/* ── Simple vehicle 3D model ── */
function VehicleModel({ item }) {
  const extent = item.extent || [3, 1, 5];
  const w = Math.abs(extent[0]);
  const h = Math.abs(extent[1]);
  const d = Math.abs(extent[2]);

  const isTank = item.tags?.some((t) => t.name === "any_tank");
  const isAPC = item.tags?.some((t) => t.name === "apc");
  const isGuntruck = item.tags?.some((t) => t.name === "guntruck");
  const bodyColor = isTank ? "#4a6741" : isAPC ? "#5c6b7a" : isGuntruck ? "#7a6b4f" : "#6b7b8d";

  return (
    <>
      <Plane args={[24, 24]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <meshStandardMaterial color="#2a2a3a" roughness={0.6} />
      </Plane>
      <gridHelper args={[24, 24, "#4a4a6a", "#2a2a3a"]} position={[0, 0.01, 0]} />

      {/* Chassis */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Wheels */}
      {item.tire_sets?.map((tire, i) => {
        const [tx,, tz] = tire.offset || [0, 0, 0];
        const r = tire.radius || 0.6;
        return (
          <group key={`wheel-${i}`} position={[tx, r, tz]}>
            <Cylinder args={[r, r, 0.35, 20]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
              <meshStandardMaterial color="#222" roughness={0.8} />
            </Cylinder>
          </group>
        );
      })}

      {/* Turrets */}
      {item.turrets?.map((turret, ti) => {
        const to = turret.offset || [0, 0, 0];
        const wp = turret.weapon_offset || [0, 0, 0];
        const turretH = 0.6;
        return (
          <group key={`turret-${ti}`}>
            <mesh position={[to[0], h + to[1] + turretH / 2, to[2]]}>
              <cylinderGeometry args={[0.6, 0.7, turretH, 10]} />
              <meshStandardMaterial color="#5a7a94" roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh position={[to[0] + wp[0], h + to[1] + wp[1] + 0.2, to[2] + wp[2]]}
              rotation={[Math.PI / 2, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.1, Math.max(1.2, Math.abs(wp[0] || 1.5)), 8]} />
              <meshStandardMaterial color="#333" roughness={0.2} metalness={0.8} />
            </mesh>
          </group>
        );
      })}

      {/* Crew */}
      {item.character_slots?.map((slot, i) => {
        const [cx, cy, cz] = slot.offset || [0, 0, 0];
        const colors = { driver: "#2ecc71", gunner: "#e74c3c", passenger: "#3498db" };
        const color = colors[slot.type] || "#9b59b6";
        return (
          <group key={`crew-${i}`} position={[cx, cy + 0.4, cz]}>
            <Sphere args={[0.2, 8, 8]}>
              <meshStandardMaterial color={color} roughness={0.5} />
            </Sphere>
            <Cylinder args={[0.12, 0.18, 0.3, 8]} position={[0, -0.25, 0]}>
              <meshStandardMaterial color={color} roughness={0.7} />
            </Cylinder>
          </group>
        );
      })}
    </>
  );
}

/* ── Texture Panel ── */
function TexturePanel({ visuals }) {
  const [open, setOpen] = useState(false);
  if (!visuals || visuals.length === 0) return null;

  const entries = visuals.map((v) => ({
    ...v,
    textureUrl: v.texture ? useAsset(v.texture) : null,
  }));

  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "8px 14px",
          fontSize: "var(--font-sm)", fontWeight: 700,
          color: open ? "var(--accent)" : "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.1em",
          cursor: "pointer", userSelect: "none",
          display: "flex", alignItems: "center", gap: 6,
          transition: "color 0.15s ease",
        }}
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>TEXTURES</span>
        <span style={{ color: "var(--text-dim)", fontSize: 9 }}>({visuals.length})</span>
      </div>
      {open && (
        <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((entry, i) => (
            <div key={i}>
              <div style={{
                fontSize: "var(--font-sm)", color: "var(--text-muted)", marginBottom: 4,
                fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
              }}>
                [{entry.class?.toUpperCase()}] {entry.mesh || ""}
                {entry.key ? ` (${entry.key})` : ""}
              </div>
              {entry.textureUrl ? (
                <img src={entry.textureUrl} alt={entry.texture}
                  style={{
                    width: "100%", maxHeight: 200, objectFit: "contain",
                    border: "1px solid var(--border-mid)",
                    imageRendering: "pixelated",
                    transition: "border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-mid)"; }}
                />
              ) : (
                <div style={{
                  padding: "16px", textAlign: "center",
                  border: "1px dashed var(--border-subtle)",
                  fontSize: "var(--font-sm)", color: "var(--text-dim)",
                }}>
                  TEXTURE NOT FOUND
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Vehicle Visualization ── */
export default function VehicleVisualization({ item }) {
  if (!item || item.type !== "vehicle") return null;

  const { t, translate } = useI18n();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const canvasContainerRef = useRef(null);

  const calculateStatistics = useCallback(() => {
    const stats = { crew: { driver: 0, gunner: 0, passenger: 0, total: 0 }, turrets: 0, wheels: 0 };
    if (item.character_slots && Array.isArray(item.character_slots)) {
      item.character_slots.forEach(slot => {
        if (slot.type === "driver") stats.crew.driver++;
        else if (slot.type === "gunner") stats.crew.gunner++;
        else if (slot.type === "passenger") stats.crew.passenger++;
        stats.crew.total++;
      });
    }
    if (item.turrets && Array.isArray(item.turrets)) stats.turrets = item.turrets.length;
    else if (item.turret_offset) stats.turrets = 1;
    if (item.tire_sets && Array.isArray(item.tire_sets)) stats.wheels = item.tire_sets.length;
    return stats;
  }, [item]);

  const stats = calculateStatistics();

  const toggleFullscreen = () => {
    if (!canvasContainerRef.current) return;
    if (!isFullscreen) {
      const el = canvasContainerRef.current;
      (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
    }
  };

  React.useEffect(() => {
    const h = () => setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement));
    document.addEventListener("fullscreenchange", h);
    document.addEventListener("webkitfullscreenchange", h);
    document.addEventListener("msfullscreenchange", h);
    return () => {
      document.removeEventListener("fullscreenchange", h);
      document.removeEventListener("webkitfullscreenchange", h);
      document.removeEventListener("msfullscreenchange", h);
    };
  }, []);

  const statFields = [
    ...(stats.crew.driver > 0 ? [{ label: t("crew_drivers"), value: stats.crew.driver }] : []),
    ...(stats.crew.gunner > 0 ? [{ label: t("crew_gunners"), value: stats.crew.gunner }] : []),
    ...(stats.crew.passenger > 0 ? [{ label: t("crew_passengers"), value: stats.crew.passenger }] : []),
    { label: t("crew_total"), value: stats.crew.total },
    { label: t("turrets_label"), value: stats.turrets },
    { label: t("wheels_label"), value: stats.wheels * 2 },
  ];

  const extent = item.extent || [3, 1, 5];
  const cameraDist = Math.max(Math.abs(extent[0]), Math.abs(extent[2])) * 2.5 + 6;

  return (
    <div style={{
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
      fontFamily: "var(--font-mono)",
    }}>
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--font-md)", fontWeight: 700,
        color: "var(--accent)", textTransform: "uppercase",
        letterSpacing: "0.08em",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon icon="mdi:car" style={{ fontSize: "var(--font-md)", color: "var(--accent)" }} />
          VEHICLE · 3D
        </div>
        <div style={{
          cursor: "pointer", padding: "2px 8px",
          border: "1px solid var(--border-subtle)",
          fontSize: "var(--font-sm)", color: "var(--text-muted)",
        }} onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
          {isFullscreen ? "EXIT FULL" : "FULLSCREEN"}
        </div>
      </div>

      {/* Stats row */}
      {!isFullscreen && (
        <div style={{
          display: "flex", gap: 4, flexWrap: "wrap",
          padding: "8px 14px",
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          {statFields.map((f, i) => (
            <div key={i} style={{
              border: "1px solid var(--border-subtle)",
              padding: "4px 10px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "var(--font-md)", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                {f.value}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: 2 }}>
                {f.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Textures panel */}
      {!isFullscreen && <TexturePanel visuals={item.visuals} />}

      {/* 3D Canvas */}
      <div ref={canvasContainerRef} style={{
        ...(isFullscreen ? {
          position: "fixed", inset: 0, width: "100vw", height: "100vh", zIndex: 1300, background: "#1a1a2a",
        } : {
          width: "100%", height: 320, position: "relative",
        }),
      }}>
        <Canvas camera={{ position: [cameraDist * 0.6, cameraDist * 0.5, cameraDist], fov: 50 }}
          style={{ height: "100%", width: "100%" }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[10, 20, 15]} intensity={1.4} />
          <directionalLight position={[-8, 10, -5]} intensity={0.6} />
          <VehicleModel item={item} />
          <OrbitControls enablePan enableZoom enableRotate minDistance={3} maxDistance={cameraDist * 3} />
        </Canvas>

        {isFullscreen && (
          <>
            {/* Top HUD */}
            <div style={{
              position: "absolute", top: 16, left: 16, zIndex: 10,
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              padding: "10px 14px",
            }}>
              <div style={{ color: "var(--text-primary)", fontSize: "var(--font-lg)", fontWeight: 700, textTransform: "uppercase" }}>
                {translate(item.name) || "UNKNOWN"}
              </div>
              <div style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", marginTop: 2 }}>
                {item.key}
              </div>
            </div>

            {/* Stats HUD */}
            {showHud && (
              <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 10 }}>
                <div style={{
                  background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", padding: "8px 14px",
                }}>
                  <div style={{ fontSize: "var(--font-base)", color: "var(--accent)", fontWeight: 700, marginBottom: 6, letterSpacing: "0.06em" }}>
                    STATS
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {statFields.map((f, i) => (
                      <div key={i} style={{ border: "1px solid var(--border-subtle)", padding: "3px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: "var(--font-md)", fontWeight: 700, color: "var(--accent)" }}>{f.value}</div>
                        <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", letterSpacing: "0.06em" }}>{f.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{
                  cursor: "pointer", marginTop: 4, fontSize: "var(--font-sm)", color: "var(--text-dim)",
                  padding: "3px 8px", border: "1px solid var(--border-subtle)",
                }} onClick={() => setShowHud(false)}>
                  HIDE HUD
                </div>
              </div>
            )}

            {!showHud && (
              <div style={{
                cursor: "pointer", position: "absolute", bottom: 16, left: 16, zIndex: 10,
                padding: "4px 10px", fontSize: "var(--font-sm)", color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)", background: "var(--bg-surface)",
              }} onClick={() => setShowHud(true)}>
                SHOW HUD
              </div>
            )}

            {/* Close */}
            <div style={{
              cursor: "pointer", position: "absolute", top: 16, right: 16, zIndex: 10,
              padding: "6px 12px", fontSize: "var(--font-base)", color: "var(--accent)",
              border: "1px solid var(--border-subtle)", background: "var(--bg-surface)",
            }} onClick={toggleFullscreen}>
              ✕
            </div>
          </>
        )}
      </div>
    </div>
  );
}
