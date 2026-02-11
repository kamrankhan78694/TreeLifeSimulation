# Architecture — Phase 1 (Current)

> Comprehensive technical reference for the Tree Life Simulation as shipped in Phase 1.

---

## Table of contents

1. [High-level overview](#high-level-overview)
2. [Runtime data flow](#runtime-data-flow)
3. [Global state objects](#global-state-objects)
4. [Module reference](#module-reference)
5. [Script load order](#script-load-order)
6. [Biological model](#biological-model)
7. [Rendering pipeline](#rendering-pipeline)
8. [Configuration and tuning](#configuration-and-tuning)
9. [UI and controls](#ui-and-controls)
10. [Known limitations](#known-limitations)

---

## High-level overview

Tree Life Simulation is a **static, vanilla HTML/CSS/JS single-page app** (no bundler, no npm, no ES modules). It models a single tree's entire lifecycle — from germination through maturity and eventual senescence — inside an interactive Canvas 2D scene with HDR-like post-processing.

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| No build tools | Zero-friction local development; one `python3 -m http.server` to run. |
| Global-scope architecture | Scripts share state through well-known globals (`tree`, `environment`, `simulationState`, `renderer`). |
| Fixed-timestep physics | Biological updates run at 60 Hz substeps to ensure numerical stability regardless of frame rate. |
| Seeded PRNG | Every procedural element (branch shape, weather, noise) is reproducible from a single seed value. |
| HDR on Canvas 2D | Bloom, tone mapping, and atmospheric shading are approximated in software to avoid WebGL dependency. |

---

## Runtime data flow

Each animation frame follows this pipeline:

```
┌─────────────────────────────────────────────────────────┐
│  Browser requestAnimationFrame                          │
│                                                         │
│  1. updateEnvironmentFromUI()                           │
│     ← reads sliders/checkboxes → environment object     │
│                                                         │
│  2. Fixed-timestep loop (up to 10 substeps @ 60 Hz)     │
│     ├─ updateEnvironmentTime(dt)                        │
│     │   └─ advances dayOfYear, year, season             │
│     └─ updateBiology(dt)                                │
│         ├─ calculatePhotosynthesis()                    │
│         ├─ respiration (Q10 model)                      │
│         ├─ carbon balance → growth allocation           │
│         ├─ updateFoliage(dt)                            │
│         ├─ updateBiomass(dt)                            │
│         ├─ handleLeafDrop(dt)                           │
│         └─ applyMortalityModel(dt)                      │
│                                                         │
│  3. renderScene(dayOfYear, seasonProgress)              │
│     ├─ drawAtmosphericSky()                             │
│     ├─ drawTree()                                       │
│     ├─ drawParticles()                                  │
│     ├─ applyBloom()                                     │
│     └─ applyToneMapping()                               │
│                                                         │
│  4. updateReadout() + drawHealthGraph()                 │
│     └─ DOM readouts, graph canvas overlays              │
└─────────────────────────────────────────────────────────┘
```

---

## Global state objects

### `environment` (js/environment.js)

Holds all site-level conditions the tree responds to.

| Field | Type | Description |
|-------|------|-------------|
| `year` | number | Current simulation year |
| `dayOfYear` | number | 0–365 day counter |
| `season` | object | Current `SEASONS.*` identity |
| `hour` | number | Time of day |
| `sunlight` | number | Light intensity (slider-driven) |
| `water` | number | Water availability |
| `temperature` | number | Ambient temperature |
| `soilQuality` | number | Soil fertility |
| `windSpeed` | number | Wind speed |
| `humidity` | number | Atmospheric moisture |
| `totalStress` | number | Combined stress scalar |
| `waterAvailability` | number | Effective water after evapotranspiration |
| `disease` / `pests` / `storm` / `pollution` | boolean | Stressor toggles |

### `tree` (js/tree.js)

Represents all tree biology, morphology, and visual geometry.

| Category | Key fields |
|----------|------------|
| **Temporal** | `age`, `daysSinceBirth`, `germinationDate` |
| **Morphology** | `height`, `dbh`, `crownRadius`, `crownHeight`, `rootDepth`, `rootSpread`, `trunkTaper` |
| **Leaves** | `leafCount`, `leafArea`, `foliageOpacity`, `chlorophyllContent` |
| **Vitality** | `health` (0–100), `vigor`, `waterContent`, `stressLevel`, `diseaseLoad` |
| **Biomass** | `trunk`, `branches`, `leaves`, `roots`, `heartwood`, `sapwood` |
| **Carbon exchange** | `co2Absorbed`, `o2Produced`, `waterTranspired`, `carbonStored` |
| **Visual geometry** | `branches[]`, `leafClusters[]`, `leaves[]`, `rootMesh[]`, `leafDrops[]`, `barkSegments[]` |
| **Mortality** | enabled flag, age thresholds, hazard rates |

### `simulationState` (js/simulation.js)

Controls the main loop.

| Field | Description |
|-------|-------------|
| `running` | Whether the loop is active |
| `paused` | Whether updates are suspended |
| `time` | Cumulative simulation time |
| `fps` | Current frame rate |
| `frameCount` | Total frames rendered |
| `physicsAccumulator` | Time debt for fixed-step loop |
| `substepTime` | Fixed step size (1/60 s) |

### `renderer` (js/renderings.js)

Canvas state, HDR parameters, cached rendering data.

| Field | Description |
|-------|-------------|
| canvas / context | Primary drawing surface |
| HDR params | Exposure, gamma, bloom radius |
| Sun position / intensity | Calculated per frame from day/season |
| Bloom buffer | Off-screen canvas for glow pass |

---

## Module reference

### `js/config.js` — Central configuration

Defines all tunable constants in one place:

- **`CONFIG`**: canvas dimensions, physics substep count, tree biological constants (growth rates, respiration Q10, max age), rendering parameters.
- **`SEASONS`**: four season objects (`SPRING`, `SUMMER`, `AUTUMN`, `WINTER`) each with color palettes, temperature ranges, growth multipliers, and day-of-year boundaries.
- **`TREE_SPECIES`**: presets (`OAK`, `MAPLE`, `PINE`, `BIRCH`) with species-specific growth rates, tolerances, and visual traits.
- **`WEATHER_TYPES`**: seven weather patterns (`CLEAR`, `RAIN`, `STORM`, `SNOW`, `FOG`, etc.) with intensity/duration ranges.
- **`HDR`** (attached to `window`): tone mapping parameters — exposure, gamma, bloom intensity.

### `js/prng.js` — Seeded randomness

Provides reproducible pseudo-random number generation:

- **`random(min, max)`** — LCG-based RNG producing values in [0, 1) or a custom range.
- **`randomInt(min, max)`** — inclusive integer range.
- **`randomNormal(mean, stdDev)`** — Box-Muller transform for Gaussian distribution.
- **`perlin2D(x, y)`** — fast sine-based 2D noise.
- **`fbm(x, y, octaves, persistence)`** — fractional Brownian motion layering.
- **`clamp()`, `lerp()`** — math utilities.

All randomness flows from a single seed so that runs are fully reproducible via the Seed UI control.

### `js/environment.js` — Environmental state

Manages time progression and site conditions:

- **`updateEnvironmentFromUI()`** — reads DOM sliders/checkboxes into the `environment` object.
- **`updateEnvironmentTime(dt)`** — advances `dayOfYear` and `year`; selects the current season.
- **`getSeasonProgress(dayOfYear)`** — returns 0–1 progress within the current season.
- **`getSeasonalGrowthMultiplier(season)`** — growth rate scaling by season (e.g., Spring 1.6×, Winter 0.03×).

### `js/tree.js` — Tree state and geometry

Holds tree biology and generates visual structures:

- **`initializeTree()`** — resets the tree to sapling state; regenerates all geometry.
- **`generateBranchArchitecture()`** — recursive fractal branching.
- **`generateLeafClusters()`** — spherical canopy distribution of leaf groups.
- **`generateIndividualLeaves()`** — per-leaf particles for high-detail rendering.
- **`generateRootMesh()`** — procedural tap + lateral root system.
- **`generateBarkTexture()`** — trunk surface variation.
- **`getLifeStage(age)`** — maps age to labels ("Germinating" → "Legendary").
- **`createFallingLeaf()` / `updateLeafDrops(dt)`** — leaf particle physics.

### `js/simulation.js` — Main loop and biology

The simulation engine:

- **`startSimulation()`** — initializes all subsystems, begins the animation loop.
- **`animationLoop(timestamp)`** — fixed-timestep accumulator; runs up to 10 substeps per frame.
- **`updateBiology(dt)`** — core per-substep update: photosynthesis → respiration → growth → health/stress dynamics.
- **`calculatePhotosynthesis()`** — multiplicative model based on light × water × soil.
- **`calculateTotalStress()`** — combines water, temperature, light, disease, pest, and storm stresses.
- **`calculateEvapotranspiration()`** — water loss based on temperature, wind, and humidity.
- **`updateBiomass(dt, growthFactor)`** — allocates carbon to trunk/branch/leaf/root pools; models heartwood formation.
- **`applyMortalityModel(dtDays)`** — age-based and stress-based hazard rates.
- **`loadVariablesJSON()`** — fetches optional `variables.JSON` at startup.
- **`applyVariablesConfigFromObject(vars)`** — hot-applies external configuration.

### `js/renderings.js` — Canvas 2D renderer

The largest module (~65 KB); handles all visual output:

- **`initRenderer()`** — sets up canvases, DPI scaling, bloom buffer.
- **`renderScene(dayOfYear, seasonProgress)`** — main render entry point.
- **`drawAtmosphericSky()`** — gradient sky with procedural noise texture.
- **`calculateSunPosition(dayOfYear)`** — seasonal sun arc and day/night cycle.
- **`drawTree()`** — trunk, branches, foliage with layered shading.
- **`drawParticles()`** — rain, snow, pollen, birds, insects.
- **`applyBloom()`** — post-process glow effect via off-screen buffer.
- **`applyToneMapping()`** — exposure/gamma/saturation adjustments for HDR feel.

### `js/ui.js` — DOM controls and display

Wires the user interface:

- **`initUI()`** — binds sliders, buttons, checkboxes, keyboard shortcuts.
- **`handleKeyboardShortcuts(e)`** — `Space` (pause), `R` (reset), `1`–`5` (speed).
- **`updateReadout()`** — refreshes year/season/age/health/height/DBH/biomass readout.
- **`drawHealthGraph()`** — multi-line overlay graph (health, water, stress).
- **`togglePause()` / `resetSimulation()` / `applySeed()`** — control actions.
- **`exportTreeData()` / `importTreeData()`** — save/load tree state as JSON.

---

## Script load order

Scripts are loaded synchronously via `<script>` tags in `index.html`. Order matters because later scripts reference globals defined by earlier ones.

```
1. js/config.js       ← CONFIG, SEASONS, TREE_SPECIES, WEATHER_TYPES, HDR
2. js/prng.js          ← random(), perlin2D(), fbm()
3. js/environment.js   ← environment object
4. js/tree.js          ← tree object, particles
5. js/renderings.js    ← renderer object (reads CONFIG, HDR at parse time)
6. js/ui.js            ← initUI(), updateReadout(), drawHealthGraph()
7. js/simulation.js    ← startSimulation() called on DOMContentLoaded
```

**Critical**: `config.js` must load before `renderings.js` because the renderer reads `CONFIG` and `HDR` at parse time.

---

## Biological model

### Photosynthesis

A multiplicative rate model:

```
photosynthesisRate = baseRate × sunlight × waterFactor × soilQuality × seasonMultiplier
```

Where `seasonMultiplier` ranges from 1.6× (Spring) to 0.03× (Winter).

### Respiration

Uses the Q10 temperature-response model:

```
respirationRate = baseRespiration × Q10^((temperature − referenceTemp) / 10)
```

Higher temperatures exponentially increase metabolic cost.

### Carbon balance and growth

```
netCarbon = photosynthesis − respiration
growthFactor = netCarbon × healthModifier × vigorModifier
```

Positive net carbon is allocated to biomass pools (trunk, branches, leaves, roots) via configurable ratios. Heartwood forms progressively from sapwood.

### Stress model

Total stress is the combined effect of:

- **Water stress** — deviation from optimal water availability
- **Temperature stress** — heat or frost extremes
- **Light stress** — insufficient sunlight
- **Disease load** — cumulative disease damage
- **Pest damage** — insect/herbivore effects
- **Storm damage** — mechanical stress and breakage

Stress reduces growth efficiency, accelerates leaf drop, and increases mortality hazard.

### Mortality

Two independent hazard functions:

1. **Age-based** — baseline mortality rate that increases beyond a senescence threshold.
2. **Stress-based** — mortality probability proportional to sustained stress level.

### Phenology

Seasonal transitions drive:

- **Bud burst** (Spring) — leaf-out, chlorophyll ramp-up
- **Full canopy** (Summer) — peak photosynthesis
- **Senescence** (Autumn) — chlorophyll breakdown, programmed leaf drop
- **Dormancy** (Winter) — minimal metabolism, bare canopy

---

## Rendering pipeline

### Per-frame stages

1. **Sky** — atmospheric gradient with procedural noise; changes by time of day and season.
2. **Sun** — position computed from day-of-year; influences scene lighting and highlights.
3. **Ground** — terrain with seasonal color variation.
4. **Tree** — trunk (bark texture + taper), branches (recursive geometry), foliage (layered shading with shadow/mid/highlight passes).
5. **Particles** — rain, snow, falling leaves, pollen, dust, birds, insects.
6. **Post-processing** — bloom (off-screen buffer convolution) + tone mapping (exposure, gamma, saturation).

### HDR approach

The simulation approximates HDR on a standard Canvas 2D surface:

- Colors are computed in a wider range than 0–255.
- **Bloom** blurs bright regions onto an off-screen buffer and composites back.
- **Tone mapping** applies exposure and gamma curves to compress dynamic range.
- The result is a perceptually richer image without requiring WebGL or floating-point textures.

---

## Configuration and tuning

### `CONFIG` object (js/config.js)

All "magic numbers" are centralized here. Key categories:

| Category | Examples |
|----------|----------|
| Canvas | `width: 1920`, `height: 1200`, `dpi: 2` |
| Physics | substep count, accumulator cap |
| Tree biology | max height, growth rates, Q10 coefficient, respiration base |
| Rendering | particle counts (rain: 500, snow: 400, leaves: 60), sky noise octaves |

### `SEASONS` definitions

Each season specifies: color palette, temperature range, precipitation tendency, day-of-year boundaries, and growth multiplier.

### `variables.JSON` (optional)

Loaded at startup; safe no-op if missing. Sections:

- `ui_defaults` — initial slider positions
- `stressors` — threshold values
- `canvas_settings` — dimensions and background
- `hdr_parameters` — despite the name, contains age and mortality settings (max age, senescence start, base mortality rate)
- `config_overrides` — simulation speed, mortality toggle

Can also be edited live via the Config textarea in the UI and applied with `applyVariablesConfigFromObject()`.

---

## UI and controls

### Environment sliders

| Control | DOM ID | Drives |
|---------|--------|--------|
| Sunlight | `sun` | `environment.sunlight` |
| Water | `water` | `environment.water` |
| Temperature | `temp` | `environment.temperature` |
| Soil Quality | `soil` | `environment.soilQuality` |
| Wind Speed | `wind` | `environment.windSpeed` |
| Humidity | `humidity` | `environment.humidity` |

### Stressor toggles

| Control | Effect |
|---------|--------|
| Disease | Increases `diseaseLoad`, chronic stress |
| Pests | Reduces leaf area, damages growth |
| Storm | Mechanical stress, branch breakage risk |
| Pollution | Chronic stress factor |

### Simulation controls

| Control | Key | Action |
|---------|-----|--------|
| Pause/Resume | `Space` | Toggles `simulationState.paused` |
| Reset | `R` | Reinitializes tree + environment |
| Speed 1×–5× | `1`–`5` | Time multiplier presets |
| Seed | — | Sets PRNG seed for reproducibility |

### Readout panel

Displays: Year, Season, Age, Life Stage, Health (0–100), Height, DBH, Total Biomass, Carbon Stored, CO₂ Absorbed, O₂ Produced, Status Emoji.

### Health graph

Multi-line overlay on a small canvas showing historical trends for health, water availability, and stress level.

---

## Known limitations

These are Phase 1 constraints that inform the Phase 2 roadmap (see [PHASE2_ROADMAP.md](./PHASE2_ROADMAP.md)):

| Area | Limitation |
|------|------------|
| **Single tree** | Only one tree is simulated; no forest/ecosystem interactions. |
| **No spatial model** | The tree exists at a dimensionless "site" — no neighbors, no light competition, no spatial root zones. |
| **Simplified weather** | Weather is stochastic per-frame rather than driven by a coherent climate model. |
| **No soil model** | Soil quality is a single slider value, not a layered profile with nutrients, pH, or microbial activity. |
| **Canvas 2D only** | Rendering is CPU-bound; no GPU acceleration via WebGL/WebGPU. |
| **No persistence** | Simulation state is lost on page reload (export/import is manual). |
| **No tests** | No automated test suite exists. |
| **No accessibility audit** | Basic media queries exist but no WCAG compliance review has been done. |
| **Global scope** | All modules share a flat global namespace; no module isolation. |
