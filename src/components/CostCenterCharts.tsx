import { useSimResult, useStore } from '../state/store';
import { CREDIT_USD } from '../model/defaults';
import { fmtInt, fmtUsd } from '../model/format';
import type { DaySnapshot, GroupSeries } from '../model/types';
import SpendChart, { type SpendPoint } from './SpendChart';

// "Included pool left" for a group = its own funded included allowance
// (poolCredits · CREDIT_USD) minus what it has consumed so far — the depleting
// counterpart to the enterprise burndown. For a capped cost center this is
// exactly its sub-pool remaining; for a group that shares the enterprise pool it
// is the funded-share remaining and may dip below 0 when the group draws on the
// shared pool beyond its own seats' credits (the "shared-pool drain" warning).
function toPoint(poolLeftStartUsd: number) {
  return (x: DaySnapshot): SpendPoint => ({
    day: x.day,
    includedUsd: poolLeftStartUsd - x.includedConsumedUsd,
    meteredUsd: x.meteredUsd,
    billUsd: x.cumulativeBillUsd,
    blocked: x.blockedUsers,
    blockedBreakdown: x.blockedBreakdown,
  });
}

export default function CostCenterCharts() {
  const sim = useSimResult();
  const costCenters = useStore((s) => s.inputs.costCenters);
  const groups: GroupSeries[] = [...sim.costCenters, sim.unassigned].filter((g) => g.seats > 0);

  const budgetFor = (g: GroupSeries): number | null =>
    g.kind === 'cc' ? costCenters.find((c) => c.id === g.key)?.budgetUsd ?? null : null;

  return (
    <section className="panel" style={{ display: 'grid', gap: 18 }}>
      <h2 style={{ margin: 0 }}>Per cost center &amp; unassigned (month)</h2>
      {groups.length === 0 ? (
        <p className="muted">No groups with seats.</p>
      ) : (
        groups.map((g) => {
          const budget = budgetFor(g);
          const end = g.days[g.days.length - 1];
          return (
            <div key={g.key} style={{ display: 'grid', gap: 6 }}>
              <div className="chart-head">
                <strong>{g.label}</strong>
                <span className="chart-head__meta">
                  {fmtInt(g.seats)} seats · {fmtInt(g.activeUsers)} active · {fmtInt(g.powerUsers)} power ·
                  metered {fmtUsd(end?.meteredUsd ?? 0)} · blocked {end?.blockedUsers ?? 0}/{g.activeUsers}
                </span>
              </div>
              <div className="chart-frame">
                <SpendChart
                  data={g.days.map(toPoint(g.poolCredits * CREDIT_USD))}
                  includedName="Included pool left ($)"
                  activeUsers={g.activeUsers}
                  height={230}
                  refLines={
                    budget != null ? [{ y: budget, label: 'CC budget', color: 'var(--metered)' }] : []
                  }
                />
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

