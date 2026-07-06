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

## 2. The AI credit (AIC)

- **1 AI credit = $0.01 USD**, fixed. [B1][B2]
- Copilot usage is measured in AI credits; **code completions and next-edit suggestions are not billed** and are excluded from the model. [B1][B2]

## 3. Seat prices and included allowances

| Plan | Price $p$ (USD/seat/mo) | Included $I$ (AIC/seat/mo), standard | Promo (Jun 1 – Sep 1 2026) |
|------|------------------------:|--------------------------------------:|---------------------------:|
| Copilot Business | **19** | **1,900** | **3,000** |
| Copilot Enterprise | **39** | **3,900** | **7,000** |

Sources: prices [B3], included allowances and promo window [B1]. Note the **[Derived]** identity $I_B\cdot c = p_B$ (1,900 × $0.01 = $19) and $I_E\cdot c = p_E$: **a seat's included-credit dollar value equals its license fee**. [B1]

## 4. Pooling and reset

- A seat's included credits are **pooled at the billing-entity (enterprise) level**; e.g. 100 Business seats → one shared pool of 190,000 AIC. [B1]
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
- An **enterprise-scoped** budget can be configured to **exclude cost-center usage** via a single **"Exclude cost center usage from this budget"** checkbox on the enterprise budget (labeled *Preview* in the UI; *"If selected, cost center usage will **not** be limited by this budget"*). When on, the enterprise budget governs **only** non-cost-center ("Enterprise Only") usage; every cost center is then bounded **solely by its own cost-center budget**, on top of the enterprise budget. [B18]
- This is **one collective toggle on the enterprise budget** — it excludes **all** cost-center usage from that budget at once; there is no per-cost-center selector on this control. (The concept doc's phrasing *"when exclusion is enabled for a cost center, that team's metered charges are not counted…"* [B4] describes the per-cost-center **effect**; the actual control is the single enterprise-budget checkbox. You "selectively" grant independent authority by giving specific cost centers their own budgets.) Existing enterprise budgets **include** cost-center usage by **default**; exclusion is opt-in, available via REST, and audit-logged. [B18][B4]
- Effect on the max-bill rule (§5.3): with exclusion on, the worst-case bill becomes **license fees + enterprise budget + Σ(cost-center budgets)** — cost centers add their budgets on top of the enterprise budget instead of being capped within it.
- **Modeled** as the `enterpriseBudgetExcludesCostCenters` input (UI toggle "Enterprise budget excludes cost-center usage"; default off), which faithfully mirrors the single enterprise-budget checkbox. In `engine.ts` `ApplyMetered`, cost-center groups then skip the enterprise-budget cap and do not accrue against it; only non-cost-center groups do.

### 5.7 AI credit paid usage policy (assumed enabled)  **[Assumption]**
The enterprise/org **"AI credit paid usage"** policy globally governs whether **any** metered usage is allowed once the pool is exhausted (if off, all post-pool usage blocks). [B1][B4] It is a **global** gate, **not** a cost-center control. The simulator **assumes it is enabled** (metered usage always occurs, then bounded by budgets) and does **not** expose it as a control; hard stops are modeled via budget "stop usage" flags. [B17]

## 6. Cost centers

- A cost center attributes usage to a business unit; it can contain users, enterprise teams, orgs, repos. [B10][B11]
- **A resource (seat) belongs to only one cost center at a time** — therefore the sum of cost-center members cannot exceed total licenses. [B10] *(This is the rule enforced by the members-slider caps.)*
- **Cost-center budget** caps that CC's metered charges. [B5]
- **Cost-center per-user budget** (`multi_user_cost_center`) sets one per-user amount for all members; caps total (pool+metered); **API-only today**. [B12][B9][B4]
- **Included-usage cap ("AI credit pool", `ai_credit_pool_enabled`)** is an **on/off boolean** on the cost center — the **only** cost-center pool parameter GitHub exposes. It caps a CC's draw from the shared included pool to the credits **its own licenses fund** — GitHub **auto-computes** this amount from each license's included allowance (Business 1,900 / Enterprise 3,900 standard; 3,000 / 7,000 during the promo; the admin enters no number — *"There is no custom amount to enter for this control."*). The cost-centers REST endpoint exposes only this boolean plus the auto-sized `ai_credit_pool_state` (`target_amount`/`current_amount`). **API-only today** (settings UI coming soon). [B13][B8][B10]
- **What happens _at_ the cap — continue as overage vs. stop — is the enterprise-wide "AI credit paid usage" (overages) policy, _not_ a per-cost-center control.** GitHub's field guide: *"If AI Credit overages are allowed, users can continue after the included pool amount is reached, subject to any other budgets in place. If overages are not allowed, usage stops when the applicable limit is reached."* [B13] The simulator **assumes overages are enabled** (§5.7), so at the cap the leftover spills to metered; it does **not** expose a per-CC block toggle, because none exists. See the **exception note** below.

> **⚠️ Exception — imprecise announcement wording (documented 2026-07).** The changelog *"Cost centers now support included usage caps"* [B13] says you can *"decide what happens when a cost center reaches its cap: block further included usage or let it continue as additional spend if your enterprise allows overages,"* and the concept doc [B4] says *"you choose whether its members are blocked or their additional usage continues as paid overage."* Read literally these **sound like a per-cost-center block/overage toggle**. They are **not**. The authoritative, detailed sources show there is **no such per-CC field**:
> - The **cost-center REST API** ("Set up new cost center spend controls for AI Credits" field guide, STEP 3; and [B8]) has exactly **one** body parameter for this control — `ai_credit_pool_enabled` (boolean). *"There is no custom amount to enter for this control."* There is no `block`/`overage` field.
> - Every **budget UI** (enterprise, cost-center, and the three user-level budgets) was reviewed: none contains a block-vs-overage-at-the-cap control. Metered budgets have a *"Stop usage when budget limit is reached"* checkbox; user-level budgets always hard-stop (the checkbox is forced on and disabled).
> - The block-vs-overage **outcome** is decided by the enterprise **"AI Credit overages allowed"** policy (a.k.a. "AI credit paid usage", §5.7) — a **global** gate: overages on ⇒ continue as metered at the cap; overages off ⇒ stop at the cap (globally, for every capped cost center at once), subject to any other budgets.
>
> **Conclusion:** the "block or overage" phrasing conflates that global policy with a per-CC choice. Because the simulator assumes overages are **enabled** (its documented baseline, §5.7), a capped CC's excess **always spills to metered** — matching the "overages allowed" case. A per-CC block toggle is therefore **deliberately not added** (it would model a control GitHub does not offer, violating the design invariant in `formulas.md` §2). Modeling the global "overages off" case is a possible future extension (`formulas.md` §10 S7).
- The included-usage cap and the **cost-center budget** are **layered, not alternatives**: the cap governs the **pool (included)** phase, the budget governs the **metered** phase (hard-stop only if "Stop usage when budget limit is reached" is on). You can apply both to the same CC. [B4][B5]
- Enabling an included-usage cap carves out that cost center's own credits into a sub-pool; the **remaining** shared pool is unchanged and other groups keep drawing from it. This non-redistribution is **documented**: GitHub's field guide states enabling the cap *"does not retroactively redistribute the shared enterprise AI Credit pool."* [B13][B10]

## 7. Rules the engine intentionally does NOT implement (extension points)

The app models usage in **credits directly**, not tokens, so the following documented mechanics are **out of scope today**. Documented here so a future token-level version can add them.

### 7.1 Token → credit conversion  **[Fact, not implemented]**
Cost is computed from model per-token prices (input / cached / output, plus cache-write for Anthropic), summed to USD, then converted at 1 AIC = $0.01: [B2]
```
USD = Σ_type (tokens_type / 1e6) × price_type(model)
AIC = USD / 0.01
```
Extension point: replace the direct average-usage inputs (enterprise + per-cost-center `avgDevUsageCredits`, see `formulas.md` §4) with a token-based estimator producing per-user credits.

### 7.2 Auto-model-selection discount  **[Fact, not implemented]**
Paid plans get **−10%** on model cost when using auto model selection (× 0.90). [B14]

### 7.3 Data-residency surcharge  **[Fact, not implemented]**
Requests processed under data-residency enforcement consume **+10%** AI credits (× 1.10): *"if an interaction would normally consume 100 AI credits, the same interaction processed with this enforcement enabled consumes 110 AI credits."* [B15]

If added, apply per interaction after computing base credits: `credits × 0.90 (auto) × 1.10 (residency)`. These would multiply the per-user usage in `formulas.md` §4 before the daily accounting loop.

## Citations

See [`references.md`](./references.md) for the full list. Tags used above: **[B1]**–**[B15]** map to that file.
