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
  isPromoWindowOpen,
  PROMO_END,
  CREDIT_USD,
} from '../defaults';
import type { EnterpriseInputs } from '../types';

// Build inputs with no cost centers by default so seat counts are exact.
// Pin promo off so allowance-dependent expectations stay deterministic
// regardless of the (now date-based) DEFAULT_INPUTS().promo default.
const base = (over: Partial<EnterpriseInputs> = {}): EnterpriseInputs => ({
  ...DEFAULT_INPUTS(),
  costCenters: [],
  promo: false,
  ...over,
});

describe('promo window (date-gated default & visibility)', () => {
  it('closes exactly at Sep 1 2026 (open before, closed on/after)', () => {
    expect(PROMO_END.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(isPromoWindowOpen(new Date('2026-06-01T00:00:00Z'))).toBe(true);
    expect(isPromoWindowOpen(new Date('2026-08-31T23:59:59Z'))).toBe(true);
    expect(isPromoWindowOpen(new Date('2026-09-01T00:00:00Z'))).toBe(false);
    expect(isPromoWindowOpen(new Date('2026-10-01T00:00:00Z'))).toBe(false);
  });

  it('DEFAULT_INPUTS().promo tracks the window (on while open, off after)', () => {
    expect(DEFAULT_INPUTS().promo).toBe(isPromoWindowOpen());
  });
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
      // Anchor to standard allowances: the enterprise-limit constants ($2,620 /
      // $25,600) describe the durable post-promo regime, not the temporary promo
      // pool (DEFAULT_INPUTS().promo is date-based — on before Sep 1 2026).
      promo: false,
    });
    const totalUsage = ref.monthEndIncludedUsd + ref.monthEndMeteredUsd;
    // Default = expected monthly metered spend at defaults ($2,620).
    expect(DEFAULT_ENTERPRISE_LIMIT_USD).toBeCloseTo(ref.monthEndMeteredUsd, 6);
    // Max = 5 x total active-developer monthly usage at defaults ($5,120 -> $25,600).
    expect(ENTERPRISE_LIMIT_MAX_USD).toBeCloseTo(5 * totalUsage, 6);
  });
});

describe('user-level budget precedence (individual > cost center > universal)', () => {
  it('a cost-center ULB overrides the universal ULB and hard-stops its members', () => {
    // Universal ULB $500 (loose); this CC sets its own $30 ULB. Members want $50
    // each but must be capped at $30 (the CC ULB wins), so all are blocked.
    const cc = {
      ...makeDefaultCostCenter(1),
      members: 10,
      avgDevUsageCredits: 5000, // $50/user demand
      userLimitInherit: false,
      userLimitUsd: 30, // CC ULB below demand and below the universal ULB
      budgetUsd: 1e9,
      stopUsageBudget: false,
    };
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
        powerUsers: 0,
        universalUlbUsd: 500, // loose; must be overridden by the CC ULB
        usageVariation: 0,
        stopUsageBudgets: false,
        enterpriseLimitUsd: 1e9,
        costCenters: [cc],
      }),
    );
    const g = r.costCenters[0];
    const end = g.days[g.days.length - 1];
    // 10 members capped at $30 each => $300 total (not $500), everyone blocked.
    expect(end.includedConsumedUsd + end.meteredUsd).toBeCloseTo(300, 0);
    expect(g.monthEndBlockedUsers).toBe(g.activeUsers);
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
    // A capped CC (own pool) that spills to metered, with a low absolute budget
    // and stop-usage on, must cap its own metered spend at exactly that budget.
    const cc = {
      ...makeDefaultCostCenter(1),
      members: 10,
      avgDevUsageCredits: 19000, // heavy, forces overage past the $190 own pool
      includedCapEnabled: true,
      budgetUsd: 40,
      stopUsageBudget: true,
    };
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
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
    // All 50 are cut off by their own limit, not a metered-budget stop.
    expect(r.monthEndBlockedBreakdown.userLimit).toBe(50);
    expect(r.monthEndBlockedBreakdown.costCenterBudget).toBe(0);
    expect(r.monthEndBlockedBreakdown.enterpriseBudget).toBe(0);
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

describe('enterprise budget that excludes cost-center usage', () => {
  it('lets cost centers spend beyond the enterprise budget; only non-CC usage is capped', () => {
    // 20 heavy users: 10 in a cost center (own $2,000 budget), 10 unassigned.
    // Pool = 20*1900 = $380; metered demand ~ $3,420. Enterprise budget = $500.
    const cc = {
      ...makeDefaultCostCenter(1),
      members: 10,
      avgDevUsageCredits: 19000,
      budgetUsd: 2000,
      stopUsageBudget: true,
    };
    const scenario = (excludes: boolean) =>
      base({
        totalLicenses: 20,
        bizRatio: 1,
        activePct: 1,
        avgDevUsageCredits: 19000, // heavy (applies to the unassigned users)
        powerUsers: 0,
        universalUlbUsd: 500, // not binding
        usageVariation: 0,
        enterpriseLimitUsd: 500,
        stopUsageBudgets: true,
        enterpriseBudgetExcludesCostCenters: excludes,
        costCenters: [cc],
      });

    const included = runSimulation(scenario(false));
    const excluded = runSimulation(scenario(true));

    // Included (default): the enterprise budget caps ALL metered at $500.
    expect(included.monthEndMeteredUsd).toBeCloseTo(500, 0);
    expect(included.maxBillUsd).toBeCloseTo(380 + 500, 6); // licenses + enterprise budget

    // Excluded: the $500 enterprise budget caps only the unassigned users, while
    // the cost center spends under its own $2,000 budget on top — so total metered
    // is well above $500.
    expect(excluded.monthEndMeteredUsd).toBeGreaterThan(included.monthEndMeteredUsd);
    expect(excluded.monthEndMeteredUsd).toBeGreaterThan(1500);
    // Max bill now includes the cost-center budget on top of the enterprise budget.
    expect(excluded.maxBillUsd).toBeCloseTo(380 + 500 + 2000, 6);
  });
});

describe('cost-center AI credit pool (included-usage cap)', () => {
  it('limits included draw to the CC own licenses and spills the rest to metered', () => {
    // No per-CC block/overage control exists; an enabled AI credit pool caps the
    // CC included draw at its own funded credits and the excess continues as
    // metered — governed by the enterprise overages policy (assumed enabled;
    // §5.7). Budgets set high so they do not bind. [B13][B8]
    const cc = {
      ...makeDefaultCostCenter(1),
      members: 10,
      avgDevUsageCredits: 19000, // demand $1,900 >> the $190 own pool
      includedCapEnabled: true,
      budgetUsd: 5000,
      stopUsageBudget: true,
    };
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
        powerUsers: 0,
        universalUlbUsd: 500,
        usageVariation: 0,
        stopUsageBudgets: false, // enterprise budget not binding
        costCenters: [cc],
      }),
    );
    // Own pool = 10*1900 = 19,000 cr = $190 (included cap); the rest spills to metered.
    expect(r.monthEndIncludedUsd).toBeCloseTo(190, 0);
    expect(r.monthEndMeteredUsd).toBeCloseTo(1710, 0);
  });

  it('a capped high-usage CC does not drain a low-usage CC included pool', () => {
    // High CC (heavy) + Low CC (light), both 10 business seats. Each funds $190
    // of the shared pool. No budgets/ULB bind, no enterprise cap.
    const mk = (highCapped: boolean) => {
      const high = {
        ...makeDefaultCostCenter(1),
        members: 10,
        avgDevUsageCredits: 19000, // $190/user demand
        includedCapEnabled: highCapped,
        budgetUsd: 1e9,
        stopUsageBudget: false,
      };
      const low = {
        ...makeDefaultCostCenter(2),
        members: 10,
        avgDevUsageCredits: 1900, // $19/user demand (light)
        includedCapEnabled: false,
        budgetUsd: 1e9,
        stopUsageBudget: false,
      };
      return base({
        totalLicenses: 20,
        bizRatio: 1,
        activePct: 1,
        powerUsers: 0,
        universalUlbUsd: 1000, // not binding
        usageVariation: 0,
        stopUsageBudgets: false,
        enterpriseLimitUsd: 1e9,
        costCenters: [high, low],
      });
    };
    const uncapped = runSimulation(mk(false));
    const capped = runSimulation(mk(true));
    const lowEnd = (r: typeof uncapped) => {
      const low = r.costCenters[1];
      return low.days[low.days.length - 1];
    };
    const lowUncapped = lowEnd(uncapped);
    const lowCapped = lowEnd(capped);

    // Uncapped: the heavy High CC drains the shared pool, starving the Low CC's
    // included usage. Capping High carves its credits out, so Low keeps its own.
    expect(lowCapped.includedConsumedUsd).toBeGreaterThan(lowUncapped.includedConsumedUsd + 50);
    // With High capped, Low keeps ~its own $190 pool and meters nothing.
    expect(lowCapped.includedConsumedUsd).toBeCloseTo(190, 0);
    expect(lowCapped.meteredUsd).toBeLessThan(lowUncapped.meteredUsd);
  });

  it('each cost center consumes at its own average developer usage', () => {
    const high = {
      ...makeDefaultCostCenter(1),
      members: 10,
      avgDevUsageCredits: 10000, // $100/user
      budgetUsd: 1e9,
      stopUsageBudget: false,
    };
    const low = {
      ...makeDefaultCostCenter(2),
      members: 10,
      avgDevUsageCredits: 2500, // $25/user
      budgetUsd: 1e9,
      stopUsageBudget: false,
    };
    const r = runSimulation(
      base({
        totalLicenses: 20,
        bizRatio: 1,
        activePct: 1,
        powerUsers: 0,
        universalUlbUsd: 1000, // not binding
        usageVariation: 0,
        stopUsageBudgets: false,
        enterpriseLimitUsd: 1e9,
        costCenters: [high, low],
      }),
    );
    const total = (i: number) => {
      const g = r.costCenters[i];
      const end = g.days[g.days.length - 1];
      return end.includedConsumedUsd + end.meteredUsd;
    };
    expect(total(0)).toBeCloseTo(1000, 0); // 10 * $100
    expect(total(1)).toBeCloseTo(250, 0); // 10 * $25
  });

  it('pool-left chart identity: capped CC poolRemaining == poolCredits - includedConsumed (formulas.md §7.3)', () => {
    // The per-group charts plot "Included pool left" = poolCredits*c - includedConsumedUsd.
    // For a capped CC this must coincide with the engine's real sub-pool (poolRemaining);
    // for a shared-pool group poolRemaining is NaN but the derived pool-left stays finite.
    const capped = {
      ...makeDefaultCostCenter(1),
      members: 10,
      avgDevUsageCredits: 4000, // > its 1900/seat funded pool, so the sub-pool actually drains
      userLimitInherit: false,
      userLimitUsd: 1000, // not binding
      includedCapEnabled: true,
      budgetUsd: 1e9,
      stopUsageBudget: false,
    };
    const shared = { ...capped, name: 'Shared', includedCapEnabled: false };
    const r = runSimulation(
      base({
        totalLicenses: 40, // 10 + 10 in CCs, 20 unassigned (also shares the pool)
        bizRatio: 1,
        activePct: 1,
        powerUsers: 0,
        usageVariation: 0,
        stopUsageBudgets: false,
        enterpriseLimitUsd: 1e9,
        costCenters: [capped, shared],
      }),
    );
    const cappedG = r.costCenters[0];
    const cappedPoolUsd = cappedG.poolCredits * CREDIT_USD;
    for (const day of cappedG.days) {
      expect(Number.isNaN(day.poolRemaining)).toBe(false);
      expect(day.poolRemaining * CREDIT_USD).toBeCloseTo(cappedPoolUsd - day.includedConsumedUsd, 6);
    }
    // Shared-pool group: raw per-group poolRemaining is NaN (it shares the pool),
    // yet the value the chart plots (poolCredits*c - includedConsumedUsd) is finite.
    const sharedG = r.costCenters[1];
    const sharedPoolUsd = sharedG.poolCredits * CREDIT_USD;
    for (const day of sharedG.days) {
      expect(Number.isNaN(day.poolRemaining)).toBe(true);
      expect(Number.isFinite(sharedPoolUsd - day.includedConsumedUsd)).toBe(true);
    }
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

  it('exposes per-group power-user counts distributed proportional to active users', () => {
    const inp = DEFAULT_INPUTS();
    const r = runSimulation(inp);
    const frac = inp.powerUsers / inp.totalLicenses;
    const groups = [...r.costCenters, r.unassigned];
    for (const g of groups) {
      expect(g.powerUsers).toBe(Math.round(g.activeUsers * frac));
    }
    // Enterprise total = sum of the (rounded) per-group counts.
    expect(r.enterprise.powerUsers).toBe(groups.reduce((s, g) => s + g.powerUsers, 0));
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
    // Nobody exceeds their own limit here, so every block is the enterprise stop.
    expect(r.monthEndBlockedBreakdown.enterpriseBudget).toBe(r.activeUsers);
    expect(r.monthEndBlockedBreakdown.userLimit).toBe(0);
    expect(r.monthEndBlockedBreakdown.costCenterBudget).toBe(0);
  });
});

describe('blocked-user reason breakdown', () => {
  it('attributes blocks to the cost-center budget when its stop is the only bind', () => {
    // A capped CC (own pool) spills to metered under a low $40 budget with
    // stop-usage on. The ULB ($500) never binds and the enterprise stop is off,
    // so the CC budget is the sole hard stop — every block is CC-budget.
    const cc = {
      ...makeDefaultCostCenter(1),
      members: 10,
      avgDevUsageCredits: 19000, // $190/user, well past the $190 own pool
      includedCapEnabled: true,
      budgetUsd: 40,
      stopUsageBudget: true,
    };
    const r = runSimulation(
      base({
        totalLicenses: 10,
        bizRatio: 1,
        activePct: 1,
        powerUsers: 0,
        universalUlbUsd: 500, // not binding
        usageVariation: 0,
        stopUsageBudgets: false, // enterprise stop off — isolate the CC budget
        costCenters: [cc],
      }),
    );
    const g = r.costCenters[0];
    expect(g.monthEndBlockedUsers).toBeGreaterThan(0);
    expect(g.monthEndBlockedBreakdown.costCenterBudget).toBe(g.monthEndBlockedUsers);
    expect(g.monthEndBlockedBreakdown.userLimit).toBe(0);
    expect(g.monthEndBlockedBreakdown.enterpriseBudget).toBe(0);
    // The enterprise-wide breakdown mirrors the single cost center.
    expect(r.monthEndBlockedBreakdown.costCenterBudget).toBe(g.monthEndBlockedUsers);
  });

  it('splits a mixed scenario across reasons and sums to the total blocked count', () => {
    // Heavy CC hard-stopped by its own budget; heavy unassigned users hard-
    // stopped by their universal ULB; the enterprise stop is off.
    const cc = {
      ...makeDefaultCostCenter(1),
      members: 10,
      avgDevUsageCredits: 19000,
      includedCapEnabled: true,
      budgetUsd: 40,
      stopUsageBudget: true,
      userLimitInherit: false,
      userLimitUsd: 500, // not binding for the CC members
    };
    const r = runSimulation(
      base({
        totalLicenses: 20,
        bizRatio: 1,
        activePct: 1,
        powerUsers: 0,
        avgDevUsageCredits: 19000, // unassigned demand $190, above their $50 ULB
        universalUlbUsd: 50, // binds the unassigned users
        usageVariation: 0,
        stopUsageBudgets: false,
        enterpriseLimitUsd: 1e9,
        costCenters: [cc],
      }),
    );
    const bd = r.monthEndBlockedBreakdown;
    // Both stops appear, and every blocked user maps to exactly one reason.
    expect(bd.costCenterBudget).toBeGreaterThan(0);
    expect(bd.userLimit).toBeGreaterThan(0);
    expect(bd.userLimit + bd.costCenterBudget + bd.enterpriseBudget).toBe(r.monthEndBlockedUsers);
    // The CC members are attributed to the CC budget; the unassigned to the ULB.
    expect(r.costCenters[0].monthEndBlockedBreakdown.costCenterBudget).toBe(
      r.costCenters[0].monthEndBlockedUsers,
    );
    expect(r.unassigned.monthEndBlockedBreakdown.userLimit).toBe(
      r.unassigned.monthEndBlockedUsers,
    );
  });

  it('every blocked user is attributed to exactly one reason (per group and enterprise)', () => {
    const r = runSimulation(DEFAULT_INPUTS());
    for (const g of [...r.costCenters, r.unassigned, r.enterprise]) {
      const bd = g.monthEndBlockedBreakdown;
      expect(bd.userLimit + bd.costCenterBudget + bd.enterpriseBudget).toBe(g.monthEndBlockedUsers);
    }
    const ebd = r.monthEndBlockedBreakdown;
    expect(ebd.userLimit + ebd.costCenterBudget + ebd.enterpriseBudget).toBe(r.monthEndBlockedUsers);
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
