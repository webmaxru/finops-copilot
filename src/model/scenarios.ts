// Quick-configure scenario presets shown under the bill meter. A scenario is
// nothing more than a preset of the EXISTING simulation inputs — every value is
// a real, in-range control (a governance setting or a what-if sizing input), so
// scenarios never introduce new behavior or change any formula. They just move
// several sliders/toggles at once to illustrate a distinct spend situation.
//
// Each preset pins a fixed `seed` so results are reproducible and shareable via
// URL; "which scenario is active" is decided by comparing the identity-defining
// fields, deliberately ignoring `seed` (so Reshuffle keeps the scenario active)
// and each cost center's machine-generated `id`.

import {
  DEFAULT_INPUTS,
  ccBudgetDefaultUsd,
  makeDefaultCostCenter,
} from './defaults';
import type { CostCenter, EnterpriseInputs } from './types';

export interface Scenario {
  /** Stable identifier used for the active-state highlight and URL/telemetry. */
  id: string;
  /** Short link label. */
  name: string;
  /** Longer explanation surfaced as a tooltip. */
  description: string;
  /** Build a fresh inputs object for this scenario (new objects each call). */
  make: () => EnterpriseInputs;
}

/** Build a cost center from the shared defaults, then apply scenario overrides. */
function costCenter(
  index: number,
  name: string,
  members: number,
  avgDevUsageCredits: number,
  overrides: Partial<CostCenter> = {},
): CostCenter {
  return {
    ...makeDefaultCostCenter(index),
    name,
    members,
    avgDevUsageCredits,
    budgetUsd: ccBudgetDefaultUsd(members),
    ...overrides,
  };
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'two-cost-centers',
    name: 'Two cost centers, high and low usage',
    description:
      'The shipped default: a high-usage cost center (30 seats) and a low-usage one (70 seats), '
      + 'metered budgets with hard stops on. A balanced starting point.',
    make: () => DEFAULT_INPUTS(),
  },
  {
    id: 'heavy-adoption',
    name: 'Heavy adoption, no guardrails',
    description:
      'Enthusiastic rollout with the brakes off: high usage everywhere, a generous per-user budget, '
      + 'and no hard stops — so metered spend runs past the budget and the projected bill exceeds the max.',
    make: () => ({
      ...DEFAULT_INPUTS(),
      activePct: 0.9,
      avgDevUsageCredits: 10_000,
      usageVariation: 0.3,
      universalUlbUsd: 1_000, // = 10x avg usage: effectively no per-user cap
      powerUsers: 20,
      avgPowerUserBudgetUsd: 400,
      stopUsageBudgets: false,
      seed: 24680,
      costCenters: [
        costCenter(1, 'High usage cost center', 30, 16_000, { stopUsageBudget: false }),
        costCenter(2, 'Low usage cost center', 70, 8_000, { stopUsageBudget: false }),
      ],
    }),
  },
  {
    id: 'locked-down',
    name: 'Locked-down budgets',
    description:
      'Aggressive cost control: a low universal per-user budget, tight metered budgets with hard stops, '
      + "and each cost center capped to its own licenses' credits — so real demand is high but many users get blocked.",
    make: () => ({
      ...DEFAULT_INPUTS(),
      activePct: 0.85,
      avgDevUsageCredits: 8_000,
      usageVariation: 0.5,
      universalUlbUsd: 40, // binding per-user hard stop
      enterpriseLimitUsd: 1_500,
      powerUsers: 5,
      stopUsageBudgets: true,
      seed: 13579,
      costCenters: [
        costCenter(1, 'High usage cost center', 30, 12_000, {
          includedCapEnabled: true,
          stopUsageBudget: true,
        }),
        costCenter(2, 'Low usage cost center', 70, 6_000, {
          includedCapEnabled: true,
          stopUsageBudget: true,
        }),
      ],
    }),
  },
];

/**
 * Stable string of the fields that define a scenario's identity. Excludes the
 * PRNG `seed` (Reshuffle must not drop the active highlight) and each cost
 * center's `id` (machine-generated, not meaningful to the configuration).
 */
function canonicalKey(i: EnterpriseInputs): string {
  return JSON.stringify({
    totalLicenses: i.totalLicenses,
    bizRatio: i.bizRatio,
    activePct: i.activePct,
    avgDevUsageCredits: i.avgDevUsageCredits,
    powerUsers: i.powerUsers,
    avgPowerUserBudgetUsd: i.avgPowerUserBudgetUsd,
    usageVariation: i.usageVariation,
    universalUlbUsd: i.universalUlbUsd,
    enterpriseLimitUsd: i.enterpriseLimitUsd,
    promo: i.promo,
    enterpriseBudgetExcludesCostCenters: i.enterpriseBudgetExcludesCostCenters,
    stopUsageBudgets: i.stopUsageBudgets,
    costCenters: i.costCenters.map((c) => ({
      name: c.name,
      members: c.members,
      avgDevUsageCredits: c.avgDevUsageCredits,
      userLimitInherit: c.userLimitInherit,
      userLimitUsd: c.userLimitUsd,
      budgetUsd: c.budgetUsd,
      stopUsageBudget: c.stopUsageBudget,
      includedCapEnabled: c.includedCapEnabled,
    })),
  });
}

/** Return the id of the scenario whose preset matches these inputs, else null. */
export function matchScenarioId(inputs: EnterpriseInputs): string | null {
  const key = canonicalKey(inputs);
  const match = SCENARIOS.find((s) => canonicalKey(s.make()) === key);
  return match ? match.id : null;
}

/** Look up a scenario by id. */
export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
