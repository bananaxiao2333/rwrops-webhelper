# RWROPS Web Helper — Tactical Data Terminal

A React SPA frontend for browsing [rwrops-core](https://github.com/bananaxiao2333/rwrops-core) output data. Browse weapons, vehicles, factions, projectiles, and community guides — then generate `misc_text_vanilla.xml` info supplements with a DIY field-path composer.

<table><tr><td>
<img src="https://raw.githubusercontent.com/bananaxiao2333/rwrops-webhelper/main/public/icon.svg" width="64" alt="RWROPS">
</td><td>

**Live:** [rwrops.079682.xyz](https://rwrops.079682.xyz)  
**Backend:** [rwrops-core](https://github.com/bananaxiao2333/rwrops-core)

</td></tr></table>

## Features

- **Entity browser** — grid/tile views with search, sort, and type-specific filters
- **Detail pages** — recursive property display, cross-references, and type-specific visualizations (vehicle 3D, weapon radar, faction trees)
- **Multi-language** — 6 UI languages (EN / 中文 / DE / ES / FR / RU) + game data translation via `data.language`
- **Documentation** — Markdown/MDX article system with search, TOC, and embedded images
- **MetaGen v2** — DIY info supplement builder:
  - Data tree explorer with nested field paths (`weapon.stances.standing.accuracy_factor`)
  - Per-field config: prefix/suffix, precision, conditional display, templates
  - Live preview with aligned columns and clickable entity links
  - XML export (`misc_text_vanilla.xml` format), config import/export
- **Stall Generator** — drag-reorder item lists with PNG export for in-game chat
- **Dark/Light theme** — tactical terminal aesthetic with system theme detection

## Quick Start

```bash
# 1. Clone
git clone https://github.com/bananaxiao2333/rwrops-webhelper.git
cd rwrops-webhelper

# 2. Install
npm install

# 3. Configure data source
cp .env.example .env
# Set VITE_DATA_SOURCE to your rwrops-core dist/ directory or hosted URL

# 4. Dev
npm run dev        # → http://localhost:5173

# 5. Build
npm run build      # → dist/ (includes sitemap.xml + robots.txt)
```

## Data Source

The app reads from a single external endpoint — either local or remote:

```
VITE_DATA_SOURCE=/path/to/rwrops-core/dist
# or
VITE_DATA_SOURCE=https://data.rwrops.xyz
```

Expected files:
- `result.json` — all parsed entity data
- `metadata.yaml` — generation timestamp, entity counts, source paths
- `assets/_index.json` → `assets/{hash}` — exported resource files

## Project Structure

```
rwrops_webhelper/
├── src/
│   ├── main.jsx                # Entry point — providers + router
│   ├── App.jsx                 # Main layout, routing, SEO
│   ├── routes.jsx              # HomePage (terminal boot screen)
│   ├── List.jsx                # Entity grid view (tiles)
│   ├── Detail.jsx              # Entity detail with recursive display
│   ├── GlobalSearch.jsx        # Ctrl+K global search modal
│   ├── SEO.jsx                 # Helmet meta tags + structured data
│   ├── DataContext.jsx         # Data fetching + loading screen
│   ├── dataSource.js           # Env-based source resolver
│   ├── assetLoader.jsx         # Lazy asset index + icon resolution
│   ├── i18n.jsx                # I18nProvider — UI strings + game data translate
│   ├── hashRouter.js           # History API routing compat layer
│   ├── docs.js                 # Dynamic MDX article loader
│   ├── docsLazy.js             # Lazy-loaded docs module wrapper
│   ├── docSearch.js            # Article search index
│   ├── DocsPage.jsx            # Article viewer + search
│   ├── detail_visual/          # Visualizations per entity type
│   │   ├── GunPerformanceVisualization.jsx   # Weapon radar chart
│   │   ├── VehicleVisualization.jsx          # Vehicle 3D model
│   │   ├── FactionVisualization.jsx          # Faction hierarchy
│   │   └── ... (15 components)
│   ├── tools/
│   │   ├── MetaGen.jsx         # Info supplement builder (v2)
│   │   ├── MetaGenDefaults.js  # Default field config
│   │   ├── StallGenerator.jsx  # WTS stall list generator
│   │   └── ToolsListPage.jsx   # Tools hub
│   └── i18n/
│       ├── en.json / cn.json / de.json / es.json / fr.json / ru.json
├── docs/articles/              # Community guides (.md/.mdx)
├── scripts/
│   └── generate-sitemap.js     # Build-time sitemap generator
├── public/
│   └── icon.svg                # App icon
└── vite.config.js              # Vite + React Compiler config
```

## Tech Stack

| Layer         | Tech                                              |
| ------------- | ------------------------------------------------- |
| Framework     | React 19 + Vite 8 + React Compiler                |
| UI            | MUI 6 + Emotion + Phosphor Icons                  |
| Routing       | react-router-dom v7                                |
| 3D            | React Three Fiber + Drei                           |
| Data tables   | TanStack Table                                     |
| Export        | html2canvas (PNG)                                  |
| Build         | Rolldown (Vite 8)                                  |
| SEO           | react-helmet-async, JSON-LD                        |

## Related

- [bananaxiao2333/rwrops-core](https://github.com/bananaxiao2333/rwrops-core) — Data pipeline that generates the JSON this app consumes
