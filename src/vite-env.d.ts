/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Azure Application Insights connection string. This is a public, client-side
   * ingestion key (write-only) — it ships in the browser bundle by design, so it
   * is provided as a build-time env var / GitHub Actions variable, not a secret.
   */
  readonly VITE_APPINSIGHTS_CONNECTION_STRING?: string;
  /**
   * Build-time kill switch. Set to the string `'true'` to disable all analytics
   * without editing code (e.g. a GitHub Actions variable). See `ANALYTICS_ENABLED`
   * in `src/analytics.ts` for the in-code one-line switch.
   */
  readonly VITE_ANALYTICS_DISABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
