# Formulas

Canonical, formal specification of every quantity the engine computes. Each row/section gives the **formula**, its **code location** (pinned to `a033e79`), a **source** (GitHub doc tag `[Bn]` from [`references.md`](./references.md), or a modeling note), and a **tag**: **[Fact]**, **[Derived]**, or **[Assumption]**.

> **Provenance at a glance:** for a single table classifying **every value's min, max, and default** as Asserted / Derived / Documented, see **§2.2 Provenance of every configurable value** below.

Convention: `round` = round half to +∞ (JavaScript `Math.round`); $\lfloor\cdot\rceil$ denotes it. All money in USD, all credits in AICR, related by $c$.

---

## 1. Constants — `src/model/defaults.ts`

| Symbol | Value | Code | Source | Tag |
|--------|------:|------|--------|-----|
| $c$ | $0.01$ USD/AICR | `defaults.ts:4` (`CREDIT_USD`) | [B1][B2] | Fact |
| $p_B,\ p_E$ | $19,\ 39$ | `defaults.ts:7-10` (`SEAT_PRICE`) | [B3] | Fact |
| $I_B^{std},I_E^{std}$ | $1900,\ 3900$ | `defaults.ts:13-16` (`INCLUDED`) | [B1] | Fact |
| $I_B^{promo},I_E^{promo}$ | $3000,\ 7000$ | `defaults.ts:13-16` | [B1] | Fact |
| $D$ | $30$ | `defaults.ts` (`SIM_DAYS`) | one calendar month | Assumption |

Included-allowance selection (`includedPerSeat`, `defaults.ts:18-20`) — **[Fact]** [B1]:

$$I_B = \mathrm{promo}\,?\,I_B^{promo}:I_B^{std}, \qquad I_E = \mathrm{promo}\,?\,I_E^{promo}:I_E^{std}$$

---

## 2. Inputs — `src/model/types.ts` (`EnterpriseInputs`), defaults in `defaults.ts:52-71`

$L,\ \rho_B,\ \alpha,\ \bar u,\ n_{\text{pow}},\ B_{\text{pow}},\ v,\ B_{\text{ind}},\ \beta_E,\ \mathrm{promo},\ \mathrm{paid},\ \mathrm{stop}_E,\ \mathrm{seed}$, and a list of cost centers $\{cc\}$. Defaults: $L{=}100,\ \rho_B{=}0.7,\ \alpha{=}0.8,\ \bar u{=}5000,\ n_{\text{pow}}{=}10,\ B_{\text{pow}}{=}\$190,\ v{=}0.3,\ B_{\text{ind}}{=}50,\ \beta_E{=}\$2{,}620,\ \mathrm{promo}{=}\text{false},\ \mathrm{paid}{=}\text{true},\ \mathrm{stop}_E{=}\text{true}$. Here $\beta_E$ is the enterprise metered budget in **USD** (§5.2); $n_{\text{pow}}$ is the number of power users and $B_{\text{pow}}$ their individual budget (§2.1); $\mathrm{paid}$ is the enterprise "AI credit paid usage" policy (§6c).

Each cost center $cc$ carries: `members` $s_{cc}$, plan-mix (inherit or own $\rho_{cc}$), per-user limit (inherit or own $B^{user}_{cc}$), metered budget (absolute USD $\beta_{cc}$, §5.3), `stopUsageBudget` $\mathrm{stop}_{cc}$, `includedCapEnabled` (capped?), `includedCapMode` ∈ {block, overage}.

> **Design invariant (governance vs. what-if).** Every input that changes the *simulated outcome* is exactly one of two kinds: **(1) a behavioral / sizing what-if assumption** the analyst makes about their own org — total users, plan mix, active %, usage level $\bar u$ and variation $v$, power-user count $\phi$ — which has **no** GitHub setting and is tagged **[Assumption]**; or **(2) a governance control** — the universal / cost-center / individual **user-level budgets**, the **cost-center and enterprise metered budgets**, their **"stop usage"** flags, and the cost-center **included-usage cap** with its **block/overage** choice — each of which **must** correspond to a real GitHub governance control exposed in the **UI or REST API** and is cited with a `[Bn]` tag. No knob that affects spend or blocking may model a mechanism GitHub does not actually offer; the provenance table below and §5–§6 enforce this by tagging every governance control **Doc [Bn]** and every assumption **A**.

### 2.1 Universal ULB & power-user budget — `defaults.ts` (`DEFAULT_UNIVERSAL_ULB_USD`, `UNIVERSAL_ULB_MAX_MULTIPLE`, `DEFAULT_POWER_USER_BUDGET_USD`, `POWER_USER_BUDGET_MIN/MAX_USD`), UI in `GlobalControls.tsx`; validated in `engine.test.ts`  **[Assumption]**

**Universal user-level budget (ULB)** $B_{\text{ind}}$ — the per-user limit for **normal** users — is derived from the average developer monthly usage $\bar u$ (credits), converted to USD via $c$:
$$B_{\text{ind}}^{\text{default}} = \bar u \cdot c, \qquad B_{\text{ind}}^{\max} = 10\,(\bar u \cdot c)$$
- **Default** (initial value / on reset) uses the default $\bar u$: $5000\cdot\$0.01=\$50$.
- **Slider max** tracks the **current** avg-usage slider live: $10\times(\bar u\cdot c)$; at defaults $=\$500$. If $\bar u$ is lowered below the current value, the UI keeps it in range so the thumb stays usable (§9).

**Power-user individual budget** $B_{\text{pow}}$ = `avgPowerUserBudget` — a power user's modeled consumption **and** their per-user limit, overriding the ULB [B16]. Bounds/default are multiples of the Copilot Business seat price $p_B=\$19$:
$$B_{\text{pow}}^{\min}=2p_B=\$38,\qquad B_{\text{pow}}^{\max}=40p_B=\$760,\qquad B_{\text{pow}}^{\text{default}}=10p_B=\$190$$
The **number of power users** is an absolute count on $[0,\ L]$ (max = total users, dynamic), default $\lfloor 0.1\,L\rceil = 10$; the power-user share is $\phi=\text{powerUsers}/L$ (§4).

GitHub has no formula for a per-user budget *amount*; it documents *that* you set higher individual overrides for power users [B16] and that user-level budgets hard-stop total consumption [B4]. The specific amounts here are modeling choices.

### 2.2 Provenance of every configurable value — min · max · default

Explicit classification of **every** value's bounds and default. **Kind:** **A** = *Asserted* (a fixed design choice/assumption — no formula, no GitHub source); **Calc** = *Derived/Calculated* (formula in the Basis column, cross-referenced to §2.1 / §5.2 / §9); **Doc** = set by *official GitHub documentation* (source `[Bn]`, see [`references.md`](./references.md)). These correspond to the doc-wide tags **[Assumption] / [Derived] / [Fact]** respectively. *A(frac)* = an asserted logical bound of a fraction $[0,1]$. A dash (—) = the bound does not apply (booleans / constants). Values shown at the shipped defaults; $c=\$0.01$.

**Global inputs** — `defaults.ts` (`RANGES`, `DEFAULT_INPUTS`)

| Parameter | Min | Max | Default | Basis (formula / rationale / source) |
|---|---|---|---|---|
| Total users with licenses | 1 · **A** | 1,000 · **A** | 100 · **A** | UX cap; GitHub sets no seat maximum |
| Business share $\rho_B$ | 0 · **A(frac)** | 1 · **A(frac)** | 0.70 · **A** | assumed 70/30 Business:Enterprise mix |
| Active % $\alpha$ | 0 · **A(frac)** | 1 · **A(frac)** | 0.80 · **A** | assumed 80% of seats active |
| Avg dev usage $\bar u$ | 1,900 cr · **Doc** | 19,000 cr · **Calc** | 5,000 cr ($50) · **A** | min = one Business seat's included credits [B1]; max $=10\times$ min (10× is **A**, base [B1]); default chosen (doubled from 2,500 on request) |
| Number of power users | 0 · **A** | $L$ (total users) · **Calc** | $\lfloor 0.1L\rceil$ = 10 · **A** | §2.1: max = total users (dynamic); default = 10% of total users |
| Average power-user budget $B_{\text{pow}}$ | $38 = 2p_B · **Calc** | $760 = 40p_B · **Calc** | $190 = 10p_B · **Calc** | §2.1: multiples of the Business seat price $p_B=\$19$ [B3] (the 2×/40×/10× multiples are **A**); overrides the ULB [B16] |
| Usage variation $v$ | 0 · **A(frac)** | 1 · **A(frac)** | 0.30 · **A** | CV bound $[0,1]$ chosen; moderate default |
| Universal ULB $B_{\text{ind}}$ | $0 · **A** | $10(\bar u c)$ = $500 · **Calc** | $\bar u c$ = $50 · **Calc** | §2.1: default $=\bar u\cdot c$; max $=10\,\bar u\cdot c$ (live); 10× is **A**, $c$ [B1]. $0 blocks the user ([B4]) |
| Enterprise limit $\beta_E$ | $0 · **A** | $\$256\cdot L$ = $25,600 @ L=100 · **Calc** | $\text{metered}_{\text{ref}}$ = $2,620 · **Calc** | §5.2: default = expected metered at defaults ($v{=}0$); **max scales with total users** ($\$256\times L$; recomputed only when total users changes) |
| Promo allowances | — | — | false · **A** | default shows standard allowances; the values it selects (1,900/3,900 ↔ 3,000/7,000) are **Doc** [B1] |
| AI credit paid usage $\mathrm{paid}$ | — | — | true · **A** | enterprise/org policy gating **all** metered usage (§6c); when false, every post-pool request blocks. Default **A** (GitHub's real default not asserted); that the control exists is **Doc** [B1][B4][B17] |
| Stop usage (budgets) | — | — | true · **A** | models hard caps; **deliberately diverges** from GitHub's real default (OFF) [B6] |
| Seed | — | — | 12345 · **A** | arbitrary; makes sampling deterministic |

**Cost-center inputs** — `defaults.ts` (`makeDefaultCostCenter`, `RANGES`), UI in `CostCenterCard.tsx`

| Parameter | Min | Max | Default | Basis (formula / rationale / source) |
|---|---|---|---|---|
| CC members (seats) | 0 · **A** | $\min(1000,\ L-\!\sum_{\text{other CC}})$ · **Calc + Doc** | 30 · **A** | a seat belongs to one cost center ⇒ $\sum$ members $\le L$ [B10]; 1,000 cap is **A**; live (§9); default clamps to remaining seats on add |
| CC Business share (own) | 0 · **A(frac)** | 1 · **A(frac)** | 0.70 · **A** | as global; used only when not inheriting |
| CC per-user limit (own) | $0 · **A** | $500 · **A** | $50 · **A** | fixed range — **not** derived from $\bar u$ (unlike $B_{\text{ind}}$); default CC inherits $B_{\text{ind}}$ instead |
| CC metered budget $\beta_{cc}$ | $0 · **A** | $\$256\cdot s_{cc}$ · **Calc** | $\$26.20\cdot s_{cc}$ ($786 @ 30 seats) · **Calc** | §5.3: **same per-seat logic as the enterprise limit** (§5.2), scaled by the CC's seats $s_{cc}$: default $=\tfrac{\$2{,}620}{100}s_{cc}$, max $=\$256\,s_{cc}$ (recomputed only when the CC's seats change). Budgets cap metered [B5] |
| CC included-usage cap | — | — | off · **A** | when on, the cap **amount** is auto-sized to the CC's own licenses' credits — **Doc** [B13][B10] |
| CC included-cap mode | — | — | block · **A** | options {block, overage} are **Doc** [B13] |
| CC stop usage | — | — | true · **A** | models hard caps |

**Constants** — `defaults.ts` (see §1)

| Constant | Value | Kind | Source |
|---|---|---|---|
| Credit rate $c$ | $0.01 / AICR | **Doc** | 1 AI credit = $0.01 [B1][B2] |
| Seat price $p_B / p_E$ | $19 / $39 | **Doc** | [B3] |
| Included $I_B / I_E$ (standard) | 1,900 / 3,900 | **Doc** | [B1] |
| Included (promo → Sep 1 2026) | 3,000 / 7,000 | **Doc** | [B1] |
| Simulated month $D$ | 30 days | **A** | one calendar month |

---

## 3. Group construction — `makeGroup`, `engine.ts:57-84`

A **group** $g$ is one cost center or the single "unassigned" group. Groups are built at `engine.ts:95-132`. For seats $s_g$ and Business share $\rho_g$:

$$
\begin{aligned}
s_g &= \max(0,\ \lfloor \text{members}\rceil) & &\text{[Assumption: members = assigned seats]}\\
b_g &= \lfloor s_g\,\rho_g \rceil,\qquad e_g = s_g - b_g & &\text{business / enterprise seats}\\
C_g &= b_g\,I_B + e_g\,I_E & &\text{included credits (carveout) — [Fact] [B1]}\\
V_g &= b_g\,p_B + e_g\,p_E & &\text{license value (USD) — [Fact] [B3]}\\
A_g &= \lfloor s_g\,\alpha \rceil & &\text{active users — [Assumption]}\\
U_g &= B^{user}_g / c & &\text{per-user limit in credits — [Fact] [B4]}\\
\beta_g &= \begin{cases}\text{budgetUsd}_{cc} & g\ \text{is a cost center}\\ \text{null} & g = \text{unassigned}\end{cases} & &\text{CC metered budget — absolute USD (§5.3); [Fact that CC budgets cap metered [B5]]}
\end{aligned}
$$

**Inheritance** (`engine.ts:104,108`) — **[Fact: these controls exist [B4][B5]]**:
$$\rho_g=\text{inherit}?\ \rho_B:\rho_{cc},\qquad B^{user}_g=\text{inherit}?\ B_{\text{ind}}:B^{user}_{cc}$$
The CC metered budget $\beta_g$ is **always an explicit absolute USD value** ($\text{budgetUsd}_{cc}$), taken directly from the CC slider — it is not inherited and no longer a multiple of license value. Its default and slider max scale with the CC's own seats (§5.3). **[Assumption of parametrization]**

**Unassigned group** (`engine.ts:116-132`): $s_U=\max(0,\ L-\sum_{cc}s_{cc})$, business share $\rho_B$, $U_U=B_{\text{ind}}/c$, never capped, $\beta_U=\text{null}$. **[Fact: seats not in a cost center bill to the enterprise [B11]]**

---

## 4. Per-user usage model — `engine.ts:148-167`  **[Assumption]**

> No GitHub formula exists for how much an individual consumes; §4 is the simulator's statistical model. GitHub only states qualitatively that heavier/agentic use costs more credits [B1]. Safe to tune.

Power users are the first $\lfloor A_g\,\phi \rceil$ active users of each group, where $\phi = \text{powerUsers}/L$ is the power-user share of all licensed users (`engine.ts:150`). Each user has a monthly **target** $\tau_i$ and a per-user **limit** $U_i$ (`engine.ts:151-165`):

$$(\tau_i,\ U_i) = \begin{cases} (B_{\text{pow}},\ B_{\text{pow}}) & \text{power user — individual budget override (§2.1) [B16]}\\ (\bar u,\ U_g) & \text{normal user — limit is the group's universal/CC ULB}\end{cases}$$

where $B_{\text{pow}} = \text{avgPowerUserBudget}/c$ (credits). A power user is modeled to consume at their individual budget, which **also caps them**, overriding the universal/CC ULB (GitHub's power-user override guidance [B16]).

Monthly draw (`engine.ts:156`) and daily allocation (`engine.ts:157-164`):
$$\mu_i \sim \mathrm{LogNormal}(\text{mean}=\tau_i,\ \mathrm{CV}=v), \qquad
x_{i,d} = \mu_i\,\frac{w_{i,d}}{\sum_{d'=1}^{D} w_{i,d'}},\quad w_{i,d}\sim \mathrm{LogNormal}(\text{mean}=1,\ \mathrm{CV}=v)$$

By construction $\sum_{d=1}^{D} x_{i,d} = \mu_i$ (a user's daily shares sum to its monthly draw). If $v=0$, $\mu_i=\tau_i$ and $x_{i,d}=\tau_i/D$ (uniform). Because a power user's target equals their limit, at $v=0$ they consume exactly their budget and are **not** blocked *by their own limit*; only variation ($v>0$) pushes some above their budget. Note this is only the user-level limit — a binding cost-center or enterprise **metered-budget stop** can still block a user at $v=0$ (see §6d).

### 4.1 Log-normal parametrization — `src/model/rng.ts:29-34`  **[Assumption]**
For target arithmetic mean $\mu_X$ and coefficient of variation $v$:
$$\sigma^2=\ln(1+v^2),\quad \mu=\ln(\mu_X)-\tfrac{\sigma^2}{2},\quad X=\exp(\mu+\sigma Z),\ Z\sim N(0,1)$$
This choice guarantees $\mathbb E[X]=\mu_X$ and $\mathrm{sd}(X)/\mathbb E[X]=v$. $Z$ via Box–Muller (`rng.ts:17-23`): $Z=\sqrt{-2\ln U_1}\cos(2\pi U_2)$; $U_1,U_2$ from a seeded **mulberry32** generator (`rng.ts:5-14`) → **deterministic** given `seed`.

---

## 5. Enterprise aggregates — `engine.ts:135-145`

$$
\begin{aligned}
B=\textstyle\sum_g b_g,\quad E=\textstyle\sum_g e_g & & \text{total seats by plan}\\
F &= B\,p_B + E\,p_E & &\text{license fees — [Fact] [B3]}\\
P &= \textstyle\sum_g C_g & &\text{total included pool — [Fact] [B1]}\\
\beta_E &= \text{enterpriseLimitUsd} & &\text{enterprise metered budget (absolute USD) — [Assumption]}\\
M &= F + \beta_E & &\text{max possible bill — [Fact] [B5]}\\
A &= \textstyle\sum_g A_g & &\text{active users}
\end{aligned}
$$

**[Derived]** $P\cdot c = F$ (pool dollar value equals license fees), since $I_B c=p_B,\ I_E c=p_E$. [B1]

### 5.1 Pool partition — `engine.ts:143-145`  **[Fact]** [B10]
$$P_{\text{shared}}=\sum_{g:\ \neg\text{capped}} C_g, \qquad \text{sub}_g = C_g\ \ \text{for each capped cost center}$$
Capped cost centers draw from their own $\text{sub}_g$; everyone else shares $P_{\text{shared}}$. Enabling a cap carves that CC's credits out of the shared pool but does not redistribute the rest. [B10]

### 5.2 Default & maximum of the enterprise limit — `defaults.ts` (`DEFAULT_ENTERPRISE_LIMIT_USD`, `ENTERPRISE_LIMIT_MAX_USD`); validated in `engine.test.ts`  **[Assumption]**

The enterprise limit is an absolute USD budget on the slider range $[0,\ \beta_E^{\max}(L)]$. The **default** is derived from a **reference run of the shipped default inputs at $v=0$** (no usage variation), budgets non-binding:
$$U_{\text{ref}}=\sum_{i\in\text{active}}\min(\tau_i,\ U_i)\cdot c,\qquad \text{metered}_{\text{ref}}=\max\big(0,\ U_{\text{ref}}-P\cdot c\big),\qquad \boxed{\ \beta_E^{\text{default}}=\text{metered}_{\text{ref}}\ }$$
At the shipped defaults ($v=0$): **72 normal** users consume \$50 each (target \$50 = universal ULB) and **8 power** users consume \$190 each (their individual budget), so $U_{\text{ref}}=72(\$50)+8(\$190)=\$5{,}120$. The \$2,500 pool ($P\cdot c$) is exceeded, so $\text{metered}_{\text{ref}}=\$2{,}620$ ⇒ **default $=\$2{,}620$**.

**Slider max (dynamic):** to give larger orgs enough range, the max **scales linearly with total users** $L$:
$$\boxed{\ \beta_E^{\max}(L)=\text{ENTERPRISE\_LIMIT\_MAX\_USD}\times\tfrac{L}{100}=\$256\times L\ }$$
`ENTERPRISE_LIMIT_MAX_USD` $=\$25{,}600$ is the max at the default $L=100$ (equivalently $5\times U_{\text{ref}}=5\times\$5{,}120$). As a pure function of $L$, the max **recomputes only when "Total users with licenses" changes**; the default and any user-set value are untouched (kept in range if $L$ is lowered, like §9). Budgets cap metered charges on top of license fees [B5]; the "5×" base and "\$256/user" scale are modeling choices. (`enterpriseLimitMaxUsd` and the $v=0$ reference are checked in `engine.test.ts`.)

### 5.3 Default & maximum of a cost-center budget — `defaults.ts` (`CC_BUDGET_DEFAULT_PER_SEAT_USD`, `ccBudgetDefaultUsd`, `ccBudgetMaxUsd`); validated in `engine.test.ts`  **[Assumption]**

A cost center's metered budget $\beta_{cc}$ is an absolute USD value on the slider range $[0,\ \beta_{cc}^{\max}(s_{cc})]$ — **the same construction as the enterprise limit (§5.2), but scaled by the cost center's own seats $s_{cc}$ instead of total users $L$.** Both bounds are the enterprise per-seat rates multiplied by the CC's seats:
$$
\boxed{\ \beta_{cc}^{\text{default}}(s_{cc})=\underbrace{\tfrac{\text{DEFAULT\_ENTERPRISE\_LIMIT\_USD}}{100}}_{=\,\$26.20\ \text{/seat}}\times s_{cc},\qquad
\beta_{cc}^{\max}(s_{cc})=\underbrace{\text{ENTERPRISE\_LIMIT\_MAX\_PER\_LICENSE\_USD}}_{=\,\$256\ \text{/seat}}\times s_{cc}\ }
$$

- **Per-seat default \$26.20** is the enterprise default (\$2,620, the expected metered spend at defaults, §5.2) spread over its 100 licenses — so a CC that were sized like the whole default enterprise ($s_{cc}=100$) would default to \$2,620. A fresh **30-seat** cost center therefore defaults to $\$26.20\times30=\boxed{\$786}$.
- **Per-seat max \$256** reuses `ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD` (so $s_{cc}=100\Rightarrow\$25{,}600$, matching the enterprise max at $L=100$).
- **Min \$0**, identical to the enterprise limit; \$0 with `stopUsageBudget` on hard-stops the CC at its included pool.

As a pure function of $s_{cc}$, `ccBudgetMaxUsd` **recomputes only when the CC's seats change**; the current/user-set value is untouched (kept in range in the UI via `max(ccBudgetMaxUsd(sₒcc), value)`), exactly like the enterprise max. On creating a cost center the default is scaled to its actual (clamped) seats (`store.ts` `addCostCenter`). The CC budget caps that CC's metered charges inside `ApplyMetered` (§6c); the per-seat rates are inherited modeling choices from §5.2.

---

## 6. Daily accounting loop — `engine.ts:195-255`

State: $P_{\text{shared}}$, each $\text{sub}_g$, per-group metered $\mathrm{Me}_g$ (USD) and included $\mathrm{In}_g$ (USD), enterprise metered $\mathrm{Me}_E$, and per-user cumulative credits $\mathrm{cum}_i$ (all start 0). For each day $d=1..D$, for each **unblocked** active user $i$ in group $g$:

**(a) User-level limit room (hard stop)** — `engine.ts:196-205` — **[Fact]** [B4]
Each user $i$ has a per-user limit $U_i$ (§4: normal → the group ULB $U_g$; power → their individual budget $B_{\text{pow}}$, which overrides the ULB [B16]). With remaining room $r_i = U_i - \mathrm{cum}_i$: if $r_i \le 0$ the user has already reached their limit and is **blocked** for the rest of the month (skipped). Otherwise the day's servable amount is capped at the room, $\sigma_{i,d}=\min(x_{i,d},\, r_i)$. Whether the user is *counted* blocked is decided at commit time in (d).

**(b) Included then metered routing** — `engine.ts:207-226` — **[Fact]** [B1][B10]

Capped group:
$$\mathrm{inc}=\min(\sigma_{i,d},\ \text{sub}_g),\quad \text{sub}_g\mathrel{-}=\mathrm{inc};\qquad \ell=\sigma_{i,d}-\mathrm{inc}$$
$$\text{metered credits}=\begin{cases}\textsc{ApplyMetered}(g,\ell) & \text{capMode}=\text{overage}\\ 0\ (\ell\ \text{dropped}) & \text{capMode}=\text{block}\end{cases}$$

Non-capped group (shared pool):
$$\mathrm{inc}=\min(\sigma_{i,d},\ P_{\text{shared}}),\quad P_{\text{shared}}\mathrel{-}=\mathrm{inc};\qquad \ell=\sigma_{i,d}-\mathrm{inc};\qquad \text{metered credits}=\textsc{ApplyMetered}(g,\ell)$$

**(c) `ApplyMetered(g, credits)`** — `engine.ts:181-199` — **[Fact]** [B1][B4][B5]
$$
\begin{aligned}
\text{if } \neg\,\mathrm{paid}:\ & \textbf{return } 0 && \text{("AI credit paid usage" policy off — no metered anywhere)}\\
a &= \text{credits}\cdot c && \text{(requested USD)}\\
\text{if } \beta_g\neq\text{null} \wedge \mathrm{stop}_g:\ & a \leftarrow \min\!\big(a,\ \max(0,\ \beta_g-\mathrm{Me}_g)\big) && \text{CC budget cap}\\
\text{if } \mathrm{stop}_E:\ & a \leftarrow \min\!\big(a,\ \max(0,\ \beta_E-\mathrm{Me}_E)\big) && \text{enterprise budget cap}\\
& \mathrm{Me}_g\mathrel{+}=a,\quad \mathrm{Me}_E\mathrel{+}=a && \text{commit}\\
& \textbf{return } a/c && \text{(metered credits actually billed)}
\end{aligned}
$$
The leading $\neg\,\mathrm{paid}$ guard is the enterprise/org **"AI credit paid usage"** policy (§5.6 of `billing-model.md`): when off, **no** metered credits are ever served, so every user's post-pool demand is unmet and they are blocked (§6d). It is a **global** gate, applied identically to every group — not a cost-center control. [B1][B4] The nested `min` implements **"lowest remaining headroom wins"** across the CC and enterprise budgets. [B4] When a `stop` flag is false, that cap term is skipped, so charges accrue uncapped (alerts-only behavior). [B6]

**(d) Commit user & blocked determination** — `engine.ts:228-240` — **[Fact]** [B4][B16]
$$\text{spent}=\mathrm{inc}+\text{metered credits};\quad \mathrm{cum}_i\mathrel{+}=\text{spent};\quad \mathrm{In}_g\mathrel{+}=\mathrm{inc}\cdot c$$
User $i$ is counted **blocked** for the month iff a hard stop prevented them from consuming their intended usage $x_{i,d}$ that day:
$$\text{spent} < x_{i,d}-\varepsilon\ \ (\varepsilon=10^{-9})\ \Rightarrow\ \text{block }i$$
This single condition unifies **every** hard stop the model supports — it is not just the user-level limit:

- **User limit (ULB / power-user override):** room ran out, so $\sigma_{i,d}=r_i<x_{i,d}$ and hence $\text{spent}\le\sigma_{i,d}<x_{i,d}$. Equivalently $\mu_i>U_i$ over the month. [B4][B16]
- **Cost-center included-usage cap, block mode:** the sub-pool leftover $\ell$ is dropped, so $\text{spent}=\mathrm{inc}<\sigma_{i,d}=x_{i,d}$. [B10]
- **Metered-budget stop (cost-center or enterprise, when its stop flag is on):** once the budget is exhausted `ApplyMetered` serves less than requested, so $\text{spent}<x_{i,d}$. [B4][B6]

Being served in full ($\text{spent}=x_{i,d}$, i.e. reaching a limit *exactly*) is **not** blocked. When no stop flag is on and no pool cap binds, only the user limit can block, so this matches the earlier user-limit-only behaviour; turning on a metered-budget stop that binds now correctly counts the users it cuts off (previously undercounted).

Evaluation order across a request is exactly **user-limit → pool → CC budget → enterprise budget**, matching GitHub's documented order. [B4]

---

## 7. Outputs — `SimResult`

### 7.1 Per-day snapshots
Per group (`engine.ts:246-256`): for day $d$
$$\text{poolRemaining}=\begin{cases}\text{sub}_g & \text{capped}\\ \text{NaN} & \text{shares the pool}\end{cases},\quad \text{included}=\mathrm{In}_g,\ \text{metered}=\mathrm{Me}_g,\ \text{bill}=V_g+\mathrm{Me}_g$$
Enterprise (`engine.ts:258-267`):
$$\text{poolRemaining}=P_{\text{shared}}+\sum_{g:\text{capped}}\text{sub}_g,\quad \text{included}=\mathrm{In}_{\text{tot}},\ \text{metered}=\mathrm{Me}_{\text{tot}},\ \text{bill}=F+\mathrm{Me}_{\text{tot}}$$
`blockedUsers` = count of blocked users at end of day $d$ (set at `engine.ts:240`; counted at `247,258`).

### 7.2 Scalars — `engine.ts:270-302`
$$\text{poolExhaustedDay}=\min\{d: P_{\text{shared}}\le 0\}\ \text{or null (never)}\ \ (\text{engine.ts:243})$$
$$\text{poolUsedPct}=\min\!\Big(1,\ \frac{\mathrm{In}_{\text{tot}}}{P\cdot c}\Big)\ \ (\text{engine.ts:288})$$
Month-end values (`engine.ts:347-351`, read from day $D$'s snapshot): $\text{monthEndBill}=F+\mathrm{Me}_{\text{tot}}$, $\text{monthEndMetered}=\mathrm{Me}_{\text{tot}}$, $\text{monthEndIncluded}=\mathrm{In}_{\text{tot}}$, $\text{monthEndBlocked}=\text{blocked}(D)$.

---

## 8. Warnings — `engine.ts:291-320`  (diagnostics; not billing formulas)

1. **Over-allocation** (`ccSeatSum > L`): CC seats exceed licenses. [B10] — reduce members.
2. **Limit below included share**: $B_{\text{ind}} < \dfrac{P\cdot c}{L}$ ⇒ users may be blocked before using their included share. [B1][B4]
3. **Over-provisioned**: `poolExhaustedDay = null` ⇒ pool never empties; metered = $0.
4. **Metered exceeds budget with stop off**: $\neg\mathrm{stop}_E \wedge \mathrm{Me}_{\text{tot}}>\beta_E$. [B6]
5. **Shared-pool drain**: a non-capped CC with $\mathrm{In}_g > C_g\cdot c\cdot 1.25$ ⇒ suggest an included-usage cap. [B10]

---

## 9. UI-level constraints (real-time validation)

Enforce **[Fact]** [B10] "a seat belongs to only one cost center ⇒ Σ members ≤ L":

- **Members slider max** — `CostCenterCard.tsx` (`membersMax`):
$$\text{available}=\max\!\big(0,\ L-\!\!\sum_{c\neq g} s_c\big),\qquad \text{membersMax}=\min\!\big(\text{RANGES.ccMembers.max},\ \max(\text{available},\ s_g)\big)$$
Keeping $s_g$ in the `max` lets the thumb stay usable if $L$ was lowered below the current sum (value can only decrease).
- **Add-cost-center clamp** — `state/store.ts` (`addCostCenter`): new CC `members = min(default, max(0, L − Σ members))`; the "Add" button is disabled when no seats remain (`CostCenterList.tsx`).
- **Assignment summary** — `CostCenterList.tsx`: shows $\sum_{cc}s_{cc}$ / $L$ assigned and $\max(0, L-\sum s_{cc})$ unassigned (red if over).

---

## 10. Known simplifications (vs. GitHub reality)

| # | Simplification | Reality / doc |
|---|----------------|---------------|
| S1 | Usage entered directly in credits; no token model | Credits derive from per-token model pricing [B2] (see `billing-model.md` §7.1) |
| S2 | Auto-select −10% and data-residency +10% not applied | Documented multipliers [B14][B15] (`billing-model.md` §7.2–7.3) |
| S3 | `members` = seats; `activePct` applied uniformly per group | GitHub attributes by actual user/seat membership [B11] |
| S4 | If $\sum_{cc}s_{cc}>L$, pool is computed from CC seats (over-count) until corrected; a warning fires | A resource belongs to one CC; Σ ≤ L [B10] |
| S5 | Boundary-day attribution of shared included vs. metered is user-iteration-order dependent; **enterprise totals are order-independent** | GitHub attributes per actual event time |
| S6 | Copilot code review also consumes Actions minutes; not modeled | [B2] |
