# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-02-11

### Added
- Species selection preset system (oak, pine, birch, willow, custom).
- Enhanced graph overlay with additional environment series.
- Fire and windthrow disturbance models with configurable thresholds extracted to `CONFIG` constants.

### Changed
- Refactored UI styles to Tailwind CSS utility classes; removed most hand-written CSS from `style.css`.
- Replaced Tailwind CDN link with pre-built CSS output for offline/sandbox compatibility.
- Converted CSS pixel units to `rem` for better scalability.

### Fixed
- Canvas sized to viewport container so the tree is always visible.
- Ground position made proportional to canvas height.
- Missing `getAutumnLeafDropRate` function that caused a runtime error.
- Stressor status detection logic corrected.
- Keyboard shortcut handler now ignores key events when a `<textarea>` is focused.
- Reset action now clears stressor checkboxes.

## [1.1.0] - 2026-02-11

### Added
- `docs/ARCHITECTURE.md`: comprehensive technical reference for Phase 1 architecture.
- `docs/PHASE2_ROADMAP.md`: roadmap for deeper single-tree biology, WebGL rendering, and testing.

### Changed
- README updated to reference the new architecture and roadmap documents.

## [1.0.0] - 2026-01-15

### Added
- Initial single-tree lifecycle simulation (Phase 1 complete).
- Seasonal cycle engine: spring/summer/autumn/winter transitions with day/year clock.
- Weather system: clear, cloudy, rain, storm, snow, fog, drought weather types with intensity/duration.
- Wind simulation: speed + direction affecting transpiration stress and visual sway.
- Abiotic stressors: drought, cold/heat extremes, storms.
- Biotic stressors: disease and pest models.
- Pollution as a chronic stress factor.
- Allometric growth model: correlated height/DBH/crown scaling.
- Biomass compartments: trunk, branches, leaves, roots (sapwood/heartwood sub-compartments).
- Carbon-balance physiology: photosynthesis minus respiration drives growth.
- Respiration with Q10 temperature scaling.
- Phenology: dormancy, bud burst, flowering, senescence switches.
- Leaf system: leaf count/area/density, seasonal leaf-drop particles.
- Vigor/nutrient/disease-load condition variables.
- Mortality model with configurable thresholds.
- Seeded PRNG (`js/prng.js`) with Perlin noise, fBm, and Voronoi-style helpers for reproducible runs.
- HDR-like Canvas 2D renderer: atmospheric sky gradients, procedural cloud/fog layers, sun position, bloom/tone-mapping post-processing, weather particles (rain/snow/lightning).
- `variables.JSON` external config loaded at startup; editable via the in-app Config textarea.
- UI controls: sunlight, water, temperature, soil, wind, humidity sliders; disease/pests/storm/pollution toggles; speed multiplier; pause/resume/reset/seed.
- Health and environment history graphs.
- Keyboard shortcuts: `Space` (pause/resume), `R` (reset), `1`–`5` (speed presets).
- Accessibility improvements: responsive layout and basic media queries.
- `clamp` and `lerp` utility functions.
- `calculateEvapotranspiration`, `calculatePhotosynthesis`, `calculateTotalStress` biology functions.

### Fixed
- CSS path reference corrected.
- Duplicate `SEASONS` declaration removed.
- RGB clamping bug in renderer.
- Death stats display errors.
- Season initialization bug on first load.
- `SEASON_DEFINITIONS` alias added and season key access fixed in renderer.

[Unreleased]: https://github.com/kamrankhan78694/TreeLifeSimulation/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/kamrankhan78694/TreeLifeSimulation/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/kamrankhan78694/TreeLifeSimulation/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/kamrankhan78694/TreeLifeSimulation/releases/tag/v1.0.0
