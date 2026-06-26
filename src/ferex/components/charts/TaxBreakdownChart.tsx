/**
 * Tax Breakdown Chart
 * Stacked area chart of annual taxes: federal income tax, long-term capital gains
 * tax, and state tax. Click a legend item to show/hide that series.
 */

import { useState } from 'react';
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

interface TaxBreakdownChartProps {
  projections: ProjectionYear[];
  syncedAge?: number | null;
  onAgeHover?: (age: number | null) => void;
}

export function TaxBreakdownChart({ projections, syncedAge, onAgeHover }: TaxBreakdownChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const chartData = projections.map((p) => {
    const capGains = p.capitalGainsTax || 0;
    const federal = Math.max(0, (p.federalTax || 0) - capGains); // ordinary-income portion
    return {
      age: p.age,
      'Federal Income Tax': federal,
      'Capital Gains Tax': capGains,
      'State Tax': p.stateTax || 0,
    };
  });

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
            Total Tax: {formatCurrency(total, 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        onMouseMove={(e: any) => {
          if (e && e.activeLabel && onAgeHover) onAgeHover(Number(e.activeLabel));
        }}
        onMouseLeave={() => {
          if (onAgeHover) onAgeHover(null);
        }}
      >
        <defs>
          <linearGradient id="colorFedTax" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="colorCapGainsTax" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="colorStateTax" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} />
        <YAxis
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          label={{ value: 'Annual Tax', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          onClick={(e: any) => toggle(String(e.dataKey ?? e.value))}
          formatter={(value: string) => (
            <span style={{ cursor: 'pointer', opacity: hidden.has(value) ? 0.4 : 1 }}>{value}</span>
          )}
        />
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
          dataKey="Federal Income Tax"
          stackId="1"
          stroke="#ef4444"
          fill="url(#colorFedTax)"
          hide={hidden.has('Federal Income Tax')}
        />
        <Area
          type="monotone"
          dataKey="Capital Gains Tax"
          stackId="1"
          stroke="#f97316"
          fill="url(#colorCapGainsTax)"
          hide={hidden.has('Capital Gains Tax')}
        />
        <Area
          type="monotone"
          dataKey="State Tax"
          stackId="1"
          stroke="#a855f7"
          fill="url(#colorStateTax)"
          hide={hidden.has('State Tax')}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
