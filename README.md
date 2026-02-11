# Tree Life Simulation (Hyperrealistic Edition)

A modular, vanilla HTML/CSS/JS single-page simulation of a tree’s life over time. It models seasonal cycles, weather + stressors, physiology (growth, respiration, carbon balance, phenology), and renders the scene with HDR-like post effects on a 2D canvas.

## Project status

**Phase 1 — Complete.** The single-tree lifecycle simulation is fully functional with seasonal cycles, weather dynamics, biotic/abiotic stressors, allometric growth, carbon-balance physiology, mortality modeling, and HDR-like Canvas 2D rendering.

For detailed technical documentation of the current architecture, see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

For the Phase 2 feature roadmap (multi-tree ecosystems, WebGL rendering, testing, and more), see **[docs/PHASE2_ROADMAP.md](docs/PHASE2_ROADMAP.md)**.

## Quickstart

Because the app loads multiple JS files, run it from a local web server (not `file://`).

```bash
cd /path/to/tree
python3 -m http.server 8080
```

Open:
- http://localhost:8080/

Notes:
- If you see a `GET /sw.js 404`, that’s typically the editor/browser probing for a service worker. The app does not require one.

## File structure

```
.
├── index.html
├── variables.JSON
├── css/
│   └── style.css
├── docs/
│   ├── ARCHITECTURE.md
│   └── PHASE2_ROADMAP.md
└── js/
    ├── config.js
    ├── environment.js
    ├── prng.js
    ├── renderings.js
    ├── simulation.js
    ├── tree.js
    └── ui.js
```

## What simulates “reality” here (and how)

This project approximates real-world behavior using simplified but structured models.

### 1) Time + seasons (macro driver)
**Where:** `js/simulation.js`, `js/environment.js`, `js/config.js`

- **Seasonal cycle**: The simulation advances a “year/day” clock and selects a season definition (colors + phenology tendencies).
- **Why it matters**: Most tree processes are seasonal (growth allocation, leaf-on/off, respiration, flowering).

### 2) Weather + climate dynamics
**Where:** `js/environment.js`, `js/config.js`

Simulates atmosphere + hydrology at a “site” level:

- **Weather types** (e.g. clear, cloudy, rain, storm, snow, fog, drought) and **intensity/duration**.
- **Wind** as speed + direction: affects transpiration stress and visual sway.
- **Cloud cover / precipitation**: influences light availability and soil moisture.
- **Air pressure / UV index** (simplified): used as additional stress/energy modifiers.
- **Acclimation + memory**: keeps short histories (recent temperature/rain) to avoid purely “instantaneous” responses.

Reality mapping:
- Trees respond to *patterns* (multi-day drought, persistent heat), not just a single frame’s values.

### 3) Stressors (biotic + abiotic)
**Where:** `js/environment.js`, UI controls in `js/ui.js`

- **Abiotic**: drought, cold/heat extremes, storms.
- **Biotic**: disease and pests.
- **Pollution**: modeled as an additional chronic stress factor.

Reality mapping:
- Stressors contribute to a combined stress load that reduces growth efficiency, increases leaf drop probability, and can accelerate decline.

### 4) Tree physiology + growth (biology)
**Where:** `js/tree.js`, `js/simulation.js`, `js/config.js`

Core biological ideas represented:

- **Allometric scaling**: size relationships (height/DBH/crown) grow in correlated ways rather than independently.
- **Biomass compartments**: trunk/branches/leaves/roots (and wood sub-compartments like sapwood/heartwood) for more realistic allocation.
- **Carbon balance**: growth depends on a simplified balance of photosynthesis input minus respiration costs.
- **Respiration with Q10**: respiration scales with temperature (a common ecological approximation).
- **Phenology**: seasonal switches like dormancy, bud burst, flowering, senescence.
- **Leaf system**: leaf count/area/density and seasonal leaf drop; optional individual leaf particles for visuals.
- **Vigor / nutrient / disease load**: internal “condition” variables that influence resilience and recovery.

Reality mapping:
- Trees are energy-limited systems; they don’t just “grow because time passed.” Growth is constrained by light, water, temperature, and stress.

### 5) Physics substeps (numerical stability)
**Where:** `js/simulation.js`

- Uses a fixed-timestep style update loop (substeps) so biological/physics-like changes are stable across different frame rates.

Reality mapping:
- This improves simulation consistency rather than representing a specific biological phenomenon.

### 6) Rendering (HDR-like look on Canvas 2D)
**Where:** `js/renderings.js`, `css/style.css`

The renderer focuses on “lifelike” cues rather than strict physical accuracy:

- **Atmospheric sky gradients** + procedural noise for texture.
- **Sun position + lighting**: changes across time/season; adds highlights and dappled light.
- **Volumetric-ish clouds and fog/mist layers**: depth cues and weather mood.
- **Tree shading**: bark texture patterns, branch tapering, layered foliage shading (shadow/mid/highlight).
- **Weather particles**: rain/snow, splashes, occasional lightning.
- **Post-processing**: bloom-like glow and tone mapping concepts (exposure/gamma style controls) to mimic HDR feel.

Reality mapping:
- Uses perceptual tricks (contrast, bloom, layered shading, noise) to suggest physical depth and lighting.

### 7) UI + observability (making the simulation legible)
**Where:** `index.html`, `js/ui.js`, `css/style.css`

- Sliders/checkboxes directly map to environmental drivers and stressors.
- Readouts summarize core state (year/season/age/health/height/DBH/biomass, etc.).
- Graph overlays show history (health and optional environment series).
- Keyboard shortcuts (implemented in UI) improve iteration speed.

Reality mapping:
- Not part of the ecosystem model, but crucial for interpreting cause → effect.

## Module-by-module reference

### `index.html`
- The main SPA entry point (layout + controls + canvases + script includes).

### `css/style.css`
- Dark “HDR-inspired” UI theme, graph styling, responsiveness, and basic accessibility media queries.

### `js/config.js`
- Central configuration: simulation constants, season definitions, weather types, HDR rendering parameters, species presets.

### `js/prng.js`
- Seeded randomness + procedural noise helpers (Perlin/fBm/Voronoi-style functions) used for natural variation.

### `js/environment.js`
- Environmental state evolution: season/time, weather selection, derived stress variables, evapotranspiration-like water loss.

### `js/tree.js`
- Tree state + biology: morphology, biomass pools, leaf state/phenology, bark/leaf generation helpers, leaf-drop particles.

### `js/renderings.js`
- Canvas 2D renderer: sky, ground, tree geometry, foliage shading, weather particles, post processing.

### `js/ui.js`
- Wires DOM controls to the environment, updates readouts/graphs, pause/reset/seed controls.

### `js/simulation.js`
- Main loop: fixed-step updates, applies environment + tree updates, triggers rendering + UI refresh.

## Legacy / alternate files

This branch is intentionally minimal (single-page app driven by `index.html` + the files in `js/` and `css/`).

If you have an older version of the project that includes files like `tree.html`, `styles/main.css`, or `js/rendering.js`, those are not part of this branch’s runtime.

## Controls

- **Sunlight / Water / Temperature / Soil / Wind / Humidity**: environmental drivers.
- **Disease / Pests / Storm / Pollution**: stressor toggles.
- **Speed**: time multiplier.
- **Pause/Resume**: stops/starts simulation.
- **Reset**: restarts the tree and environment.
- **Seed**: reproduces the same procedural variation.

Keyboard shortcuts (if enabled in your UI build):
- `Space`: pause/resume
- `R`: reset
- `1`–`5`: quick speed presets

## Performance notes

- The renderer can be CPU-heavy (procedural noise + particles + post effects).
- If you see frame drops, reduce particle counts (in `js/config.js`) or lower canvas resolution in the renderer configuration.
