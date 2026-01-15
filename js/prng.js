/**
 * Pseudo-Random Number Generator (PRNG)
 * Provides seeded random number generation for reproducible simulations
 */

let prngState = {
  seed: 12345,
  state: 12345
};

/**
 * Initialize PRNG with a seed
 * @param {number} seed - The seed value for reproducibility
 */
function initPRNG(seed) {
  prngState.seed = seed;
  prngState.state = seed;
}

/**
 * Generate next random number using linear congruential generator
 * @returns {number} Random number between 0 and 1
 */
function random() {
  // Linear congruential generator (LCG)
  // Using parameters from Numerical Recipes
  prngState.state = (prngState.state * 1664525 + 1013904223) % 4294967296;
  return prngState.state / 4294967296;
}

/**
 * Generate random integer in range [min, max]
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer
 */
function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Generate random float in range [min, max)
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} Random float
 */
function randomFloat(min, max) {
  return random() * (max - min) + min;
}

/**
 * Generate random value with normal distribution (Box-Muller transform)
 * @param {number} mean - Mean of the distribution
 * @param {number} stdDev - Standard deviation
 * @returns {number} Random value from normal distribution
 */
function randomNormal(mean = 0, stdDev = 1) {
  const u1 = random();
  const u2 = random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Choose random element from array
 * @param {Array} array - Array to choose from
 * @returns {*} Random element
 */
function randomChoice(array) {
  return array[Math.floor(random() * array.length)];
}

/**
 * Get current PRNG seed
 * @returns {number} Current seed
 */
function getPRNGSeed() {
  return prngState.seed;
}

/**
 * Simple 2D Perlin-like noise function
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} Noise value between -1 and 1
 */
function perlin2D(x, y) {
  // Simple noise using sine waves (not true Perlin but fast and sufficient)
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

/**
 * Fractional Brownian Motion (FBM) - layered noise
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} octaves - Number of noise layers (default: 4)
 * @param {number} persistence - Amplitude multiplier per octave (default: 0.5)
 * @returns {number} FBM noise value
 */
function fbm(x, y, octaves = 4, persistence = 0.5) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    total += perlin2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  
  return total / maxValue;
}

// Make functions globally accessible
window.perlin2D = perlin2D;
window.fbm = fbm;
