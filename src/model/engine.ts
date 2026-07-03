import { CREDIT_USD, SEAT_PRICE, includedPerSeat, SIM_DAYS, INHERITED_CC_BUDGET_MULTIPLE } from './defaults';
import { mulberry32, lognormal } from './rng';
import type {
  DaySnapshot,
  EnterpriseInputs,
  GroupSeries,
  IncludedCapMode,
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
  capped: boolean;
  capMode: IncludedCapMode;
  ccBudgetUsd: number | null; // metered budget (null for unassigned)
  stopUsageBudget: boolean;
  // mutable accumulators
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
}

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
  capped: boolean;
  capMode: IncludedCapMode;
  ccBudgetMultiple: number | null;
  stopUsageBudget: boolean;
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
    capped: a.capped,
    capMode: a.capMode,
    ccBudgetUsd: a.ccBudgetMultiple == null ? null : a.ccBudgetMultiple * licenseValueUsd,
    stopUsageBudget: a.stopUsageBudget,
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
        bizRatio: cc.planMixInherit ? inp.bizRatio : cc.bizRatio,
        inclB,
        inclE,
        activePct: inp.activePct,
        ulbUsd: cc.userLimitInherit ? inp.individualLimitUsd : cc.userLimitUsd,
        capped: cc.includedCapEnabled,
        capMode: cc.includedCapMode,
        ccBudgetMultiple: cc.budgetMultipleInherit ? INHERITED_CC_BUDGET_MULTIPLE : cc.budgetMultiple,
        stopUsageBudget: cc.stopUsageBudget,
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
    ulbUsd: inp.individualLimitUsd,
    capped: false,
    capMode: 'block',
    ccBudgetMultiple: null,
    stopUsageBudget: inp.stopUsageBudgets,
  });
  groups.push(unassigned);

  // ---- Enterprise-level totals ----
  const totalBizSeats = groups.reduce((s, g) => s + g.bizSeats, 0);
  const totalEntSeats = groups.reduce((s, g) => s + g.entSeats, 0);
  const licenseFeesUsd = totalBizSeats * SEAT_PRICE.business + totalEntSeats * SEAT_PRICE.enterprise;
  const poolCredits = groups.reduce((s, g) => s + g.carveoutCredits, 0);
  const enterpriseBudgetUsd = inp.enterpriseLimitUsd;
  const maxBillUsd = licenseFeesUsd + enterpriseBudgetUsd;
  const activeUsers = groups.reduce((s, g) => s + g.activeCount, 0);

  // Shared pool = credits funded by seats NOT in a capped cost center.
  let sharedPool = groups.filter((g) => !g.capped).reduce((s, g) => s + g.carveoutCredits, 0);
  for (const g of groups) if (g.capped) g.subPool = g.carveoutCredits;

  // ---- Build the active-user population with monthly + daily usage ----
  const users: UserState[] = [];
  for (const g of groups) {
    const powerCount = Math.round(g.activeCount * inp.powerRatio);
    for (let i = 0; i < g.activeCount; i++) {
      const isPower = i < powerCount;
      const target = isPower
        ? inp.avgDevUsageCredits * inp.powerMultiplier
        : inp.avgDevUsageCredits;
      const monthly = lognormal(rng, target, inp.usageVariation);
      const weights: number[] = [];
      let wsum = 0;
      for (let d = 0; d < SIM_DAYS; d++) {
        const w = lognormal(rng, 1, inp.usageVariation);
        weights.push(w);
        wsum += w;
      }
      const dailyShare = weights.map((w) => (wsum > 0 ? (monthly * w) / wsum : monthly / SIM_DAYS));
      users.push({ g, dailyShare, cum: 0, ulb: g.ulbCredits, blocked: false });
    }
  }

  // ---- Daily accounting ----
  let entMeteredUsd = 0;
  let totalIncludedUsd = 0;
  let totalMeteredUsd = 0;
  let poolExhaustedDay: number | null = null;
  const entDays: DaySnapshot[] = [];

  const applyMetered = (g: GroupState, credits: number): number => {
    let allowedUsd = credits * CREDIT_USD;
    if (g.ccBudgetUsd != null && g.stopUsageBudget) {
      allowedUsd = Math.min(allowedUsd, Math.max(0, g.ccBudgetUsd - g.meteredUsd));
    }
    if (inp.stopUsageBudgets) {
      allowedUsd = Math.min(allowedUsd, Math.max(0, enterpriseBudgetUsd - entMeteredUsd));
    }
    if (allowedUsd <= 0) return 0;
    g.meteredUsd += allowedUsd;
    entMeteredUsd += allowedUsd;
    return allowedUsd / CREDIT_USD;
  };

  for (let d = 0; d < SIM_DAYS; d++) {
    for (const u of users) {
      if (u.blocked) continue;
      const room = u.ulb - u.cum;
      if (room <= 1e-9) {
        u.blocked = true;
        continue;
      }
      const spend = Math.min(u.dailyShare[d], room);
      if (spend <= 0) continue;

      const g = u.g;
      let includedUsed = 0;
      let meteredCredits = 0;

      if (g.capped) {
        const inc = Math.min(spend, g.subPool);
        g.subPool -= inc;
        includedUsed += inc;
        const leftover = spend - inc;
        if (leftover > 0 && g.capMode === 'overage') {
          meteredCredits = applyMetered(g, leftover);
        }
        // 'block' mode: leftover is dropped (member blocked from further included use)
      } else {
        const inc = Math.min(spend, sharedPool);
        sharedPool -= inc;
        includedUsed += inc;
        const leftover = spend - inc;
        if (leftover > 0) meteredCredits = applyMetered(g, leftover);
      }

      const spent = includedUsed + meteredCredits;
      u.cum += spent;
      g.includedUsd += includedUsed * CREDIT_USD;
      totalIncludedUsd += includedUsed * CREDIT_USD;
      totalMeteredUsd += meteredCredits * CREDIT_USD;
      if (u.cum >= u.ulb - 1e-9) u.blocked = true;
    }

    if (poolExhaustedDay === null && sharedPool <= 1e-6) poolExhaustedDay = d + 1;

    // Per-group snapshots
    for (const g of groups) {
      const gBlocked = users.reduce((n, u) => (u.g === g && u.blocked ? n + 1 : n), 0);
      g.days.push({
        day: d + 1,
        poolRemaining: g.capped ? g.subPool : NaN,
        includedConsumedUsd: g.includedUsd,
        meteredUsd: g.meteredUsd,
        cumulativeBillUsd: g.licenseValueUsd + g.meteredUsd,
        blockedUsers: gBlocked,
      });
    }

    const blockedNow = users.reduce((n, u) => (u.blocked ? n + 1 : n), 0);
    const cappedSub = groups.reduce((s, g) => s + (g.capped ? g.subPool : 0), 0);
    entDays.push({
      day: d + 1,
      poolRemaining: sharedPool + cappedSub,
      includedConsumedUsd: totalIncludedUsd,
      meteredUsd: totalMeteredUsd,
      cumulativeBillUsd: licenseFeesUsd + totalMeteredUsd,
      blockedUsers: blockedNow,
    });
  }

  // ---- Build output series ----
  const toSeries = (g: GroupState): GroupSeries => ({
    key: g.key,
    label: g.label,
    kind: g.kind,
    seats: g.seats,
    activeUsers: g.activeCount,
    poolCredits: g.carveoutCredits,
    licenseValueUsd: g.licenseValueUsd,
    capped: g.capped,
    days: g.days,
    monthEndMeteredUsd: g.meteredUsd,
    monthEndBlockedUsers: g.days[g.days.length - 1]?.blockedUsers ?? 0,
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
    poolCredits,
    licenseValueUsd: licenseFeesUsd,
    capped: false,
    days: entDays,
    monthEndMeteredUsd: totalMeteredUsd,
    monthEndBlockedUsers: last?.blockedUsers ?? 0,
  };

  // ---- Warnings ----
  const warnings: string[] = [];
  if (ccSeatSum > inp.totalLicenses) {
    warnings.push(
      `Cost centers hold ${ccSeatSum} seats but only ${inp.totalLicenses} licenses exist — reduce members so the total fits.`,
    );
  }
  const perSeatIncluded = inp.totalLicenses > 0 ? (poolCredits * CREDIT_USD) / inp.totalLicenses : 0;
  if (inp.individualLimitUsd > 0 && inp.individualLimitUsd < perSeatIncluded) {
    warnings.push(
      `Individual limit $${inp.individualLimitUsd} is below the average included per-seat value ($${perSeatIncluded.toFixed(0)}) — users may be blocked before using their included share.`,
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
    poolUsedPct,
  };
}
