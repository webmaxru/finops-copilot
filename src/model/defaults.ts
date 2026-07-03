import type { CostCenter, EnterpriseInputs, PlanType } from './types';

/** 1 AI credit = $0.01 USD (fixed conversion). */
export const CREDIT_USD = 0.01;

/** Monthly per-seat price in USD. */
export const SEAT_PRICE: Record<PlanType, number> = {
  business: 19,
  enterprise: 39,
};

/** Included AI credits per seat per month: standard vs. promo (until Sep 1 2026). */
export const INCLUDED: Record<PlanType, { std: number; promo: number }> = {
  business: { std: 1900, promo: 3000 },
  enterprise: { std: 3900, promo: 7000 },
};

export function includedPerSeat(plan: PlanType, promo: boolean): number {
  return promo ? INCLUDED[plan].promo : INCLUDED[plan].std;
}

export const SIM_DAYS = 30;

export const DEFAULT_TOTAL_LICENSES = 100;

/**
 * Enterprise metered-budget defaults, derived from the default scenario at
 * usageVariation = 0 (see docs/formulas.md §5.2). Validated against a v = 0
 * reference run in engine.test.ts.
 *   default          = expected monthly metered spend at defaults        => $1,500
 *   max @ default L  = 5 x total active-developer monthly usage ($4,000) => $20,000
 * The slider max scales linearly with total users (licenses) so larger orgs
 * get enough range; it recomputes only when total users changes.
 */
export const DEFAULT_ENTERPRISE_LIMIT_USD = 1500;
export const ENTERPRISE_LIMIT_MAX_USD = 20000; // max at the default total users (L = 100)
export const ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD = ENTERPRISE_LIMIT_MAX_USD / DEFAULT_TOTAL_LICENSES; // $200 / user
export function enterpriseLimitMaxUsd(totalLicenses: number): number {
  return ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD * Math.max(0, totalLicenses);
}

/** Budget multiple a cost center inherits when "use default budget" is on. */
export const INHERITED_CC_BUDGET_MULTIPLE = 1;

/**
 * Individual (per-user) limit derivation (see docs/formulas.md §2.1):
 *   default    = average developer monthly usage, in USD  (ū · $0.01)
 *   slider max = INDIVIDUAL_LIMIT_MAX_MULTIPLE × average developer monthly usage
 * The max is applied live from the current avg-usage slider in the UI.
 */
export const DEFAULT_AVG_DEV_USAGE_CREDITS = 5000;
export const INDIVIDUAL_LIMIT_MAX_MULTIPLE = 10;
export const DEFAULT_INDIVIDUAL_LIMIT_USD = DEFAULT_AVG_DEV_USAGE_CREDITS * CREDIT_USD;

/** Slider bounds for the UI controls. */
export const RANGES = {
  totalLicenses: { min: 1, max: 1000, step: 1 },
  bizRatio: { min: 0, max: 1, step: 0.01 },
  activePct: { min: 0, max: 1, step: 0.01 },
  avgDevUsageCredits: { min: 1900, max: 19000, step: 100 },
  powerRatio: { min: 0, max: 1, step: 0.01 },
  powerMultiplier: { min: 2, max: 5, step: 0.1 },
  usageVariation: { min: 0, max: 1, step: 0.01 },
  individualLimitUsd: { min: 0, step: 1 }, // max is dynamic in the UI: 10 x avg dev usage
  enterpriseLimitUsd: { min: 0, step: 50 }, // max is dynamic in the UI: scales with total users (enterpriseLimitMaxUsd)
  ccMembers: { min: 0, max: 1000, step: 1 },
  ccUserLimitUsd: { min: 0, max: 500, step: 1 },
  ccBudgetMultiple: { min: 2, max: 5, step: 0.1 },
} as const;

function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `cc-${Math.random().toString(36).slice(2, 10)}`;
}

/** A fresh cost center with smart defaults (inherits enterprise settings). */
export function makeDefaultCostCenter(index: number): CostCenter {
  return {
    id: newId(),
    name: `Cost center ${index}`,
    members: 30,
    planMixInherit: true,
    bizRatio: 0.7,
    userLimitInherit: true,
    userLimitUsd: 50,
    budgetMultipleInherit: true,
    budgetMultiple: 2,
    stopUsageBudget: true,
    includedCapEnabled: false,
    includedCapMode: 'block',
  };
}

/** Fresh default inputs (new objects each call to avoid shared mutable state). */
export function DEFAULT_INPUTS(): EnterpriseInputs {
  return {
    totalLicenses: DEFAULT_TOTAL_LICENSES,
    bizRatio: 0.7,
    activePct: 0.8,
    avgDevUsageCredits: DEFAULT_AVG_DEV_USAGE_CREDITS,
    powerRatio: 0.2,
    powerMultiplier: 3,
    usageVariation: 0.3,
    individualLimitUsd: DEFAULT_INDIVIDUAL_LIMIT_USD,
    enterpriseLimitUsd: DEFAULT_ENTERPRISE_LIMIT_USD,
    promo: false,
    stopUsageBudgets: true,
    seed: 12345,
    costCenters: [makeDefaultCostCenter(1)],
  };
}
