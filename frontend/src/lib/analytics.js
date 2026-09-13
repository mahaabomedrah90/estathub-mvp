/**
 * Meta Pixel Analytics Utility
 * Handles single, guarded initialization of Meta Pixel
 */

// Module-level state: ensures fbq('init') is called only once, ever
let initialized = false;

/**
 * Initialize Meta Pixel with guarded, idempotent pattern
 * Safe to call multiple times; only executes once
 * @param {string} pixelId - The Meta Pixel ID
 */
export function initializePixel(pixelId) {
  // Already initialized or missing dependencies
  if (initialized) return;
  if (!pixelId || !window.fbq) return;

  // Initialize the pixel exactly once
  fbq('init', pixelId);
  initialized = true;
}
