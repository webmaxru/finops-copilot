import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSimResult, useStore } from '../state/store';
import { fmtUsd } from '../model/format';
import type { DaySnapshot } from '../model/types';

type BurndownPoint = {
  day: number;
  poolUsd: number;
  meteredUsd: number;
  billUsd: number;
};

function toPoint(x: DaySnapshot): BurndownPoint {
  return {
    day: x.day,
    poolUsd: x.poolRemaining * 0.01,
    meteredUsd: x.meteredUsd,
    billUsd: x.cumulativeBillUsd,
  };
}

function formatUsdValue(value: unknown) {
  return fmtUsd(Number(value));
}

export default function BurndownChart() {
  const sim = useSimResult();
  const day = useStore((s) => s.day);
  const data = sim.enterprise.days.map(toPoint);

  return (
    <section className="panel">
      <h2 style={{ marginTop: 0 }}>Included pool draining vs. metered spend</h2>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="day"
              label={{ value: 'Day', position: 'insideBottom', offset: -4, fill: 'var(--muted)' }}
              tick={{ fill: 'var(--muted)' }}
            />
            <YAxis tickFormatter={formatUsdValue} tick={{ fill: 'var(--muted)' }} />
            <Tooltip formatter={formatUsdValue} />
            <Legend />
            <Area
              type="monotone"
              dataKey="poolUsd"
              name="Included pool left ($)"
              stroke="var(--pool)"
              fill="var(--pool)"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="meteredUsd"
              name="Metered spend ($)"
              stroke="var(--metered)"
              fill="var(--metered)"
              fillOpacity={0.3}
            />
            <Line
              type="monotone"
              dataKey="billUsd"
              name="Cumulative bill ($)"
              stroke="var(--primary)"
              dot={false}
            />
            <ReferenceLine
              y={sim.enterpriseBudgetUsd}
              stroke="var(--metered)"
              strokeDasharray="4 4"
              label="budget"
            />
            <ReferenceLine
              y={sim.maxBillUsd}
              stroke="var(--limit)"
              strokeDasharray="4 4"
              label="max bill"
            />
            <ReferenceLine x={day} stroke="var(--primary)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
