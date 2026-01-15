// ============================================================
// CONFIGURATION & CONSTANTS - HYPERREALISTIC 8K HDR EDITION
// Ultra-realistic tree life simulation
// ============================================================

const CONFIG = {
  // === CANVAS - ULTRA HIGH RESOLUTION ===
  CANVAS_WIDTH: 1920,
  CANVAS_HEIGHT: 1200,
  CANVAS_DPI: window.devicePixelRatio || 2,
  
  // === HDR & ADVANCED RENDERING ===
  HDR_EXPOSURE: 1.15,
  HDR_GAMMA: 2.2,
  HDR_BLOOM_INTENSITY: 0.18,
  HDR_BLOOM_RADIUS: 25,
  HDR_SATURATION: 1.08,
  AMBIENT_OCCLUSION_STRENGTH: 0.35,
  SHADOW_SOFTNESS: 0.55,
  SUBSURFACE_SCATTER: 0.25,
  
  // === SIMULATION TIMING ===
  DAYS_PER_YEAR: 365,
  MAX_HISTORY: 600,
  PHYSICS_SUBSTEPS: 3,
  TARGET_FPS: 60,
  
  // === TREE BIOLOGY - REALISTIC PARAMETERS ===
  TREE_INIT_HEIGHT: 0.25,        // meters (tiny sapling)
  TREE_INIT_DBH: 0.008,          // 8mm diameter
  TREE_MAX_HEIGHT: 40,           // meters (mature oak)
  TREE_MAX_AGE: 600,             // years
  TREE_MAX_DBH: 2.5,             // meters
  TREE_MAX_CROWN_RADIUS: 15,     // meters
  
  // === GROWTH RATES (realistic annual) ===
  GROWTH_RATE_OPTIMAL: 1.0,
  HEIGHT_GROWTH_FACTOR: 0.9,
  DBH_GROWTH_FACTOR: 0.18,
  ROOT_GROWTH_FACTOR: 1.3,
  CROWN_GROWTH_FACTOR: 0.7,
  
  // === HEALTH SYSTEM ===
  HEALTH_MAX: 100,
  HEALTH_MIN: 0,
  HEALTH_OPTIMAL_TEMP_MIN: 12,
  HEALTH_OPTIMAL_TEMP_MAX: 26,
  HEALTH_OPTIMAL_WATER: 55,
  HEALTH_OPTIMAL_SOIL: 70,
  HEALTH_OPTIMAL_LIGHT: 65,
  
  // === STRESS THRESHOLDS ===
  STRESS_TEMP_FROST: -5,
  STRESS_TEMP_EXTREME_COLD: -20,
  STRESS_TEMP_HEAT: 35,
  STRESS_TEMP_EXTREME_HEAT: 45,
  STRESS_WATER_DROUGHT: 18,
  STRESS_WATER_FLOOD: 88,
  STRESS_LIGHT_MIN: 12,
  
  // === SEASONAL GROWTH MULTIPLIERS ===
  SPRING_GROWTH_MULT: 1.6,
  SUMMER_GROWTH_MULT: 1.0,
  AUTUMN_GROWTH_MULT: 0.25,
  WINTER_GROWTH_MULT: 0.03,
  
  // === STRESSOR IMPACTS ===
  DISEASE_STRESS: 0.55,
  PEST_STRESS: 0.35,
  STORM_STRESS: 0.7,
  POLLUTION_STRESS: 0.3,
  LIGHTNING_STRESS: 0.95,
  FROST_STRESS: 0.45,
  
  // === LEAF SYSTEM ===
  LEAF_COUNT_SIMULATED: 150000,  // Biological leaf count
  LEAF_RENDER_COUNT: 3000,       // Visual particles
  LEAF_SIZE_MIN: 4,
  LEAF_SIZE_MAX: 14,
  LEAF_WIND_RESPONSE: 0.85,
  LEAF_LIGHT_SCATTER: 0.3,
  LEAF_CLUSTER_COUNT: 12,
  
  // === BRANCH ARCHITECTURE ===
  BRANCH_RECURSION: 6,
  BRANCH_ANGLE_BASE: 0.45,
  BRANCH_ANGLE_VARIANCE: 0.35,
  BRANCH_LENGTH_DECAY: 0.68,
  BRANCH_THICKNESS_DECAY: 0.65,
  BRANCH_TWIST: 0.15,
  
  // === ROOT SYSTEM ===
  ROOT_SEGMENTS: 18,
  ROOT_DEPTH_RATIO: 0.35,
  ROOT_SPREAD_RATIO: 1.6,
  ROOT_BRANCHING: 4,
  
  // === BIOMASS CALCULATION ===
  BIOMASS_HEIGHT_RATIO: 0.85,
  BIOMASS_DBH_RATIO: 2.2,
  BIOMASS_HEALTH_RATIO: 0.55,
  BIOMASS_WOOD_DENSITY: 650,     // kg/m³
  
  // === CARBON CYCLE ===
  CO2_ABSORPTION_RATE: 0.018,    // kg per health point per year
  O2_PRODUCTION_RATE: 0.024,     // kg per health point per year
  WATER_TRANSPIRATION: 0.5,      // liters per day per health
  
  // === PARTICLE SYSTEMS ===
  PARTICLE_POLLEN: 80,
  PARTICLE_DUST: 40,
  PARTICLE_FIREFLIES: 25,
  PARTICLE_RAIN_DROPS: 500,
  PARTICLE_SNOW_FLAKES: 400,
  PARTICLE_FALLING_LEAVES: 60,
  PARTICLE_BIRDS: 8,
  PARTICLE_INSECTS: 15,
  
  // === ATMOSPHERIC EFFECTS ===
  ATMOSPHERE_SCATTER_R: 0.28,
  ATMOSPHERE_SCATTER_G: 0.22,
  ATMOSPHERE_SCATTER_B: 0.18,
  GOD_RAY_INTENSITY: 0.35,
  GOD_RAY_SAMPLES: 50,
  FOG_DENSITY: 0.0008,
  FOG_HEIGHT: 200,
  MIST_INTENSITY: 0.4,
  
  // === LIGHTING ===
  SUN_INTENSITY: 1.2,
  MOON_INTENSITY: 0.15,
  AMBIENT_LIGHT: 0.25,
  SHADOW_DARKNESS: 0.4,
  SPECULAR_STRENGTH: 0.3,
  
  // === WIND PHYSICS ===
  WIND_BASE_SPEED: 0.5,
  WIND_GUST_FREQUENCY: 0.02,
  WIND_GUST_STRENGTH: 2.5,
  WIND_TURBULENCE: 0.3,
  
  // === TIME OF DAY ===
  SUNRISE_HOUR: 6,
  SUNSET_HOUR: 20,
  GOLDEN_HOUR_DURATION: 1.5,
  
  // === TERRAIN ===
  GRASS_BLADE_COUNT: 800,
  GRASS_HEIGHT_MIN: 5,
  GRASS_HEIGHT_MAX: 25,
  GROUND_TEXTURE_DETAIL: 3,
  SOIL_LAYERS: 4,
};

// ============================================================
// HDR GLOBAL (renderer reads HDR.* at script parse time)
// ============================================================

window.HDR = window.HDR || {
  exposure: CONFIG.HDR_EXPOSURE,
  gamma: CONFIG.HDR_GAMMA,
  saturation: CONFIG.HDR_SATURATION,
  contrast: 1.0,
  bloomEnabled: true,
  bloomIntensity: CONFIG.HDR_BLOOM_INTENSITY,
  bloomRadius: CONFIG.HDR_BLOOM_RADIUS
};

// ============================================================
// ENHANCED SEASON DEFINITIONS
// ============================================================

const SEASONS = {
  SPRING: { 
    name: 'Spring', 
    value: 0,
    dayStart: 0,
    dayEnd: 91,
    // Leaf colors (HSL)
    leafColorStart: { h: 95, s: 55, l: 50 },
    leafColorEnd: { h: 125, s: 65, l: 40 },
    // Sky gradients
    skyTopDay: '#5ba3d9',
    skyBottomDay: '#c9e4f7',
    skyTopNight: '#0d1b2a',
    skyBottomNight: '#1b3a4b',
    // Environment
    ambientTemp: 14,
    humidity: 65,
    rainfall: 60,
    dayLength: 12.5,
    // Effects
    pollenActive: true,
    birdActivity: 0.8,
    insectActivity: 0.5,
    // Colors
    grassColor: '#4ade80',
    groundColor: '#5c4827',
    fogColor: 'rgba(200, 220, 255, 0.15)',
  },
  SUMMER: { 
    name: 'Summer', 
    value: 1,
    dayStart: 91,
    dayEnd: 182,
    leafColorStart: { h: 125, s: 65, l: 38 },
    leafColorEnd: { h: 130, s: 60, l: 32 },
    skyTopDay: '#1a85c9',
    skyBottomDay: '#87ceeb',
    skyTopNight: '#0a1628',
    skyBottomNight: '#162d50',
    ambientTemp: 26,
    humidity: 55,
    rainfall: 35,
    dayLength: 15,
    pollenActive: false,
    birdActivity: 0.9,
    insectActivity: 1.0,
    grassColor: '#22c55e',
    groundColor: '#6b4423',
    fogColor: 'rgba(255, 250, 240, 0.08)',
  },
  AUTUMN: { 
    name: 'Autumn', 
    value: 2,
    dayStart: 182,
    dayEnd: 273,
    leafColorStart: { h: 60, s: 70, l: 50 },
    leafColorEnd: { h: 15, s: 80, l: 35 },
    skyTopDay: '#6b7b8c',
    skyBottomDay: '#d4a574',
    skyTopNight: '#1a1a2e',
    skyBottomNight: '#2d2d44',
    ambientTemp: 11,
    humidity: 70,
    rainfall: 55,
    dayLength: 11,
    pollenActive: false,
    birdActivity: 0.4,
    insectActivity: 0.2,
    grassColor: '#b8860b',
    groundColor: '#8b4513',
    fogColor: 'rgba(180, 160, 140, 0.2)',
  },
  WINTER: { 
    name: 'Winter', 
    value: 3,
    dayStart: 273,
    dayEnd: 365,
    leafColorStart: { h: 30, s: 15, l: 55 },
    leafColorEnd: { h: 25, s: 10, l: 60 },
    skyTopDay: '#4a5568',
    skyBottomDay: '#94a3b8',
    skyTopNight: '#0f0f1a',
    skyBottomNight: '#1a1a2e',
    ambientTemp: 1,
    humidity: 80,
    rainfall: 75,
    dayLength: 9,
    pollenActive: false,
    birdActivity: 0.1,
    insectActivity: 0.0,
    grassColor: '#c8d6e5',
    groundColor: '#576574',
    fogColor: 'rgba(220, 230, 245, 0.25)',
  }
};

const SEASON_ORDER = [SEASONS.SPRING, SEASONS.SUMMER, SEASONS.AUTUMN, SEASONS.WINTER];

// ============================================================
// TREE SPECIES DATABASE
// ============================================================

const TREE_SPECIES = {
  OAK: {
    name: 'English Oak',
    scientificName: 'Quercus robur',
    maxHeight: 35,
    maxAge: 500,
    growthRate: 0.75,
    leafShape: 'lobed',
    leafSize: 1.0,
    barkTexture: 'deeply_furrowed',
    barkColor: '#4a3728',
    woodDensity: 720,
    autumnColors: ['#d4a017', '#c85a17', '#8b4513', '#a0522d'],
    crownShape: 'rounded',
    droughtTolerance: 0.7,
    frostTolerance: 0.8
  },
  MAPLE: {
    name: 'Sugar Maple',
    scientificName: 'Acer saccharum',
    maxHeight: 30,
    maxAge: 300,
    growthRate: 0.9,
    leafShape: 'palmate',
    leafSize: 1.2,
    barkTexture: 'plated',
    barkColor: '#5c4033',
    woodDensity: 680,
    autumnColors: ['#ff4500', '#dc143c', '#ff6347', '#ffd700'],
    crownShape: 'oval',
    droughtTolerance: 0.5,
    frostTolerance: 0.9
  },
  PINE: {
    name: 'Scots Pine',
    scientificName: 'Pinus sylvestris',
    maxHeight: 40,
    maxAge: 400,
    growthRate: 0.6,
    leafShape: 'needle',
    leafSize: 0.3,
    barkTexture: 'scaly',
    barkColor: '#b8733e',
    woodDensity: 510,
    autumnColors: ['#228b22'],
    crownShape: 'conical',
    droughtTolerance: 0.8,
    frostTolerance: 0.95,
    evergreen: true
  },
  BIRCH: {
    name: 'Silver Birch',
    scientificName: 'Betula pendula',
    maxHeight: 25,
    maxAge: 100,
    growthRate: 1.2,
    leafShape: 'triangular',
    leafSize: 0.8,
    barkTexture: 'papery',
    barkColor: '#f5f5f5',
    woodDensity: 640,
    autumnColors: ['#ffd700', '#ffcc00', '#daa520'],
    crownShape: 'weeping',
    droughtTolerance: 0.4,
    frostTolerance: 0.95
  }
};

// ============================================================
// WEATHER PATTERNS
// ============================================================

const WEATHER_TYPES = {
  CLEAR: { name: 'Clear', cloudCover: 0.1, precipitation: 0, windMult: 0.8 },
  PARTLY_CLOUDY: { name: 'Partly Cloudy', cloudCover: 0.4, precipitation: 0, windMult: 1.0 },
  CLOUDY: { name: 'Cloudy', cloudCover: 0.8, precipitation: 0.1, windMult: 1.1 },
  RAIN: { name: 'Rain', cloudCover: 0.9, precipitation: 0.7, windMult: 1.3 },
  STORM: { name: 'Storm', cloudCover: 1.0, precipitation: 0.9, windMult: 2.5 },
  SNOW: { name: 'Snow', cloudCover: 0.85, precipitation: 0.6, windMult: 0.9 },
  FOG: { name: 'Fog', cloudCover: 0.3, precipitation: 0.05, windMult: 0.3 }
};
