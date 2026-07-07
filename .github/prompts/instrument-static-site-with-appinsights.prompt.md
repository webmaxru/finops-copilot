---
mode: agent
description: Instrument any static-site (SPA) project with cookieless Azure Application Insights — full engagement + key-event telemetry, no cookie/GDPR banner, free tier only, plus an Azure Portal dashboard and a terminal report script. Deploy-on-push aware.
---

# Instrument a static site with cookieless Azure Application Insights

You are adding **privacy-friendly product analytics** to a **static front-end** (SPA:
React/Vue/Svelte/Solid/vanilla, built by Vite/Next-export/CRA/etc. and hosted on
GitHub Pages, Azure Static Web Apps, Netlify, S3, …). Deliver **end-to-end**: Azure
resources, code instrumentation, an Azure Portal dashboard, a terminal report
script, and a deploy. Work autonomously; state assumptions instead of asking.

## Hard requirements (do not compromise)

1. **No cookie / GDPR consent banner.** Initialize the App Insights JS SDK cookieless:
   `disableCookiesUsage: true` **and** `enableSessionStorageBuffer: false` so it writes
   **no cookies and no localStorage/sessionStorage** and creates **no persistent
   identifier**. (Verified against Microsoft Learn: "Application Insights JavaScript SDK
   configuration → Cookie management".) Do not add any user-identifying telemetry (no
   emails, no auth ids). Client IP is used only transiently by Azure for coarse geo and
   is not stored — that is acceptable and needs no banner.
2. **Free tier only.** Use a **workspace-based** App Insights (Log Analytics workspace,
   `PerGB2018`) with **30-day retention** (free) and a **daily ingestion cap** on the
   workspace of **0.16 GB/day** (`az monitor log-analytics workspace update --quota 0.16`)
   — Microsoft's documented "160 MB/day stays under the 5 GB/month free grant". Never pick
   a paid SKU or dedicated cluster.
3. **Validate every billing/pricing/privacy claim against official docs only**
   (`learn.microsoft.com`, `docs.github.com`). Never invent numbers.
4. **Analytics must never break the app.** Every telemetry call is a safe no-op when no
   connection string is configured (local dev / tests) or when not in a browser. Keep the
   app's core logic pure/unchanged.

## Step 1 — Discover

- Read `package.json`, the build tool config, the entry file, and the state layer. Identify
  the **single choke point** for user-driven state changes (a store: Zustand/Redux/Pinia/
  signals). If none exists, plan to wrap the top-level UI event handlers instead.
- Identify the **hosting** and the **deploy workflow** (e.g. `.github/workflows/*.yml`
  building to `dist/`). Note the git remote / default branch.
- Enumerate the **key events** worth tracking for *detailed engagement*: page view,
  every meaningful control/interaction (toggles, sliders → debounced, presets, add/remove
  actions, resets), outbound link clicks, and "opened via shared/deep link".

## Step 2 — Azure resources (reuse or create)

- `az account show` to confirm login. If a **resource group for this project already
  exists, reuse it**; otherwise create `az group create -n <project>-rg -l <region>`.
- Create workspace-based App Insights:
  ```
  az monitor log-analytics workspace create -g <rg> -n <project>-law -l <region> --retention-time 30
  az monitor log-analytics workspace update -g <rg> --workspace-name <project>-law --quota 0.16
  WSID=$(az monitor log-analytics workspace show -g <rg> -n <project>-law --query id -o tsv)
  az monitor app-insights component create --app <project>-ai -g <rg> -l <region> --workspace $WSID --kind web --application-type web
  ```
  **Gotcha:** `--retention-time` is **rejected** on the App Insights `component create` when
  workspace-based (retention follows the workspace) — set it on the workspace, not the component.
- Capture the **connection string** (`... component show --query connectionString -o tsv`).

## Step 3 — Instrument the code

- `npm i @microsoft/applicationinsights-web`.
- Create a generic `src/analytics.ts`:
  - `import type { ApplicationInsights }` (type-only, erased) + **dynamic** `await import(...)`
    inside an `initAnalytics()` guarded by `typeof window !== 'undefined'` and a connection
    string from `import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING` (or framework equivalent).
    This keeps the SDK out of the Node/test graph and ships it as a lazy chunk; when the var is
    absent the branch is **tree-shaken** (zero bytes).
  - Config: `disableCookiesUsage: true`, `enableSessionStorageBuffer: false`,
    `autoTrackPageVisitTime: true`, `enableAutoRouteTracking: false` (single route → send one
    explicit `trackPageView()`), `disableAjaxTracking: true`, `disableFetchTracking: true`,
    `enableUnhandledPromiseRejectionTracking: true`.
  - Export `trackEvent(name, props)`, a **debounced** `trackChangeDebounced(name, key)` (≈700 ms,
    for sliders/typing), and a small named `track.*` vocabulary so event names match the dashboard.
- Wire `track.*` into the **store choke point** (one call per mutation) + outbound-link
  `onClick` handlers + a "shared/deep link opened" check at startup. Keep the engine/pure code untouched.
- Call `initAnalytics()` once from the app entry (`main`/`index`).
- If `tsc` doesn't already include `vite/client`, add `src/vite-env.d.ts` declaring the
  `import.meta.env` key so the typecheck passes.

## Step 4 — Build-time config & deploy

- The connection string is a **public client-side ingestion key** (visible in the bundle by
  design) → store it as a **repo Actions *variable*** (not a secret):
  `gh variable set VITE_APPINSIGHTS_CONNECTION_STRING --repo <owner/repo> --body "<conn>"`.
- In the deploy workflow, pass it to the build step:
  `env: { VITE_APPINSIGHTS_CONNECTION_STRING: ${{ vars.VITE_APPINSIGHTS_CONNECTION_STRING }} }`.
- Verify locally **both** paths: build **with** the var (SDK becomes a separate chunk, key baked
  into the entry chunk) and **without** it (fully tree-shaken). Run the test suite.

## Step 5 — Azure Portal dashboard (engagement + key events)

- **Validate every KQL first** with `az monitor app-insights query --app <appId>
  --analytics-query "<kql>" --offset 30d -o json` (empty rows = valid syntax). Use
  **single quotes** in KQL string literals so the JSON needs no escaping.
- Author a parameterized ARM template (`azure/analytics-dashboard.json`,
  `Microsoft.Portal/dashboards@2020-09-01-preview`, **array-form** `lenses[].parts[]`) with
  `LogsDashboardPart` tiles (mostly `AnalyticsGrid`, one `FrameControlChart` time series):
  page views & sessions/day; per-visit engagement (events/session + dwell via
  `datetime_diff` over `session_Id` span — works even cookieless); key events by name;
  most-adjusted inputs; presets; add/remove/update actions; outbound clicks; top countries;
  browser/OS. Parameterize `appInsightsId`; give each part a unique `PartId` GUID.
- Deploy: `az deployment group create -g <rg> --template-file azure/analytics-dashboard.json
  --parameters appInsightsId=<aiResourceId>` and confirm `provisioningState == Succeeded`.

## Step 6 — Terminal report script + npm command

- Add `scripts/analytics.ps1` (**ASCII only** — non-ASCII like `—`/`·` breaks Windows
  PowerShell 5.1 when the file has no BOM): resolve appId/tenant/sub via `az`, run the same KQL
  set and print tables, and with `-Open` launch the portal dashboard deep link
  `https://portal.azure.com/#@<tenant>/dashboard/arm<dashboardResourceId>`. Support `-Days` and
  `-OpenOnly`. Add `"analytics": "pwsh -NoProfile -File scripts/analytics.ps1"` to `package.json`
  (`npm run analytics -- -Open`).

## Step 7 — Ship

- Ensure `npm run build` and tests pass, commit (with the repo's required co-author trailer if
  any), and **push to the deploy branch** so the site redeploys with telemetry live. Never commit
  `dist/` or secrets. After a real visit, `npm run analytics` should show data within ~1–3 min.

## Definition of done

- [ ] Cookieless (no cookies/localStorage/sessionStorage, no persistent id) — no banner needed.
- [ ] Workspace-based App Insights, 30-day retention, 0.16 GB/day cap — free tier.
- [ ] All key events wired at the choke point; page view + engagement time collected.
- [ ] Connection string is a repo **variable**; deploy workflow injects it; both build paths verified.
- [ ] Portal dashboard deployed (Succeeded); every KQL validated.
- [ ] `npm run analytics` prints the report and `-Open` opens the dashboard.
- [ ] Built, tested, committed, pushed → deployed.
