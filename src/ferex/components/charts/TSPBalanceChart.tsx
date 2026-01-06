/**
 * TSP Balance Chart
 * Line chart showing TSP balance decline over retirement
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
  ReferenceLine,
} from 'recharts';
import type { ProjectionYear } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface TSPBalanceChartProps {
  projections: ProjectionYear[];
}

export function TSPBalanceChart({ projections }: TSPBalanceChartProps) {
  // Transform data for chart
  const chartData = projections.map((p) => ({
    age: p.age,
    balance: p.tspBalance,
  }));

  // Find when TSP runs out
  const depletionAge = projections.find((p) => p.tspBalance === 0)?.age;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold mb-1">Age {label}</p>
          <p className="text-sm">
            TSP Balance: {formatCurrency(payload[0].value, 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={500}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="age"
          label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          label={{ value: 'TSP Balance', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {depletionAge && (
          <ReferenceLine
            x={depletionAge}
            stroke="red"
            strokeDasharray="3 3"
            label={{
              value: 'TSP Depleted',
              position: 'top',
              fill: 'red',
              fontSize: 12,
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#10b981"
          strokeWidth={3}
          dot={false}
          name="TSP Balance"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
