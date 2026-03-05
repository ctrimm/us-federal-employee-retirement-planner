/**
 * Pension Calculation Logic
 * Handles FERS and CSRS benefit calculations
 */

import type {
  UserProfile,
  ServicePeriod,
  PensionBreakdown,
} from '../types';
import {
  FERS_ACCRUAL_RATE,
  CSRS_ACCRUAL_RATES,
  SURVIVOR_ANNUITY_REDUCTION,
} from '../types';
import { calculateServiceBySystem, detectRetirementSystem } from './systemDetection';

/**
 * Calculate High-3 average salary
 */
export function calculateHigh3(profile: UserProfile): number {
  // If user provided override, use that
  if (profile.employment.high3Override) {
    return profile.employment.high3Override;
  }

  // If user provided last 3 years, calculate average
  if (profile.employment.lastHighThreeYears) {
    const { year1, year2, year3 } = profile.employment.lastHighThreeYears;
    return (year1 + year2 + year3) / 3;
  }

  // Otherwise, use current/last salary as estimate
  // (In reality, High-3 is often slightly higher than current due to raises)
  return profile.employment.currentOrLastSalary;
}

/**
 * Calculate FERS annual pension
 */
export function calculateFERSPension(
  high3: number,
  yearsOfService: number,
  survivorAnnuityType: string
): number {
  // Basic FERS calculation: 1% × High-3 × Years
  let annualPension = high3 * FERS_ACCRUAL_RATE * yearsOfService;

  // Apply survivor annuity reduction if elected
  if (survivorAnnuityType === 'standard' || survivorAnnuityType === 'courtOrdered') {
    const reduction = SURVIVOR_ANNUITY_REDUCTION.standard;
    annualPension *= (1 - reduction);
  }

  return annualPension;
}

/**
 * Calculate CSRS annual pension
 * CSRS has tiered accrual rates:
 * - 1.5% for first 5 years
 * - 1.75% for years 6-10
 * - 2% for years beyond 10
 */
export function calculateCSRSPension(
  high3: number,
  yearsOfService: number,
  survivorAnnuityType: string
): number {
  let annualPension = 0;

  // First 5 years at 1.5%
  const first5 = Math.min(5, yearsOfService);
  annualPension += high3 * CSRS_ACCRUAL_RATES.first5Years * first5;

  // Years 6-10 at 1.75%
  if (yearsOfService > 5) {
    const next5 = Math.min(5, yearsOfService - 5);
    annualPension += high3 * CSRS_ACCRUAL_RATES.next5Years * next5;
  }

  // Years beyond 10 at 2%
  if (yearsOfService > 10) {
    const beyond10 = yearsOfService - 10;
    annualPension += high3 * CSRS_ACCRUAL_RATES.beyond10Years * beyond10;
  }

  // Apply survivor annuity reduction if elected
  if (survivorAnnuityType === 'standard' || survivorAnnuityType === 'courtOrdered') {
    const reduction = SURVIVOR_ANNUITY_REDUCTION.standard;
    annualPension *= (1 - reduction);
  }

  return annualPension;
}

/**
 * Calculate annual pension for mixed FERS/CSRS service
 */
export function calculateMixedPension(
  high3: number,
  servicePeriods: ServicePeriod[],
  survivorAnnuityType: string
): number {
  const { fersYears, csrsYears } = calculateServiceBySystem(servicePeriods);

  let totalPension = 0;

  // Calculate FERS portion
  if (fersYears > 0) {
    totalPension += calculateFERSPension(high3, fersYears, 'none');
  }

  // Calculate CSRS portion
  if (csrsYears > 0) {
    totalPension += calculateCSRSPension(high3, csrsYears, 'none');
  }

  // Apply survivor annuity reduction to total
  if (survivorAnnuityType === 'standard' || survivorAnnuityType === 'courtOrdered') {
    const reduction = SURVIVOR_ANNUITY_REDUCTION.standard;
    totalPension *= (1 - reduction);
  }

  return totalPension;
}

/**
 * Main pension calculator - determines system and calculates pension
 */
export function calculateAnnualPension(profile: UserProfile): PensionBreakdown {
  const high3 = calculateHigh3(profile);
  const { fersYears, csrsYears, totalYears } = calculateServiceBySystem(
    profile.employment.servicePeriods,
    profile.employment.sickLeaveHours || 0
  );

  let annualPension: number;
  let accrualRate: number;

  // Determine primary system and calculate
  if (csrsYears > 0 && fersYears > 0) {
    // Mixed service
    annualPension = calculateMixedPension(
      high3,
      profile.employment.servicePeriods,
      profile.retirement.survivorAnnuityType
    );
    accrualRate = annualPension / (high3 * totalYears); // Effective rate
  } else if (csrsYears > 0) {
    // CSRS only
    annualPension = calculateCSRSPension(
      high3,
      csrsYears,
      profile.retirement.survivorAnnuityType
    );
    accrualRate = annualPension / (high3 * csrsYears);
  } else {
    // FERS only (most common)
    annualPension = calculateFERSPension(
      high3,
      fersYears,
      profile.retirement.survivorAnnuityType
    );
    accrualRate = FERS_ACCRUAL_RATE;
  }

  // Calculate survivor reduction amount
  const survivorReduction =
    profile.retirement.survivorAnnuityType !== 'none'
      ? SURVIVOR_ANNUITY_REDUCTION.standard
      : 0;

  return {
    high3,
    yearsOfService: totalYears,
    accrualRate,
    survivorReduction,
    annualPension,
    monthlyPension: annualPension / 12,
  };
}

/**
 * Calculate pension with COLA adjustments for a future year
 */
export function calculatePensionWithCOLA(
  basePension: number,
  yearsFromRetirement: number,
  colaRate: number
): number {
  return basePension * Math.pow(1 + colaRate / 100, yearsFromRetirement);
}

/**
 * Calculate survivor benefit amount (what spouse receives)
 */
export function calculateSurvivorBenefit(
  annualPension: number,
  survivorAnnuityType: string
): number {
  if (survivorAnnuityType === 'standard') {
    // Survivor typically receives 50% of the unreduced annuity
    // If the annuity was reduced by 10%, we need to calculate the unreduced amount first
    const unreducedPension = annualPension / (1 - SURVIVOR_ANNUITY_REDUCTION.standard);
    return unreducedPension * 0.5;
  }

  if (survivorAnnuityType === 'courtOrdered') {
    // Court-ordered can vary; default to similar calculation
    const unreducedPension = annualPension / (1 - SURVIVOR_ANNUITY_REDUCTION.courtOrdered);
    return unreducedPension * 0.5;
  }

  return 0;
}
