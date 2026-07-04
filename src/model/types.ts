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
  /** Included-usage cap ("AI credit pool"): limit this CC's included draw to its own licenses' credits. Beyond it, usage continues as metered (overages assumed enabled). */
  includedCapEnabled: boolean;
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

/** One day's cumulative state for a group. */
export interface DaySnapshot {
  day: number; // 1..30
  poolRemaining: number; // credits (NaN for groups that share the pool)
  includedConsumedUsd: number; // cumulative $ value of included credits used
  meteredUsd: number; // cumulative metered $
  cumulativeBillUsd: number; // license value + metered
  blockedUsers: number; // cumulative users who hit their limit
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
  days: DaySnapshot[]; // length 30
  monthEndMeteredUsd: number;
  monthEndBlockedUsers: number;
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
  poolUsedPct: number; // 0..1 share of the included pool consumed by day 30
}
