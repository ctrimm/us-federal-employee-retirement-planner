/**
 * TSP (Thrift Savings Plan) Projection Calculator
 */

import type { TSPInfo } from '../types';

/**
 * Required Minimum Distribution start age (SECURE 2.0).
 *  - Born 1959 or earlier: 73
 *  - Born 1960 or later:   75
 * (Those who reached 72 before 2023 started earlier; not relevant for forward projections.)
 */
export function rmdStartAge(birthYear: number): number {
  return birthYear >= 1960 ? 75 : 73;
}

// IRS Uniform Lifetime Table (post-2022) distribution-period divisors by age.
const UNIFORM_LIFETIME_DIVISORS: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
  87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
  94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
  101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1,
  108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3, 113: 3.1, 114: 3.0,
  115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

/**
 * Required Minimum Distribution for a Traditional (pre-tax) balance at a given age.
 * Roth TSP has no RMD for the account owner (SECURE 2.0, effective 2024), so this applies
 * to the Traditional balance only. Returns 0 below the table's start age.
 */
export function requiredMinimumDistribution(traditionalBalance: number, age: number): number {
  if (traditionalBalance <= 0 || age < 73) return 0;
  const clamped = Math.min(120, Math.max(73, Math.floor(age)));
  const divisor = UNIFORM_LIFETIME_DIVISORS[clamped] ?? 2.0;
  return traditionalBalance / divisor;
}

/**
 * Calculate TSP balance at retirement given current balance and contributions
 */
export function calculateTSPAtRetirement(
  currentBalance: number,
  annualContribution: number,
  yearsUntilRetirement: number,
  returnRate: number
): number {
  let balance = currentBalance;
  const rateDecimal = returnRate / 100;

  for (let year = 0; year < yearsUntilRetirement; year++) {
    // Add annual contribution at beginning of year
    balance += annualContribution;
    // Apply growth
    balance *= (1 + rateDecimal);
  }

  return balance;
}

/**
 * Calculate annual TSP distribution based on drawdown strategy
 */
export function calculateTSPDistribution(
  balance: number,
  drawdownRate: number
): number {
  return balance * (drawdownRate / 100);
}

/**
 * Calculate TSP balance after a year of distributions and growth
 */
export function calculateTSPBalanceAfterYear(
  startingBalance: number,
  annualDistribution: number,
  returnRate: number
): number {
  // Assume distribution happens at beginning of year
  const balanceAfterDistribution = startingBalance - annualDistribution;

  // Apply growth to remaining balance
  const rateDecimal = returnRate / 100;
  return balanceAfterDistribution * (1 + rateDecimal);
}

/**
 * Project TSP balance over multiple years
 */
export function projectTSPBalance(
  initialBalance: number,
  annualDistribution: number,
  returnRate: number,
  years: number
): number[] {
  const balances: number[] = [initialBalance];
  let currentBalance = initialBalance;

  for (let year = 1; year <= years; year++) {
    currentBalance = calculateTSPBalanceAfterYear(
      currentBalance,
      annualDistribution,
      returnRate
    );
    balances.push(Math.max(0, currentBalance)); // Don't go negative
  }

  return balances;
}

/**
 * Calculate sustainable withdrawal rate to last until target age
 */
export function calculateSustainableWithdrawal(
  currentBalance: number,
  yearsToLast: number,
  returnRate: number
): number {
  // Use present value of annuity formula
  const rateDecimal = returnRate / 100;

  if (rateDecimal === 0) {
    return currentBalance / yearsToLast;
  }

  // PMT = PV × (r × (1 + r)^n) / ((1 + r)^n - 1)
  const numerator = rateDecimal * Math.pow(1 + rateDecimal, yearsToLast);
  const denominator = Math.pow(1 + rateDecimal, yearsToLast) - 1;

  return currentBalance * (numerator / denominator);
}

/**
 * Estimate employer match for FERS employees
 */
export function calculateEmployerMatch(
  salary: number,
  employeeContributionPercent: number
): number {
  // FERS matching:
  // - 1% automatic (even if employee contributes 0%)
  // - 100% match on first 3%
  // - 50% match on next 2%
  // Maximum employer contribution: 5% of salary

  const automatic = salary * 0.01;

  if (employeeContributionPercent === 0) {
    return automatic;
  }

  let match = automatic;

  if (employeeContributionPercent >= 3) {
    match += salary * 0.03; // 100% of first 3%
  } else {
    match += salary * (employeeContributionPercent / 100);
  }

  if (employeeContributionPercent >= 5) {
    match += salary * 0.01; // 50% of next 2%
  } else if (employeeContributionPercent > 3) {
    const additionalPercent = employeeContributionPercent - 3;
    match += salary * (additionalPercent / 100) * 0.5;
  }

  return Math.min(match, salary * 0.05);
}
