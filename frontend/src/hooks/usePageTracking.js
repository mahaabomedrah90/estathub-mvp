/**
 * React Hook for Meta Pixel PageView Tracking
 * Tracks page views on initial route mount and on every real SPA navigation
 * Uses module-level state to prevent duplicate PageView events across
 * component mounts, unmounts, and React StrictMode re-initializations
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Module-level state: persists across component re-mounts and StrictMode re-initializations
// Stores the last location identity that was tracked
let lastTrackedLocation = null;

/**
 * Track PageView events on route changes
 * - Initial route: fires PageView once
 * - Subsequent navigations: fires PageView only if pathname or search changed
 * - Same route navigated again: no fire (prevents duplicates)
 * - React StrictMode re-mounts: no fire (same location, no change)
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Build current location identity (pathname + search together)
    const currentLocationId = `${location.pathname}${location.search}`;

    // Only fire if we haven't tracked this location yet
    if (lastTrackedLocation !== currentLocationId) {
      // Defensive check: fbq must exist and be a function
      if (window.fbq && typeof window.fbq === 'function') {
        fbq('track', 'PageView');
      }

      // Update module-level state only after successful track
      lastTrackedLocation = currentLocationId;
    }
    // If same location: no action (no duplicate PageView)
  }, [location.pathname, location.search]);
}
