# Copilot instructions — TreeLifeSimulation

## Big picture
- Static, vanilla HTML/CSS/JS single-page app (no bundler, no npm, no modules).
- Runtime is driven by global state objects: `environment` (site conditions), `tree` (biology), `simulationState` (loop/timing), and `renderer` (Canvas 2D HDR-ish rendering).
- Data flow each frame: UI → `updateEnvironmentFromUI()` → `updateBiology(dt)` → `renderScene(...)` → `updateReadout()`/graphs.

## Entry points & load order (important)
- App boots from [index.html](../index.html): scripts are loaded in-order (not as ES modules).
- [js/config.js](../js/config.js) must load before [js/renderings.js](../js/renderings.js) because the renderer reads `CONFIG` and `HDR` at parse time.
- The main loop starts in `startSimulation()` in [js/simulation.js](../js/simulation.js) on `DOMContentLoaded`.
- [README.md](../README.md) contains some legacy/alternate file references; the source of truth for what runs is the script list in [index.html](../index.html).

## Local dev workflow
- Run via a local web server (not `file://`): `python3 -m http.server 8080` then open `http://localhost:8080/`.
- Debugging: use browser DevTools; startup logs come from `startSimulation()` in [js/simulation.js](../js/simulation.js).

## Codebase conventions (follow these)
- Keep the “script globals” style: functions/constants are shared via the global scope and sometimes attached to `window`.
- Avoid introducing new global name collisions. Example: `getSeasonDisplay()` is defined in both [js/environment.js](../js/environment.js) and [js/ui.js](../js/ui.js); the later script wins.
- `environment.season` is a season object (e.g., `SEASONS.SPRING`), and the code compares by identity (`environment.season === SEASONS.WINTER`) and also reads `environment.season.name`.
- UI wiring depends on specific DOM ids from [index.html](../index.html) (e.g., `sun`, `water`, `temp`, `toggle`, `reset`, `seed`). If you add a control, update both HTML and [js/environment.js](../js/environment.js)/[js/ui.js](../js/ui.js).
- Use the seeded RNG utilities from [js/prng.js](../js/prng.js) (`initPRNG`, `random()`, `randomInt()`, `randomGaussian()`) for simulation variability so runs are reproducible via the Seed UI.

## Config & “tuning knobs”
- Central tuning lives in [js/config.js](../js/config.js): biological constants, seasonal definitions (`SEASONS`/`SEASON_DEFINITIONS`), and rendering/HDR parameters (`CONFIG.*`, `window.HDR`).
- Large performance levers are also in [js/config.js](../js/config.js) (canvas size, particle counts). Prefer changing config constants over scattering magic numbers.

## External files
- [variables.JSON](../variables.JSON) is optional and loaded at startup by [js/simulation.js](../js/simulation.js) (safe no-op if missing). It can also be edited/applied via the Config textarea in [index.html](../index.html) using `window.applyVariablesConfigFromObject(...)`.
