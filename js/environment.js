/**
 * Environment State Management
 * Tracks environmental conditions affecting tree growth
 */

// Global environment state
const environment = {
  // Time tracking
  year: 0,
  dayOfYear: 0,
  season: 'SPRING',
  hour: 12,
  
  // Environmental conditions
  sunlight: 70,
  water: 60,
  temperature: 20,
  soilQuality: 70,
  windSpeed: 30,
  humidity: 60,
  
  // Stress factors
  totalStress: 0,
  waterAvailability: 60,
  
  // Stressors (boolean flags)
  disease: false,
  pests: false,
  storm: false,
  pollution: false
};

// Make environment globally accessible
window.environment = environment;

/**
 * Update environment from UI slider values
 */
function updateEnvironmentFromUI() {
  // Get slider values
  const sunSlider = document.getElementById('sun');
  const waterSlider = document.getElementById('water');
  const tempSlider = document.getElementById('temp');
  const soilSlider = document.getElementById('soil');
  const windSlider = document.getElementById('wind');
  const humiditySlider = document.getElementById('humidity');
  
  if (sunSlider) environment.sunlight = parseFloat(sunSlider.value);
  if (waterSlider) environment.water = parseFloat(waterSlider.value);
  if (tempSlider) environment.temperature = parseFloat(tempSlider.value);
  if (soilSlider) environment.soilQuality = parseFloat(soilSlider.value);
  if (windSlider) environment.windSpeed = parseFloat(windSlider.value);
  if (humiditySlider) environment.humidity = parseFloat(humiditySlider.value);
  
  // Get stressor checkboxes
  const diseaseCheckbox = document.getElementById('disease');
  const pestsCheckbox = document.getElementById('pests');
  const stormCheckbox = document.getElementById('storm');
  const pollutionCheckbox = document.getElementById('pollution');
  
  if (diseaseCheckbox) environment.disease = diseaseCheckbox.checked;
  if (pestsCheckbox) environment.pests = pestsCheckbox.checked;
  if (stormCheckbox) environment.storm = stormCheckbox.checked;
  if (pollutionCheckbox) environment.pollution = pollutionCheckbox.checked;
}

// Make function globally accessible
window.updateEnvironmentFromUI = updateEnvironmentFromUI;

/**
 * Update environment time progression
 * @param {number} dt - Delta time in days
 */
function updateEnvironmentTime(dt) {
  environment.dayOfYear += dt;
  
  if (environment.dayOfYear >= 365) {
    environment.dayOfYear -= 365;
    environment.year++;
  }
  
  // Update season based on day of year
  if (environment.dayOfYear < 90) {
    environment.season = SEASONS.SPRING;
  } else if (environment.dayOfYear < 180) {
    environment.season = SEASONS.SUMMER;
  } else if (environment.dayOfYear < 270) {
    environment.season = SEASONS.AUTUMN;
  } else {
    environment.season = SEASONS.WINTER;
  }
  
  // Update hour (for day/night cycle)
  environment.hour = (environment.dayOfYear % 1) * 24;
}

/**
 * Get current season as display string
 * @returns {string} Season name
 */
function getSeasonDisplay() {
  const seasons = {
    [SEASONS.SPRING]: '🌱 Spring',
    [SEASONS.SUMMER]: '☀️ Summer',
    [SEASONS.AUTUMN]: '🍂 Autumn',
    [SEASONS.WINTER]: '❄️ Winter'
  };
  return seasons[environment.season] || 'Unknown';
}

/**
 * Get season progress (0-1) within current season
 * @param {number} dayOfYear - Current day of year
 * @returns {number} Progress from 0 to 1
 */
function getSeasonProgress(dayOfYear) {
  const seasonLength = 365 / 4;
  const seasonStart = Math.floor(dayOfYear / seasonLength) * seasonLength;
  return (dayOfYear - seasonStart) / seasonLength;
}

/**
 * Get seasonal growth multiplier
 * @param {string} season - Current season
 * @returns {number} Growth multiplier (0-1)
 */
function getSeasonalGrowthMultiplier(season) {
  const multipliers = {
    [SEASONS.SPRING]: 1.0,
    [SEASONS.SUMMER]: 0.95,
    [SEASONS.AUTUMN]: 0.4,
    [SEASONS.WINTER]: 0.05
  };
  return multipliers[season] || 0.5;
}

// Make functions globally accessible
window.updateEnvironmentTime = updateEnvironmentTime;
window.getSeasonDisplay = getSeasonDisplay;
window.getSeasonProgress = getSeasonProgress;
window.getSeasonalGrowthMultiplier = getSeasonalGrowthMultiplier;
