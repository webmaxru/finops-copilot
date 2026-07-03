import { describe, it, expect } from 'vitest';
import { runSimulation } from '../engine';
import {
  DEFAULT_INPUTS,
  makeDefaultCostCenter,
  DEFAULT_ENTERPRISE_LIMIT_USD,
  ENTERPRISE_LIMIT_MAX_USD,
  DEFAULT_INDIVIDUAL_LIMIT_USD,
  INDIVIDUAL_LIMIT_MAX_MULTIPLE,
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

describe('individual-limit default & max derivation', () => {
  it('default = average developer monthly usage (USD); slider max multiple is 10x', () => {
    const inp = DEFAULT_INPUTS();
    // Default individual limit = avg developer monthly usage converted to USD.
    expect(DEFAULT_INDIVIDUAL_LIMIT_USD).toBeCloseTo(inp.avgDevUsageCredits * 0.01, 6);
    expect(inp.individualLimitUsd).toBeCloseTo(inp.avgDevUsageCredits * 0.01, 6);
    // Slider max (applied in the UI) = 10 x avg developer monthly usage.
    expect(INDIVIDUAL_LIMIT_MAX_MULTIPLE).toBe(10);
  });
});

describe('default enterprise-limit constants', () => {
  it('match the default scenario at variation = 0', () => {
    // Reference: default inputs, no usage variation, non-binding budgets.
    const ref = runSimulation({
      ...DEFAULT_INPUTS(),
      usageVariation: 0,
      enterpriseLimitUsd: 1e9,
      stopUsageBudgets: false,
    });
    const totalUsage = ref.monthEndIncludedUsd + ref.monthEndMeteredUsd;
    // Default = expected monthly metered spend at defaults.
    expect(DEFAULT_ENTERPRISE_LIMIT_USD).toBeCloseTo(ref.monthEndMeteredUsd, 6);
    // Max = 5 x total active-developer monthly usage at defaults.
    expect(ENTERPRISE_LIMIT_MAX_USD).toBeCloseTo(5 * totalUsage, 6);
  });
});

describe('individual limit (user-level budget) hard-stops', () => {
  it('caps every active user at their limit and blocks them', () => {
    const r = runSimulation(
      base({
        totalLicenses: 50,
        bizRatio: 1,
        activePct: 1,
        avgDevUsageCredits: 19000, // $190/mo target — well above the $50 cap
        powerRatio: 0,
        individualLimitUsd: 50,
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
      powerRatio: 0,
      individualLimitUsd: 500, // not binding
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
        powerRatio: 0,
        individualLimitUsd: 500, // not binding
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
        powerRatio: 0,
        individualLimitUsd: 500,
        usageVariation: 0,
        costCenters: [cc],
      }),
    );
    // carveout = 10*1900 = 19,000 cr = $190; block mode => no overage
    expect(r.monthEndMeteredUsd).toBeCloseTo(0, 6);
    expect(r.monthEndIncludedUsd).toBeLessThanOrEqual(190 + 1e-6);
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
