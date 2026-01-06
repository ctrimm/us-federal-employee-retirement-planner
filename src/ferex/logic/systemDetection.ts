/**
 * Retirement System Detection Logic
 * Determines FERS vs CSRS based on service history
 */

import type { ServicePeriod, RetirementSystem } from '../types';

const FERS_START_DATE = new Date('1984-01-01');

/**
 * Automatically detect retirement system based on start date
 */
export function detectRetirementSystem(startDate: Date): RetirementSystem {
  if (startDate < FERS_START_DATE) {
    return 'CSRS';
  }
  return 'FERS';
}

/**
 * Calculate total years of creditable service
 * Note: Service breaks typically don't count
 */
export function calculateTotalService(periods: ServicePeriod[]): number {
  let totalYears = 0;

  for (const period of periods) {
    const start = new Date(period.startDate);
    const end = period.endDate ? new Date(period.endDate) : new Date();

    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    totalYears += years;
  }

  return totalYears;
}

/**
 * Convert sick leave hours to service credit years
 * ~2,087 hours of sick leave = 1 year of service credit (40hrs/week * 52.14 weeks)
 */
export function calculateSickLeaveCredit(sickLeaveHours: number): number {
  const HOURS_PER_YEAR = 2087; // Standard work hours per year
  return sickLeaveHours / HOURS_PER_YEAR;
}

/**
 * Calculate total service including sick leave credit
 */
export function calculateTotalServiceWithSickLeave(
  periods: ServicePeriod[],
  sickLeaveHours: number = 0
): number {
  const baseService = calculateTotalService(periods);
  const sickLeaveCredit = calculateSickLeaveCredit(sickLeaveHours);
  return baseService + sickLeaveCredit;
}

/**
 * Calculate service years by system (for mixed FERS/CSRS careers)
 * Includes sick leave credit if provided
 */
export function calculateServiceBySystem(
  periods: ServicePeriod[],
  sickLeaveHours: number = 0
): {
  fersYears: number;
  csrsYears: number;
  totalYears: number;
  sickLeaveCredit: number;
} {
  let fersYears = 0;
  let csrsYears = 0;

  for (const period of periods) {
    const start = new Date(period.startDate);
    const end = period.endDate ? new Date(period.endDate) : new Date();
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const system = period.system === 'auto'
      ? detectRetirementSystem(start)
      : period.system;

    if (system === 'FERS') {
      fersYears += years;
    } else if (system === 'CSRS') {
      csrsYears += years;
    }
  }

  const sickLeaveCredit = calculateSickLeaveCredit(sickLeaveHours);

  // Add sick leave credit proportionally to the dominant system
  // Or if all FERS or all CSRS, add to that system
  if (fersYears > csrsYears) {
    fersYears += sickLeaveCredit;
  } else if (csrsYears > 0) {
    csrsYears += sickLeaveCredit;
  } else {
    // Default to FERS if no service (shouldn't happen)
    fersYears += sickLeaveCredit;
  }

  return {
    fersYears,
    csrsYears,
    totalYears: fersYears + csrsYears,
    sickLeaveCredit,
  };
}

/**
 * Determine Minimum Retirement Age (MRA) based on birth year
 */
export function calculateMRA(birthYear: number): number {
  if (birthYear < 1948) return 55;
  if (birthYear >= 1948 && birthYear <= 1952) return 55;
  if (birthYear >= 1953 && birthYear <= 1964) return 56;
  if (birthYear >= 1965 && birthYear <= 1969) return 56;
  return 57; // 1970 and later
}

/**
 * Check if employee can retire immediately
 */
export function canRetireNow(
  currentAge: number,
  totalYearsOfService: number,
  birthYear: number
): boolean {
  const mra = calculateMRA(birthYear);

  // Age 62 with 5+ years
  if (currentAge >= 62 && totalYearsOfService >= 5) return true;

  // Age 60 with 20+ years
  if (currentAge >= 60 && totalYearsOfService >= 20) return true;

  // MRA with 30+ years
  if (currentAge >= mra && totalYearsOfService >= 30) return true;

  // MRA with 10+ years (MRA+10)
  if (currentAge >= mra && totalYearsOfService >= 10) return true;

  return false;
}

/**
 * Calculate earliest retirement age
 */
export function calculateEarliestRetirementAge(
  birthYear: number,
  servicePeriods: ServicePeriod[]
): { age: number; yearsOfService: number } {
  const mra = calculateMRA(birthYear);
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear;

  // Calculate total years of service
  const totalYears = calculateTotalService(servicePeriods);

  // Find the earliest age they can retire
  // Age 62 with 5+ years
  if (totalYears >= 5) {
    return { age: 62, yearsOfService: totalYears };
  }

  // Age 60 with 20+ years
  if (totalYears >= 20) {
    return { age: Math.min(60, currentAge), yearsOfService: totalYears };
  }

  // MRA with 30+ years
  if (totalYears >= 30) {
    return { age: Math.min(mra, currentAge), yearsOfService: totalYears };
  }

  // MRA with 10+ years
  if (totalYears >= 10) {
    return { age: Math.min(mra, currentAge), yearsOfService: totalYears };
  }

  // If not yet eligible, calculate when they will be
  const yearsUntil5Years = Math.max(0, 5 - totalYears);
  const ageWith5Years = currentAge + yearsUntil5Years;

  return { age: Math.max(62, ageWith5Years), yearsOfService: 5 };
}

/**
 * Check FEHB eligibility
 * Must have 5+ years of service to carry into retirement
 */
export function isFEHBEligible(
  currentAge: number,
  totalYearsOfService: number
): boolean {
  // Generally need 5 years of FEHB participation and retire on immediate annuity
  // Simplified: 5+ years of service
  if (totalYearsOfService >= 5) return true;

  return false;
}
