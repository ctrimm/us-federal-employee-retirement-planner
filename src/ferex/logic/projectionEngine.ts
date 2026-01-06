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

  // Determine retirement age
  const retirementAge =
    profile.retirement.intendedRetirementAge ||
    determineEligibility(profile).earliestRetirementAge;

  // Determine end age
  const lifeExpectancy =
    profile.personal.lifeExpectancy ||
    DEFAULT_LIFE_EXPECTANCY;

  const endAge =
    profile.retirement.projectionEndAge ||
    lifeExpectancy;

  // Calculate base pension
  const pensionInfo = calculateAnnualPension(profile);
  const basePension = pensionInfo.annualPension;

  // Calculate TSP at retirement
  const yearsUntilRetirement = Math.max(0, retirementAge - currentAge);
  let tspBalance = profile.tsp.currentBalance;

  // Project TSP growth until retirement
  for (let i = 0; i < yearsUntilRetirement; i++) {
    tspBalance += profile.tsp.annualContribution;
    tspBalance *= (1 + profile.tsp.returnAssumption / 100);
  }

  // Determine TSP drawdown rate
  const drawdownRate = profile.assumptions.tspDrawdownRate || 4;

  // Generate year-by-year projections
  let cumulativeSavings = 0;

  for (let age = retirementAge; age <= endAge; age++) {
    const year = profile.personal.birthYear + age;
    const yearsFromRetirement = age - retirementAge;

    // Calculate pension with COLA
    const pension = calculatePensionWithCOLA(
      basePension,
      yearsFromRetirement,
      profile.assumptions.colaRate
    );

    // Calculate TSP distribution
    const tspDistribution = calculateTSPDistribution(tspBalance, drawdownRate);

    // Calculate TSP balance for next year
    tspBalance = calculateTSPBalanceAfterYear(
      tspBalance,
      tspDistribution,
      profile.tsp.returnAssumption
    );

    // Estimate Social Security
    const socialSecurity = estimateSocialSecurity(pensionInfo.high3, age);

    // Calculate FEHB cost
    const fehbCost = calculateAnnualFEHBCost(
      profile.assumptions.fehbCoverageLevel,
      age,
      yearsFromRetirement,
      profile.assumptions.healthcareInflation
    );

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

    // Total income
    const totalIncome = pension + tspDistribution + socialSecurity + otherIncome;

    // Net income (after healthcare, before taxes)
    // Rough tax estimate: 15% effective rate
    const estimatedTaxes = totalIncome * 0.15;
    const netIncome = totalIncome - fehbCost - estimatedTaxes;

    // Cumulative savings
    cumulativeSavings += netIncome;

    projections.push({
      age,
      year,
      pension,
      tspDistribution,
      socialSecurity,
      otherIncome,
      fehbCost,
      totalIncome,
      netIncome,
      tspBalance: Math.max(0, tspBalance),
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
