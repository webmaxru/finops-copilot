import { useSimResult, useStore } from '../state/store';
import { fmtInt, fmtUsd } from '../model/format';
import type { DaySnapshot, GroupSeries } from '../model/types';
import SpendChart, { type SpendPoint } from './SpendChart';

function toPoint(x: DaySnapshot): SpendPoint {
  return {
    day: x.day,
    includedUsd: x.includedConsumedUsd,
    meteredUsd: x.meteredUsd,
    billUsd: x.cumulativeBillUsd,
    blocked: x.blockedUsers,
  };
}

export default function CostCenterCharts() {
  const sim = useSimResult();
  const day = useStore((s) => s.day);
  const costCenters = useStore((s) => s.inputs.costCenters);
  const groups: GroupSeries[] = [...sim.costCenters, sim.unassigned].filter((g) => g.seats > 0);

  const budgetFor = (g: GroupSeries): number | null =>
    g.kind === 'cc' ? costCenters.find((c) => c.id === g.key)?.budgetUsd ?? null : null;

  const snapFor = (g: GroupSeries) => g.days[Math.min(Math.max(day, 1), 30) - 1];

  return (
    <section className="panel" style={{ display: 'grid', gap: 18 }}>
      <h2 style={{ margin: 0 }}>Per cost center &amp; unassigned</h2>
      {groups.length === 0 ? (
        <p className="muted">No groups with seats.</p>
      ) : (
        groups.map((g) => {
          const budget = budgetFor(g);
          const snap = snapFor(g);
          return (
            <div key={g.key} style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong>{g.label}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {fmtInt(g.seats)} seats · {fmtInt(g.activeUsers)} active · {fmtInt(g.powerUsers)} power ·
                  metered {fmtUsd(snap?.meteredUsd ?? 0)} · blocked {snap?.blockedUsers ?? 0}/{g.activeUsers}
                </span>
              </div>
              <SpendChart
                data={g.days.map(toPoint)}
                day={day}
                includedName="Included used ($)"
                activeUsers={g.activeUsers}
                height={230}
                refLines={
                  budget != null ? [{ y: budget, label: 'CC budget', color: 'var(--metered)' }] : []
                }
              />
            </div>
          );
        })
      )}
    </section>
  );
}

