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
 * Calculate annual FEHB cost (employee/annuitant share) for a coverage level,
 * inflated `yearsFromNow` years at the healthcare inflation rate.
 */
export function calculateAnnualFEHBCost(
  coverageLevel: FEHBCoverageLevel,
  yearsFromNow: number,
  healthcareInflationRate: number
): number {
  const baseCost = FEHB_BASE_COSTS[coverageLevel];

  // Apply healthcare inflation only. FEHB is community-rated: unlike ACA/individual
  // plans, the enrollee's premium share does NOT increase with age, so no age surcharge
  // is applied. (Retirees pay the same premium as active employees in the same plan.)
  const inflationMultiplier = Math.pow(1 + healthcareInflationRate / 100, yearsFromNow);
  return baseCost * inflationMultiplier;
}

// Note: FEHB↔Medicare coordination (FEHB acting as secondary after 65) is intentionally
// not modeled as a premium reduction — most retirees keep paying both the FEHB share and
// the Medicare Part B premium, which the projection engine accounts for separately.
