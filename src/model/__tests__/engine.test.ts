import { describe, it, expect } from 'vitest';
import { runSimulation } from '../engine';
import {
  DEFAULT_INPUTS,
  makeDefaultCostCenter,
  DEFAULT_ENTERPRISE_LIMIT_USD,
  ENTERPRISE_LIMIT_MAX_USD,
  ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD,
  enterpriseLimitMaxUsd,
  DEFAULT_TOTAL_LICENSES,
  DEFAULT_UNIVERSAL_ULB_USD,
  UNIVERSAL_ULB_MAX_MULTIPLE,
  DEFAULT_POWER_USERS,
  DEFAULT_POWER_USER_BUDGET_USD,
  POWER_USER_BUDGET_MIN_USD,
  POWER_USER_BUDGET_MAX_USD,
  DEFAULT_CC_MEMBERS,
  CC_BUDGET_DEFAULT_PER_SEAT_USD,
  ccBudgetDefaultUsd,
  ccBudgetMaxUsd,
} from '../defaults';
import type { EnterpriseInputs } from '../types';

// Build inputs with no cost centers by default so seat counts are exact.
const base = (over: Partial<EnterpriseInputs> = {}): EnterpriseInputs => ({
  ...DEFAULT_INPUTS(),
  costCenters: [],
  ...over,
});

describe('pool + license math', () => {
  it('computes seats, license fees and standard included pool', () => {
    const r = runSimulation(base({ totalLicenses: 100, bizRatio: 0.7, promo: false }));
    expect(r.businessSeats).toBe(70);
    expect(r.enterpriseSeats).toBe(30);
    // 70*1900 + 30*3900 = 250,000 credits
    expect(r.poolCredits).toBe(250000);
    // 70*$19 + 30*$39 = $2,500  (== pool $ value)
    expect(r.licenseFeesUsd).toBe(2500);
    expect(r.poolCredits * 0.01).toBeCloseTo(r.licenseFeesUsd, 6);
  });

  it('applies promotional included allowances (3000/7000)', () => {
    const r = runSimulation(base({ totalLicenses: 100, bizRatio: 0.7, promo: true }));
    // 70*3000 + 30*7000 = 420,000
    expect(r.poolCredits).toBe(420000);
  });
});

describe('max-bill formula (licenses + enterprise budget)', () => {
  it('matches the documented 400-Business-seat relationship', () => {
    const r = runSimulation(base({ totalLicenses: 400, bizRatio: 1, enterpriseLimitUsd: 5000 }));
    expect(r.licenseFeesUsd).toBe(7600); // 400 * $19
    expect(r.enterpriseBudgetUsd).toBe(5000); // absolute USD metered budget
    // Documented example: 400 licenses ($7,600) + a $5,000 budget => $12,600 max bill
    expect(r.maxBillUsd).toBe(12600);
  });
});

describe('universal ULB & power-budget default derivation', () => {
  it('ULB default = average developer monthly usage (USD); slider max multiple is 10x', () => {
    const inp = DEFAULT_INPUTS();
    expect(DEFAULT_UNIVERSAL_ULB_USD).toBeCloseTo(inp.avgDevUsageCredits * 0.01, 6);
    expect(inp.universalUlbUsd).toBeCloseTo(inp.avgDevUsageCredits * 0.01, 6);
    expect(UNIVERSAL_ULB_MAX_MULTIPLE).toBe(10);
  });

  it('power-user budget bounds/default are multiples of the Business seat price ($19)', () => {
    expect(POWER_USER_BUDGET_MIN_USD).toBe(38); // 2 x $19
    expect(POWER_USER_BUDGET_MAX_USD).toBe(760); // 40 x $19
    expect(DEFAULT_POWER_USER_BUDGET_USD).toBe(190); // 10 x $19
    expect(DEFAULT_POWER_USERS).toBe(10); // 10% of the 100 default users
  });
});

describe('enterprise-limit slider max scales with total users', () => {
  it('is $256/user and equals the base at the default total', () => {
    expect(ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD).toBe(256);
    expect(enterpriseLimitMaxUsd(DEFAULT_TOTAL_LICENSES)).toBe(ENTERPRISE_LIMIT_MAX_USD); // $25,600 at L=100
    expect(enterpriseLimitMaxUsd(200)).toBe(2 * ENTERPRISE_LIMIT_MAX_USD); // linear in total users
    expect(enterpriseLimitMaxUsd(1000)).toBe(256000);
  });
});

describe('default enterprise-limit constants', () => {
  it('match the default scenario at variation = 0', () => {
    // Reference: default inputs, no usage variation, non-binding budgets.
    const ref = runSimulation({
      ...DEFAULT_INPUTS(),
      costCenters: [],
      usageVariation: 0,
      enterpriseLimitUsd: 1e9,
      stopUsageBudgets: false,
    });
    const totalUsage = ref.monthEndIncludedUsd + ref.monthEndMeteredUsd;
    // Default = expected monthly metered spend at defaults ($2,620).
    expect(DEFAULT_ENTERPRISE_LIMIT_USD).toBeCloseTo(ref.monthEndMeteredUsd, 6);
    // Max = 5 x total active-developer monthly usage at defaults ($5,120 -> $25,600).
    expect(ENTERPRISE_LIMIT_MAX_USD).toBeCloseTo(5 * totalUsage, 6);
  });
});

describe('cost-center budget bounds scale with the CC seats', () => {
  it('mirrors the enterprise per-seat default ($26.20) and max ($256)', () => {
    // Same per-seat logic as the enterprise limit, scaled by CC members.
    expect(CC_BUDGET_DEFAULT_PER_SEAT_USD).toBeCloseTo(
      DEFAULT_ENTERPRISE_LIMIT_USD / DEFAULT_TOTAL_LICENSES,
      6,
    );
    expect(CC_BUDGET_DEFAULT_PER_SEAT_USD).toBeCloseTo(26.2, 6);
    // Default(m) = $26.20 x m ; a fresh 30-seat CC => $786.
    expect(ccBudgetDefaultUsd(DEFAULT_CC_MEMBERS)).toBeCloseTo(786, 6);
    expect(ccBudgetDefaultUsd(100)).toBeCloseTo(DEFAULT_ENTERPRISE_LIMIT_USD, 6);
    // Max(m) = $256 x m ; reuses the enterprise per-license max, scaled by seats.
    expect(ENTERPRISE_LIMIT_MAX_PER_LICENSE_USD).toBe(256);
    expect(ccBudgetMaxUsd(DEFAULT_CC_MEMBERS)).toBeCloseTo(256 * DEFAULT_CC_MEMBERS, 6);
    expect(ccBudgetMaxUsd(100)).toBeCloseTo(ENTERPRISE_LIMIT_MAX_USD, 6);
    expect(ccBudgetMaxUsd(0)).toBe(0);
  });

  it('uses the CC budget (absolute USD) to hard-stop that CC metered spend', () => {
    // A capped CC (own pool) that spills to overage, with a low absolute budget
    // and stop-usage on, must cap its own metered spend at exactly that budget.
    const cc = {
      ...makeDefaultCostCenter(1),
      members: 10,
      includedCapEnabled: true,
      includedCapMode: 'overage' as const,
      budgetUsd: 40,
      stopUsageBudget: true,
    };
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
        avgDevUsageCredits: 19000, // heavy, forces overage past the $190 own pool
        powerUsers: 0,
        universalUlbUsd: 500, // not binding
        usageVariation: 0,
        stopUsageBudgets: false, // isolate the CC budget as the only stop
        costCenters: [cc],
      }),
    );
    const ccSeries = r.costCenters[0];
    expect(ccSeries.monthEndMeteredUsd).toBeLessThanOrEqual(40 + 1e-6);
    expect(ccSeries.monthEndMeteredUsd).toBeCloseTo(40, 0);
  });
});

describe('universal ULB hard-stops', () => {
  it('caps every active user at their limit and blocks those who exceed it', () => {
    const r = runSimulation(
      base({
        totalLicenses: 50,
        bizRatio: 1,
        activePct: 1,
        avgDevUsageCredits: 19000, // $190/mo target — well above the $50 cap
        powerUsers: 0,
        universalUlbUsd: 50,
        enterpriseLimitUsd: 100000, // keep the enterprise budget non-binding so the ULB is the constraint
        usageVariation: 0,
      }),
    );
    expect(r.activeUsers).toBe(50);
    expect(r.monthEndBlockedUsers).toBe(50);
    const totalSpend = r.monthEndIncludedUsd + r.monthEndMeteredUsd;
    // No user can exceed $50 total -> at most 50 * $50
    expect(totalSpend).toBeLessThanOrEqual(50 * 50 + 1e-6);
    // Everyone reaches exactly their $50 cap
    expect(totalSpend).toBeCloseTo(50 * 50, 0);
  });
});

describe('metered phase after the pool is exhausted', () => {
  it('produces metered spend and is deterministic', () => {
    const inp = base({
      totalLicenses: 20,
      bizRatio: 1,
      activePct: 1,
      avgDevUsageCredits: 10000, // $100/user
      powerUsers: 0,
      universalUlbUsd: 500, // not binding
      enterpriseLimitUsd: 100000, // non-binding
      stopUsageBudgets: false,
      usageVariation: 0,
    });
    const r1 = runSimulation(inp);
    const r2 = runSimulation(inp);
    expect(r1.monthEndBillUsd).toBeCloseTo(r2.monthEndBillUsd, 6); // deterministic
    expect(r1.poolExhaustedDay).not.toBeNull();
    // pool = 20*1900 = 38,000 cr = $380; demand = 20*$100 = $2,000; metered ~ $1,620
    expect(r1.monthEndMeteredUsd).toBeCloseTo(1620, 0);
  });
});

describe('stop-usage caps metered at the enterprise budget', () => {
  it('blocks metered spend once the budget is reached', () => {
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
        avgDevUsageCredits: 19000, // heavy
        powerUsers: 0,
        universalUlbUsd: 500, // not binding
        enterpriseLimitUsd: 380,
        stopUsageBudgets: true,
        usageVariation: 0,
      }),
    );
    // pool $190, absolute metered budget $380
    expect(r.enterpriseBudgetUsd).toBe(380);
    expect(r.monthEndMeteredUsd).toBeLessThanOrEqual(380 + 1e-6);
    expect(r.monthEndMeteredUsd).toBeCloseTo(380, 0);
    expect(r.monthEndBillUsd).toBeCloseTo(r.maxBillUsd, 0); // 190 + 380 = 570
  });
});

describe('cost-center included-usage cap (block mode)', () => {
  it('limits a capped cost center to its own licenses and yields no metered', () => {
    const cc = {
      ...makeDefaultCostCenter(1),
      members: 10,
      includedCapEnabled: true,
      includedCapMode: 'block' as const,
    };
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
        avgDevUsageCredits: 19000,
        powerUsers: 0,
        universalUlbUsd: 500,
        usageVariation: 0,
        costCenters: [cc],
      }),
    );
    // carveout = 10*1900 = 19,000 cr = $190; block mode => no overage
    expect(r.monthEndMeteredUsd).toBeCloseTo(0, 6);
    expect(r.monthEndIncludedUsd).toBeLessThanOrEqual(190 + 1e-6);
  });
});

describe('power-user individual budget override', () => {
  it('lets power users spend up to their budget, above the universal ULB', () => {
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
        powerUsers: 10, // everyone is a power user
        avgPowerUserBudgetUsd: 200, // individual override
        universalUlbUsd: 50, // would cap normal users at $50
        avgDevUsageCredits: 1900, // normal target (unused here)
        enterpriseLimitUsd: 1e9,
        stopUsageBudgets: false,
        usageVariation: 0,
      }),
    );
    const totalSpend = r.monthEndIncludedUsd + r.monthEndMeteredUsd;
    // 10 power users each consume their $200 budget, not the $50 universal ULB.
    expect(totalSpend).toBeCloseTo(10 * 200, 0);
    // At v=0 usage equals the budget exactly => no unmet demand => not blocked.
    expect(r.monthEndBlockedUsers).toBe(0);
  });
});

describe('blocked count = users whose intended usage exceeds their limit', () => {
  it('does not block users who consume exactly up to their limit (v=0)', () => {
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
        powerUsers: 0,
        avgDevUsageCredits: 5000, // $50 target
        universalUlbUsd: 50, // == target
        enterpriseLimitUsd: 1e9,
        stopUsageBudgets: false,
        usageVariation: 0,
      }),
    );
    expect(r.monthEndBlockedUsers).toBe(0);
  });

  it('blocks users whose intended usage exceeds their limit', () => {
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
        powerUsers: 0,
        avgDevUsageCredits: 10000, // $100 target
        universalUlbUsd: 50, // limit below target
        enterpriseLimitUsd: 1e9,
        stopUsageBudgets: false,
        usageVariation: 0,
      }),
    );
    expect(r.monthEndBlockedUsers).toBe(10);
  });
});

describe('users blocked by the enterprise metered-budget stop', () => {
  it('counts users cut off by the budget hard-stop, not just the ULB', () => {
    // Reported scenario: demand > pool + budget, stop-usage on, and no user
    // exceeds their own ULB/budget — yet the enterprise budget hard-stop cuts
    // everyone off, so they must be counted as blocked.
    const r = runSimulation(
      base({
        totalLicenses: 100,
        bizRatio: 0.7,
        activePct: 0.8,
        avgDevUsageCredits: 5000, // normal target $50 == universal ULB
        universalUlbUsd: 50,
        powerUsers: 10,
        avgPowerUserBudgetUsd: 190, // power target $190 == their budget
        enterpriseLimitUsd: 1350, // below the $2,620 metered demand
        stopUsageBudgets: true,
        usageVariation: 0,
      }),
    );
    // metered demand ($2,620) is capped at the $1,350 budget ...
    expect(r.monthEndMeteredUsd).toBeCloseTo(1350, 0);
    // ... so active users are cut off by the budget => blocked > 0.
    expect(r.monthEndBlockedUsers).toBe(r.activeUsers);
  });
});

describe('warnings', () => {
  it('warns when cost-center seats exceed total licenses', () => {
    const cc = { ...makeDefaultCostCenter(1), members: 200 };
    const r = runSimulation(base({ totalLicenses: 100, costCenters: [cc] }));
    expect(r.warnings.some((w) => w.includes('only 100 licenses'))).toBe(true);
  });

  it('warns about over-provisioning when the pool never empties', () => {
    const r = runSimulation(
      base({ totalLicenses: 100, avgDevUsageCredits: 1900, activePct: 0.2, usageVariation: 0 }),
    );
    expect(r.poolExhaustedDay).toBeNull();
    expect(r.warnings.some((w) => w.includes('over-provisioned'))).toBe(true);
  });
});
