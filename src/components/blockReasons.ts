import type { BlockedBreakdown, BlockReason } from '../model/types';

/**
 * Display metadata for each blocked-user reason (§6d). `label` is used in chart
 * tooltips; `short` in compact readouts (e.g. the global KPI). `color` mirrors
 * the token used for that stop elsewhere in the UI so the swatch reads
 * consistently. Order is fixed so the distribution always renders the same way.
 */
export const BLOCK_REASON_META: {
  key: BlockReason;
  label: string;
  short: string;
  color: string;
}[] = [
  { key: 'userLimit', label: 'User limit', short: 'user limit', color: 'var(--limit)' },
  { key: 'costCenterPool', label: 'CC pool cap', short: 'CC pool cap', color: 'var(--pool)' },
  { key: 'costCenterBudget', label: 'Cost-center budget', short: 'CC budget', color: 'var(--metered)' },
  { key: 'enterpriseBudget', label: 'Enterprise budget', short: 'ent budget', color: 'var(--brand)' },
];

/** Nonzero reason entries (with display metadata) for a blocked breakdown. */
export function blockedReasonEntries(bd: BlockedBreakdown | undefined | null) {
  if (!bd) return [];
  return BLOCK_REASON_META.map((m) => ({ ...m, count: bd[m.key] })).filter((e) => e.count > 0);
}
