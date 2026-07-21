// Core domain types for the Copilot Enterprise Spend Simulator.
// The simulation engine consumes `EnterpriseInputs` and returns a `SimResult`.

export type PlanType = 'business' | 'enterprise';

/** A cost center: a subset of seats with its own (optional) limits. */
export interface CostCenter {
  id: string;
  name: string;
  /** Number of assigned seats (licenses) in this cost center. */
  members: number;
  /** Average monthly usage (credits) of a normal (non-power) active member of this cost center. */
  avgDevUsageCredits: number;
  /** If true, use the enterprise universal per-user limit. */
  userLimitInherit: boolean;
  /** Per-user total (pool+metered) cap in USD when not inheriting. */
  userLimitUsd: number;
  /** CC metered budget in absolute USD (0..max). Max scales with the CC's seats. */
  budgetUsd: number;
  /** Hard-stop the CC metered budget when reached. */
  stopUsageBudget: boolean;
  /**
   * Included-usage cap ("AI credit pool", `ai_credit_pool_enabled`): limit this CC's
   * included draw to its own licenses' credits (auto-sized; the admin enters no number).
   * As of the 2026-07-20 billing-UI release you manage this when creating/editing a cost
   * center and choose, per cost center, what happens AT the cap via `stopUsageIncludedCap`.
   * [B20][B4][B13][B8]
   */
  includedCapEnabled: boolean;
  /**
   * At the AI credit pool cap: block members (true) or let usage continue as paid overage
   * (false — the default). Overage only actually occurs when the enterprise allows it (the
   * "AI credit paid usage" policy, assumed enabled here), so with `false` the leftover spills
   * to metered. Per-cost-center billing-UI choice added 2026-07-20; the cost-centers REST body
   * still carries only `ai_credit_pool_enabled` (this choice is set via the budget/spend-control
   * flow). Ignored when `includedCapEnabled` is false. [B20][B4]
   */
  stopUsageIncludedCap: boolean;
}

/** All inputs that drive the simulation (the engine is a pure fn of this). */
export interface EnterpriseInputs {
  totalLicenses: number; // 1..1000
  bizRatio: number; // 0..1 business share
  activePct: number; // 0..1 seats that actually use Copilot
  avgDevUsageCredits: number; // avg monthly usage per active normal dev (credits)
  powerUsers: number; // absolute count of power users (0..total users)
  avgPowerUserBudgetUsd: number; // power users' individual budget = usage + limit (USD), overrides ULB
  usageVariation: number; // 0..1 coefficient of variation of usage
  universalUlbUsd: number; // universal user-level budget for normal users (USD)
  enterpriseLimitUsd: number; // absolute USD enterprise metered budget (0..max)
  promo: boolean; // promotional included allowances (3000/7000)
  enterpriseBudgetExcludesCostCenters: boolean; // enterprise budget governs only non-cost-center usage
  stopUsageBudgets: boolean; // hard-stop enterprise/CC metered budgets
  seed: number; // PRNG seed for deterministic sampling
  costCenters: CostCenter[];
}

/**
 * Why a user was cut off (the binding hard stop at the moment they were first
 * blocked). Every blocked user is attributed to exactly one reason, so a
 * breakdown always sums to the total blocked count.
 *   - `userLimit`         — their per-user limit (universal/CC ULB or power-user override)
 *   - `includedCap`       — a cost-center AI credit pool cap set to "block" at the cap
 *   - `costCenterBudget`  — a cost-center metered-budget stop
 *   - `enterpriseBudget`  — the enterprise metered-budget stop
 */
export type BlockReason = 'userLimit' | 'includedCap' | 'costCenterBudget' | 'enterpriseBudget';

/** Blocked-user counts split by the reason they were cut off (§6d, §7.1). */
export interface BlockedBreakdown {
  userLimit: number;
  includedCap: number;
  costCenterBudget: number;
  enterpriseBudget: number;
}

/** One day's cumulative state for a group. */
export interface DaySnapshot {
  day: number; // 1..30
  poolRemaining: number; // credits (NaN for groups that share the pool)
  includedConsumedUsd: number; // cumulative $ value of included credits used
  meteredUsd: number; // cumulative metered $
  cumulativeBillUsd: number; // license value + metered
  blockedUsers: number; // cumulative users who hit their limit
  blockedBreakdown: BlockedBreakdown; // cumulative blocked users split by reason
}

export type GroupKind = 'enterprise' | 'cc' | 'unassigned';

/** A time series for the enterprise aggregate, a cost center, or unassigned. */
export interface GroupSeries {
  key: string;
  label: string;
  kind: GroupKind;
  seats: number;
  activeUsers: number;
  powerUsers: number; // power users assigned to this group (engine's rounded distribution)
  poolCredits: number; // starting included pool for this group
  licenseValueUsd: number;
  capped: boolean; // included-usage cap active (cost centers only)
  capStopsUsage: boolean; // at the AI credit pool cap: block (true) vs. overage (false)
  days: DaySnapshot[]; // length 30
  monthEndMeteredUsd: number;
  monthEndBlockedUsers: number;
  monthEndBlockedBreakdown: BlockedBreakdown; // month-end blocked users split by reason
}

export interface SimResult {
  businessSeats: number;
  enterpriseSeats: number;
  licenseFeesUsd: number;
  poolCredits: number; // total enterprise included pool
  activeUsers: number;
  enterpriseBudgetUsd: number; // metered budget
  maxBillUsd: number; // licenseFees + enterpriseBudget
  enterprise: GroupSeries; // aggregate across all users
  costCenters: GroupSeries[];
  unassigned: GroupSeries;
  warnings: string[];
  poolExhaustedDay: number | null;
  monthEndBillUsd: number;
  monthEndMeteredUsd: number;
  monthEndIncludedUsd: number;
  monthEndBlockedUsers: number;
  monthEndBlockedBreakdown: BlockedBreakdown; // enterprise-wide blocked users split by reason
  poolUsedPct: number; // 0..1 share of the included pool consumed by day 30
}
