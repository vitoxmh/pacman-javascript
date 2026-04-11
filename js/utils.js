/**
 * Utility functions used across the game
 */

/**
 * Creates a deep copy of a 2D array (map)
 * @param {number[][]} map - The map to copy
 * @returns {number[][]} A new copy of the map
 */
function copyMap(map) {
    return map.map(row => row.slice());
}

/**
 * Calculates distance between two points
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Clamps a value between min and max
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 * @param {number} a 
 * @param {number} b 
 * @param {number} t 
 * @returns {number}
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}
