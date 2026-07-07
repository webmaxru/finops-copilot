// Client-side product analytics for the simulator, powered by
// @webmaxru/cookieless-insights (a cookieless beacon — no cookie/GDPR banner).
//
// The Application Insights connection string is a public, client-side ingestion
// key injected at build time via VITE_APPINSIGHTS_CONNECTION_STRING. Every call
// is a safe no-op when unconfigured (local dev / tests) or outside a browser, so
// the simulation engine stays a pure function and analytics is a fire-and-forget
// side effect.

import { init, trackEvent, trackChangeDebounced } from '@webmaxru/cookieless-insights';

// --- KILL SWITCH -----------------------------------------------------------
// Set to `false` to completely disable all analytics/telemetry on the site.
const ANALYTICS_ENABLED = true;
// ---------------------------------------------------------------------------

/** Initialize once, on the client. Safe no-op without a connection string. */
export function initAnalytics(): void {
  init({
    connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING,
    enabled: ANALYTICS_ENABLED,
  });
}

/**
 * Named key-event helpers — the app's engagement vocabulary. Keeping them here
 * (instead of inline strings across components) prevents typos and keeps the
 * dashboard / report KQL in sync with the code.
 */
export const track = {
  scenarioApplied: (scenarioId: string) => trackEvent('Scenario Applied', { scenarioId }),
  costCenterAdded: (count: number) => trackEvent('Cost Center Added', { count }),
  costCenterRemoved: (count: number) => trackEvent('Cost Center Removed', { count }),
  costCenterUpdated: (field: string) => trackChangeDebounced('Cost Center Updated', field),
  themeToggled: (theme: string) => trackEvent('Theme Toggled', { theme }),
  inputsReset: () => trackEvent('Inputs Reset'),
  usageReshuffled: () => trackEvent('Usage Reshuffled'),
  inputChanged: (key: string) => trackChangeDebounced('Input Changed', key),
  sharedConfigOpened: () => trackEvent('Shared Config Opened'),
  outboundClick: (href: string, label: string) => trackEvent('Outbound Click', { href, label }),
};
