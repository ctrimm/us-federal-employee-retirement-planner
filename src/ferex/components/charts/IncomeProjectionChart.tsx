/**
 * Income Projection Chart
 * Stacked area chart showing pension, TSP, social security over time
 */

import {
  AreaChart,
  Area,
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

interface IncomeProjectionChartProps {
  projections: ProjectionYear[];
  syncedAge?: number | null;
  onAgeHover?: (age: number | null) => void;
}

export function IncomeProjectionChart({ projections, syncedAge, onAgeHover }: IncomeProjectionChartProps) {
  // Transform data for chart
  const chartData = projections.map((p) => ({
    age: p.age,
    Pension: p.pension,
    TSP: p.tspDistribution,
    'Social Security': p.socialSecurity,
    'Part-Time Work': p.otherIncome,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold mb-2">Age {label}</p>
          {payload.reverse().map((entry: any) => (
            <p key={entry.name} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value, 0)}
            </p>
          ))}
          <p className="font-semibold text-sm mt-2 pt-2 border-t">
            Total: {formatCurrency(total, 0)}
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
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        onMouseMove={(e: any) => {
          if (e && e.activeLabel && onAgeHover) {
            onAgeHover(Number(e.activeLabel));
          }
        }}
        onMouseLeave={() => {
          if (onAgeHover) {
            onAgeHover(null);
          }
        }}
      >
        <defs>
          <linearGradient id="colorPension" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="colorTSP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="colorSS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="age"
          label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          label={{ value: 'Annual Income', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        {syncedAge && (
          <ReferenceLine
            x={syncedAge}
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="3 3"
            label={{ value: `Age ${syncedAge}`, position: 'top', fill: '#ef4444', fontSize: 12 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="Pension"
          stackId="1"
          stroke="#3b82f6"
          fill="url(#colorPension)"
        />
        <Area
          type="monotone"
          dataKey="TSP"
          stackId="1"
          stroke="#10b981"
          fill="url(#colorTSP)"
        />
        <Area
          type="monotone"
          dataKey="Social Security"
          stackId="1"
          stroke="#f59e0b"
          fill="url(#colorSS)"
        />
        <Area
          type="monotone"
          dataKey="Part-Time Work"
          stackId="1"
          stroke="#8b5cf6"
          fill="url(#colorOther)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
