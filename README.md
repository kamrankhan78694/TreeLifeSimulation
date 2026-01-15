# Tree Life Simulation

A realistic tree life simulation featuring a comprehensive mortality model and configurable parameters through a JSON-based interface.

## Features

### Mortality Model
The simulation implements a hazard-based mortality system with multiple death pathways:

- **Senescence**: Age-related mortality that increases exponentially after trees reach their senescence age
- **Drought**: Water stress-induced mortality when water levels drop below critical thresholds
- **Heat Stress**: Temperature-related mortality when ambient temperature exceeds tolerance levels
- **Disease**: Stochastic disease events with resistance varying by individual tree
- **Storm Damage**: Height-dependent vulnerability to storm events
- **Health-Based**: Accumulated stress can reduce health to lethal levels

### Variables Configuration System
Users can customize simulation parameters through an editable JSON interface:

- **UI Defaults**: Configure initial values for sliders (tree count, growth rate, water level, temperature, light intensity)
- **Stressors**: Set thresholds for environmental stresses (drought, heat, disease, storms)
- **Canvas Settings**: Adjust display dimensions and background color
- **HDR Parameters**: Configure mortality parameters (max age, senescence start, base mortality rate)
- **Config Overrides**: Enable/disable simulation features (mortality, growth, reproduction, simulation speed)

### Interactive UI
- Real-time control sliders for environmental parameters
- Start/Stop/Reset controls
- Live statistics display showing:
  - Living tree count
  - Average age
  - Total deaths
  - Deaths by cause breakdown
- Visual indicators:
  - Green: Healthy trees
  - Yellow/Brown: Stressed trees
  - Faded Brown: Dead trees

## Usage

1. Open `index.html` in a web browser
2. (Optional) Edit the variables configuration in the Variables section
3. Click "Apply Configuration" to apply any changes
4. Adjust environment sliders as desired
5. Click "Start" to begin the simulation
6. Observe tree growth, stress responses, and mortality events
7. Use sliders to adjust environmental conditions during simulation

## File Structure

```
TreeLifeSimulation/
├── index.html              # Main HTML page with UI
├── variables.JSON          # Configuration file
├── css/
│   └── style.css          # Styles for the application
└── js/
    ├── tree.js            # Tree class with mortality model
    ├── simulation.js      # Simulation engine
    └── ui.js              # UI controller
```

## Configuration

The `variables.JSON` file contains all configurable parameters:

```json
{
  "ui_defaults": {
    "tree_count": 50,
    "growth_rate": 1.0,
    "water_level": 0.7,
    "temperature": 20,
    "light_intensity": 0.8
  },
  "stressors": {
    "drought_threshold": 0.3,
    "heat_stress_temp": 35,
    "disease_base_rate": 0.02,
    "storm_frequency": 0.05
  },
  "canvas_settings": {
    "width": 1200,
    "height": 800,
    "background_color": "#87CEEB"
  },
  "hdr_parameters": {
    "max_age": 200,
    "senescence_start_age": 150,
    "base_mortality_rate": 0.001
  },
  "config_overrides": {
    "enable_mortality": true,
    "enable_growth": true,
    "enable_reproduction": false,
    "simulation_speed": 1.0
  }
}
```

## Technical Details

- Pure JavaScript implementation (no external dependencies)
- Canvas-based rendering
- Hazard-based mortality using probabilistic models
- Real-time statistics tracking
- Responsive design for different screen sizes

## License

See LICENSE file for details.
