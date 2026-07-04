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

## 6. Cost centers

- A cost center attributes usage to a business unit; it can contain users, enterprise teams, orgs, repos. [B10][B11]
- **A resource (seat) belongs to only one cost center at a time** — therefore the sum of cost-center members cannot exceed total licenses. [B10] *(This is the rule enforced by the members-slider caps.)*
- **Cost-center budget** caps that CC's metered charges. [B5]
- **Cost-center per-user budget** (`multi_user_cost_center`) sets one per-user amount for all members; caps total (pool+metered); **API-only today**. [B12][B9][B4]
- **Included-usage cap** (`ai_credit_pool_enabled`) is a control **separate from** the cost-center budget. It caps a CC's draw from the shared pool **before** the metered phase, limiting it to the credits **its own licenses fund** — GitHub **auto-computes** this amount from the CC's licenses (the admin enters no number). **You explicitly choose what happens when the cap is hit: `block` members, or let usage continue as paid `overage`** — this block/overage choice lives on the cap itself, **not** on the metered budget. **API-only today** (settings-UI management "coming soon"). [B13][B8][B10]
- The two cost-center controls are **layered, not alternatives**: the included-usage cap governs the **pool (included)** phase (block/overage), while the **cost-center budget** governs the **metered** phase after the pool is exhausted (hard-stop only if "Stop usage when budget limit is reached" is on). You can apply both to the same CC. [B4][B5]
- **`overage` is itself gated by the enterprise "AI credit paid usage" policy**: additional (metered) usage only occurs if that policy is enabled; if it is off, usage is blocked once the pool is exhausted regardless of budgets — so choosing "overage" still yields a block when paid usage is disabled. Once overage enters the metered phase it is then subject to the CC → org → enterprise metered budgets. [B4]
- Enabling an included-usage cap does **not** redistribute the shared pool; other groups keep drawing from the remaining shared pool. [B10]

## 7. Rules the engine intentionally does NOT implement (extension points)

The app models usage in **credits directly**, not tokens, so the following documented mechanics are **out of scope today**. Documented here so a future token-level version can add them.

### 7.1 Token → credit conversion  **[Fact, not implemented]**
Cost is computed from model per-token prices (input / cached / output, plus cache-write for Anthropic), summed to USD, then converted at 1 AICR = $0.01: [B2]
```
USD = Σ_type (tokens_type / 1e6) × price_type(model)
AICR = USD / 0.01
```
Extension point: replace the direct `avgDevUsageCredits` input (see `formulas.md` §4) with a token-based estimator producing per-user credits.

### 7.2 Auto-model-selection discount  **[Fact, not implemented]**
Paid plans get **−10%** on model cost when using auto model selection (× 0.90). [B14]

### 7.3 Data-residency / FedRAMP surcharge  **[Fact, not implemented]**
Requests under data-residency enforcement consume **+10%** AI credits (× 1.10). [B15]

If added, apply per interaction after computing base credits: `credits × 0.90 (auto) × 1.10 (residency)`. These would multiply the per-user usage in `formulas.md` §4 before the daily accounting loop.

### 7.4 Enterprise "AI credit paid usage" policy gate  **[Fact, not implemented]**
Additional (metered / `overage`) usage only occurs if the enterprise/organization **"AI credit paid usage"** policy (paid overage) is enabled — this is a **real GitHub governance control**: Enterprise/Org → Settings → Copilot (AI controls / billing policies), **default off**, and also settable via the REST API. [B4][B17] When it is disabled, usage is **blocked** as soon as the shared pool is exhausted — regardless of any budget, and regardless of an included-usage cap set to `overage`. The simulator assumes paid usage is **allowed** and instead models hard stops via the budget "stop usage" flags (`formulas.md` §6c) and the included-cap block mode. Because it maps to a real governance control (not an invented knob), modeling it **satisfies the §2 design invariant** and is therefore a valid extension point: a global **"AI credit paid usage"** toggle that, when off, forces all post-pool demand to block (equivalent to every metered budget being $0 with stop-usage on).

## Citations

See [`references.md`](./references.md) for the full list. Tags used above: **[B1]**–**[B15]** map to that file.
