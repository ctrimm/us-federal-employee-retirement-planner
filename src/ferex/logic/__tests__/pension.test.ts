/**
 * Pension calculator tests — golden paths + regression tests.
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';
import {
  calculateFERSPension,
  calculateCSRSPension,
  calculateAnnualPension,
  fersDietCola,
  calculatePensionWithColaSchedule,
  calculateSurvivorBenefit,
  csrsSurvivorReductionAmount,
} from '../pensionCalculator';
import { determineEligibility } from '../projectionEngine';
import { DEFAULT_ASSUMPTIONS, DEFAULT_TSP } from '../../types';
import type { UserProfile } from '../../types';

function profile(overrides: any = {}): UserProfile {
  return {
    personal: { birthYear: 1981, gender: 'male' },
    employment: {
      servicePeriods: [
        { id: 'p1', startDate: new Date('2004-01-01'), system: 'FERS', isActive: true },
      ],
      currentOrLastSalary: 120000,
    },
    retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 57, leaveServiceAge: 57 },
    tsp: {
      currentBalance: 300000,
      annualContribution: 15000,
      returnAssumption: DEFAULT_TSP.returnAssumption!,
    },
    assumptions: { ...DEFAULT_ASSUMPTIONS },
    ...overrides,
  } as UserProfile;
}

describe('FERS pension — golden paths', () => {
  it('standard 1% accrual: $100k high-3 × 25 yrs = $25,000', () => {
    expect(calculateFERSPension(100_000, 25, 'none', 60)).toBeCloseTo(25_000, 2);
  });

  it('enhanced 1.1% accrual at 62 with 20+ years: $100k × 25 yrs = $27,500', () => {
    expect(calculateFERSPension(100_000, 25, 'none', 62)).toBeCloseTo(27_500, 2);
  });

  it('no enhanced accrual at 61 even with 20+ years', () => {
    expect(calculateFERSPension(100_000, 25, 'none', 61)).toBeCloseTo(25_000, 2);
  });

  it('FERS survivor election reduces annuity 10%; survivor gets 50% of unreduced', () => {
    expect(calculateFERSPension(100_000, 25, 'standard', 60)).toBeCloseTo(22_500, 2);
    expect(calculateSurvivorBenefit(22_500, 'standard', 'FERS')).toBeCloseTo(12_500, 2);
  });
});

describe('CSRS pension — golden paths', () => {
  it('tiered accrual: 12 yrs = 1.5%×5 + 1.75%×5 + 2%×2 = 20.25% of high-3', () => {
    expect(calculateCSRSPension(100_000, 12, 'none')).toBeCloseTo(20_250, 2);
  });

  it('CSRS survivor reduction: 2.5% of first $3,600 + 10% above', () => {
    // 0.025×3600 + 0.10×(50000−3600) = 90 + 4640 = 4730
    expect(csrsSurvivorReductionAmount(50_000)).toBeCloseTo(4_730, 2);
    expect(calculateCSRSPension(100_000, 12, 'standard')).toBeCloseTo(20_250 - 1_755, 0);
  });

  it('CSRS survivor benefit is 55% of the unreduced annuity', () => {
    const reduced = 50_000 - csrsSurvivorReductionAmount(50_000); // 45,270
    // unreduced reconstructed as (45270 − 270) / 0.9 = 50000 → × 0.55 = 27500
    expect(calculateSurvivorBenefit(reduced, 'standard', 'CSRS')).toBeCloseTo(27_500, 0);
  });
});

describe('FERS special provisions — golden path', () => {
  it('LEO 25 covered yrs: 1.7%×20 + 1.0%×5 = 39% of high-3', () => {
    const p = profile({
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('2001-01-01'), endDate: new Date('2026-01-01'), system: 'FERS', isActive: false },
        ],
        currentOrLastSalary: 100_000,
        specialProvisionType: 'leo_firefighter',
      },
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 55, leaveServiceAge: 55 },
      personal: { birthYear: 1971, gender: 'male' },
    });
    expect(calculateAnnualPension(p).annualPension).toBeCloseTo(39_000, -1);
  });
});

describe('COLA schedules — golden paths', () => {
  it('FERS diet COLA: ≤2% full, 2–3% → 2%, >3% → CPI−1', () => {
    expect(fersDietCola(1.5)).toBeCloseTo(1.5, 6);
    expect(fersDietCola(2)).toBeCloseTo(2, 6);
    expect(fersDietCola(2.5)).toBeCloseTo(2, 6);
    expect(fersDietCola(4)).toBeCloseTo(3, 6);
  });

  it('FERS gets no COLA before 62; diet COLA after', () => {
    expect(calculatePensionWithColaSchedule(30_000, 'FERS', 60, 57, 2.5, false)).toBeCloseTo(30_000, 2);
    expect(calculatePensionWithColaSchedule(30_000, 'FERS', 63, 57, 2.5, false)).toBeCloseTo(30_600, 2);
  });

  it('CSRS gets full CPI COLA from claim age', () => {
    expect(calculatePensionWithColaSchedule(30_000, 'CSRS', 60, 57, 2.5)).toBeCloseTo(
      30_000 * Math.pow(1.025, 3), 2
    );
  });

  it('special-provision retirees get COLA immediately', () => {
    expect(calculatePensionWithColaSchedule(30_000, 'FERS', 58, 55, 2.5, true)).toBeCloseTo(
      30_000 * Math.pow(1.02, 3), 2
    );
  });
});

describe('MRA+10 reduction — golden path', () => {
  it('15 yrs at MRA 57, immediate: 25% reduction (5%/yr under 62)', () => {
    const p = profile({
      personal: { birthYear: 1970, gender: 'male' }, // MRA 57
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('2011-01-01'), system: 'FERS', isActive: true },
        ],
        currentOrLastSalary: 120_000,
      },
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 57, leaveServiceAge: 57 },
    });
    const pen = calculateAnnualPension(p);
    // 16 projected yrs (2011→2027) × 1% × 120k × 0.75 (date math leaves a sub-day fraction)
    expect(pen.mra10ReductionPercent).toBeCloseTo(0.25, 6);
    expect(pen.annualPension).toBeCloseTo(14_400, -1);
  });
});

describe('regression: sick leave must not buy eligibility (bug #4)', () => {
  const sickLeaveProfile = () =>
    profile({
      personal: { birthYear: 1969, gender: 'male' }, // MRA 56
      employment: {
        servicePeriods: [
          {
            id: 'p1',
            startDate: new Date('1996-07-01'),
            endDate: new Date('2026-01-01'),
            system: 'FERS',
            isActive: false,
          },
        ],
        currentOrLastSalary: 120_000,
        sickLeaveHours: 1500, // 0.719 yr — must NOT push 29.5 → 30 for eligibility
      },
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 57, leaveServiceAge: 57 },
    });

  it('29.5 real years + sick leave is still MRA+10 (25% reduction), not unreduced MRA+30', () => {
    const pen = calculateAnnualPension(sickLeaveProfile());
    expect(pen.mra10ReductionPercent).toBeCloseTo(0.25, 6);
  });

  it('sick leave still increases the annuity amount (29.5 + 0.719 yrs before reduction)', () => {
    const pen = calculateAnnualPension(sickLeaveProfile());
    const expected = 120_000 * 0.01 * (29.5 + 1500 / 2087) * 0.75;
    expect(pen.annualPension).toBeCloseTo(expected, -1); // sub-day date fraction
  });

  it('eligibility service total excludes sick leave', () => {
    const elig = determineEligibility(sickLeaveProfile());
    expect(elig.totalYearsOfService).toBeCloseTo(29.5, 2);
  });
});

describe('regression: pension projects future service to separation (bug #1)', () => {
  it('45yo retiring at 57: pension on ~34 projected years, not 22.76 through today', () => {
    const pen = calculateAnnualPension(profile());
    expect(pen.yearsOfService).toBeGreaterThan(33.9);
    expect(pen.yearsOfService).toBeLessThan(34.2);
    expect(pen.annualPension).toBeCloseTo(40_800, -2); // within $100
  });
});

describe('regression: 2026-10-04 pressure-test findings', () => {
  // Bug 1: exact 30 calendar years at MRA must be immediate UNREDUCED (not MRA+10 reduced).
  // The 365.25-day year renders 1997-01-01→2027-01-01 as 29.993, which failed the >= 30 check.
  it('30.0 calendar years at MRA 57: unreduced $30,000, no MRA+10 reduction', () => {
    const p = profile({
      personal: { birthYear: 1970, gender: 'male' }, // MRA 57
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('1997-01-01'), system: 'FERS', isActive: true },
        ],
        currentOrLastSalary: 100_000,
      },
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 57, leaveServiceAge: 57 },
    });
    const pen = calculateAnnualPension(p);
    expect(pen.mra10ReductionPercent).toBeUndefined();
    expect(pen.annualPension).toBeCloseTo(30_000, -2); // within $100
  });

  // Bug 1 (eligibility): 56yo with 29.75 yrs becomes MRA+30 eligible at 57, not 60.
  it('eligibility: 56yo with 29.75 yrs → earliest retirement at 57, not 60', () => {
    const p = profile({
      personal: { birthYear: 1970, gender: 'male' },
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('1997-01-01'), system: 'FERS', isActive: true },
        ],
        currentOrLastSalary: 100_000,
      },
      retirement: { survivorAnnuityType: 'none' }, // Quick Check leaves ages undefined
    });
    const elig = determineEligibility(p);
    expect(elig.canRetireImmediately).toBe(false); // 56 < MRA 57
    expect(elig.earliestRetirementAge).toBe(57);
  });

  // Bug 2: 1.1% must apply at 62/20+ even when the profile has no explicit retirement
  // ages (Quick Check flow) — the engine falls back to max(62, currentAge).
  it('1.1% accrual at 62 with 20+ yrs (no explicit retirement ages on profile)', () => {
    const p = profile({
      personal: { birthYear: 1964, gender: 'male' }, // 62 in 2026
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('2004-06-01'), system: 'FERS', isActive: true },
        ],
        currentOrLastSalary: 120_000,
      },
      retirement: { survivorAnnuityType: 'none' },
    });
    const pen = calculateAnnualPension(p);
    expect(pen.accrualRate).toBeCloseTo(0.011, 4);
    expect(pen.mra10ReductionPercent).toBeUndefined();
    expect(pen.annualPension).toBeGreaterThan(28_000); // ~$29.5k, not the $26.8k at 1.0%
  });

  // Bug 4: service is measured at the planned separation date, not extended to today.
  it('service stops at the planned separation date, not today', () => {
    const p = profile({
      personal: { birthYear: 1964, gender: 'male' },
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('2004-06-01'), system: 'FERS', isActive: true },
        ],
        currentOrLastSalary: 120_000,
      },
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 62, leaveServiceAge: 62 },
    });
    const pen = calculateAnnualPension(p);
    // Separation Jan 1 2026 → ~21.58 yrs; must NOT run through today (~22.3)
    expect(pen.yearsOfService).toBeLessThan(22.0);
    expect(pen.yearsOfService).toBeGreaterThan(21.0);
  });

  // Bug 5: FERS 5-year vesting — no annuity with <5 years at separation.
  it('unvested (<5 yrs at separation): $0 pension', () => {
    const p = profile({
      personal: { birthYear: 1985, gender: 'male' },
      employment: {
        servicePeriods: [
          {
            id: 'p1',
            startDate: new Date('2020-01-01'),
            endDate: new Date('2024-01-01'),
            system: 'FERS',
            isActive: false,
          },
        ],
        currentOrLastSalary: 100_000,
      },
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 62, leaveServiceAge: 62 },
    });
    const pen = calculateAnnualPension(p);
    expect(pen.annualPension).toBe(0);
    expect(pen.monthlyPension).toBe(0);
    expect(pen.isVested).toBe(false);
  });

  // Bug 5 (projected): 4 years today but 25 by 62 → vested via projection.
  it('4 yrs today but 25 projected by 62: vested, pension > 0', () => {
    const p = profile({
      personal: { birthYear: 1985, gender: 'male' }, // 41 in 2026
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('2022-01-01'), system: 'FERS', isActive: true },
        ],
        currentOrLastSalary: 100_000,
      },
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 62, leaveServiceAge: 62 },
    });
    const pen = calculateAnnualPension(p);
    expect(pen.isVested).not.toBe(false);
    expect(pen.annualPension).toBeGreaterThan(20_000);
  });
});
