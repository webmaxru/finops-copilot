import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSimResult, useStore } from '../state/store';
import { fmtUsd } from '../model/format';
import type { GroupSeries } from '../model/types';

type CostCenterPoint = {
  name: string;
  included: number;
  metered: number;
};

function formatUsdValue(value: unknown) {
  return fmtUsd(Number(value));
}

function toPoint(group: GroupSeries, day: number): CostCenterPoint {
  const index = Math.min(Math.max(day, 1), 30) - 1;
  const snap = group.days[index];

  return {
    name: group.label,
    included: snap?.includedConsumedUsd ?? 0,
    metered: snap?.meteredUsd ?? 0,
  };
}

export default function CostCenterCharts() {
  const sim = useSimResult();
  const day = useStore((s) => s.day);
  const groups = [...sim.costCenters, sim.unassigned].filter((g) => g.seats > 0);
  const data = groups.map((g) => toPoint(g, day));
  const height = Math.max(120, groups.length * 46);

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>Spend by cost center (at day {day})</h2>
      {groups.length === 0 ? (
        <p className="muted">No cost centers with seats.</p>
      ) : (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={formatUsdValue} tick={{ fill: 'var(--muted)' }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: 'var(--muted)' }}
              />
              <Tooltip formatter={formatUsdValue} />
              <Legend />
              <Bar dataKey="included" stackId="a" fill="var(--pool)" name="Included ($)" />
              <Bar dataKey="metered" stackId="a" fill="var(--metered)" name="Metered ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
