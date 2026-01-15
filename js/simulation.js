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
  const isDormant = environment.season === SEASONS.WINTER || 
                    environment.temperature < 5 ||
                    (environment.season === SEASONS.AUTUMN && getSeasonProgress(environment.dayOfYear) > 0.7);
  
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
    const healthFactor = tree.health / 100;
    const vigorFactor = tree.vigor / 100;
    const ageFactor = Math.max(0.1, 1 - tree.age / 200);
    const growthRate = netGrowthFactor * healthFactor * vigorFactor * ageFactor;
    
    // Height growth (allometric: slows with size)
    const heightLimit = CONFIG.TREE_MAX_HEIGHT;
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
  if (environment.season === SEASONS.AUTUMN) {
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
  
  const seasonProgress = getSeasonProgress(environment.dayOfYear);
  
  switch (environment.season) {
    case SEASONS.WINTER:
      targetOpacity *= 0.05;
      targetDensity *= 0.1;
      break;
      
    case SEASONS.AUTUMN:
      // Gradual leaf loss
      const autumnFade = 1 - Math.pow(seasonProgress, 1.5);
      targetOpacity *= autumnFade;
      targetDensity *= autumnFade;
      break;
      
    case SEASONS.SPRING:
      // Leaf emergence
      const springGrowth = Math.pow(seasonProgress, 0.7);
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
function startSimulation() {
  // Initialize PRNG with seed
  const seedInput = document.getElementById('seed');
  const seed = seedInput ? parseInt(seedInput.value) || 12345 : 12345;
  initPRNG(seed);
  
  // Initialize systems
  initializeTree();
  initRenderer();
  initUI();
  updateEnvironmentFromUI();
  
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
