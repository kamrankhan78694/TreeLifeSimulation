# Phase 2 Roadmap

> Feature roadmap and planning for the next evolution of Tree Life Simulation.
>
> Phase 1 delivered a single-tree lifecycle simulation with HDR-like Canvas 2D rendering, seasonal cycles, weather, stressors, and a biological growth model. Phase 2 deepens that single-tree experience with richer biology, improved rendering, developer experience, and educational value — while keeping memory usage low by staying focused on one tree at a time.

---

## Table of contents

1. [Goals](#goals)
2. [Biology and species depth](#1-biology-and-species-depth)
3. [Environmental model](#2-environmental-model)
4. [Rendering and performance](#3-rendering-and-performance)
5. [User interface and experience](#4-user-interface-and-experience)
6. [Developer experience](#5-developer-experience)
7. [Educational and outreach](#6-educational-and-outreach)
8. [Prioritization](#prioritization)
9. [Migration notes](#migration-notes)

---

## Goals

| Goal | Description |
|------|-------------|
| **Deeper single-tree realism** | Enrich the biological model of the single tree with more detailed physiology, species-specific traits, and life-stage behaviors — without adding extra trees that would increase RAM usage. |
| **Richer environment** | Replace single-value sliders with multi-dimensional models (soil layers, microclimate, water table). |
| **Visual quality** | Optional WebGL/WebGPU path for GPU-accelerated rendering while keeping the Canvas 2D fallback. |
| **Observability** | More graphs, data export, and scenario comparison tools so users can explore cause-and-effect. |
| **Developer ergonomics** | Introduce lightweight module tooling, automated tests, and CI to support contributors. |
| **Education** | Add guided scenarios and annotations that teach ecological concepts through the simulation. |
| **Low memory footprint** | Keep the simulation to a single tree so it runs smoothly on low-end devices without filling the user's RAM. |

---

## 1. Biology and species depth

### 1.1 Species selection

- Allow switching the single tree's species at plant time (Oak, Maple, Pine, Birch, and new species).
- Each species uses its own growth rates, stress tolerances, visual traits (bark texture, leaf shape, crown form), and phenology calendar.
- Species presets already exist in `TREE_SPECIES`; Phase 2 expands them with richer per-species data.

### 1.2 Enhanced mortality and disturbance

- **Fire model**: probability based on drought duration and fuel load; partial or total canopy kill.
- **Windthrow model**: large/tall trees more vulnerable to storm events.
- **Pathogen progression**: disease load advances through stages (infection → spread within the tree → decline) rather than a single toggle.

### 1.3 Expanded phenology

- Species-specific phenology calendars (early vs. late leafing, flowering windows).
- Fruit/seed production linked to tree vigor and season.
- More granular dormancy/bud-burst transitions driven by accumulated degree-days.

---

## 2. Environmental model

### 2.1 Soil profile

- Replace the single `soilQuality` slider with a layered soil model:
  - **Horizons**: O (organic), A (topsoil), B (subsoil), C (parent material).
  - **Properties per layer**: moisture, nutrient content (N, P, K), pH, organic matter, texture (sand/silt/clay).
- Root depth determines which layers a tree can access.

### 2.2 Water cycle

- Introduce a simple water-table and groundwater model.
- Precipitation → infiltration → percolation → runoff partitioning.
- Seasonal soil-moisture dynamics with realistic drying/wetting curves.

### 2.3 Microclimate

- Temperature and humidity at the tree's site vary based on its own canopy density and local topography.
- The tree's canopy creates a self-shading effect that moderates its own trunk/root temperature.

### 2.4 Climate scenarios

- Preset climate trajectories (stable, warming, drought-prone, erratic).
- Allow users to switch scenarios mid-simulation to see adaptive responses.
- Long-term CO₂ concentration effects on photosynthesis efficiency.

---

## 3. Rendering and performance

### 3.1 WebGL / WebGPU renderer (optional)

- Implement an alternative rendering backend using WebGL (or WebGPU where supported).
- Keep the existing Canvas 2D renderer as a fallback; auto-detect capabilities.
- GPU-accelerated bloom, tone mapping, and particle systems.

### 3.2 Rendering optimizations

- Adaptive particle counts based on frame rate to maintain smooth performance.
- Memory-efficient texture caching for bark, leaf, and sky assets.

### 3.3 Day/night and weather visuals

- Smooth day/night transitions with starfield and moonlight.
- Volumetric rain/snow with accumulation on ground and branches.
- Fog and mist that interact with terrain depth.

### 3.4 Camera and viewport

- Zoom controls for inspecting tree detail (bark texture, individual leaves, root system).
- Optional split-view showing above-ground and below-ground (root) perspectives.

---

## 4. User interface and experience

### 4.1 Scenario builder

- A guided wizard for creating custom starting conditions (species, site conditions, climate).
- Save/load scenarios as shareable JSON files.

### 4.2 Comparison mode

- Side-by-side simulation panels running different scenarios simultaneously.
- Synchronized time controls for A/B testing of environmental variables.

### 4.3 Enhanced graphs and analytics

- Expandable graph panel with selectable data series.
- Time-series export (CSV / JSON) for external analysis.
- Detailed drill-down panels for biomass pools, carbon balance, and stress components.

### 4.4 Timeline scrubbing

- Ability to scrub backward through recorded simulation history.
- Snapshot/bookmark system for marking interesting moments.

### 4.5 Accessibility improvements

- Full keyboard navigation for all controls.
- Screen-reader descriptions for simulation state.
- WCAG 2.1 AA color contrast audit and fixes.

### 4.6 Mobile and touch support

- Touch-friendly slider controls and gestures for canvas interaction.
- Responsive layout refinements for tablet and phone screens.

---

## 5. Developer experience

### 5.1 Module system

- Migrate from global-scope scripts to ES modules (`import`/`export`).
- Use a lightweight bundler (e.g., esbuild or Vite) for development and production builds.
- Preserve zero-dependency deployment by bundling to a single output file.

### 5.2 Automated testing

- Unit tests for biological models (photosynthesis, respiration, stress, mortality).
- Integration tests for simulation loop correctness (deterministic with seeded PRNG).
- Visual regression tests for renderer output (canvas snapshot comparison).
- Test framework: lightweight (e.g., Vitest or plain Node.js `assert`).

### 5.3 Continuous integration

- GitHub Actions workflow: lint → test → build on every push/PR.
- Automated code style enforcement (Prettier or similar).

### 5.4 Documentation

- JSDoc annotations on all public functions and state objects.
- Auto-generated API reference from JSDoc.
- Contributing guide (`CONTRIBUTING.md`) with setup, conventions, and PR process.

### 5.5 TypeScript support (optional)

- Add JSDoc type annotations or migrate to TypeScript for type safety.
- Type definitions for `CONFIG`, `tree`, `environment`, and `simulationState`.

---

## 6. Educational and outreach

### 6.1 Guided scenarios

- Pre-built lessons (e.g., "What happens during a drought", "How does a tree recover from disease").
- Step-by-step annotations that explain what the simulation is doing and why.

### 6.2 Ecological fact cards

- Pop-up cards linked to simulation events (e.g., "Why do leaves change color?").
- References to real-world ecological research.

### 6.3 Data storytelling

- End-of-simulation summary report: tree's life story, key events, cause of death.
- Shareable summary cards (image + stats) for social media.

---

## Prioritization

Features are grouped into tiers based on impact and complexity:

### Tier 1 — High impact, moderate effort

These should be tackled first to unlock the most value:

| Feature | Section | Rationale |
|---------|---------|-----------|
| Automated testing | 5.2 | Enables safe refactoring for all other changes. |
| CI pipeline | 5.3 | Catches regressions early. |
| ES modules migration | 5.1 | Cleaner architecture and better maintainability. |
| Species selection | 1.1 | Adds replay value without increasing memory usage. |
| Enhanced graphs | 4.3 | Immediate UX improvement with moderate effort. |

### Tier 2 — High impact, higher effort

These are the "big bets" that define Phase 2's identity:

| Feature | Section | Rationale |
|---------|---------|-----------|
| Soil profile model | 2.1 | Deepens ecological realism significantly. |
| Enhanced mortality / disturbance | 1.2 | Richer single-tree drama (fire, windthrow, disease stages). |
| WebGL renderer | 3.1 | Unlocks visual quality and performance gains. |
| Scenario builder | 4.1 | Makes the simulation accessible to non-technical users. |
| Guided scenarios | 6.1 | Educational mission of the project. |

### Tier 3 — Nice to have

These are valuable but can wait until the foundation is solid:

| Feature | Section | Rationale |
|---------|---------|-----------|
| Expanded phenology | 1.3 | Requires species data + degree-day model. |
| Climate scenarios | 2.4 | Needs the soil/water model in place. |
| Camera / zoom | 3.4 | Useful for inspecting detail but not essential. |
| Comparison mode | 4.2 | High UX complexity. |
| TypeScript migration | 5.5 | Useful but not blocking. |
| Timeline scrubbing | 4.4 | Requires state serialization infrastructure. |

---

## Migration notes

### Backward compatibility

- The Canvas 2D renderer must remain as a fallback even after a WebGL path is added.
- `variables.JSON` format should remain backward-compatible; new fields are additive.
- The single `tree` global object is retained; no conversion to an array is needed.

### State architecture

Phase 2 keeps the single `tree` object. Changes are additive:

1. **Species data expansion** — `TREE_SPECIES` presets gain more fields (phenology calendar, bark/leaf visual params, stress tolerances).
2. **Soil state** — a new `soil` global (or sub-object of `environment`) holds layered horizon data.
3. **History buffers** — bounded-length arrays for graphs and timeline scrubbing; capped to limit memory growth.

### Memory budget

A design constraint for Phase 2: the simulation should remain comfortable on devices with ≤ 4 GB RAM. Guidelines:

- **One tree only** — no `trees[]` array; the single `tree` object stays under ~2 MB including all geometry arrays.
- **Bounded history** — health/environment history arrays are capped (e.g., 10 000 samples) and oldest entries are dropped.
- **Texture reuse** — bark, leaf, and sky textures are cached and reused rather than regenerated each frame.
- **Particle pools** — rain, snow, and leaf-drop particles use fixed-size pools, not unbounded lists.

### Suggested branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable Phase 1 release |
| `phase2/modules` | ES module migration |
| `phase2/species` | Species selection + expanded biology |
| `phase2/webgl` | GPU renderer experiments |
| `phase2/testing` | Test infrastructure |

Feature branches merge into a `develop` branch for integration before merging to `main`.
