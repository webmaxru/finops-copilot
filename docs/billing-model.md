# GitHub Copilot Billing Model (as implemented)

The rules below are the **GitHub-documented facts** the simulator relies on. Each is cited. This reflects the **usage-based billing** model that took effect **June 1, 2026** for Copilot Business and Copilot Enterprise. Figures verified 2026-07.

## 1. Billing components

Total spend has three parts; the simulator treats them separately:

```
total bill = license fees (fixed)  +  metered usage (variable, after the included pool drains)
```

- **License fees** are fixed per seat and are **never capped by a budget** (budgets only alert on license products). [B1][B7]
- **Included usage** is a monthly allowance of AI credits bundled with each seat, **pooled at the enterprise level**. [B1]
- **Metered usage** is pay-as-you-go, billed only after the shared pool is exhausted. [B1]

## 2. The AI credit (AICR)

- **1 AI credit = $0.01 USD**, fixed. [B1][B2]
- Copilot usage is measured in AI credits; **code completions and next-edit suggestions are not billed** and are excluded from the model. [B1][B2]

## 3. Seat prices and included allowances

| Plan | Price $p$ (USD/seat/mo) | Included $I$ (AICR/seat/mo), standard | Promo (Jun 1 – Sep 1 2026) |
|------|------------------------:|--------------------------------------:|---------------------------:|
| Copilot Business | **19** | **1,900** | **3,000** |
| Copilot Enterprise | **39** | **3,900** | **7,000** |

Sources: prices [B3], included allowances and promo window [B1]. Note the **[Derived]** identity $I_B\cdot c = p_B$ (1,900 × $0.01 = $19) and $I_E\cdot c = p_E$: **a seat's included-credit dollar value equals its license fee**. [B1]

## 4. Pooling and reset

- A seat's included credits are **pooled at the billing-entity (enterprise) level**; e.g. 100 Business seats → one shared pool of 190,000 AICR. [B1]
- The pool **resets monthly** (00:00 UTC on the 1st) and **does not roll over**. [B1] The simulator models exactly one month of `D = 30` days.

## 5. Budgets and limits

### 5.1 Budget scopes
Budgets exist at **enterprise**, **organization**, **repository**, **cost center**, and **user** scopes; the user scope has three variants (universal, cost-center, individual). [B4][B9] The simulator implements the enterprise budget, the cost-center budget, and per-user limits (universal + cost-center override).

### 5.2 What a budget caps
- **Enterprise / organization / cost-center budgets cap *metered* charges only** (after the pool drains); they do **not** limit use of the included pool. [B4][B5]
- **User-level budgets cap a person's *total* consumption (pool + metered)** and **always hard-stop**. [B4][B9]

### 5.3 Enterprise budget is additive (max-bill rule)
> "The enterprise budget is not a total monthly budget… Your total maximum bill is your license fees plus the enterprise budget." Example: 400 Business licenses ($7,600) + a $5,000 budget ⇒ **$12,600** max, not $5,000. [B5]

### 5.4 Stop-usage default
- "Stop usage when budget limit is reached" applies to enterprise/org/cost-center budgets and is **OFF by default** (alerts only; charges continue). [B6][B4]
- User-level budgets **always** hard-stop (no toggle). [B4]

### 5.5 Evaluation order
Per request: **user-level budget → shared pool → cost-center budget → organization budget → enterprise budget**, and the budget with the **least remaining headroom blocks first**. [B4][B5]

### 5.6 Enterprise budget scope — exclude cost-center usage  **[Fact — modeled]**
- An **enterprise-scoped** budget can be configured to **exclude cost-center usage**. When enabled, the enterprise budget governs **only** usage that is **not** attributed to a cost center ("Enterprise Only" usage); each cost center's metered spend is then bounded **solely by its own cost-center budget**, on top of the enterprise budget. [B18]
- This is a **single enterprise-level setting on the enterprise budget** — **not** a per-cost-center control. It excludes **all** cost-center usage collectively; you cannot exclude individual cost centers selectively. Existing enterprise budgets **include** cost-center usage by **default**; the exclusion is opt-in. Available via the REST API, changes are audit-logged. [B18]
- Effect on the max-bill rule (§5.3): with exclusion on, the worst-case bill becomes **license fees + enterprise budget + Σ(cost-center budgets)** — cost centers add their budgets on top of the enterprise budget instead of being capped within it.
- **Modeled** as the `enterpriseBudgetExcludesCostCenters` input (UI toggle "Enterprise budget excludes cost-center usage"; default off). In `engine.ts` `ApplyMetered`, cost-center groups then skip the enterprise-budget cap and do not accrue against it; only non-cost-center groups do.

### 5.7 AI credit paid usage policy (assumed enabled)  **[Assumption]**
The enterprise/org **"AI credit paid usage"** policy globally governs whether **any** metered usage is allowed once the pool is exhausted (if off, all post-pool usage blocks). [B1][B4] It is a **global** gate, **not** a cost-center control. The simulator **assumes it is enabled** (metered usage always occurs, then bounded by budgets) and does **not** expose it as a control; hard stops are modeled via budget "stop usage" flags. [B17]

## 6. Cost centers

- A cost center attributes usage to a business unit; it can contain users, enterprise teams, orgs, repos. [B10][B11]
- **A resource (seat) belongs to only one cost center at a time** — therefore the sum of cost-center members cannot exceed total licenses. [B10] *(This is the rule enforced by the members-slider caps.)*
- **Cost-center budget** caps that CC's metered charges. [B5]
- **Cost-center per-user budget** (`multi_user_cost_center`) sets one per-user amount for all members; caps total (pool+metered); **API-only today**. [B12][B9][B4]
- **Included-usage cap ("AI credit pool", `ai_credit_pool_enabled`)** is a single **on/off boolean** on the cost center — the only cost-center pool parameter the API exposes. It caps a CC's draw from the shared included pool to the credits **its own licenses fund** — GitHub **auto-computes** this amount (Business 3,000 / Enterprise 7,000 AI credits per license; the admin enters no number). **API-only today** (settings-UI "Early July"). [B13][B8][B10]
- **There is no per-cost-center "block vs. overage" control.** What happens when the cap is reached is governed by the **enterprise-wide overages ("AI credit paid usage") policy**: *"If AI Credit overages are allowed, users can continue after the included pool amount is reached, subject to any other budgets… If overages are not allowed, usage stops."* [B13] The earlier reading of the changelog's "block or overage" as a per-CC toggle was incorrect — it refers to this enterprise policy.
- The included-usage cap and the **cost-center budget** are **layered, not alternatives**: the cap governs the **pool (included)** phase, the budget governs the **metered** phase (hard-stop only if "Stop usage when budget limit is reached" is on). You can apply both to the same CC. [B4][B5]
- Enabling an included-usage cap does **not** redistribute the shared pool; other groups keep drawing from the remaining shared pool. [B10][B13]

## 7. Rules the engine intentionally does NOT implement (extension points)

The app models usage in **credits directly**, not tokens, so the following documented mechanics are **out of scope today**. Documented here so a future token-level version can add them.

### 7.1 Token → credit conversion  **[Fact, not implemented]**
Cost is computed from model per-token prices (input / cached / output, plus cache-write for Anthropic), summed to USD, then converted at 1 AICR = $0.01: [B2]
```
USD = Σ_type (tokens_type / 1e6) × price_type(model)
AICR = USD / 0.01
```
Extension point: replace the direct average-usage inputs (enterprise + per-cost-center `avgDevUsageCredits`, see `formulas.md` §4) with a token-based estimator producing per-user credits.

### 7.2 Auto-model-selection discount  **[Fact, not implemented]**
Paid plans get **−10%** on model cost when using auto model selection (× 0.90). [B14]

### 7.3 Data-residency / FedRAMP surcharge  **[Fact, not implemented]**
Requests under data-residency enforcement consume **+10%** AI credits (× 1.10). [B15]

If added, apply per interaction after computing base credits: `credits × 0.90 (auto) × 1.10 (residency)`. These would multiply the per-user usage in `formulas.md` §4 before the daily accounting loop.

## Citations

See [`references.md`](./references.md) for the full list. Tags used above: **[B1]**–**[B15]** map to that file.
