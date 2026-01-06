/**
 * Main Dashboard Component
 * Displays retirement projections and key metrics with interactive charts
 */

import type { Scenario, ProjectionYear, EligibilityInfo, PensionBreakdown, UserProfile } from '../../types';
import { formatCurrency, formatYearsOfService, formatMonthYear } from '../../utils/formatters';
import { Card } from '@/components/ui/card';
import { IncomeProjectionChart } from '../charts/IncomeProjectionChart';
import { TSPBalanceChart } from '../charts/TSPBalanceChart';
import { NetWorthChart } from '../charts/NetWorthChart';

interface DashboardProps {
  scenario: Scenario;
  projections: ProjectionYear[];
  eligibility: EligibilityInfo | null;
  pensionBreakdown: PensionBreakdown | null;
  onEditScenario?: () => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
}

export function Dashboard({
  scenario,
  projections,
  eligibility,
  pensionBreakdown,
  onEditScenario,
  onUpdateProfile,
}: DashboardProps) {
  if (!eligibility || !pensionBreakdown) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Calculating projections...</p>
        </div>
      </div>
    );
  }

  const firstYear = projections[0];
  const lastYear = projections[projections.length - 1];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{scenario.name}</h1>
        <p className="text-muted-foreground">
          Your personalized federal retirement projection
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Retirement Age */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Earliest Retirement
          </h3>
          <p className="text-3xl font-bold">{eligibility.earliestRetirementAge}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatMonthYear(eligibility.earliestRetirementDate)}
          </p>
        </Card>

        {/* Monthly Pension */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Monthly Pension
          </h3>
          <p className="text-3xl font-bold">
            {formatCurrency(pensionBreakdown.monthlyPension)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatCurrency(pensionBreakdown.annualPension)} / year
          </p>
        </Card>

        {/* Years of Service */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Total Service
          </h3>
          <p className="text-3xl font-bold">
            {Math.floor(eligibility.totalYearsOfService)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {formatYearsOfService(eligibility.totalYearsOfService)}
          </p>
        </Card>

        {/* Retirement System */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Retirement System
          </h3>
          <p className="text-3xl font-bold">{eligibility.detectedSystem}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {eligibility.fehbEligible ? 'FEHB Eligible ✓' : 'FEHB Not Eligible'}
          </p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Income Projection Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Retirement Income Over Time</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Stacked view of pension, TSP distributions, and Social Security
          </p>
          <IncomeProjectionChart projections={projections} />
        </Card>

        {/* TSP Balance Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">TSP Balance Projection</h2>
          <p className="text-sm text-muted-foreground mb-4">
            How your TSP balance changes through retirement
          </p>
          <TSPBalanceChart projections={projections} />
        </Card>
      </div>

      {/* Net Worth Chart - Full Width */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Net Worth Over Time</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Combined TSP balance and cumulative savings throughout retirement
        </p>
        <NetWorthChart projections={projections} />
      </Card>

      {/* Eligibility Summary */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Retirement Eligibility Summary</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className={`mt-1 w-2 h-2 rounded-full ${eligibility.canRetireImmediately ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div className="flex-1">
              <p className="font-medium">
                {eligibility.canRetireImmediately
                  ? '✓ You can retire immediately'
                  : `Earliest retirement at age ${eligibility.earliestRetirementAge}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {eligibility.canRetireImmediately
                  ? `With ${formatYearsOfService(eligibility.totalYearsOfService)} of service`
                  : formatMonthYear(eligibility.earliestRetirementDate)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 w-2 h-2 rounded-full bg-blue-500" />
            <div className="flex-1">
              <p className="font-medium">
                Full unreduced benefits at age {eligibility.fullBenefitsAge}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatMonthYear(eligibility.fullBenefitsDate)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className={`mt-1 w-2 h-2 rounded-full ${eligibility.fehbEligible ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className="flex-1">
              <p className="font-medium">
                {eligibility.fehbEligible
                  ? '✓ FEHB eligible upon retirement'
                  : 'FEHB not eligible'}
              </p>
              <p className="text-sm text-muted-foreground">
                {eligibility.fehbEligible
                  ? 'You can continue Federal Employee Health Benefits into retirement'
                  : 'You need 5+ years of service for FEHB eligibility'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Pension Breakdown */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Pension Calculation Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">High-3 Average Salary</p>
            <p className="text-2xl font-bold">{formatCurrency(pensionBreakdown.high3)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Years of Service</p>
            <p className="text-2xl font-bold">
              {formatYearsOfService(pensionBreakdown.yearsOfService)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Accrual Rate</p>
            <p className="text-2xl font-bold">
              {(pensionBreakdown.accrualRate * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Survivor Reduction</p>
            <p className="text-2xl font-bold">
              {pensionBreakdown.survivorReduction > 0
                ? `${(pensionBreakdown.survivorReduction * 100).toFixed(0)}%`
                : 'None'}
            </p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Annual Pension:</span>
            <span className="text-2xl font-bold">
              {formatCurrency(pensionBreakdown.annualPension)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-muted-foreground">Monthly Pension:</span>
            <span className="text-xl font-semibold">
              {formatCurrency(pensionBreakdown.monthlyPension)}
            </span>
          </div>
        </div>
      </Card>

      {/* Income Projection Table (Detailed Data) */}
      {projections.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Detailed Year-by-Year Projection</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Age</th>
                  <th className="text-right py-2 px-2">Pension</th>
                  <th className="text-right py-2 px-2">TSP</th>
                  <th className="text-right py-2 px-2">Part-Time</th>
                  <th className="text-right py-2 px-2">Soc. Sec.</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-right py-2 px-2">TSP Balance</th>
                </tr>
              </thead>
              <tbody>
                {projections.filter((_, i) => i % 5 === 0).map((projection) => (
                  <tr key={projection.age} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2">{projection.age}</td>
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
                    <td className="text-right py-2 px-2 text-muted-foreground">
                      {formatCurrency(projection.tspBalance, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Showing projections every 5 years. Use the control panel to adjust assumptions.
          </p>
        </Card>
      )}
    </div>
  );
}
