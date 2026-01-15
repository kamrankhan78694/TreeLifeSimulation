// Simulation engine with mortality tracking
class Simulation {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.trees = [];
    this.config = config;
    this.running = false;
    this.frameCount = 0;
    this.stats = {
      totalDeaths: 0,
      deathsByCause: {
        senescence: 0,
        drought: 0,
        heat_stress: 0,
        disease: 0,
        storm_damage: 0,
        poor_health: 0
      },
      aliveCount: 0,
      averageAge: 0
    };
    
    this.initializeTrees();
  }
  
  initializeTrees() {
    const count = this.config.ui_defaults.tree_count;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.canvas.width;
      const y = this.canvas.height - 50;
      const tree = new Tree(x, y, this.config.hdr_parameters);
      this.trees.push(tree);
    }
  }
  
  start() {
    this.running = true;
    this.loop();
  }
  
  stop() {
    this.running = false;
  }
  
  loop() {
    if (!this.running) return;
    
    this.update();
    this.draw();
    
    this.frameCount++;
    
    // Control simulation speed with frame timing
    const speed = this.config.config_overrides.simulation_speed || 1.0;
    if (speed === 1.0) {
      requestAnimationFrame(() => this.loop());
    } else {
      setTimeout(() => this.loop(), (1000 / 60) / speed);
    }
  }
  
  update() {
    const environment = this.getEnvironment();
    
    let aliveCount = 0;
    let totalAge = 0;
    
    for (let tree of this.trees) {
      const wasAlive = tree.alive;
      tree.update(environment);
      
      if (wasAlive && !tree.alive) {
        // Tree just died
        this.stats.totalDeaths++;
        if (tree.deathCause && this.stats.deathsByCause.hasOwnProperty(tree.deathCause)) {
          this.stats.deathsByCause[tree.deathCause]++;
        } else if (tree.deathCause) {
          console.warn(`Unknown death cause: ${tree.deathCause}`);
        }
      }
      
      if (tree.alive) {
        aliveCount++;
        totalAge += tree.age;
      }
    }
    
    this.stats.aliveCount = aliveCount;
    this.stats.averageAge = aliveCount > 0 ? totalAge / aliveCount : 0;
  }
  
  getEnvironment() {
    return {
      water_level: this.config.ui_defaults.water_level,
      temperature: this.config.ui_defaults.temperature,
      light_intensity: this.config.ui_defaults.light_intensity,
      growth_rate: this.config.ui_defaults.growth_rate,
      drought_threshold: this.config.stressors.drought_threshold,
      heat_stress_temp: this.config.stressors.heat_stress_temp,
      disease_base_rate: this.config.stressors.disease_base_rate,
      storm_frequency: this.config.stressors.storm_frequency,
      enable_mortality: this.config.config_overrides.enable_mortality,
      enable_growth: this.config.config_overrides.enable_growth
    };
  }
  
  draw() {
    // Clear canvas
    this.ctx.fillStyle = this.config.canvas_settings.background_color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw ground
    this.ctx.fillStyle = '#8B7355';
    this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);
    
    // Draw trees
    for (let tree of this.trees) {
      tree.draw(this.ctx);
    }
    
    // Draw stats
    this.drawStats();
  }
  
  drawStats() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillRect(10, 10, 250, 160);
    
    this.ctx.fillStyle = '#000';
    this.ctx.font = '14px Arial';
    this.ctx.fillText(`Alive: ${this.stats.aliveCount} / ${this.trees.length}`, 20, 30);
    this.ctx.fillText(`Average Age: ${this.stats.averageAge.toFixed(1)}`, 20, 50);
    this.ctx.fillText(`Total Deaths: ${this.stats.totalDeaths}`, 20, 70);
    
    this.ctx.font = '12px Arial';
    let y = 90;
    this.ctx.fillText('Deaths by cause:', 20, y);
    y += 15;
    for (let [cause, count] of Object.entries(this.stats.deathsByCause)) {
      if (count > 0) {
        this.ctx.fillText(`  ${cause}: ${count}`, 20, y);
        y += 15;
      }
    }
  }
  
  updateConfig(newConfig) {
    this.config = newConfig;
  }
}
