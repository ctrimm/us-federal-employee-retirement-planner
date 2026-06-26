/**
 * Federal (and optional state) income tax calculator for retirement projections.
 *
 * Uses 2024 tax brackets and standard deductions as the base year. Bracket thresholds
 * and the standard deduction are scaled by an optional `inflationFactor` so the projection
 * approximates the IRS's annual inflation indexing in later years.
 *
 * Key rules applied:
 *  1. Federal progressive tax brackets (single or MFJ)
 *  2. Standard deduction, with the age-65+ addition ($1,950 single / $1,550 each married)
 *  3. Social Security taxation: 0–85% of benefits taxable depending on
 *     combined income (IRS Provisional Income worksheet — phases in gradually)
 *  4. FERS Supplement is treated as ordinary income (same as pension)
 *  5. TSP Traditional distributions are ordinary income
 *  6. Optional flat state income tax rate
 */

export type FilingStatus = 'single' | 'married';

// Base year for the hard-coded brackets/standard deductions below. Used to inflation-index
// thresholds forward in multi-year projections.
export const TAX_BRACKET_BASE_YEAR = 2024;

interface TaxBracket {
  rate: number;    // decimal (e.g. 0.22)
  upTo: number;    // upper bound of this bracket (Infinity for top bracket)
}

// 2024 Federal income tax brackets
const BRACKETS_SINGLE: TaxBracket[] = [
  { rate: 0.10, upTo: 11_600 },
  { rate: 0.12, upTo: 47_150 },
  { rate: 0.22, upTo: 100_525 },
  { rate: 0.24, upTo: 191_950 },
  { rate: 0.32, upTo: 243_725 },
  { rate: 0.35, upTo: 609_350 },
  { rate: 0.37, upTo: Infinity },
];

const BRACKETS_MFJ: TaxBracket[] = [
  { rate: 0.10, upTo: 23_200 },
  { rate: 0.12, upTo: 94_300 },
  { rate: 0.22, upTo: 201_050 },
  { rate: 0.24, upTo: 383_900 },
  { rate: 0.32, upTo: 487_450 },
  { rate: 0.35, upTo: 731_200 },
  { rate: 0.37, upTo: Infinity },
];

// 2024 long-term capital gains rate breakpoints (taxable-income thresholds).
// LTCG stacks on top of ordinary taxable income: 0% / 15% / 20%.
const LTCG_0_RATE_CEILING_SINGLE = 47_025;
const LTCG_0_RATE_CEILING_MFJ = 94_050;
const LTCG_15_RATE_CEILING_SINGLE = 518_900;
const LTCG_15_RATE_CEILING_MFJ = 583_750;

// 2024 Standard deductions
const STANDARD_DEDUCTION_SINGLE = 14_600;
const STANDARD_DEDUCTION_MFJ = 29_200;
// Additional standard deduction per person 65+ (2024).
// Single/HoH get a larger amount ($1,950) than married filers ($1,550 each).
const ADDITIONAL_DEDUCTION_65_SINGLE = 1_950;
const ADDITIONAL_DEDUCTION_65_MARRIED = 1_550;

/**
 * Calculate federal income tax on a given taxable income using progressive brackets.
 * Bracket thresholds are scaled by `inflationFactor` to approximate annual inflation indexing.
 */
function applyBrackets(taxableIncome: number, brackets: TaxBracket[], inflationFactor: number = 1): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let prev = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const upTo = bracket.upTo === Infinity ? Infinity : bracket.upTo * inflationFactor;
    const bracketTop = upTo === Infinity ? taxableIncome : Math.min(taxableIncome, upTo);
    if (bracketTop <= prev) break;
    tax += (bracketTop - prev) * bracket.rate;
    prev = bracketTop;
    if (bracketTop >= taxableIncome) break;
  }

  return tax;
}

/**
 * Determine the taxable amount of Social Security benefits using the IRS worksheet.
 *
 * IRS Provisional Income (PI) = AGI (excluding SS) + tax-exempt interest + 50% of SS benefits.
 * Thresholds are NOT indexed for inflation. The taxable amount is the *lesser of*
 * several capped amounts — not simply 50% or 85% of the full benefit — so it phases
 * in gradually. (IRS Pub. 915 / SSA "Benefits Planner: Income Taxes".)
 *
 * Returns the dollar amount of SS benefits subject to income tax.
 */
function ssTaxableAmount(
  agiExcludingSS: number,
  annualSSBenefit: number,
  filingStatus: FilingStatus
): number {
  if (annualSSBenefit <= 0) return 0;

  const halfSS = annualSSBenefit * 0.5;
  const provisionalIncome = agiExcludingSS + halfSS;

  const threshold1 = filingStatus === 'married' ? 32_000 : 25_000;
  const threshold2 = filingStatus === 'married' ? 44_000 : 34_000;

  if (provisionalIncome <= threshold1) return 0;

  // Middle tier: up to 50% of benefits phase in between threshold1 and threshold2.
  if (provisionalIncome <= threshold2) {
    return Math.min(0.5 * (provisionalIncome - threshold1), halfSS);
  }

  // Top tier: 85% of the excess over threshold2, plus the smaller of the
  // middle-tier amount or half the gap between thresholds — capped at 85% of benefits.
  const middleTierCap = 0.5 * (threshold2 - threshold1); // $6,000 MFJ / $4,500 single
  const lowerPortion = Math.min(halfSS, middleTierCap);
  const taxable = 0.85 * (provisionalIncome - threshold2) + lowerPortion;
  return Math.min(taxable, 0.85 * annualSSBenefit);
}

/**
 * Long-term capital gains tax. LTCG is taxed at 0% / 15% / 20% and stacks *on top of*
 * ordinary taxable income, so the rate depends on where the gains fall relative to the
 * ordinary income already used up. Thresholds are inflation-indexed.
 */
function capitalGainsTax(
  ordinaryTaxableIncome: number,
  gains: number,
  filingStatus: FilingStatus,
  inflationFactor: number
): number {
  if (gains <= 0) return 0;

  const ceiling0 = (filingStatus === 'married' ? LTCG_0_RATE_CEILING_MFJ : LTCG_0_RATE_CEILING_SINGLE) * inflationFactor;
  const ceiling15 = (filingStatus === 'married' ? LTCG_15_RATE_CEILING_MFJ : LTCG_15_RATE_CEILING_SINGLE) * inflationFactor;

  let pos = Math.max(0, ordinaryTaxableIncome);
  let remaining = gains;
  let tax = 0;

  // 0% band
  const inZero = Math.min(remaining, Math.max(0, ceiling0 - pos));
  remaining -= inZero;
  pos += inZero;

  // 15% band
  const in15 = Math.min(remaining, Math.max(0, ceiling15 - pos));
  tax += in15 * 0.15;
  remaining -= in15;

  // 20% band
  tax += Math.max(0, remaining) * 0.20;

  return tax;
}

export interface TaxInputs {
  /** Ordinary income: pension + FERS supplement + TSP distributions */
  ordinaryIncome: number;
  /** Total Social Security benefits received this year (primary + spouse) */
  socialSecurityIncome: number;
  /** Spouse income included in ordinaryIncome (for SS PI calculation) */
  spouseOrdinaryIncome?: number;
  /** Filing status — 'married' if a spouse is present */
  filingStatus: FilingStatus;
  /** Primary person's age (used for extra standard deduction at 65+) */
  primaryAge: number;
  /** Spouse age (used for extra standard deduction at 65+) */
  spouseAge?: number;
  /** Optional flat state income tax rate (e.g. 5 for 5%). Applies to total income. */
  stateTaxRate?: number;
  /**
   * Realized long-term capital gains this year (e.g. the gain portion of taxable-brokerage
   * withdrawals). Taxed at preferential 0/15/20% rates stacked on ordinary taxable income.
   */
  capitalGains?: number;
  /**
   * Inflation factor (≥1) applied to bracket thresholds and the standard deduction to
   * approximate the IRS's annual inflation indexing. Defaults to 1 (no indexing). The SS
   * provisional-income thresholds are NOT indexed (they are fixed in statute).
   */
  inflationFactor?: number;
}

export interface TaxResult {
  federalTax: number;     // ordinary income tax + long-term capital gains tax
  stateTax: number;
  totalTax: number;
  effectiveRate: number;  // total tax / gross income
  taxableSSBenefit: number;
  capitalGainsTax: number;
}

/**
 * Calculate total tax liability for a retirement year.
 */
export function calculateRetirementTax(inputs: TaxInputs): TaxResult {
  const {
    ordinaryIncome,
    socialSecurityIncome,
    filingStatus,
    primaryAge,
    spouseAge,
    stateTaxRate,
    capitalGains = 0,
    inflationFactor = 1,
  } = inputs;

  const grossIncome = ordinaryIncome + socialSecurityIncome + Math.max(0, capitalGains);
  if (grossIncome <= 0) {
    return { federalTax: 0, stateTax: 0, totalTax: 0, effectiveRate: 0, taxableSSBenefit: 0, capitalGainsTax: 0 };
  }

  // Standard deduction (base + extra for each person 65+), inflation-indexed.
  const baseDeduction = filingStatus === 'married' ? STANDARD_DEDUCTION_MFJ : STANDARD_DEDUCTION_SINGLE;
  const additional65 = filingStatus === 'married' ? ADDITIONAL_DEDUCTION_65_MARRIED : ADDITIONAL_DEDUCTION_65_SINGLE;
  let standardDeduction = baseDeduction;
  if (primaryAge >= 65) standardDeduction += additional65;
  if (filingStatus === 'married' && spouseAge && spouseAge >= 65) standardDeduction += additional65;
  standardDeduction *= inflationFactor;

  // SS taxation (IRS Provisional Income worksheet — phases in, capped at 85%)
  const taxableSSBenefit = ssTaxableAmount(ordinaryIncome, socialSecurityIncome, filingStatus);

  // Total AGI = ordinary income + taxable SS portion
  const agi = ordinaryIncome + taxableSSBenefit;
  const taxableIncome = Math.max(0, agi - standardDeduction);

  const brackets = filingStatus === 'married' ? BRACKETS_MFJ : BRACKETS_SINGLE;
  const ordinaryTax = applyBrackets(taxableIncome, brackets, inflationFactor);

  // Long-term capital gains stack on top of ordinary taxable income at 0/15/20%.
  const capGainsTax = capitalGainsTax(taxableIncome, Math.max(0, capitalGains), filingStatus, inflationFactor);
  const federalTax = ordinaryTax + capGainsTax;

  // State tax: flat rate applied to ordinary income + taxable SS + capital gains (federal-ish
  // base). Excludes the non-taxable portion of Social Security and all Roth distributions
  // (which are not in ordinaryIncome). Most income-taxing states exempt SS entirely; this
  // is a reasonable middle-ground simplification rather than taxing gross income.
  const stateTaxableBase = Math.max(0, ordinaryIncome + taxableSSBenefit + Math.max(0, capitalGains));
  const stateTax = stateTaxableBase * ((stateTaxRate || 0) / 100);

  const totalTax = federalTax + stateTax;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

  return { federalTax, stateTax, totalTax, effectiveRate, taxableSSBenefit, capitalGainsTax: capGainsTax };
}
