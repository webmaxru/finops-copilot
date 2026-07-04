import { useSimResult, useStore } from '../state/store';
import type { DaySnapshot } from '../model/types';
import SpendChart, { type SpendPoint } from './SpendChart';

function toPoint(x: DaySnapshot): SpendPoint {
  return {
    day: x.day,
    includedUsd: x.poolRemaining * 0.01,
    meteredUsd: x.meteredUsd,
    billUsd: x.cumulativeBillUsd,
    blocked: x.blockedUsers,
  };
}

export default function BurndownChart() {
  const sim = useSimResult();
  const day = useStore((s) => s.day);
  const data = sim.enterprise.days.map(toPoint);

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>Enterprise: included pool draining vs. metered spend</h2>
      <SpendChart
        data={data}
        day={day}
        includedName="Included pool left ($)"
        activeUsers={sim.activeUsers}
        height={300}
        refLines={[
          { y: sim.enterpriseBudgetUsd, label: 'Ent metered budget', color: 'var(--metered)' },
          { y: sim.maxBillUsd, label: 'max bill', color: 'var(--limit)' },
        ]}
      />
    </section>
  );
}

