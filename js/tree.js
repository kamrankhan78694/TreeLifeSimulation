// Tree class with mortality model
// Constants
const HEALTH_TO_COLOR_MULTIPLIER = 2.55; // Converts 0-100 health to 0-255 color range
const SENESCENCE_MORTALITY_RATE = 0.1; // Base mortality rate increase from senescence
const DROUGHT_MORTALITY_THRESHOLD = 0.7; // Water stress threshold for mortality
const DROUGHT_MORTALITY_RATE = 0.05; // Mortality rate multiplier for drought
const HEAT_MORTALITY_THRESHOLD = 0.8; // Heat stress threshold for mortality
const HEAT_MORTALITY_RATE = 0.03; // Mortality rate multiplier for heat stress

class Tree {
  constructor(x, y, config = {}) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.height = 10;
    this.radius = 5;
    this.health = 100;
    this.alive = true;
    this.deathCause = null;
    this.deathAge = null;
    
    // Mortality parameters
    this.maxAge = config.max_age || 200;
    this.senescenceStartAge = config.senescence_start_age || 150;
    this.baseMortalityRate = config.base_mortality_rate || 0.001;
    
    // Environmental stress
    this.waterStress = 0;
    this.heatStress = 0;
    this.diseaseResistance = Math.random();
  }
  
  update(environment) {
    if (!this.alive) return;
    
    this.age++;
    
    // Calculate environmental stresses
    this.calculateStress(environment);
    
    // Check for mortality
    if (this.checkMortality(environment)) {
      return;
    }
    
    // Growth (if still alive)
    if (environment.enable_growth) {
      this.grow(environment);
    }
  }
  
  calculateStress(environment) {
    // Water stress
    if (environment.water_level < environment.drought_threshold) {
      this.waterStress = 1 - (environment.water_level / environment.drought_threshold);
    } else {
      this.waterStress = Math.max(0, this.waterStress - 0.05);
    }
    
    // Heat stress
    if (environment.temperature > environment.heat_stress_temp) {
      this.heatStress = (environment.temperature - environment.heat_stress_temp) / 20;
    } else {
      this.heatStress = Math.max(0, this.heatStress - 0.05);
    }
    
    // Update health based on stress
    const stressDamage = (this.waterStress + this.heatStress) * 0.5;
    this.health = Math.max(0, this.health - stressDamage);
  }
  
  checkMortality(environment) {
    if (!environment.enable_mortality) return false;
    
    let mortalityHazard = this.baseMortalityRate;
    
    // Senescence mortality (increases with age)
    if (this.age > this.senescenceStartAge) {
      const senescenceFactor = Math.pow((this.age - this.senescenceStartAge) / (this.maxAge - this.senescenceStartAge), 2);
      mortalityHazard += senescenceFactor * SENESCENCE_MORTALITY_RATE;
      
      if (Math.random() < mortalityHazard) {
        this.die('senescence');
        return true;
      }
    }
    
    // Drought mortality
    if (this.waterStress > DROUGHT_MORTALITY_THRESHOLD) {
      const droughtHazard = this.waterStress * DROUGHT_MORTALITY_RATE;
      if (Math.random() < droughtHazard) {
        this.die('drought');
        return true;
      }
    }
    
    // Heat stress mortality
    if (this.heatStress > HEAT_MORTALITY_THRESHOLD) {
      const heatHazard = this.heatStress * HEAT_MORTALITY_RATE;
      if (Math.random() < heatHazard) {
        this.die('heat_stress');
        return true;
      }
    }
    
    // Disease mortality
    const diseaseHazard = environment.disease_base_rate * (1 - this.diseaseResistance);
    if (Math.random() < diseaseHazard) {
      this.die('disease');
      return true;
    }
    
    // Storm damage mortality
    if (Math.random() < environment.storm_frequency) {
      // Taller trees more vulnerable
      const stormHazard = (this.height / 100) * 0.1;
      if (Math.random() < stormHazard) {
        this.die('storm_damage');
        return true;
      }
    }
    
    // Health-based mortality
    if (this.health <= 0) {
      this.die('poor_health');
      return true;
    }
    
    return false;
  }
  
  die(cause) {
    this.alive = false;
    this.deathCause = cause;
    this.deathAge = this.age;
  }
  
  grow(environment) {
    const growthRate = environment.growth_rate || 1.0;
    const lightFactor = environment.light_intensity || 0.8;
    const waterFactor = Math.min(1, environment.water_level / 0.5);
    
    // Reduce growth with age (senescence)
    const ageFactor = this.age < this.senescenceStartAge 
      ? 1.0 
      : 1.0 - ((this.age - this.senescenceStartAge) / (this.maxAge - this.senescenceStartAge)) * 0.5;
    
    const growthAmount = growthRate * lightFactor * waterFactor * ageFactor * 0.1;
    
    this.height += growthAmount;
    this.radius = Math.sqrt(this.height / 2);
    
    // Cap maximum size
    this.height = Math.min(this.height, 100);
    this.radius = Math.min(this.radius, 15);
  }
  
  draw(ctx) {
    if (!this.alive) {
      // Draw dead tree (brown/gray)
      ctx.fillStyle = '#8B4513';
      ctx.globalAlpha = 0.3;
    } else {
      // Draw living tree (green, with health indication)
      const healthColor = Math.floor(this.health * HEALTH_TO_COLOR_MULTIPLIER);
      const red = Math.max(0, Math.min(255, 100 - healthColor));
      const green = Math.max(0, Math.min(255, healthColor + 100));
      const blue = Math.max(0, Math.min(255, 100 - healthColor));
      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.globalAlpha = 1.0;
    }
    
    // Draw trunk
    ctx.fillRect(this.x - 2, this.y - this.height, 4, this.height);
    
    // Draw canopy
    ctx.beginPath();
    ctx.arc(this.x, this.y - this.height, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1.0;
  }
}
