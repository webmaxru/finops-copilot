# FinOps Copilot — Calculation Documentation

Formal reference for **every quantity, formula, and dependency** used by the spend simulator, plus the **official GitHub documentation** that justifies each billing rule. Written to be relied on for further development.

> Code links in these documents use line numbers for `src/model/**` on `main`. If you change the engine, update the corresponding formula and its line reference here (the golden rule: `docs/` and the calculations move together).

## Documents

| File | Contents |
|------|----------|
| [`billing-model.md`](./billing-model.md) | The real GitHub Copilot usage-based billing rules the simulator is built on, each with a documentation link. Includes rules the engine deliberately does **not** implement (token→credit conversion, auto-select discount, data-residency surcharge) and where they would plug in. |
| [`formulas.md`](./formulas.md) | Every symbol and formula in formal notation, with its code location, a source link, and a **Fact / Assumption** tag. This is the canonical reference. **§2.2 provenance table** classifies every value's **min / max / default** as Asserted / Derived / Documented. |
| [`simulation-engine.md`](./simulation-engine.md) | The end-to-end algorithm: data flow, group construction, the per-day accounting loop, the budget evaluation order, outputs, and warnings — i.e. *how the formulas interconnect*. |
| [`references.md`](./references.md) | Consolidated list of every cited GitHub documentation URL. |
| [`webmcp-tools.md`](./webmcp-tools.md) | The two in-browser **WebMCP** tools the site exposes to AI agents (`get_spend_forecast`, `configure_enterprise_plan`), with their input/result schemas mapped back to the formulas. An interface over the engine — **no new billing rule**. |

## Source-of-truth legend

Each formula is tagged so future developers know what is authoritative:

- **[Fact]** — a GitHub-documented billing rule. Changing it means GitHub changed billing; update the citation.
- **[Assumption]** — a simulator **modeling choice** with no direct GitHub formula (e.g. the statistical usage distribution). Safe to tune; it does not represent official GitHub behavior. Rationale is given inline.
- **[Derived]** — an arithmetic consequence of Facts (e.g. the pool's dollar value equals license fees).

## Scope boundary (read this first)

The simulator models a developer's **monthly usage directly in AI credits (AIC)** — it does **not** model per-token consumption. Consequently the documented **token→credit conversion**, the **auto-model-selection −10% discount**, and the **data-residency +10% surcharge** are **not** applied by the engine today. They are documented in [`billing-model.md`](./billing-model.md) as the underlying reality and as extension points, because they belong in any future token-level version. Everything the engine *does* compute is specified exactly in [`formulas.md`](./formulas.md).

## Notation

| Symbol | Meaning | Unit |
|--------|---------|------|
| $c$ | credit-to-dollar rate | USD / AIC |
| $p_B, p_E$ | Business / Enterprise seat price | USD / seat / month |
| $I_B, I_E$ | included credits per Business / Enterprise seat (standard or promo) | AIC / seat / month |
| $D$ | days in the simulated month | days |
| $L$ | total users with licenses (assigned seats) | seats |
| $\rho$ | Business share of a seat pool | fraction $[0,1]$ |
| $\alpha$ | active fraction (seats that actually use Copilot) | fraction $[0,1]$ |
| $\bar u$ | average monthly usage of a *normal* active developer | AIC |
| $\phi$ | power-user share $=$ powerUsers$/L$ (input: **number of power users**, 0..$L$, default $\lfloor 0.1L\rceil$) | fraction |
| $B_{\text{pow}}$ | **average power-user budget** — a power user's usage **and** limit (overrides ULB); \$38–\$760, default \$190 | USD |
| $v$ | usage variation (coefficient of variation) | fraction $[0,1]$ |
| $B_{\text{ind}}$ | **universal user-level budget (ULB)** for normal users (default $\bar u\cdot c$; slider max $10\,\bar u\cdot c$) | USD |
| $\beta_E$ | enterprise metered budget (absolute) | USD $[0,\ \$256\cdot L]$ (max scales with total users) |
| $g$ | a group: a cost center, or the "unassigned" group | — |
| $C_g, V_g$ | group $g$ included credits (carveout) / license value | AIC / USD |

The 1 AIC = $0.01 identity means AIC and USD are interchangeable via $\times c$; the engine stores the **pool in credits** and **all budgets/spend in USD**.
