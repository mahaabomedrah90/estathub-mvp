/**
 * Analytics Utility
 * Handles single, guarded initialization of Meta Pixel and X Web Pixel
 * Meta, X and TikTok track the waitlist conversion without sending PII
 * (TikTok Pixel itself is loaded and initialized once in index.html)
 */

// Module-level state: ensures fbq('init') is called only once, ever
let metaInitialized = false;

// Module-level state: ensures twq.init is called only once, ever
let xInitialized = false;

/**
 * Initialize Meta Pixel with guarded, idempotent pattern
 * Safe to call multiple times; only executes once
 * @param {string} pixelId - The Meta Pixel ID
 */
export function initializePixel(pixelId) {
  // Already initialized or missing dependencies
  if (metaInitialized) return;
  if (!pixelId || !window.fbq) return;

  // Initialize the pixel exactly once
  fbq('init', pixelId);
  metaInitialized = true;
}

/**
 * Initialize X Web Pixel with guarded, idempotent pattern
 * Safe to call multiple times; only executes once
 * @param {string} pixelId - The X Web Pixel ID
 */
export function initializeXPixel(pixelId) {
  // Already initialized or missing dependencies
  if (xInitialized) return;
  if (!pixelId || !window.twq) return;

  // Initialize the pixel exactly once
  window.twq('config', pixelId);
  xInitialized = true;
}

// Module-level state: track last successfully recorded waitlist lead for Meta
// Prevents duplicate Lead events for same registration ID
let lastTrackedMetaWaitlistLeadId = null;

// Module-level state: track last successfully recorded waitlist lead for X
// Prevents duplicate Lead events for same registration ID
let lastTrackedXWaitlistLeadId = null;

// Module-level state: track last successfully recorded waitlist lead for TikTok
// Prevents duplicate CompleteRegistration events for same registration ID
let lastTrackedTikTokWaitlistLeadId = null;

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
  if (lastTrackedMetaWaitlistLeadId === leadId) return;

  // Guard: fbq not available (graceful degradation)
  if (!window.fbq || typeof window.fbq !== 'function') return;

  // Fire Meta Lead conversion event (no data parameters sent)
  fbq('track', 'Lead');

  // Mark this registration as tracked
  lastTrackedMetaWaitlistLeadId = leadId;
}

/**
 * Track X Lead event for successful waitlist registration
 * Fires the official ALWSM Waitlist Lead conversion event exactly once per unique waitlist registration
 * NO personal data is sent to X - only the conversion event
 *
 * Safe to call multiple times; leadId guard ensures single firing per registration
 * If twq is unavailable, silently returns without error
 *
 * @param {string} leadId - Unique waitlist registration ID from server response (used only for internal duplicate prevention)
 */
export function trackXWaitlistLead(leadId) {
  // Guard: already tracked this exact registration ID
  if (lastTrackedXWaitlistLeadId === leadId) return;

  // Guard: twq not available (graceful degradation)
  if (!window.twq || typeof window.twq !== 'function') return;

  // Fire X Lead conversion event (no data parameters sent)
  // Official X Events Manager event: ALWSM Waitlist Lead
  window.twq('event', 'tw-rg2n5-rg2ou', {});

  // Mark this registration as tracked
  lastTrackedXWaitlistLeadId = leadId;
}

/**
 * Track TikTok CompleteRegistration event for successful waitlist registration
 * Fires exactly once per unique waitlist registration
 * NO personal data is sent to TikTok - only a fixed waitlist content descriptor
 *
 * Safe to call multiple times; leadId guard ensures single firing per registration
 * If ttq is unavailable, silently returns without error
 *
 * @param {string} leadId - Unique waitlist registration ID from server response (used only for internal duplicate prevention, never sent)
 */
export function trackTikTokWaitlistRegistration(leadId) {
  // Guard: already tracked this exact registration ID
  if (lastTrackedTikTokWaitlistLeadId === leadId) return;

  // Guard: ttq not available (graceful degradation)
  if (!window.ttq || typeof window.ttq.track !== 'function') return;

  window.ttq.track('CompleteRegistration', {
    contents: [
      {
        content_id: 'alwsm_waitlist',
        content_type: 'product',
        content_name: 'ALWSM Waitlist',
      },
    ],
    value: 0,
    currency: 'SAR',
  });

  // Mark this registration as tracked
  lastTrackedTikTokWaitlistLeadId = leadId;
}
