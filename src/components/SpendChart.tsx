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
import { fmtUsd } from '../model/format';

export type SpendPoint = {
  day: number;
  includedUsd: number;
  meteredUsd: number;
  billUsd: number;
  blocked: number;
};

export type RefLine = { y: number; label: string; color: string };

interface SpendChartProps {
  data: SpendPoint[];
  /** Optional current-day marker (omitted now that the dashboard is monthly). */
  day?: number;
  /** Legend name for the included-credits area (e.g. "Included pool left" vs "Included used"). */
  includedName: string;
  /** Active users — sets the right-axis (blocked users) domain. */
  activeUsers: number;
  refLines?: RefLine[];
  height?: number;
}

const BLOCKED_NAME = 'Blocked users';

function tooltipFormatter(value: unknown, name: unknown) {
  if (name === BLOCKED_NAME) return [`${Math.round(Number(value))}`, name] as [string, string];
  return [fmtUsd(Number(value)), name as string] as [string, string];
}

/**
 * Time-series spend chart shared by the enterprise burndown and each cost
 * center / unassigned group: included ($) and metered ($) as areas, cumulative
 * bill as a line, plus a blocked-users line on a right axis so hard stops are
 * visible against spend.
 */
export default function SpendChart({
  data,
  day,
  includedName,
  activeUsers,
  refLines = [],
  height = 260,
}: SpendChartProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 11 }} />
          <YAxis
            yAxisId="usd"
            tickFormatter={(v) => fmtUsd(Number(v))}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            width={56}
          />
          <YAxis
            yAxisId="blocked"
            orientation="right"
            allowDecimals={false}
            domain={[0, Math.max(1, activeUsers)]}
            tick={{ fill: 'var(--limit)', fontSize: 11 }}
            width={30}
          />
          <Tooltip formatter={tooltipFormatter} labelFormatter={(l) => `Day ${l}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area
            yAxisId="usd"
            type="monotone"
            dataKey="includedUsd"
            name={includedName}
            stroke="var(--pool)"
            fill="var(--pool)"
            fillOpacity={0.3}
          />
          <Area
            yAxisId="usd"
            type="monotone"
            dataKey="meteredUsd"
            name="Metered spend ($)"
            stroke="var(--metered)"
            fill="var(--metered)"
            fillOpacity={0.3}
          />
          <Line
            yAxisId="usd"
            type="monotone"
            dataKey="billUsd"
            name="Cumulative bill ($)"
            stroke="var(--primary)"
            dot={false}
          />
          <Line
            yAxisId="blocked"
            type="monotone"
            dataKey="blocked"
            name={BLOCKED_NAME}
            stroke="var(--limit)"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
          />
          {refLines.map((r) => (
            <ReferenceLine
              key={r.label}
              yAxisId="usd"
              y={r.y}
              stroke={r.color}
              strokeDasharray="4 4"
              label={{ value: r.label, fill: 'var(--muted)', fontSize: 10, position: 'insideTopRight' }}
            />
          ))}
          {day != null && <ReferenceLine yAxisId="usd" x={day} stroke="var(--primary)" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
