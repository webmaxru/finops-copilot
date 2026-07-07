/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Azure Application Insights connection string. This is a public, client-side
   * ingestion key (write-only) — it ships in the browser bundle by design, so it
   * is provided as a build-time env var / GitHub Actions variable, not a secret.
   */
  readonly VITE_APPINSIGHTS_CONNECTION_STRING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
