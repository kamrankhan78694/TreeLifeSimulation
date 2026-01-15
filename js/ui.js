// UI controller for handling configuration and controls
class UI {
  constructor() {
    this.config = null;
    this.simulation = null;
    this.canvas = null;
  }
  
  async init() {
    // Load variables.JSON
    await this.loadConfig();
    
    // Setup UI elements
    this.setupElements();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Display initial config
    this.displayConfig();
  }
  
  async loadConfig() {
    try {
      const response = await fetch('variables.JSON');
      if (!response.ok) {
        throw new Error('Failed to load variables.JSON');
      }
      this.config = await response.json();
      console.log('Configuration loaded:', this.config);
    } catch (error) {
      console.error('Error loading config:', error);
      // Provide default config
      this.config = this.getDefaultConfig();
    }
  }
  
  getDefaultConfig() {
    return {
      ui_defaults: {
        tree_count: 50,
        growth_rate: 1.0,
        water_level: 0.7,
        temperature: 20,
        light_intensity: 0.8
      },
      stressors: {
        drought_threshold: 0.3,
        heat_stress_temp: 35,
        disease_base_rate: 0.02,
        storm_frequency: 0.05
      },
      canvas_settings: {
        width: 1200,
        height: 800,
        background_color: "#87CEEB"
      },
      hdr_parameters: {
        max_age: 200,
        senescence_start_age: 150,
        base_mortality_rate: 0.001
      },
      config_overrides: {
        enable_mortality: true,
        enable_growth: true,
        enable_reproduction: false,
        simulation_speed: 1.0
      }
    };
  }
  
  setupElements() {
    this.canvas = document.getElementById('simulationCanvas');
    this.canvas.width = this.config.canvas_settings.width;
    this.canvas.height = this.config.canvas_settings.height;
    
    this.configTextarea = document.getElementById('configTextarea');
    this.applyButton = document.getElementById('applyConfig');
    this.startButton = document.getElementById('startSimulation');
    this.stopButton = document.getElementById('stopSimulation');
    this.resetButton = document.getElementById('resetSimulation');
    
    // Setup sliders
    this.setupSliders();
  }
  
  setupSliders() {
    // Tree count
    const treeCountSlider = document.getElementById('treeCount');
    const treeCountValue = document.getElementById('treeCountValue');
    if (treeCountSlider) {
      treeCountSlider.value = this.config.ui_defaults.tree_count;
      treeCountValue.textContent = this.config.ui_defaults.tree_count;
      treeCountSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        treeCountValue.textContent = value;
        this.config.ui_defaults.tree_count = value;
      });
    }
    
    // Water level
    const waterSlider = document.getElementById('waterLevel');
    const waterValue = document.getElementById('waterLevelValue');
    if (waterSlider) {
      waterSlider.value = this.config.ui_defaults.water_level;
      waterValue.textContent = this.config.ui_defaults.water_level;
      waterSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        waterValue.textContent = value.toFixed(2);
        this.config.ui_defaults.water_level = value;
        if (this.simulation) {
          this.simulation.updateConfig(this.config);
        }
      });
    }
    
    // Temperature
    const tempSlider = document.getElementById('temperature');
    const tempValue = document.getElementById('temperatureValue');
    if (tempSlider) {
      tempSlider.value = this.config.ui_defaults.temperature;
      tempValue.textContent = this.config.ui_defaults.temperature;
      tempSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tempValue.textContent = value.toFixed(0);
        this.config.ui_defaults.temperature = value;
        if (this.simulation) {
          this.simulation.updateConfig(this.config);
        }
      });
    }
    
    // Growth rate
    const growthSlider = document.getElementById('growthRate');
    const growthValue = document.getElementById('growthRateValue');
    if (growthSlider) {
      growthSlider.value = this.config.ui_defaults.growth_rate;
      growthValue.textContent = this.config.ui_defaults.growth_rate;
      growthSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        growthValue.textContent = value.toFixed(1);
        this.config.ui_defaults.growth_rate = value;
        if (this.simulation) {
          this.simulation.updateConfig(this.config);
        }
      });
    }
  }
  
  setupEventListeners() {
    this.applyButton.addEventListener('click', () => this.applyConfig());
    this.startButton.addEventListener('click', () => this.startSimulation());
    this.stopButton.addEventListener('click', () => this.stopSimulation());
    this.resetButton.addEventListener('click', () => this.resetSimulation());
  }
  
  displayConfig() {
    this.configTextarea.value = JSON.stringify(this.config, null, 2);
  }
  
  applyConfig() {
    try {
      const newConfig = JSON.parse(this.configTextarea.value);
      this.config = newConfig;
      
      // Update canvas size if changed
      this.canvas.width = this.config.canvas_settings.width;
      this.canvas.height = this.config.canvas_settings.height;
      
      // Update sliders
      this.setupSliders();
      
      // Update simulation if running
      if (this.simulation) {
        this.simulation.updateConfig(this.config);
      }
      
      alert('Configuration applied successfully!');
    } catch (error) {
      alert('Invalid JSON: ' + error.message);
    }
  }
  
  startSimulation() {
    if (!this.simulation) {
      this.simulation = new Simulation(this.canvas, this.config);
    }
    
    if (!this.simulation.running) {
      this.simulation.start();
      this.startButton.disabled = true;
      this.stopButton.disabled = false;
    }
  }
  
  stopSimulation() {
    if (this.simulation && this.simulation.running) {
      this.simulation.stop();
      this.startButton.disabled = false;
      this.stopButton.disabled = true;
    }
  }
  
  resetSimulation() {
    if (this.simulation) {
      this.simulation.stop();
    }
    this.simulation = new Simulation(this.canvas, this.config);
    this.startButton.disabled = false;
    this.stopButton.disabled = true;
  }
}

// Initialize UI when page loads
window.addEventListener('DOMContentLoaded', () => {
  const ui = new UI();
  ui.init();
});
