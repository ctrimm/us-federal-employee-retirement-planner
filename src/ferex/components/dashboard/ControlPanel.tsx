/**
 * Control Panel for Adjusting Retirement Variables
 * Allows users to modify assumptions and see real-time updates
 */

import { useState } from 'react';
import type { UserProfile, FEHBCoverageLevel, ServicePeriod, OtherAccount, OtherAccountType } from '../../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPercent, formatCurrency } from '../../utils/formatters';

interface ControlPanelProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ControlPanel({ profile, onUpdate, isOpen, onToggle }: ControlPanelProps) {
  const [retirementAge, setRetirementAge] = useState(
    profile.retirement.intendedRetirementAge || 62
  );
  const [tspDrawdownRate, setTspDrawdownRate] = useState(
    profile.assumptions.tspDrawdownRate || 4
  );
  const [inflationRate, setInflationRate] = useState(
    profile.assumptions.inflationRate
  );
  const [colaRate, setColaRate] = useState(profile.assumptions.colaRate);
  const [healthcareInflation, setHealthcareInflation] = useState(
    profile.assumptions.healthcareInflation
  );
  const [fehbCoverage, setFehbCoverage] = useState(
    profile.assumptions.fehbCoverageLevel
  );
  const [tspReturn, setTspReturn] = useState(profile.tsp.returnAssumption);

  // Barista FIRE settings
  const [enableBaristaFire, setEnableBaristaFire] = useState(
    profile.retirement.enableBaristaFire || false
  );
  const [partTimeIncome, setPartTimeIncome] = useState(
    profile.retirement.partTimeIncomeAnnual || 30000
  );
  const [partTimeStartAge, setPartTimeStartAge] = useState(
    profile.retirement.partTimeStartAge || retirementAge
  );
  const [partTimeEndAge, setPartTimeEndAge] = useState(
    profile.retirement.partTimeEndAge || (retirementAge + 10)
  );
  const [targetRetirementIncome, setTargetRetirementIncome] = useState(
    profile.retirement.targetRetirementIncome || 60000
  );

  // Service History
  const [servicePeriods, setServicePeriods] = useState<ServicePeriod[]>(
    profile.employment.servicePeriods || []
  );
  const [sickLeaveHours, setSickLeaveHours] = useState<number>(
    profile.employment.sickLeaveHours || 0
  );

  // Other Investments
  const [otherAccounts, setOtherAccounts] = useState<OtherAccount[]>(
    profile.otherInvestments?.accounts || []
  );

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

  const updateServicePeriod = (id: string, updates: Partial<ServicePeriod>) => {
    setServicePeriods(
      servicePeriods.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const addOtherAccount = () => {
    const newAccount: OtherAccount = {
      id: `account-${Date.now()}`,
      name: 'New Account',
      type: 'brokerage',
      currentBalance: 0,
      returnAssumption: 6.5,
    };
    setOtherAccounts([...otherAccounts, newAccount]);
  };

  const removeOtherAccount = (id: string) => {
    setOtherAccounts(otherAccounts.filter((a) => a.id !== id));
  };

  const updateOtherAccount = (id: string, updates: Partial<OtherAccount>) => {
    setOtherAccounts(
      otherAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const handleApply = () => {
    onUpdate({
      employment: {
        ...profile.employment,
        servicePeriods,
        sickLeaveHours,
      },
      retirement: {
        ...profile.retirement,
        intendedRetirementAge: retirementAge,
        enableBaristaFire,
        partTimeIncomeAnnual: partTimeIncome,
        partTimeStartAge,
        partTimeEndAge,
        targetRetirementIncome,
      },
      assumptions: {
        ...profile.assumptions,
        tspDrawdownRate,
        inflationRate,
        colaRate,
        healthcareInflation,
        fehbCoverageLevel: fehbCoverage,
      },
      tsp: {
        ...profile.tsp,
        returnAssumption: tspReturn,
      },
      otherInvestments: {
        accounts: otherAccounts,
        totalBalance: otherAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0),
      },
    });
  };

  const handleReset = () => {
    setRetirementAge(profile.retirement.intendedRetirementAge || 62);
    setTspDrawdownRate(profile.assumptions.tspDrawdownRate || 4);
    setInflationRate(profile.assumptions.inflationRate);
    setColaRate(profile.assumptions.colaRate);
    setHealthcareInflation(profile.assumptions.healthcareInflation);
    setFehbCoverage(profile.assumptions.fehbCoverageLevel);
    setTspReturn(profile.tsp.returnAssumption);
    setEnableBaristaFire(profile.retirement.enableBaristaFire || false);
    setPartTimeIncome(profile.retirement.partTimeIncomeAnnual || 30000);
    setPartTimeStartAge(profile.retirement.partTimeStartAge || retirementAge);
    setPartTimeEndAge(profile.retirement.partTimeEndAge || (retirementAge + 10));
    setTargetRetirementIncome(profile.retirement.targetRetirementIncome || 60000);
    setServicePeriods(profile.employment.servicePeriods || []);
    setSickLeaveHours(profile.employment.sickLeaveHours || 0);
    setOtherAccounts(profile.otherInvestments?.accounts || []);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-50 bg-blue-600 text-white p-3 rounded-r-lg shadow-lg hover:bg-blue-700 transition-all ${
          isOpen ? 'left-96' : 'left-0'
        }`}
        aria-label="Toggle control panel"
      >
        <svg
          className={`w-6 h-6 transition-transform ${isOpen ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Side Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-96 bg-white shadow-2xl z-40 transform transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Adjust Assumptions</h2>
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Service History Section */}
            <div className="pb-6 border-b">
              <h3 className="text-lg font-semibold mb-3">Federal Service History</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add or edit your federal employment periods
              </p>

              <div className="space-y-3">
                {servicePeriods.map((period, index) => (
                  <Card key={period.id} className="p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Period {index + 1}</span>
                      {servicePeriods.length > 1 && (
                        <button
                          onClick={() => removeServicePeriod(period.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Start Date</label>
                        <input
                          type="date"
                          value={period.startDate.toISOString().split('T')[0]}
                          onChange={(e) =>
                            updateServicePeriod(period.id, {
                              startDate: new Date(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1 border rounded text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">End Date</label>
                        <input
                          type="date"
                          value={period.endDate?.toISOString().split('T')[0] || ''}
                          onChange={(e) =>
                            updateServicePeriod(period.id, {
                              endDate: e.target.value ? new Date(e.target.value) : undefined,
                              isActive: !e.target.value,
                            })
                          }
                          disabled={period.isActive}
                          className="w-full px-2 py-1 border rounded text-xs disabled:bg-gray-200"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={period.isActive}
                        onChange={(e) =>
                          updateServicePeriod(period.id, {
                            isActive: e.target.checked,
                            endDate: e.target.checked ? undefined : period.endDate || new Date(),
                          })
                        }
                        className="w-3 h-3"
                      />
                      <span className="text-xs">Currently employed</span>
                    </label>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addServicePeriod}
                  className="w-full text-sm"
                  size="sm"
                >
                  + Add Service Period
                </Button>

                {/* Sick Leave Hours */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Sick Leave Hours (Unused)
                  </label>
                  <input
                    type="number"
                    value={sickLeaveHours}
                    onChange={(e) => setSickLeaveHours(parseInt(e.target.value) || 0)}
                    min={0}
                    step={10}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unused sick leave converts to service credit (~2,087 hours = 1 year). This boosts your pension calculation once you're eligible to retire.
                  </p>
                </div>
              </div>
            </div>

            {/* Other Investments Section */}
            <div className="pb-6 border-b">
              <h3 className="text-lg font-semibold mb-3">Other Investments & Savings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Track non-TSP accounts (IRAs, 401ks, brokerage, savings, etc.)
              </p>

              <div className="space-y-3">
                {otherAccounts.map((account) => (
                  <Card key={account.id} className="p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={account.name}
                        onChange={(e) =>
                          updateOtherAccount(account.id, { name: e.target.value })
                        }
                        className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
                        placeholder="Account name"
                      />
                      <button
                        onClick={() => removeOtherAccount(account.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Type</label>
                        <select
                          value={account.type}
                          onChange={(e) =>
                            updateOtherAccount(account.id, { type: e.target.value as OtherAccountType })
                          }
                          className="w-full px-2 py-1 border rounded text-xs"
                        >
                          <option value="traditional_ira">Traditional IRA</option>
                          <option value="roth_ira">Roth IRA</option>
                          <option value="401k">401(k)</option>
                          <option value="brokerage">Brokerage</option>
                          <option value="savings">Savings</option>
                          <option value="real_estate">Real Estate</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Balance</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-gray-500 text-xs">$</span>
                          <input
                            type="number"
                            value={account.currentBalance}
                            onChange={(e) =>
                              updateOtherAccount(account.id, {
                                currentBalance: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full pl-5 pr-2 py-1 border rounded text-xs"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Annual Return %</label>
                        <input
                          type="number"
                          value={account.returnAssumption || 6.5}
                          onChange={(e) =>
                            updateOtherAccount(account.id, {
                              returnAssumption: parseFloat(e.target.value) || 6.5,
                            })
                          }
                          step="0.5"
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="6.5"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-1 mt-4">
                          <input
                            type="checkbox"
                            checked={account.taxDeferred || false}
                            onChange={(e) =>
                              updateOtherAccount(account.id, {
                                taxDeferred: e.target.checked,
                              })
                            }
                            className="w-3 h-3"
                          />
                          <span className="text-xs">Tax-deferred</span>
                        </label>
                      </div>
                    </div>
                  </Card>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addOtherAccount}
                  className="w-full text-sm"
                  size="sm"
                >
                  + Add Investment Account
                </Button>

                {otherAccounts.length > 0 && (
                  <Card className="p-3 bg-blue-50 border-blue-200">
                    <p className="text-sm font-medium text-blue-900">
                      Total Other Investments: {formatCurrency(otherAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0))}
                    </p>
                  </Card>
                )}
              </div>
            </div>

            {/* Retirement Age */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Retirement Age: {retirementAge}
              </label>
              <input
                type="range"
                min="55"
                max="70"
                value={retirementAge}
                onChange={(e) => setRetirementAge(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>55</span>
                <span>70</span>
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
                onChange={(e) => setTspDrawdownRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>2%</span>
                <span>4% (recommended)</span>
                <span>10%</span>
              </div>
            </div>

            {/* TSP Return Assumption */}
            <div>
              <label className="block text-sm font-medium mb-2">
                TSP Annual Return: {formatPercent(tspReturn)}
              </label>
              <input
                type="range"
                min="3"
                max="10"
                step="0.5"
                value={tspReturn}
                onChange={(e) => setTspReturn(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3% (conservative)</span>
                <span>10% (aggressive)</span>
              </div>
            </div>

            {/* Inflation Rate */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Inflation Rate: {formatPercent(inflationRate)}
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
                <span>6%</span>
              </div>
            </div>

            {/* COLA Rate */}
            <div>
              <label className="block text-sm font-medium mb-2">
                COLA Rate: {formatPercent(colaRate)}
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
                onChange={(e) => setHealthcareInflation(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>2%</span>
                <span>8%</span>
              </div>
            </div>

            {/* FEHB Coverage Level */}
            <div>
              <label className="block text-sm font-medium mb-2">
                FEHB Coverage Level
              </label>
              <div className="space-y-2">
                <button
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

            {/* Barista FIRE (Opt-in Part-Time Work) */}
            <div className="pt-6 border-t">
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableBaristaFire}
                    onChange={(e) => setEnableBaristaFire(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-medium">Enable Barista FIRE</div>
                    <div className="text-xs text-gray-500">
                      Work part-time in early retirement for additional income
                    </div>
                  </div>
                </label>
              </div>

              {enableBaristaFire && (
                <div className="space-y-4 pl-8 border-l-2 border-blue-200">
                  {/* Target Retirement Income */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Target Annual Income: {formatCurrency(targetRetirementIncome, 0)}
                    </label>
                    <input
                      type="range"
                      min="30000"
                      max="150000"
                      step="5000"
                      value={targetRetirementIncome}
                      onChange={(e) => setTargetRetirementIncome(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>$30K</span>
                      <span>$150K</span>
                    </div>
                  </div>

                  {/* Part-Time Income */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Part-Time Annual Income: {formatCurrency(partTimeIncome, 0)}
                    </label>
                    <input
                      type="range"
                      min="10000"
                      max="50000"
                      step="2500"
                      value={partTimeIncome}
                      onChange={(e) => setPartTimeIncome(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>$10K</span>
                      <span>~20 hrs/wk @ $25/hr</span>
                      <span>$50K</span>
                    </div>
                  </div>

                  {/* Part-Time Start Age */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Start Part-Time Work at Age: {partTimeStartAge}
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="70"
                      value={partTimeStartAge}
                      onChange={(e) => setPartTimeStartAge(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>50</span>
                      <span>70</span>
                    </div>
                  </div>

                  {/* Part-Time End Age */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      End Part-Time Work at Age: {partTimeEndAge}
                    </label>
                    <input
                      type="range"
                      min={partTimeStartAge}
                      max="75"
                      value={partTimeEndAge}
                      onChange={(e) => setPartTimeEndAge(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{partTimeStartAge}</span>
                      <span>75</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Work part-time for {partTimeEndAge - partTimeStartAge} years
                    </p>
                  </div>

                  {/* Info Card */}
                  <Card className="p-3 bg-green-50 border-green-200">
                    <p className="text-xs text-green-900">
                      <strong>Barista FIRE:</strong> Retire early from full-time work, then supplement
                      your pension with part-time income (e.g., barista, consulting, passion projects).
                    </p>
                  </Card>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleApply} className="flex-1">
                Apply Changes
              </Button>
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Reset
              </Button>
            </div>

            {/* Info Box */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Tip:</strong> Adjust these assumptions to see how different scenarios
                affect your retirement income and savings.
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
}
