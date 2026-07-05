# Copilot Enterprise Spend Simulator

A **static web app** that simulates monthly **GitHub Copilot** spend for enterprises using **Copilot Business** and **Copilot Enterprise** seats — with a focus on **multiple cost centers**. Adjust a handful of smart-default sliders, add/remove cost centers, then **play an animated day 1→30 simulation** that shows the shared **included credit pool draining** and **metered (overage) cost growing until it hits your limits**.

Built with React + TypeScript + Vite. No backend — it runs entirely in the browser.

## Why

GitHub moved Copilot to **usage-based billing (AI credits)** on **June 1, 2026**. Spend is now:

```
total bill = license fees (fixed)  +  metered usage (after the shared included pool drains)
```

This tool lets you quickly validate a few setups — *"if we buy 100 seats at 70/30, cap people at $50, and split teams into cost centers, what will we actually pay, and who gets blocked?"* — without spreadsheets.

## How it maps to real GitHub billing

| Concept in the app | GitHub reality |
|---|---|
| 1 credit = **$0.01** | Fixed AI-credit conversion |
| Business **1,900 cr / $19**, Enterprise **3,900 cr / $39** per seat | Included allowance per seat (promo **3,000 / 7,000** until **Sep 1 2026**) |
| Included pool | Credits **pooled at the enterprise level**, funded by all seats |
| Universal ULB (universal user-level budget) | **User-level budget** for normal users — caps a person's *total* (pool + metered) use, **always hard-stops** |
| Power-user override (number of power users + average power-user budget) | **Individual budget override** — power users get a higher per-user budget that overrides the universal ULB ([power-user override guidance](https://docs.github.com/en/enterprise-cloud@latest/copilot/tutorials/budgets/getting-started-with-budget-controls#step-2-identify-your-power-users-and-set-individual-overrides)) |
| Enterprise limit ($, max scales with users) | **Enterprise metered budget** — caps overage **on top of** license fees (`max bill = licenses + budget`) |
| Cost center: per-user limit | **Cost-center user-level budget** (`multi_user_cost_center`) — *API-only today* |
| Cost center: metered budget | **Cost-center budget** — caps metered spend for that CC |
| Cost center: included-usage cap | Auto-sized cap limiting a CC to its own licenses' credits (block or overage) — *API-only today* |
| Stop-usage toggle | Real-world default is **OFF** (alerts only); on here so you can model hard caps |
| Code completions / next-edit | **Not billed** — excluded from the model |

Billing facts are sourced from official GitHub documentation; see the research report that accompanies this project.

## Inputs

**Enterprise (global):** total users with licenses (1–1000), Business/Enterprise ratio, % of seats that actually use Copilot, **average developer monthly usage** (credits, with $ caption), **usage variation**, **universal ULB** ($; default = avg usage, max = 10× avg usage), an **individual budget override for power-users** (**number of power users** 0–total, default 10%; **average power-user budget** $38–$760, default $190 — overrides the ULB), enterprise limit (absolute USD metered budget; max scales with total users), an **"enterprise budget excludes cost-center usage"** toggle, promo-allowances toggle, stop-usage toggle.

**Per cost center (add/remove; one pre-created):** members (seats), plan mix, per-user limit, metered budget, stop-usage, and an **AI credit pool** included-usage cap (on/off — limits the CC to its own licenses' credits; excess spills to metered).

Every non-USD slider shows its **USD equivalent** live.

### "Usage variation" explained

How unevenly usage is spread across developers and days. **0%** = everyone consumes about the same each day (smooth); **higher** = spiky/uneven, so some people and days spike well above average. Higher variation makes individual limits get hit sooner even when the average is unchanged. Modeled as the coefficient of variation of a per-user log-normal daily draw (seeded, so results are stable while you scrub the timeline — use **Reshuffle usage** to resample).

### Quick scenarios & shareable links

Under the projected-bill meter, three **scenario shortcuts** load a preset of the existing controls in one click:

- **Two cost centers, high and low usage** — the shipped default (balanced).
- **Heavy adoption, no guardrails** — high usage with no hard stops, so metered spend runs past the budget and the projected bill exceeds the max.
- **Locked-down budgets** — a low universal per-user budget, tight metered budgets with hard stops, and per-cost-center included-usage caps, so real demand is high but many users get blocked.

The active preset is highlighted as a chip (the others are dotted links); changing any control de-highlights it. Scenarios only move existing sliders/toggles — they introduce no new billing rule.

The **full configuration is encoded in the URL** (`?c=…`) and restored on load, so any setup is copy-to-share ready — the address bar always reflects the current inputs.

## Getting started

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build to dist/
npm run preview    # preview the production build
npm test           # run the engine unit tests (Vitest)
```

## Deploy to GitHub Pages

A workflow is included at `.github/workflows/deploy.yml`:

1. Push to `main`.
2. In the repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. The workflow builds and publishes `dist/`.

`vite.config.ts` uses `base: './'`, so the built SPA works on any Pages project subpath (`https://<user>.github.io/<repo>/`) without hardcoding the repo name.

## Discovery & SEO (search + AI agents)

The site ships a full set of discovery metadata so it is well indexed by search
engines and well understood by AI agents. Static assets live in [`public/`](./public/)
(Vite copies them verbatim to `dist/` root); per-page metadata lives in
[`index.html`](./index.html).

| Asset | Purpose |
|---|---|
| `index.html` `<head>` | Title, description, canonical, `robots`/`googlebot`, Open Graph, Twitter card, and schema.org JSON-LD (`WebSite` + `WebApplication` + `Person`). Absolute URLs use the production origin; icon/manifest links are root paths that Vite rebases to the deployed base. |
| `<noscript>` fallback | Meaningful content + links for no-JS crawlers/agents (this is a client-rendered SPA). |
| `favicon.svg` / `favicon.ico` / `apple-touch-icon.png` | Scalable + legacy + iOS icons (the indigo→violet brand tile with the `◈` mark). |
| `icon-192.png` / `icon-512.png` / `icon-maskable-512.png` | PWA icons, incl. a maskable variant with safe padding. |
| `og-image.png` (1200×630) | Social share image, derived from the design system. |
| `site.webmanifest` | PWA manifest (relative URLs → subpath-portable). |
| `robots.txt` | Allows crawling, welcomes major AI agents by explicit group, and references `sitemap.xml`. |
| `sitemap.xml` | The canonical URL with `<lastmod>`. |
| `llms.txt` / `llms-full.txt` | [llmstxt.org](https://llmstxt.org) discovery: a curated link index and the full concatenated README + `docs/` text for agents. |
| `404.html` / `humans.txt` | Branded not-found page and site credits. |

The **canonical origin** is `https://webmaxru.github.io/finops-copilot/`; update the
absolute URLs in `index.html`, `robots.txt`, `sitemap.xml`, `llms.txt`, and the icon
scripts if the site moves to a custom domain. Because this is a **GitHub Pages
project site**, `robots.txt`/`sitemap.xml` ship at the project subpath (not the
domain root) — the best available placement without a custom domain.

Raster images and the full-text file are **pre-generated and committed** (no
build-time image toolchain). Regenerate them with:

```bash
python scripts/generate-icons.py     # favicons, PWA/app icons, og-image.png
python scripts/build-llms-full.py     # public/llms-full.txt from README + docs/
```


## Accuracy & caveats

- A **simulator for quick validation**, not an invoice. Usage is entered as credits/$ per developer, not per-token; per-model token pricing is intentionally out of scope to keep the UI simple.
- Two cost-center controls (per-user budget, included-usage cap) are **API-only today** — labeled in the UI.
- Promo allowances expire **Sep 1 2026**; model/pricing figures are **as of 2026-07**.
- Pricing constants live in `src/model/defaults.ts` for easy updates.

## Project layout

```
src/
  model/      pricing constants, types, seeded RNG, formatters, simulation engine (+ tests)
  state/      Zustand store + useSimResult() hook (memoized recompute)
  components/ GlobalControls, CostCenterList/Card, Timeline, PlayControls,
              KpiCards, BurndownChart, CostCenterCharts, Warnings, AssumptionsFooter,
              Slider, Toggle
docs/         formal calculation reference (formulas, billing model, engine, citations)
```

The simulation engine (`src/model/engine.ts`) is a pure, deterministic function of the inputs; the whole 30-day month is computed once per input change and cached, so timeline scrubbing/animation is cheap.

## Calculation documentation

Every formula and its interconnections are formally documented in [`docs/`](./docs/), with each billing rule cited to official GitHub documentation and each item tagged **[Fact]** (GitHub-documented), **[Derived]**, or **[Assumption]** (simulator modeling choice):

- [`docs/README.md`](./docs/README.md) — index, notation, scope boundary
- [`docs/formulas.md`](./docs/formulas.md) — every symbol and formula with code refs + sources
- [`docs/billing-model.md`](./docs/billing-model.md) — the GitHub rules the engine is built on (and the documented mechanics it deliberately omits)
- [`docs/simulation-engine.md`](./docs/simulation-engine.md) — data-flow graph and the end-to-end algorithm
- [`docs/references.md`](./docs/references.md) — consolidated citation list

> **Contributing:** [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) (and [`AGENTS.md`](./AGENTS.md)) require that any calculation change and its `docs/` update ship together, that website changes update the docs when relevant, and that every change is validated against official GitHub documentation.
