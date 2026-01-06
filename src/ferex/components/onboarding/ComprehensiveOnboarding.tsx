/**
 * Comprehensive Onboarding Flow (7 steps)
 * Detailed inputs for accurate retirement projections
 */

import { useState } from 'react';
import type {
  UserProfile,
  ServicePeriod,
  SurvivorAnnuityType,
  FEHBCoverageLevel,
  SpouseInfo,
  HighThreeYears,
  TSPAllocation,
} from '../../types';
import { DEFAULT_ASSUMPTIONS, DEFAULT_TSP } from '../../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface ComprehensiveOnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
}

export function ComprehensiveOnboarding({
  onComplete,
  onCancel,
}: ComprehensiveOnboardingProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Step 1: Personal Info (expanded from express)
  const [birthYear, setBirthYear] = useState<number>(1980);

  // Step 2: Service History (multiple periods)
  const [servicePeriods, setServicePeriods] = useState<ServicePeriod[]>([
    {
      id: 'period-1',
      startDate: new Date('2000-01-01'),
      system: 'auto',
      isActive: true,
    },
  ]);

  // Step 3: High-3 Calculation (actual salaries)
  const [useActualHigh3, setUseActualHigh3] = useState(false);
  const [currentSalary, setCurrentSalary] = useState<number>(85000);
  const [high3Years, setHigh3Years] = useState<HighThreeYears>({
    year1: 85000,
    year2: 82000,
    year3: 79000,
  });

  // Step 4: Survivor Benefits
  const [survivorAnnuityType, setSurvivorAnnuityType] =
    useState<SurvivorAnnuityType>('none');

  // Step 5: TSP Details
  const [tspBalance, setTSPBalance] = useState<number>(150000);
  const [tspContribution, setTSPContribution] = useState<number>(0);
  const [tspReturnRate, setTSPReturnRate] = useState<number>(6.5);
  const [useTSPAllocation, setUseTSPAllocation] = useState(false);
  const [tspAllocation, setTSPAllocation] = useState<TSPAllocation>({
    cFund: 50,
    sFund: 30,
    iFund: 10,
    fFund: 5,
    gFund: 5,
    lFunds: {},
  });

  // Step 6: Spouse/Family Info
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spouseInfo, setSpouseInfo] = useState<SpouseInfo>({
    age: 45,
    gender: 'female',
  });
  const [familySize, setFamilySize] = useState<number>(1);

  // Step 7: Financial Assumptions & FEHB
  const [inflationRate, setInflationRate] = useState<number>(
    DEFAULT_ASSUMPTIONS.inflationRate
  );
  const [colaRate, setColaRate] = useState<number>(DEFAULT_ASSUMPTIONS.colaRate);
  const [healthcareInflation, setHealthcareInflation] = useState<number>(
    DEFAULT_ASSUMPTIONS.healthcareInflation
  );
  const [fehbCoverage, setFehbCoverage] = useState<FEHBCoverageLevel>(
    DEFAULT_ASSUMPTIONS.fehbCoverageLevel
  );
  const [tspDrawdownRate, setTspDrawdownRate] = useState<number>(4.0);

  // Helper function to safely parse dates
  const handleDateChange = (value: string, callback: (date: Date) => void) => {
    if (!value) return; // Empty value, do nothing
    try {
      const date = new Date(value);
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        callback(date);
      }
    } catch (error) {
      // Invalid date, do nothing
      console.warn('Invalid date input:', value);
    }
  };

  const addServicePeriod = () => {
    const newPeriod: ServicePeriod = {
      id: `period-${Date.now()}`,
      startDate: new Date(),
      system: 'auto',
      isActive: false,
    };
    setServicePeriods([...servicePeriods, newPeriod]);
  };

  const removeServicePeriod = (id: string) => {
    setServicePeriods(servicePeriods.filter((p) => p.id !== id));
  };

  const updateServicePeriod = (
    id: string,
    updates: Partial<ServicePeriod>
  ) => {
    setServicePeriods(
      servicePeriods.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleComplete = () => {
    const profile: UserProfile = {
      personal: {
        birthYear,
        spouseInfo: hasSpouse ? spouseInfo : undefined,
      },
      employment: {
        servicePeriods,
        currentOrLastSalary: currentSalary,
        high3Override: useActualHigh3
          ? (high3Years.year1 + high3Years.year2 + high3Years.year3) / 3
          : undefined,
        lastHighThreeYears: useActualHigh3 ? high3Years : undefined,
      },
      retirement: {
        survivorAnnuityType,
      },
      tsp: {
        currentBalance: tspBalance,
        annualContribution: tspContribution,
        returnAssumption: tspReturnRate,
        currentAllocation: useTSPAllocation ? tspAllocation : undefined,
        employerMatch: DEFAULT_TSP.employerMatch,
      },
      assumptions: {
        inflationRate,
        colaRate,
        healthcareInflation,
        fehbCoverageLevel: fehbCoverage,
        tspDrawdownRate,
      },
    };

    onComplete(profile);
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const calculateHigh3 = () => {
    return (high3Years.year1 + high3Years.year2 + high3Years.year3) / 3;
  };

  const calculateTSPAllocationTotal = () => {
    const individualFunds =
      tspAllocation.cFund +
      tspAllocation.sFund +
      tspAllocation.iFund +
      tspAllocation.fFund +
      tspAllocation.gFund;
    const lFundsTotal = Object.values(tspAllocation.lFunds).reduce(
      (sum, val) => sum + (val || 0),
      0
    );
    return individualFunds + lFundsTotal;
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Comprehensive Retirement Plan</h1>
        <p className="text-muted-foreground">
          Detailed inputs for the most accurate retirement projection
        </p>
        <div className="mt-4 flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded ${
                i + 1 <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Step {step} of {totalSteps}
        </p>
      </div>

      <Card className="p-6">
        {/* STEP 1: Personal Information */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Birth Year
                </label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(parseInt(e.target.value))}
                  min={1940}
                  max={2010}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current age: {new Date().getFullYear() - birthYear}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Service History (Multiple Periods) */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Federal Service History
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add all periods of federal service. Service breaks will be
              automatically detected.
            </p>

            <div className="space-y-4">
              {servicePeriods.map((period, index) => (
                <Card key={period.id} className="p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Service Period {index + 1}</h3>
                    {servicePeriods.length > 1 && (
                      <button
                        onClick={() => removeServicePeriod(period.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={period.startDate.toISOString().split('T')[0]}
                        onChange={(e) =>
                          handleDateChange(e.target.value, (date) =>
                            updateServicePeriod(period.id, {
                              startDate: date,
                            })
                          )
                        }
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        End Date (or current)
                      </label>
                      <input
                        type="date"
                        value={
                          period.endDate?.toISOString().split('T')[0] || ''
                        }
                        onChange={(e) => {
                          if (!e.target.value) {
                            updateServicePeriod(period.id, {
                              endDate: undefined,
                              isActive: true,
                            });
                          } else {
                            handleDateChange(e.target.value, (date) =>
                              updateServicePeriod(period.id, {
                                endDate: date,
                                isActive: false,
                              })
                            );
                          }
                        }}
                        disabled={period.isActive}
                        className="w-full px-3 py-2 border rounded-md text-sm disabled:bg-gray-200"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={period.isActive}
                        onChange={(e) =>
                          updateServicePeriod(period.id, {
                            isActive: e.target.checked,
                            endDate: e.target.checked
                              ? undefined
                              : period.endDate || new Date(),
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        Currently employed in this position
                      </span>
                    </label>
                  </div>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addServicePeriod}
                className="w-full"
              >
                + Add Another Service Period
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: High-3 Calculation */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">High-3 Salary Calculation</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your pension is based on your highest 3 consecutive years of salary.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Current (or Most Recent) Salary
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    value={currentSalary}
                    onChange={(e) => setCurrentSalary(parseInt(e.target.value))}
                    min={0}
                    step={1000}
                    className="w-full pl-8 pr-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={useActualHigh3}
                    onChange={(e) => setUseActualHigh3(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">
                    I know my exact High-3 salaries
                  </span>
                </label>

                {useActualHigh3 && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Highest Year Salary
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          value={high3Years.year1}
                          onChange={(e) =>
                            setHigh3Years({
                              ...high3Years,
                              year1: parseInt(e.target.value),
                            })
                          }
                          min={0}
                          step={1000}
                          className="w-full pl-8 pr-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Second Highest Year Salary
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          value={high3Years.year2}
                          onChange={(e) =>
                            setHigh3Years({
                              ...high3Years,
                              year2: parseInt(e.target.value),
                            })
                          }
                          min={0}
                          step={1000}
                          className="w-full pl-8 pr-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Third Highest Year Salary
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">
                          $
                        </span>
                        <input
                          type="number"
                          value={high3Years.year3}
                          onChange={(e) =>
                            setHigh3Years({
                              ...high3Years,
                              year3: parseInt(e.target.value),
                            })
                          }
                          min={0}
                          step={1000}
                          className="w-full pl-8 pr-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>

                    <Card className="p-3 bg-blue-50 border-blue-200">
                      <p className="text-sm font-medium text-blue-900">
                        Your High-3 Average: {formatCurrency(calculateHigh3())}
                      </p>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Survivor Benefits */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Survivor Benefits</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose if you want to provide continued pension benefits to a
              survivor after your death. This reduces your monthly pension by
              10%.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setSurvivorAnnuityType('none')}
                className={`w-full px-4 py-4 text-left border rounded-md transition-colors ${
                  survivorAnnuityType === 'none'
                    ? 'border-primary bg-primary/5 font-medium'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">No Survivor Benefit</div>
                <div className="text-sm text-gray-600 mt-1">
                  Maximum pension for you. No benefits continue after your death.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSurvivorAnnuityType('standard')}
                className={`w-full px-4 py-4 text-left border rounded-md transition-colors ${
                  survivorAnnuityType === 'standard'
                    ? 'border-primary bg-primary/5 font-medium'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">
                  Standard Survivor Benefit (10% reduction)
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Your spouse receives 55% of your pension after your death.
                  Reduces your pension by 10%.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSurvivorAnnuityType('courtOrdered')}
                className={`w-full px-4 py-4 text-left border rounded-md transition-colors ${
                  survivorAnnuityType === 'courtOrdered'
                    ? 'border-primary bg-primary/5 font-medium'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">Court-Ordered Survivor Benefit</div>
                <div className="text-sm text-gray-600 mt-1">
                  Court-mandated survivor annuity (typically ~10% reduction).
                </div>
              </button>

              {survivorAnnuityType !== 'none' && (
                <Card className="p-4 bg-yellow-50 border-yellow-200">
                  <p className="text-sm text-yellow-900">
                    <strong>Note:</strong> Choosing a survivor benefit reduces
                    your monthly pension by approximately 10%, but ensures your
                    spouse continues receiving 55% of your pension after you pass
                    away.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: TSP Details */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Thrift Savings Plan (TSP)
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Provide details about your TSP balance and contribution strategy.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Current TSP Balance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    value={tspBalance}
                    onChange={(e) => setTSPBalance(parseInt(e.target.value))}
                    min={0}
                    step={5000}
                    className="w-full pl-8 pr-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Annual Contribution (if still working)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    value={tspContribution}
                    onChange={(e) =>
                      setTSPContribution(parseInt(e.target.value))
                    }
                    min={0}
                    step={1000}
                    className="w-full pl-8 pr-3 py-2 border rounded-md"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  2026 limit: $23,000 ($30,500 if 50+)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expected Annual Return: {formatPercent(tspReturnRate)}
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="0.5"
                  value={tspReturnRate}
                  onChange={(e) => setTspReturnRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>3% (conservative)</span>
                  <span>6.5% (default)</span>
                  <span>10% (aggressive)</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={useTSPAllocation}
                    onChange={(e) => setUseTSPAllocation(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">
                    Specify my TSP fund allocation (optional)
                  </span>
                </label>

                {useTSPAllocation && (
                  <div className="space-y-3 pl-6">
                    <p className="text-xs text-muted-foreground mb-2">
                      Enter your allocation percentages. Total should equal 100%.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">
                          C Fund (Stocks)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={tspAllocation.cFund}
                            onChange={(e) =>
                              setTSPAllocation({
                                ...tspAllocation,
                                cFund: parseInt(e.target.value) || 0,
                              })
                            }
                            min={0}
                            max={100}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                            %
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          S Fund (Small/Mid Cap)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={tspAllocation.sFund}
                            onChange={(e) =>
                              setTSPAllocation({
                                ...tspAllocation,
                                sFund: parseInt(e.target.value) || 0,
                              })
                            }
                            min={0}
                            max={100}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                            %
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          I Fund (International)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={tspAllocation.iFund}
                            onChange={(e) =>
                              setTSPAllocation({
                                ...tspAllocation,
                                iFund: parseInt(e.target.value) || 0,
                              })
                            }
                            min={0}
                            max={100}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                            %
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          F Fund (Bonds)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={tspAllocation.fFund}
                            onChange={(e) =>
                              setTSPAllocation({
                                ...tspAllocation,
                                fFund: parseInt(e.target.value) || 0,
                              })
                            }
                            min={0}
                            max={100}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                            %
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">
                          G Fund (Government)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={tspAllocation.gFund}
                            onChange={(e) =>
                              setTSPAllocation({
                                ...tspAllocation,
                                gFund: parseInt(e.target.value) || 0,
                              })
                            }
                            min={0}
                            max={100}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    <Card
                      className={`p-3 ${
                        calculateTSPAllocationTotal() === 100
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          calculateTSPAllocationTotal() === 100
                            ? 'text-green-900'
                            : 'text-red-900'
                        }`}
                      >
                        Total Allocation: {calculateTSPAllocationTotal()}%
                        {calculateTSPAllocationTotal() !== 100 &&
                          ' (must equal 100%)'}
                      </p>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Spouse/Family Info */}
        {step === 6 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Spouse & Family Information</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Family information helps with FEHB coverage planning and survivor
              benefit calculations.
            </p>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasSpouse}
                    onChange={(e) => setHasSpouse(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">
                    I am married or have a domestic partner
                  </span>
                </label>
              </div>

              {hasSpouse && (
                <Card className="p-4 bg-gray-50">
                  <h3 className="font-medium mb-3">Spouse/Partner Information</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Spouse Age
                      </label>
                      <input
                        type="number"
                        value={spouseInfo.age}
                        onChange={(e) =>
                          setSpouseInfo({
                            ...spouseInfo,
                            age: parseInt(e.target.value),
                          })
                        }
                        min={18}
                        max={100}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Spouse Gender
                      </label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() =>
                            setSpouseInfo({ ...spouseInfo, gender: 'male' })
                          }
                          className={`flex-1 px-4 py-2 border rounded-md text-sm ${
                            spouseInfo.gender === 'male'
                              ? 'border-primary bg-primary/5 font-medium'
                              : 'border-gray-300'
                          }`}
                        >
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSpouseInfo({ ...spouseInfo, gender: 'female' })
                          }
                          className={`flex-1 px-4 py-2 border rounded-md text-sm ${
                            spouseInfo.gender === 'female'
                              ? 'border-primary bg-primary/5 font-medium'
                              : 'border-gray-300'
                          }`}
                        >
                          Female
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Total Family Size (including yourself)
                </label>
                <input
                  type="number"
                  value={familySize}
                  onChange={(e) => setFamilySize(parseInt(e.target.value))}
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Helps determine appropriate FEHB coverage level
                </p>
              </div>

              {familySize > 1 && (
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Recommended FEHB:</strong>{' '}
                    {familySize === 2 ? 'Self + One' : 'Self + Family'}
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* STEP 7: Financial Assumptions & FEHB */}
        {step === 7 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Financial Assumptions & Healthcare
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Customize your financial assumptions and select your FEHB coverage.
            </p>

            <div className="space-y-5">
              {/* Inflation Rate */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  General Inflation Rate: {formatPercent(inflationRate)}
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1%</span>
                  <span>3.5% (default)</span>
                  <span>6%</span>
                </div>
              </div>

              {/* COLA Rate */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pension COLA Rate: {formatPercent(colaRate)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={colaRate}
                  onChange={(e) => setColaRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>2.5% (default)</span>
                  <span>5%</span>
                </div>
              </div>

              {/* Healthcare Inflation */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Healthcare Inflation: {formatPercent(healthcareInflation)}
                </label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="0.5"
                  value={healthcareInflation}
                  onChange={(e) =>
                    setHealthcareInflation(parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2%</span>
                  <span>5% (default)</span>
                  <span>8%</span>
                </div>
              </div>

              {/* TSP Drawdown Rate */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  TSP Drawdown Rate: {formatPercent(tspDrawdownRate)}
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.5"
                  value={tspDrawdownRate}
                  onChange={(e) =>
                    setTspDrawdownRate(parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2%</span>
                  <span>4% (recommended)</span>
                  <span>10%</span>
                </div>
              </div>

              {/* FEHB Coverage Level */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-3">
                  FEHB Coverage Level
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFehbCoverage('self')}
                    className={`w-full px-4 py-3 text-left border rounded-md transition-colors ${
                      fehbCoverage === 'self'
                        ? 'border-blue-600 bg-blue-50 font-medium'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Self Only</div>
                    <div className="text-xs text-gray-500">~$4,200/year</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFehbCoverage('self+one')}
                    className={`w-full px-4 py-3 text-left border rounded-md transition-colors ${
                      fehbCoverage === 'self+one'
                        ? 'border-blue-600 bg-blue-50 font-medium'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Self + One</div>
                    <div className="text-xs text-gray-500">~$9,600/year</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFehbCoverage('self+family')}
                    className={`w-full px-4 py-3 text-left border rounded-md transition-colors ${
                      fehbCoverage === 'self+family'
                        ? 'border-blue-600 bg-blue-50 font-medium'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Self + Family</div>
                    <div className="text-xs text-gray-500">~$11,800/year</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={prevStep} className="flex-1">
              Back
            </Button>
          )}
          {step < totalSteps ? (
            <Button onClick={nextStep} className="flex-1">
              Continue
            </Button>
          ) : (
            <Button onClick={handleComplete} className="flex-1">
              Complete & View Projection
            </Button>
          )}
        </div>

        {onCancel && step === 1 && (
          <Button variant="ghost" onClick={onCancel} className="w-full mt-2">
            Cancel
          </Button>
        )}
      </Card>
    </div>
  );
}
