/**
 * Projection engine tests — golden full-career path + bug regressions.
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';
import { generateProjections } from '../projectionEngine';
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

describe('golden path: full FERS career, retire at 57', () => {
  it('produces one row per year from current age to life expectancy', () => {
    const projs = generateProjections(profile());
    expect(projs.length).toBe(85 - 45 + 1);
    expect(projs[0].age).toBe(45);
    expect(projs[projs.length - 1].age).toBe(85);
  });

  it('pension at 57 ≈ $40,800 (34 projected years × 1% × $120k)', () => {
    const projs = generateProjections(profile());
    const at57 = projs.find((p) => p.age === 57)!;
    expect(at57.pension).toBeGreaterThan(40_700);
    expect(at57.pension).toBeLessThan(40_950);
  });

  it('FERS pension gets no COLA before 62, diet COLA after', () => {
    const projs = generateProjections(profile());
    const at57 = projs.find((p) => p.age === 57)!;
    const at61 = projs.find((p) => p.age === 61)!;
    const at63 = projs.find((p) => p.age === 63)!;
    expect(at61.pension).toBeCloseTo(at57.pension, 0);
    // diet COLA of 2.5% = 2%: 63 is one COLA year past 62
    expect(at63.pension).toBeCloseTo(at61.pension * 1.02, 0);
  });

  it('net worth and tax fields are populated and sane', () => {
    const projs = generateProjections(profile());
    const at70 = projs.find((p) => p.age === 70)!;
    expect(at70.netWorth).toBeGreaterThan(0);
    expect(at70.totalTax).toBeGreaterThanOrEqual(0);
    expect((at70.federalTax || 0) + (at70.stateTax || 0)).toBeCloseTo(at70.totalTax || 0, 2);
  });
});

describe('regression: FEHB inflated from 2026 base year (bug #2)', () => {
  it('FEHB at retirement in 2038 ≈ $4,200 × 1.05^12', () => {
    const projs = generateProjections(profile());
    const at57 = projs.find((p) => p.age === 57)!;
    const expected = 4200 * Math.pow(1.05, 2038 - 2026);
    expect(at57.fehbCost).toBeCloseTo(expected, 0);
  });
});

describe('regression: Medicare Part B inflated from 2024 base year (bug #3)', () => {
  it('Part B at 65 in 2046 ≈ $174.70×12 × 1.05^22', () => {
    const projs = generateProjections(profile());
    const at65 = projs.find((p) => p.age === 65)!;
    const expected = 174.7 * 12 * Math.pow(1.05, 2046 - 2024);
    expect(at65.medicarePremium).toBeCloseTo(expected, -1); // within $10
  });

  it('no Part B premium while still working at 65+', () => {
    const p = profile({
      personal: { birthYear: 1959, gender: 'male' }, // 67 now
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 70, leaveServiceAge: 70 },
    });
    const projs = generateProjections(p);
    const at67 = projs.find((x) => x.age === 67)!;
    expect(at67.medicarePremium).toBe(0);
  });
});

describe('regression: FERS supplement only on immediate annuities (bug #5)', () => {
  const thirtyYearsAt55 = () =>
    profile({
      personal: { birthYear: 1975, gender: 'male' }, // MRA 57
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('1996-01-01'), endDate: new Date('2026-01-01'), system: 'FERS', isActive: false },
        ],
        currentOrLastSalary: 120000,
        socialSecurityEstimate: 30_000,
      },
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 55, leaveServiceAge: 55 },
    });

  it('no supplement when claiming at 55 with 30 years (deferred annuity)', () => {
    const projs = generateProjections(thirtyYearsAt55());
    const at55 = projs.find((p) => p.age === 55)!;
    expect(at55.fersSupplement).toBe(0);
  });

  it('supplement IS paid for 30 years claimed at MRA', () => {
    const p = thirtyYearsAt55();
    p.retirement.intendedRetirementAge = 57;
    p.retirement.leaveServiceAge = 57;
    const projs = generateProjections(p);
    const at57 = projs.find((x) => x.age === 57)!;
    // SS@62 ≈ 30000 × 0.70 = 21000; × 30/40 ≈ 15750
    expect(at57.fersSupplement).toBeCloseTo(15_750, -1);
  });

  it('supplement ends at 62', () => {
    const p = thirtyYearsAt55();
    p.retirement.intendedRetirementAge = 57;
    p.retirement.leaveServiceAge = 57;
    const projs = generateProjections(p);
    expect(projs.find((x) => x.age === 61)!.fersSupplement).toBeGreaterThan(0);
    expect(projs.find((x) => x.age === 62)!.fersSupplement).toBe(0);
  });
});

describe('postponed MRA+10 — golden path', () => {
  const postponed = () =>
    profile({
      personal: { birthYear: 1970, gender: 'male' }, // MRA 57
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('2011-01-01'), system: 'FERS', isActive: true },
        ],
        currentOrLastSalary: 120000,
      },
      retirement: {
        survivorAnnuityType: 'none',
        leaveServiceAge: 57,
        intendedRetirementAge: 62,
        postponeRetirement: true,
      },
    });

  it('no COLA accrues during the postponement gap; no age reduction at 62', () => {
    const projs = generateProjections(postponed());
    const at62 = projs.find((p) => p.age === 62)!;
    // 16 projected yrs (2011→2027) × 1% × 120k, unreduced at 62
    expect(at62.pension).toBeCloseTo(19_200, -1);
  });

  it('FEHB suspended during the gap, reinstated when annuity begins', () => {
    const projs = generateProjections(postponed());
    expect(projs.find((p) => p.age === 60)!.fehbCost).toBe(0);
    expect(projs.find((p) => p.age === 62)!.fehbCost).toBeGreaterThan(0);
  });
});

describe('deferred annuity — separating before MRA with 30+ years', () => {
  // Born 1971 (MRA 57), 38 years, separates at 55: not eligible for an immediate
  // annuity → deferred to 62. No pension/supplement/FEHB before then.
  const deferred55 = () =>
    profile({
      personal: { birthYear: 1971, gender: 'male' },
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('1988-01-01'), endDate: new Date('2026-01-01'), system: 'FERS', isActive: false },
        ],
        currentOrLastSalary: 155000,
        socialSecurityEstimate: 30_000,
      },
      retirement: { survivorAnnuityType: 'none', intendedRetirementAge: 55, leaveServiceAge: 55 },
    });

  it('no pension before 62; full unreduced pension at 62', () => {
    const projs = generateProjections(deferred55());
    expect(projs.find((p) => p.age === 55)!.pension).toBe(0);
    expect(projs.find((p) => p.age === 61)!.pension).toBe(0);
    const at62 = projs.find((p) => p.age === 62)!;
    expect(at62.pension).toBeCloseTo(155_000 * 0.01 * 38, -2);
  });

  it('deferred annuitants permanently forfeit FEHB', () => {
    const projs = generateProjections(deferred55());
    expect(projs.find((p) => p.age === 62)!.fehbCost).toBe(0);
    expect(projs.find((p) => p.age === 70)!.fehbCost).toBe(0);
  });

  it('no FERS supplement on a deferred annuity', () => {
    const projs = generateProjections(deferred55());
    expect(projs.every((p) => p.fersSupplement === 0)).toBe(true);
  });
});

describe('FERS supplement earnings test — golden path', () => {
  it('part-time wages above the limit reduce the supplement $1 per $2', () => {
    const p = profile({
      personal: { birthYear: 1969, gender: 'male' }, // MRA 56
      employment: {
        servicePeriods: [
          { id: 'p1', startDate: new Date('1996-01-01'), endDate: new Date('2026-01-01'), system: 'FERS', isActive: false },
        ],
        currentOrLastSalary: 120000,
        socialSecurityEstimate: 30_000,
      },
      retirement: {
        survivorAnnuityType: 'none',
        intendedRetirementAge: 57,
        leaveServiceAge: 57,
        enableBaristaFire: true,
        partTimeIncomeAnnual: 50_000,
        partTimeStartAge: 57,
        partTimeEndAge: 60,
      },
    });
    const projs = generateProjections(p);
    const at57 = projs.find((x) => x.age === 57)!;
    // full supplement 15,750; earnings test bites → reduced but not eliminated
    expect(at57.supplementEarningsTestReduction).toBeGreaterThan(0);
    expect(at57.fersSupplement).toBeGreaterThan(0);
    expect(at57.fersSupplement).toBeLessThan(15_750);
  });
});
