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

/** Slider bounds for the UI controls. */
export const RANGES = {
  totalLicenses: { min: 1, max: 1000, step: 1 },
  bizRatio: { min: 0, max: 1, step: 0.01 },
  activePct: { min: 0, max: 1, step: 0.01 },
  avgDevUsageCredits: { min: 1900, max: 19000, step: 100 },
  powerRatio: { min: 0, max: 1, step: 0.01 },
  powerMultiplier: { min: 2, max: 5, step: 0.1 },
  usageVariation: { min: 0, max: 1, step: 0.01 },
  individualLimitUsd: { min: 0, max: 500, step: 1 },
  enterpriseLimitMultiple: { min: 2, max: 5, step: 0.1 },
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
    totalLicenses: 100,
    bizRatio: 0.7,
    activePct: 0.8,
    avgDevUsageCredits: 2500,
    powerRatio: 0.2,
    powerMultiplier: 3,
    usageVariation: 0.3,
    individualLimitUsd: 50,
    enterpriseLimitMultiple: 2,
    promo: false,
    stopUsageBudgets: true,
    seed: 12345,
    costCenters: [makeDefaultCostCenter(1)],
  };
}
