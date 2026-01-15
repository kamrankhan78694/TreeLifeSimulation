// ============================================================
// HYPERREALISTIC TREE STATE & BIOLOGY
// Full biological simulation with realistic morphology
// ============================================================

const tree = {
  // === TEMPORAL ===
  age: 0,                    // years
  daysSinceBirth: 0,         // days
  germinationDate: 0,        // day of year when seed sprouted
  
  // === MORPHOLOGY ===
  height: 0.25,              // meters
  dbh: 0.008,                // diameter at breast height (m)
  crownRadius: 0.3,          // canopy spread (m)
  crownHeight: 0.2,          // vertical canopy extent (m)
  rootDepth: 0.15,           // meters underground
  rootSpread: 0.4,           // horizontal root extent (m)
  trunkTaper: 0.85,          // trunk taper ratio
  
  // === LEAF SYSTEM ===
  leafCount: 50,             // estimated total leaves
  leafArea: 0.1,             // m² total leaf surface
  leafSize: 1.0,             // relative leaf size
  foliageOpacity: 1.0,       // visual density 0-1
  foliageDensity: 1.0,       // biological density
  chlorophyllContent: 100,   // 0-100
  
  // === VITALITY ===
  health: 100,               // overall health 0-100
  vigor: 100,                // growth vigor 0-100
  waterContent: 100,         // % of capacity
  nutrientLevel: 100,        // % of optimal
  stressLevel: 0,            // accumulated stress 0-100
  diseaseLoad: 0,            // infection severity 0-100
  
  // === BIOMASS (kg) ===
  biomass: {
    total: 0.5,
    trunk: 0.3,
    branches: 0.1,
    leaves: 0.05,
    roots: 0.05,
    heartwood: 0,
    sapwood: 0.3
  },
  
  // === CARBON CYCLE ===
  co2Absorbed: 0,            // lifetime kg CO2
  o2Produced: 0,             // lifetime kg O2
  waterTranspired: 0,        // lifetime liters
  carbonStored: 0,           // kg C in biomass
  
  // === ANNUAL TRACKING ===
  growthThisYear: 0,
  ringsGrown: 0,
  
  // === VISUAL STRUCTURES ===
  branches: [],              // branch architecture
  leafClusters: [],          // foliage particle positions
  leaves: [],                // individual leaf particles
  rootMesh: [],              // root structure
  leafDrops: [],             // falling leaves
  barkSegments: [],          // bark texture data
  
  // === PHENOLOGY ===
  dormant: false,
  budBurst: false,
  flowering: false,
  leafSenescence: false,
  
  // === SPECIES ===
  species: 'OAK',

  // === MORTALITY MODEL (optional) ===
  mortality: {
    enabled: false,
    baseRatePerYear: 0.001,
    senescenceStartAge: 150,
    maxAge: CONFIG.TREE_MAX_AGE,

    // Environmental hazard knobs (used by simulation.js)
    droughtThreshold: 0.3,      // 0-1 soil moisture threshold (matches variables.JSON)
    heatStressTemp: 35,         // °C
    diseaseBaseRatePerYear: 0.02,
    stormFrequency: 0.05        // 0-1-ish, used as hazard scaling when storms are active
  },
  deathCause: null
};

// Particle systems
const particles = {
  pollen: [],
  dust: [],
  fireflies: [],
  birds: [],
  insects: [],
  rain: [],
  snow: [],
  mist: []
};

/**
 * Initialize tree to sapling state
 */
function initializeTree() {
  tree.age = 0;
  tree.daysSinceBirth = 0;
  tree.germinationDate = randomInt(60, 120); // Spring germination
  
  // Morphology
  tree.height = CONFIG.TREE_INIT_HEIGHT;
  tree.dbh = CONFIG.TREE_INIT_DBH;
  tree.crownRadius = tree.height * 0.6;
  tree.crownHeight = tree.height * 0.4;
  tree.rootDepth = tree.height * 0.3;
  tree.rootSpread = tree.height * 0.5;
  tree.trunkTaper = 0.85;
  
  // Leaves
  tree.leafCount = 50;
  tree.leafArea = 0.1;
  tree.leafSize = 1.0;
  tree.foliageOpacity = 1.0;
  tree.foliageDensity = 1.0;
  tree.chlorophyllContent = 100;
  
  // Vitality
  tree.health = 100;
  tree.deathCause = null;
  tree.vigor = 100;
  tree.waterContent = 100;
  tree.nutrientLevel = 100;
  tree.stressLevel = 0;
  tree.diseaseLoad = 0;
  
  // Biomass
  tree.biomass = {
    total: 0.5,
    trunk: 0.3,
    branches: 0.1,
    leaves: 0.05,
    roots: 0.05,
    heartwood: 0,
    sapwood: 0.3
  };
  
  // Production
  tree.co2Absorbed = 0;
  tree.o2Produced = 0;
  tree.waterTranspired = 0;
  tree.carbonStored = 0;
  tree.growthThisYear = 0;
  tree.ringsGrown = 0;
  
  // Phenology
  tree.dormant = false;
  tree.budBurst = false;
  tree.flowering = false;
  tree.leafSenescence = false;
  
  // Visual structures
  tree.leafDrops = [];
  tree.leaves = [];
  
  generateBranchArchitecture();
  generateLeafClusters();
  generateIndividualLeaves();
  generateRootMesh();
  generateBarkTexture();
  
  // Clear particles
  Object.keys(particles).forEach(key => particles[key] = []);
}

/**
 * Generate realistic fractal branch architecture
 */
function generateBranchArchitecture() {
  tree.branches = [];
  
  const baseAngle = Math.PI / 2; // Point upward
  const baseLength = tree.height * 0.5;
  const baseThickness = tree.dbh * 80;
  
  function createBranch(x, y, angle, length, thickness, depth, parentIndex) {
    if (depth <= 0 || length < 0.02 || thickness < 0.5) return;
    
    // Natural variation
    const angleVariation = random(-CONFIG.BRANCH_ANGLE_VARIANCE, CONFIG.BRANCH_ANGLE_VARIANCE);
    const lengthVariation = random(0.85, 1.15);
    const twist = random(-CONFIG.BRANCH_TWIST, CONFIG.BRANCH_TWIST);
    
    const actualAngle = angle + angleVariation + twist;
    const actualLength = length * lengthVariation;
    
    const endX = x + Math.cos(actualAngle) * actualLength;
    const endY = y + Math.sin(actualAngle) * actualLength;
    
    const branchIndex = tree.branches.length;
    tree.branches.push({
      x1: x, y1: y,
      x2: endX, y2: endY,
      thickness,
      depth,
      angle: actualAngle,
      length: actualLength,
      parentIndex,
      swayPhase: random(0, Math.PI * 2),
      swayAmount: 0.02 / (depth + 1),
      hasLeaves: depth <= 2,
      healthy: true
    });
    
    // Number of child branches varies with depth
    const numChildren = depth > 3 ? randomInt(2, 4) : randomInt(1, 3);
    
    for (let i = 0; i < numChildren; i++) {
      const spread = (i - (numChildren - 1) / 2) * (CONFIG.BRANCH_ANGLE_BASE + random(-0.1, 0.1));
      const childAngle = actualAngle + spread;
      const childLength = actualLength * CONFIG.BRANCH_LENGTH_DECAY;
      const childThickness = thickness * CONFIG.BRANCH_THICKNESS_DECAY;
      
      createBranch(endX, endY, childAngle, childLength, childThickness, depth - 1, branchIndex);
    }
  }
  
  // Create main trunk and primary branches
  createBranch(0, 0, baseAngle, baseLength, baseThickness, CONFIG.BRANCH_RECURSION, -1);
}

/**
 * Generate leaf cluster positions for canopy rendering
 */
function generateLeafClusters() {
  tree.leafClusters = [];
  
  const clusterCount = Math.floor(CONFIG.LEAF_CLUSTER_COUNT + tree.height * 12);
  const crownCenter = tree.height * 0.75;
  
  for (let i = 0; i < clusterCount; i++) {
    // Spherical distribution in crown
    const phi = random(0, Math.PI * 2);
    const theta = random(0, Math.PI * 0.6);
    const r = tree.crownRadius * random(0.3, 1.0);
    
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = crownCenter + r * Math.cos(theta) * 0.7 - tree.crownRadius * 0.3;
    const z = r * Math.sin(theta) * Math.sin(phi);
    
    // Only add if within reasonable canopy shape
    const distFromCenter = Math.sqrt(x * x + z * z);
    const expectedRadius = tree.crownRadius * (1 - Math.pow((y - crownCenter) / tree.crownHeight, 2) * 0.5);
    
    if (distFromCenter <= expectedRadius * 1.2) {
      tree.leafClusters.push({
        x, y, z,
        size: random(0.8, 1.5) * tree.leafSize,
        density: random(0.6, 1.0) * tree.foliageDensity,
        hueShift: random(-10, 10),
        swayPhase: random(0, Math.PI * 2),
        swayAmount: random(0.01, 0.03),
        lightExposure: 0.5 + (y / tree.height) * 0.5
      });
    }
  }
}

/**
 * Generate individual leaf particles for detailed rendering
 */
function generateIndividualLeaves() {
  tree.leaves = [];
  
  const leafCount = Math.min(CONFIG.LEAF_RENDER_COUNT, tree.leafCount);
  
  for (let i = 0; i < leafCount; i++) {
    // Distribute leaves on branch tips
    if (tree.branches.length > 0) {
      const tipBranches = tree.branches.filter(b => b.depth <= 2);
      const branch = randomChoice(tipBranches.length ? tipBranches : tree.branches);
      
      const t = random(0.5, 1.0);
      const x = lerp(branch.x1, branch.x2, t) + random(-0.5, 0.5);
      const y = lerp(branch.y1, branch.y2, t) + random(-0.3, 0.3);
      
      tree.leaves.push({
        x, y,
        size: random(CONFIG.LEAF_SIZE_MIN, CONFIG.LEAF_SIZE_MAX) * tree.leafSize,
        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-0.02, 0.02),
        hue: random(-15, 15),
        saturation: random(-10, 10),
        lightness: random(-8, 8),
        swayPhase: random(0, Math.PI * 2),
        swayAmount: random(0.5, 2),
        attached: true,
        opacity: 1,
        branchIndex: tree.branches.indexOf(branch)
      });
    }
  }
}

/**
 * Generate realistic root mesh
 */
function generateRootMesh() {
  tree.rootMesh = [];
  
  // Tap root
  tree.rootMesh.push({
    type: 'tap',
    x: 0,
    angle: -Math.PI / 2,
    depth: tree.rootDepth * random(0.9, 1.1),
    spread: 0,
    thickness: tree.dbh * 40,
    children: []
  });
  
  // Lateral roots
  for (let i = 0; i < CONFIG.ROOT_SEGMENTS; i++) {
    const angle = (i / CONFIG.ROOT_SEGMENTS) * Math.PI * 2 + random(-0.2, 0.2);
    const spread = tree.rootSpread * random(0.7, 1.3);
    const depth = tree.rootDepth * random(0.2, 0.6);
    const thickness = tree.dbh * 30 * random(0.4, 0.8);
    
    const root = {
      type: 'lateral',
      x: 0,
      angle,
      depth,
      spread,
      thickness,
      children: []
    };
    
    // Add root hairs/fine roots
    const numFine = randomInt(2, 5);
    for (let j = 0; j < numFine; j++) {
      root.children.push({
        angle: angle + random(-0.5, 0.5),
        depth: depth * random(0.3, 0.8),
        spread: spread * random(0.2, 0.6),
        thickness: thickness * 0.3
      });
    }
    
    tree.rootMesh.push(root);
  }
}

/**
 * Generate bark texture segments
 */
function generateBarkTexture() {
  tree.barkSegments = [];
  
  const numSegments = Math.floor(tree.height * 5 + tree.dbh * 20);
  
  for (let i = 0; i < numSegments; i++) {
    const y = random(0, tree.height);
    const widthAtY = tree.dbh * (1 - (y / tree.height) * (1 - tree.trunkTaper));
    
    tree.barkSegments.push({
      y,
      width: widthAtY,
      depth: random(0.5, 2),
      roughness: random(0.3, 1),
      color: random(-20, 20) // variation from base bark color
    });
  }
}

/**
 * Get tree life stage based on age
 */
function getLifeStage(age) {
  if (age < 0.5) return 'Germinating';
  if (age < 2) return 'Seedling';
  if (age < 8) return 'Sapling';
  if (age < 25) return 'Young';
  if (age < 80) return 'Mature';
  if (age < 200) return 'Old-growth';
  if (age < 400) return 'Ancient';
  return 'Legendary';
}

/**
 * Get status emoji and text based on health/age
 */
function getStatusEmoji(health, age) {
  if (health <= 0) return '💀 Dead';
  if (health < 15) return '🪦 Dying';
  if (health < 30) return '🥀 Critical';
  if (health < 50) return '😰 Stressed';
  if (health < 70) return '😐 Recovering';
  
  const stage = getLifeStage(age);
  const stageEmojis = {
    'Germinating': '🌱',
    'Seedling': '🌿',
    'Sapling': '🪴',
    'Young': '🌲',
    'Mature': '🌳',
    'Old-growth': '🌴',
    'Ancient': '🏛️',
    'Legendary': '⭐'
  };
  
  return `${stageEmojis[stage] || '🌳'} ${stage}`;
}

/**
 * Create falling leaf particle
 */
function createFallingLeaf(x, y, season) {
  if (tree.leafDrops.length >= CONFIG.PARTICLE_FALLING_LEAVES) return;
  
  const colors = season === SEASONS.AUTUMN 
    ? ['#d4a017', '#c85a17', '#8b4513', '#ff6347', '#daa520']
    : ['#228b22', '#32cd32', '#6b8e23'];
  
  tree.leafDrops.push({
    x, y,
    vx: random(-1.5, 1.5),
    vy: random(0.3, 1.2),
    ax: 0,
    rotation: random(0, Math.PI * 2),
    rotationSpeed: random(-0.15, 0.15),
    size: random(CONFIG.LEAF_SIZE_MIN, CONFIG.LEAF_SIZE_MAX),
    color: randomChoice(colors),
    opacity: 1,
    lifetime: random(200, 400),
    wobblePhase: random(0, Math.PI * 2),
    wobbleSpeed: random(0.05, 0.15),
    wobbleAmount: random(0.5, 2)
  });
}

/**
 * Update falling leaves physics
 */
function updateLeafDrops(dt, windSpeed) {
  for (let i = tree.leafDrops.length - 1; i >= 0; i--) {
    const leaf = tree.leafDrops[i];
    
    // Wind effect
    leaf.ax = (windSpeed * 0.1 - leaf.vx * 0.1);
    leaf.vx += leaf.ax * dt;
    
    // Wobble motion
    leaf.wobblePhase += leaf.wobbleSpeed * dt;
    leaf.vx += Math.sin(leaf.wobblePhase) * leaf.wobbleAmount * dt;
    
    // Gravity with air resistance
    leaf.vy += 0.05 * dt;
    leaf.vy = Math.min(leaf.vy, 2);
    
    // Update position
    leaf.x += leaf.vx * dt;
    leaf.y += leaf.vy * dt;
    leaf.rotation += leaf.rotationSpeed * dt;
    
    // Fade out
    leaf.lifetime -= dt;
    if (leaf.lifetime < 50) {
      leaf.opacity = leaf.lifetime / 50;
    }
    
    // Remove if off screen or faded
    if (leaf.lifetime <= 0 || leaf.y > 1000) {
      tree.leafDrops.splice(i, 1);
    }
  }
}

/**
 * Calculate crown volume (m³)
 */
function calculateCrownVolume() {
  // Approximate as ellipsoid
  return (4 / 3) * Math.PI * tree.crownRadius * tree.crownRadius * tree.crownHeight * 0.5;
}

/**
 * Calculate leaf area index (LAI)
 */
function calculateLAI() {
  const crownProjectionArea = Math.PI * tree.crownRadius * tree.crownRadius;
  return crownProjectionArea > 0 ? tree.leafArea / crownProjectionArea : 0;
}

/**
 * Create a falling leaf particle
 */
function createLeafDrop(x, y, color) {
  tree.leafDrops.push({
    x: x,
    y: y,
    vx: random(-1, 1),
    vy: random(0.5, 2),
    color: color || tree.season?.foliageColor || '#228B22',
    rotation: random(0, Math.PI * 2),
    rotationSpeed: random(-0.1, 0.1),
    size: random(2, 8),
    opacity: 1,
    lifetime: 30
  });
}


