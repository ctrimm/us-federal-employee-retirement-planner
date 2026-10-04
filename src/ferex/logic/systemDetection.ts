/**
 * Retirement System Detection Logic
 * Determines FERS vs CSRS based on service history
 */

import type { ServicePeriod, RetirementSystem, EmploymentInfo, SpecialProvisionType, UserProfile } from '../types';
import { STANDARD_WORK_HOURS_PER_YEAR } from '../types';

const FERS_START_DATE = new Date('1984-01-01');

/**
 * Planned separation date for a profile: Jan 1 of the year they turn leaveServiceAge
 * (falling back to the intended claim age). When neither is on file (e.g. a Quick Check
 * profile before the dashboard is touched), use today so active service is measured
 * through now rather than truncated to Jan 1 of the current year.
 */
export function separationDateForProfile(profile: UserProfile): Date {
  const sepAge = profile.retirement.leaveServiceAge ?? profile.retirement.intendedRetirementAge;
  if (sepAge === undefined) return new Date();
  return new Date(profile.personal.birthYear + sepAge, 0, 1);
}

/**
 * Whole months of service for eligibility-threshold checks, from a decimal year figure.
 * Rounds (rather than floors) so a full 30-calendar-year span — which the 365.25-day
 * year renders as 29.993 — correctly clears the 360-month bar. Tolerance ≈ ±15 days.
 */
export function serviceMonths(years: number): number {
  return Math.round(years * 12);
}

/** Whole calendar months between two dates (OPM-style service credit). */
export function wholeMonthsBetween(start: Date, end: Date): number {
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Creditable service in whole calendar months across periods (through today if open). */
export function serviceMonthsForPeriods(periods: ServicePeriod[]): number {
  let months = 0;
  for (const p of periods) {
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : new Date();
    months += wholeMonthsBetween(start, end);
  }
  return months;
}

/**
 * Project service periods forward to the planned separation date.
 * Active open-ended periods (no endDate) end at the separation date, so the annuity
 * reflects service earned by retirement — never extended past it. (A past separation
 * date therefore freezes service there instead of accruing through today.)
 */
export function projectServicePeriodsToSeparation(
  periods: ServicePeriod[],
  separationDate: Date
): ServicePeriod[] {
  return periods.map((p) =>
    p.isActive && !p.endDate ? { ...p, endDate: new Date(separationDate) } : p
  );
}

/**
 * Return the creditable service periods including a synthetic period for bought-back
 * military service. Active-duty military time counts toward FERS service (annuity and
 * eligibility) only if the employee pays the military deposit. Modeled as FERS service.
 */
export function creditableServicePeriods(employment: EmploymentInfo): ServicePeriod[] {
  const years = employment.militaryDepositPaid ? (employment.militaryServiceYears || 0) : 0;
  if (years <= 0) return employment.servicePeriods;

  const start = new Date(2000, 0, 1);
  const end = new Date(start.getTime() + years * 365.25 * 24 * 60 * 60 * 1000);
  const military: ServicePeriod = {
    id: 'military-buyback',
    startDate: start,
    endDate: end,
    system: 'FERS',
    isActive: false,
  };
  return [...employment.servicePeriods, military];
}

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
  return sickLeaveHours / STANDARD_WORK_HOURS_PER_YEAR;
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
 * Includes sick leave credit if provided.
 *
 * Sick leave converts to service credit for the ANNUITY COMPUTATION ONLY — it never
 * counts toward retirement eligibility (OPM). The `*ExSick` fields carry the
 * eligibility-relevant totals; use those for every can-retire / immediate-annuity /
 * VERA / FEHB-carry-in decision.
 */
export function calculateServiceBySystem(
  periods: ServicePeriod[],
  sickLeaveHours: number = 0
): {
  fersYears: number;
  csrsYears: number;
  specialYears: number;
  totalYears: number;
  sickLeaveCredit: number;
  fersYearsExSick: number;
  csrsYearsExSick: number;
  totalYearsExSick: number;
} {
  let fersYears = 0;
  let csrsYears = 0;
  let specialYears = 0;

  for (const period of periods) {
    const start = new Date(period.startDate);
    const end = period.endDate ? new Date(period.endDate) : new Date();
    const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    const system = period.system === 'auto'
      ? detectRetirementSystem(start)
      : period.system;

    if (system === 'FERS') {
      fersYears += years;
      if (period.specialProvision) specialYears += years;
    } else if (system === 'CSRS') {
      csrsYears += years;
    }
  }

  // Eligibility-relevant totals (before sick leave is folded in).
  const fersYearsExSick = fersYears;
  const csrsYearsExSick = csrsYears;
  const totalYearsExSick = fersYears + csrsYears;

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
    specialYears,
    totalYears: fersYears + csrsYears,
    sickLeaveCredit,
    fersYearsExSick,
    csrsYearsExSick,
    totalYearsExSick,
  };
}

/**
 * Resolve the number of FERS years covered under special provisions.
 * Explicit per-period `specialProvision` flags take precedence; otherwise a profile-level
 * `specialProvisionType` treats all (non-military) FERS service as covered.
 */
export function resolveSpecialYears(
  source: { servicePeriods?: ServicePeriod[]; specialProvisionType?: SpecialProvisionType },
  fersYearsExcludingMilitary: number,
  specialYearsFromPeriods: number
): number {
  const anyFlagged = (source.servicePeriods || []).some((p) => p.specialProvision);
  if (anyFlagged) return specialYearsFromPeriods;
  if (source.specialProvisionType && source.specialProvisionType !== 'none') {
    return fersYearsExcludingMilitary;
  }
  return 0;
}

/**
 * Determine Minimum Retirement Age (MRA) based on birth year.
 *
 * OPM's table has fractional MRAs (e.g. 1969 → 56 years 10 months). This codebase
 * works in whole years, so fractional MRAs round UP to the next whole year — the
 * conservative direction: at the returned age the employee is definitely at MRA,
 * whereas rounding down would grant eligibility months early.
 */
export function calculateMRA(birthYear: number): number {
  if (birthYear < 1948) return 55;
  if (birthYear <= 1952) return 56; // 55y2m – 55y10m
  if (birthYear <= 1964) return 56;
  if (birthYear <= 1969) return 57; // 56y2m – 56y10m
  return 57; // 1970 and later
}

/**
 * Check if employee can retire immediately.
 * Service thresholds are compared in whole months so a full 30-calendar-year span
 * (29.993 in 365.25-day years) correctly qualifies.
 */
export function canRetireNow(
  currentAge: number,
  totalYearsOfService: number,
  birthYear: number
): boolean {
  const mra = calculateMRA(birthYear);
  const months = serviceMonths(totalYearsOfService);

  // Age 62 with 5+ years
  if (currentAge >= 62 && months >= 60) return true;

  // Age 60 with 20+ years
  if (currentAge >= 60 && months >= 240) return true;

  // MRA with 30+ years
  if (currentAge >= mra && months >= 360) return true;

  // MRA with 10+ years (MRA+10)
  if (currentAge >= mra && months >= 120) return true;

  return false;
}

/**
 * Calculate earliest retirement age.
 * Projects service forward year by year for active employees, so someone who will
 * cross a service threshold (e.g. 30 years at MRA) gets that age — not the next
 * age-based rule. Each candidate age is tested against the immediate-retirement rules.
 */
export function calculateEarliestRetirementAge(
  birthYear: number,
  servicePeriods: ServicePeriod[]
): { age: number; yearsOfService: number } {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear;

  const currentMonths = serviceMonthsForPeriods(servicePeriods);
  const accrues = servicePeriods.some((p) => p.isActive && !p.endDate);

  for (let age = currentAge; age <= 70; age++) {
    const monthsAtAge = currentMonths + (accrues ? Math.max(0, age - currentAge) * 12 : 0);
    if (canRetireNow(age, monthsAtAge / 12, birthYear)) {
      return { age, yearsOfService: monthsAtAge / 12 };
    }
  }

  // Practically unreachable (62+5 always hits by 70): fall back to the 5-year vesting date.
  const monthsShort = Math.max(0, 60 - currentMonths);
  const yearsShort = Math.ceil(monthsShort / 12);
  return { age: Math.max(62, currentAge + yearsShort), yearsOfService: 5 };
}

/**
 * Check FEHB eligibility to carry coverage into retirement.
 *
 * Real rule (5 U.S.C. 8905 / OPM): the employee must have been enrolled in FEHB for
 * the 5 years immediately preceding retirement (or since first eligibility) AND retire
 * on an immediate annuity. We cannot see FEHB enrollment history, so we approximate the
 * 5-year rule with 5+ years of service, but we DO enforce the immediate-annuity test.
 *
 * Immediate annuity requires one of: age 62 with 5+ years, age 60 with 20+ years,
 * or MRA with 30+ years. (MRA+10 also yields an immediate annuity, but if postponed to
 * preserve a larger benefit, FEHB is suspended until the annuity begins — not modeled.)
 */
export function isFEHBEligible(
  ageAtRetirement: number,
  totalYearsOfService: number,
  birthYear: number
): boolean {
  // Must meet the 5-year (approximated by service) coverage requirement
  if (serviceMonths(totalYearsOfService) < 60) return false;

  // Must retire on an immediate annuity
  return canRetireNow(ageAtRetirement, totalYearsOfService, birthYear);
}
