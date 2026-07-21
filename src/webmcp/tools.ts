// The two WebMCP tools this app exposes to browser AI agents.
//
// Design (see docs/webmcp-tools.md):
//   1. get_spend_forecast    — read-only; runs the current simulation and
//      returns the month-end spend forecast.
//   2. configure_enterprise_plan — write; sets the top-level enterprise inputs
//      (clamped to the documented ranges) then returns the recomputed forecast.
//
// Both tools DEFINE a result (`outputSchema`) and return structured output:
// `{ content: [{ type: 'text', text }], structuredContent }`, where
// `structuredContent` conforms to the tool's `outputSchema`.
//
// The pure functions `buildForecast` and `clampEnterprisePatch` hold all the
// logic and are unit-tested without a DOM. The engine is untouched: these tools
// only read inputs and drive the existing store actions.

import { runSimulation } from '../model/engine';
import {
  RANGES,
  enterpriseLimitMaxUsd,
} from '../model/defaults';
import { fmtUsd, fmtInt } from '../model/format';
import type { EnterpriseInputs } from '../model/types';

/** Minimal store surface the tools need (adapted from the zustand store). */
export interface SimStore {
  getInputs(): EnterpriseInputs;
  setInput<K extends keyof EnterpriseInputs>(key: K, value: EnterpriseInputs[K]): void;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round4 = (n: number): number => Math.round(n * 10000) / 10000;

// ---------------------------------------------------------------------------
// Forecast (read side)
// ---------------------------------------------------------------------------

export interface CostCenterForecast {
  name: string;
  seats: number;
  meteredUsd: number;
  blockedUsers: number;
  includedCapEnabled: boolean;
  stopUsageAtCap: boolean;
}

export interface SpendForecast {
  currency: 'USD';
  seats: { total: number; business: number; enterprise: number; active: number };
  includedPoolCredits: number;
  licenseFeesUsd: number;
  monthEndMeteredUsd: number;
  monthEndIncludedUsd: number;
  monthEndBillUsd: number;
  maxBillUsd: number;
  enterpriseMeteredBudgetUsd: number;
  blockedUsers: {
    total: number;
    byUserLimit: number;
    byIncludedCap: number;
    byCostCenterBudget: number;
    byEnterpriseBudget: number;
  };
  poolExhaustedDay: number | null;
  poolUsedPct: number;
  promoAllowancesActive: boolean;
  costCenters: CostCenterForecast[];
  unassigned: { seats: number; meteredUsd: number; blockedUsers: number };
  warnings: string[];
  summary: string;
}

/** Run the deterministic simulation for `inputs` and shape it as a forecast. */
export function buildForecast(inputs: EnterpriseInputs): SpendForecast {
  const r = runSimulation(inputs);
  const b = r.monthEndBlockedBreakdown;

  const forecast: SpendForecast = {
    currency: 'USD',
    seats: {
      total: inputs.totalLicenses,
      business: r.businessSeats,
      enterprise: r.enterpriseSeats,
      active: r.activeUsers,
    },
    includedPoolCredits: Math.round(r.poolCredits),
    licenseFeesUsd: round2(r.licenseFeesUsd),
    monthEndMeteredUsd: round2(r.monthEndMeteredUsd),
    monthEndIncludedUsd: round2(r.monthEndIncludedUsd),
    monthEndBillUsd: round2(r.monthEndBillUsd),
    maxBillUsd: round2(r.maxBillUsd),
    enterpriseMeteredBudgetUsd: round2(r.enterpriseBudgetUsd),
    blockedUsers: {
      total: r.monthEndBlockedUsers,
      byUserLimit: b.userLimit,
      byIncludedCap: b.includedCap,
      byCostCenterBudget: b.costCenterBudget,
      byEnterpriseBudget: b.enterpriseBudget,
    },
    poolExhaustedDay: r.poolExhaustedDay,
    poolUsedPct: round4(r.poolUsedPct),
    promoAllowancesActive: inputs.promo,
    costCenters: r.costCenters.map((cc) => ({
      name: cc.label,
      seats: cc.seats,
      meteredUsd: round2(cc.monthEndMeteredUsd),
      blockedUsers: cc.monthEndBlockedUsers,
      includedCapEnabled: cc.capped,
      stopUsageAtCap: cc.capStopsUsage,
    })),
    unassigned: {
      seats: r.unassigned.seats,
      meteredUsd: round2(r.unassigned.monthEndMeteredUsd),
      blockedUsers: r.unassigned.monthEndBlockedUsers,
    },
    warnings: r.warnings,
    summary: '',
  };

  forecast.summary =
    `Projected month-end bill ${fmtUsd(forecast.monthEndBillUsd)} ` +
    `(license fees ${fmtUsd(forecast.licenseFeesUsd)} + metered ${fmtUsd(forecast.monthEndMeteredUsd)}), ` +
    `max ${fmtUsd(forecast.maxBillUsd)}. ` +
    `${fmtInt(forecast.seats.active)} of ${fmtInt(forecast.seats.total)} seats active; ` +
    `${fmtInt(forecast.blockedUsers.total)} user(s) blocked. ` +
    (forecast.poolExhaustedDay
      ? `Included pool exhausted on day ${forecast.poolExhaustedDay}.`
      : 'Included pool not exhausted this month.');

  return forecast;
}

/** JSON Schema for a SpendForecast — reused as the result of both tools. */
const FORECAST_SCHEMA: Record<string, unknown> = {
  type: 'object',
  description: 'Month-end GitHub Copilot spend forecast (all money in USD).',
  properties: {
    currency: { type: 'string', const: 'USD' },
    seats: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        business: { type: 'integer' },
        enterprise: { type: 'integer' },
        active: { type: 'integer' },
      },
      required: ['total', 'business', 'enterprise', 'active'],
    },
    includedPoolCredits: { type: 'integer', description: 'Total included AI-credit pool.' },
    licenseFeesUsd: { type: 'number' },
    monthEndMeteredUsd: { type: 'number' },
    monthEndIncludedUsd: { type: 'number', description: 'USD value of included credits consumed.' },
    monthEndBillUsd: { type: 'number', description: 'License fees + metered spend.' },
    maxBillUsd: { type: 'number', description: 'License fees + enterprise metered budget cap.' },
    enterpriseMeteredBudgetUsd: { type: 'number' },
    blockedUsers: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        byUserLimit: { type: 'integer' },
        byIncludedCap: {
          type: 'integer',
          description: 'Blocked at a cost-center AI credit pool cap set to "block".',
        },
        byCostCenterBudget: { type: 'integer' },
        byEnterpriseBudget: { type: 'integer' },
      },
      required: ['total', 'byUserLimit', 'byIncludedCap', 'byCostCenterBudget', 'byEnterpriseBudget'],
    },
    poolExhaustedDay: {
      type: ['integer', 'null'],
      description: 'Day (1-30) the included pool ran out, or null if it did not.',
    },
    poolUsedPct: { type: 'number', description: 'Share of the included pool consumed by day 30 (0-1).' },
    promoAllowancesActive: { type: 'boolean' },
    costCenters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          seats: { type: 'integer' },
          meteredUsd: { type: 'number' },
          blockedUsers: { type: 'integer' },
          includedCapEnabled: { type: 'boolean' },
          stopUsageAtCap: {
            type: 'boolean',
            description: 'When the AI credit pool cap is hit: block members (true) or continue as overage (false).',
          },
        },
        required: ['name', 'seats', 'meteredUsd', 'blockedUsers', 'includedCapEnabled', 'stopUsageAtCap'],
      },
    },
    unassigned: {
      type: 'object',
      properties: {
        seats: { type: 'integer' },
        meteredUsd: { type: 'number' },
        blockedUsers: { type: 'integer' },
      },
      required: ['seats', 'meteredUsd', 'blockedUsers'],
    },
    warnings: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string', description: 'One-line human-readable summary.' },
  },
  required: [
    'currency',
    'seats',
    'includedPoolCredits',
    'licenseFeesUsd',
    'monthEndMeteredUsd',
    'monthEndIncludedUsd',
    'monthEndBillUsd',
    'maxBillUsd',
    'enterpriseMeteredBudgetUsd',
    'blockedUsers',
    'poolExhaustedDay',
    'poolUsedPct',
    'promoAllowancesActive',
    'costCenters',
    'unassigned',
    'warnings',
    'summary',
  ],
};

// ---------------------------------------------------------------------------
// Configure (write side)
// ---------------------------------------------------------------------------

/** Fields the configure tool accepts (all optional; agent-facing names). */
export interface EnterprisePatch {
  totalLicenses?: number;
  businessRatio?: number;
  activePct?: number;
  avgDevUsageCredits?: number;
  powerUsers?: number;
  enterpriseBudgetUsd?: number;
  promo?: boolean;
}

export interface AppliedEnterprisePatch {
  totalLicenses?: number;
  businessRatio?: number;
  activePct?: number;
  avgDevUsageCredits?: number;
  powerUsers?: number;
  enterpriseBudgetUsd?: number;
  promo?: boolean;
}

export interface ClampResult {
  /** Provided fields, each clamped to its documented range. */
  applied: AppliedEnterprisePatch;
  /** Names of provided fields whose value had to be adjusted to fit range. */
  clampedFields: string[];
  /** Number of fields that were provided (before clamping). */
  providedCount: number;
}

const toNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const clampNum = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/**
 * Validate and clamp an agent-supplied patch against the documented input
 * ranges (src/model/defaults.ts `RANGES`, docs/formulas.md §1-§2, §9). Dynamic
 * bounds (power users, enterprise budget) are resolved against the *resulting*
 * total licenses so the clamp is self-consistent within a single call.
 */
export function clampEnterprisePatch(
  patch: EnterprisePatch,
  current: EnterpriseInputs,
): ClampResult {
  const applied: AppliedEnterprisePatch = {};
  const clampedFields: string[] = [];
  let providedCount = 0;

  // Clamp a provided value to [min, max]; `clampedFields` records only genuine
  // range adjustments, while integer rounding is a separate, silent coercion.
  const handle = (
    raw: number | undefined,
    name: string,
    min: number,
    max: number,
    integer: boolean,
  ): number | undefined => {
    if (raw === undefined) return undefined;
    providedCount += 1;
    const ranged = clampNum(raw, min, max);
    if (ranged !== raw) clampedFields.push(name);
    return integer ? Math.round(ranged) : ranged;
  };

  // Resolve total licenses first: dynamic maxes below depend on it.
  const total = handle(
    toNum(patch.totalLicenses),
    'totalLicenses',
    RANGES.totalLicenses.min,
    RANGES.totalLicenses.max,
    true,
  );
  if (total !== undefined) applied.totalLicenses = total;
  const resolvedTotal = applied.totalLicenses ?? current.totalLicenses;

  const businessRatio = handle(
    toNum(patch.businessRatio),
    'businessRatio',
    RANGES.bizRatio.min,
    RANGES.bizRatio.max,
    false,
  );
  if (businessRatio !== undefined) applied.businessRatio = businessRatio;

  const activePct = handle(
    toNum(patch.activePct),
    'activePct',
    RANGES.activePct.min,
    RANGES.activePct.max,
    false,
  );
  if (activePct !== undefined) applied.activePct = activePct;

  const avgDevUsageCredits = handle(
    toNum(patch.avgDevUsageCredits),
    'avgDevUsageCredits',
    RANGES.avgDevUsageCredits.min,
    RANGES.avgDevUsageCredits.max,
    false,
  );
  if (avgDevUsageCredits !== undefined) applied.avgDevUsageCredits = avgDevUsageCredits;

  // Max power users is dynamic in the UI: the total number of seats.
  const powerUsers = handle(
    toNum(patch.powerUsers),
    'powerUsers',
    RANGES.powerUsers.min,
    resolvedTotal,
    true,
  );
  if (powerUsers !== undefined) applied.powerUsers = powerUsers;

  // Enterprise budget max scales with total seats (defaults.ts enterpriseLimitMaxUsd).
  const enterpriseBudgetUsd = handle(
    toNum(patch.enterpriseBudgetUsd),
    'enterpriseBudgetUsd',
    RANGES.enterpriseLimitUsd.min,
    enterpriseLimitMaxUsd(resolvedTotal),
    false,
  );
  if (enterpriseBudgetUsd !== undefined) applied.enterpriseBudgetUsd = enterpriseBudgetUsd;

  if (typeof patch.promo === 'boolean') {
    providedCount += 1;
    applied.promo = patch.promo;
  }

  return { applied, clampedFields, providedCount };
}

/** Apply a clamped patch to the store, mapping agent names to input keys. */
function applyPatchToStore(store: SimStore, applied: AppliedEnterprisePatch): void {
  // Total licenses first so power-user/budget reconciliation is consistent.
  if (applied.totalLicenses !== undefined) store.setInput('totalLicenses', applied.totalLicenses);
  if (applied.businessRatio !== undefined) store.setInput('bizRatio', applied.businessRatio);
  if (applied.activePct !== undefined) store.setInput('activePct', applied.activePct);
  if (applied.avgDevUsageCredits !== undefined)
    store.setInput('avgDevUsageCredits', applied.avgDevUsageCredits);
  if (applied.powerUsers !== undefined) store.setInput('powerUsers', applied.powerUsers);
  if (applied.enterpriseBudgetUsd !== undefined)
    store.setInput('enterpriseLimitUsd', applied.enterpriseBudgetUsd);
  if (applied.promo !== undefined) store.setInput('promo', applied.promo);
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const textResult = (
  text: string,
  structuredContent: unknown,
  isError = false,
): ModelContextToolResult => ({
  content: [{ type: 'text', text }],
  structuredContent,
  ...(isError ? { isError: true } : {}),
});

/** Build the two imperative WebMCP tools bound to a given store. */
export function createTools(store: SimStore): ModelContextTool[] {
  const getSpendForecast: ModelContextTool = {
    name: 'get_spend_forecast',
    title: 'Get Copilot spend forecast',
    description:
      "Run the simulator on the current configuration and return the projected month-end " +
      'GitHub Copilot bill: license fees, metered (paid-usage) spend, included-credit usage, ' +
      'the max possible bill, blocked-user counts by reason, included-pool exhaustion, and a ' +
      'per-cost-center breakdown. Use this to report or reason about current projected spend. ' +
      'Read-only: it does not change any input.',
    annotations: { readOnlyHint: true },
    outputSchema: FORECAST_SCHEMA,
    execute: () => {
      const forecast = buildForecast(store.getInputs());
      return textResult(forecast.summary, forecast);
    },
  };

  const configureEnterprisePlan: ModelContextTool = {
    name: 'configure_enterprise_plan',
    title: 'Configure enterprise plan',
    description:
      'Update the top-level enterprise inputs of the spend simulator and return the recomputed ' +
      'forecast. Provide any subset of: totalLicenses (1-1000), businessRatio (0-1 Business share ' +
      'of seats), activePct (0-1 seats that actually use Copilot), avgDevUsageCredits (1900-19000 ' +
      'monthly credits per active developer), powerUsers (0..totalLicenses), enterpriseBudgetUsd ' +
      '(enterprise metered budget in USD), and promo (boolean, promotional included allowances). ' +
      'Out-of-range values are clamped to the allowed range and reported. Cost centers are not ' +
      'changed by this tool.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        totalLicenses: {
          type: 'integer',
          minimum: RANGES.totalLicenses.min,
          maximum: RANGES.totalLicenses.max,
          description: 'Total Copilot seats (licenses).',
        },
        businessRatio: {
          type: 'number',
          minimum: RANGES.bizRatio.min,
          maximum: RANGES.bizRatio.max,
          description: 'Fraction of seats on Copilot Business (rest are Enterprise).',
        },
        activePct: {
          type: 'number',
          minimum: RANGES.activePct.min,
          maximum: RANGES.activePct.max,
          description: 'Fraction of seats that actually use Copilot.',
        },
        avgDevUsageCredits: {
          type: 'number',
          minimum: RANGES.avgDevUsageCredits.min,
          maximum: RANGES.avgDevUsageCredits.max,
          description: 'Average monthly AI credits used by an active developer.',
        },
        powerUsers: {
          type: 'integer',
          minimum: RANGES.powerUsers.min,
          description: 'Number of power users (capped at totalLicenses).',
        },
        enterpriseBudgetUsd: {
          type: 'number',
          minimum: RANGES.enterpriseLimitUsd.min,
          description: 'Enterprise metered budget in USD (max scales with seats).',
        },
        promo: {
          type: 'boolean',
          description: 'Whether promotional included allowances apply.',
        },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        applied: {
          type: 'object',
          description: 'The provided fields, clamped to their allowed ranges.',
          properties: {
            totalLicenses: { type: 'integer' },
            businessRatio: { type: 'number' },
            activePct: { type: 'number' },
            avgDevUsageCredits: { type: 'number' },
            powerUsers: { type: 'integer' },
            enterpriseBudgetUsd: { type: 'number' },
            promo: { type: 'boolean' },
          },
          additionalProperties: false,
        },
        clampedFields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of fields whose value was adjusted to fit its range.',
        },
        forecast: FORECAST_SCHEMA,
      },
      required: ['applied', 'clampedFields', 'forecast'],
    },
    execute: (input) => {
      const patch = (input ?? {}) as EnterprisePatch;
      const { applied, clampedFields, providedCount } = clampEnterprisePatch(
        patch,
        store.getInputs(),
      );

      if (providedCount === 0) {
        return textResult(
          'No changes applied: provide at least one of totalLicenses, businessRatio, activePct, ' +
            'avgDevUsageCredits, powerUsers, enterpriseBudgetUsd, or promo.',
          { applied: {}, clampedFields: [], forecast: buildForecast(store.getInputs()) },
          true,
        );
      }

      applyPatchToStore(store, applied);
      const forecast = buildForecast(store.getInputs());

      const clampNote = clampedFields.length
        ? ` Clamped to range: ${clampedFields.join(', ')}.`
        : '';
      const text = `Applied ${providedCount} setting(s).${clampNote} ${forecast.summary}`;

      return textResult(text, { applied, clampedFields, forecast });
    },
  };

  return [getSpendForecast, configureEnterprisePlan];
}
