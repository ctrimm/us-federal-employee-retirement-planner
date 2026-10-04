/**
 * Tax calculator tests — golden paths for brackets, SS worksheet, LTCG stacking.
 * Run: npm test
 */
import { describe, it, expect } from 'vitest';
import { calculateRetirementTax } from '../taxCalculator';

describe('federal brackets — golden paths (2024)', () => {
  it('single, $100k ordinary, age 66: std ded $16,550 → tax $13,412', () => {
    const r = calculateRetirementTax({
      ordinaryIncome: 100_000,
      socialSecurityIncome: 0,
      filingStatus: 'single',
      primaryAge: 66,
      inflationFactor: 1,
    });
    expect(r.federalTax).toBeCloseTo(13_412, 0);
  });

  it('MFJ, $100k ordinary, both 66: std ded $32,300 → tax $7,660', () => {
    const r = calculateRetirementTax({
      ordinaryIncome: 100_000,
      socialSecurityIncome: 0,
      filingStatus: 'married',
      primaryAge: 66,
      spouseAge: 66,
      inflationFactor: 1,
    });
    // taxable = 67700: 10%×23200 + 12%×(67700−23200) = 2320 + 5340
    expect(r.federalTax).toBeCloseTo(7_660, 0);
  });

  it('bracket thresholds inflate with inflationFactor', () => {
    const base = calculateRetirementTax({
      ordinaryIncome: 50_000, socialSecurityIncome: 0,
      filingStatus: 'single', primaryAge: 60, inflationFactor: 1,
    });
    const inflated = calculateRetirementTax({
      ordinaryIncome: 50_000, socialSecurityIncome: 0,
      filingStatus: 'single', primaryAge: 60, inflationFactor: 1.1,
    });
    expect(inflated.federalTax).toBeLessThan(base.federalTax);
  });
});

describe('Social Security taxation — IRS worksheet golden paths', () => {
  it('single, $30k ordinary + $24k SS: taxable SS = $11,300', () => {
    const r = calculateRetirementTax({
      ordinaryIncome: 30_000,
      socialSecurityIncome: 24_000,
      filingStatus: 'single',
      primaryAge: 66,
      inflationFactor: 1,
    });
    // PI = 30000 + 12000 = 42000 → .85×(42000−34000) + min(12000, 4500) = 11300
    expect(r.taxableSSBenefit).toBeCloseTo(11_300, 0);
  });

  it('low income: no SS taxable (PI under $25k single)', () => {
    const r = calculateRetirementTax({
      ordinaryIncome: 10_000,
      socialSecurityIncome: 12_000,
      filingStatus: 'single',
      primaryAge: 66,
      inflationFactor: 1,
    });
    expect(r.taxableSSBenefit).toBe(0);
  });

  it('taxable SS caps at 85% of benefits', () => {
    const r = calculateRetirementTax({
      ordinaryIncome: 200_000,
      socialSecurityIncome: 30_000,
      filingStatus: 'single',
      primaryAge: 66,
      inflationFactor: 1,
    });
    expect(r.taxableSSBenefit).toBeCloseTo(25_500, 0);
  });
});

describe('long-term capital gains stacking — golden paths', () => {
  it('gains stack on ordinary income: $40k taxable + $20k gains single → $1,946.25', () => {
    // 0% ceiling 47,025: 7,025 at 0%, 12,975 at 15%
    const r = calculateRetirementTax({
      ordinaryIncome: 40_000 + 16_550, // backs out the age-66 single std ded → $40k taxable
      socialSecurityIncome: 0,
      filingStatus: 'single',
      primaryAge: 66,
      capitalGains: 20_000,
      inflationFactor: 1,
    });
    expect(r.capitalGainsTax).toBeCloseTo(1_946.25, 2);
  });

  it('state tax applies to ordinary + taxable SS + gains, excludes Roth/nontaxable SS', () => {
    const r = calculateRetirementTax({
      ordinaryIncome: 50_000,
      socialSecurityIncome: 20_000,
      filingStatus: 'single',
      primaryAge: 66,
      stateTaxRate: 5,
      inflationFactor: 1,
    });
    expect(r.stateTax).toBeCloseTo(0.05 * (50_000 + r.taxableSSBenefit), 2);
    expect(r.stateTax).toBeLessThan(0.05 * 70_000);
  });
});
