# WebMCP agent tools

How the simulator exposes itself to **in-browser AI agents** via
[WebMCP](https://github.com/webmachinelearning/webmcp) — the proposed web
standard that lets a page declare structured, agent-callable tools through
`document.modelContext` (with a deprecated `navigator.modelContext` fallback for
older Chrome previews).

> **No new billing rule.** These tools are an *interface* over the existing
> engine. They read the same inputs, run the same pure `runSimulation`, and
> reuse the documented input ranges — they do **not** change any formula. The
> mapping to the calculation spec is given per tool below, so this file stays in
> sync with [`formulas.md`](./formulas.md) like any other surface. Source for the
> platform capability itself: the WebMCP skill (`.agents/skills/webmcp/`) and the
> [WebMCP specification](https://github.com/webmachinelearning/webmcp).

## Shape

- **Imperative API** (not declarative): tools are registered from JavaScript with
  `modelContext.registerTool(tool, { signal })`. See
  [`src/webmcp/registry.ts`](../src/webmcp/registry.ts) (adapted from the skill's
  `model-context-registry.template.ts`) and the bootstrap in
  [`src/webmcp/index.ts`](../src/webmcp/index.ts), called once from
  [`src/main.tsx`](../src/main.tsx).
- **Result schemas are mandatory.** Every tool declares an `outputSchema`
  (JSON Schema) and returns
  `{ content: [{ type: "text", text }], structuredContent }`, where
  `structuredContent` conforms to that `outputSchema`.
- The tools and their pure logic live in
  [`src/webmcp/tools.ts`](../src/webmcp/tools.ts); ambient types are in
  [`src/webmcp/webmcp.d.ts`](../src/webmcp/webmcp.d.ts). Pure logic is unit-tested
  in [`src/webmcp/__tests__/tools.test.ts`](../src/webmcp/__tests__/tools.test.ts)
  (no DOM required).

## Tool 1 — `get_spend_forecast` (read-only)

Runs the current configuration through the simulator and returns the projected
month-end spend. `annotations.readOnlyHint = true`; it takes **no input**.

**Result (`outputSchema`)** — the `SpendForecast` object (all money in USD):

| Field | Type | Meaning | Spec |
|---|---|---|---|
| `currency` | `"USD"` | fixed currency | — |
| `seats` | object | `total`, `business`, `enterprise`, `active` seat counts | formulas §3, §5.1 |
| `includedPoolCredits` | integer | enterprise included AI-credit pool | formulas §5.1 |
| `licenseFeesUsd` | number | fixed license fees | formulas §5.1 |
| `monthEndMeteredUsd` | number | metered (paid-usage) spend at day 30 | formulas §6–§7 |
| `monthEndIncludedUsd` | number | USD value of included credits consumed | formulas §6 |
| `monthEndBillUsd` | number | `licenseFees + metered` | formulas §7 |
| `maxBillUsd` | number | `licenseFees + enterpriseBudget` (max possible bill) | formulas §5.2 |
| `enterpriseMeteredBudgetUsd` | number | enterprise metered budget | formulas §5.2 |
| `blockedUsers` | object | `total` + split `byUserLimit` / `byCostCenterBudget` / `byEnterpriseBudget` | formulas §6d, §7.1 |
| `poolExhaustedDay` | integer \| null | day (1–30) the pool ran out, else `null` | formulas §6 |
| `poolUsedPct` | number | share of the pool consumed by day 30 (0–1) | formulas §7 |
| `promoAllowancesActive` | boolean | promo included allowances in effect | formulas §1 |
| `costCenters[]` | array | per-CC `name`, `seats`, `meteredUsd`, `blockedUsers`, `includedCapEnabled` | formulas §5, §6 |
| `unassigned` | object | `seats`, `meteredUsd`, `blockedUsers` for non-CC usage | formulas §5 |
| `warnings` | string[] | engine warnings | formulas §8 |
| `summary` | string | one-line human-readable recap | — |

Built by `buildForecast(inputs)` in `src/webmcp/tools.ts`, a thin re-shaping of
the engine's `SimResult`.

## Tool 2 — `configure_enterprise_plan` (write)

Sets the top-level enterprise inputs via the existing store actions, then returns
the **recomputed** forecast so the agent can verify the effect. All fields are
optional; supply any subset.

**Input (`inputSchema`)** — clamped to the documented ranges
([`src/model/defaults.ts`](../src/model/defaults.ts) `RANGES`; formulas §1–§2, §9):

| Field | Range | Maps to input | Spec |
|---|---|---|---|
| `totalLicenses` | 1–1000 (int) | `totalLicenses` ($L$) | formulas §2.2 |
| `businessRatio` | 0–1 | `bizRatio` ($\rho$) | formulas §2.2 |
| `activePct` | 0–1 | `activePct` ($\alpha$) | formulas §2.2 |
| `avgDevUsageCredits` | 1900–19000 | `avgDevUsageCredits` ($\bar u$) | formulas §2.2 |
| `powerUsers` | 0..`totalLicenses` (int) | `powerUsers` | formulas §2.2 |
| `enterpriseBudgetUsd` | 0..`$256·L` | `enterpriseLimitUsd` ($\beta_E$) | formulas §5.2 |
| `promo` | boolean | `promo` | formulas §1 |

Validation is **loose in schema, strict in code** (per the WebMCP authoring
guidance): out-of-range numbers are clamped to their range and the adjusted
fields are reported; the dynamic maxes for `powerUsers` and `enterpriseBudgetUsd`
are resolved against the *resulting* `totalLicenses` in the same call, mirroring
the UI (§9). Non-numeric values are ignored. Integer fields are rounded (not
counted as a range clamp). Cost centers are **not** modified by this tool.

**Result (`outputSchema`):**

| Field | Type | Meaning |
|---|---|---|
| `applied` | object | the provided fields, clamped to range |
| `clampedFields` | string[] | names of fields adjusted to fit their range |
| `forecast` | `SpendForecast` | the recomputed forecast (same schema as Tool 1) |

If no recognized field is supplied, the tool returns an error result
(`isError: true`) with a corrective message and leaves the configuration
unchanged.

Implemented by `clampEnterprisePatch()` + `createTools()` in
`src/webmcp/tools.ts`; the store binding is in `src/webmcp/index.ts`.

## Why these two

The simulator's value is *"change the plan, see the projected bill and who gets
blocked."* These two tools are the smallest atomic pair that lets an agent do
exactly that: **read** the forecast and **write** the top-level levers. They are
non-overlapping (one read-only, one write), map cleanly to existing store
actions, and keep destructive scope out (no cost-center create/delete, no reset).

## Compatibility & lifecycle

- Registration uses an `AbortController`; `dispose()` unregisters the tools
  (calling `unregisterTool?.()` where still supported, then aborting the signal).
- `registerTool()` is awaited inside a `try`/`catch` so the same code works on
  Chrome builds that registered synchronously and on Chrome 151+ where it returns
  a `Promise<void>`. See `.agents/skills/webmcp/references/compatibility.md`.
- When WebMCP is unavailable (non-Chrome, insecure context, tests), `initWebMcp()`
  is a safe no-op.
