# References

Every billing rule in these docs is a **[Fact]** backed by an official GitHub source below. Tags `[B1]`–`[B18]` are used throughout [`billing-model.md`](./billing-model.md), [`formulas.md`](./formulas.md), and [`simulation-engine.md`](./simulation-engine.md). Verified 2026-07-06 (firsthand fetch of B1–B18) against the June 1 2026 usage-based billing model. **All `docs.github.com` links use the `enterprise-cloud@latest` version** (Copilot Business/Enterprise on GitHub Enterprise Cloud), not the free/pro/team version; product-release notes are on `github.blog/changelog`.

| Tag | Establishes | URL |
|-----|-------------|-----|
| **B1** | AI credit = $0.01; included per seat (1,900/3,900; promo 3,000/7,000); enterprise pooling; monthly reset/no rollover; completions not billed | https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises |
| **B2** | Per-token model pricing; token→credit conversion; code review also consumes Actions minutes | https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/copilot-billing/models-and-pricing |
| **B3** | Seat prices: Business $19, Enterprise $39 per seat/month | https://docs.github.com/en/enterprise-cloud@latest/copilot/get-started/plans |
| **B4** | Budget scopes/hierarchy; user-level budgets cap total (pool+metered) & always hard-stop; evaluation order (user→pool→CC→org→enterprise), lowest-headroom-wins; **max bill = license fees + enterprise budget** (400 Business = $7,600 + a $5,000 budget = $12,600); "Stop usage when budget limit is reached" **OFF by default** (metered budgets only); at a CC included-usage cap you **choose block vs. overage**; cost-center **exclusion is enabled per cost center** | https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/billing/budgets-for-usage-based-billing |
| **B5** | Controlling Copilot costs at scale with budgets; cost-center budgets; stop-usage vs. alert-only (the $12,600 max-bill example itself lives on **B4**) | https://docs.github.com/en/enterprise-cloud@latest/billing/tutorials/control-costs-at-scale |
| **B6** | Budget **alert thresholds 75/90/100%**; license-based products (Copilot seats) are alert-only while metered products can stop usage (the explicit "stop usage OFF by default" wording lives on **B4**) | https://docs.github.com/en/enterprise-cloud@latest/billing/concepts/budgets-and-alerts |
| **B7** | License-based products cannot be hard-capped by a budget (alerts only) | https://docs.github.com/en/enterprise-cloud@latest/billing/how-tos/set-up-budgets |
| **B8** | REST cost centers; `ai_credit_pool_enabled` boolean + auto-sized `ai_credit_pool_state` (`target_amount`/`current_amount`); **no** block/overage field on this endpoint — that per-CC choice is set via the included-usage control setup ([B4]) | https://docs.github.com/en/enterprise-cloud@latest/rest/billing/cost-centers |
| **B9** | REST budgets; scope enum: `enterprise`, `organization`, `repository`, `cost_center`, `multi_user_customer`, `multi_user_cost_center`, `user`; AI-credit bundle SKU `ai_credits`; **no** exclude-cost-center field (exclusion is a per-CC concept, [B4]) | https://docs.github.com/en/enterprise-cloud@latest/rest/billing/budgets |
| **B10** | Cost center concept; **included-usage controls** cap a CC to its own licenses' credits with a per-CC **block-vs-overage** choice at the cap; a resource belongs to only one cost center at a time (⇒ Σ members ≤ licenses — the explicit rule is on the *use-cost-centers* how-to, Additional context below) | https://docs.github.com/en/enterprise-cloud@latest/billing/concepts/cost-centers |
| **B11** | Cost-center allocation/attribution; usage not in a CC bills to the enterprise | https://docs.github.com/en/enterprise-cloud@latest/billing/reference/cost-center-allocation |
| **B12** | Per-user AI credit budgets for cost centers (API-only) | https://github.blog/changelog/2026-06-30-per-user-ai-credit-budgets-available-for-cost-centers/ |
| **B13** | Cost centers support an AI credit pool cap (single `ai_credit_pool_enabled` boolean; GitHub **auto-sizes** it to the CC's own licenses' included credits — 1,900/3,900 std · 3,000/7,000 promo per license). At the cap you **choose, per cost center, whether members are blocked or usage continues as overage** ("block further included usage or let it continue as additional spend if your enterprise allows overages"). API-only today (settings UI coming soon) | https://github.blog/changelog/2026-07-02-cost-centers-now-support-included-usage-caps/ |
| **B14** | Auto-model-selection −10% discount on model cost (paid plans) | https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/models/auto-model-selection |
| **B15** | Data-residency-enforced requests: **+10%** AI credit consumption (this page covers data residency, not FedRAMP) | https://docs.github.com/en/enterprise-cloud@latest/admin/data-residency/github-copilot-with-data-residency |
| **B16** | Identify power users and set individual budget overrides (higher per-user budget that overrides the universal budget) | https://docs.github.com/en/enterprise-cloud@latest/copilot/tutorials/budgets/getting-started-with-budget-controls#step-2-identify-your-power-users-and-set-individual-overrides |
| **B17** | Copilot policies are governance controls in the enterprise **"AI controls"** tab / organization settings (which features, agents, and models users can access) | https://docs.github.com/en/enterprise-cloud@latest/copilot/concepts/policies |
| **B18** | Enterprise-scoped budgets can **exclude cost-center usage**; exclusion is enabled **per cost center** so selected cost centers spend independently of the enterprise budget (bounded only by their own CC budget). Default **includes** CC usage; available via REST and audit-logged | https://github.blog/changelog/2026-01-19-enterprise-scoped-budgets-that-exclude-cost-center-usage-in-public-preview/ |

## Additional context (not tagged inline)

| Establishes | URL |
|-------------|-----|
| Assign enterprise teams to cost centers (membership auto-syncs) | https://github.blog/changelog/2026-06-25-assign-enterprise-teams-to-cost-centers/ |
| Cost-center management how-to — a resource belongs to only one cost center at a time; enabling the AI credit pool cap | https://docs.github.com/en/enterprise-cloud@latest/billing/how-tos/products/use-cost-centers |
| Product & SKU names (`copilot_ai_credits`, `ai_credits` bundle, etc.) | https://docs.github.com/en/enterprise-cloud@latest/billing/reference/product-and-sku-names |
| Budget sizing / forecasting guidance | https://docs.github.com/en/enterprise-cloud@latest/copilot/tutorials/budgets/optimizing-your-budget-configuration |

### Blocked-user reason breakdown — **[Derived]** (no new source)

The simulator splits blocked users by the **binding hard stop** — `userLimit`, `costCenterPool`, `costCenterBudget`, or `enterpriseBudget` (see [`formulas.md`](./formulas.md) §6d, §7.1). This introduces **no new billing rule**: the stops are the already-cited facts — user-level budgets always hard-stop [B4][B16], a cost-center AI-credit-pool cap set to **block** stops members at the cap [B13][B4], and cost-center/enterprise metered-budget "stop usage" flags hard-stop the metered leg [B4][B6]. Which of them is reported as *the* reason (user limit first, then a block-mode pool cap, then whichever budget `ApplyMetered` found binding) is a **[Derived]** attribution / modeling choice, surfaced in chart tooltips and the global "Blocked users" KPI. Validated in `src/model/__tests__/engine.test.ts` ("blocked-user reason breakdown" and "blocks members at the cap when the CC is set to block").

## Full research report

The exhaustive source-of-truth research (with quotes and freshness notes) that these facts were distilled from is retained in the session workspace:
`research/do-detailed-research-on-how-github-copilot-usage-b.md`.
