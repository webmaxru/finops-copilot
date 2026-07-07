import { useSimResult } from '../state/store';
import { CREDIT_USD } from '../model/defaults';
import type { DaySnapshot } from '../model/types';
import SpendChart, { type SpendPoint } from './SpendChart';

function toPoint(x: DaySnapshot): SpendPoint {
  return {
    day: x.day,
    includedUsd: x.poolRemaining * CREDIT_USD,
    meteredUsd: x.meteredUsd,
    billUsd: x.cumulativeBillUsd,
    blocked: x.blockedUsers,
    blockedBreakdown: x.blockedBreakdown,
  };
}

export default function BurndownChart() {
  const sim = useSimResult();
  const data = sim.enterprise.days.map(toPoint);

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>Enterprise: included pool draining vs. metered spend (month)</h2>
      <div className="chart-frame">
        <SpendChart
          data={data}
          includedName="Included pool left ($)"
          activeUsers={sim.activeUsers}
          height={300}
          refLines={[
            { y: sim.enterpriseBudgetUsd, label: 'Ent metered budget', color: 'var(--metered)' },
            { y: sim.maxBillUsd, label: 'max bill', color: 'var(--limit)' },
          ]}
        />
      </div>
    </section>
  );
}

