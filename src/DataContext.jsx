import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { getDataSource } from "./dataSource.js";

/* ── Minimal YAML parser for metadata.yaml ── */
function parseMetadata(text) {
  const result = {};
  const lines = text.split("\n");
  let section = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.search(/\S/);

    // List item: "- value" (no colon)
    const listMatch = line.match(/^(\s*)-\s+(.*)/);
    if (listMatch && indent === 2 && section === "source_paths") {
      result[section].push(listMatch[2].trim().replace(/^['"]|['"]$/g, ""));
      continue;
    }

    const kv = line.match(/^(\s*)([^:]+):\s*(.*)/);
    if (!kv) continue;
    const key = kv[2].trim();
    const rawVal = kv[3].trim();
    if (indent === 0) {
      if (rawVal === "") { section = key; if (!result[key]) result[key] = []; }
      else {
        const num = Number(rawVal);
        result[key] = isNaN(num) ? rawVal.replace(/^['"]|['"]$/g, "") : num;
        section = null;
      }
    } else if (indent === 2) {
      if (section === "entity_counts") {
        if (!Array.isArray(result.entity_counts)) result.entity_counts = {};
        result.entity_counts[key] = Number(rawVal);
      } else if (section === "assets") {
        if (!Array.isArray(result.assets)) result.assets = {};
        result.assets[key] = Number(rawVal);
      }
    }
  }
  return result;
}

const DataContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
};

/* ── Drive the HTML loading screen from React ── */
function $(id) { return document.getElementById(id); }

function loadSet(pct, stage, detail) {
  const bar = $("progress-bar");
  const ring = $("ring-pct");
  const stageEl = $("stage-text");
  const detailEl = $("detail-text");
  if (bar) bar.style.width = Math.min(pct, 100) + "%";
  if (ring) ring.textContent = Math.round(pct);
  if (stageEl) stageEl.textContent = stage;
  if (detailEl) detailEl.textContent = detail != null ? detail : "";
}

function loadAppendLog(id, text) {
  const el = $(id);
  if (el) { el.textContent = text; el.parentElement.style.display = ""; }
}

function loadPrompt(text) {
  const el = $("prompt-label");
  if (el) el.textContent = text;
}

function loadFinish() {
  const ls = $("loading-screen");
  if (!ls) return;
  ls.classList.add("fade-out");
  setTimeout(() => { ls.style.display = "none"; }, 350);
}

export const DataProvider = ({ children }) => {
  const [data, setData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.__RWROPS_DATA__) {
      setData(window.__RWROPS_DATA__);
      loadFinish();
      return;
    }

    const { dataUrl, metadataUrl, isRemote } = getDataSource();
    let cancelled = false;

    const load = async () => {
      try {
        loadSet(8, "INITIALIZING", "Terminal boot sequence engaged");
        loadAppendLog("log-1", "Initializing system…");
        await new Promise((r) => setTimeout(r, 80));

        // ── Fetch metadata ──
        loadSet(15, "LOADING METADATA", isRemote ? `Fetching ${metadataUrl}` : `Reading ${metadataUrl}`);
        loadAppendLog("log-2", "Loading metadata…");
        const metaResp = await fetch(metadataUrl);
        if (!metaResp.ok) throw new Error(`Metadata fetch failed: ${metaResp.status}`);
        const metaText = await metaResp.text();
        const parsedMeta = parseMetadata(metaText);
        if (!cancelled) setMetadata(parsedMeta);

        // ── Fetch data package ──
        loadSet(25, "LOADING DATA PACKAGE", isRemote ? `Fetching ${dataUrl}` : `Reading ${dataUrl}`);
        loadAppendLog("log-3", "Loading data package…");
        const dataResp = await fetch(dataUrl);
        if (cancelled) return;
        if (!dataResp.ok) throw new Error(`Data fetch failed: ${dataResp.status}`);

        loadSet(55, "PROCESSING MANIFEST", "Parsing entity registries…");
        loadAppendLog("log-4", "Processing manifest…");
        const raw = await dataResp.json();

        // Gather category stats
        const cats = Object.keys(raw).filter((k) => k !== "language");
        const totalEntities = cats.reduce((sum, k) => sum + Object.keys(raw[k]).length, 0);

        loadSet(100, "MANIFEST LOADED", cats.length + " registries · " + totalEntities + " entities catalogued");
        loadAppendLog("log-5", "Manifest loaded — " + cats.length + " registries, " + totalEntities + " entities");
        loadPrompt("Select category to proceed");

        // Brief pause so user sees 100%
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;

        setData(raw);
        loadFinish();
      } catch (err) {
        if (!cancelled) { console.error(err); setError(err.message); }
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const languages = useMemo(() => {
    if (!data?.language) return [];
    return Object.entries(data.language)
      .filter(([k, v]) => v.name && v.id && !k.startsWith("_"))
      .map(([k, v]) => ({ locale: k, code: v.id, name: v.name }));
  }, [data]);

  if (error) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "var(--bg-deep)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)",
      }}>
        <div style={{ textAlign: "center", border: "1px solid var(--danger)", padding: "2rem 3rem", background: "var(--bg-surface)" }}>
          <div style={{ fontSize: "1.25rem", color: "var(--danger)", letterSpacing: "0.2em", marginBottom: "1rem" }}>&#9608; SYSTEM FAULT</div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.85rem" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.5rem 1.5rem", background: "transparent", color: "var(--accent)",
              border: "1px solid var(--accent)", fontFamily: "var(--font-mono)",
              fontSize: "0.8rem", letterSpacing: "0.15em", cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.target.style.background = "var(--accent)"; e.target.style.color = "var(--text-inverse)"; }}
            onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "var(--accent)"; }}
          >REINITIALIZE
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return <DataContext.Provider value={{ data, languages, metadata }}>{children}</DataContext.Provider>;
};
