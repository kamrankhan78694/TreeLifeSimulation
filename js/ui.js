// ============================================================
// UI & DISPLAY MANAGEMENT - HYPERREALISTIC EDITION
// ============================================================

let healthHistory = [];
let environmentHistory = {
  temperature: [],
  water: [],
  stress: []
};
let biomassHistory = {
  trunk: [],
  branches: [],
  leaves: [],
  roots: []
};
let uiAnimationFrame = 0;

/**
 * Initialize UI event listeners with enhanced feedback
 */
function initUI() {
  // Environment sliders with live preview
  const sliders = ['sun', 'water', 'temp', 'soil', 'wind', 'humidity', 'speed'];
  sliders.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function() {
        updateUIDisplay();
        updateSliderVisualFeedback(id, this.value);
      });

      // Initialize fill visuals on load
      updateSliderVisualFeedback(id, el.value);
    }
  });
  
  // Control buttons with animations
  const toggleBtn = document.getElementById('toggle');
  const resetBtn = document.getElementById('reset');
  const applyBtn = document.getElementById('applySeed');
  const reloadConfigBtn = document.getElementById('reloadConfig');
  const applyConfigBtn = document.getElementById('applyConfig');
  
  if (toggleBtn) toggleBtn.addEventListener('click', togglePause);
  if (resetBtn) resetBtn.addEventListener('click', resetSimulation);
  if (applyBtn) applyBtn.addEventListener('click', applySeed);

  if (reloadConfigBtn) {
    reloadConfigBtn.addEventListener('click', async function() {
      if (typeof window.reloadVariablesConfigFromFile !== 'function') {
        showToast('❌ Config loader not available');
        return;
      }
      const vars = await window.reloadVariablesConfigFromFile();
      const textarea = document.getElementById('configTextarea');
      if (textarea && window.variablesConfigSourceText) {
        textarea.value = window.variablesConfigSourceText;
      }
      if (vars) {
        resetSimulation();
        showToast('✅ Reloaded variables.JSON');
      } else {
        showToast('ℹ️ variables.JSON not found');
      }
    });
  }

  if (applyConfigBtn) {
    applyConfigBtn.addEventListener('click', function() {
      const textarea = document.getElementById('configTextarea');
      if (!textarea) return;
      let obj;
      try {
        obj = JSON.parse(textarea.value || '{}');
      } catch (e) {
        showToast('❌ Invalid JSON');
        return;
      }
      if (typeof window.applyVariablesConfigFromObject === 'function') {
        window.applyVariablesConfigFromObject(obj);
        resetSimulation();
        showToast('✅ Config applied');
      } else {
        showToast('❌ Config apply not available');
      }
    });
  }
  
  // Stressor checkboxes with visual feedback
  const stressors = ['disease', 'pests', 'storm', 'pollution'];
  stressors.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', function() {
        updateEnvironmentFromUI();
        animateStressorChange(id, this.checked);
      });
    }
  });
  
  // Species selector if present
  const speciesSelect = document.getElementById('species');
  if (speciesSelect) {
    speciesSelect.addEventListener('change', function() {
      if (tree && this.value && TREE_SPECIES[this.value]) {
        tree.species = this.value;
        updateSpeciesDisplay();
        resetSimulation();
      }
    });
  }

  // CSV export button
  const exportCSVBtn = document.getElementById('exportCSV');
  if (exportCSVBtn) {
    exportCSVBtn.addEventListener('click', exportSimulationCSV);
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Initialize displays
  updateUIDisplay();
  initializeAdvancedGraphs();
}

/**
 * Handle keyboard shortcuts for power users
 */
function handleKeyboardShortcuts(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  switch(e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      togglePause();
      break;
    case 'r':
      if (!e.ctrlKey && !e.metaKey) resetSimulation();
      break;
    case '1': case '2': case '3': case '4': case '5':
      const speedSlider = document.getElementById('speed');
      if (speedSlider) {
        speedSlider.value = e.key;
        updateUIDisplay();
      }
      break;
  }
}

/**
 * Update slider visual feedback with color gradients
 */
function updateSliderVisualFeedback(id, value) {
  const slider = document.getElementById(id);
  if (!slider) return;
  
  const percent = ((value - slider.min) / (slider.max - slider.min)) * 100;
  
  let colorStart, colorEnd;
  switch(id) {
    case 'sun':
      colorStart = 'var(--color-border)';
      colorEnd = 'var(--color-warning)';
      break;
    case 'water':
      colorStart = 'var(--color-border)';
      colorEnd = 'var(--color-primary-hover)';
      break;
    case 'temp':
      colorStart = 'var(--color-primary)';
      colorEnd = 'var(--color-error)';
      break;
    case 'humidity':
      colorStart = 'var(--color-border)';
      colorEnd = 'var(--color-primary)';
      break;
    case 'soil':
      colorStart = 'var(--color-border)';
      colorEnd = 'var(--color-success)';
      break;
    case 'wind':
      colorStart = 'var(--color-border)';
      colorEnd = 'var(--color-text-muted)';
      break;
    default:
      colorStart = 'var(--color-border)';
      colorEnd = 'var(--color-primary)';
  }
  
  slider.style.background = `linear-gradient(to right, ${colorStart} 0%, ${colorEnd} ${percent}%, var(--color-border) ${percent}%, var(--color-border) 100%)`;
}

/**
 * Animate stressor checkbox changes
 */
function animateStressorChange(id, checked) {
  const input = document.getElementById(id);
  const label = input ? input.closest('label') : null;
  if (label) {
    label.style.transition = 'all 0.3s ease';
    label.style.transform = checked ? 'scale(1.05)' : 'scale(1)';
    label.style.borderColor = checked ? 'var(--color-error)' : '';
    setTimeout(() => {
      label.style.transform = 'scale(1)';
    }, 300);
  }
}

/**
 * Update slider value displays with enhanced formatting
 */
function updateUIDisplay() {
  const updates = {
    'sunVal': { id: 'sun', suffix: '%', icon: '☀️' },
    'waterVal': { id: 'water', suffix: '%', icon: '💧' },
    'tempVal': { id: 'temp', suffix: '°C', icon: '🌡️' },
    'soilVal': { id: 'soil', suffix: '%', icon: '🪴' },
    'windVal': { id: 'wind', suffix: '%', icon: '💨' },
    'humidityVal': { id: 'humidity', suffix: '%', icon: '💦' }
  };
  
  Object.entries(updates).forEach(([valId, config]) => {
    const valEl = document.getElementById(valId);
    const inputEl = document.getElementById(config.id);
    if (valEl && inputEl) {
      valEl.textContent = inputEl.value + config.suffix;
    }
  });
  
  const speedEl = document.getElementById('speed');
  const speedValEl = document.getElementById('speedVal');
  if (speedEl && speedValEl) {
    const speed = parseFloat(speedEl.value);
    speedValEl.textContent = speed.toFixed(1) + 'x';
  }
}

/**
 * Update readout display with comprehensive tree data
 */
function updateReadout() {
  if (!tree || !environment) return;
  
  const healthClass = getHealthClass(tree.health);
  
  // Core metrics
  const species = TREE_SPECIES[tree.species] || TREE_SPECIES.OAK;
  setReadoutValue('rSpecies', species.name);
  setReadoutValue('rYear', environment.year.toFixed(0));
  setReadoutValue('rSeason', getSeasonDisplay());
  setReadoutValue('rAge', formatAge(tree.age));
  setReadoutValue('rHealth', Math.ceil(tree.health), healthClass);
  setReadoutValue('rHeight', tree.height.toFixed(2) + ' m');
  setReadoutValue('rDBH', (tree.dbh * 100).toFixed(1) + ' cm');
  
  // Enhanced biomass display
  if (typeof tree.biomass === 'object') {
    const totalBiomass = tree.biomass.trunk + tree.biomass.branches + 
                         tree.biomass.leaves + tree.biomass.roots;
    setReadoutValue('rBiomass', totalBiomass.toFixed(1) + ' kg');
  } else {
    setReadoutValue('rBiomass', tree.biomass.toFixed(1) + ' kg');
  }
  
  // Status with detailed emoji
  const statusEl = document.getElementById('rStatus');
  if (statusEl) {
    statusEl.textContent = getDetailedStatusEmoji();
    statusEl.className = 'readout-value ' + healthClass;
  }
  
  // Metrics
  setReadoutValue('metricCO2', tree.co2Absorbed.toFixed(1) + ' kg');
  setReadoutValue('metricO2', tree.o2Produced.toFixed(1) + ' kg');
  
  // Advanced metrics if elements exist
  updateAdvancedMetrics();
  
  // Update environment history for graphs
  updateEnvironmentHistory();
}

/**
 * Set readout value safely
 */
function setReadoutValue(id, value, className) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
    if (className) el.className = 'readout-value ' + className;
  }
}

/**
 * Get enhanced season display with weather
 */
function getSeasonDisplay() {
  let display = environment.season.name;
  
  if (environment.weatherType) {
    const weatherIcons = {
      'CLEAR': '☀️',
      'CLOUDY': '☁️',
      'RAIN': '🌧️',
      'STORM': '⛈️',
      'SNOW': '❄️',
      'FOGGY': '🌫️',
      'DROUGHT': '🔥'
    };
    display += ' ' + (weatherIcons[environment.weatherType] || '');
  }
  
  return display;
}

/**
 * Format age with appropriate units
 */
function formatAge(age) {
  if (age < 1) {
    return Math.floor(age * 12) + ' months';
  } else if (age < 10) {
    return age.toFixed(1) + ' years';
  } else {
    return Math.floor(age) + ' years';
  }
}

/**
 * Get detailed status emoji based on tree state
 */
function getDetailedStatusEmoji() {
  if (tree.health <= 0) return '💀 Dead';
  if (tree.health < 10) return '🥀 Dying';
  if (tree.health < 25) return '😰 Critical';
  
  // Check phenology
  if (tree.dormant) return '😴 Dormant';
  if (tree.budBurst) return '🌱 Budding';
  if (tree.flowering) return '🌸 Flowering';
  if (tree.leafSenescence) return '🍂 Senescence';
  
  // Check stress
  const totalStress = (environment.disease ? 1 : 0) +
                      (environment.pests ? 1 : 0) +
                      (environment.storm ? 1 : 0) +
                      (environment.pollution ? 1 : 0);
  
  if (totalStress > 2) return '😫 Stressed';
  if (totalStress > 0) return '😟 Strained';
  
  // Check conditions
  if (tree.health > 90 && tree.vigor > 0.8) return '🌳 Thriving!';
  if (tree.health > 75) return '😊 Healthy';
  if (tree.health > 50) return '😐 Stable';
  return '😕 Struggling';
}

/**
 * Update advanced metrics display
 */
function updateAdvancedMetrics() {
  // Vigor
  if (tree.vigor !== undefined) {
    setReadoutValue('rVigor', (tree.vigor * 100).toFixed(0) + '%');
  }
  
  // Crown metrics
  if (tree.crownRadius !== undefined) {
    setReadoutValue('rCrown', (tree.crownRadius * 2).toFixed(1) + ' m');
  }
  
  // Leaf area index
  if (typeof tree.calculateLAI === 'function') {
    setReadoutValue('rLAI', tree.calculateLAI().toFixed(2));
  }
  
  // Carbon stored
  if (tree.carbonStored !== undefined) {
    setReadoutValue('rCarbon', tree.carbonStored.toFixed(1) + ' kg');
  }
  
  // Growth rings
  if (tree.growthRings !== undefined) {
    setReadoutValue('rRings', tree.growthRings.length);
  }
  
  // Water stress
  if (environment.waterStress !== undefined) {
    const stressLevel = environment.waterStress > 0.7 ? 'critical' :
                        environment.waterStress > 0.4 ? 'stressed' : 'healthy';
    setReadoutValue('rWaterStress', (environment.waterStress * 100).toFixed(0) + '%', stressLevel);
  }
}

/**
 * Update environment history for graphing
 */
function updateEnvironmentHistory() {
  const maxHistory = CONFIG?.MAX_HISTORY || 500;
  
  environmentHistory.temperature.push(environment.temperature);
  const waterValue = (typeof environment.waterAvailability === 'number')
    ? environment.waterAvailability
    : environment.water;
  const stressValue = (typeof environment.totalStress === 'number')
    ? environment.totalStress
    : (typeof calculateTotalStress === 'function' ? calculateTotalStress() : 0);
  
  environmentHistory.water.push(waterValue);
  environmentHistory.stress.push(stressValue);
  
  if (environmentHistory.temperature.length > maxHistory) {
    environmentHistory.temperature.shift();
    environmentHistory.water.shift();
    environmentHistory.stress.shift();
  }
}

/**
 * Get health color class
 */
function getHealthClass(health) {
  if (health <= 0) return 'dead';
  if (health < 20) return 'critical';
  if (health < 40) return 'stressed';
  if (health < 60) return 'recovering';
  if (health < 80) return 'stable';
  return 'healthy';
}

/**
 * Initialize advanced multi-line graphs
 */
function initializeAdvancedGraphs() {
  // Set up canvases for high-DPI displays
  const canvasIds = ['healthGraph', 'biomassGraph'];
  canvasIds.forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }
  });
}

/**
 * Draw health graph with multiple data series
 */
function drawHealthGraph() {
  const canvas = document.getElementById('healthGraph');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  
  // Clear with gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, 'rgba(20, 24, 41, 0.8)');
  bgGrad.addColorStop(1, 'rgba(10, 12, 20, 0.9)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);
  
  // Subtle grid
  ctx.strokeStyle = 'rgba(63, 81, 181, 0.08)';
  ctx.lineWidth = 1;
  
  // Horizontal grid lines with labels
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    
    // Grid labels
    ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText((100 - i * 25) + '%', 2, y + 10);
  }
  
  // No data message
  if (healthHistory.length < 2) {
    ctx.fillStyle = 'rgba(156, 163, 175, 0.6)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Collecting data...', w / 2, h / 2);
    return;
  }
  
  const maxHistory = CONFIG?.MAX_HISTORY || 500;
  const startIdx = Math.max(0, healthHistory.length - maxHistory);
  
  // Draw environment stress area (if available)
  if (environmentHistory.stress.length >= 2) {
    drawDataSeries(ctx, environmentHistory.stress, startIdx, w, h, {
      lineColor: 'rgba(239, 68, 68, 0.3)',
      fillColor: 'rgba(239, 68, 68, 0.05)',
      invert: true,
      maxValue: 1
    });
  }
  
  // Draw water availability (if available)
  if (environmentHistory.water.length >= 2) {
    drawDataSeries(ctx, environmentHistory.water, startIdx, w, h, {
      lineColor: 'rgba(59, 130, 246, 0.5)',
      fillColor: 'rgba(59, 130, 246, 0.08)',
      lineWidth: 1.5,
      maxValue: 100
    });
  }
  
  // Draw main health line
  drawDataSeries(ctx, healthHistory, startIdx, w, h, {
    lineColor: null, // Dynamic color
    fillColor: 'rgba(34, 197, 94, 0.15)',
    lineWidth: 2.5,
    glow: true,
    dynamicColor: true,
    maxValue: 100
  });
  
  // Current value indicator
  const currentHealth = healthHistory[healthHistory.length - 1];
  const currentY = h - (currentHealth / 100) * h;
  
  // Glowing dot at current position
  const dotColor = getHealthColor(currentHealth);
  ctx.beginPath();
  ctx.arc(w - 5, currentY, 4, 0, Math.PI * 2);
  ctx.fillStyle = dotColor;
  ctx.shadowColor = dotColor;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  
  // Current value label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(Math.round(currentHealth) + '%', w - 12, currentY + 4);
  
  // Legend
  drawGraphLegend(ctx, w, h);
}

/**
 * Draw a data series on the graph
 */
function drawDataSeries(ctx, data, startIdx, w, h, options) {
  const {
    lineColor,
    fillColor,
    lineWidth = 2,
    glow = false,
    dynamicColor = false,
    invert = false,
    maxValue = 100
  } = options;
  
  if (data.length < 2) return;
  
  const effectiveStart = Math.max(0, data.length - (data.length - startIdx));
  const dataLength = data.length - effectiveStart;
  
  ctx.beginPath();
  ctx.lineWidth = lineWidth;
  
  for (let i = effectiveStart; i < data.length; i++) {
    const x = ((i - effectiveStart) / (dataLength - 1)) * w;
    let value = data[i];
    if (invert) value = maxValue - value;
    const y = h - (value / maxValue) * h;
    
    if (dynamicColor) {
      ctx.strokeStyle = getHealthColor(data[i]);
    } else if (lineColor) {
      ctx.strokeStyle = lineColor;
    }
    
    if (glow) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 4;
    }
    
    if (i === effectiveStart) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  // Fill under curve
  if (fillColor) {
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
}

/**
 * Get color based on health value
 */
function getHealthColor(health) {
  if (health < 25) return '#ef4444';
  if (health < 50) return '#f59e0b';
  if (health < 75) return '#84cc16';
  return '#22c55e';
}

/**
 * Draw legend for the graph
 */
function drawGraphLegend(ctx, w, h) {
  const legendItems = [
    { color: '#22c55e', label: 'Health' },
    { color: 'rgba(59, 130, 246, 0.7)', label: 'Water' },
    { color: 'rgba(239, 68, 68, 0.5)', label: 'Stress' }
  ];
  
  ctx.font = '8px system-ui';
  ctx.textAlign = 'left';
  
  let x = 5;
  legendItems.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.fillRect(x, h - 12, 8, 8);
    ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
    ctx.fillText(item.label, x + 11, h - 5);
    x += ctx.measureText(item.label).width + 20;
  });
}

/**
 * Toggle pause state with animation
 */
function togglePause() {
  if (window.simulationState) {
    window.simulationState.running = !window.simulationState.running;
    const btn = document.getElementById('toggle');
    if (btn) {
      btn.textContent = window.simulationState.running ? '⏸ Pause' : '▶ Resume';
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => btn.style.transform = 'scale(1)', 100);
    }
  }
}

/**
 * Reset simulation with confirmation for old trees
 */
function resetSimulation() {
  // Confirm if tree is old
  if (tree && tree.age > 50) {
    if (!confirm(`Your ${Math.floor(tree.age)} year old tree will be lost. Continue?`)) {
      return;
    }
  }
  
  // Reset stressor checkboxes
  ['disease', 'pests', 'storm', 'pollution'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });

  initializeTree();
  updateEnvironmentFromUI();
  updateEnvironmentTime(0);
  healthHistory = [];
  environmentHistory = { temperature: [], water: [], stress: [] };
  biomassHistory = { trunk: [], branches: [], leaves: [], roots: [] };
  
  if (window.simulationState) {
    window.simulationState.time = 0;
    window.simulationState.running = true;
  }
  
  const toggleBtn = document.getElementById('toggle');
  if (toggleBtn) toggleBtn.textContent = '⏸ Pause';
  
  updateReadout();
  drawHealthGraph();
  drawBiomassGraph();
  updateSpeciesDisplay();
  
  // Visual feedback
  const canvas = document.getElementById('canvas');
  if (canvas) {
    canvas.style.opacity = '0';
    setTimeout(() => canvas.style.opacity = '1', 50);
  }
}

/**
 * Apply custom seed with validation
 */
function applySeed() {
  const seedInput = document.getElementById('seed');
  let seedValue = parseInt(seedInput?.value) || Date.now();
  
  // Validate seed range
  seedValue = Math.abs(seedValue) % 2147483647;
  if (seedInput) seedInput.value = seedValue;
  
  initPRNG(seedValue);
  resetSimulation();
  
  // Show confirmation
  showToast(`🌱 Seed ${seedValue} applied`);
}

/**
 * Show toast notification
 */
function showToast(message, duration = 2000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      transition: transform 0.3s ease;
      backdrop-filter: blur(10px);
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.transform = 'translateX(-50%) translateY(0)';
  
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
  }, duration);
}

/**
 * Get time speed multiplier
 */
function getTimeSpeed() {
  const speedEl = document.getElementById('speed');
  return parseFloat(speedEl?.value) || 1;
}

/**
 * Update species-specific display elements
 */
function updateSpeciesDisplay() {
  if (!tree || !tree.species) return;
  
  const speciesInfo = TREE_SPECIES[tree.species];
  if (!speciesInfo) return;
  
  const speciesEl = document.getElementById('rSpecies');
  if (speciesEl) {
    speciesEl.textContent = speciesInfo.name;
  }

  const speciesNameEl = document.getElementById('speciesName');
  if (speciesNameEl) {
    speciesNameEl.textContent = speciesInfo.name;
  }

  const scientificEl = document.getElementById('speciesScientific');
  if (scientificEl) {
    scientificEl.textContent = speciesInfo.scientificName;
  }
}

/**
 * Export tree data for saving
 */
function exportTreeData() {
  if (!tree) return null;
  
  return {
    version: '2.0',
    timestamp: Date.now(),
    seed: (typeof getPRNGSeed === 'function') ? getPRNGSeed() : undefined,
    tree: {
      age: tree.age,
      health: tree.health,
      height: tree.height,
      dbh: tree.dbh,
      species: tree.species,
      biomass: tree.biomass,
      co2Absorbed: tree.co2Absorbed,
      o2Produced: tree.o2Produced,
      growthRings: tree.growthRings
    },
    environment: {
      year: environment.year,
      dayOfYear: environment.dayOfYear
    },
    healthHistory: healthHistory.slice(-100)
  };
}

/**
 * Import tree data from save
 */
function importTreeData(data) {
  if (!data || data.version !== '2.0') {
    showToast('❌ Invalid save data');
    return false;
  }
  
  try {
    initPRNG(data.seed);
    Object.assign(tree, data.tree);
    Object.assign(environment, data.environment);
    healthHistory = data.healthHistory || [];
    updateReadout();
    drawHealthGraph();
    showToast('✅ Tree restored!');
    return true;
  } catch (e) {
    showToast('❌ Failed to load save');
    return false;
  }
}

/**
 * Update biomass history for graphing
 */
function updateBiomassHistory() {
  if (!tree || !tree.biomass) return;
  const maxHistory = CONFIG?.MAX_HISTORY || 500;
  
  biomassHistory.trunk.push(tree.biomass.trunk);
  biomassHistory.branches.push(tree.biomass.branches);
  biomassHistory.leaves.push(tree.biomass.leaves);
  biomassHistory.roots.push(tree.biomass.roots);
  
  if (biomassHistory.trunk.length > maxHistory) {
    biomassHistory.trunk.shift();
    biomassHistory.branches.shift();
    biomassHistory.leaves.shift();
    biomassHistory.roots.shift();
  }
}

/**
 * Draw biomass breakdown graph (stacked area)
 */
function drawBiomassGraph() {
  const canvas = document.getElementById('biomassGraph');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  
  // Clear with gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, 'rgba(20, 24, 41, 0.8)');
  bgGrad.addColorStop(1, 'rgba(10, 12, 20, 0.9)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);
  
  // Update biomass history
  if (simulationState.frameCount % 5 === 0) {
    updateBiomassHistory();
  }
  
  if (biomassHistory.trunk.length < 2) {
    ctx.fillStyle = 'rgba(156, 163, 175, 0.6)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Collecting biomass data...', w / 2, h / 2);
    return;
  }
  
  const dataLen = biomassHistory.trunk.length;
  
  // Find max total for scaling
  let maxTotal = 1;
  for (let i = 0; i < dataLen; i++) {
    const total = biomassHistory.trunk[i] + biomassHistory.branches[i] + 
                  biomassHistory.leaves[i] + biomassHistory.roots[i];
    if (total > maxTotal) maxTotal = total;
  }
  
  const series = [
    { data: biomassHistory.roots, color: 'rgba(139, 90, 43, 0.7)', label: 'Roots' },
    { data: biomassHistory.trunk, color: 'rgba(101, 67, 33, 0.7)', label: 'Trunk' },
    { data: biomassHistory.branches, color: 'rgba(160, 120, 60, 0.7)', label: 'Branches' },
    { data: biomassHistory.leaves, color: 'rgba(34, 197, 94, 0.7)', label: 'Leaves' }
  ];
  
  // Draw stacked areas from bottom to top
  let previousY = new Array(dataLen).fill(h);
  
  for (const s of series) {
    ctx.beginPath();
    ctx.fillStyle = s.color;
    
    // Top edge
    for (let i = 0; i < dataLen; i++) {
      const x = (i / (dataLen - 1)) * w;
      const value = s.data[i] / maxTotal;
      const barH = value * h;
      const y = previousY[i] - barH;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      
      previousY[i] = y;
    }
    
    // Bottom edge (reverse along previous boundary)
    for (let i = dataLen - 1; i >= 0; i--) {
      const x = (i / (dataLen - 1)) * w;
      const value = s.data[i] / maxTotal;
      const barH = value * h;
      ctx.lineTo(x, previousY[i] + barH);
    }
    
    ctx.closePath();
    ctx.fill();
  }
  
  // Legend
  ctx.font = '8px system-ui';
  ctx.textAlign = 'left';
  let lx = 5;
  for (const s of series) {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, h - 12, 8, 8);
    ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
    ctx.fillText(s.label, lx + 11, h - 5);
    lx += ctx.measureText(s.label).width + 20;
  }
  
  // Current total label
  if (tree && tree.biomass) {
    const total = tree.biomass.trunk + tree.biomass.branches + tree.biomass.leaves + tree.biomass.roots;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(total.toFixed(1) + ' kg', w - 5, 12);
  }
}

/**
 * Export simulation data as CSV
 */
function exportSimulationCSV() {
  if (healthHistory.length < 1) {
    showToast('ℹ️ No data to export yet');
    return;
  }
  
  const species = TREE_SPECIES[tree.species] || TREE_SPECIES.OAK;
  let csv = 'Sample,Health,Water,Stress,Biomass_Trunk,Biomass_Branches,Biomass_Leaves,Biomass_Roots\n';
  
  const maxLen = Math.max(
    healthHistory.length,
    environmentHistory.water.length,
    environmentHistory.stress.length,
    biomassHistory.trunk.length
  );
  
  for (let i = 0; i < maxLen; i++) {
    const health = i < healthHistory.length ? healthHistory[i] : '';
    const water = i < environmentHistory.water.length ? environmentHistory.water[i].toFixed(1) : '';
    const stress = i < environmentHistory.stress.length ? environmentHistory.stress[i].toFixed(1) : '';
    const trunk = i < biomassHistory.trunk.length ? biomassHistory.trunk[i].toFixed(2) : '';
    const branches = i < biomassHistory.branches.length ? biomassHistory.branches[i].toFixed(2) : '';
    const leaves = i < biomassHistory.leaves.length ? biomassHistory.leaves[i].toFixed(2) : '';
    const roots = i < biomassHistory.roots.length ? biomassHistory.roots[i].toFixed(2) : '';
    csv += `${i},${health},${water},${stress},${trunk},${branches},${leaves},${roots}\n`;
  }
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tree_simulation_${species.name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📥 CSV exported');
}

