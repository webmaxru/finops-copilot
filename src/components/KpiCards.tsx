import { useSimResult } from '../state/store';
import { fmtUsd } from '../model/format';
import type { ReactNode } from 'react';

function KpiCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="panel" style={{ display: 'grid', gap: 6 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div className="muted" style={{ display: 'grid', gap: 2, fontSize: 12 }}>
        {children}
      </div>
    </div>
  );
}

export default function KpiCards() {
  const sim = useSimResult();
  const poolExhausted =
    sim.poolExhaustedDay === null ? 'never' : `day ${sim.poolExhaustedDay}`;

  return (
    <section
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12,
      }}
    >
      <KpiCard label="Projected month-end bill" value={fmtUsd(sim.monthEndBillUsd)}>
        <span>
          license {fmtUsd(sim.licenseFeesUsd)} + metered {fmtUsd(sim.monthEndMeteredUsd)}
        </span>
      </KpiCard>

      <KpiCard label="Max possible bill" value={fmtUsd(sim.maxBillUsd)}>
        <span>licenses + metered budgets</span>
      </KpiCard>

      <KpiCard label="Pool exhausted" value={poolExhausted}>
        <span>{Math.round(sim.poolUsedPct * 100)}% of pool used</span>
      </KpiCard>

      <KpiCard label="Blocked users" value={`${sim.monthEndBlockedUsers}/${sim.activeUsers}`}>
        <span>hit a hard stop this month</span>
      </KpiCard>
    </section>
  );
}
