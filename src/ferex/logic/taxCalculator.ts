/**
 * Federal (and optional state) income tax calculator for retirement projections.
 *
 * Uses 2024 tax brackets and standard deductions. Bracket thresholds are not
 * inflation-adjusted in the projection — this is a known simplification that
 * causes a slight over-estimate of taxes in later years.
 *
 * Key rules applied:
 *  1. Federal progressive tax brackets (single or MFJ)
 *  2. Standard deduction, with extra $1,550 per person aged 65+
 *  3. Social Security taxation: 0–85% of benefits taxable depending on
 *     combined income (Provisional Income test)
 *  4. FERS Supplement is treated as ordinary income (same as pension)
 *  5. TSP Traditional distributions are ordinary income
 *  6. Optional flat state income tax rate
 */

export type FilingStatus = 'single' | 'married';

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

// 2024 Standard deductions
const STANDARD_DEDUCTION_SINGLE = 14_600;
const STANDARD_DEDUCTION_MFJ = 29_200;
// Additional deduction per person 65+
const ADDITIONAL_DEDUCTION_65 = 1_550;

/**
 * Calculate federal income tax on a given taxable income using progressive brackets.
 */
function applyBrackets(taxableIncome: number, brackets: TaxBracket[]): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  let prev = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const bracketTop = bracket.upTo === Infinity ? taxableIncome : Math.min(taxableIncome, bracket.upTo);
    if (bracketTop <= prev) break;
    tax += (bracketTop - prev) * bracket.rate;
    prev = bracketTop;
    if (bracketTop >= taxableIncome) break;
  }

  return tax;
}

/**
 * Determine what fraction of Social Security benefits is taxable.
 *
 * IRS Provisional Income (PI) = AGI (excluding SS) + tax-exempt interest + 50% of SS benefits.
 * Thresholds are NOT indexed for inflation.
 *
 * Returns a value 0.0, 0.5, or 0.85 representing the taxable fraction.
 */
function ssTaxableFraction(
  agiExcludingSS: number,
  annualSSBenefit: number,
  filingStatus: FilingStatus
): number {
  const halfSS = annualSSBenefit * 0.5;
  const provisionalIncome = agiExcludingSS + halfSS;

  const threshold1 = filingStatus === 'married' ? 32_000 : 25_000;
  const threshold2 = filingStatus === 'married' ? 44_000 : 34_000;

  if (provisionalIncome <= threshold1) return 0;
  if (provisionalIncome <= threshold2) return 0.5;
  return 0.85;
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
}

export interface TaxResult {
  federalTax: number;
  stateTax: number;
  totalTax: number;
  effectiveRate: number;  // total tax / gross income
  taxableSSBenefit: number;
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
  } = inputs;

  const grossIncome = ordinaryIncome + socialSecurityIncome;
  if (grossIncome <= 0) {
    return { federalTax: 0, stateTax: 0, totalTax: 0, effectiveRate: 0, taxableSSBenefit: 0 };
  }

  // Standard deduction (base + extra for each person 65+)
  const baseDeduction = filingStatus === 'married' ? STANDARD_DEDUCTION_MFJ : STANDARD_DEDUCTION_SINGLE;
  let standardDeduction = baseDeduction;
  if (primaryAge >= 65) standardDeduction += ADDITIONAL_DEDUCTION_65;
  if (filingStatus === 'married' && spouseAge && spouseAge >= 65) standardDeduction += ADDITIONAL_DEDUCTION_65;

  // SS taxation (Provisional Income test)
  const fraction = ssTaxableFraction(ordinaryIncome, socialSecurityIncome, filingStatus);
  const taxableSSBenefit = socialSecurityIncome * fraction;

  // Total AGI = ordinary income + taxable SS portion
  const agi = ordinaryIncome + taxableSSBenefit;
  const taxableIncome = Math.max(0, agi - standardDeduction);

  const brackets = filingStatus === 'married' ? BRACKETS_MFJ : BRACKETS_SINGLE;
  const federalTax = applyBrackets(taxableIncome, brackets);

  // State tax: flat rate applied to total gross income (simplified)
  const stateTax = grossIncome * ((stateTaxRate || 0) / 100);

  const totalTax = federalTax + stateTax;
  const effectiveRate = grossIncome > 0 ? totalTax / grossIncome : 0;

  return { federalTax, stateTax, totalTax, effectiveRate, taxableSSBenefit };
}
