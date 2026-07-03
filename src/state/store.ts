import { create } from 'zustand';
import { useMemo } from 'react';
import { DEFAULT_INPUTS, makeDefaultCostCenter } from '../model/defaults';
import { runSimulation } from '../model/engine';
import type { CostCenter, EnterpriseInputs, SimResult } from '../model/types';

interface Store {
  inputs: EnterpriseInputs;
  // timeline / animation UI state (does not affect the simulation)
  day: number; // 1..30
  playing: boolean;
  speed: number; // 1, 2, 4

  setInput: <K extends keyof EnterpriseInputs>(key: K, value: EnterpriseInputs[K]) => void;
  addCostCenter: () => void;
  removeCostCenter: (id: string) => void;
  updateCostCenter: (id: string, patch: Partial<CostCenter>) => void;
  reshuffle: () => void;
  reset: () => void;
  setDay: (d: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
}

export const useStore = create<Store>((set) => ({
  inputs: DEFAULT_INPUTS(),
  day: 30,
  playing: false,
  speed: 1,

  setInput: (key, value) => set((s) => ({ inputs: { ...s.inputs, [key]: value } })),

  addCostCenter: () =>
    set((s) => ({
      inputs: {
        ...s.inputs,
        costCenters: [...s.inputs.costCenters, makeDefaultCostCenter(s.inputs.costCenters.length + 1)],
      },
    })),

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

  reset: () => set({ inputs: DEFAULT_INPUTS(), day: 30, playing: false, speed: 1 }),

  setDay: (d) => set({ day: d }),
  setPlaying: (p) => set({ playing: p }),
  setSpeed: (s) => set({ speed: s }),
}));

/** Recomputes the simulation only when the engine inputs change. */
export function useSimResult(): SimResult {
  const inputs = useStore((s) => s.inputs);
  return useMemo(() => runSimulation(inputs), [inputs]);
}
