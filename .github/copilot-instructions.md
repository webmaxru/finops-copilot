# Agent instructions — finops-copilot

These rules are **mandatory** for any agent or contributor changing this repository. They exist so the app's math and its documentation never drift, and so every billing rule stays truthful to GitHub's official behavior.

## Golden rule: `docs/` and the calculations are always in sync

The [`docs/`](../docs/) folder is the **formal specification** of the simulator's math (see [`docs/formulas.md`](../docs/formulas.md)). It is the paired source of truth for the calculation code. **They must never diverge.**

## Non-negotiable rules

1. **A calculation change and its documentation change are one change.**
   - If you modify *anything* that affects the numbers — `src/model/engine.ts`, `src/model/defaults.ts` (constants), `src/model/rng.ts`, unit handling in `src/model/format.ts`, or any component that derives a displayed value — you **must** update the matching parts of [`docs/formulas.md`](../docs/formulas.md) (and [`billing-model.md`](../docs/billing-model.md) / [`simulation-engine.md`](../docs/simulation-engine.md) / [`references.md`](../docs/references.md) when rules or data flow change) **in the same commit/PR**.
   - The reverse also holds: if you change a formula in `docs/`, change the code to match. Never let one lead the other into production.
   - Update the `engine.ts:line` code references in the docs when code moves.

2. **Every request to change the website updates the documentation when relevant.**
   - Any change to inputs, sliders, ranges/defaults, limits, budgets, cost-center behavior, outputs, or the meaning of a chart that affects **what or how** something is calculated **must** be reflected in `docs/`.
   - Purely cosmetic changes (colors, layout, copy that does not describe a calculation) do not require doc changes — but if in doubt, update the docs.

3. **Validate every requested change against official documentation *before* implementing it.**
   - Confirm any billing number, rule, allowance, price, budget behavior, or cost-center mechanic against **official sources only**: `docs.github.com`, GitHub's official changelog `github.blog/changelog`, and `learn.microsoft.com`. **No third-party blogs.**
   - Record the source in [`docs/references.md`](../docs/references.md) and tag the item **[Fact]** (GitHub-documented), **[Derived]** (arithmetic consequence of Facts), or **[Assumption]** (a simulator modeling choice with no official formula).
   - If a requested change cannot be backed by official documentation, it is an **[Assumption]** — label it as such, state the rationale, and do not present it as GitHub-documented behavior. **Never invent or guess billing numbers.**
   - If official docs contradict a requested change, say so and cite the source before proceeding.

## Code ↔ docs map

| Code | Documented in |
|------|---------------|
| `src/model/defaults.ts` (constants, ranges, defaults) | `docs/formulas.md` §1–§2; `docs/billing-model.md` §2–§3 |
| `src/model/engine.ts` group construction | `docs/formulas.md` §3, §5 |
| `src/model/engine.ts` usage model | `docs/formulas.md` §4; `src/model/rng.ts` → §4.1 |
| `src/model/engine.ts` daily loop / `ApplyMetered` | `docs/formulas.md` §6; `docs/simulation-engine.md` |
| `src/model/engine.ts` outputs / warnings | `docs/formulas.md` §7–§8 |
| UI limits (`CostCenterCard`, `CostCenterList`, `store`) | `docs/formulas.md` §9 |
| Any new billing rule | `docs/billing-model.md` + a citation in `docs/references.md` |

## Definition of done (checklist for any calculation-affecting change)

- [ ] Code and `docs/formulas.md` agree: symbols, formulas, and `engine.ts:line` references are updated.
- [ ] `docs/billing-model.md` and/or `docs/simulation-engine.md` updated if a rule or the data flow changed.
- [ ] `docs/references.md` has an official-source citation for any new/changed billing rule; **[Fact]/[Derived]/[Assumption]** tags are correct.
- [ ] Numbers are validated against official docs (or explicitly tagged **[Assumption]** with rationale).
- [ ] Pricing/allowance constants live in `src/model/defaults.ts` (single source), not hard-coded elsewhere.
- [ ] `src/model/__tests__/engine.test.ts` updated to cover the changed math; `npm test` passes.
- [ ] `npm run build` passes (typecheck + production build).
- [ ] Changes committed and **pushed to `main`** so the Pages deploy runs (see below).

## Deployment & delivery

This app auto-deploys to **GitHub Pages** via [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) on every push to **`main`** (Node 20 → `npm ci` → `npm run build` → publish `dist/`). The default remote is `origin` → `https://github.com/webmaxru/finops-copilot.git`.

**After every change, commit and push to `main` so it deploys — this is expected on every request; do not ask for confirmation.**

- Make sure `npm run build` (and `npm test`) pass before pushing.
- Commit with a clear message and the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer, then `git push origin main`.
- Pushing to `main` triggers the Pages workflow automatically — never hand-build or manually publish `dist/`.
- Never commit build output (`dist/`) or temporary/session artifacts.

## Notes

- The engine is a **pure, deterministic** function of its inputs (`runSimulation`). Keep it pure; do not add side effects or non-seeded randomness.
- Keep the **[Fact] vs [Assumption]** distinction honest — it is the reason this simulator can be trusted and extended.
- The full source research is retained at `research/do-detailed-research-on-how-github-copilot-usage-b.md` (session workspace) and summarized in `docs/references.md`.

## Design context

Two root files define the product strategy and visual system for design work; read them before changing UI or visual behavior:

- [`PRODUCT.md`](../PRODUCT.md) — register (`product`), users, purpose, brand personality, anti-references, and strategic design principles.
- [`DESIGN.md`](../DESIGN.md) — the visual system (deep-ink "The Meter" theme): color tokens, typography, elevation, components, and do's/don'ts. Its machine-readable sidecar lives at [`.impeccable/design.json`](../.impeccable/design.json).

These are the design counterpart to the calculation spec in `docs/`; keep them current when the UI's meaning or visual system changes. This is separate from — and does not relax — the golden rule above: any change to the numbers still ships with its `docs/` update.
