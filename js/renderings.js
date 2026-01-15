// ============================================================
// HYPERREALISTIC HDR RENDERING ENGINE
// Advanced photorealistic visualization with volumetric effects
// ============================================================

const renderer = {
  canvas: null,
  ctx: null,
  width: CONFIG.CANVAS_WIDTH,
  height: CONFIG.CANVAS_HEIGHT,
  dpi: CONFIG.CANVAS_DPI,
  
  // HDR parameters
  exposure: HDR.exposure,
  gamma: HDR.gamma,
  saturation: HDR.saturation,
  contrast: HDR.contrast,
  
  // Lighting system
  sunPosition: { x: 0, y: 0 },
  sunIntensity: 1.0,
  ambientOcclusion: true,
  
  // Animation time
  time: 0,
  deltaTime: 0,
  lastFrame: 0,
  
  // Cached gradients
  skyGradient: null,
  groundGradient: null,
  
  // Offscreen buffers for effects
  bloomBuffer: null,
  bloomCtx: null
};

/**
 * Initialize renderer with HDR-capable context
 */
function initRenderer() {
  renderer.canvas = document.getElementById('canvas');
  renderer.ctx = renderer.canvas.getContext('2d', { 
    willReadFrequently: false, 
    alpha: false,
    desynchronized: true 
  });
  
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.canvas.width = renderer.width * renderer.dpi * dpr;
  renderer.canvas.height = renderer.height * renderer.dpi * dpr;
  renderer.canvas.style.width = renderer.width + 'px';
  renderer.canvas.style.height = renderer.height + 'px';
  
  renderer.ctx.scale(renderer.dpi * dpr, renderer.dpi * dpr);
  
  // Create bloom buffer (lower res for performance)
  renderer.bloomBuffer = document.createElement('canvas');
  renderer.bloomBuffer.width = renderer.width / 4;
  renderer.bloomBuffer.height = renderer.height / 4;
  renderer.bloomCtx = renderer.bloomBuffer.getContext('2d');
  
  // Enable image smoothing for quality
  renderer.ctx.imageSmoothingEnabled = true;
  renderer.ctx.imageSmoothingQuality = 'high';
}

/**
 * Calculate sun position based on time
 */
function calculateSunPosition(dayOfYear) {
  const dayProgress = (dayOfYear % 1);
  const yearProgress = dayOfYear / 365;
  
  // Sun arc changes with seasons
  const seasonalTilt = Math.sin(yearProgress * Math.PI * 2) * 0.2;
  
  renderer.sunPosition.x = 100 + dayProgress * (renderer.width - 200);
  renderer.sunPosition.y = 150 + Math.sin(dayProgress * Math.PI) * -120 + seasonalTilt * 50;
  renderer.sunIntensity = Math.max(0, Math.sin(dayProgress * Math.PI));
}

/**
 * Draw complete scene with HDR pipeline
 */
function renderScene(dayOfYear, seasonProgress) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  const season = environment.season;
  
  // Update timing
  const now = performance.now();
  renderer.deltaTime = (now - renderer.lastFrame) / 1000;
  renderer.lastFrame = now;
  renderer.time += renderer.deltaTime;
  
  // Calculate sun position
  calculateSunPosition(dayOfYear);
  
  // === BASE LAYER: SKY ===
  drawAtmosphericSky(dayOfYear, season, seasonProgress);
  
  // === CELESTIAL BODIES ===
  drawRealisticSun(dayOfYear);
  if (renderer.sunIntensity < 0.3) {
    drawRealisticMoon(dayOfYear);
    drawStars(renderer.sunIntensity);
  }
  
  // === VOLUMETRIC CLOUDS ===
  if (environment.storm) {
    drawStormSystem(seasonProgress);
  } else {
    drawVolumetricClouds(seasonProgress, season);
  }
  
  // === ATMOSPHERIC SCATTERING ===
  if (renderer.sunIntensity > 0.1) {
    drawGodRays(dayOfYear);
  }
  
  // === DISTANT LANDSCAPE ===
  drawDistantHills(season);
  
  // === GROUND & TERRAIN ===
  drawRealisticGround(season, seasonProgress);
  
  // === ENVIRONMENTAL EFFECTS (behind tree) ===
  if (environment.pollution) drawAtmosphericPollution();
  
  // === ROOT SYSTEM (underground) ===
  drawDetailedRoots();
  
  // === MAIN TREE ===
  drawHyperrealisticTree(season, seasonProgress);
  
  // === WEATHER EFFECTS ===
  if (environment.storm) {
    drawRealisticRain(seasonProgress);
    if (random() < 0.002) drawLightning();
  }
  if (season === SEASONS.WINTER && environment.temperature < 2) {
    drawSnowfall(seasonProgress);
  }
  
  // === ATMOSPHERIC PARTICLES ===
  if (environment.humidity > 60) drawMistLayers();
  drawDustMotes(seasonProgress);
  
  // === LEAF PARTICLES ===
  drawEnhancedLeafDrops(season, seasonProgress);
  
  // === POST-PROCESSING ===
  if (tree.health < 40) drawVignetteStress();
  if (tree.health <= 0) drawDeathOverlay();
  
  // === BLOOM EFFECT (subtle) ===
  if (HDR.bloomEnabled && renderer.sunIntensity > 0.5) {
    applyBloomEffect();
  }
}

// ============================================================
// ATMOSPHERIC SKY SYSTEM
// ============================================================

function drawAtmosphericSky(dayOfYear, season, seasonProgress) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  
  const dayProgress = (dayOfYear % 1);
  const sunHeight = Math.sin(dayProgress * Math.PI);
  
  // Get season-specific sky colors
  const seasonDef = SEASON_DEFINITIONS[season.name.toUpperCase()];
  const skyTop = seasonDef?.sky?.topHSL || [210, 60, 70];
  const skyMid = seasonDef?.sky?.midHSL || [200, 50, 80];
  const skyBot = seasonDef?.sky?.horizonHSL || [30, 50, 85];
  
  // Adjust for time of day
  const timeAdjust = sunHeight;
  const nightDarken = Math.max(0, 1 - sunHeight * 2);
  
  // Create atmospheric gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, h * 0.85);
  
  // Zenith (top)
  const topL = skyTop[2] - nightDarken * 50;
  gradient.addColorStop(0, `hsl(${skyTop[0]}, ${skyTop[1]}%, ${Math.max(5, topL)}%)`);
  
  // Mid sky
  const midL = skyMid[2] - nightDarken * 40;
  gradient.addColorStop(0.4, `hsl(${skyMid[0]}, ${skyMid[1]}%, ${Math.max(10, midL)}%)`);
  
  // Horizon glow (sunrise/sunset colors)
  if (sunHeight < 0.4 && sunHeight > 0) {
    const horizonHue = sunHeight < 0.2 ? 15 : 35; // More orange at low sun
    const horizonSat = 70 + (0.4 - sunHeight) * 50;
    const horizonLight = 60 + sunHeight * 30;
    gradient.addColorStop(0.7, `hsl(${horizonHue}, ${horizonSat}%, ${horizonLight}%)`);
  }
  
  // Horizon
  const botL = skyBot[2] - nightDarken * 30;
  gradient.addColorStop(1, `hsl(${skyBot[0]}, ${skyBot[1]}%, ${Math.max(15, botL)}%)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  
  // Add subtle noise texture for realism
  drawSkyNoise(0.02);
}

function drawSkyNoise(intensity) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  
  // Use perlin noise for organic sky texture
  for (let y = 0; y < h * 0.7; y += 20) {
    for (let x = 0; x < w; x += 20) {
      const noise = perlin2D(x * 0.005, y * 0.005 + renderer.time * 0.01);
      const alpha = noise * intensity * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(alpha)})`;
      ctx.fillRect(x, y, 20, 20);
    }
  }
}

function drawStars(fadeAmount) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  
  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 - fadeAmount * 2})`;
  
  // Fixed star positions based on seed
  const starSeed = 42;
  for (let i = 0; i < 150; i++) {
    const sx = ((starSeed * i * 1.618) % 1) * w;
    const sy = ((starSeed * i * 2.718) % 1) * 300;
    const size = ((starSeed * i * 3.14) % 1) * 2 + 0.5;
    const twinkle = Math.sin(renderer.time * 2 + i) * 0.3 + 0.7;
    
    ctx.globalAlpha = twinkle * (1 - fadeAmount * 3);
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// CELESTIAL BODIES - HYPERREALISTIC
// ============================================================

function drawRealisticSun(dayOfYear) {
  const ctx = renderer.ctx;
  const sunX = renderer.sunPosition.x;
  const sunY = renderer.sunPosition.y;
  const intensity = renderer.sunIntensity;
  
  if (intensity < 0.02) return;
  
  const sunSize = 45 + intensity * 15;
  
  // Outer corona (largest glow)
  const corona = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunSize * 8);
  corona.addColorStop(0, `rgba(255, 220, 150, ${intensity * 0.15})`);
  corona.addColorStop(0.3, `rgba(255, 180, 100, ${intensity * 0.08})`);
  corona.addColorStop(0.6, `rgba(255, 150, 50, ${intensity * 0.03})`);
  corona.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunSize * 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner glow
  const innerGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunSize * 2);
  innerGlow.addColorStop(0, `rgba(255, 255, 220, ${intensity * 0.6})`);
  innerGlow.addColorStop(0.5, `rgba(255, 200, 100, ${intensity * 0.3})`);
  innerGlow.addColorStop(1, 'rgba(255, 150, 50, 0)');
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunSize * 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Sun disc with limb darkening
  const disc = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunSize);
  disc.addColorStop(0, `rgba(255, 255, 240, ${Math.min(1, intensity + 0.2)})`);
  disc.addColorStop(0.7, `rgba(255, 230, 180, ${intensity})`);
  disc.addColorStop(0.9, `rgba(255, 180, 100, ${intensity * 0.9})`);
  disc.addColorStop(1, `rgba(255, 140, 60, ${intensity * 0.7})`);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
  ctx.fill();
}

function drawRealisticMoon(dayOfYear) {
  const ctx = renderer.ctx;
  const dayProgress = (dayOfYear % 1);
  
  // Moon is opposite to sun
  const moonX = renderer.width - renderer.sunPosition.x;
  const moonY = 120 + Math.sin((1 - dayProgress) * Math.PI) * -80;
  const moonVisibility = Math.max(0, 1 - renderer.sunIntensity * 3);
  
  if (moonVisibility < 0.1) return;
  
  const moonSize = 35;
  const moonPhase = (dayOfYear / 29.5) % 1; // Lunar cycle
  
  // Moon glow
  const glow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonSize * 3);
  glow.addColorStop(0, `rgba(200, 210, 230, ${moonVisibility * 0.2})`);
  glow.addColorStop(0.5, `rgba(180, 190, 210, ${moonVisibility * 0.1})`);
  glow.addColorStop(1, 'rgba(150, 160, 180, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonSize * 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Moon disc
  ctx.fillStyle = `rgba(230, 235, 245, ${moonVisibility * 0.9})`;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonSize, 0, Math.PI * 2);
  ctx.fill();
  
  // Crater details
  ctx.fillStyle = `rgba(200, 205, 215, ${moonVisibility * 0.5})`;
  const craters = [[0.2, -0.3, 0.15], [-0.3, 0.2, 0.12], [0.1, 0.25, 0.1], [-0.15, -0.2, 0.08]];
  for (const [cx, cy, cr] of craters) {
    ctx.beginPath();
    ctx.arc(moonX + cx * moonSize, moonY + cy * moonSize, cr * moonSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGodRays(dayOfYear) {
  const ctx = renderer.ctx;
  const sunX = renderer.sunPosition.x;
  const sunY = renderer.sunPosition.y;
  const intensity = renderer.sunIntensity;
  
  if (intensity < 0.3) return;
  
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  
  const rayCount = 12;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + renderer.time * 0.02;
    const rayLength = 400 + Math.sin(angle * 3 + renderer.time) * 100;
    const rayWidth = 30 + Math.sin(angle * 5) * 15;
    
    const grad = ctx.createLinearGradient(
      sunX, sunY,
      sunX + Math.cos(angle) * rayLength,
      sunY + Math.sin(angle) * rayLength
    );
    grad.addColorStop(0, `rgba(255, 240, 200, ${intensity * 0.08})`);
    grad.addColorStop(0.5, `rgba(255, 220, 150, ${intensity * 0.03})`);
    grad.addColorStop(1, 'rgba(255, 200, 100, 0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(
      sunX + Math.cos(angle - 0.1) * rayLength,
      sunY + Math.sin(angle - 0.1) * rayLength
    );
    ctx.lineTo(
      sunX + Math.cos(angle + 0.1) * rayLength,
      sunY + Math.sin(angle + 0.1) * rayLength
    );
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.restore();
}

// ============================================================
// VOLUMETRIC CLOUDS
// ============================================================

function drawVolumetricClouds(seasonProgress, season) {
  const w = renderer.width;
  
  const cloudCount = 6;
  const baseY = 80;
  
  for (let i = 0; i < cloudCount; i++) {
    const x = ((i * 280 + seasonProgress * 50 + renderer.time * 5) % (w + 400)) - 200;
    const y = baseY + Math.sin(i * 1.5 + renderer.time * 0.1) * 30;
    const scale = 0.8 + Math.sin(i * 0.7) * 0.4;
    
    drawCloudFormation(x, y, scale, season);
  }
}

function drawCloudFormation(x, y, scale, season) {
  const ctx = renderer.ctx;
  
  // Base shadow
  ctx.fillStyle = 'rgba(150, 160, 180, 0.08)';
  drawCloudBlob(x + 10, y + 15, scale * 0.9);
  
  // Main cloud body with gradient
  const isWinter = season === SEASONS.WINTER;
  const cloudColor = isWinter ? 'rgba(220, 225, 235, 0.4)' : 'rgba(255, 255, 255, 0.35)';
  const highlightColor = isWinter ? 'rgba(240, 245, 255, 0.5)' : 'rgba(255, 255, 255, 0.5)';
  
  ctx.fillStyle = cloudColor;
  drawCloudBlob(x, y, scale);
  
  // Highlight on top
  ctx.fillStyle = highlightColor;
  drawCloudBlob(x - 20 * scale, y - 15 * scale, scale * 0.5);
}

function drawCloudBlob(x, y, scale) {
  const ctx = renderer.ctx;
  const baseSize = 60 * scale;
  
  ctx.beginPath();
  ctx.arc(x, y, baseSize, 0, Math.PI * 2);
  ctx.arc(x + baseSize * 0.7, y + baseSize * 0.1, baseSize * 0.75, 0, Math.PI * 2);
  ctx.arc(x - baseSize * 0.6, y + baseSize * 0.15, baseSize * 0.65, 0, Math.PI * 2);
  ctx.arc(x + baseSize * 0.3, y - baseSize * 0.3, baseSize * 0.55, 0, Math.PI * 2);
  ctx.arc(x - baseSize * 0.2, y - baseSize * 0.25, baseSize * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawStormSystem(seasonProgress) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  
  // Dark storm layer
  const stormGrad = ctx.createLinearGradient(0, 0, 0, 350);
  stormGrad.addColorStop(0, 'rgba(40, 45, 60, 0.85)');
  stormGrad.addColorStop(0.5, 'rgba(60, 65, 80, 0.7)');
  stormGrad.addColorStop(1, 'rgba(80, 85, 100, 0.4)');
  ctx.fillStyle = stormGrad;
  ctx.fillRect(0, 0, w, 350);
  
  // Turbulent cloud masses
  for (let i = 0; i < 15; i++) {
    const x = ((i * 130 + seasonProgress * 300 + renderer.time * 20) % (w + 300)) - 150;
    const y = 60 + Math.sin(i * 0.4 + renderer.time * 0.3) * 50;
    const size = 70 + Math.sin(i * 0.8) * 30;
    
    const turbulence = Math.sin(renderer.time * 2 + i) * 0.1;
    ctx.fillStyle = `rgba(50, 55, 70, ${0.25 + turbulence})`;
    drawCloudBlob(x, y, size / 60);
  }
}

function drawLightning() {
  const ctx = renderer.ctx;
  const w = renderer.width;
  
  const startX = random(100, w - 100);
  const startY = 50;
  
  ctx.strokeStyle = 'rgba(200, 220, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(150, 180, 255, 1)';
  ctx.shadowBlur = 20;
  
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  
  let x = startX;
  let y = startY;
  
  while (y < 400) {
    x += random(-30, 30);
    y += random(20, 50);
    ctx.lineTo(x, y);
    
    // Branch
    if (random() < 0.3) {
      const branchX = x + random(-50, 50);
      const branchY = y + random(30, 60);
      ctx.lineTo(branchX, branchY);
      ctx.moveTo(x, y);
    }
  }
  
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Flash
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 0, w, renderer.height);
}

// ============================================================
// TERRAIN & GROUND - HYPERREALISTIC
// ============================================================

function drawDistantHills(season) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const groundY = 850;
  
  const hillColors = {
    [SEASONS.SPRING.name]: ['rgba(100, 150, 80, 0.4)', 'rgba(80, 130, 60, 0.3)'],
    [SEASONS.SUMMER.name]: ['rgba(60, 120, 50, 0.4)', 'rgba(50, 100, 40, 0.3)'],
    [SEASONS.AUTUMN.name]: ['rgba(140, 100, 60, 0.4)', 'rgba(120, 80, 50, 0.3)'],
    [SEASONS.WINTER.name]: ['rgba(180, 190, 200, 0.4)', 'rgba(160, 170, 180, 0.3)']
  };
  
  const colors = hillColors[season.name] || hillColors[SEASONS.SUMMER.name];
  
  // Far hills
  ctx.fillStyle = colors[1];
  ctx.beginPath();
  ctx.moveTo(0, groundY - 80);
  for (let x = 0; x <= w; x += 20) {
    const noise = perlin2D(x * 0.003, 0) * 40;
    ctx.lineTo(x, groundY - 60 + noise);
  }
  ctx.lineTo(w, groundY);
  ctx.lineTo(0, groundY);
  ctx.closePath();
  ctx.fill();
  
  // Near hills
  ctx.fillStyle = colors[0];
  ctx.beginPath();
  ctx.moveTo(0, groundY - 30);
  for (let x = 0; x <= w; x += 15) {
    const noise = perlin2D(x * 0.005 + 100, 0) * 25;
    ctx.lineTo(x, groundY - 20 + noise);
  }
  ctx.lineTo(w, groundY);
  ctx.lineTo(0, groundY);
  ctx.closePath();
  ctx.fill();
}

function drawRealisticGround(season, seasonProgress) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  const groundY = 850;
  
  // Get season-specific colors
  const seasonDef = SEASON_DEFINITIONS[season.name.toUpperCase()];
  const grassHSL = seasonDef?.grass?.baseHSL || [120, 50, 40];
  const soilHSL = seasonDef?.soil?.baseHSL || [25, 60, 25];
  
  // === GRASS LAYER ===
  const grassGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 60);
  grassGrad.addColorStop(0, `hsl(${grassHSL[0]}, ${grassHSL[1]}%, ${grassHSL[2]}%)`);
  grassGrad.addColorStop(0.5, `hsl(${grassHSL[0]}, ${grassHSL[1] - 5}%, ${grassHSL[2] - 8}%)`);
  grassGrad.addColorStop(1, `hsl(${soilHSL[0]}, ${soilHSL[1]}%, ${soilHSL[2]}%)`);
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, groundY, w, 60);
  
  // Grass texture using noise
  drawGrassBlades(groundY, season);
  
  // === SOIL LAYER ===
  const soilGrad = ctx.createLinearGradient(0, groundY + 60, 0, h);
  soilGrad.addColorStop(0, `hsl(${soilHSL[0]}, ${soilHSL[1]}%, ${soilHSL[2]}%)`);
  soilGrad.addColorStop(0.3, `hsl(${soilHSL[0]}, ${soilHSL[1] - 10}%, ${soilHSL[2] - 10}%)`);
  soilGrad.addColorStop(1, `hsl(${soilHSL[0]}, ${soilHSL[1] - 20}%, ${soilHSL[2] - 20}%)`);
  ctx.fillStyle = soilGrad;
  ctx.fillRect(0, groundY + 60, w, h - groundY - 60);
  
  // Soil texture
  drawSoilTexture(groundY + 60, h);
  
  // === MOISTURE EFFECTS ===
  if (environment.water > 70) {
    drawWetGround(groundY);
  } else if (environment.water < 30) {
    drawDryGround(groundY);
  }
}

function drawGrassBlades(groundY, season) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const centerX = w / 2;
  
  if (season === SEASONS.WINTER) return; // No grass blades in winter
  
  // Multi-tone grass colors for depth
  const grassColors = season === SEASONS.AUTUMN 
    ? ['#8B7355', '#7A6548', '#9C8462', '#6B5B4A']
    : ['#3D5C3A', '#4A6B47', '#2F4F2F', '#557B53', '#486B45'];
  
  // Draw grass in layers: back to front for depth
  for (let layer = 0; layer < 3; layer++) {
    const layerAlpha = 0.5 + layer * 0.25;
    const layerSpacing = 12 - layer * 3;
    const layerHeight = (8 + layer * 5);
    
    for (let x = 0; x < w; x += layerSpacing) {
      // Vary density - less grass near tree trunk (shade)
      const distFromCenter = Math.abs(x - centerX);
      if (distFromCenter < 60 && random() > 0.4) continue;
      
      const noise = perlin2D(x * 0.05, renderer.time * 0.5 + layer);
      const height = layerHeight + random(0, 12);
      const sway = noise * 6 + environment.windSpeed * 0.4 * (layer + 1);
      
      // Pick varied grass color
      const colorIdx = Math.floor(random(0, grassColors.length));
      ctx.strokeStyle = grassColors[colorIdx];
      ctx.lineWidth = 0.8 + layer * 0.3;
      ctx.globalAlpha = layerAlpha;
      
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      
      // More natural curve with slight random tilt
      const tilt = random(-2, 2);
      ctx.bezierCurveTo(
        x + tilt, groundY - height * 0.33,
        x + sway * 0.5 + tilt, groundY - height * 0.66,
        x + sway, groundY - height
      );
      ctx.stroke();
    }
  }
  
  ctx.globalAlpha = 1;
  
  // Leaf litter around tree base (autumn especially)
  if (season === SEASONS.AUTUMN || season === SEASONS.WINTER) {
    drawLeafLitter(ctx, centerX, groundY, season);
  }
}

function drawLeafLitter(ctx, centerX, groundY, season) {
  const numLeaves = season === SEASONS.AUTUMN ? 40 : 25;
  const leafColors = season === SEASONS.AUTUMN 
    ? ['#B8860B', '#CD853F', '#D2691E', '#8B4513', '#A0522D', '#DAA520']
    : ['#8B7355', '#6B5B4A', '#5C4A3A'];
  
  ctx.save();
  
  for (let i = 0; i < numLeaves; i++) {
    // Cluster leaves around tree base
    const angle = random(0, Math.PI * 2);
    const dist = random(25, 120);
    const x = centerX + Math.cos(angle) * dist;
    const y = groundY + random(2, 18);
    
    const leafSize = random(4, 10);
    const leafColor = leafColors[Math.floor(random(0, leafColors.length))];
    const rotation = random(0, Math.PI * 2);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(1, 0.5); // Flatten for ground perspective
    
    // Simple leaf shape
    ctx.fillStyle = leafColor;
    ctx.globalAlpha = random(0.4, 0.8);
    ctx.beginPath();
    ctx.ellipse(0, 0, leafSize, leafSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Leaf vein
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.3;
    ctx.beginPath();
    ctx.moveTo(-leafSize * 0.8, 0);
    ctx.lineTo(leafSize * 0.8, 0);
    ctx.stroke();
    
    ctx.restore();
  }
  
  ctx.restore();
}

function drawSoilTexture(startY, endY) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  
  // Rock and pebble details
  ctx.fillStyle = 'rgba(80, 60, 40, 0.15)';
  for (let i = 0; i < 50; i++) {
    const x = (i * 37.7) % w;
    const y = startY + ((i * 23.3) % (endY - startY - 20));
    const size = 3 + (i % 5);
    
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.6, (i * 0.5) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Soil layers (stratigraphy)
  for (let y = startY + 40; y < endY; y += 60) {
    ctx.fillStyle = `rgba(60, 45, 30, ${0.05 + random(0, 0.05)})`;
    ctx.fillRect(0, y, w, 3);
  }
}

function drawWetGround(groundY) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  
  // Wet sheen
  ctx.fillStyle = 'rgba(100, 130, 160, 0.12)';
  ctx.fillRect(0, groundY, w, 40);
  
  // Puddles
  for (let i = 0; i < 5; i++) {
    const x = 200 + i * 250;
    const y = groundY + 25;
    const rx = 30 + random(0, 20);
    const ry = 8 + random(0, 5);
    
    ctx.fillStyle = 'rgba(100, 140, 180, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Reflection highlight
    ctx.fillStyle = 'rgba(200, 220, 255, 0.15)';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.3, y - ry * 0.3, rx * 0.4, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDryGround(groundY) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  
  // Parched appearance
  ctx.fillStyle = 'rgba(180, 160, 120, 0.15)';
  ctx.fillRect(0, groundY, w, 50);
  
  // Cracks
  ctx.strokeStyle = 'rgba(100, 80, 50, 0.25)';
  ctx.lineWidth = 1.5;
  
  for (let i = 0; i < 30; i++) {
    const x = random(0, w);
    const y = groundY + random(5, 45);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    let cx = x, cy = y;
    for (let j = 0; j < 4; j++) {
      cx += random(-20, 20);
      cy += random(5, 15);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
}

// ============================================================
// ROOT SYSTEM - HYPERREALISTIC
// ============================================================

function drawDetailedRoots() {
  const ctx = renderer.ctx;
  const centerX = renderer.width / 2;
  const groundY = 850;
  
  const isAlive = tree.health > 0;
  
  // Root colors - warm earthy browns with variation
  const rootHue = isAlive ? 22 + random(-4, 4) : 0;
  const rootSat = isAlive ? 55 : 0;
  const rootLight = isAlive ? 22 : 45;
  
  // === SURFACE ROOTS (emerging from ground) ===
  drawSurfaceRoots(ctx, centerX, groundY, rootHue, rootSat, rootLight);
  
  // === TAP ROOT (main vertical) ===
  if (tree.rootMesh.length > 0) {
    const tapRoot = tree.rootMesh.find(r => r.type === 'tap');
    if (tapRoot) {
      const rootDepth = tapRoot.depth * 120;
      drawMajorRoot(ctx, centerX, groundY + 25, centerX + random(-8, 8), groundY + 25 + rootDepth, 
                    tapRoot.thickness * 1.3, rootHue, rootSat, rootLight, 'tap');
    }
  }
  
  // === LATERAL ROOTS ===
  for (const root of tree.rootMesh) {
    if (root.type === 'lateral') {
      const angle = root.angle;
      const spread = root.spread * 130;
      const depth = root.depth * 100;
      
      // Root emerges from trunk base then curves outward and down
      const emergeX = centerX + Math.cos(angle) * 15;
      const emergeY = groundY + 20;
      
      // First segment curves outward
      const midX = centerX + Math.cos(angle) * spread * 0.5;
      const midY = groundY + 35 + depth * 0.3;
      
      // End point deeper in soil
      const endX = centerX + Math.cos(angle) * spread;
      const endY = groundY + 40 + depth;
      
      drawMajorRoot(ctx, emergeX, emergeY, endX, endY, root.thickness, rootHue, rootSat, rootLight, 'lateral', angle);
      
      // Secondary roots branching off
      const numSecondary = 2 + Math.floor(root.thickness / 25);
      for (let i = 0; i < numSecondary; i++) {
        const t = 0.3 + (i / numSecondary) * 0.5;
        const branchX = lerp(emergeX, endX, t);
        const branchY = lerp(emergeY, endY, t);
        const branchAngle = angle + random(-0.6, 0.6);
        const branchLen = random(25, 50);
        const branchEndX = branchX + Math.cos(branchAngle) * branchLen;
        const branchEndY = branchY + random(15, 35);
        
        drawSecondaryRoot(ctx, branchX, branchY, branchEndX, branchEndY, root.thickness * 0.4, rootHue, rootSat, rootLight);
      }
      
      // Fine roots (tertiary) at the end
      drawFineRoots(ctx, endX, endY, root.thickness * 0.2, rootHue, rootSat, rootLight, angle);
    }
  }
}

// Surface roots that are partially visible above ground
function drawSurfaceRoots(ctx, centerX, groundY, hue, sat, light) {
  // Calculate trunk width same as in drawHyperrealisticTree
  const trunkWidth = tree.dbh * 500;
  
  ctx.save();
  
  // Major visible surface roots (buttress-style)
  const numSurface = 4 + Math.floor(random(0, 3));
  for (let i = 0; i < numSurface; i++) {
    const angle = (i / numSurface) * Math.PI - Math.PI / 2 + random(-0.15, 0.15);
    const rootLen = random(40, 80);
    
    const startX = centerX + Math.cos(angle) * trunkWidth * 0.4;
    const startY = groundY + 2;
    const endX = startX + Math.cos(angle) * rootLen;
    const endY = groundY + random(8, 20);
    
    // Root thickness tapers
    const startThick = random(6, 12);
    const endThick = random(2, 4);
    
    // Create organic root shape
    ctx.beginPath();
    
    // Top edge of root
    const midX = (startX + endX) / 2;
    const midY = groundY - random(2, 6); // Rises slightly above ground
    
    ctx.moveTo(startX, startY - startThick / 2);
    ctx.quadraticCurveTo(midX, midY - startThick / 3, endX, endY - endThick / 2);
    
    // Bottom edge
    ctx.lineTo(endX, endY + endThick / 2);
    ctx.quadraticCurveTo(midX, midY + startThick / 2, startX, startY + startThick / 2);
    ctx.closePath();
    
    // 3D shading gradient
    const rootGrad = ctx.createLinearGradient(startX, midY - startThick, startX, midY + startThick);
    rootGrad.addColorStop(0, `hsl(${hue}, ${sat}%, ${light + 8}%)`);
    rootGrad.addColorStop(0.4, `hsl(${hue}, ${sat + 5}%, ${light + 12}%)`);
    rootGrad.addColorStop(0.6, `hsl(${hue}, ${sat}%, ${light}%)`);
    rootGrad.addColorStop(1, `hsl(${hue}, ${sat - 5}%, ${light - 10}%)`);
    
    ctx.fillStyle = rootGrad;
    ctx.fill();
    
    // Texture lines
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light - 15}%, 0.25)`;
    ctx.lineWidth = 0.5;
    for (let j = 0; j < 3; j++) {
      const t = 0.2 + j * 0.25;
      const lx = lerp(startX, endX, t);
      const ly = lerp(startY, endY, t);
      ctx.beginPath();
      ctx.moveTo(lx, ly - startThick * (1 - t) * 0.4);
      ctx.lineTo(lx + random(-3, 3), ly + startThick * (1 - t) * 0.4);
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

// Major root (tap or lateral main) with full detail
function drawMajorRoot(ctx, x1, y1, x2, y2, thickness, hue, sat, light, type, angle = Math.PI/2) {
  ctx.save();
  
  const len = Math.hypot(x2 - x1, y2 - y1);
  const segments = Math.max(8, Math.floor(len / 15));
  const baseWidth = Math.max(3, thickness / 12);
  
  // Generate organic path points
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    
    // Base position with bezier-like curve
    let px, py;
    if (type === 'tap') {
      // Tap root: mostly vertical with slight meander
      px = lerp(x1, x2, t) + fbm(t * 4, 100, 2) * 8 * t;
      py = lerp(y1, y2, t);
    } else {
      // Lateral: curves outward then down
      const curveT = Math.sin(t * Math.PI * 0.5);
      px = lerp(x1, x2, curveT + (1 - curveT) * t * 0.3);
      py = lerp(y1, y2, t * t); // Quadratic depth curve
      px += fbm(t * 3, angle * 10, 2) * 6;
    }
    
    // Width tapers along length
    const w = baseWidth * (1 - t * 0.7);
    
    points.push({ x: px, y: py, w });
  }
  
  // Draw root as filled shape with left/right edges
  ctx.beginPath();
  
  // Left edge (going down)
  ctx.moveTo(points[0].x - points[0].w, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const wobble = fbm(i * 0.3, 0, 2) * 1.5;
    ctx.lineTo(points[i].x - points[i].w + wobble, points[i].y);
  }
  
  // Right edge (going up)
  for (let i = points.length - 1; i >= 0; i--) {
    const wobble = fbm(i * 0.3, 50, 2) * 1.5;
    ctx.lineTo(points[i].x + points[i].w + wobble, points[i].y);
  }
  
  ctx.closePath();
  
  // Gradient for 3D cylindrical look
  const rootGrad = ctx.createLinearGradient(x1 - baseWidth, 0, x1 + baseWidth, 0);
  rootGrad.addColorStop(0, `hsl(${hue}, ${sat - 5}%, ${light - 12}%)`);
  rootGrad.addColorStop(0.3, `hsl(${hue}, ${sat}%, ${light + 5}%)`);
  rootGrad.addColorStop(0.5, `hsl(${hue}, ${sat + 5}%, ${light + 10}%)`);
  rootGrad.addColorStop(0.7, `hsl(${hue}, ${sat}%, ${light + 3}%)`);
  rootGrad.addColorStop(1, `hsl(${hue}, ${sat - 5}%, ${light - 15}%)`);
  
  ctx.fillStyle = rootGrad;
  ctx.fill();
  
  // Texture: horizontal rings
  ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light - 18}%, 0.2)`;
  ctx.lineWidth = 0.5;
  for (let i = 2; i < points.length - 1; i += 2) {
    ctx.beginPath();
    ctx.moveTo(points[i].x - points[i].w * 0.8, points[i].y);
    ctx.lineTo(points[i].x + points[i].w * 0.8, points[i].y + random(-1, 1));
    ctx.stroke();
  }
  
  ctx.restore();
}

// Secondary roots (smaller branches)
function drawSecondaryRoot(ctx, x1, y1, x2, y2, thickness, hue, sat, light) {
  ctx.save();
  
  const width = Math.max(1.5, thickness / 18);
  
  // Organic curve with control points
  const cx1 = x1 + (x2 - x1) * 0.3 + random(-8, 8);
  const cy1 = y1 + (y2 - y1) * 0.3 + random(-4, 4);
  const cx2 = x1 + (x2 - x1) * 0.7 + random(-8, 8);
  const cy2 = y1 + (y2 - y1) * 0.7 + random(-4, 4);
  
  // Draw as tapered stroke
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light + 5}%, 0.85)`);
  gradient.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${light}%, 0.7)`);
  gradient.addColorStop(1, `hsla(${hue}, ${sat - 5}%, ${light - 8}%, 0.5)`);
  
  ctx.strokeStyle = gradient;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
  ctx.stroke();
  
  // Taper by drawing again with thinner line
  ctx.lineWidth = width * 0.5;
  ctx.beginPath();
  const midX = (cx1 + cx2) / 2;
  const midY = (cy1 + cy2) / 2;
  ctx.moveTo(midX, midY);
  ctx.quadraticCurveTo(cx2, cy2, x2, y2);
  ctx.stroke();
  
  ctx.restore();
}

// Fine root hairs at root tips
function drawFineRoots(ctx, x, y, thickness, hue, sat, light, baseAngle) {
  ctx.save();
  
  const numFine = 8 + Math.floor(random(0, 6));
  
  ctx.lineCap = 'round';
  
  for (let i = 0; i < numFine; i++) {
    const angle = baseAngle + random(-1.2, 1.2);
    const len = random(12, 35);
    const endX = x + Math.cos(angle) * len;
    const endY = y + Math.abs(Math.sin(angle)) * len * 0.6 + random(5, 15);
    
    // Very thin, semi-transparent
    ctx.strokeStyle = `hsla(${hue}, ${sat - 10}%, ${light + random(-5, 5)}%, ${random(0.2, 0.45)})`;
    ctx.lineWidth = random(0.5, 1.5);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Slight curve
    const cx = (x + endX) / 2 + random(-5, 5);
    const cy = (y + endY) / 2 + random(-3, 3);
    ctx.quadraticCurveTo(cx, cy, endX, endY);
    ctx.stroke();
    
    // Root hairs on fine roots
    if (random() > 0.5) {
      const hairT = random(0.4, 0.8);
      const hairX = lerp(x, endX, hairT);
      const hairY = lerp(y, endY, hairT);
      const hairLen = random(4, 10);
      const hairAngle = angle + random(-0.8, 0.8);
      
      ctx.strokeStyle = `hsla(${hue}, ${sat - 15}%, ${light}%, 0.2)`;
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(hairX, hairY);
      ctx.lineTo(hairX + Math.cos(hairAngle) * hairLen, hairY + Math.sin(hairAngle) * hairLen);
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

// ============================================================
// HYPERREALISTIC TREE RENDERING
// ============================================================

function drawHyperrealisticTree(season, seasonProgress) {
  const ctx = renderer.ctx;
  const centerX = renderer.width / 2;
  const groundY = 850;
  
  const treePixelHeight = tree.height * 100;
  const treePixelDBH = tree.dbh * 500;
  
  // === TRUNK WITH BARK TEXTURE ===
  drawRealisticTrunk(centerX, groundY, treePixelHeight, treePixelDBH);
  
  // === BRANCHES WITH NATURAL FORM ===
  drawRealisticBranches(centerX, groundY - treePixelHeight);
  
  // === FOLIAGE SYSTEM ===
  if (tree.foliageOpacity > 0.01) {
    drawLayeredFoliage(centerX, groundY - treePixelHeight, season, seasonProgress);
  }
  
  // === INDIVIDUAL LEAVES ===
  if (tree.leaves && tree.leaves.length > 0) {
    drawIndividualLeaves(centerX, groundY - treePixelHeight, season, seasonProgress);
  }
}

function drawRealisticTrunk(x, groundY, height, width) {
  const ctx = renderer.ctx;
  const isAlive = tree.health > 0;
  
  // Natural bark colors - warmer browns with subtle variation
  const trunkHue = isAlive ? 22 + random(-3, 3) : 0;
  const trunkSat = isAlive ? 45 + random(-5, 5) : 0;
  const trunkLight = isAlive ? 18 + (tree.health / 100) * 8 : 35;
  
  // Create trunk shape with realistic taper (more pronounced at base)
  const topWidth = width * tree.trunkTaper * 0.4;
  const flareWidth = width * 1.3; // Root flare at base
  
  ctx.save();
  
  // Ground shadow (elliptical, soft)
  const shadowGrad = ctx.createRadialGradient(x + 20, groundY + 8, 0, x + 20, groundY + 8, width * 0.8);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
  shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.12)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(x + 20, groundY + 8, width * 0.8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Main trunk gradient - 3D cylindrical shading
  const trunkGrad = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
  trunkGrad.addColorStop(0, `hsl(${trunkHue}, ${trunkSat}%, ${trunkLight - 8}%)`);
  trunkGrad.addColorStop(0.15, `hsl(${trunkHue}, ${trunkSat}%, ${trunkLight - 3}%)`);
  trunkGrad.addColorStop(0.35, `hsl(${trunkHue}, ${trunkSat + 5}%, ${trunkLight + 6}%)`);
  trunkGrad.addColorStop(0.5, `hsl(${trunkHue}, ${trunkSat + 8}%, ${trunkLight + 10}%)`);
  trunkGrad.addColorStop(0.65, `hsl(${trunkHue}, ${trunkSat + 5}%, ${trunkLight + 5}%)`);
  trunkGrad.addColorStop(0.85, `hsl(${trunkHue}, ${trunkSat}%, ${trunkLight - 4}%)`);
  trunkGrad.addColorStop(1, `hsl(${trunkHue}, ${trunkSat - 5}%, ${trunkLight - 12}%)`);
  
  ctx.fillStyle = trunkGrad;
  
  // Organic trunk shape with root flare and natural irregularities
  ctx.beginPath();
  
  // Start at bottom left with root flare
  ctx.moveTo(x - flareWidth / 2, groundY);
  
  // Left edge - buttress roots curve into trunk
  const leftPoints = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = groundY - height * t;
    
    // Width varies: flare at base, taper toward top, with organic wobble
    let w;
    if (t < 0.08) {
      // Root flare zone - exponential taper from flare to trunk
      const flareT = t / 0.08;
      w = lerp(flareWidth / 2, width / 2, Math.pow(flareT, 0.5));
    } else {
      // Main trunk with gradual taper
      const trunkT = (t - 0.08) / 0.92;
      w = lerp(width / 2, topWidth / 2, Math.pow(trunkT, 0.7));
    }
    
    // Organic wobble using noise
    const wobble = fbm(t * 3, 0.5, 3) * 4 * (1 - t * 0.5);
    // Occasional bulges
    const bulge = Math.sin(t * 15 + 2) * 2 * (1 - t);
    
    leftPoints.push({ x: x - w + wobble + bulge, y });
  }
  
  leftPoints.forEach(p => ctx.lineTo(p.x, p.y));
  
  // Right edge - mirror with different noise
  for (let i = 20; i >= 0; i--) {
    const t = i / 20;
    const y = groundY - height * t;
    
    let w;
    if (t < 0.08) {
      const flareT = t / 0.08;
      w = lerp(flareWidth / 2, width / 2, Math.pow(flareT, 0.5));
    } else {
      const trunkT = (t - 0.08) / 0.92;
      w = lerp(width / 2, topWidth / 2, Math.pow(trunkT, 0.7));
    }
    
    const wobble = fbm(t * 3, 5.5, 3) * 4 * (1 - t * 0.5);
    const bulge = Math.sin(t * 15 + 5) * 2 * (1 - t);
    
    ctx.lineTo(x + w + wobble + bulge, y);
  }
  
  ctx.closePath();
  ctx.fill();
  
  // === REALISTIC BARK TEXTURE ===
  drawBarkTexture(ctx, x, groundY, height, width, trunkHue, trunkSat, trunkLight);
  
  // === MOSS / LICHEN on shaded side (if healthy and humid) ===
  if (isAlive && environment.humidity > 50 && tree.age > 5) {
    drawTrunkMoss(ctx, x, groundY, height, width);
  }
  
  ctx.restore();
}

function drawBarkTexture(ctx, x, groundY, height, width, hue, sat, light) {
  const topWidth = width * tree.trunkTaper * 0.4;
  
  // === DEEP BARK FISSURES (major vertical cracks) ===
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  
  // Deep shadows in bark crevices
  const numFissures = Math.floor(6 + tree.age * 0.3);
  for (let i = 0; i < numFissures; i++) {
    const xPos = (i / numFissures - 0.5) * width * 0.85;
    const fissureDepth = random(0.3, 0.95);
    const endY = groundY - height * fissureDepth;
    
    // Dark shadow line (depth)
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light - 25}%, ${random(0.25, 0.45)})`;
    ctx.lineWidth = random(2, 4);
    ctx.beginPath();
    ctx.moveTo(x + xPos, groundY);
    
    let cy = groundY;
    while (cy > endY) {
      const step = random(8, 18);
      cy -= step;
      // Natural meander using multi-octave noise
      const wobble = fbm(cy * 0.02, i * 7, 2) * 6;
      const drift = Math.sin(cy * 0.015 + i) * 3;
      ctx.lineTo(x + xPos + wobble + drift, cy);
    }
    ctx.stroke();
    
    // Highlight edge (ridge catching light)
    ctx.strokeStyle = `hsla(${hue}, ${sat - 5}%, ${light + 8}%, 0.15)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + xPos + 2, groundY);
    cy = groundY;
    while (cy > endY) {
      const step = random(8, 18);
      cy -= step;
      const wobble = fbm(cy * 0.02, i * 7, 2) * 6 + 2;
      const drift = Math.sin(cy * 0.015 + i) * 3;
      ctx.lineTo(x + xPos + wobble + drift, cy);
    }
    ctx.stroke();
  }
  ctx.restore();
  
  // === BARK PLATES (blocky patterns between fissures) ===
  ctx.globalAlpha = 0.12;
  for (let row = 0; row < 8; row++) {
    const rowY = groundY - (height / 8) * row;
    const rowHeight = height / 8;
    const t = row / 8;
    const rowWidth = lerp(width, topWidth, t) * 0.42;
    
    for (let col = 0; col < 4 + Math.floor(random(0, 2)); col++) {
      const plateX = x + (col / 4 - 0.5) * rowWidth * 2;
      const plateW = random(8, 18);
      const plateH = random(12, 25);
      
      // Subtle plate shading
      const plateGrad = ctx.createLinearGradient(plateX - plateW/2, rowY, plateX + plateW/2, rowY);
      plateGrad.addColorStop(0, `hsl(${hue}, ${sat}%, ${light - 8}%)`);
      plateGrad.addColorStop(0.5, `hsl(${hue}, ${sat + 3}%, ${light + 3}%)`);
      plateGrad.addColorStop(1, `hsl(${hue}, ${sat}%, ${light - 5}%)`);
      
      ctx.fillStyle = plateGrad;
      ctx.fillRect(plateX - plateW/2 + random(-3, 3), rowY - plateH + random(-5, 5), plateW, plateH);
    }
  }
  ctx.globalAlpha = 1;
  
  // === HORIZONTAL GROWTH RINGS / PEELING BARK ===
  ctx.strokeStyle = `hsla(${hue}, ${sat - 5}%, ${light - 12}%, 0.18)`;
  for (let y = groundY - 15; y > groundY - height * 0.9; y -= random(20, 40)) {
    const t = (groundY - y) / height;
    const w = lerp(width, topWidth, t) * 0.38;
    
    ctx.lineWidth = random(0.5, 1.5);
    ctx.beginPath();
    // Curved horizontal line following trunk contour
    ctx.moveTo(x - w, y + random(-2, 2));
    ctx.quadraticCurveTo(x, y + random(-4, 0), x + w, y + random(-2, 2));
    ctx.stroke();
  }
  
  // === KNOTS AND BRANCH SCARS ===
  const numKnots = Math.min(2 + Math.floor(tree.age / 8), 5);
  for (let i = 0; i < numKnots; i++) {
    const knotY = groundY - height * random(0.15, 0.75);
    const knotX = x + random(-width * 0.25, width * 0.25);
    const knotSize = random(6, 14);
    
    // Knot shadow (depth)
    const knotGrad = ctx.createRadialGradient(knotX, knotY, 0, knotX, knotY, knotSize);
    knotGrad.addColorStop(0, `hsla(${hue}, ${sat - 10}%, ${light - 30}%, 0.5)`);
    knotGrad.addColorStop(0.5, `hsla(${hue}, ${sat - 5}%, ${light - 15}%, 0.3)`);
    knotGrad.addColorStop(0.8, `hsla(${hue}, ${sat}%, ${light}%, 0.1)`);
    knotGrad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = knotGrad;
    ctx.beginPath();
    ctx.ellipse(knotX, knotY, knotSize, knotSize * 0.65, random(-0.3, 0.3), 0, Math.PI * 2);
    ctx.fill();
    
    // Growth rings around knot
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light - 18}%, 0.2)`;
    ctx.lineWidth = 0.5;
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(knotX, knotY, knotSize + ring * 3, (knotSize + ring * 3) * 0.65, random(-0.2, 0.2), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  
  // === FINE TEXTURE (stippling for roughness) ===
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 120; i++) {
    const dotY = groundY - random(0, height);
    const t = (groundY - dotY) / height;
    const w = lerp(width, topWidth, t) * 0.4;
    const dotX = x + random(-w, w);
    const dotSize = random(1, 2.5);
    
    ctx.fillStyle = random() > 0.5 
      ? `hsl(${hue}, ${sat}%, ${light - 15}%)`
      : `hsl(${hue}, ${sat}%, ${light + 5}%)`;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Moss/lichen on shaded trunk side
function drawTrunkMoss(ctx, x, groundY, height, width) {
  ctx.save();
  const mossAlpha = Math.min((environment.humidity - 50) / 50, 0.4) * 0.6;
  
  // Moss mainly on left/shaded side
  for (let i = 0; i < 25; i++) {
    const mossY = groundY - height * random(0.1, 0.5);
    const mossX = x - width * random(0.15, 0.35);
    const mossW = random(8, 20);
    const mossH = random(4, 10);
    
    const mossGrad = ctx.createRadialGradient(mossX, mossY, 0, mossX, mossY, mossW);
    mossGrad.addColorStop(0, `hsla(110, 35%, 28%, ${mossAlpha})`);
    mossGrad.addColorStop(0.6, `hsla(105, 30%, 22%, ${mossAlpha * 0.6})`);
    mossGrad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = mossGrad;
    ctx.beginPath();
    ctx.ellipse(mossX, mossY, mossW, mossH, random(-0.3, 0.3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRealisticBranches(centerX, canopyY) {
  const ctx = renderer.ctx;
  const isAlive = tree.health > 0;
  
  // Sort branches by depth (draw deeper/thicker branches first)
  const sortedBranches = [...tree.branches].sort((a, b) => a.depth - b.depth);
  
  for (const branch of sortedBranches) {
    // Transform branch coordinates
    const scale = 25;
    const x1 = centerX + branch.x1 * scale;
    const y1 = canopyY + branch.y1 * scale;
    const x2 = centerX + branch.x2 * scale;
    const y2 = canopyY + branch.y2 * scale;
    
    // Branch color based on depth and health - warmer wood tones
    const baseHue = isAlive ? 22 + branch.depth * 2 : 0;
    const baseSat = isAlive ? 45 - branch.depth * 3 : 0;
    const baseLight = isAlive ? (25 + branch.depth * 4) : (50 + branch.depth * 3);
    
    // Add wind sway - more natural movement
    const swayFreq = 1.8 + branch.depth * 0.3;
    const sway = Math.sin(renderer.time * swayFreq + branch.swayPhase) * branch.swayAmount * environment.windSpeed;
    const secondarySway = Math.sin(renderer.time * swayFreq * 1.7 + branch.swayPhase * 2) * branch.swayAmount * environment.windSpeed * 0.3;
    const swayX2 = x2 + (sway + secondarySway) * 18;
    const swayY2 = y2 + Math.abs(sway) * 4;
    
    const branchLen = Math.hypot(swayX2 - x1, swayY2 - y1);
    const branchAngle = Math.atan2(swayY2 - y1, swayX2 - x1);
    
    // Calculate thickness (tapers along length)
    const startThickness = Math.max(2, branch.thickness / 10);
    const endThickness = Math.max(0.8, startThickness * 0.35);
    
    ctx.save();
    
    // Draw branch as filled shape for better 3D effect
    if (startThickness > 3) {
      // Thick branches get full treatment
      const segments = Math.max(6, Math.floor(branchLen / 12));
      const points = [];
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        // Bezier curve path
        const px = x1 + (swayX2 - x1) * t + fbm(t * 3, branch.swayPhase, 2) * 4 * (1 - Math.abs(t - 0.5) * 2);
        const py = y1 + (swayY2 - y1) * t + Math.sin(t * Math.PI) * (y1 > swayY2 ? 8 : -8);
        const thick = lerp(startThickness, endThickness, t);
        points.push({ x: px, y: py, t: thick });
      }
      
      // Draw branch shape
      ctx.beginPath();
      
      // Left edge (perpendicular to branch direction)
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const nextP = points[Math.min(i + 1, points.length - 1)];
        const angle = Math.atan2(nextP.y - p.y, nextP.x - p.x) + Math.PI / 2;
        const lx = p.x + Math.cos(angle) * p.t / 2;
        const ly = p.y + Math.sin(angle) * p.t / 2;
        if (i === 0) ctx.moveTo(lx, ly);
        else ctx.lineTo(lx, ly);
      }
      
      // Right edge (reverse)
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        const nextP = points[Math.max(i - 1, 0)];
        const angle = Math.atan2(p.y - nextP.y, p.x - nextP.x) + Math.PI / 2;
        const rx = p.x + Math.cos(angle) * p.t / 2;
        const ry = p.y + Math.sin(angle) * p.t / 2;
        ctx.lineTo(rx, ry);
      }
      
      ctx.closePath();
      
      // 3D cylindrical gradient
      const gradAngle = branchAngle + Math.PI / 2;
      const branchGrad = ctx.createLinearGradient(
        x1 - Math.cos(gradAngle) * startThickness,
        y1 - Math.sin(gradAngle) * startThickness,
        x1 + Math.cos(gradAngle) * startThickness,
        y1 + Math.sin(gradAngle) * startThickness
      );
      branchGrad.addColorStop(0, `hsl(${baseHue}, ${baseSat}%, ${baseLight - 12}%)`);
      branchGrad.addColorStop(0.25, `hsl(${baseHue}, ${baseSat}%, ${baseLight + 3}%)`);
      branchGrad.addColorStop(0.5, `hsl(${baseHue}, ${baseSat + 5}%, ${baseLight + 8}%)`);
      branchGrad.addColorStop(0.75, `hsl(${baseHue}, ${baseSat}%, ${baseLight}%)`);
      branchGrad.addColorStop(1, `hsl(${baseHue}, ${baseSat - 5}%, ${baseLight - 15}%)`);
      
      ctx.fillStyle = branchGrad;
      ctx.fill();
      
      // Wood grain texture (subtle lines along branch)
      ctx.strokeStyle = `hsla(${baseHue}, ${baseSat}%, ${baseLight - 20}%, 0.15)`;
      ctx.lineWidth = 0.5;
      for (let g = 0; g < 2; g++) {
        const gOffset = (g / 2 - 0.25) * startThickness * 0.6;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const nextP = points[Math.min(i + 1, points.length - 1)];
          const angle = Math.atan2(nextP.y - p.y, nextP.x - p.x) + Math.PI / 2;
          const gx = p.x + Math.cos(angle) * gOffset;
          const gy = p.y + Math.sin(angle) * gOffset;
          if (i === 0) ctx.moveTo(gx, gy);
          else ctx.lineTo(gx, gy);
        }
        ctx.stroke();
      }
      
    } else {
      // Thin branches - simple tapered stroke
      const branchGrad = ctx.createLinearGradient(x1, y1, swayX2, swayY2);
      branchGrad.addColorStop(0, `hsl(${baseHue}, ${baseSat}%, ${baseLight}%)`);
      branchGrad.addColorStop(0.5, `hsl(${baseHue}, ${baseSat}%, ${baseLight + 5}%)`);
      branchGrad.addColorStop(1, `hsl(${baseHue}, ${baseSat - 5}%, ${baseLight + 8}%)`);
      
      ctx.strokeStyle = branchGrad;
      ctx.lineWidth = startThickness;
      ctx.lineCap = 'round';
      
      const midX = (x1 + swayX2) / 2 + random(-4, 4);
      const midY = (y1 + swayY2) / 2 + random(-4, 4);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(midX, midY, swayX2, swayY2);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

function drawLayeredFoliage(centerX, canopyY, season, seasonProgress) {
  const ctx = renderer.ctx;
  const canopyRadius = 60 + tree.height * 20;
  
  // Get leaf colors for season
  const leafColors = getSeasonLeafColors(season, seasonProgress);
  
  ctx.save();
  ctx.globalAlpha = tree.foliageOpacity;
  
  // Back layer (darker, shadow) - with inner shadow
  drawFoliageLayer(ctx, centerX, canopyY + 5, canopyRadius, leafColors.shadow, 0.72, -18);
  
  // Middle layers - main mass
  drawFoliageLayer(ctx, centerX, canopyY - 10, canopyRadius * 0.88, leafColors.mid, 0.88, 0);
  
  // Front layer (highlighted) - catches light
  drawFoliageLayer(ctx, centerX, canopyY - 28, canopyRadius * 0.72, leafColors.highlight, 1.0, 12);
  
  // Edge detail - small leaf clusters around perimeter for natural silhouette
  if (tree.foliageOpacity > 0.3 && season !== SEASONS.WINTER) {
    drawFoliageEdgeDetail(ctx, centerX, canopyY - 10, canopyRadius * 0.9, leafColors);
  }
  
  // Dappled light effect
  if (renderer.sunIntensity > 0.3) {
    drawDappledLight(ctx, centerX, canopyY, canopyRadius);
  }
  
  ctx.restore();
}

// Adds small leaf clusters around the foliage edge for natural silhouette
function drawFoliageEdgeDetail(ctx, x, y, radius, colors) {
  const numDetails = 28 + Math.floor(tree.height * 3);
  
  ctx.save();
  
  for (let i = 0; i < numDetails; i++) {
    const angle = (i / numDetails) * Math.PI * 2 + fbm(i * 0.5, 0, 2) * 0.3;
    const dist = radius * (0.85 + fbm(i * 0.3, 10, 2) * 0.25);
    
    const cx = x + Math.cos(angle) * dist;
    const cy = y + Math.sin(angle) * dist * 0.75; // Squash vertically
    
    // Sway with wind
    const sway = Math.sin(renderer.time * 1.8 + i * 0.5) * environment.windSpeed * 3;
    
    // Small leaf cluster
    const clusterSize = 8 + fbm(i, 5, 2) * 6;
    
    // Vary color based on position (top = highlight, bottom = shadow)
    const isTop = Math.sin(angle) < -0.3;
    const color = isTop ? colors.highlight : (Math.sin(angle) > 0.3 ? colors.shadow : colors.mid);
    
    ctx.fillStyle = color;
    ctx.beginPath();
    
    // Organic mini-blob
    const pts = 6;
    for (let j = 0; j <= pts; j++) {
      const a = (j / pts) * Math.PI * 2;
      const r = clusterSize * (0.8 + Math.sin(a * 3 + i) * 0.2);
      const px = cx + sway + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r * 0.7;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.restore();
}

function drawFoliageLayer(ctx, x, y, radius, color, scale, offsetX) {
  // More natural cluster arrangement - asymmetric and varied
  const clusters = [
    { ox: 0, oy: -0.1, s: 1.0, squash: 0.85 },
    { ox: -0.45, oy: 0.15, s: 0.72, squash: 0.9 },
    { ox: 0.42, oy: 0.18, s: 0.68, squash: 0.88 },
    { ox: -0.22, oy: -0.38, s: 0.58, squash: 0.92 },
    { ox: 0.25, oy: -0.4, s: 0.55, squash: 0.85 },
    { ox: 0.05, oy: 0.42, s: 0.52, squash: 0.95 },
    { ox: -0.5, oy: -0.15, s: 0.45, squash: 0.88 },
    { ox: 0.52, oy: -0.12, s: 0.48, squash: 0.9 },
    { ox: -0.15, oy: 0.48, s: 0.4, squash: 0.87 },
    { ox: 0.18, oy: 0.45, s: 0.42, squash: 0.9 }
  ];
  
  for (const cluster of clusters) {
    const cx = x + offsetX + cluster.ox * radius * scale;
    const cy = y + cluster.oy * radius * scale;
    const cr = radius * cluster.s * scale;
    
    // Natural wind sway - different frequencies for organic movement
    const swayX = Math.sin(renderer.time * 1.5 + cluster.ox * 4) * 4 * environment.windSpeed;
    const swayY = Math.sin(renderer.time * 2.1 + cluster.oy * 3) * 2 * environment.windSpeed;
    
    // Draw organic blob instead of perfect circle
    drawOrganicBlob(ctx, cx + swayX, cy + swayY, cr, cr * cluster.squash, color, cluster.ox);
  }
}

// Draw organic, non-circular blob for natural foliage look
function drawOrganicBlob(ctx, x, y, radiusX, radiusY, color, seed) {
  ctx.fillStyle = color;
  ctx.beginPath();
  
  const points = 16;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    // Vary radius with noise for organic edge
    const noiseVal = fbm(Math.cos(angle) * 2 + seed * 10, Math.sin(angle) * 2, 2);
    const radiusVar = 1 + noiseVal * 0.18;
    
    const px = x + Math.cos(angle) * radiusX * radiusVar;
    const py = y + Math.sin(angle) * radiusY * radiusVar;
    
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      // Smooth curve through points
      const prevAngle = ((i - 1) / points) * Math.PI * 2;
      const prevNoiseVal = fbm(Math.cos(prevAngle) * 2 + seed * 10, Math.sin(prevAngle) * 2, 2);
      const prevRadiusVar = 1 + prevNoiseVal * 0.18;
      const prevX = x + Math.cos(prevAngle) * radiusX * prevRadiusVar;
      const prevY = y + Math.sin(prevAngle) * radiusY * prevRadiusVar;
      
      const cpX = (prevX + px) / 2 + (Math.cos(angle - 0.3) * radiusX * 0.1);
      const cpY = (prevY + py) / 2 + (Math.sin(angle - 0.3) * radiusY * 0.1);
      
      ctx.quadraticCurveTo(cpX, cpY, px, py);
    }
  }
  
  ctx.closePath();
  ctx.fill();
  
  // Add subtle inner texture for depth
  const innerGrad = ctx.createRadialGradient(x - radiusX * 0.2, y - radiusY * 0.2, 0, x, y, Math.max(radiusX, radiusY));
  innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  innerGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
  
  ctx.fillStyle = innerGrad;
  ctx.fill();
}

function getSeasonLeafColors(season, progress) {
  const colors = {
    shadow: 'rgba(30, 80, 30, 0.8)',
    mid: 'rgba(50, 130, 50, 0.85)',
    highlight: 'rgba(80, 170, 80, 0.9)'
  };
  
  switch (season) {
    case SEASONS.SPRING:
      const springT = progress;
      colors.shadow = `rgba(${40 + springT * 20}, ${100 + springT * 40}, ${40}, 0.8)`;
      colors.mid = `rgba(${60 + springT * 30}, ${140 + springT * 40}, ${50}, 0.85)`;
      colors.highlight = `rgba(${90 + springT * 40}, ${180 + springT * 30}, ${70}, 0.9)`;
      break;
      
    case SEASONS.SUMMER:
      colors.shadow = 'rgba(25, 90, 35, 0.85)';
      colors.mid = 'rgba(40, 140, 50, 0.9)';
      colors.highlight = 'rgba(70, 180, 80, 0.95)';
      break;
      
    case SEASONS.AUTUMN:
      if (progress < 0.33) {
        const t = progress / 0.33;
        colors.shadow = `rgba(${80 + t * 80}, ${80 - t * 20}, ${30}, 0.8)`;
        colors.mid = `rgba(${150 + t * 60}, ${120 - t * 30}, ${40}, 0.85)`;
        colors.highlight = `rgba(${200 + t * 40}, ${150 - t * 30}, ${50}, 0.9)`;
      } else if (progress < 0.66) {
        const t = (progress - 0.33) / 0.33;
        colors.shadow = `rgba(${160 + t * 30}, ${60 - t * 20}, ${30}, 0.8)`;
        colors.mid = `rgba(${210 + t * 20}, ${90 - t * 30}, ${40}, 0.85)`;
        colors.highlight = `rgba(${240}, ${120 - t * 40}, ${50}, 0.9)`;
      } else {
        const t = (progress - 0.66) / 0.34;
        colors.shadow = `rgba(${140 - t * 40}, ${40 - t * 10}, ${25}, 0.7)`;
        colors.mid = `rgba(${180 - t * 50}, ${60 - t * 20}, ${35}, 0.75)`;
        colors.highlight = `rgba(${200 - t * 60}, ${80 - t * 30}, ${45}, 0.8)`;
      }
      break;
      
    case SEASONS.WINTER:
      colors.shadow = 'rgba(100, 95, 90, 0.3)';
      colors.mid = 'rgba(140, 135, 130, 0.35)';
      colors.highlight = 'rgba(180, 175, 170, 0.4)';
      break;
  }
  
  return colors;
}

function drawDappledLight(ctx, x, y, radius) {
  ctx.fillStyle = 'rgba(255, 255, 200, 0.08)';
  
  for (let i = 0; i < 20; i++) {
    const angle = random(0, Math.PI * 2);
    const dist = random(0, radius * 0.8);
    const spotX = x + Math.cos(angle) * dist;
    const spotY = y + Math.sin(angle) * dist * 0.6;
    const spotSize = random(5, 15);
    
    // Animate slightly
    const flicker = Math.sin(renderer.time * 3 + i) * 0.5 + 0.5;
    ctx.globalAlpha = flicker * 0.15;
    
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawIndividualLeaves(centerX, canopyY, season, seasonProgress) {
  const ctx = renderer.ctx;
  const leafColors = getSeasonLeafColors(season, seasonProgress);
  
  for (const leaf of tree.leaves) {
    if (!leaf.attached) continue;
    
    const scale = 25;
    const x = centerX + leaf.x * scale;
    const y = canopyY + leaf.y * scale;
    
    // Wind sway
    const sway = Math.sin(renderer.time * 2 + leaf.swayPhase) * leaf.swayAmount * environment.windSpeed;
    
    ctx.save();
    ctx.translate(x + sway, y);
    ctx.rotate(leaf.rotation + Math.sin(renderer.time + leaf.swayPhase) * 0.1);
    ctx.globalAlpha = leaf.opacity * tree.foliageOpacity;
    
    // Leaf shape
    ctx.fillStyle = leafColors.mid;
    ctx.beginPath();
    ctx.ellipse(0, 0, leaf.size * 3, leaf.size * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Leaf vein
    ctx.strokeStyle = leafColors.shadow;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-leaf.size * 2, 0);
    ctx.lineTo(leaf.size * 2, 0);
    ctx.stroke();
    
    ctx.restore();
  }
}

// ============================================================
// WEATHER EFFECTS - HYPERREALISTIC
// ============================================================

function drawRealisticRain(seasonProgress) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  
  const rainIntensity = environment.storm ? 1.0 : 0.5;
  const dropCount = Math.floor(300 * rainIntensity);
  
  for (let i = 0; i < dropCount; i++) {
    const seed = i * 17.31;
    const x = (seed * 7.91 + seasonProgress * 100 + renderer.time * 200) % (w + 50) - 25;
    const y = (seed * 11.37 + seasonProgress * 200 + renderer.time * 800) % (h + 100) - 50;
    
    const speed = 15 + (seed % 10);
    const length = speed * 1.5;
    const thickness = 1 + (seed % 2) * 0.5;
    const alpha = 0.3 + (seed % 5) * 0.05;
    
    // Rain drop with gradient
    const rainGrad = ctx.createLinearGradient(x, y, x - 2, y + length);
    rainGrad.addColorStop(0, `rgba(180, 200, 230, 0)`);
    rainGrad.addColorStop(0.3, `rgba(180, 200, 230, ${alpha})`);
    rainGrad.addColorStop(1, `rgba(150, 180, 220, ${alpha * 0.5})`);
    
    ctx.strokeStyle = rainGrad;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y + length);
    ctx.stroke();
  }
  
  // Splash effects on ground
  drawRainSplashes(seasonProgress);
}

function drawRainSplashes(seasonProgress) {
  const ctx = renderer.ctx;
  const groundY = 850;
  const w = renderer.width;
  
  for (let i = 0; i < 30; i++) {
    const seed = i * 23.17;
    const x = (seed * 13.7 + renderer.time * 50) % w;
    const splashPhase = (renderer.time * 5 + i) % 1;
    
    if (splashPhase < 0.3) {
      const size = splashPhase * 15;
      const alpha = (0.3 - splashPhase) * 2;
      
      ctx.strokeStyle = `rgba(200, 220, 255, ${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, groundY, size, 0, Math.PI, true);
      ctx.stroke();
    }
  }
}

function drawSnowfall(seasonProgress) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  
  for (let i = 0; i < 200; i++) {
    const seed = i * 13.71;
    const x = (seed * 5.43 + Math.sin(renderer.time + i * 0.1) * 30 + renderer.time * 20) % (w + 100) - 50;
    const y = (seed * 7.89 + renderer.time * 50) % (h + 50) - 25;
    
    const size = 2 + (seed % 4);
    const alpha = 0.6 + (seed % 3) * 0.1;
    
    // Snowflake with glow
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.shadowColor = 'rgba(200, 220, 255, 0.5)';
    ctx.shadowBlur = 3;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.shadowBlur = 0;
  
  // Snow accumulation on ground
  const groundY = 850;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillRect(0, groundY - 5, w, 20);
}

function drawMistLayers() {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  const groundY = 850;
  
  const mistIntensity = (environment.humidity - 60) / 40;
  
  for (let layer = 0; layer < 4; layer++) {
    const layerY = groundY - 200 + layer * 80;
    const alpha = 0.08 * mistIntensity * (1 - layer * 0.2);
    
    // Animated mist using noise
    for (let x = 0; x < w; x += 30) {
      const noise = perlin2D(x * 0.003 + renderer.time * 0.1, layer * 10) * 30;
      const mistHeight = 60 + noise;
      
      ctx.fillStyle = `rgba(200, 210, 230, ${alpha})`;
      ctx.fillRect(x, layerY - mistHeight / 2, 30, mistHeight);
    }
  }
}

function drawDustMotes(seasonProgress) {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  
  if (renderer.sunIntensity < 0.3) return;
  
  ctx.fillStyle = `rgba(255, 240, 200, ${renderer.sunIntensity * 0.4})`;
  
  for (let i = 0; i < 50; i++) {
    const seed = i * 31.17;
    const x = (seed * 7.13 + renderer.time * 10 + Math.sin(renderer.time * 2 + i) * 20) % w;
    const y = 200 + (seed * 3.71) % 500;
    const size = 1 + (seed % 2);
    
    const twinkle = Math.sin(renderer.time * 4 + i * 0.5) * 0.5 + 0.5;
    ctx.globalAlpha = twinkle * renderer.sunIntensity * 0.5;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.globalAlpha = 1;
}

function drawAtmosphericPollution() {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  
  // Yellowish haze
  const pollutionGrad = ctx.createLinearGradient(0, 0, 0, h);
  pollutionGrad.addColorStop(0, 'rgba(180, 170, 140, 0.1)');
  pollutionGrad.addColorStop(0.5, 'rgba(160, 150, 120, 0.15)');
  pollutionGrad.addColorStop(1, 'rgba(140, 130, 100, 0.1)');
  
  ctx.fillStyle = pollutionGrad;
  ctx.fillRect(0, 0, w, h);
}

// ============================================================
// LEAF PARTICLES - ENHANCED
// ============================================================

function drawEnhancedLeafDrops(season, seasonProgress) {
  const ctx = renderer.ctx;
  
  for (const leaf of tree.leafDrops) {
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.rotation);
    ctx.globalAlpha = leaf.opacity;
    
    // Leaf shape with gradient
    const leafGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, leaf.size * 1.5);
    leafGrad.addColorStop(0, leaf.color);
    leafGrad.addColorStop(1, adjustColor(leaf.color, -30));
    
    ctx.fillStyle = leafGrad;
    
    // More realistic leaf shape
    ctx.beginPath();
    ctx.moveTo(0, -leaf.size);
    ctx.bezierCurveTo(
      leaf.size * 0.8, -leaf.size * 0.5,
      leaf.size * 0.8, leaf.size * 0.5,
      0, leaf.size
    );
    ctx.bezierCurveTo(
      -leaf.size * 0.8, leaf.size * 0.5,
      -leaf.size * 0.8, -leaf.size * 0.5,
      0, -leaf.size
    );
    ctx.fill();
    
    // Vein
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -leaf.size * 0.8);
    ctx.lineTo(0, leaf.size * 0.8);
    ctx.stroke();
    
    ctx.restore();
  }
}

// ============================================================
// POST-PROCESSING & EFFECTS
// ============================================================

function drawVignetteStress() {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  
  const intensity = Math.max(0, 1 - tree.health / 40);
  
  // Red-tinted vignette
  const vignette = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.5, `rgba(100, 20, 0, ${intensity * 0.1})`);
  vignette.addColorStop(1, `rgba(80, 0, 0, ${intensity * 0.4})`);
  
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawDeathOverlay() {
  const ctx = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;
  
  // Desaturated overlay
  ctx.fillStyle = 'rgba(30, 30, 40, 0.6)';
  ctx.fillRect(0, 0, w, h);
  
  // Death message
  ctx.font = 'bold 72px Georgia, serif';
  ctx.fillStyle = '#8B0000';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText('☠️', w / 2, h / 2 - 50);
  
  ctx.font = '28px Georgia, serif';
  ctx.fillStyle = '#d4d4d4';
  ctx.fillText(`The tree lived for ${tree.age.toFixed(1)} years`, w / 2, h / 2 + 20);
  
  ctx.font = '18px Georgia, serif';
  ctx.fillStyle = '#a0a0a0';
  ctx.fillText(`Absorbed ${tree.co2Absorbed.toFixed(1)} kg CO₂ | Produced ${tree.o2Produced.toFixed(1)} kg O₂`, w / 2, h / 2 + 55);
  
  ctx.shadowBlur = 0;
}

function applyBloomEffect() {
  // Simplified bloom - add glow to bright areas
  const ctx = renderer.ctx;
  const sunX = renderer.sunPosition.x;
  const sunY = renderer.sunPosition.y;
  
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
  const bloom = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 200);
  bloom.addColorStop(0, `rgba(255, 240, 200, ${HDR.bloomIntensity * renderer.sunIntensity})`);
  bloom.addColorStop(0.5, `rgba(255, 220, 150, ${HDR.bloomIntensity * renderer.sunIntensity * 0.3})`);
  bloom.addColorStop(1, 'rgba(255, 200, 100, 0)');
  
  ctx.fillStyle = bloom;
  ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
  
  ctx.restore();
}

// ============================================================
// UTILITIES
// ============================================================

function adjustColor(color, amount) {
  // Simple color adjustment
  if (color.startsWith('#')) {
    const r = Math.max(0, Math.min(255, parseInt(color.slice(1, 3), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(color.slice(3, 5), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(color.slice(5, 7), 16) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }
  return color;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
