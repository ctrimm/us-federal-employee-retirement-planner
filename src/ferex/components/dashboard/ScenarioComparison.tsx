/**
 * Scenario Comparison View
 * Compare multiple retirement scenarios side-by-side
 */

import type { Scenario, ProjectionYear, PensionBreakdown } from '../../types';
import { formatCurrency, formatYearsOfService } from '../../utils/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ScenarioComparisonProps {
  scenarios: Array<{
    scenario: Scenario;
    projections: ProjectionYear[];
    pensionBreakdown: PensionBreakdown;
  }>;
  onClose: () => void;
  onRemoveScenario: (id: string) => void;
}

export function ScenarioComparison({
  scenarios,
  onClose,
  onRemoveScenario,
}: ScenarioComparisonProps) {
  if (scenarios.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold mb-4">No Scenarios to Compare</h2>
          <p className="text-muted-foreground mb-6">
            Add scenarios to compare them side-by-side
          </p>
          <Button onClick={onClose}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const getLifetimeIncome = (projections: ProjectionYear[]) => {
    return projections.reduce((sum, p) => sum + p.totalIncome, 0);
  };

  const getFinalTSP = (projections: ProjectionYear[]) => {
    return projections[projections.length - 1]?.tspBalance || 0;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Compare Scenarios</h1>
        <Button onClick={onClose} variant="outline">
          Close Comparison
        </Button>
      </div>

      {/* Comparison Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 font-semibold border-b">Metric</th>
                {scenarios.map(({ scenario }) => (
                  <th key={scenario.id} className="text-left py-4 px-6 font-semibold border-b">
                    <div className="flex items-center justify-between">
                      <span>{scenario.name}</span>
                      {!scenario.metadata.isPreBuilt && (
                        <button
                          onClick={() => onRemoveScenario(scenario.id)}
                          className="ml-2 text-red-500 hover:text-red-700"
                          title="Remove scenario"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Retirement Age */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium">Retirement Age</td>
                {scenarios.map(({ scenario, projections }) => (
                  <td key={scenario.id} className="py-4 px-6">
                    {projections[0]?.age || 'N/A'}
                  </td>
                ))}
              </tr>

              {/* Monthly Pension */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium">Monthly Pension</td>
                {scenarios.map(({ scenario, pensionBreakdown }) => {
                  const isHighest =
                    pensionBreakdown.monthlyPension ===
                    Math.max(...scenarios.map((s) => s.pensionBreakdown.monthlyPension));
                  return (
                    <td
                      key={scenario.id}
                      className={`py-4 px-6 ${isHighest ? 'font-bold text-green-600' : ''}`}
                    >
                      {formatCurrency(pensionBreakdown.monthlyPension)}
                      {isHighest && ' ✓'}
                    </td>
                  );
                })}
              </tr>

              {/* Annual Pension */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium">Annual Pension</td>
                {scenarios.map(({ scenario, pensionBreakdown }) => (
                  <td key={scenario.id} className="py-4 px-6">
                    {formatCurrency(pensionBreakdown.annualPension, 0)}
                  </td>
                ))}
              </tr>

              {/* Years of Service */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium">Years of Service</td>
                {scenarios.map(({ scenario, pensionBreakdown }) => (
                  <td key={scenario.id} className="py-4 px-6">
                    {formatYearsOfService(pensionBreakdown.yearsOfService)}
                  </td>
                ))}
              </tr>

              {/* TSP at Retirement */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium">TSP at Retirement</td>
                {scenarios.map(({ scenario, projections }) => {
                  const tspAtRetirement = projections[0]?.tspBalance || 0;
                  return (
                    <td key={scenario.id} className="py-4 px-6">
                      {formatCurrency(tspAtRetirement, 0)}
                    </td>
                  );
                })}
              </tr>

              {/* Final TSP Balance */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium">Final TSP Balance</td>
                {scenarios.map(({ scenario, projections }) => {
                  const finalTSP = getFinalTSP(projections);
                  return (
                    <td key={scenario.id} className="py-4 px-6">
                      {formatCurrency(finalTSP, 0)}
                      {finalTSP === 0 && (
                        <span className="ml-2 text-xs text-red-600">(Depleted)</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* First Year Income */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium">First Year Total Income</td>
                {scenarios.map(({ scenario, projections }) => (
                  <td key={scenario.id} className="py-4 px-6">
                    {formatCurrency(projections[0]?.totalIncome || 0, 0)}
                  </td>
                ))}
              </tr>

              {/* Lifetime Income */}
              <tr className="border-b hover:bg-gray-50 bg-blue-50">
                <td className="py-4 px-6 font-bold">Total Lifetime Income</td>
                {scenarios.map(({ scenario, projections }) => {
                  const lifetimeIncome = getLifetimeIncome(projections);
                  const isHighest =
                    lifetimeIncome ===
                    Math.max(...scenarios.map((s) => getLifetimeIncome(s.projections)));
                  return (
                    <td
                      key={scenario.id}
                      className={`py-4 px-6 font-bold ${
                        isHighest ? 'text-green-600' : ''
                      }`}
                    >
                      {formatCurrency(lifetimeIncome, 0)}
                      {isHighest && ' ✓'}
                    </td>
                  );
                })}
              </tr>

              {/* FEHB Coverage */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium">FEHB Coverage</td>
                {scenarios.map(({ scenario }) => (
                  <td key={scenario.id} className="py-4 px-6">
                    {scenario.profile.assumptions.fehbCoverageLevel === 'self' && 'Self Only'}
                    {scenario.profile.assumptions.fehbCoverageLevel === 'self+one' &&
                      'Self + One'}
                    {scenario.profile.assumptions.fehbCoverageLevel === 'self+family' &&
                      'Self + Family'}
                  </td>
                ))}
              </tr>

              {/* Survivor Annuity */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 font-medium">Survivor Annuity</td>
                {scenarios.map(({ scenario }) => (
                  <td key={scenario.id} className="py-4 px-6">
                    {scenario.profile.retirement.survivorAnnuityType === 'none' ? (
                      <span className="text-gray-500">None</span>
                    ) : (
                      <span className="text-green-600">
                        {scenario.profile.retirement.survivorAnnuityType === 'standard'
                          ? 'Standard (50%)'
                          : 'Court-Ordered'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Highest Monthly Pension
          </h3>
          <p className="text-2xl font-bold">
            {formatCurrency(
              Math.max(...scenarios.map((s) => s.pensionBreakdown.monthlyPension))
            )}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {
              scenarios.find(
                (s) =>
                  s.pensionBreakdown.monthlyPension ===
                  Math.max(...scenarios.map((s) => s.pensionBreakdown.monthlyPension))
              )?.scenario.name
            }
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Highest Lifetime Income
          </h3>
          <p className="text-2xl font-bold">
            {formatCurrency(
              Math.max(...scenarios.map((s) => getLifetimeIncome(s.projections))),
              0
            )}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {
              scenarios.find(
                (s) =>
                  getLifetimeIncome(s.projections) ===
                  Math.max(...scenarios.map((s) => getLifetimeIncome(s.projections)))
              )?.scenario.name
            }
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Scenarios Compared
          </h3>
          <p className="text-2xl font-bold">{scenarios.length}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {scenarios.filter((s) => s.scenario.metadata.isPreBuilt).length} sample,{' '}
            {scenarios.filter((s) => !s.scenario.metadata.isPreBuilt).length} custom
          </p>
        </Card>
      </div>
    </div>
  );
}
