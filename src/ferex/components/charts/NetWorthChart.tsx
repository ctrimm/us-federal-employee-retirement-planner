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
  // Use the calculated netWorth which includes: TSP + other investments + assets - debts
  const chartData = projections.map((p) => ({
    age: p.age,
    tspBalance: p.tspBalance,
    otherInvestments: p.otherInvestmentsBalance,
    totalAssets: p.totalAssets,
    totalDebt: p.totalDebt,
    netWorth: p.netWorth, // Already calculated: tspBalance + otherInvestments + assets - debts
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold mb-2">Age {label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-600">
              TSP Balance: {formatCurrency(data?.tspBalance || 0, 0)}
            </p>
            <p className="text-purple-600">
              Other Investments: {formatCurrency(data?.otherInvestments || 0, 0)}
            </p>
            <p className="text-amber-600">
              Other Assets: {formatCurrency(data?.totalAssets || 0, 0)}
            </p>
            {data?.totalDebt > 0 && (
              <p className="text-red-600">
                Debt: -{formatCurrency(data?.totalDebt || 0, 0)}
              </p>
            )}
          </div>
          <p className="text-sm font-semibold mt-2 pt-2 border-t">
            Total Net Worth: {formatCurrency(data?.netWorth || 0, 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={500}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorTSP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
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
          dataKey="tspBalance"
          stackId="1"
          stroke="#3b82f6"
          fill="url(#colorTSP)"
          name="TSP Balance"
        />
        <Area
          type="monotone"
          dataKey="otherInvestments"
          stackId="1"
          stroke="#a855f7"
          fill="url(#colorOther)"
          name="Other Investments (401k, Brokerage, etc.)"
        />
        <Area
          type="monotone"
          dataKey="totalAssets"
          stackId="1"
          stroke="#f59e0b"
          fill="url(#colorAssets)"
          name="Other Assets"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
