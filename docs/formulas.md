# Formulas

Canonical, formal specification of every quantity the engine computes. Each row/section gives the **formula**, its **code location** (pinned to `a033e79`), a **source** (GitHub doc tag `[Bn]` from [`references.md`](./references.md), or a modeling note), and a **tag**: **[Fact]**, **[Derived]**, or **[Assumption]**.

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

$L,\ \rho_B,\ \alpha,\ \bar u,\ \phi,\ m,\ v,\ B_{\text{ind}},\ k_E,\ \mathrm{promo},\ \mathrm{stop}_E,\ \mathrm{seed}$, and a list of cost centers $\{cc\}$. Defaults: $L{=}100,\ \rho_B{=}0.7,\ \alpha{=}0.8,\ \bar u{=}2500,\ \phi{=}0.2,\ m{=}3,\ v{=}0.3,\ B_{\text{ind}}{=}50,\ k_E{=}1,\ \mathrm{promo}{=}\text{false},\ \mathrm{stop}_E{=}\text{true}$.

Each cost center $cc$ carries: `members` $s_{cc}$, plan-mix (inherit or own $\rho_{cc}$), per-user limit (inherit or own $B^{user}_{cc}$), budget multiple (inherit or own $k_{cc}$), `stopUsageBudget` $\mathrm{stop}_{cc}$, `includedCapEnabled` (capped?), `includedCapMode` ∈ {block, overage}.

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
\beta_g &= \begin{cases}k_g\,V_g & g\ \text{is a cost center}\\ \text{null} & g = \text{unassigned}\end{cases} & &\text{CC metered budget — [Assumption of parametrization; Fact that CC budgets cap metered [B5]]}
\end{aligned}
$$

**Inheritance** (`engine.ts:104,108,111`) — **[Fact: these controls exist [B4][B5]]**:
$$\rho_g=\text{inherit}?\ \rho_B:\rho_{cc},\quad B^{user}_g=\text{inherit}?\ B_{\text{ind}}:B^{user}_{cc},\quad k_g=\text{inherit}?\ k_E:k_{cc}$$

**Unassigned group** (`engine.ts:116-132`): $s_U=\max(0,\ L-\sum_{cc}s_{cc})$, business share $\rho_B$, $U_U=B_{\text{ind}}/c$, never capped, $\beta_U=\text{null}$. **[Fact: seats not in a cost center bill to the enterprise [B11]]**

---

## 4. Per-user usage model — `engine.ts:148-167`  **[Assumption]**

> No GitHub formula exists for how much an individual consumes; §4 is the simulator's statistical model. GitHub only states qualitatively that heavier/agentic use costs more credits [B1]. Safe to tune.

For each group $g$, the first $\lfloor A_g\,\phi \rceil$ active users are **power users** (`engine.ts:150-152`). Monthly target (`engine.ts:153-155`):

$$\tau_i = \begin{cases} \bar u\,m & \text{power user}\\ \bar u & \text{normal user}\end{cases}$$

Monthly draw (`engine.ts:156`) and daily allocation (`engine.ts:157-164`):

$$\mu_i \sim \mathrm{LogNormal}(\text{mean}=\tau_i,\ \mathrm{CV}=v), \qquad
x_{i,d} = \mu_i\,\frac{w_{i,d}}{\sum_{d'=1}^{D} w_{i,d'}},\quad w_{i,d}\sim \mathrm{LogNormal}(\text{mean}=1,\ \mathrm{CV}=v)$$

By construction $\sum_{d=1}^{D} x_{i,d} = \mu_i$ (a user's daily shares sum to its monthly draw). If $v=0$, $\mu_i=\tau_i$ and $x_{i,d}=\tau_i/D$ (uniform).

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
\beta_E &= k_E\cdot F & &\text{enterprise metered budget — [Assumption of parametrization]}\\
M &= F + \beta_E & &\text{max possible bill — [Fact] [B5]}\\
A &= \textstyle\sum_g A_g & &\text{active users}
\end{aligned}
$$

**[Derived]** $P\cdot c = F$ (pool dollar value equals license fees), since $I_B c=p_B,\ I_E c=p_E$. [B1]

### 5.1 Pool partition — `engine.ts:143-145`  **[Fact]** [B10]
$$P_{\text{shared}}=\sum_{g:\ \neg\text{capped}} C_g, \qquad \text{sub}_g = C_g\ \ \text{for each capped cost center}$$
Capped cost centers draw from their own $\text{sub}_g$; everyone else shares $P_{\text{shared}}$. Enabling a cap carves that CC's credits out of the shared pool but does not redistribute the rest. [B10]

---

## 6. Daily accounting loop — `engine.ts:190-255`

State: $P_{\text{shared}}$, each $\text{sub}_g$, per-group metered $\mathrm{Me}_g$ (USD) and included $\mathrm{In}_g$ (USD), enterprise metered $\mathrm{Me}_E$, and per-user cumulative credits $\mathrm{cum}_i$ (all start 0). For each day $d=1..D$, for each **unblocked** active user $i$ in group $g$:

**(a) User-level limit (hard stop)** — `engine.ts:193-199` — **[Fact]** [B4]
$$r_i = U_g - \mathrm{cum}_i;\quad r_i\le 0 \Rightarrow \text{block } i;\qquad \sigma_{i,d}=\min(x_{i,d},\, r_i)$$

**(b) Included then metered routing** — `engine.ts:205-220` — **[Fact]** [B1][B10]

Capped group:
$$\mathrm{inc}=\min(\sigma_{i,d},\ \text{sub}_g),\quad \text{sub}_g\mathrel{-}=\mathrm{inc};\qquad \ell=\sigma_{i,d}-\mathrm{inc}$$
$$\text{metered credits}=\begin{cases}\textsc{ApplyMetered}(g,\ell) & \text{capMode}=\text{overage}\\ 0\ (\ell\ \text{dropped}) & \text{capMode}=\text{block}\end{cases}$$

Non-capped group (shared pool):
$$\mathrm{inc}=\min(\sigma_{i,d},\ P_{\text{shared}}),\quad P_{\text{shared}}\mathrel{-}=\mathrm{inc};\qquad \ell=\sigma_{i,d}-\mathrm{inc};\qquad \text{metered credits}=\textsc{ApplyMetered}(g,\ell)$$

**(c) `ApplyMetered(g, credits)`** — `engine.ts:176-188` — **[Fact]** [B4][B5]
$$
\begin{aligned}
a &= \text{credits}\cdot c && \text{(requested USD)}\\
\text{if } \beta_g\neq\text{null} \wedge \mathrm{stop}_g:\ & a \leftarrow \min\!\big(a,\ \max(0,\ \beta_g-\mathrm{Me}_g)\big) && \text{CC budget cap}\\
\text{if } \mathrm{stop}_E:\ & a \leftarrow \min\!\big(a,\ \max(0,\ \beta_E-\mathrm{Me}_E)\big) && \text{enterprise budget cap}\\
& \mathrm{Me}_g\mathrel{+}=a,\quad \mathrm{Me}_E\mathrel{+}=a && \text{commit}\\
& \textbf{return } a/c && \text{(metered credits actually billed)}
\end{aligned}
$$
The nested `min` implements **"lowest remaining headroom wins"** across the CC and enterprise budgets. [B4] When a `stop` flag is false, that cap term is skipped, so charges accrue uncapped (alerts-only behavior). [B6]

**(d) Commit user** — `engine.ts:222-227`
$$\text{spent}=\mathrm{inc}+\text{metered credits};\quad \mathrm{cum}_i\mathrel{+}=\text{spent};\quad \mathrm{In}_g\mathrel{+}=\mathrm{inc}\cdot c;\quad \mathrm{cum}_i\ge U_g\Rightarrow\text{block }i$$
Global accumulators (`engine.ts:224-226`): $\mathrm{In}_{\text{tot}}\mathrel{+}=\mathrm{inc}\cdot c$, $\mathrm{Me}_{\text{tot}}\mathrel{+}=\text{metered}\cdot c$.

Evaluation order across a request is exactly **user-limit → pool → CC budget → enterprise budget**, matching GitHub's documented order. [B4]

---

## 7. Outputs — `SimResult`

### 7.1 Per-day snapshots
Per group (`engine.ts:235-242`): for day $d$
$$\text{poolRemaining}=\begin{cases}\text{sub}_g & \text{capped}\\ \text{NaN} & \text{shares the pool}\end{cases},\quad \text{included}=\mathrm{In}_g,\ \text{metered}=\mathrm{Me}_g,\ \text{bill}=V_g+\mathrm{Me}_g$$
Enterprise (`engine.ts:247-254`):
$$\text{poolRemaining}=P_{\text{shared}}+\sum_{g:\text{capped}}\text{sub}_g,\quad \text{included}=\mathrm{In}_{\text{tot}},\ \text{metered}=\mathrm{Me}_{\text{tot}},\ \text{bill}=F+\mathrm{Me}_{\text{tot}}$$
`blockedUsers` = count of blocked users at end of day $d$ (`engine.ts:234,245`).

### 7.2 Scalars — `engine.ts:257-289`
$$\text{poolExhaustedDay}=\min\{d: P_{\text{shared}}\le 0\}\ \text{or null (never)}\ \ (\text{engine.ts:230})$$
$$\text{poolUsedPct}=\min\!\Big(1,\ \frac{\mathrm{In}_{\text{tot}}}{P\cdot c}\Big)\ \ (\text{engine.ts:275})$$
Month-end values (`engine.ts:335-339`, read from day $D$'s snapshot): $\text{monthEndBill}=F+\mathrm{Me}_{\text{tot}}$, $\text{monthEndMetered}=\mathrm{Me}_{\text{tot}}$, $\text{monthEndIncluded}=\mathrm{In}_{\text{tot}}$, $\text{monthEndBlocked}=\text{blocked}(D)$.

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
