/**
 * Detailed Year-by-Year Projection Table
 * Shows income, expenses, and balances for each year
 */

import { useState } from 'react';
import type { ProjectionYear } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProjectionTableProps {
  projections: ProjectionYear[];
}

export function ProjectionTable({ projections }: ProjectionTableProps) {
  const [showAllYears, setShowAllYears] = useState(false);

  if (projections.length === 0) {
    return null;
  }

  // Filter projections based on toggle
  const displayedProjections = showAllYears
    ? projections
    : projections.filter((_, i) => i % 5 === 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Detailed Year-by-Year Projection</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {showAllYears ? `Showing all ${projections.length} years` : `Showing every 5 years`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllYears(!showAllYears)}
          >
            {showAllYears ? 'Show Every 5 Years' : 'Show All Years'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 sticky left-0 bg-white">Age</th>
              <th className="text-right py-2 px-2">Year</th>
              <th className="text-right py-2 px-2">Pension</th>
              <th className="text-right py-2 px-2">TSP Dist.</th>
              <th className="text-right py-2 px-2">Part-Time</th>
              <th className="text-right py-2 px-2">Soc. Sec.</th>
              <th className="text-right py-2 px-2 font-semibold">Total Income</th>
              <th className="text-right py-2 px-2 text-red-700">Expenses</th>
              <th className="text-right py-2 px-2 text-pink-600">College</th>
              <th className="text-right py-2 px-2">Net Income</th>
              <th className="text-right py-2 px-2">TSP Balance</th>
              <th className="text-right py-2 px-2">Net Worth</th>
            </tr>
          </thead>
          <tbody>
            {displayedProjections.map((projection) => (
              <tr key={projection.age} className="border-b hover:bg-gray-50">
                <td className="py-2 px-2 font-medium sticky left-0 bg-white">
                  {projection.age}
                </td>
                <td className="text-right py-2 px-2 text-muted-foreground text-sm">
                  {projection.year}
                </td>
                <td className="text-right py-2 px-2">
                  {formatCurrency(projection.pension, 0)}
                </td>
                <td className="text-right py-2 px-2">
                  {formatCurrency(projection.tspDistribution, 0)}
                </td>
                <td className="text-right py-2 px-2 text-green-600">
                  {projection.otherIncome > 0 ? formatCurrency(projection.otherIncome, 0) : '—'}
                </td>
                <td className="text-right py-2 px-2">
                  {formatCurrency(projection.socialSecurity, 0)}
                </td>
                <td className="text-right py-2 px-2 font-semibold">
                  {formatCurrency(projection.totalIncome, 0)}
                </td>
                <td className="text-right py-2 px-2 text-red-700">
                  {projection.expenses > 0 ? formatCurrency(projection.expenses, 0) : '—'}
                </td>
                <td className="text-right py-2 px-2 text-pink-600 font-medium">
                  {projection.collegeCosts > 0 ? formatCurrency(projection.collegeCosts, 0) : '—'}
                </td>
                <td className={`text-right py-2 px-2 font-semibold ${projection.netIncome < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(projection.netIncome, 0)}
                </td>
                <td className="text-right py-2 px-2 text-muted-foreground">
                  {formatCurrency(projection.tspBalance, 0)}
                </td>
                <td className="text-right py-2 px-2 text-blue-600 font-semibold">
                  {formatCurrency(projection.netWorth, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        {showAllYears
          ? 'Showing complete year-by-year breakdown. Toggle to show summary view.'
          : 'Showing summary every 5 years. Toggle to see all years.'}
      </p>
    </Card>
  );
}
