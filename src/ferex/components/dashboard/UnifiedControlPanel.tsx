/**
 * Unified Control Panel
 * Single sidebar with tabs for all planning features
 */

import { useState } from 'react';
import type {
  UserProfile,
  Child,
  Milestone,
  Debt,
  Asset,
  MilestoneType,
  MilestoneCriteria,
  ServicePeriod,
  NonFederalEmploymentPeriod,
  OtherAccount,
  OtherAccountType,
} from '../../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent } from '../../utils/formatters';

interface UnifiedControlPanelProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
  isOpen: boolean;
  onToggle: () => void;
}

type Tab = 'basics' | 'income' | 'family' | 'goals' | 'assets';

export function UnifiedControlPanel({
  profile,
  onUpdate,
  isOpen,
  onToggle,
}: UnifiedControlPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basics');

  // Basics Tab
  const [leaveServiceAge, setLeaveServiceAge] = useState(
    profile.retirement.leaveServiceAge || profile.retirement.intendedRetirementAge || 62
  );
  const [claimPensionAge, setClaimPensionAge] = useState(
    profile.retirement.intendedRetirementAge || 62
  );
  const [tspDrawdownRate, setTspDrawdownRate] = useState(
    profile.assumptions.tspDrawdownRate || 4
  );
  const [tspReturn, setTspReturn] = useState(profile.tsp.returnAssumption);
  const [annualExpenses, setAnnualExpenses] = useState(
    profile.assumptions.annualLivingExpenses || 60000
  );
  const [servicePeriods, setServicePeriods] = useState<ServicePeriod[]>(
    profile.employment.servicePeriods || []
  );
  const [nonFederalPeriods, setNonFederalPeriods] = useState<NonFederalEmploymentPeriod[]>(
    profile.employment.nonFederalPeriods || []
  );
  const [sickLeaveHours, setSickLeaveHours] = useState<number>(
    profile.employment.sickLeaveHours || 0
  );
  const [otherAccounts, setOtherAccounts] = useState<OtherAccount[]>(
    profile.otherInvestments?.accounts || []
  );

  // Income Tab
  const [federalSalary, setFederalSalary] = useState(
    profile.employment.currentOrLastSalary || 100000
  );
  const [tspContribution, setTspContribution] = useState(
    profile.tsp.annualContribution || 5000
  );
  const [tspEmployerMatch, setTspEmployerMatch] = useState(
    profile.tsp.employerMatch || 5
  );
  const [spouseIncome, setSpouseIncome] = useState(
    profile.personal.spouseInfo?.currentIncome || 0
  );
  const [spouseRetirementAge, setSpouseRetirementAge] = useState(
    profile.personal.spouseInfo?.retirementAge || 65
  );
  const [spouseRetirementIncome, setSpouseRetirementIncome] = useState(
    profile.personal.spouseInfo?.retirementIncome || 0
  );
  const [enableBaristaFire, setEnableBaristaFire] = useState(
    profile.retirement.enableBaristaFire || false
  );
  const [partTimeIncome, setPartTimeIncome] = useState(
    profile.retirement.partTimeIncomeAnnual || 30000
  );
  const [partTimeStartAge, setPartTimeStartAge] = useState(
    profile.retirement.partTimeStartAge || leaveServiceAge
  );
  const [partTimeEndAge, setPartTimeEndAge] = useState(
    profile.retirement.partTimeEndAge || claimPensionAge
  );

  // Family Tab
  const [children, setChildren] = useState<Child[]>(
    profile.planning?.children || []
  );

  // Goals Tab
  const [milestones, setMilestones] = useState<Milestone[]>(
    profile.planning?.milestones || []
  );

  // Assets Tab
  const [debts, setDebts] = useState<Debt[]>(profile.planning?.debts || []);
  const [assets, setAssets] = useState<Asset[]>(profile.planning?.assets || []);

  const addServicePeriod = () => {
    setServicePeriods([
      ...servicePeriods,
      {
        id: `period-${Date.now()}`,
        startDate: new Date(),
        system: 'auto',
        isActive: false,
      },
    ]);
  };

  const updateServicePeriod = (id: string, updates: Partial<ServicePeriod>) => {
    setServicePeriods(servicePeriods.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removeServicePeriod = (id: string) => {
    setServicePeriods(servicePeriods.filter((p) => p.id !== id));
  };

  const addNonFederalPeriod = () => {
    setNonFederalPeriods([
      ...nonFederalPeriods,
      {
        id: `nonfed-${Date.now()}`,
        startDate: new Date(),
        isActive: false,
      },
    ]);
  };

  const updateNonFederalPeriod = (id: string, updates: Partial<NonFederalEmploymentPeriod>) => {
    setNonFederalPeriods(nonFederalPeriods.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removeNonFederalPeriod = (id: string) => {
    setNonFederalPeriods(nonFederalPeriods.filter((p) => p.id !== id));
  };

  const addOtherAccount = () => {
    setOtherAccounts([
      ...otherAccounts,
      {
        id: `account-${Date.now()}`,
        name: 'New Account',
        type: 'brokerage',
        currentBalance: 0,
        returnAssumption: 6.5,
      },
    ]);
  };

  const updateOtherAccount = (id: string, updates: Partial<OtherAccount>) => {
    setOtherAccounts(otherAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeOtherAccount = (id: string) => {
    setOtherAccounts(otherAccounts.filter((a) => a.id !== id));
  };

  const addChild = () => {
    setChildren([
      ...children,
      {
        id: `child-${Date.now()}`,
        name: 'Child',
        birthYear: new Date().getFullYear(),
        collegeStartAge: 18,
        collegeYears: 4,
        annualCollegeCost: 30000,
      },
    ]);
  };

  const updateChild = (id: string, updates: Partial<Child>) => {
    setChildren(children.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeChild = (id: string) => {
    setChildren(children.filter((c) => c.id !== id));
  };

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: `milestone-${Date.now()}`,
        name: 'Financial Goal',
        type: 'custom',
        criteria: 'net_worth_above',
        targetValue: 1000000,
      },
    ]);
  };

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    setMilestones(milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const addDebt = () => {
    setDebts([
      ...debts,
      {
        id: `debt-${Date.now()}`,
        name: 'Debt',
        type: 'other',
        currentBalance: 0,
        interestRate: 5.0,
        minimumPayment: 0,
      },
    ]);
  };

  const updateDebt = (id: string, updates: Partial<Debt>) => {
    setDebts(debts.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const removeDebt = (id: string) => {
    setDebts(debts.filter((d) => d.id !== id));
  };

  const addAsset = () => {
    setAssets([
      ...assets,
      {
        id: `asset-${Date.now()}`,
        name: 'Asset',
        type: 'other',
        currentValue: 0,
        appreciationRate: 3.0,
      },
    ]);
  };

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    setAssets(assets.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
  };

  const handleApply = () => {
    onUpdate({
      employment: {
        ...profile.employment,
        servicePeriods,
        nonFederalPeriods,
        sickLeaveHours,
        currentOrLastSalary: federalSalary,
      },
      retirement: {
        ...profile.retirement,
        leaveServiceAge,
        intendedRetirementAge: claimPensionAge,
        enableBaristaFire,
        partTimeIncomeAnnual: partTimeIncome,
        partTimeStartAge,
        partTimeEndAge,
      },
      tsp: {
        ...profile.tsp,
        returnAssumption: tspReturn,
        annualContribution: tspContribution,
        employerMatch: tspEmployerMatch,
      },
      assumptions: {
        ...profile.assumptions,
        tspDrawdownRate,
        annualLivingExpenses: annualExpenses,
      },
      personal: {
        ...profile.personal,
        spouseInfo: profile.personal.spouseInfo
          ? {
              ...profile.personal.spouseInfo,
              currentIncome: spouseIncome,
              retirementAge: spouseRetirementAge,
              retirementIncome: spouseRetirementIncome,
            }
          : undefined,
      },
      otherInvestments: {
        accounts: otherAccounts,
        totalBalance: otherAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0),
      },
      planning: {
        children,
        milestones,
        debts,
        assets,
        lifeEvents: profile.planning?.lifeEvents || [],
      },
    });

    // Close the sidebar after applying changes
    onToggle();
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'basics', label: 'Basics', icon: '⚙️' },
    { id: 'income', label: 'Income', icon: '💰' },
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'assets', label: 'Assets/Debts', icon: '🏠' },
  ];

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-50 bg-blue-600 text-white p-3 rounded-r-lg shadow-lg hover:bg-blue-700 transition-all ${
          isOpen ? 'left-[28rem]' : 'left-0'
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
        className={`fixed top-0 left-0 h-full w-[28rem] bg-white shadow-2xl z-40 transform transition-transform duration-300 overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Planning Controls</h2>
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basics' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Retirement Timeline</h3>

              <Card className="p-3 bg-blue-50 border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Flexible Retirement:</strong> Set when you leave federal service vs when you claim your pension. Model early retirement with savings!
                </p>
              </Card>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Leave Federal Service at Age: {leaveServiceAge}
                </label>
                <input
                  type="range"
                  min="40"
                  max="70"
                  value={leaveServiceAge}
                  onChange={(e) => setLeaveServiceAge(parseInt(e.target.value) || 40)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>40 (Early)</span>
                  <span>70 (Late)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Claim Pension at Age: {claimPensionAge}
                </label>
                <input
                  type="range"
                  min={Math.max(55, leaveServiceAge)}
                  max="70"
                  value={claimPensionAge}
                  onChange={(e) => setClaimPensionAge(parseInt(e.target.value) || 55)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Min: {Math.max(55, leaveServiceAge)}</span>
                  <span>70</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Annual Living Expenses: {formatCurrency(annualExpenses, 0)}
                </label>
                <input
                  type="range"
                  min="20000"
                  max="200000"
                  step="5000"
                  value={annualExpenses}
                  onChange={(e) => setAnnualExpenses(parseInt(e.target.value) || 20000)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

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
                  <span>2% (Conservative)</span>
                  <span>4% (Standard)</span>
                  <span>10% (Aggressive)</span>
                </div>
              </div>

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
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Sick Leave Hours: {sickLeaveHours}
                </label>
                <input
                  type="number"
                  value={sickLeaveHours}
                  onChange={(e) => setSickLeaveHours(parseInt(e.target.value) || 0)}
                  min={0}
                  step={10}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ~2,087 hours = 1 year service credit
                </p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Service History</h4>
                <div className="space-y-2 mb-2">
                  {servicePeriods.map((period, index) => (
                    <Card key={period.id} className="p-2 bg-gray-50 text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium">Period {index + 1}</span>
                        {servicePeriods.length > 1 && (
                          <button
                            onClick={() => removeServicePeriod(period.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="date"
                          value={period.startDate.toISOString().split('T')[0]}
                          onChange={(e) =>
                            updateServicePeriod(period.id, {
                              startDate: new Date(e.target.value),
                            })
                          }
                          className="px-2 py-1 border rounded"
                        />
                        <input
                          type="date"
                          value={period.endDate?.toISOString().split('T')[0] || ''}
                          onChange={(e) =>
                            updateServicePeriod(period.id, {
                              endDate: e.target.value ? new Date(e.target.value) : undefined,
                            })
                          }
                          disabled={period.isActive}
                          className="px-2 py-1 border rounded disabled:bg-gray-200"
                        />
                      </div>
                      <label className="flex items-center gap-1 mt-1">
                        <input
                          type="checkbox"
                          checked={period.isActive}
                          onChange={(e) =>
                            updateServicePeriod(period.id, {
                              isActive: e.target.checked,
                            })
                          }
                          className="w-3 h-3"
                        />
                        <span className="text-xs">Currently employed</span>
                      </label>
                    </Card>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={addServicePeriod}
                  className="w-full text-xs"
                  size="sm"
                >
                  + Add Federal Service Period
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Non-Federal Employment</h4>
                <p className="text-xs text-gray-500 mb-2">
                  Track private sector jobs between federal service periods
                </p>
                <div className="space-y-2 mb-2">
                  {nonFederalPeriods.map((period, index) => (
                    <Card key={period.id} className="p-2 bg-blue-50 text-xs">
                      <div className="flex justify-between items-start mb-2">
                        <input
                          type="text"
                          placeholder="Employer name"
                          value={period.employerName || ''}
                          onChange={(e) =>
                            updateNonFederalPeriod(period.id, {
                              employerName: e.target.value,
                            })
                          }
                          className="font-medium bg-transparent border-b border-transparent hover:border-gray-300 text-xs flex-1 mr-2"
                        />
                        <button
                          onClick={() => removeNonFederalPeriod(period.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mb-1">
                        <input
                          type="date"
                          value={period.startDate.toISOString().split('T')[0]}
                          onChange={(e) =>
                            updateNonFederalPeriod(period.id, {
                              startDate: new Date(e.target.value),
                            })
                          }
                          className="px-2 py-1 border rounded"
                        />
                        <input
                          type="date"
                          value={period.endDate?.toISOString().split('T')[0] || ''}
                          onChange={(e) =>
                            updateNonFederalPeriod(period.id, {
                              endDate: e.target.value ? new Date(e.target.value) : undefined,
                            })
                          }
                          disabled={period.isActive}
                          className="px-2 py-1 border rounded disabled:bg-gray-200"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1 mb-1">
                        <input
                          type="number"
                          placeholder="Salary"
                          value={period.annualSalary || ''}
                          onChange={(e) =>
                            updateNonFederalPeriod(period.id, {
                              annualSalary: parseInt(e.target.value) || 0,
                            })
                          }
                          className="px-2 py-1 border rounded text-xs"
                        />
                        <input
                          type="number"
                          placeholder="401k contrib"
                          value={period.annual401kContribution || ''}
                          onChange={(e) =>
                            updateNonFederalPeriod(period.id, {
                              annual401kContribution: parseInt(e.target.value) || 0,
                            })
                          }
                          className="px-2 py-1 border rounded text-xs"
                        />
                      </div>
                      <label className="flex items-center gap-1 mt-1">
                        <input
                          type="checkbox"
                          checked={period.isActive}
                          onChange={(e) =>
                            updateNonFederalPeriod(period.id, {
                              isActive: e.target.checked,
                            })
                          }
                          className="w-3 h-3"
                        />
                        <span className="text-xs">Currently employed here</span>
                      </label>
                    </Card>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={addNonFederalPeriod}
                  className="w-full text-xs"
                  size="sm"
                >
                  + Add Non-Federal Job
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Other Investments</h4>
                <div className="space-y-2 mb-2">
                  {otherAccounts.map((account) => (
                    <Card key={account.id} className="p-2 bg-gray-50 text-xs">
                      <div className="flex justify-between mb-1">
                        <input
                          type="text"
                          value={account.name}
                          onChange={(e) =>
                            updateOtherAccount(account.id, { name: e.target.value })
                          }
                          className="font-medium bg-transparent border-b border-transparent hover:border-gray-300 text-xs w-32"
                        />
                        <button
                          onClick={() => removeOtherAccount(account.id)}
                          className="text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <select
                          value={account.type}
                          onChange={(e) =>
                            updateOtherAccount(account.id, {
                              type: e.target.value as OtherAccountType,
                            })
                          }
                          className="px-1 py-1 border rounded text-xs"
                        >
                          <option value="traditional_ira">Trad IRA</option>
                          <option value="roth_ira">Roth IRA</option>
                          <option value="401k">401(k)</option>
                          <option value="brokerage">Brokerage</option>
                          <option value="savings">Savings</option>
                          <option value="real_estate">Real Estate</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="number"
                          value={account.currentBalance}
                          onChange={(e) =>
                            updateOtherAccount(account.id, {
                              currentBalance: parseInt(e.target.value) || 0,
                            })
                          }
                          className="px-1 py-1 border rounded text-xs"
                          placeholder="Balance"
                        />
                      </div>
                    </Card>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={addOtherAccount}
                  className="w-full text-xs"
                  size="sm"
                >
                  + Add Account
                </Button>
                {otherAccounts.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Total: {formatCurrency(otherAccounts.reduce((sum, a) => sum + a.currentBalance, 0))}
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'income' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Income Sources</h3>

              {/* Federal Employment Income */}
              <div className="pb-4 border-b">
                <h4 className="font-medium mb-3">Your Federal Employment</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Current Annual Salary: {formatCurrency(federalSalary, 0)}
                    </label>
                    <input
                      type="range"
                      min="30000"
                      max="250000"
                      step="5000"
                      value={federalSalary}
                      onChange={(e) => setFederalSalary(parseInt(e.target.value) || 100000)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      TSP Annual Contribution: {formatCurrency(tspContribution, 0)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30000"
                      step="500"
                      value={tspContribution}
                      onChange={(e) => setTspContribution(parseInt(e.target.value) || 0)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {((tspContribution / federalSalary) * 100).toFixed(1)}% of salary
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Employer Match: {tspEmployerMatch}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={tspEmployerMatch}
                      onChange={(e) => setTspEmployerMatch(parseFloat(e.target.value) || 5)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Employer contributes: {formatCurrency((federalSalary * tspEmployerMatch) / 100, 0)}/year
                    </div>
                  </div>
                </div>
              </div>

              {profile.personal.spouseInfo && (
                <div className="pb-4 border-b">
                  <h4 className="font-medium mb-3">Spouse/Partner</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Current Income: {formatCurrency(spouseIncome, 0)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="200000"
                        step="5000"
                        value={spouseIncome}
                        onChange={(e) => setSpouseIncome(parseInt(e.target.value) || 0)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Retirement Age: {spouseRetirementAge}
                      </label>
                      <input
                        type="range"
                        min="55"
                        max="70"
                        value={spouseRetirementAge}
                        onChange={(e) => setSpouseRetirementAge(parseInt(e.target.value) || 55)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Retirement Income: {formatCurrency(spouseRetirementIncome, 0)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="5000"
                        value={spouseRetirementIncome}
                        onChange={(e) => setSpouseRetirementIncome(parseInt(e.target.value) || 0)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={enableBaristaFire}
                    onChange={(e) => setEnableBaristaFire(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Part-Time Work (Barista FIRE)</div>
                    <div className="text-xs text-gray-500">
                      Work part-time between leaving service and claiming pension
                    </div>
                  </div>
                </label>

                {enableBaristaFire && (
                  <div className="space-y-3 pl-6 border-l-2 border-blue-200">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Annual Income: {formatCurrency(partTimeIncome, 0)}
                      </label>
                      <input
                        type="range"
                        min="10000"
                        max="80000"
                        step="5000"
                        value={partTimeIncome}
                        onChange={(e) => setPartTimeIncome(parseInt(e.target.value) || 10000)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Start at Age: {partTimeStartAge}
                      </label>
                      <input
                        type="range"
                        min={leaveServiceAge}
                        max={claimPensionAge}
                        value={partTimeStartAge}
                        onChange={(e) => setPartTimeStartAge(parseInt(e.target.value) || leaveServiceAge)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        End at Age: {partTimeEndAge}
                      </label>
                      <input
                        type="range"
                        min={partTimeStartAge}
                        max={claimPensionAge}
                        value={partTimeEndAge}
                        onChange={(e) => setPartTimeEndAge(parseInt(e.target.value) || claimPensionAge)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'family' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Children & College</h3>
              <div className="space-y-2">
                {children.map((child) => (
                  <Card key={child.id} className="p-3 bg-gray-50">
                    <div className="flex justify-between mb-2">
                      <input
                        type="text"
                        value={child.name}
                        onChange={(e) => updateChild(child.id, { name: e.target.value })}
                        className="font-medium bg-transparent border-b border-transparent hover:border-gray-300"
                      />
                      <button
                        onClick={() => removeChild(child.id)}
                        className="text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <label className="block text-xs mb-1">Birth Year</label>
                        <input
                          type="number"
                          value={child.birthYear}
                          onChange={(e) =>
                            updateChild(child.id, { birthYear: parseInt(e.target.value) || new Date().getFullYear() })
                          }
                          className="w-full px-2 py-1 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">College Cost/Year</label>
                        <input
                          type="number"
                          value={child.annualCollegeCost || 0}
                          onChange={(e) =>
                            updateChild(child.id, {
                              annualCollegeCost: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 border rounded"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="outline" onClick={addChild} className="w-full" size="sm">
                  + Add Child
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Financial Milestones</h3>
              <div className="space-y-2">
                {milestones.map((milestone) => (
                  <Card key={milestone.id} className="p-3 bg-gray-50">
                    <div className="flex justify-between mb-2">
                      <input
                        type="text"
                        value={milestone.name}
                        onChange={(e) =>
                          updateMilestone(milestone.id, { name: e.target.value })
                        }
                        className="font-medium bg-transparent border-b border-transparent hover:border-gray-300"
                      />
                      <button
                        onClick={() => removeMilestone(milestone.id)}
                        className="text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <select
                        value={milestone.type}
                        onChange={(e) =>
                          updateMilestone(milestone.id, {
                            type: e.target.value as MilestoneType,
                          })
                        }
                        className="w-full px-2 py-1 border rounded text-xs"
                      >
                        <option value="financial_independence">Financial Independence</option>
                        <option value="net_worth_target">Net Worth Target</option>
                        <option value="debt_free">Debt Free</option>
                        <option value="custom">Custom</option>
                      </select>
                      <input
                        type="number"
                        value={milestone.targetValue || 0}
                        onChange={(e) =>
                          updateMilestone(milestone.id, {
                            targetValue: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                        placeholder="Target Value"
                      />
                    </div>
                  </Card>
                ))}
                <Button variant="outline" onClick={addMilestone} className="w-full" size="sm">
                  + Add Milestone
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Debts & Assets</h3>

              <div>
                <h4 className="font-medium mb-2 text-red-700">Debts</h4>
                <div className="space-y-2">
                  {debts.map((debt) => (
                    <Card key={debt.id} className="p-2 bg-red-50 border-red-200">
                      <div className="flex justify-between mb-1">
                        <input
                          type="text"
                          value={debt.name}
                          onChange={(e) => updateDebt(debt.id, { name: e.target.value })}
                          className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 w-24"
                        />
                        <button
                          onClick={() => removeDebt(debt.id)}
                          className="text-red-600 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          value={debt.currentBalance}
                          onChange={(e) =>
                            updateDebt(debt.id, {
                              currentBalance: parseInt(e.target.value) || 0,
                            })
                          }
                          className="px-2 py-1 border rounded text-xs"
                          placeholder="Balance"
                        />
                        <input
                          type="number"
                          value={debt.interestRate}
                          onChange={(e) =>
                            updateDebt(debt.id, {
                              interestRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="px-2 py-1 border rounded text-xs"
                          placeholder="Rate %"
                        />
                      </div>
                    </Card>
                  ))}
                  <Button variant="outline" onClick={addDebt} className="w-full text-xs" size="sm">
                    + Add Debt
                  </Button>
                  {debts.length > 0 && (
                    <p className="text-xs text-red-700 font-medium">
                      Total: {formatCurrency(debts.reduce((sum, d) => sum + d.currentBalance, 0))}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2 text-green-700">Assets</h4>
                <div className="space-y-2">
                  {assets.map((asset) => (
                    <Card key={asset.id} className="p-2 bg-green-50 border-green-200">
                      <div className="flex justify-between mb-1">
                        <input
                          type="text"
                          value={asset.name}
                          onChange={(e) => updateAsset(asset.id, { name: e.target.value })}
                          className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 w-24"
                        />
                        <button
                          onClick={() => removeAsset(asset.id)}
                          className="text-red-600 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          value={asset.currentValue}
                          onChange={(e) =>
                            updateAsset(asset.id, {
                              currentValue: parseInt(e.target.value) || 0,
                            })
                          }
                          className="px-2 py-1 border rounded text-xs"
                          placeholder="Value"
                        />
                        <input
                          type="number"
                          value={asset.appreciationRate || 0}
                          onChange={(e) =>
                            updateAsset(asset.id, {
                              appreciationRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="px-2 py-1 border rounded text-xs"
                          placeholder="Growth %"
                        />
                      </div>
                    </Card>
                  ))}
                  <Button variant="outline" onClick={addAsset} className="w-full text-xs" size="sm">
                    + Add Asset
                  </Button>
                  {assets.length > 0 && (
                    <p className="text-xs text-green-700 font-medium">
                      Total: {formatCurrency(assets.reduce((sum, a) => sum + a.currentValue, 0))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50">
          <Button onClick={handleApply} className="w-full">
            Apply Changes
          </Button>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-30" onClick={onToggle} />
      )}
    </>
  );
}
