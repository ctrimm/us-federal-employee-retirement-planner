/**
 * Main Dashboard Component
 * Displays retirement projections and key metrics with interactive charts
 */

import { useEffect, useState } from 'react';
import type { Scenario, ProjectionYear, EligibilityInfo, PensionBreakdown, UserProfile } from '../../types';
import { formatCurrency, formatYearsOfService, formatMonthYear } from '../../utils/formatters';
import { Card } from '@/components/ui/card';
import { IncomeProjectionChart } from '../charts/IncomeProjectionChart';
import { TSPBalanceChart } from '../charts/TSPBalanceChart';
import { NetWorthChart } from '../charts/NetWorthChart';
import { ExpensesChart } from '../charts/ExpensesChart';
import { ProjectionTable } from './ProjectionTable';

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
  // Synchronized tooltip state across all charts
  const [syncedAge, setSyncedAge] = useState<number | null>(null);

  // Debug logging to track when projections change
  useEffect(() => {
    console.log('[Dashboard] Received new projections', {
      count: projections.length,
      firstAge: projections[0]?.age,
      lastAge: projections[projections.length - 1]?.age,
      firstYearPension: projections[0]?.pension,
      lastYearPension: projections[projections.length - 1]?.pension,
      timestamp: new Date().toISOString(),
    });
  }, [projections]);

  useEffect(() => {
    console.log('[Dashboard] Scenario changed', {
      scenarioId: scenario.id,
      name: scenario.name,
      timestamp: new Date().toISOString(),
    });
  }, [scenario]);

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

  // Calculate FIRE Age (when net worth can sustain expenses)
  const safeWithdrawalRate = scenario.profile.assumptions?.fireWithdrawalRate || 0.04; // 4% default
  const calculateFireAge = (): { age: number; netWorth: number; fireNumber: number } | null => {
    for (const year of projections) {
      const fireNumber = year.expenses / safeWithdrawalRate;
      // Check if liquid net worth (TSP + investments - debt) can sustain expenses
      if (year.liquidNetWorth >= fireNumber && year.expenses > 0) {
        return {
          age: year.age,
          netWorth: year.liquidNetWorth,
          fireNumber,
        };
      }
    }
    return null;
  };

  const fireData = calculateFireAge();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{scenario.name}</h1>
        <p className="text-muted-foreground">
          Your personalized federal retirement projection
        </p>
      </div>

      {/* FIRE Age Hero Card */}
      {fireData && (
        <Card className="p-8 mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 hover:shadow-xl transition-shadow">
          <div className="text-center">
            <h2 className="text-lg font-medium text-muted-foreground mb-2">
              🎯 Your Financial Independence Age
            </h2>
            <p className="text-7xl font-bold text-green-600 mb-3">{fireData.age}</p>
            <p className="text-sm text-muted-foreground mb-4">
              Based on {(safeWithdrawalRate * 100).toFixed(1)}% safe withdrawal rate
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">FIRE Number</p>
                <p className="text-lg font-semibold text-green-700">
                  {formatCurrency(fireData.fireNumber, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Your Net Worth at FIRE</p>
                <p className="text-lg font-semibold text-blue-700">
                  {formatCurrency(fireData.netWorth, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Years Until FIRE</p>
                <p className="text-lg font-semibold text-purple-700">
                  {fireData.age - firstYear.age} years
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

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

      {/* Charts - Full Width */}
      <div className="space-y-6 mb-8">
        {/* Income Projection Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Retirement Income Over Time</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Stacked view of pension, TSP distributions, and Social Security
          </p>
          <IncomeProjectionChart
            projections={projections}
            syncedAge={syncedAge}
            onAgeHover={setSyncedAge}
          />
        </Card>

        {/* Expenses Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Annual Expenses Breakdown</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Living expenses, college costs, and healthcare over time
          </p>
          <ExpensesChart
            projections={projections}
            syncedAge={syncedAge}
            onAgeHover={setSyncedAge}
          />
        </Card>

        {/* TSP Balance Chart */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">TSP Balance Projection</h2>
          <p className="text-sm text-muted-foreground mb-4">
            How your TSP balance changes through retirement
          </p>
          <TSPBalanceChart
            projections={projections}
            syncedAge={syncedAge}
            onAgeHover={setSyncedAge}
          />
        </Card>
      </div>

      {/* Net Worth Chart - Full Width */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Net Worth Over Time</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Combined TSP balance and cumulative savings throughout retirement
        </p>
        <NetWorthChart
          projections={projections}
          syncedAge={syncedAge}
          onAgeHover={setSyncedAge}
        />
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

      {/* Spouse Pension Callout */}
      {scenario.profile.personal.spouseInfo?.isFederalEmployee && (
        <Card className="p-6 mb-8 bg-purple-50 border-purple-200">
          <div className="flex items-start gap-3">
            <div className="text-purple-600 text-2xl">💼</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                Spouse/Partner Federal Pension
              </h3>
              <p className="text-sm text-purple-700 mb-4">
                Your spouse/partner has federal service and may be eligible for their own pension.
              </p>

              {scenario.profile.personal.spouseInfo.servicePeriods &&
               scenario.profile.personal.spouseInfo.servicePeriods.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-xs text-purple-600 mb-1">High-3 Salary</p>
                    <p className="text-lg font-bold text-purple-900">
                      {formatCurrency(scenario.profile.personal.spouseInfo.high3Salary || 0)}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-xs text-purple-600 mb-1">Years of Service</p>
                    <p className="text-lg font-bold text-purple-900">
                      {scenario.profile.personal.spouseInfo.servicePeriods
                        .reduce((total, period) => {
                          const start = new Date(period.startDate);
                          const end = period.endDate ? new Date(period.endDate) : new Date();
                          const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                          return total + years;
                        }, 0)
                        .toFixed(2)} years
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-xs text-purple-600 mb-1">Estimated Annual Pension</p>
                    <p className="text-lg font-bold text-purple-900">
                      {(() => {
                        const high3 = scenario.profile.personal.spouseInfo.high3Salary || 0;
                        const years = scenario.profile.personal.spouseInfo.servicePeriods
                          .reduce((total, period) => {
                            const start = new Date(period.startDate);
                            const end = period.endDate ? new Date(period.endDate) : new Date();
                            const yrs = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                            return total + yrs;
                          }, 0);
                        const estimatedPension = high3 * 0.01 * years; // Simple FERS 1% calculation
                        return formatCurrency(estimatedPension);
                      })()}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-xs text-purple-600 mt-4">
                💡 Tip: Update spouse's service periods and High-3 salary in the Family tab for a more accurate estimate.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Detailed Year-by-Year Projection Table */}
      <ProjectionTable projections={projections} />
    </div>
  );
}
