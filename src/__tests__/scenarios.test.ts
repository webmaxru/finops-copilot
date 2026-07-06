import { describe, it, expect } from 'vitest';
import { DEFAULT_INPUTS } from '../model/defaults';
import { SCENARIOS, getScenario, matchScenarioId } from '../model/scenarios';
import { buildShareUrl, decodeInputs, encodeInputs } from '../state/shareConfig';

describe('scenarios', () => {
  it('includes the named default scenario', () => {
    const def = getScenario('two-cost-centers');
    expect(def).toBeDefined();
    expect(def?.name).toBe('Two cost centers, high and low usage');
  });

  it('offers exactly three distinct scenarios', () => {
    expect(SCENARIOS).toHaveLength(3);
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('detects the default inputs as the two-cost-centers scenario', () => {
    expect(matchScenarioId(DEFAULT_INPUTS())).toBe('two-cost-centers');
  });

  it('detects every scenario preset as active', () => {
    for (const scenario of SCENARIOS) {
      expect(matchScenarioId(scenario.make())).toBe(scenario.id);
    }
  });

  it('ignores the PRNG seed (Reshuffle keeps the scenario active)', () => {
    const inputs = { ...DEFAULT_INPUTS(), seed: 999_999 };
    expect(matchScenarioId(inputs)).toBe('two-cost-centers');
  });

  it('ignores cost-center ids when matching', () => {
    const inputs = DEFAULT_INPUTS();
    inputs.costCenters = inputs.costCenters.map((c, idx) => ({ ...c, id: `renamed-${idx}` }));
    expect(matchScenarioId(inputs)).toBe('two-cost-centers');
  });

  it('returns null when the configuration is customized', () => {
    expect(matchScenarioId({ ...DEFAULT_INPUTS(), totalLicenses: 123 })).toBeNull();
    expect(matchScenarioId({ ...DEFAULT_INPUTS(), stopUsageBudgets: false })).toBeNull();
  });
});

describe('shareConfig serialization', () => {
  it('round-trips every scenario back to the same active scenario', () => {
    for (const scenario of SCENARIOS) {
      const restored = decodeInputs(encodeInputs(scenario.make()));
      expect(restored).not.toBeNull();
      expect(matchScenarioId(restored!)).toBe(scenario.id);
    }
  });

  it('preserves all identity fields (ids are regenerated, not preserved)', () => {
    const original = SCENARIOS[2].make(); // locked-down: exercises many non-default fields
    const restored = decodeInputs(encodeInputs(original))!;
    expect(restored.totalLicenses).toBe(original.totalLicenses);
    expect(restored.universalUlbUsd).toBe(original.universalUlbUsd);
    expect(restored.enterpriseLimitUsd).toBe(original.enterpriseLimitUsd);
    expect(restored.stopUsageBudgets).toBe(original.stopUsageBudgets);
    expect(restored.seed).toBe(original.seed);
    expect(restored.costCenters).toHaveLength(original.costCenters.length);
    expect(restored.costCenters[0].includedCapEnabled).toBe(true);
    // ids are volatile and regenerated on decode
    expect(restored.costCenters[0].id).not.toBe(original.costCenters[0].id);
    expect(restored.costCenters[0].id).toBeTruthy();
  });

  it('returns null for missing or malformed tokens', () => {
    expect(decodeInputs(null)).toBeNull();
    expect(decodeInputs('')).toBeNull();
    expect(decodeInputs('not-valid-base64url!!')).toBeNull();
    expect(decodeInputs('e30')).toBeNull(); // {} — wrong/absent version
  });

  it('clamps out-of-range values from an untrusted token', () => {
    // Hand-craft a token with wildly out-of-range fields and confirm they clamp.
    const token = encodeInputs({
      ...DEFAULT_INPUTS(),
      totalLicenses: 999_999,
      bizRatio: 5,
      activePct: -1,
    });
    const restored = decodeInputs(token)!;
    expect(restored.totalLicenses).toBeLessThanOrEqual(1000);
    expect(restored.bizRatio).toBeLessThanOrEqual(1);
    expect(restored.activePct).toBeGreaterThanOrEqual(0);
  });

  it('builds a share URL carrying the config token', () => {
    const url = buildShareUrl(DEFAULT_INPUTS());
    expect(url).toContain('c=');
    const token = url.split('c=')[1];
    expect(matchScenarioId(decodeInputs(token)!)).toBe('two-cost-centers');
  });
});
