import { CREDIT_USD, SEAT_PRICE, includedPerSeat, SIM_DAYS } from './defaults';
import { mulberry32, lognormal } from './rng';
import type {
  BlockedBreakdown,
  BlockReason,
  DaySnapshot,
  EnterpriseInputs,
  GroupSeries,
  SimResult,
} from './types';

interface GroupState {
  key: string;
  label: string;
  kind: 'cc' | 'unassigned';
  seats: number;
  bizSeats: number;
  entSeats: number;
  carveoutCredits: number; // included credits funded by this group's seats
  licenseValueUsd: number;
  activeCount: number;
  ulbCredits: number; // per-user total limit in credits
  avgDevUsageCredits: number; // normal-member usage target (credits) for this group
  capped: boolean;
  ccBudgetUsd: number | null; // metered budget (null for unassigned)
  stopUsageBudget: boolean;
  stopUsageIncludedCap: boolean; // at the AI credit pool cap: block (true) vs. overage (false)
  // mutable accumulators
  powerCount: number; // power users in this group (set during population)
  subPool: number;
  includedUsd: number;
  meteredUsd: number;
  days: DaySnapshot[];
}

interface UserState {
  g: GroupState;
  dailyShare: number[];
  cum: number;
  ulb: number;
  blocked: boolean;
  blockReason: BlockReason | null; // set at the moment the user is first blocked
}

const emptyBreakdown = (): BlockedBreakdown => ({
  userLimit: 0,
  includedCap: 0,
  costCenterBudget: 0,
  enterpriseBudget: 0,
});

interface MakeGroupArgs {
  key: string;
  label: string;
  kind: 'cc' | 'unassigned';
  seats: number;
  bizRatio: number;
  inclB: number;
  inclE: number;
  activePct: number;
  ulbUsd: number;
  avgDevUsageCredits: number; // normal (non-power) member usage target for this group
  capped: boolean;
  ccBudgetUsd: number | null;
  stopUsageBudget: boolean;
  stopUsageIncludedCap: boolean;
}

function makeGroup(a: MakeGroupArgs): GroupState {
  const seats = Math.max(0, Math.round(a.seats));
  const bizSeats = Math.round(seats * a.bizRatio);
  const entSeats = seats - bizSeats;
  const carveoutCredits = bizSeats * a.inclB + entSeats * a.inclE;
  const licenseValueUsd = bizSeats * SEAT_PRICE.business + entSeats * SEAT_PRICE.enterprise;
  const activeCount = Math.round(seats * a.activePct);
  return {
    key: a.key,
    label: a.label,
    kind: a.kind,
    seats,
    bizSeats,
    entSeats,
    carveoutCredits,
    licenseValueUsd,
    activeCount,
    ulbCredits: a.ulbUsd / CREDIT_USD,
    avgDevUsageCredits: a.avgDevUsageCredits,
    capped: a.capped,
    ccBudgetUsd: a.ccBudgetUsd,
    stopUsageBudget: a.stopUsageBudget,
    stopUsageIncludedCap: a.stopUsageIncludedCap,
    powerCount: 0,
    subPool: 0,
    includedUsd: 0,
    meteredUsd: 0,
    days: [],
  };
}

/** Pure, deterministic monthly simulation. */
export function runSimulation(inp: EnterpriseInputs): SimResult {
  const inclB = includedPerSeat('business', inp.promo);
  const inclE = includedPerSeat('enterprise', inp.promo);
  const rng = mulberry32(inp.seed >>> 0);

  // ---- Build groups (cost centers + unassigned) ----
  const groups: GroupState[] = [];
  let ccSeatSum = 0;
  for (const cc of inp.costCenters) {
    const seats = Math.max(0, Math.round(cc.members));
    ccSeatSum += seats;
    groups.push(
      makeGroup({
        key: cc.id,
        label: cc.name,
        kind: 'cc',
        seats,
        bizRatio: inp.bizRatio, // cost centers always use the enterprise ratio
        inclB,
        inclE,
        activePct: inp.activePct,
        ulbUsd: cc.userLimitInherit ? inp.universalUlbUsd : cc.userLimitUsd,
        avgDevUsageCredits: cc.avgDevUsageCredits,
        capped: cc.includedCapEnabled,
        ccBudgetUsd: cc.budgetUsd,
        stopUsageBudget: cc.stopUsageBudget,
        stopUsageIncludedCap: cc.stopUsageIncludedCap,
      }),
    );
  }
  const unassignedSeats = Math.max(0, inp.totalLicenses - ccSeatSum);
  const unassigned = makeGroup({
    key: 'unassigned',
    label: 'Unassigned seats',
    kind: 'unassigned',
    seats: unassignedSeats,
    bizRatio: inp.bizRatio,
    inclB,
    inclE,
    activePct: inp.activePct,
    ulbUsd: inp.universalUlbUsd,
    avgDevUsageCredits: inp.avgDevUsageCredits,
    capped: false,
    ccBudgetUsd: null,
    stopUsageBudget: inp.stopUsageBudgets,
    stopUsageIncludedCap: false,
  });
  groups.push(unassigned);

  // ---- Enterprise-level totals ----
  const totalBizSeats = groups.reduce((s, g) => s + g.bizSeats, 0);
  const totalEntSeats = groups.reduce((s, g) => s + g.entSeats, 0);
  const licenseFeesUsd = totalBizSeats * SEAT_PRICE.business + totalEntSeats * SEAT_PRICE.enterprise;
  const poolCredits = groups.reduce((s, g) => s + g.carveoutCredits, 0);
  const enterpriseBudgetUsd = inp.enterpriseLimitUsd;
  // Worst-case bill = license fees + the enterprise metered budget. When the
  // enterprise budget EXCLUDES cost-center usage, each cost center can spend up
  // to its own budget on top of the enterprise budget, so those add in. [B5][B18]
  const ccBudgetSumUsd = groups.reduce(
    (s, g) => s + (g.kind === 'cc' && g.ccBudgetUsd != null ? g.ccBudgetUsd : 0),
    0,
  );
  const maxBillUsd =
    licenseFeesUsd + enterpriseBudgetUsd + (inp.enterpriseBudgetExcludesCostCenters ? ccBudgetSumUsd : 0);
  const activeUsers = groups.reduce((s, g) => s + g.activeCount, 0);

  // Shared pool = credits funded by seats NOT in a capped cost center.
  let sharedPool = groups.filter((g) => !g.capped).reduce((s, g) => s + g.carveoutCredits, 0);
  for (const g of groups) if (g.capped) g.subPool = g.carveoutCredits;

  // ---- Build the active-user population with monthly + daily usage ----
  // Power users are the first `powerUsers/totalLicenses` fraction of each group's
  // active users. Their monthly usage is modeled at their individual budget,
  // which also caps them (overriding the universal/CC ULB). Normal users consume
  // their group's average developer usage, capped by their group's ULB.
  const powerFraction = inp.totalLicenses > 0 ? inp.powerUsers / inp.totalLicenses : 0;
  const powerBudgetCredits = inp.avgPowerUserBudgetUsd / CREDIT_USD;
  const users: UserState[] = [];
  for (const g of groups) {
    const powerCount = Math.round(g.activeCount * powerFraction);
    g.powerCount = powerCount;
    for (let i = 0; i < g.activeCount; i++) {
      const isPower = i < powerCount;
      const target = isPower ? powerBudgetCredits : g.avgDevUsageCredits;
      const ulb = isPower ? powerBudgetCredits : g.ulbCredits;
      const monthly = lognormal(rng, target, inp.usageVariation);
      const weights: number[] = [];
      let wsum = 0;
      for (let d = 0; d < SIM_DAYS; d++) {
        const w = lognormal(rng, 1, inp.usageVariation);
        weights.push(w);
        wsum += w;
      }
      const dailyShare = weights.map((w) => (wsum > 0 ? (monthly * w) / wsum : monthly / SIM_DAYS));
      users.push({ g, dailyShare, cum: 0, ulb, blocked: false, blockReason: null });
    }
  }

  // ---- Daily accounting ----
  let entMeteredUsd = 0;
  let totalIncludedUsd = 0;
  let totalMeteredUsd = 0;
  let poolExhaustedDay: number | null = null;
  const entDays: DaySnapshot[] = [];

  // Metered-usage cap. Returns the credits actually billed plus which budget (if
  // any) bound the draw below the requested amount — used to attribute blocked
  // users to the cost-center vs. enterprise stop. Numeric behavior is unchanged
  // from a plain nested `min`; `limitedBy` just records which cap won.
  const applyMetered = (
    g: GroupState,
    credits: number,
  ): { credits: number; limitedBy: 'cc' | 'enterprise' | null } => {
    const requested = credits * CREDIT_USD;
    let allowedUsd = requested;
    let limitedBy: 'cc' | 'enterprise' | null = null;
    // Cost-center metered budget cap (when the CC's stop flag is on).
    if (g.ccBudgetUsd != null && g.stopUsageBudget) {
      const ccRoom = Math.max(0, g.ccBudgetUsd - g.meteredUsd);
      if (ccRoom < allowedUsd) {
        allowedUsd = ccRoom;
        limitedBy = 'cc';
      }
    }
    // Enterprise metered budget cap. When the enterprise budget is configured to
    // EXCLUDE cost-center usage, it governs only non-cost-center ("Enterprise
    // Only") usage; cost-center groups are then bounded solely by their own CC
    // budgets and do not consume (or count against) the enterprise budget. [B18]
    const countsTowardEnterprise = !inp.enterpriseBudgetExcludesCostCenters || g.kind !== 'cc';
    if (inp.stopUsageBudgets && countsTowardEnterprise) {
      const entRoom = Math.max(0, enterpriseBudgetUsd - entMeteredUsd);
      if (entRoom < allowedUsd) {
        allowedUsd = entRoom;
        limitedBy = 'enterprise';
      }
    }
    if (allowedUsd <= 0) return { credits: 0, limitedBy };
    g.meteredUsd += allowedUsd;
    if (countsTowardEnterprise) entMeteredUsd += allowedUsd;
    return { credits: allowedUsd / CREDIT_USD, limitedBy };
  };

  for (let d = 0; d < SIM_DAYS; d++) {
    for (const u of users) {
      if (u.blocked) continue;
      const room = u.ulb - u.cum;
      if (room <= 1e-9) {
        u.blocked = true;
        u.blockReason = 'userLimit';
        continue;
      }
      const desired = u.dailyShare[d];
      if (desired <= 0) continue;
      const spend = Math.min(desired, room);

      const g = u.g;
      let includedUsed = 0;
      let meteredCredits = 0;
      let meteredLimitedBy: 'cc' | 'enterprise' | null = null;
      let includedCapBlocked = false;

      if (g.capped) {
        // AI credit pool cap: the CC draws included credits only from its own
        // funded sub-pool. What happens BEYOND the cap is a per-cost-center choice
        // (billing UI, 2026-07-20): `stopUsageIncludedCap` on => block members at
        // the cap (no overage); off => the leftover continues as metered "overage"
        // (only when the enterprise allows overages — the "AI credit paid usage"
        // policy, assumed enabled). See docs/billing-model.md §6. [B20][B4][B13][B8]
        const inc = Math.min(spend, g.subPool);
        g.subPool -= inc;
        includedUsed += inc;
        const leftover = spend - inc;
        if (leftover > 0) {
          if (g.stopUsageIncludedCap) {
            includedCapBlocked = true; // hard stop at the pool cap
          } else {
            const m = applyMetered(g, leftover);
            meteredCredits = m.credits;
            meteredLimitedBy = m.limitedBy;
          }
        }
      } else {
        const inc = Math.min(spend, sharedPool);
        sharedPool -= inc;
        includedUsed += inc;
        const leftover = spend - inc;
        if (leftover > 0) {
          const m = applyMetered(g, leftover);
          meteredCredits = m.credits;
          meteredLimitedBy = m.limitedBy;
        }
      }

      const spent = includedUsed + meteredCredits;
      u.cum += spent;
      g.includedUsd += includedUsed * CREDIT_USD;
      totalIncludedUsd += includedUsed * CREDIT_USD;
      totalMeteredUsd += meteredCredits * CREDIT_USD;
      // "Blocked" = the user had unmet demand today because a hard stop cut them
      // off. This covers every hard stop in one condition (spent < desired):
      //   - their own ULB / power-user individual override (spend < desired,
      //     because room = limit - cum ran out),
      //   - an AI credit pool cap set to "block" at the cap (includedCapBlocked),
      //     and/or
      //   - a cost-center or enterprise metered-budget stop (when "stop usage"
      //     is on) that could not serve their leftover (spent < spend).
      // Attribute to the binding stop (§6d): the user's own limit takes priority
      // (their cap stops them regardless of shared budgets); then an included-cap
      // "block at the cap"; otherwise whichever metered budget — cost-center or
      // enterprise — cut the leftover.
      if (spent < desired - 1e-9) {
        u.blocked = true;
        if (spend < desired - 1e-9) {
          u.blockReason = 'userLimit';
        } else if (includedCapBlocked) {
          u.blockReason = 'includedCap';
        } else if (meteredLimitedBy === 'cc') {
          u.blockReason = 'costCenterBudget';
        } else if (meteredLimitedBy === 'enterprise') {
          u.blockReason = 'enterpriseBudget';
        } else {
          u.blockReason = 'userLimit';
        }
      }
    }

    if (poolExhaustedDay === null && sharedPool <= 1e-6) poolExhaustedDay = d + 1;

    // Blocked-user counts + reason breakdown, per group and enterprise-wide
    // (one pass over users; a blocked user is fixed to the reason set above).
    const gCounts = new Map<GroupState, { blocked: number; bd: BlockedBreakdown }>();
    for (const g of groups) gCounts.set(g, { blocked: 0, bd: emptyBreakdown() });
    const entBd = emptyBreakdown();
    let blockedNow = 0;
    for (const u of users) {
      if (!u.blocked) continue;
      blockedNow++;
      const rec = gCounts.get(u.g);
      if (rec) {
        rec.blocked++;
        if (u.blockReason) rec.bd[u.blockReason]++;
      }
      if (u.blockReason) entBd[u.blockReason]++;
    }

    // Per-group snapshots
    for (const g of groups) {
      const rec = gCounts.get(g)!;
      g.days.push({
        day: d + 1,
        poolRemaining: g.capped ? g.subPool : NaN,
        includedConsumedUsd: g.includedUsd,
        meteredUsd: g.meteredUsd,
        cumulativeBillUsd: g.licenseValueUsd + g.meteredUsd,
        blockedUsers: rec.blocked,
        blockedBreakdown: rec.bd,
      });
    }

    const cappedSub = groups.reduce((s, g) => s + (g.capped ? g.subPool : 0), 0);
    entDays.push({
      day: d + 1,
      poolRemaining: sharedPool + cappedSub,
      includedConsumedUsd: totalIncludedUsd,
      meteredUsd: totalMeteredUsd,
      cumulativeBillUsd: licenseFeesUsd + totalMeteredUsd,
      blockedUsers: blockedNow,
      blockedBreakdown: entBd,
    });
  }

  // ---- Build output series ----
  const toSeries = (g: GroupState): GroupSeries => ({
    key: g.key,
    label: g.label,
    kind: g.kind,
    seats: g.seats,
    activeUsers: g.activeCount,
    powerUsers: g.powerCount,
    poolCredits: g.carveoutCredits,
    licenseValueUsd: g.licenseValueUsd,
    capped: g.capped,
    capStopsUsage: g.stopUsageIncludedCap,
    days: g.days,
    monthEndMeteredUsd: g.meteredUsd,
    monthEndBlockedUsers: g.days[g.days.length - 1]?.blockedUsers ?? 0,
    monthEndBlockedBreakdown: g.days[g.days.length - 1]?.blockedBreakdown ?? emptyBreakdown(),
  });

  const ccSeries = groups.filter((g) => g.kind === 'cc').map(toSeries);
  const unassignedSeries = toSeries(unassigned);
  const last = entDays[entDays.length - 1];
  const poolUsedPct = poolCredits > 0 ? Math.min(1, totalIncludedUsd / (poolCredits * CREDIT_USD)) : 0;

  const enterprise: GroupSeries = {
    key: 'enterprise',
    label: 'Enterprise (all users)',
    kind: 'enterprise',
    seats: inp.totalLicenses,
    activeUsers,
    powerUsers: groups.reduce((s, g) => s + g.powerCount, 0),
    poolCredits,
    licenseValueUsd: licenseFeesUsd,
    capped: false,
    capStopsUsage: false,
    days: entDays,
    monthEndMeteredUsd: totalMeteredUsd,
    monthEndBlockedUsers: last?.blockedUsers ?? 0,
    monthEndBlockedBreakdown: last?.blockedBreakdown ?? emptyBreakdown(),
  };

  // ---- Warnings ----
  const warnings: string[] = [];
  if (ccSeatSum > inp.totalLicenses) {
    warnings.push(
      `Cost centers hold ${ccSeatSum} seats but only ${inp.totalLicenses} licenses exist — reduce members so the total fits.`,
    );
  }
  const perSeatIncluded = inp.totalLicenses > 0 ? (poolCredits * CREDIT_USD) / inp.totalLicenses : 0;
  if (inp.universalUlbUsd > 0 && inp.universalUlbUsd < perSeatIncluded) {
    warnings.push(
      `Universal ULB $${inp.universalUlbUsd} is below the average included per-seat value ($${perSeatIncluded.toFixed(0)}) — users may be blocked before using their included share.`,
    );
  }
  if (poolExhaustedDay === null) {
    warnings.push(
      `Included pool never runs out (only ${(poolUsedPct * 100).toFixed(0)}% used by day 30) — you're over-provisioned and metered spend is $0.`,
    );
  }
  if (!inp.stopUsageBudgets && totalMeteredUsd > enterpriseBudgetUsd) {
    warnings.push(
      `Projected metered spend ($${totalMeteredUsd.toFixed(0)}) exceeds the enterprise budget ($${enterpriseBudgetUsd.toFixed(0)}); with stop-usage OFF this still bills.`,
    );
  }
  for (const g of groups) {
    if (g.kind === 'cc' && !g.capped && g.includedUsd > g.carveoutCredits * CREDIT_USD * 1.25) {
      warnings.push(
        `Cost center "${g.label}" used more included credits than its own licenses fund — consider an included-usage cap so it doesn't drain the shared pool.`,
      );
    }
  }

  return {
    businessSeats: totalBizSeats,
    enterpriseSeats: totalEntSeats,
    licenseFeesUsd,
    poolCredits,
    activeUsers,
    enterpriseBudgetUsd,
    maxBillUsd,
    enterprise,
    costCenters: ccSeries,
    unassigned: unassignedSeries,
    warnings,
    poolExhaustedDay,
    monthEndBillUsd: last?.cumulativeBillUsd ?? licenseFeesUsd,
    monthEndMeteredUsd: totalMeteredUsd,
    monthEndIncludedUsd: totalIncludedUsd,
    monthEndBlockedUsers: last?.blockedUsers ?? 0,
    monthEndBlockedBreakdown: last?.blockedBreakdown ?? emptyBreakdown(),
    poolUsedPct,
  };
}
