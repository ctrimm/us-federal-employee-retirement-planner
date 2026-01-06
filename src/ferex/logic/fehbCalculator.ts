/**
 * FEHB (Federal Employee Health Benefits) Cost Calculator
 */

import type { FEHBCoverageLevel } from '../types';

// 2026 estimated FEHB premiums (annual, employee portion)
// These are averages and will vary by specific plan
const FEHB_BASE_COSTS = {
  self: 4200,
  'self+one': 9600,
  'self+family': 11800,
};

/**
 * Calculate annual FEHB cost based on coverage level and age
 */
export function calculateAnnualFEHBCost(
  coverageLevel: FEHBCoverageLevel,
  age: number,
  yearsFromNow: number,
  healthcareInflationRate: number
): number {
  const baseCost = FEHB_BASE_COSTS[coverageLevel];

  // Apply healthcare inflation
  const inflationMultiplier = Math.pow(1 + healthcareInflationRate / 100, yearsFromNow);
  let adjustedCost = baseCost * inflationMultiplier;

  // Apply age adjustment (costs tend to increase with age)
  // Rough estimate: 1% increase per year after 65
  if (age > 65) {
    const ageAdjustment = 1 + ((age - 65) * 0.01);
    adjustedCost *= ageAdjustment;
  }

  return adjustedCost;
}

/**
 * Check if eligible for FEHB in retirement
 */
export function isFEHBEligibleInRetirement(
  yearsOfService: number,
  ageAtRetirement: number
): boolean {
  // Generally need 5+ years of FEHB participation
  // Must retire on immediate annuity

  // Simplified eligibility:
  // - 5+ years of service AND
  // - Retiring on immediate annuity (age 62+ with 5 years, or age 60+ with 20 years, or MRA+ with 30 years)

  return yearsOfService >= 5;
}

/**
 * Calculate Medicare savings (FEHB becomes supplement after 65)
 */
export function calculateMedicareSavings(
  fehbCost: number
): number {
  // When Medicare kicks in at 65, FEHB acts as supplement
  // Typically reduces out-of-pocket costs by 20-30%
  // But Medicare Part B premium (~$2000/year) applies

  const medicarePartBPremium = 2000;
  const fehbReduction = fehbCost * 0.25; // 25% reduction when used as supplement

  return fehbReduction - medicarePartBPremium;
}

/**
 * Project FEHB costs over retirement years
 */
export function projectFEHBCosts(
  coverageLevel: FEHBCoverageLevel,
  retirementAge: number,
  endAge: number,
  healthcareInflationRate: number
): Array<{ age: number; cost: number }> {
  const costs: Array<{ age: number; cost: number }> = [];

  for (let age = retirementAge; age <= endAge; age++) {
    const yearsFromRetirement = age - retirementAge;
    const cost = calculateAnnualFEHBCost(
      coverageLevel,
      age,
      yearsFromRetirement,
      healthcareInflationRate
    );

    costs.push({ age, cost });
  }

  return costs;
}
