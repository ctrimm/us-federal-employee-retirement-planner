/**
 * Express Onboarding Flow (~3 minutes)
 * Minimal viable inputs for quick projection
 */

import { useState } from 'react';
import type { UserProfile, ServicePeriod } from '../../types';
import { DEFAULT_ASSUMPTIONS, DEFAULT_TSP } from '../../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ExpressOnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
}

export function ExpressOnboarding({ onComplete, onCancel }: ExpressOnboardingProps) {
  console.log('[ExpressOnboarding] Component mounted - Quick Check (3 steps)');
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Personal Info
  const [birthYear, setBirthYear] = useState<number>(1980);

  // Step 2: Service History
  const [servicePeriods, setServicePeriods] = useState<ServicePeriod[]>([
    {
      id: 'period-1',
      startDate: new Date('2000-01-01'),
      system: 'auto',
      isActive: true,
    },
  ]);

  // Step 3: Income & TSP
  const [currentSalary, setCurrentSalary] = useState<number>(85000);
  const [tspBalance, setTSPBalance] = useState<number>(150000);

  // Safe date formatting for input[type="date"] fields
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    if (!(date instanceof Date) || isNaN(date.getTime())) return '';
    try {
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  // Safe date parsing from input[type="date"] fields
  const parseDateFromInput = (value: string): Date | undefined => {
    if (!value || value.length < 10) return undefined; // Date incomplete
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return undefined;
      return date;
    } catch (e) {
      return undefined;
    }
  };

  const handleComplete = () => {
    const profile: UserProfile = {
      personal: {
        birthYear,
      },
      employment: {
        servicePeriods,
        currentOrLastSalary: currentSalary,
      },
      retirement: {
        survivorAnnuityType: 'none',
      },
      tsp: {
        currentBalance: tspBalance,
        annualContribution: 0,
        returnAssumption: DEFAULT_TSP.returnAssumption!,
      },
      assumptions: DEFAULT_ASSUMPTIONS,
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Quick Retirement Check</h1>
        <p className="text-muted-foreground">
          Get a quick estimate in just 3 simple steps
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
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  When were you born?
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

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Service History</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  When did you start federal service?
                </label>
                <input
                  type="date"
                  value={formatDateForInput(servicePeriods[0].startDate)}
                  onChange={(e) => {
                    const date = parseDateFromInput(e.target.value);
                    if (date) {
                      const newPeriods = [...servicePeriods];
                      newPeriods[0].startDate = date;
                      setServicePeriods(newPeriods);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Are you currently employed in federal service?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      const newPeriods = [...servicePeriods];
                      newPeriods[0].isActive = true;
                      newPeriods[0].endDate = undefined;
                      setServicePeriods(newPeriods);
                    }}
                    className={`flex-1 px-4 py-3 border rounded-md ${
                      servicePeriods[0].isActive
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-gray-300'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newPeriods = [...servicePeriods];
                      newPeriods[0].isActive = false;
                      newPeriods[0].endDate = new Date();
                      setServicePeriods(newPeriods);
                    }}
                    className={`flex-1 px-4 py-3 border rounded-md ${
                      !servicePeriods[0].isActive
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-gray-300'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {!servicePeriods[0].isActive && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    When did you leave?
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(servicePeriods[0].endDate)}
                    onChange={(e) => {
                      const date = parseDateFromInput(e.target.value);
                      const newPeriods = [...servicePeriods];
                      newPeriods[0].endDate = date;
                      setServicePeriods(newPeriods);
                    }}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Income & TSP</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  What's your current (or most recent) salary?
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
                <p className="text-xs text-muted-foreground mt-1">
                  Used to calculate your High-3 average
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  What's your current TSP balance? (optional)
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
                <p className="text-xs text-muted-foreground mt-1">
                  Used to estimate retirement income alongside your pension
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={prevStep}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {step < totalSteps ? (
            <Button onClick={nextStep} className="flex-1">
              Continue
            </Button>
          ) : (
            <Button onClick={handleComplete} className="flex-1">
              Calculate My Retirement
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
