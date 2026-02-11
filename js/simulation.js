// ============================================================
// HYPERREALISTIC SIMULATION ENGINE
// Advanced biological calculations with physics substeps
// ============================================================

const simulationState = {
  running: true,
  paused: false,
  time: 0,              // total days elapsed
  lastFrameTime: 0,
  fps: 0,
  frameCount: 0,
  physicsAccumulator: 0,
  substepTime: 1 / 60,  // physics substep (60Hz)
};

window.simulationState = simulationState;

// ============================================================
// OPTIONAL EXTERNAL CONFIG (variables.JSON)
// ============================================================

async function loadVariablesJSON() {
  try {
    const res = await fetch('variables.JSON', { cache: 'no-store' });
    if (!res.ok) return null;
    const text = await res.text();
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function applyVariablesConfigFromObject(vars) {
  if (!vars || typeof vars !== 'object') return;

  // Keep a copy around for UI/debug.
  window.variablesConfig = vars;
  try {
    window.variablesConfigSourceText = JSON.stringify(vars, null, 2);
  } catch (e) {
    // ignore
  }

  // ---- UI defaults -> DOM sliders (if present)
  const uiDefaults = vars.ui_defaults || {};
  const maybeSetSlider = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = String(value);
  };

  if (uiDefaults.light_intensity !== undefined) {
    maybeSetSlider('sun', clampNumber(uiDefaults.light_intensity, 0, 1, 0.7) * 100);
  }
  if (uiDefaults.water_level !== undefined) {
    maybeSetSlider('water', clampNumber(uiDefaults.water_level, 0, 1, 0.6) * 100);
  }
  if (uiDefaults.temperature !== undefined) {
    maybeSetSlider('temp', clampNumber(uiDefaults.temperature, -20, 50, 20));
  }

  // ---- Config overrides
  const overrides = vars.config_overrides || {};
  if (overrides.simulation_speed !== undefined) {
    maybeSetSlider('speed', clampNumber(overrides.simulation_speed, 0, 10, 1));
  }

  // ---- Mortality tuning
  const hdrParams = vars.hdr_parameters || {};
  if (tree && tree.mortality) {
    if (overrides.enable_mortality !== undefined) {
      tree.mortality.enabled = !!overrides.enable_mortality;
    }
    if (hdrParams.max_age !== undefined) {
      const maxAge = clampNumber(hdrParams.max_age, 1, 5000, tree.mortality.maxAge);
      tree.mortality.maxAge = maxAge;
      if (CONFIG && CONFIG.TREE_MAX_AGE !== undefined) {
        CONFIG.TREE_MAX_AGE = maxAge;
      }
    }
    if (hdrParams.senescence_start_age !== undefined) {
      tree.mortality.senescenceStartAge = clampNumber(
        hdrParams.senescence_start_age,
        0,
        tree.mortality.maxAge,
        tree.mortality.senescenceStartAge
      );
    }
    if (hdrParams.base_mortality_rate !== undefined) {
      tree.mortality.baseRatePerYear = clampNumber(hdrParams.base_mortality_rate, 0, 5, tree.mortality.baseRatePerYear);
    }
  }

  // ---- Stressors tuning
  const stressors = vars.stressors || {};
  if (tree && tree.mortality) {
    if (stressors.drought_threshold !== undefined) {
      tree.mortality.droughtThreshold = clampNumber(stressors.drought_threshold, 0, 1, tree.mortality.droughtThreshold);
    }
    if (stressors.heat_stress_temp !== undefined) {
      tree.mortality.heatStressTemp = clampNumber(stressors.heat_stress_temp, -50, 100, tree.mortality.heatStressTemp);
    }
    if (stressors.disease_base_rate !== undefined) {
      tree.mortality.diseaseBaseRatePerYear = clampNumber(stressors.disease_base_rate, 0, 5, tree.mortality.diseaseBaseRatePerYear);
    }
    if (stressors.storm_frequency !== undefined) {
      tree.mortality.stormFrequency = clampNumber(stressors.storm_frequency, 0, 5, tree.mortality.stormFrequency);
    }
  }

  // If UI exists, refresh visible labels/environment.
  if (typeof updateUIDisplay === 'function') updateUIDisplay();
  if (typeof updateEnvironmentFromUI === 'function') updateEnvironmentFromUI();
}

window.applyVariablesConfigFromObject = applyVariablesConfigFromObject;

window.reloadVariablesConfigFromFile = async function reloadVariablesConfigFromFile() {
  const vars = await loadVariablesJSON();
  if (vars) {
    applyVariablesConfigFromObject(vars);
  }
  return vars;
};

function applyMortalityModel(dtDays) {
  if (!tree || tree.health <= 0) return;
  if (!tree.mortality || !tree.mortality.enabled) return;

  const m = tree.mortality;
  const age = tree.age;

  // Hard cap: max age reached.
  if (Number.isFinite(m.maxAge) && age >= m.maxAge) {
    tree.health = 0;
    tree.deathCause = 'Old age';
    return;
  }

  const dtYears = dtDays / CONFIG.DAYS_PER_YEAR;
  if (dtYears <= 0) return;

  let hazardPerYear = Math.max(0, m.baseRatePerYear || 0);

  // Senescence: ramps up after senescenceStartAge.
  if (Number.isFinite(m.senescenceStartAge) && Number.isFinite(m.maxAge) && age > m.senescenceStartAge) {
    const span = Math.max(1e-6, m.maxAge - m.senescenceStartAge);
    const t = Math.min(1, Math.max(0, (age - m.senescenceStartAge) / span));
    hazardPerYear += 0.02 * (t * t);
  }

  // Chronic stress: high stress increases hazard.
  const stress01 = clamp(tree.stressLevel / 100, 0, 1);
  hazardPerYear += 0.03 * (stress01 * stress01);

  // Drought / heat / disease / storm hazard components.
  const water01 = clamp(environment.water / 100, 0, 1);
  if (water01 < m.droughtThreshold) {
    const droughtT = (m.droughtThreshold - water01) / Math.max(1e-6, m.droughtThreshold);
    hazardPerYear += 0.04 * droughtT;
  }
  if (environment.temperature > m.heatStressTemp) {
    const heatT = (environment.temperature - m.heatStressTemp) / 20;
    hazardPerYear += 0.03 * clamp(heatT, 0, 2);
  }
  if (environment.disease) {
    const health01 = clamp(tree.health / 100, 0, 1);
    hazardPerYear += (m.diseaseBaseRatePerYear || 0) * (1 - health01);
  }
  if (environment.storm) {
    const wind01 = clamp(environment.windSpeed / 100, 0, 1);
    hazardPerYear += (m.stormFrequency || 0) * 0.02 * wind01;
  }

  // Fire hazard: probability based on drought duration and species resistance
  const species = TREE_SPECIES[tree.species] || TREE_SPECIES.OAK;
  const fireResistance = species.fireResistance || 0.5;
  if (water01 < CONFIG.FIRE_DROUGHT_THRESHOLD && environment.temperature > CONFIG.FIRE_HEAT_THRESHOLD) {
    const droughtSeverity = (CONFIG.FIRE_DROUGHT_THRESHOLD - water01) / CONFIG.FIRE_DROUGHT_THRESHOLD;
    const heatSeverity = clamp((environment.temperature - CONFIG.FIRE_HEAT_THRESHOLD) / 20, 0, 1);
    hazardPerYear += 0.05 * droughtSeverity * heatSeverity * (1 - fireResistance);
  }

  // Windthrow hazard: tall/large trees more vulnerable during storms
  const windthrowResistance = species.windthrowResistance || 0.5;
  if (environment.storm && environment.windSpeed > CONFIG.WINDTHROW_WIND_THRESHOLD) {
    const windSeverity = clamp((environment.windSpeed - CONFIG.WINDTHROW_WIND_THRESHOLD) / CONFIG.WINDTHROW_WIND_RANGE, 0, 1);
    const sizeFactor = clamp(tree.height / (species.maxHeight || 40), 0, 1);
    hazardPerYear += 0.06 * windSeverity * sizeFactor * (1 - windthrowResistance);
  }

  hazardPerYear = clamp(hazardPerYear, 0, 5);
  const pDie = 1 - Math.exp(-hazardPerYear * dtYears);
  if (random() < pDie) {
    tree.health = 0;
    // Determine most likely cause
    if (environment.storm && environment.windSpeed > CONFIG.WINDTHROW_WIND_THRESHOLD) {
      tree.deathCause = 'Windthrow';
    } else if (water01 < CONFIG.FIRE_DROUGHT_THRESHOLD && environment.temperature > CONFIG.FIRE_HEAT_THRESHOLD) {
      tree.deathCause = 'Fire';
    } else if (environment.disease) {
      tree.deathCause = 'Disease';
    } else if (Number.isFinite(m.senescenceStartAge) && age > m.senescenceStartAge) {
      tree.deathCause = 'Old age';
    } else {
      tree.deathCause = 'Mortality event';
    }
  }
}

// Health history for graph (declared in js/ui.js)

/**
 * Calculate photosynthesis rate based on environmental conditions
 */
function calculatePhotosynthesis(sunlight, water, soilQuality) {
  // Photosynthesis depends on light, water, and nutrients
  const lightFactor = sunlight / 100;
  const waterFactor = Math.min(1, water / 50);
  const nutrientFactor = soilQuality / 100;
  
  // Base rate with optimal conditions
  const baseRate = 1.0;
  return baseRate * lightFactor * waterFactor * nutrientFactor;
}

/**
 * Calculate total environmental stress on tree
 */
function calculateTotalStress() {
  let stress = 0;
  
  // Water stress
  if (environment.water < 40) {
    stress += (40 - environment.water) / 40 * 30;
  } else if (environment.water > 85) {
    stress += (environment.water - 85) / 15 * 20;
  }
  
  // Temperature stress
  if (environment.temperature < 5 || environment.temperature > 35) {
    stress += 20;
  } else if (environment.temperature < 12 || environment.temperature > 28) {
    stress += 10;
  }
  
  // Light stress
  if (environment.sunlight < 30) {
    stress += (30 - environment.sunlight) / 30 * 15;
  }
  
  // Stressor impacts
  if (environment.disease) stress += 25;
  if (environment.pests) stress += 20;
  if (environment.storm) stress += 15;
  if (environment.pollution) stress += 10;
  
  return Math.min(100, stress);
}

/**
 * Calculate evapotranspiration rate
 */
function calculateEvapotranspiration() {
  // Simplified evapotranspiration based on temperature, wind, and humidity
  const tempFactor = Math.max(0, environment.temperature / 30);
  const windFactor = environment.windSpeed / 100;
  const humidityFactor = 1 - (environment.humidity / 100);
  
  return tempFactor * (1 + windFactor) * humidityFactor * 0.5;
}

/**
 * Core biological simulation update (per substep)
 */
function updateBiology(dt) {
  if (tree.health <= 0) {
    // Dead tree still has falling leaves
    updateLeafDrops(dt, environment.windSpeed);
    return;
  }
  
  // Update environment time
  updateEnvironmentTime(dt);

  // Optional mortality model (can end the tree early)
  applyMortalityModel(dt);
  if (tree.health <= 0) {
    updateLeafDrops(dt, environment.windSpeed);
    return;
  }
  
  // === PHOTOSYNTHESIS & CARBON ASSIMILATION ===
  const photoRate = calculatePhotosynthesis(
    environment.sunlight,
    environment.water,
    environment.soilQuality
  );
  
  // === RESPIRATION (carbon loss) ===
  const tempFactor = Math.pow(2, (environment.temperature - 20) / 10);
  const respirationRate = 0.02 * tempFactor * (tree.biomass.total / 100);
  
  // === NET CARBON BALANCE ===
  const netCarbon = photoRate - respirationRate;
  
  // === ENVIRONMENTAL STRESS ===
  const stress = calculateTotalStress();
  environment.totalStress = stress;
  environment.waterAvailability = environment.water;
  
  // === SEASONAL GROWTH MODIFIER ===
  const seasonGrowth = getSeasonalGrowthMultiplier(environment.season);
  
  // === DORMANCY CHECK ===
  const dormancySpecies = TREE_SPECIES[tree.species] || TREE_SPECIES.OAK;
  const speciesIsEvergreen = dormancySpecies.evergreen || false;
  const isDormant = (!speciesIsEvergreen && environment.season === SEASONS.WINTER) || 
                    environment.temperature < (speciesIsEvergreen ? -10 : 5) ||
                    (!speciesIsEvergreen && environment.season === SEASONS.AUTUMN && getSeasonProgress(environment.dayOfYear) > 0.7);
  
  tree.dormant = isDormant;
  
  // === NET GROWTH FACTOR ===
  const netGrowthFactor = isDormant ? 0 : Math.max(0, (netCarbon * 0.8 - stress * 0.3) * seasonGrowth);
  
  // === HEALTH DYNAMICS ===
  // Health is affected by net carbon, stress, and recovery potential
  const stressImpact = stress * 20;
  const recoveryRate = (photoRate * 0.5 + (100 - tree.stressLevel) * 0.1);
  const healthDelta = (netGrowthFactor * 10 + recoveryRate * 0.5 - stressImpact);
  
  tree.health += healthDelta * dt + randomGaussian(0, 0.3) * dt;
  tree.health = clamp(tree.health, 0, 100);
  
  // === VIGOR (growth potential) ===
  tree.vigor = tree.vigor * 0.98 + (tree.health * netGrowthFactor) * 0.02;
  tree.vigor = clamp(tree.vigor, 0, 100);
  
  // === STRESS ACCUMULATION ===
  tree.stressLevel = tree.stressLevel * 0.95 + stress * 30 * dt;
  tree.stressLevel = clamp(tree.stressLevel, 0, 100);
  
  // === DISEASE PROGRESSION ===
  if (environment.disease) {
    tree.diseaseLoad = Math.min(100, tree.diseaseLoad + dt * 2 * (100 - tree.health) / 100);
  } else {
    tree.diseaseLoad = Math.max(0, tree.diseaseLoad - dt * 0.5);
  }
  
  // === FOLIAGE RESPONSE ===
  updateFoliage(dt);
  
  // === PHYSICAL GROWTH ===
  if (tree.health > 25 && !isDormant && netGrowthFactor > 0) {
    const species = TREE_SPECIES[tree.species] || TREE_SPECIES.OAK;
    const speciesGrowthRate = species.growthRate || 1.0;
    const healthFactor = tree.health / 100;
    const vigorFactor = tree.vigor / 100;
    const ageFactor = Math.max(0.1, 1 - tree.age / (species.maxAge * 0.4));
    const growthRate = netGrowthFactor * healthFactor * vigorFactor * ageFactor * speciesGrowthRate;
    
    // Height growth (allometric: slows with size)
    const heightLimit = species.maxHeight || CONFIG.TREE_MAX_HEIGHT;
    const heightSaturation = Math.pow(1 - (tree.height / heightLimit), 2);
    const heightGrowth = growthRate * CONFIG.HEIGHT_GROWTH_FACTOR * heightSaturation;
    tree.height = Math.min(heightLimit, tree.height + heightGrowth * dt);
    tree.growthThisYear += heightGrowth * dt;
    
    // DBH growth (follows allometric relationship)
    const expectedDBH = Math.pow(tree.height, 0.8) * 0.05;
    const dbhGrowth = (expectedDBH - tree.dbh) * growthRate * 0.1 + growthRate * CONFIG.DBH_GROWTH_FACTOR * 0.0005;
    tree.dbh = Math.max(tree.dbh, tree.dbh + dbhGrowth * dt);
    
    // Crown dimensions
    tree.crownRadius = tree.height * 0.4 * healthFactor;
    tree.crownHeight = tree.height * 0.5 * healthFactor;
    
    // Root expansion
    const rootGrowth = growthRate * CONFIG.ROOT_GROWTH_FACTOR * (environment.soilQuality / 100) * 0.005;
    tree.rootDepth = Math.min(tree.height * 0.8, tree.rootDepth + rootGrowth * dt);
    tree.rootSpread = Math.min(tree.crownRadius * 1.5, tree.rootSpread + rootGrowth * 0.8 * dt);
    
    // Leaf metrics
    tree.leafArea = tree.crownRadius * tree.crownRadius * Math.PI * tree.foliageOpacity * healthFactor;
    tree.leafCount = Math.floor(tree.leafArea * 500);
  }
  
  // === BIOMASS CALCULATIONS (detailed) ===
  updateBiomass(dt, netGrowthFactor);
  
  // === GAS EXCHANGE ===
  if (!isDormant) {
    const effectiveLeafArea = tree.leafArea * tree.foliageOpacity;
    const absorbedCO2 = photoRate * effectiveLeafArea * CONFIG.CO2_ABSORPTION_RATE * dt / 365;
    const producedO2 = photoRate * effectiveLeafArea * CONFIG.O2_PRODUCTION_RATE * dt / 365;
    tree.co2Absorbed += absorbedCO2;
    tree.o2Produced += producedO2;
    tree.carbonStored = tree.biomass.total * 0.5; // ~50% of dry biomass is carbon
  }
  
  // === WATER DYNAMICS ===
  const evapotranspiration = calculateEvapotranspiration();
  const waterUptake = (environment.water / 100) * tree.rootDepth * tree.rootSpread * 0.5;
  tree.waterContent += (waterUptake - evapotranspiration) * dt;
  tree.waterContent = clamp(tree.waterContent, 0, 100);
  tree.waterTranspired += evapotranspiration * dt;
  
  // === CHLOROPHYLL CONTENT ===
  const currentSpecies = TREE_SPECIES[tree.species] || TREE_SPECIES.OAK;
  const currentIsEvergreen = currentSpecies.evergreen || false;
  if (currentIsEvergreen) {
    // Evergreens maintain chlorophyll year-round with slight seasonal dip
    if (environment.season === SEASONS.WINTER) {
      tree.chlorophyllContent = Math.max(50, tree.chlorophyllContent - dt * 0.5);
    } else {
      tree.chlorophyllContent = Math.min(100, tree.chlorophyllContent + dt * 2);
    }
  } else if (environment.season === SEASONS.AUTUMN) {
    const progress = getSeasonProgress(environment.dayOfYear);
    tree.chlorophyllContent = Math.max(0, 100 * (1 - progress));
  } else if (environment.season === SEASONS.SPRING) {
    const progress = getSeasonProgress(environment.dayOfYear);
    tree.chlorophyllContent = Math.min(100, progress * 100);
  } else if (environment.season === SEASONS.WINTER) {
    tree.chlorophyllContent = 0;
  } else {
    tree.chlorophyllContent = Math.min(100, tree.chlorophyllContent + dt * 2);
  }
  
  // === AGE & ANNUAL CYCLES ===
  const prevYear = Math.floor((tree.daysSinceBirth - dt) / CONFIG.DAYS_PER_YEAR);
  tree.age += dt / CONFIG.DAYS_PER_YEAR;
  tree.daysSinceBirth += dt;
  const currentYear = Math.floor(tree.daysSinceBirth / CONFIG.DAYS_PER_YEAR);
  
  // New year - add growth ring
  if (currentYear > prevYear) {
    tree.ringsGrown++;
    tree.growthThisYear = 0;
    
    // Regenerate visual structures periodically
    if (tree.ringsGrown % 5 === 0) {
      generateBranchArchitecture();
      generateLeafClusters();
      generateRootMesh();
    }
  }
  
  // === LEAF DROP ===
  handleLeafDrop(dt);
  
  // Update leaf physics
  updateLeafDrops(dt, environment.windSpeed);
  
  // === RECORD HEALTH HISTORY ===
  recordHealth();
}

/**
 * Update biomass components
 */
function updateBiomass(dt, growthFactor) {
  if (growthFactor <= 0) return;
  
  const healthFactor = tree.health / 100;
  const allocation = growthFactor * healthFactor * dt;
  
  // Allocation priorities change with season
  let trunkAlloc = 0.35;
  let branchAlloc = 0.20;
  let leafAlloc = 0.25;
  let rootAlloc = 0.20;
  
  if (environment.season === SEASONS.SPRING) {
    leafAlloc = 0.40;
    trunkAlloc = 0.25;
  } else if (environment.season === SEASONS.AUTUMN) {
    rootAlloc = 0.35;
    leafAlloc = 0.10;
  }
  
  // Apply growth
  tree.biomass.trunk += allocation * trunkAlloc * 10;
  tree.biomass.branches += allocation * branchAlloc * 5;
  tree.biomass.leaves += allocation * leafAlloc * 2 * tree.foliageOpacity;
  tree.biomass.roots += allocation * rootAlloc * 3;
  
  // Heartwood formation (inner dead wood)
  if (tree.age > 10) {
    const heartwoodFormation = tree.biomass.sapwood * 0.001 * dt;
    tree.biomass.heartwood += heartwoodFormation;
    tree.biomass.sapwood = tree.biomass.trunk - tree.biomass.heartwood;
  } else {
    tree.biomass.sapwood = tree.biomass.trunk;
  }
  
  // Total
  tree.biomass.total = tree.biomass.trunk + tree.biomass.branches + 
                       tree.biomass.leaves + tree.biomass.roots;
}

/**
 * Calculate autumn leaf drop rate based on season progress
 * @param {number} progress - Season progress from 0 to 1
 * @returns {number} Drop probability (0-1)
 */
function getAutumnLeafDropRate(progress) {
  // Exponential ramp-up: slow at start of autumn, rapid near end
  return Math.pow(progress, 2) * 0.8;
}

/**
 * Handle seasonal and stress-related leaf drop
 */
function handleLeafDrop(dt) {
  const seasonProgress = getSeasonProgress(environment.dayOfYear);
  let dropProbability = 0;
  
  if (environment.season === SEASONS.AUTUMN) {
    dropProbability = getAutumnLeafDropRate(seasonProgress);
  }
  
  // Stress-induced leaf drop
  if (tree.stressLevel > 50) {
    dropProbability += (tree.stressLevel - 50) / 100 * 0.3;
  }
  
  // Storm damage
  if (environment.storm && environment.windSpeed > 50) {
    dropProbability += 0.4;
  }
  
  // Create falling leaves
  if (random() < dropProbability * dt * 0.15 && tree.foliageOpacity > 0.1) {
    const centerX = renderer.width / 2;
    const treeTop = 850 - tree.height * 100;
    const canopyRadius = 60 + tree.height * 20;
    
    const angle = random(0, Math.PI * 2);
    const radius = random(0.3, 1) * canopyRadius;
    const leafX = centerX + Math.cos(angle) * radius;
    const leafY = treeTop + tree.crownHeight * 50 + random(-30, 30);
    
    createFallingLeaf(leafX, leafY, environment.season);
  }
}

/**
 * Record health for history graph
 */
function recordHealth() {
  // Sample periodically, not every frame
  if (simulationState.frameCount % 5 !== 0) return;
  
  if (healthHistory.length >= CONFIG.MAX_HISTORY) {
    healthHistory.shift();
  }
  healthHistory.push(Math.round(tree.health * 10) / 10);
}

/**
 * Update foliage opacity and density
 */
function updateFoliage(dt) {
  let targetOpacity = tree.health / 100;
  let targetDensity = tree.health / 100;
  
  const species = TREE_SPECIES[tree.species] || TREE_SPECIES.OAK;
  const isEvergreen = species.evergreen || false;
  const seasonProgress = getSeasonProgress(environment.dayOfYear);
  
  switch (environment.season) {
    case SEASONS.WINTER:
      if (isEvergreen) {
        targetOpacity *= 0.7;
        targetDensity *= 0.8;
      } else {
        targetOpacity *= 0.05;
        targetDensity *= 0.1;
      }
      break;
      
    case SEASONS.AUTUMN:
      if (isEvergreen) {
        targetOpacity *= 0.8;
        targetDensity *= 0.85;
      } else {
        // Gradual leaf loss — species dropRate controls how late leaves are retained
        // Lower autumnLeafDrop means earlier/faster shedding
        const dropRate = species.autumnLeafDrop || 0.5;
        const autumnFade = 1 - Math.pow(seasonProgress, 1.5) * (1 - dropRate * 0.3);
        targetOpacity *= autumnFade;
        targetDensity *= autumnFade;
      }
      break;
      
    case SEASONS.SPRING:
      // Leaf emergence — species leafOut controls timing
      const leafOutRate = isEvergreen ? 0.8 : (species.springLeafOut || 0.3);
      const springGrowth = Math.pow(seasonProgress, 0.7) * (1 - leafOutRate) + leafOutRate;
      targetOpacity *= springGrowth;
      targetDensity *= 0.4 + springGrowth * 0.6;
      break;
      
    case SEASONS.SUMMER:
      // Full foliage, affected by health
      targetDensity = Math.min(1, targetDensity * 1.1);
      break;
  }
  
  // Stress reduces foliage
  if (tree.stressLevel > 40) {
    const stressFactor = 1 - (tree.stressLevel - 40) / 120;
    targetOpacity *= stressFactor;
  }
  
  // Smooth transitions
  tree.foliageOpacity += (targetOpacity - tree.foliageOpacity) * 0.08;
  tree.foliageDensity += (targetDensity - tree.foliageDensity) * 0.06;
  
  // Clamp
  tree.foliageOpacity = clamp(tree.foliageOpacity, 0, 1);
  tree.foliageDensity = clamp(tree.foliageDensity, 0, 1);
}

/**
 * Main animation loop with fixed timestep for physics
 */
function animationLoop(timestamp) {
  if (simulationState.lastFrameTime === 0) {
    simulationState.lastFrameTime = timestamp;
  }
  
  const deltaMs = Math.min(timestamp - simulationState.lastFrameTime, 100); // Cap at 100ms
  simulationState.lastFrameTime = timestamp;
  
  // Time speed from UI
  const speedMultiplier = getTimeSpeed();
  const deltaTime = (deltaMs / 1000) * speedMultiplier;
  
  // Fixed timestep physics with accumulator
  if (simulationState.running && !simulationState.paused) {
    simulationState.physicsAccumulator += deltaTime;
    
    // Substep to prevent tunneling at high speeds
    const maxSubsteps = 10;
    let substeps = 0;
    while (simulationState.physicsAccumulator >= simulationState.substepTime && substeps < maxSubsteps) {
      updateEnvironmentFromUI();
      updateBiology(simulationState.substepTime);
      simulationState.physicsAccumulator -= simulationState.substepTime;
      substeps++;
    }
    
    simulationState.time += deltaTime;
  }
  
  // Render (always, for smooth visuals)
  const seasonProgress = getSeasonProgress(environment.dayOfYear);
  renderScene(environment.dayOfYear, seasonProgress);
  
  // Update UI
  updateReadout();
  drawHealthGraph();
  drawBiomassGraph();
  
  // FPS tracking
  simulationState.frameCount++;
  if (simulationState.frameCount % 30 === 0) {
    simulationState.fps = Math.round(1000 / (deltaMs || 16.67));
  }
  
  requestAnimationFrame(animationLoop);
}

/**
 * Initialize and start simulation
 */
async function startSimulation() {
  // Optional: load variables.JSON before initializing systems/UI.
  const vars = await window.reloadVariablesConfigFromFile();
  if (vars) {
    const textarea = document.getElementById('configTextarea');
    if (textarea && window.variablesConfigSourceText) {
      textarea.value = window.variablesConfigSourceText;
    }
  }

  // Initialize PRNG with seed
  const seedInput = document.getElementById('seed');
  const seed = seedInput ? parseInt(seedInput.value) || 12345 : 12345;
  initPRNG(seed);
  
  // Initialize systems
  initializeTree();
  initRenderer();
  initUI();
  updateEnvironmentFromUI();
  
  // Initialize season (environment.season must be a SEASONS object, not string)
  updateEnvironmentTime(0);
  
  // Initialize species display
  updateSpeciesDisplay();
  
  // Clear history
  healthHistory.length = 0;
  
  // Start animation
  requestAnimationFrame(animationLoop);
  
  console.log('🌳 Hyperrealistic Tree Simulation started');
  console.log(`   Seed: ${seed}`);
  console.log(`   Canvas: ${renderer.width}x${renderer.height}`);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startSimulation);
} else {
  startSimulation();
}
