/**
 * Net Worth Projection Chart
 * Shows cumulative savings over time
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import type { ProjectionYear } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface NetWorthChartProps {
  projections: ProjectionYear[];
}

export function NetWorthChart({ projections }: NetWorthChartProps) {
  // Calculate net worth (TSP balance + cumulative net income)
  const chartData = projections.map((p) => ({
    age: p.age,
    tspBalance: p.tspBalance,
    cumulativeSavings: p.cumulativeSavings,
    totalNetWorth: p.tspBalance + p.cumulativeSavings,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold mb-2">Age {label}</p>
          <p className="text-sm text-blue-600">
            TSP Balance: {formatCurrency(payload[0]?.payload?.tspBalance || 0, 0)}
          </p>
          <p className="text-sm text-green-600">
            Cumulative Savings: {formatCurrency(payload[0]?.payload?.cumulativeSavings || 0, 0)}
          </p>
          <p className="text-sm font-semibold mt-2 pt-2 border-t">
            Total Net Worth: {formatCurrency(payload[0].value, 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="age"
          label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          tickFormatter={(value) => {
            if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
            return `$${(value / 1000).toFixed(0)}k`;
          }}
          label={{ value: 'Net Worth', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area
          type="monotone"
          dataKey="totalNetWorth"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#colorNetWorth)"
          name="Net Worth"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
