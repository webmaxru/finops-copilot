import { create } from 'zustand';
import { useMemo } from 'react';
import { DEFAULT_INPUTS, makeDefaultCostCenter, ccBudgetDefaultUsd } from '../model/defaults';
import { getScenario, matchScenarioId } from '../model/scenarios';
import { runSimulation } from '../model/engine';
import { readInputsFromLocation, writeInputsToLocation } from './shareConfig';
import type { CostCenter, EnterpriseInputs, SimResult } from '../model/types';

export type Theme = 'dark' | 'light';

function initialTheme(): Theme {
  try {
    if (typeof localStorage !== 'undefined') {
      const t = localStorage.getItem('theme');
      if (t === 'light' || t === 'dark') return t;
    }
  } catch {
    /* ignore (SSR / privacy mode) */
  }
  return 'dark';
}

interface Store {
  inputs: EnterpriseInputs;
  theme: Theme;

  setInput: <K extends keyof EnterpriseInputs>(key: K, value: EnterpriseInputs[K]) => void;
  addCostCenter: () => void;
  removeCostCenter: (id: string) => void;
  updateCostCenter: (id: string, patch: Partial<CostCenter>) => void;
  /** Replace the whole inputs object (used for scenarios and shared-config loading). */
  applyInputs: (inputs: EnterpriseInputs) => void;
  /** Apply a named scenario preset (no-op if the id is unknown). */
  applyScenario: (id: string) => void;
  reshuffle: () => void;
  reset: () => void;
  toggleTheme: () => void;
}

export const useStore = create<Store>((set) => ({
  // Hydrate from a shared-config URL (?c=...) when present, else defaults.
  inputs: readInputsFromLocation() ?? DEFAULT_INPUTS(),
  theme: initialTheme(),

  setInput: (key, value) => set((s) => ({ inputs: { ...s.inputs, [key]: value } })),

  addCostCenter: () =>
    set((s) => {
      const assigned = s.inputs.costCenters.reduce((sum, c) => sum + c.members, 0);
      const remaining = Math.max(0, s.inputs.totalLicenses - assigned);
      const cc = makeDefaultCostCenter(s.inputs.costCenters.length + 1);
      cc.members = Math.min(cc.members, remaining);
      // Scale the default budget to the CC's actual (possibly clamped) seats,
      // mirroring the enterprise limit's per-seat default (docs/formulas.md §5.3).
      cc.budgetUsd = ccBudgetDefaultUsd(cc.members);
      return { inputs: { ...s.inputs, costCenters: [...s.inputs.costCenters, cc] } };
    }),

  removeCostCenter: (id) =>
    set((s) => ({
      inputs: { ...s.inputs, costCenters: s.inputs.costCenters.filter((c) => c.id !== id) },
    })),

  updateCostCenter: (id, patch) =>
    set((s) => ({
      inputs: {
        ...s.inputs,
        costCenters: s.inputs.costCenters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    })),

  reshuffle: () => set((s) => ({ inputs: { ...s.inputs, seed: Math.floor(Math.random() * 1e9) } })),

  reset: () => set({ inputs: DEFAULT_INPUTS() }),

  applyInputs: (inputs) => set({ inputs }),

  applyScenario: (id) => {
    const scenario = getScenario(id);
    if (scenario) set({ inputs: scenario.make() });
  },

  toggleTheme: () =>
    set((s) => {
      const theme: Theme = s.theme === 'dark' ? 'light' : 'dark';
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem('theme', theme);
      } catch {
        /* ignore */
      }
      return { theme };
    }),
}));

// Mirror the current configuration into the address bar (history.replaceState)
// whenever the inputs change, so the URL is always copy-to-share ready. Guarded
// for non-browser environments (tests / static render); theme changes are
// ignored (only inputs are shareable).
if (typeof window !== 'undefined') {
  useStore.subscribe((state, prev) => {
    if (state.inputs !== prev.inputs) writeInputsToLocation(state.inputs);
  });
}

// The simulation is a pure, deterministic function of `inputs`, but many
// components read it on the same render. Memoize on the `inputs` reference at
// module scope so the (heavy) month-long run happens once per change and every
// component shares the result, instead of each recomputing it independently.
let simCache: { inputs: EnterpriseInputs; result: SimResult } | null = null;

function runSimulationShared(inputs: EnterpriseInputs): SimResult {
  if (simCache === null || simCache.inputs !== inputs) {
    simCache = { inputs, result: runSimulation(inputs) };
  }
  return simCache.result;
}

/** Recomputes the simulation only when the engine inputs change (shared across components). */
export function useSimResult(): SimResult {
  const inputs = useStore((s) => s.inputs);
  return useMemo(() => runSimulationShared(inputs), [inputs]);
}

/** Id of the scenario preset matching the current inputs, or null if customized. */
export function useActiveScenarioId(): string | null {
  const inputs = useStore((s) => s.inputs);
  return useMemo(() => matchScenarioId(inputs), [inputs]);
}
