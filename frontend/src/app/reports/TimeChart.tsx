'use client';
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

interface TimeChartProps {
  type: 'bar' | 'line';
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
}

export default function TimeChart({ type, data, xKey, yKey }: TimeChartProps) {
  if (!data.length) {
    return (
      <p className="text-sm text-center py-8 opacity-40" style={{ color: 'var(--app-text)' }}>
        No data for this period
      </p>
    );
  }

  const common = { data, margin: { top: 5, right: 20, left: 0, bottom: 5 } };

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart {...common}>
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="h" />
          <Tooltip formatter={(v: number) => [`${v}h`, 'Hours']} />
          <Bar dataKey={yKey} fill="var(--app-primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart {...common}>
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit="h" />
        <Tooltip formatter={(v: number) => [`${v}h`, 'Hours']} />
        <Line dataKey={yKey} stroke="var(--app-primary)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
