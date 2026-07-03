# References

Every billing rule in these docs is a **[Fact]** backed by an official GitHub source below. Tags `[B1]`–`[B15]` are used throughout [`billing-model.md`](./billing-model.md), [`formulas.md`](./formulas.md), and [`simulation-engine.md`](./simulation-engine.md). Verified 2026-07 against the June 1 2026 usage-based billing model. All sources are `docs.github.com` or GitHub's official product-release channel `github.blog/changelog`.

| Tag | Establishes | URL |
|-----|-------------|-----|
| **B1** | AI credit = $0.01; included per seat (1,900/3,900; promo 3,000/7,000); enterprise pooling; monthly reset/no rollover; completions not billed | https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises |
| **B2** | Per-token model pricing; token→credit conversion; code review also consumes Actions minutes | https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing |
| **B3** | Seat prices: Business $19, Enterprise $39 per seat/month | https://docs.github.com/en/copilot/get-started/plans |
| **B4** | Budget scopes/hierarchy; user-level budgets cap total & always hard-stop; per-request evaluation order; lowest-headroom-wins | https://docs.github.com/en/copilot/concepts/billing/budgets-for-usage-based-billing |
| **B5** | Budgets cap metered only; **max bill = licenses + enterprise budget** (400×$19 + $5,000 = $12,600); cost-center budgets | https://docs.github.com/en/enterprise-cloud@latest/billing/tutorials/control-costs-at-scale |
| **B6** | "Stop usage when budget limit is reached" is OFF by default; alert thresholds 75/90/100% | https://docs.github.com/en/billing/concepts/budgets-and-alerts |
| **B7** | License-based products cannot be hard-capped by a budget (alerts only) | https://docs.github.com/en/billing/how-tos/set-up-budgets |
| **B8** | REST cost centers; `ai_credit_pool_enabled` field (auto-sized included-usage cap) | https://docs.github.com/en/enterprise-cloud@latest/rest/billing/cost-centers |
| **B9** | REST budgets; scope values incl. `multi_user_cost_center`, `multi_user_customer`, `cost_center`, `enterprise` | https://docs.github.com/en/enterprise-cloud@latest/rest/billing/budgets |
| **B10** | Cost center concept; a resource belongs to only one CC (⇒ Σ members ≤ licenses); included-usage controls don't redistribute the pool | https://docs.github.com/en/enterprise-cloud@latest/billing/concepts/cost-centers |
| **B11** | Cost-center allocation/attribution; usage not in a CC bills to the enterprise | https://docs.github.com/en/enterprise-cloud@latest/billing/reference/cost-center-allocation |
| **B12** | Per-user AI credit budgets for cost centers (API-only) | https://github.blog/changelog/2026-06-30-per-user-ai-credit-budgets-available-for-cost-centers/ |
| **B13** | Cost centers support included-usage caps (auto-sized; block/overage; API-only) | https://github.blog/changelog/2026-07-02-cost-centers-now-support-included-usage-caps/ |
| **B14** | Auto-model-selection −10% discount on model cost (paid plans) | https://docs.github.com/en/copilot/concepts/models/auto-model-selection |
| **B15** | Data-residency / FedRAMP-compliant requests: +10% AI credit consumption | https://docs.github.com/en/enterprise-cloud@latest/admin/data-residency/github-copilot-with-data-residency |
| **B16** | Identify power users and set individual budget overrides (higher per-user budget that overrides the universal budget) | https://docs.github.com/en/copilot/tutorials/budgets/getting-started-with-budget-controls#step-2-identify-your-power-users-and-set-individual-overrides |

## Additional context (not tagged inline)

| Establishes | URL |
|-------------|-----|
| Assign enterprise teams to cost centers (membership auto-syncs) | https://github.blog/changelog/2026-06-25-assign-enterprise-teams-to-cost-centers/ |
| Product & SKU names (`copilot_ai_credits`, `ai_credits` bundle, etc.) | https://docs.github.com/en/billing/reference/product-and-sku-names |
| Budget sizing / forecasting guidance | https://docs.github.com/en/copilot/tutorials/budgets/optimizing-your-budget-configuration |

## Full research report

The exhaustive source-of-truth research (with quotes and freshness notes) that these facts were distilled from is retained in the session workspace:
`research/do-detailed-research-on-how-github-copilot-usage-b.md`.
