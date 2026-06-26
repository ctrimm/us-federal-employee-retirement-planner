/**
 * Pension Calculation Logic
 * Handles FERS and CSRS benefit calculations
 */

import type {
  UserProfile,
  ServicePeriod,
  SpouseInfo,
  PensionBreakdown,
} from '../types';
import {
  FERS_ACCRUAL_RATE,
  FERS_ENHANCED_ACCRUAL_RATE,
  FERS_SPECIAL_ACCRUAL_RATE,
  FERS_SPECIAL_FIRST_YEARS,
  CSRS_ACCRUAL_RATES,
  SURVIVOR_ANNUITY_REDUCTION,
  MRA_10_ANNUAL_REDUCTION,
} from '../types';
import { calculateServiceBySystem, calculateMRA, creditableServicePeriods, resolveSpecialYears } from './systemDetection';

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
 * Calculate FERS annual pension.
 * Enhanced 1.1% accrual applies when retiring at age 62+ with at least 20 years of service.
 */
export function calculateFERSPension(
  high3: number,
  yearsOfService: number,
  survivorAnnuityType: string,
  retirementAge?: number
): number {
  // Use 1.1% enhanced rate if retiring at 62+ with 20+ years; otherwise standard 1%
  const useEnhanced = retirementAge !== undefined && retirementAge >= 62 && yearsOfService >= 20;
  const accrualRate = useEnhanced ? FERS_ENHANCED_ACCRUAL_RATE : FERS_ACCRUAL_RATE;

  let annualPension = high3 * accrualRate * yearsOfService;

  // Apply survivor annuity reduction if elected
  if (survivorAnnuityType === 'standard' || survivorAnnuityType === 'courtOrdered') {
    const reduction = SURVIVOR_ANNUITY_REDUCTION.standard;
    annualPension *= (1 - reduction);
  }

  return annualPension;
}

/**
 * CSRS survivor-annuity cost: the annuitant's reduction is 2.5% of the first $3,600 of the
 * unreduced annuity plus 10% of the amount above $3,600 (returns the annual dollar reduction).
 */
export function csrsSurvivorReductionAmount(unreducedAnnual: number): number {
  if (unreducedAnnual <= 0) return 0;
  return 0.025 * Math.min(unreducedAnnual, 3600) + 0.10 * Math.max(0, unreducedAnnual - 3600);
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

  // Apply survivor annuity reduction if elected (CSRS uses the 2.5%/10% cost formula).
  if (survivorAnnuityType === 'standard' || survivorAnnuityType === 'courtOrdered') {
    annualPension -= csrsSurvivorReductionAmount(annualPension);
  }

  return annualPension;
}

/**
 * Calculate annual pension for mixed FERS/CSRS service
 */
export function calculateMixedPension(
  high3: number,
  servicePeriods: ServicePeriod[],
  survivorAnnuityType: string,
  retirementAge?: number
): number {
  const { fersYears, csrsYears } = calculateServiceBySystem(servicePeriods);

  let totalPension = 0;

  // Calculate FERS portion (enhanced rate applies only to FERS years portion)
  if (fersYears > 0) {
    totalPension += calculateFERSPension(high3, fersYears, 'none', retirementAge);
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
  // Include bought-back military service (if the deposit is paid) in creditable service.
  const creditablePeriods = creditableServicePeriods(profile.employment);
  const { fersYears, csrsYears, specialYears, totalYears } = calculateServiceBySystem(
    creditablePeriods,
    profile.employment.sickLeaveHours || 0
  );

  // Retirement age is used to determine whether the 1.1% enhanced FERS accrual applies
  const retirementAge = profile.retirement.intendedRetirementAge || profile.retirement.leaveServiceAge;

  // Resolve FERS years covered under special provisions (military buyback stays regular).
  const militaryCredit = profile.employment.militaryDepositPaid ? (profile.employment.militaryServiceYears || 0) : 0;
  const effSpecialYears = resolveSpecialYears(profile.employment, Math.max(0, fersYears - militaryCredit), specialYears);
  const regularFersYears = Math.max(0, fersYears - effSpecialYears);

  // ── Compute gross annual pension (before survivor reduction) ──────────────
  let annualPension = 0;
  // Special-provision portion: 1.7% for the first 20 covered years, 1.0% thereafter.
  if (effSpecialYears > 0) {
    annualPension += high3 * (
      FERS_SPECIAL_ACCRUAL_RATE * Math.min(effSpecialYears, FERS_SPECIAL_FIRST_YEARS) +
      FERS_ACCRUAL_RATE * Math.max(0, effSpecialYears - FERS_SPECIAL_FIRST_YEARS)
    );
  }
  // Regular FERS portion (1% or 1.1% enhanced), then CSRS portion.
  if (regularFersYears > 0) {
    annualPension += calculateFERSPension(high3, regularFersYears, 'none', retirementAge);
  }
  if (csrsYears > 0) {
    annualPension += calculateCSRSPension(high3, csrsYears, 'none');
  }
  const accrualRate = totalYears > 0 ? annualPension / (high3 * totalYears) : FERS_ACCRUAL_RATE;

  // ── MRA+10 early retirement reduction (regular FERS only) ─────────────────
  // Reduction = 5% per year under 62. NOT applied for an immediate full annuity (30+ yrs at
  // MRA, or 20+ yrs at 60), a VERA early-out, or a special-provision retirement (50/20 or 25).
  const veraEligible = profile.retirement.earlyOutVERA === true &&
    ((retirementAge !== undefined && retirementAge >= 50 && totalYears >= 20) || totalYears >= 25);
  const specialEligible = effSpecialYears > 0 &&
    ((retirementAge !== undefined && retirementAge >= 50 && effSpecialYears >= 20) || effSpecialYears >= 25);
  let mra10ReductionPercent = 0;
  if (fersYears > 0 && retirementAge !== undefined && !veraEligible && !specialEligible) {
    const leaveAge = profile.retirement.leaveServiceAge ?? retirementAge;
    const mra = calculateMRA(profile.personal.birthYear);
    const isImmediateFullAnnuity = fersYears >= 30 || (fersYears >= 20 && leaveAge >= 60);
    const isMRA10 = !isImmediateFullAnnuity && fersYears >= 10 && leaveAge >= mra && leaveAge < 62;

    if (isMRA10 && retirementAge < 62) {
      mra10ReductionPercent = Math.min((62 - retirementAge) * MRA_10_ANNUAL_REDUCTION, 1.0);
      annualPension *= (1 - mra10ReductionPercent);
    }
  }

  // ── Survivor reduction applied to the (post-age-reduction) annuity ────────
  // CSRS-only uses the 2.5%/10% cost formula; FERS/mixed/special use the flat 10%.
  let survivorReduction = 0;
  if (profile.retirement.survivorAnnuityType !== 'none') {
    if (csrsYears > 0 && fersYears === 0) {
      const redAmt = csrsSurvivorReductionAmount(annualPension);
      survivorReduction = annualPension > 0 ? redAmt / annualPension : 0;
      annualPension -= redAmt;
    } else {
      survivorReduction = SURVIVOR_ANNUITY_REDUCTION.standard;
      annualPension *= (1 - survivorReduction);
    }
  }

  return {
    high3,
    yearsOfService: totalYears,
    accrualRate,
    survivorReduction,
    annualPension,
    monthlyPension: annualPension / 12,
    mra10ReductionPercent: mra10ReductionPercent > 0 ? mra10ReductionPercent : undefined,
  };
}

/**
 * Calculate pension with COLA adjustments for a future year (system-agnostic, full COLA).
 * Retained for backward compatibility; prefer calculatePensionWithColaSchedule.
 */
export function calculatePensionWithCOLA(
  basePension: number,
  yearsFromRetirement: number,
  colaRate: number
): number {
  return basePension * Math.pow(1 + colaRate / 100, yearsFromRetirement);
}

/**
 * FERS "diet COLA": FERS retirees receive a reduced COLA versus CSRS/Social Security.
 *  - If CPI increase ≤ 2%  → full CPI
 *  - If CPI increase 2–3%  → 2%
 *  - If CPI increase > 3%   → CPI minus 1%
 * (CSRS receives the full CPI COLA.)
 */
export function fersDietCola(cpiRate: number): number {
  if (cpiRate <= 2) return cpiRate;
  if (cpiRate <= 3) return 2;
  return cpiRate - 1;
}

/**
 * Apply the correct COLA schedule to a pension for a given age.
 *
 * CSRS: full CPI COLA every year from the year the annuity begins.
 * FERS: the reduced "diet" COLA, and — critically — FERS retirees generally receive
 *       NO COLA until age 62 (special-provision retirees such as LEO/firefighter/ATC
 *       are the exception). COLAs are not paid retroactively for the pre-62 years.
 */
export function calculatePensionWithColaSchedule(
  basePension: number,
  system: 'FERS' | 'CSRS',
  currentAge: number,
  claimAge: number,
  cpiRate: number,
  isSpecialProvision: boolean = false
): number {
  if (system === 'CSRS') {
    const years = Math.max(0, currentAge - claimAge);
    return basePension * Math.pow(1 + cpiRate / 100, years);
  }

  // FERS: COLAs start at age 62 (unless a special-provision retiree)
  const colaStartAge = isSpecialProvision ? claimAge : Math.max(claimAge, 62);
  const years = Math.max(0, currentAge - colaStartAge);
  const fersRate = fersDietCola(cpiRate);
  return basePension * Math.pow(1 + fersRate / 100, years);
}

/**
 * Calculate the spouse's own annual federal pension (before COLA).
 * Used when the spouse is a federal employee with servicePeriods and high3Salary.
 * No survivor benefit reduction is applied here — this is the spouse's own benefit.
 */
export function calculateSpouseAnnualPension(spouse: SpouseInfo): number {
  if (!spouse.isFederalEmployee || !spouse.servicePeriods || !spouse.high3Salary) {
    return 0;
  }

  const { fersYears, csrsYears } = calculateServiceBySystem(
    spouse.servicePeriods,
    spouse.sickLeaveHours || 0
  );

  if (fersYears === 0 && csrsYears === 0) return 0;

  const spouseRetAge = spouse.retirementAge;

  // Mixed service
  if (fersYears > 0 && csrsYears > 0) {
    return calculateMixedPension(spouse.high3Salary, spouse.servicePeriods, 'none', spouseRetAge);
  }

  if (csrsYears > 0) {
    return calculateCSRSPension(spouse.high3Salary, csrsYears, 'none');
  }

  return calculateFERSPension(spouse.high3Salary, fersYears, 'none', spouseRetAge);
}

/**
 * Calculate survivor benefit amount (what the surviving spouse receives).
 * FERS: 50% of the unreduced annuity. CSRS: up to 55% of the unreduced annuity.
 */
export function calculateSurvivorBenefit(
  annualPension: number,
  survivorAnnuityType: string,
  system: 'FERS' | 'CSRS' = 'FERS'
): number {
  if (survivorAnnuityType !== 'standard' && survivorAnnuityType !== 'courtOrdered') return 0;

  const survivorShare = system === 'CSRS' ? 0.55 : 0.50;

  if (system === 'CSRS') {
    // Reconstruct the unreduced annuity from the post-reduction amount (2.5%/10% formula).
    // reduction = 0.025·min(U,3600) + 0.10·max(0,U-3600); for U>3600 this is a constant $90
    // plus 10% of (U-3600), so U = (annual + 90 - 360) / 0.9 = (annual - 270) / 0.9 when U>3600.
    const unreduced = annualPension > (3600 - csrsSurvivorReductionAmount(3600))
      ? (annualPension - 270) / 0.9
      : annualPension / 0.975;
    return Math.max(0, unreduced) * survivorShare;
  }

  const reduction = survivorAnnuityType === 'courtOrdered'
    ? SURVIVOR_ANNUITY_REDUCTION.courtOrdered
    : SURVIVOR_ANNUITY_REDUCTION.standard;
  const unreducedPension = annualPension / (1 - reduction);
  return unreducedPension * survivorShare;
}
