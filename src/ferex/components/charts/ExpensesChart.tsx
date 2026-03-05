/**
 * Expenses Breakdown Chart
 * Shows living expenses, college costs, FEHB, and other expenses over time
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
import type { ProjectionYear, EligibilityInfo } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ExpensesChartProps {
  projections: ProjectionYear[];
  eligibility: EligibilityInfo | null;
  syncedAge?: number | null;
  onAgeHover?: (age: number | null) => void;
}

export function ExpensesChart({ projections, eligibility, syncedAge, onAgeHover }: ExpensesChartProps) {
  // Only include FEHB if user is eligible
  const showFEHB = eligibility?.fehbEligible ?? false;

  // Transform data for chart
  const chartData = projections.map((p) => ({
    age: p.age,
    'Living Expenses': Math.max(0, p.expenses - p.collegeCosts - (showFEHB ? p.fehbCost : 0)),
    'College Costs': p.collegeCosts,
    ...(showFEHB && { 'FEHB Healthcare': p.fehbCost }),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold mb-2">Age {label}</p>
          {payload.reverse().map((entry: any) => (
            entry.value > 0 && (
              <p key={entry.name} style={{ color: entry.color }} className="text-sm">
                {entry.name}: {formatCurrency(entry.value, 0)}
              </p>
            )
          ))}
          <p className="font-semibold text-sm mt-2 pt-2 border-t">
            Total Expenses: {formatCurrency(total, 0)}
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
          <linearGradient id="colorLiving" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="colorCollege" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#ec4899" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="colorFEHB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="age"
          label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          label={{ value: 'Annual Expenses', angle: -90, position: 'insideLeft' }}
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
          dataKey="Living Expenses"
          stackId="1"
          stroke="#6366f1"
          fill="url(#colorLiving)"
        />
        <Area
          type="monotone"
          dataKey="College Costs"
          stackId="1"
          stroke="#ec4899"
          fill="url(#colorCollege)"
        />
        {showFEHB && (
          <Area
            type="monotone"
            dataKey="FEHB Healthcare"
            stackId="1"
            stroke="#14b8a6"
            fill="url(#colorFEHB)"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
