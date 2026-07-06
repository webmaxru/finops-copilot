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

/**
 * End of the promotional-allowance window. GitHub applies the promo included
 * allowances (I^promo) to usage-based billing from Jun 1 2026 up to — but not
 * including — Sep 1 2026; standard allowances apply from Sep 1 2026 onward. [B1]
 */
export const PROMO_END = new Date('2026-09-01T00:00:00Z');

/** Whether the promotional-allowance window is still open at `now` (default: today). */
export function isPromoWindowOpen(now: Date = new Date()): boolean {
  return now.getTime() < PROMO_END.getTime();
}

export const SIM_DAYS = 30;

export const DEFAULT_TOTAL_LICENSES = 100;

/**
 * Enterprise metered-budget defaults, derived from the default enterprise-wide
 * inputs with **no cost centers** (all active users at the enterprise average
 * usage) at usageVariation = 0 with standard allowances (promo off — these
 * anchor the durable post-promo regime; see docs/formulas.md §5.2). Validated
 * against a v = 0, `costCenters: []` reference run in engine.test.ts.
 *   default          = expected monthly metered spend at defaults (standard)  => $2,620
 *   max @ default L  = 5 x total active-developer monthly usage ($5,120)   => $25,600
 * The slider max scales linearly with total users (licenses) so larger orgs
 * get enough range; it recomputes only when total users changes.
 */
export const DEFAULT_ENTERPRISE_LIMIT_USD = 2620;
export const ENTERPRISE_LIMIT_MAX_USD = 25600; // max at the default total users (L = 100)
export const ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD = ENTERPRISE_LIMIT_MAX_USD / DEFAULT_TOTAL_LICENSES; // $256 / user
export function enterpriseLimitMaxUsd(totalLicenses: number): number {
  return ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD * Math.max(0, totalLicenses);
}

/** Default seats for a newly created cost center. */
export const DEFAULT_CC_MEMBERS = 30;

/**
 * Cost-center metered-budget slider bounds (see docs/formulas.md §5.3). Same
 * logic as the enterprise limit (§5.2) but scaled to this cost center's own
 * seats m instead of total users L:
 *   min          = 0
 *   default(m)   = enterprise per-seat default × m  ($26.20 / seat)
 *   max(m)       = enterprise per-seat max     × m  ($256   / seat)
 * The per-seat default is the enterprise default ($2,620) spread over its 100
 * licenses; the per-seat max reuses ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD. Like
 * the enterprise max, ccBudgetMaxUsd recomputes only when the CC's seats change;
 * the current/user-set value is untouched (kept in range in the UI).
 */
export const CC_BUDGET_DEFAULT_PER_SEAT_USD = DEFAULT_ENTERPRISE_LIMIT_USD / DEFAULT_TOTAL_LICENSES; // $26.20 / seat
export function ccBudgetDefaultUsd(members: number): number {
  return CC_BUDGET_DEFAULT_PER_SEAT_USD * Math.max(0, members);
}
export function ccBudgetMaxUsd(members: number): number {
  return ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD * Math.max(0, members);
}

/**
 * Universal user-level budget (ULB) derivation (see docs/formulas.md §2.1):
 *   default    = average developer monthly usage, in USD  (ū · $0.01)
 *   slider max = UNIVERSAL_ULB_MAX_MULTIPLE × average developer monthly usage
 * The max is applied live from the current avg-usage slider in the UI.
 */
export const DEFAULT_AVG_DEV_USAGE_CREDITS = 5000;
export const UNIVERSAL_ULB_MAX_MULTIPLE = 10;
export const DEFAULT_UNIVERSAL_ULB_USD = DEFAULT_AVG_DEV_USAGE_CREDITS * CREDIT_USD;

/**
 * Per-cost-center average developer monthly usage defaults. Each cost center
 * has its own average usage (same slider bounds as the enterprise avg, §2.2);
 * the two predefined cost centers seed a high-usage vs. low-usage split:
 *   High usage cost center = 2× the enterprise default
 *   Low usage cost center  = ½× the enterprise default
 */
export const DEFAULT_HIGH_CC_USAGE_CREDITS = 2 * DEFAULT_AVG_DEV_USAGE_CREDITS; // 10,000
export const DEFAULT_LOW_CC_USAGE_CREDITS = DEFAULT_AVG_DEV_USAGE_CREDITS / 2; // 2,500
/** Low-usage cost center default seats = the rest of the users after the high-usage CC. */
export const DEFAULT_LOW_CC_MEMBERS = DEFAULT_TOTAL_LICENSES - DEFAULT_CC_MEMBERS; // 70

/**
 * Power-user individual budget override (see docs/formulas.md §4, §2.1). A power
 * user's monthly usage is modeled at this budget, which also serves as their
 * per-user limit (overriding the universal ULB, per GitHub's individual-override
 * guidance). Bounds/default are multiples of the Copilot Business seat price.
 */
export const POWER_USER_BUDGET_MIN_USD = 2 * SEAT_PRICE.business; // $38
export const POWER_USER_BUDGET_MAX_USD = 40 * SEAT_PRICE.business; // $760
export const DEFAULT_POWER_USER_BUDGET_USD = 10 * SEAT_PRICE.business; // $190
/** Default number of power users = 10% of total users. */
export const DEFAULT_POWER_USERS = Math.round(DEFAULT_TOTAL_LICENSES * 0.1); // 10

/** Slider bounds for the UI controls. */
export const RANGES = {
  totalLicenses: { min: 1, max: 1000, step: 1 },
  bizRatio: { min: 0, max: 1, step: 0.01 },
  activePct: { min: 0, max: 1, step: 0.01 },
  avgDevUsageCredits: { min: 1900, max: 19000, step: 100 },
  powerUsers: { min: 0, step: 1 }, // max is dynamic in the UI: = total users (licenses)
  avgPowerUserBudgetUsd: { min: POWER_USER_BUDGET_MIN_USD, max: POWER_USER_BUDGET_MAX_USD, step: 1 },
  usageVariation: { min: 0, max: 1, step: 0.01 },
  universalUlbUsd: { min: 0, step: 1 }, // max is dynamic in the UI: 10 x avg dev usage
  enterpriseLimitUsd: { min: 0, step: 50 }, // max is dynamic in the UI: scales with total users (enterpriseLimitMaxUsd)
  ccMembers: { min: 0, max: 1000, step: 1 },
  ccUserLimitUsd: { min: 0, max: 500, step: 1 },
  ccBudgetUsd: { min: 0, step: 50 }, // max is dynamic in the UI: scales with CC seats (ccBudgetMaxUsd)
} as const;

function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `cc-${Math.random().toString(36).slice(2, 10)}`;
}

/** A fresh cost center with smart defaults. Cost centers always use the
 * enterprise Business/Enterprise ratio (there is no per-CC plan-mix control). */
export function makeDefaultCostCenter(index: number): CostCenter {
  return {
    id: newId(),
    name: `Cost center ${index}`,
    members: DEFAULT_CC_MEMBERS,
    avgDevUsageCredits: DEFAULT_AVG_DEV_USAGE_CREDITS,
    userLimitInherit: true,
    userLimitUsd: 50,
    budgetUsd: ccBudgetDefaultUsd(DEFAULT_CC_MEMBERS),
    stopUsageBudget: true,
    includedCapEnabled: false,
  };
}

/** Fresh default inputs (new objects each call to avoid shared mutable state). */
export function DEFAULT_INPUTS(): EnterpriseInputs {
  return {
    totalLicenses: DEFAULT_TOTAL_LICENSES,
    bizRatio: 0.7,
    activePct: 0.8,
    avgDevUsageCredits: DEFAULT_AVG_DEV_USAGE_CREDITS,
    powerUsers: DEFAULT_POWER_USERS,
    avgPowerUserBudgetUsd: DEFAULT_POWER_USER_BUDGET_USD,
    usageVariation: 0.3,
    universalUlbUsd: DEFAULT_UNIVERSAL_ULB_USD,
    enterpriseLimitUsd: DEFAULT_ENTERPRISE_LIMIT_USD,
    // On by default while the promo window is open (< Sep 1 2026), off afterward.
    promo: isPromoWindowOpen(),
    enterpriseBudgetExcludesCostCenters: false,
    stopUsageBudgets: true,
    seed: 12345,
    costCenters: [
      {
        ...makeDefaultCostCenter(1),
        name: 'High usage cost center',
        members: DEFAULT_CC_MEMBERS,
        avgDevUsageCredits: DEFAULT_HIGH_CC_USAGE_CREDITS,
        budgetUsd: ccBudgetDefaultUsd(DEFAULT_CC_MEMBERS),
      },
      {
        ...makeDefaultCostCenter(2),
        name: 'Low usage cost center',
        members: DEFAULT_LOW_CC_MEMBERS,
        avgDevUsageCredits: DEFAULT_LOW_CC_USAGE_CREDITS,
        budgetUsd: ccBudgetDefaultUsd(DEFAULT_LOW_CC_MEMBERS),
      },
    ],
  };
}
