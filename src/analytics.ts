// Client-side product analytics via Azure Application Insights.
//
// PRIVACY — NO COOKIE / GDPR BANNER REQUIRED
// ------------------------------------------
// The SDK is initialized cookieless (`disableCookiesUsage: true`) with the
// session-storage send buffer disabled (`enableSessionStorageBuffer: false`), so
// it writes NO cookies and NO localStorage / sessionStorage. There is no
// persistent client-side identifier, so this instrumentation needs no cookie /
// consent banner. The client IP is used transiently by Azure to derive coarse
// geo (city / country) and is not stored on the telemetry.
//
// PURITY / SAFETY
// ---------------
// This module lives outside the pure model layer: the simulation engine stays a
// deterministic pure function of its inputs. Analytics is a fire-and-forget side
// effect and every export is a safe no-op when no connection string is set
// (local dev / tests) or when running outside a browser. The App Insights SDK is
// pulled in via a dynamic import() so it is never loaded into the Node/vitest
// test graph and ships as its own lazy chunk.

import type { ApplicationInsights } from '@microsoft/applicationinsights-web';

const CONNECTION_STRING = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING;

type EventProps = Record<string, string | number | boolean | undefined>;

let client: ApplicationInsights | null = null;
let starting = false;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Initialize Application Insights once, on the client, when a connection string
 * is configured. Safe to call unconditionally; resolves immediately as a no-op
 * in tests / SSR / when unconfigured.
 */
export async function initAnalytics(): Promise<void> {
  if (client || starting) return;
  if (typeof window === 'undefined' || !CONNECTION_STRING) return;
  starting = true;
  try {
    const { ApplicationInsights } = await import('@microsoft/applicationinsights-web');
    const instance = new ApplicationInsights({
      config: {
        connectionString: CONNECTION_STRING,
        // Cookieless — no consent banner required.
        disableCookiesUsage: true,
        // In-memory send buffer only: no localStorage / sessionStorage either.
        enableSessionStorageBuffer: false,
        // Engagement: time spent on the page.
        autoTrackPageVisitTime: true,
        // Single-route SPA — we send one explicit page view instead of route hooks.
        enableAutoRouteTracking: false,
        // Static site: no backend calls worth tracing. Keeps volume tiny and
        // avoids adding correlation headers to font / CDN requests.
        disableAjaxTracking: true,
        disableFetchTracking: true,
        // Keep unhandled errors (low volume, high value).
        enableUnhandledPromiseRejectionTracking: true,
      },
    });
    instance.loadAppInsights();
    instance.trackPageView(); // initial load
    client = instance;
  } catch {
    /* analytics must never break the app */
  } finally {
    starting = false;
  }
}

/** Fire a custom event. No-op until/unless analytics is initialized. */
export function trackEvent(name: string, properties?: EventProps): void {
  try {
    client?.trackEvent({ name }, properties);
  } catch {
    /* ignore */
  }
}

/**
 * Debounced, keyed event — collapses a burst (e.g. dragging a slider or typing
 * in a field) into a single event once activity settles.
 */
export function trackChangeDebounced(name: string, key: string, delayMs = 700): void {
  if (typeof window === 'undefined') return;
  const id = `${name}::${key}`;
  const existing = debounceTimers.get(id);
  if (existing) clearTimeout(existing);
  debounceTimers.set(
    id,
    setTimeout(() => {
      debounceTimers.delete(id);
      trackEvent(name, { key });
    }, delayMs),
  );
}

/**
 * Named key-event helpers — the single vocabulary of tracked engagement events.
 * Keeping them here (rather than inline string literals across the app) prevents
 * typos and makes the dashboard/query KQL match the code.
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
