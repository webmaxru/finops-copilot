import { describe, it, expect } from 'vitest';
import { DEFAULT_INPUTS, RANGES, enterpriseLimitMaxUsd } from '../../model/defaults';
import {
  buildForecast,
  clampEnterprisePatch,
  createTools,
  type SimStore,
  type SpendForecast,
} from '../tools';
import type { EnterpriseInputs } from '../../model/types';

const REQUIRED_FORECAST_KEYS: (keyof SpendForecast)[] = [
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
];

/** A minimal in-memory SimStore for exercising the tool executes. */
function makeFakeStore(initial: EnterpriseInputs = DEFAULT_INPUTS()): SimStore {
  let inputs: EnterpriseInputs = { ...initial };
  return {
    getInputs: () => inputs,
    setInput: (key, value) => {
      inputs = { ...inputs, [key]: value };
    },
  };
}

describe('buildForecast', () => {
  it('returns every documented field with finite money numbers', () => {
    const f = buildForecast(DEFAULT_INPUTS());
    for (const key of REQUIRED_FORECAST_KEYS) {
      expect(f[key]).toBeDefined();
    }
    expect(f.currency).toBe('USD');
    expect(Number.isFinite(f.monthEndBillUsd)).toBe(true);
    expect(Number.isFinite(f.maxBillUsd)).toBe(true);
    expect(f.monthEndBillUsd).toBeGreaterThan(0);
    expect(typeof f.summary).toBe('string');
    expect(f.summary.length).toBeGreaterThan(0);
  });

  it('mirrors the two default cost centers and the blocked breakdown sum', () => {
    const f = buildForecast(DEFAULT_INPUTS());
    expect(f.costCenters).toHaveLength(2);
    const b = f.blockedUsers;
    expect(b.byUserLimit + b.byIncludedCap + b.byCostCenterBudget + b.byEnterpriseBudget).toBe(b.total);
    // The new per-CC at-cap choice is surfaced on each cost center.
    expect(typeof f.costCenters[0].stopUsageAtCap).toBe('boolean');
    expect(f.poolUsedPct).toBeGreaterThanOrEqual(0);
    expect(f.poolUsedPct).toBeLessThanOrEqual(1);
  });

  it('is deterministic for the same inputs', () => {
    const inputs = DEFAULT_INPUTS();
    expect(buildForecast(inputs)).toEqual(buildForecast(inputs));
  });
});

describe('clampEnterprisePatch', () => {
  const base = DEFAULT_INPUTS();

  it('reports no provided fields for an empty patch', () => {
    const r = clampEnterprisePatch({}, base);
    expect(r.providedCount).toBe(0);
    expect(r.applied).toEqual({});
    expect(r.clampedFields).toEqual([]);
  });

  it('clamps out-of-range scalars and records which were clamped', () => {
    const r = clampEnterprisePatch(
      { totalLicenses: 99999, businessRatio: 5, activePct: -1, avgDevUsageCredits: 10 },
      base,
    );
    expect(r.applied.totalLicenses).toBe(RANGES.totalLicenses.max);
    expect(r.applied.businessRatio).toBe(RANGES.bizRatio.max);
    expect(r.applied.activePct).toBe(RANGES.activePct.min);
    expect(r.applied.avgDevUsageCredits).toBe(RANGES.avgDevUsageCredits.min);
    expect(r.clampedFields).toEqual(
      expect.arrayContaining([
        'totalLicenses',
        'businessRatio',
        'activePct',
        'avgDevUsageCredits',
      ]),
    );
    expect(r.providedCount).toBe(4);
  });

  it('caps power users at the resulting total licenses', () => {
    const r = clampEnterprisePatch({ totalLicenses: 50, powerUsers: 999 }, base);
    expect(r.applied.powerUsers).toBe(50);
    expect(r.clampedFields).toContain('powerUsers');
  });

  it('caps the enterprise budget at the seat-scaled maximum', () => {
    const r = clampEnterprisePatch({ totalLicenses: 200, enterpriseBudgetUsd: 1e9 }, base);
    expect(r.applied.enterpriseBudgetUsd).toBe(enterpriseLimitMaxUsd(200));
    expect(r.clampedFields).toContain('enterpriseBudgetUsd');
  });

  it('rounds integer inputs and leaves in-range values untouched', () => {
    const r = clampEnterprisePatch({ totalLicenses: 123.7, powerUsers: 4.2 }, base);
    expect(r.applied.totalLicenses).toBe(124);
    expect(r.applied.powerUsers).toBe(4);
    expect(r.clampedFields).toEqual([]);
  });

  it('passes a boolean promo through and counts it as provided', () => {
    const r = clampEnterprisePatch({ promo: false }, base);
    expect(r.applied.promo).toBe(false);
    expect(r.providedCount).toBe(1);
    expect(r.clampedFields).toEqual([]);
  });

  it('ignores non-numeric values', () => {
    const r = clampEnterprisePatch(
      { totalLicenses: 'lots' as unknown as number },
      base,
    );
    expect(r.providedCount).toBe(0);
    expect(r.applied.totalLicenses).toBeUndefined();
  });
});

describe('createTools', () => {
  it('exposes exactly the two expected tools with result schemas', () => {
    const tools = createTools(makeFakeStore());
    expect(tools.map((t) => t.name)).toEqual([
      'get_spend_forecast',
      'configure_enterprise_plan',
    ]);
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect((tool.outputSchema as { type?: string }).type).toBe('object');
      expect(tool.description.length).toBeGreaterThan(0);
    }
    const readOnly = tools.find((t) => t.name === 'get_spend_forecast');
    expect(readOnly?.annotations?.readOnlyHint).toBe(true);
  });

  it('get_spend_forecast returns structured content and text, read-only', async () => {
    const store = makeFakeStore();
    const before = store.getInputs();
    const tool = createTools(store).find((t) => t.name === 'get_spend_forecast')!;
    const result = await tool.execute({}, {} as ModelContextClient);
    expect(result.content?.[0]?.type).toBe('text');
    const sc = result.structuredContent as SpendForecast;
    expect(sc.currency).toBe('USD');
    expect(sc.monthEndBillUsd).toBeGreaterThan(0);
    // read-only: inputs unchanged
    expect(store.getInputs()).toEqual(before);
  });

  it('configure_enterprise_plan mutates the store and returns the new forecast', async () => {
    const store = makeFakeStore();
    const tool = createTools(store).find((t) => t.name === 'configure_enterprise_plan')!;
    const result = await tool.execute(
      { totalLicenses: 200, businessRatio: 0.5, enterpriseBudgetUsd: 1e9, promo: false },
      {} as ModelContextClient,
    );
    const payload = result.structuredContent as {
      applied: { totalLicenses?: number; businessRatio?: number; enterpriseBudgetUsd?: number };
      clampedFields: string[];
      forecast: SpendForecast;
    };
    // store was updated (agent name businessRatio -> bizRatio input)
    expect(store.getInputs().totalLicenses).toBe(200);
    expect(store.getInputs().bizRatio).toBe(0.5);
    expect(store.getInputs().enterpriseLimitUsd).toBe(enterpriseLimitMaxUsd(200));
    expect(store.getInputs().promo).toBe(false);
    // budget was clamped and reported
    expect(payload.clampedFields).toContain('enterpriseBudgetUsd');
    expect(payload.forecast.seats.total).toBe(200);
  });

  it('configure_enterprise_plan returns an error result when nothing is provided', async () => {
    const store = makeFakeStore();
    const tool = createTools(store).find((t) => t.name === 'configure_enterprise_plan')!;
    const result = await tool.execute({}, {} as ModelContextClient);
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toMatch(/at least one/i);
  });
});
