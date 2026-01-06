/**
 * TSP (Thrift Savings Plan) Projection Calculator
 */

import type { TSPInfo } from '../types';

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
