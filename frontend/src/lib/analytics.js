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

// Module-level state: track last successfully recorded waitlist lead
// Prevents duplicate Lead events for same registration ID
let lastTrackedWaitlistLeadId = null;

/**
 * Track Meta Lead event for successful waitlist registration
 * Fires fbq('track', 'Lead') exactly once per unique waitlist registration
 * NO personal data is sent to Meta - only the conversion event
 *
 * Safe to call multiple times; leadId guard ensures single firing per registration
 * If fbq is unavailable, silently returns without error
 *
 * @param {string} leadId - Unique waitlist registration ID from server response
 */
export function trackWaitlistLead(leadId) {
  // Guard: already tracked this exact registration ID
  if (lastTrackedWaitlistLeadId === leadId) return;

  // Guard: fbq not available (graceful degradation)
  if (!window.fbq || typeof window.fbq !== 'function') return;

  // Fire Meta Lead conversion event (no data parameters sent)
  fbq('track', 'Lead');

  // Mark this registration as tracked
  lastTrackedWaitlistLeadId = leadId;
}
