/**
 * PageTracking Component
 * Enables Meta Pixel PageView tracking in the React Router context
 * Place this component in any layout that needs to track page views
 */

import { usePageTracking } from '../hooks/usePageTracking.js';

/**
 * Component that activates page tracking when rendered
 * Must be rendered within a RouterProvider context
 * Renders nothing itself; only side effect is tracking
 * @returns {null}
 */
export default function PageTracking() {
  usePageTracking();
  return null;
}
