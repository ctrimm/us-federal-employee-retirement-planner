/**
 * Main Retirement Projection Engine
 * Generates year-by-year projections combining pension, TSP, FEHB, and other income
 */

import type {
  UserProfile,
  ProjectionYear,
  EligibilityInfo,
  PensionBreakdown,
} from '../types';
import { DEFAULT_LIFE_EXPECTANCY } from '../types';
import { calculateAnnualPension, calculatePensionWithCOLA } from './pensionCalculator';
import { calculateTSPBalanceAfterYear, calculateTSPDistribution } from './tspCalculator';
import { calculateAnnualFEHBCost } from './fehbCalculator';
import {
  calculateTotalService,
  calculateMRA,
  canRetireNow,
  calculateEarliestRetirementAge,
  isFEHBEligible,
  calculateServiceBySystem,
} from './systemDetection';

/**
 * Determine eligibility information for a user profile
 */
export function determineEligibility(profile: UserProfile): EligibilityInfo {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - profile.personal.birthYear;
  const sickLeaveCredit = (profile.employment.sickLeaveHours || 0) / 2087;
  const totalYears = calculateTotalService(profile.employment.servicePeriods) + sickLeaveCredit;
  const mra = calculateMRA(profile.personal.birthYear);

  const { fersYears, csrsYears } = calculateServiceBySystem(
    profile.employment.servicePeriods,
    profile.employment.sickLeaveHours || 0
  );

  const canRetire = canRetireNow(currentAge, totalYears, profile.personal.birthYear);

  const earliestInfo = calculateEarliestRetirementAge(
    profile.personal.birthYear,
    profile.employment.servicePeriods
  );

  // Calculate earliest retirement date
  const earliestRetirementDate = new Date(
    profile.personal.birthYear + earliestInfo.age,
    0,
    1
  );

  // Full benefits age (typically 62 with 5+ years for FERS)
  const fullBenefitsAge = 62;
  const fullBenefitsDate = new Date(
    profile.personal.birthYear + fullBenefitsAge,
    0,
    1
  );

  // Determine primary system
  let detectedSystem: 'FERS' | 'CSRS' | 'auto' = 'auto';
  if (fersYears > 0 && csrsYears === 0) detectedSystem = 'FERS';
  else if (csrsYears > 0 && fersYears === 0) detectedSystem = 'CSRS';
  else if (fersYears > csrsYears) detectedSystem = 'FERS';
  else if (csrsYears > 0) detectedSystem = 'CSRS';

  return {
    canRetireImmediately: canRetire,
    earliestRetirementAge: earliestInfo.age,
    earliestRetirementDate,
    fullBenefitsAge,
    fullBenefitsDate,
    fehbEligible: isFEHBEligible(currentAge, totalYears),
    totalYearsOfService: totalYears,
    detectedSystem,
  };
}

/**
 * Calculate Social Security estimate (rough)
 * This is a simplified estimate - actual SS calculations are complex
 */
function estimateSocialSecurity(
  high3: number,
  age: number
): number {
  // Social Security starts at age 67 for most current workers
  if (age < 67) return 0;

  // Very rough estimate: ~40% of average indexed earnings
  // For federal employees, this is often lower due to WEP/GPO
  // Using conservative estimate of 30% for FERS employees

  const monthlyEstimate = (high3 / 12) * 0.30;
  return monthlyEstimate * 12;
}

/**
 * Generate year-by-year retirement projections
 */
export function generateProjections(profile: UserProfile): ProjectionYear[] {
  const projections: ProjectionYear[] = [];

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - profile.personal.birthYear;

  // Determine when leaving service vs claiming pension
  const leaveServiceAge = profile.retirement.leaveServiceAge || profile.retirement.intendedRetirementAge || determineEligibility(profile).earliestRetirementAge;
  const claimPensionAge = profile.retirement.intendedRetirementAge || leaveServiceAge;

  // Determine end age
  const lifeExpectancy = profile.personal.lifeExpectancy || DEFAULT_LIFE_EXPECTANCY;
  const endAge = profile.retirement.projectionEndAge || lifeExpectancy;

  // Start from current age to show full picture
  const startAge = currentAge;

  // Calculate base pension (will only apply from claimPensionAge)
  const pensionInfo = calculateAnnualPension(profile);
  const basePension = pensionInfo.annualPension;

  // Initialize TSP balance
  let tspBalance = profile.tsp.currentBalance;

  // Initialize other investments tracking
  let otherInvestmentsBalance = profile.otherInvestments?.totalBalance || 0;

  // Initialize debts (deep copy to avoid mutating original)
  const debts = (profile.planning?.debts || []).map(d => ({ ...d }));

  // Initialize assets (deep copy)
  const assets = (profile.planning?.assets || []).map(a => ({ ...a }));

  // Spouse info
  const spouseAge = profile.personal.spouseInfo ? currentAge + (profile.personal.spouseInfo.age - currentAge) : 0;
  const spouseRetirementAge = profile.personal.spouseInfo?.retirementAge || 65;
  const spouseCurrentIncome = profile.personal.spouseInfo?.currentIncome || 0;
  const spouseRetirementIncome = profile.personal.spouseInfo?.retirementIncome || 0;

  // Annual living expenses
  const annualLivingExpenses = profile.assumptions.annualLivingExpenses || 60000;

  // Determine TSP drawdown rate
  const drawdownRate = profile.assumptions.tspDrawdownRate || 4;

  // Generate year-by-year projections
  let cumulativeSavings = 0;

  for (let age = startAge; age <= endAge; age++) {
    const year = profile.personal.birthYear + age;
    const stillWorking = age < leaveServiceAge;
    const hasPension = age >= claimPensionAge;
    const yearsFromPension = age - claimPensionAge;

    // TSP contributions while still working
    if (stillWorking && age < leaveServiceAge) {
      tspBalance += profile.tsp.annualContribution;
      tspBalance *= (1 + profile.tsp.returnAssumption / 100);
    }

    // Calculate pension with COLA (only if claiming)
    const pension = hasPension ? calculatePensionWithCOLA(
      basePension,
      Math.max(0, yearsFromPension),
      profile.assumptions.colaRate
    ) : 0;

    // Calculate TSP distribution (only after leaving service)
    const tspDistribution = stillWorking ? 0 : calculateTSPDistribution(tspBalance, drawdownRate);

    // Calculate TSP balance for next year (growth happens regardless)
    if (!stillWorking) {
      tspBalance = calculateTSPBalanceAfterYear(
        tspBalance,
        tspDistribution,
        profile.tsp.returnAssumption
      );
    }

    // Estimate Social Security
    const socialSecurity = estimateSocialSecurity(pensionInfo.high3, age);

    // Calculate FEHB cost (only after leaving service)
    const fehbCost = stillWorking ? 0 : calculateAnnualFEHBCost(
      profile.assumptions.fehbCoverageLevel,
      age,
      Math.max(0, age - leaveServiceAge),
      profile.assumptions.healthcareInflation
    );

    // Calculate spouse income
    let spouseIncome = 0;
    if (profile.personal.spouseInfo) {
      const currentSpouseAge = spouseAge + (age - currentAge);
      if (currentSpouseAge < spouseRetirementAge) {
        spouseIncome = spouseCurrentIncome;
      } else {
        spouseIncome = spouseRetirementIncome;
      }
    }

    // Other income - Barista FIRE part-time work
    let otherIncome = 0;
    if (profile.retirement.enableBaristaFire &&
        profile.retirement.partTimeIncomeAnnual &&
        profile.retirement.partTimeStartAge &&
        profile.retirement.partTimeEndAge) {
      const partTimeStart = profile.retirement.partTimeStartAge;
      const partTimeEnd = profile.retirement.partTimeEndAge;

      if (age >= partTimeStart && age <= partTimeEnd) {
        otherIncome = profile.retirement.partTimeIncomeAnnual;
      }
    }

    // Calculate other investments growth
    const otherAccountsGrowth = (profile.otherInvestments?.accounts || []).reduce((total, account) => {
      return total + (otherInvestmentsBalance * (account.returnAssumption || 6.5) / 100);
    }, 0) / Math.max(1, (profile.otherInvestments?.accounts || []).length);

    otherInvestmentsBalance = otherInvestmentsBalance * (1 + (otherAccountsGrowth / otherInvestmentsBalance || 0));

    // Calculate total expenses (living expenses only apply after leaving service)
    let totalExpenses = stillWorking ? 0 : (annualLivingExpenses + fehbCost);

    // Add college costs for children
    (profile.planning?.children || []).forEach(child => {
      const childAge = year - child.birthYear;
      const collegeStart = child.collegeStartAge || 18;
      const collegeEnd = collegeStart + (child.collegeYears || 4);

      if (childAge >= collegeStart && childAge < collegeEnd) {
        totalExpenses += child.annualCollegeCost || 0;
      }
    });

    // Add life events costs
    (profile.planning?.lifeEvents || []).forEach(event => {
      if (event.year === year) {
        if (!event.recurring) {
          totalExpenses += event.amount || 0;
        }
      }
      // Handle recurring events
      if (event.recurring && event.duration) {
        if (year >= event.year && year < event.year + event.duration) {
          totalExpenses += event.amount || 0;
        }
      }
    });

    // Calculate debt payments and update balances
    let totalDebtPayments = 0;
    debts.forEach(debt => {
      if (debt.currentBalance > 0) {
        const interestCharge = debt.currentBalance * (debt.interestRate / 100);
        const payment = debt.minimumPayment + (debt.extraPayment || 0);
        totalDebtPayments += payment;
        debt.currentBalance = Math.max(0, debt.currentBalance + interestCharge - payment);
      }
    });
    totalExpenses += totalDebtPayments;

    // Update asset values with appreciation
    let totalAssetValue = 0;
    assets.forEach(asset => {
      asset.currentValue *= (1 + (asset.appreciationRate || 0) / 100);
      totalAssetValue += asset.currentValue;
    });

    // Calculate total debt
    const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);

    // Total income
    const totalIncome = pension + tspDistribution + socialSecurity + spouseIncome + otherIncome;

    // Net income (after expenses and taxes)
    // Rough tax estimate: 15% effective rate
    const estimatedTaxes = totalIncome * 0.15;
    const netIncome = totalIncome - totalExpenses - estimatedTaxes;

    // Calculate net worth
    const netWorth = tspBalance + otherInvestmentsBalance + totalAssetValue - totalDebt;
    const liquidNetWorth = tspBalance + otherInvestmentsBalance - totalDebt;

    // Cumulative savings
    cumulativeSavings += netIncome;

    projections.push({
      age,
      year,
      pension,
      tspDistribution,
      socialSecurity,
      otherIncome,
      spouseIncome,
      fehbCost,
      totalIncome,
      expenses: totalExpenses,
      netIncome,
      tspBalance: Math.max(0, tspBalance),
      otherInvestmentsBalance: Math.max(0, otherInvestmentsBalance),
      totalDebt,
      totalAssets: totalAssetValue,
      netWorth,
      liquidNetWorth,
      cumulativeSavings,
    });
  }

  return projections;
}

/**
 * Get pension breakdown for display
 */
export function getPensionBreakdown(profile: UserProfile): PensionBreakdown {
  return calculateAnnualPension(profile);
}

/**
 * Calculate summary statistics for a scenario
 */
export function calculateSummaryStats(projections: ProjectionYear[]) {
  if (projections.length === 0) {
    return {
      totalLifetimeIncome: 0,
      averageAnnualIncome: 0,
      tspDepletionAge: null,
      finalTSPBalance: 0,
    };
  }

  const totalLifetimeIncome = projections.reduce(
    (sum, p) => sum + p.totalIncome,
    0
  );

  const averageAnnualIncome = totalLifetimeIncome / projections.length;

  // Find when TSP runs out
  let tspDepletionAge = null;
  for (const projection of projections) {
    if (projection.tspBalance === 0 && tspDepletionAge === null) {
      tspDepletionAge = projection.age;
      break;
    }
  }

  const finalTSPBalance = projections[projections.length - 1]?.tspBalance || 0;

  return {
    totalLifetimeIncome,
    averageAnnualIncome,
    tspDepletionAge,
    finalTSPBalance,
  };
}
