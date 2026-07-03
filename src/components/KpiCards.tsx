import { useSimResult, useStore } from '../state/store';
import { fmtCredits, fmtUsd } from '../model/format';
import type { DaySnapshot, SimResult } from '../model/types';
import type { ReactNode } from 'react';

function currentSnapshot(sim: SimResult, day: number): DaySnapshot | undefined {
  const index = Math.min(Math.max(day, 1), 30) - 1;
  return sim.enterprise.days[index];
}

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
  const day = useStore((s) => s.day);
  const d = currentSnapshot(sim, day);
  const poolExhausted =
    sim.poolExhaustedDay === null ? 'never' : `${sim.poolExhaustedDay} (day)`;

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
        <span>licenses + enterprise budget</span>
      </KpiCard>

      <KpiCard label="Pool exhausted" value={poolExhausted}>
        <span>{Math.round(sim.poolUsedPct * 100)}% of pool used</span>
      </KpiCard>

      <KpiCard label="Blocked users" value={`${sim.monthEndBlockedUsers}/${sim.activeUsers}`}>
        <span>hit their limit this month</span>
      </KpiCard>

      <KpiCard label={`At day ${day}`} value={`bill ${fmtUsd(d?.cumulativeBillUsd ?? sim.licenseFeesUsd)}`}>
        <span>pool left {fmtCredits(d?.poolRemaining ?? sim.poolCredits)}</span>
        <span>metered {fmtUsd(d?.meteredUsd ?? 0)}</span>
        <span>blocked {d?.blockedUsers ?? 0}</span>
      </KpiCard>
    </section>
  );
}
