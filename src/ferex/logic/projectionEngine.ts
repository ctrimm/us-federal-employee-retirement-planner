/**
 * Main Retirement Projection Engine
 * Generates year-by-year projections combining pension, TSP, FEHB, and other income
 */

import type {
  UserProfile,
  ProjectionYear,
  EligibilityInfo,
  PensionBreakdown,
} from '../types';
import { DEFAULT_LIFE_EXPECTANCY } from '../types';
import { calculateAnnualPension, calculatePensionWithCOLA, calculateSpouseAnnualPension } from './pensionCalculator';
import { calculateTSPBalanceAfterYear, calculateTSPDistribution, calculateEmployerMatch } from './tspCalculator';
import { calculateAnnualFEHBCost } from './fehbCalculator';
import {
  calculateTotalService,
  calculateMRA,
  canRetireNow,
  calculateEarliestRetirementAge,
  isFEHBEligible,
  calculateServiceBySystem,
} from './systemDetection';
import { calculateRetirementTax } from './taxCalculator';
import type { FilingStatus } from './taxCalculator';
import { MEDICARE_PART_B_MONTHLY_2024, LEAN_FIRE_MULTIPLIER, FAT_FIRE_MULTIPLIER } from '../types';

/**
 * Determine eligibility information for a user profile
 */
export function determineEligibility(profile: UserProfile): EligibilityInfo {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - profile.personal.birthYear;
  const sickLeaveCredit = (profile.employment.sickLeaveHours || 0) / 2087;
  const totalYears = calculateTotalService(profile.employment.servicePeriods) + sickLeaveCredit;
  const mra = calculateMRA(profile.personal.birthYear);

  const { fersYears, csrsYears } = calculateServiceBySystem(
    profile.employment.servicePeriods,
    profile.employment.sickLeaveHours || 0
  );

  const canRetire = canRetireNow(currentAge, totalYears, profile.personal.birthYear);

  const earliestInfo = calculateEarliestRetirementAge(
    profile.personal.birthYear,
    profile.employment.servicePeriods
  );

  // Calculate earliest retirement date
  const earliestRetirementDate = new Date(
    profile.personal.birthYear + earliestInfo.age,
    0,
    1
  );

  // Full benefits age (typically 62 with 5+ years for FERS)
  const fullBenefitsAge = 62;
  const fullBenefitsDate = new Date(
    profile.personal.birthYear + fullBenefitsAge,
    0,
    1
  );

  // Determine primary system
  let detectedSystem: 'FERS' | 'CSRS' | 'auto' = 'auto';
  if (fersYears > 0 && csrsYears === 0) detectedSystem = 'FERS';
  else if (csrsYears > 0 && fersYears === 0) detectedSystem = 'CSRS';
  else if (fersYears > csrsYears) detectedSystem = 'FERS';
  else if (csrsYears > 0) detectedSystem = 'CSRS';

  return {
    canRetireImmediately: canRetire,
    earliestRetirementAge: earliestInfo.age,
    earliestRetirementDate,
    fullBenefitsAge,
    fullBenefitsDate,
    fehbEligible: isFEHBEligible(currentAge, totalYears),
    totalYearsOfService: totalYears,
    detectedSystem,
  };
}

/**
 * Calculate Social Security benefit for a given age.
 * Uses the user's actual SS estimate if provided (WEP already reflected by SSA).
 * Falls back to a rough approximation with optional WEP reduction applied.
 * Full retirement age is assumed to be 67. Early claiming is not modeled.
 */
function estimateSocialSecurity(
  high3: number,
  age: number,
  ssEstimate?: number,
  wepMonthlyReduction?: number
): number {
  if (age < 67) return 0;

  if (ssEstimate && ssEstimate > 0) {
    // User-provided estimate from SSA.gov already includes WEP; use as-is.
    return ssEstimate;
  }

  // Fallback approximation — apply WEP reduction only here (not on user-provided estimates)
  const rawEstimate = high3 * 0.30;
  const annualWEP = (wepMonthlyReduction || 0) * 12;
  return Math.max(0, rawEstimate - annualWEP);
}

/**
 * Calculate FERS Supplement (approximate)
 * Paid by OPM to eligible FERS retirees between retirement and age 62.
 * Approximates the Social Security benefit earned during federal service.
 *
 * Eligibility: Immediate annuity with 30+ years at MRA, or 20+ years at age 60.
 * NOT available for MRA+10 (deferred/reduced) retirements.
 *
 * Formula (simplified): estimated_SS_at_62 × (FERS_years / 40)
 */
function calculateFERSSupplement(
  high3: number,
  age: number,
  claimPensionAge: number,
  fersYears: number,
  totalYears: number,
  detectedSystem: string,
  ssEstimate?: number
): number {
  // Only for FERS employees
  if (detectedSystem === 'CSRS') return 0;

  // Only paid between retirement and age 62
  if (age < claimPensionAge || age >= 62) return 0;

  // Only for immediate full annuity (30+ years at MRA, or 20+ years at age 60)
  // MRA+10 retirements do NOT qualify
  const qualifiesForSupplement = totalYears >= 30 || (totalYears >= 20 && claimPensionAge <= 60);
  if (!qualifiesForSupplement) return 0;

  // Use user's actual SS estimate if provided; otherwise fall back to approximation.
  // The supplement is designed to approximate the SS benefit earned during federal service.
  // OPM uses the estimated SS at 62; if the user has a full-retirement-age estimate we use it directly
  // as a close proxy (slightly conservative since 62 benefit would be ~70% of FRA benefit).
  const estimatedSSAt62 = ssEstimate && ssEstimate > 0 ? ssEstimate : high3 * 0.30;

  // Supplement = estimated SS × (FERS years / 40 qualifying years)
  const supplementFraction = Math.min(fersYears / 40, 1);
  return estimatedSSAt62 * supplementFraction;
}

/**
 * Generate year-by-year retirement projections
 */
export function generateProjections(profile: UserProfile): ProjectionYear[] {
  const projections: ProjectionYear[] = [];

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - profile.personal.birthYear;

  // Determine when leaving service vs claiming pension
  const leaveServiceAge = profile.retirement.leaveServiceAge || profile.retirement.intendedRetirementAge || determineEligibility(profile).earliestRetirementAge;
  const claimPensionAge = profile.retirement.intendedRetirementAge || leaveServiceAge;

  // Determine end age
  const lifeExpectancy = profile.personal.lifeExpectancy || DEFAULT_LIFE_EXPECTANCY;
  const endAge = profile.retirement.projectionEndAge || lifeExpectancy;

  // Start from current age to show full picture
  const startAge = currentAge;

  // Calculate base pension (will only apply from claimPensionAge)
  const pensionInfo = calculateAnnualPension(profile);
  const basePension = pensionInfo.annualPension;

  // Pre-compute FERS supplement eligibility data
  const eligibilityForSupplement = determineEligibility(profile);
  const { fersYears } = calculateServiceBySystem(
    profile.employment.servicePeriods,
    profile.employment.sickLeaveHours || 0
  );
  const supplementDetectedSystem = eligibilityForSupplement.detectedSystem;

  // ── Non-federal 401k pre-computation ──────────────────────────────────────
  // For each non-federal period that has a 401k balance:
  //   - If rolloverToTSP === true  → add currentBalance401k to initial TSP balance
  //   - Otherwise                  → track in a separate nonFederal401kBalance pool
  const nonFederalPeriods = profile.employment.nonFederalPeriods || [];
  let nonFederal401kRolloverToTSP = 0;
  let nonFederal401kBalance = 0;

  for (const period of nonFederalPeriods) {
    const balance = period.currentBalance401k || 0;
    if (balance <= 0) continue;
    if (period.rolloverToTSP) {
      nonFederal401kRolloverToTSP += balance;
    } else {
      nonFederal401kBalance += balance;
    }
  }

  // Identify the single currently-active non-federal period (if any) for ongoing contributions
  let activeNonFederalPeriod = null;
  for (let i = 0; i < nonFederalPeriods.length; i++) {
    if (nonFederalPeriods[i].isActive && nonFederalPeriods[i].had401k) {
      activeNonFederalPeriod = nonFederalPeriods[i];
      break;
    }
  }

  // ── TSP initialization (Traditional + Roth split) ─────────────────────────
  // Non-federal 401k rollovers are treated as Traditional (pre-tax).
  const rothStart = Math.min(profile.tsp.rothBalance || 0, profile.tsp.currentBalance);
  let tspTradBalance = (profile.tsp.currentBalance - rothStart) + nonFederal401kRolloverToTSP;
  let tspRothBalance = rothStart;
  // tspBalance is always the sum of both for backward-compatible output fields
  let tspBalance = tspTradBalance + tspRothBalance;

  // Initialize other investments tracking
  let otherInvestmentsBalance = profile.otherInvestments?.totalBalance || 0;

  // Initialize debts (deep copy to avoid mutating original)
  const debts = (profile.planning?.debts || []).map(d => ({ ...d }));

  // Initialize assets (deep copy)
  const assets = (profile.planning?.assets || []).map(a => ({ ...a }));

  // ── Spouse pre-computation ─────────────────────────────────────────────────
  const spouse = profile.personal.spouseInfo || null;
  const spouseCurrentAge = spouse ? spouse.age : 0;
  const spouseRetirementAge = spouse?.retirementAge || 65;
  const spouseLeaveServiceAge = spouse?.leaveServiceAge || spouseRetirementAge;
  const spouseCurrentIncome = spouse?.currentIncome || 0;

  // Pre-calculate spouse's federal pension (if applicable) — base amount before COLA
  const spouseBasePension = spouse ? calculateSpouseAnnualPension(spouse) : 0;

  // Track spouse TSP balance throughout projection
  let spouseTspBalance = spouse?.tspCurrentBalance || 0;

  // Annual living expenses (base amount in today's dollars)
  const baseLivingExpenses = profile.assumptions.annualLivingExpenses || 60000;
  const applyExpensesFromCurrentAge = profile.assumptions.applyExpensesFromCurrentAge || false;
  const expenseInflationRate = profile.assumptions.expenseInflationRate || profile.assumptions.inflationRate;

  // Base TSP drawdown rate (may be adjusted per-year by guardrails strategy)
  const drawdownRate = profile.assumptions.tspDrawdownRate || 4;

  // ── CoastFIRE pre-computation ──────────────────────────────────────────────
  // Estimate the pension-adjusted FIRE number at the planned retirement age so
  // we can discount it back to compute a CoastFIRE target for each projection year.
  const yearsUntilRetirement = Math.max(0, claimPensionAge - currentAge);
  const expensesAtRetirement = baseLivingExpenses *
    Math.pow(1 + expenseInflationRate / 100, yearsUntilRetirement);
  const userSSEstimateForCoast = profile.employment.socialSecurityEstimate;
  const guaranteedAtRetirement = basePension +
    (claimPensionAge >= 67 ? (userSSEstimateForCoast || pensionInfo.high3 * 0.30) : 0);
  const incomeGapAtRetirement = Math.max(0, expensesAtRetirement - guaranteedAtRetirement);
  const fireTargetAtRetirement = incomeGapAtRetirement / (drawdownRate / 100);

  // ── Guardrails & FI state ─────────────────────────────────────────────────
  let retirementPortfolioBase = 0; // Set at the moment of retirement for guardrails reference
  let fiAchieved = false;          // Latched once FI is reached
  let coastAchieved = false;       // Latched once CoastFIRE is reached

  // FIRE tier multipliers
  const leanMultiplier = profile.assumptions.leanFireMultiplier || LEAN_FIRE_MULTIPLIER;
  const fatMultiplier = profile.assumptions.fatFireMultiplier || FAT_FIRE_MULTIPLIER;

  // Generate year-by-year projections
  let cumulativeSavings = 0;

  for (let age = startAge; age <= endAge; age++) {
    const year = profile.personal.birthYear + age;
    const stillWorking = age < leaveServiceAge;
    const hasPension = age >= claimPensionAge;
    const yearsFromPension = age - claimPensionAge;

    // ── TSP: contributions while working, distributions in retirement ─────────
    const returnRate = profile.tsp.returnAssumption;
    const rothContrib = Math.min(profile.tsp.rothAnnualContribution || 0, profile.tsp.annualContribution);
    const tradContrib = profile.tsp.annualContribution - rothContrib;

    if (stillWorking) {
      const salary = profile.employment.currentOrLastSalary;
      const employeeContributionPercent = profile.tsp.contributionPercent || 0;
      const employerMatch = calculateEmployerMatch(salary, employeeContributionPercent);
      // Employer match always goes to Traditional; employee Roth contributions to Roth
      tspTradBalance = (tspTradBalance + tradContrib + employerMatch) * (1 + returnRate / 100);
      tspRothBalance = (tspRothBalance + rothContrib) * (1 + returnRate / 100);
    }

    // Calculate pension with COLA (only if claiming)
    const pension = hasPension ? calculatePensionWithCOLA(
      basePension,
      Math.max(0, yearsFromPension),
      profile.assumptions.colaRate
    ) : 0;

    // ── Guardrails: compute effective withdrawal rate ─────────────────────────
    // Record portfolio base at the moment of retirement
    if (!stillWorking && retirementPortfolioBase === 0) {
      retirementPortfolioBase = tspTradBalance + tspRothBalance + otherInvestmentsBalance;
    }
    let effectiveWithdrawalRate = drawdownRate;
    if (profile.assumptions.withdrawalStrategy === 'guardrails' && retirementPortfolioBase > 0) {
      const totalPortfolio = tspTradBalance + tspRothBalance + otherInvestmentsBalance;
      const ratio = totalPortfolio / retirementPortfolioBase;
      const lower = (profile.assumptions.guardrailsLowerPct || 80) / 100;
      const upper = (profile.assumptions.guardrailsUpperPct || 120) / 100;
      const cut = (profile.assumptions.guardrailsSpendingCutPct || 10) / 100;
      const bump = (profile.assumptions.guardrailsSpendingBumpPct || 10) / 100;
      if (ratio < lower) {
        effectiveWithdrawalRate = drawdownRate * (1 - cut);
      } else if (ratio > upper) {
        effectiveWithdrawalRate = drawdownRate * (1 + bump);
      }
    }

    // TSP distribution with age 55+ separation rule (Traditional + Roth proportional)
    const canAccessTSP = !stillWorking && (age >= 59.5 || (leaveServiceAge >= 55 && age >= leaveServiceAge));
    const totalTSPForDist = tspTradBalance + tspRothBalance;
    const tspDistribution = canAccessTSP ? totalTSPForDist * (effectiveWithdrawalRate / 100) : 0;
    const rothFraction = totalTSPForDist > 0 ? tspRothBalance / totalTSPForDist : 0;
    const tspRothDistribution = tspDistribution * rothFraction;
    const tspTradDistribution = tspDistribution - tspRothDistribution;

    // TSP balance update: Roth conversion (Traditional→Roth, taxable), then distributions + growth
    if (!stillWorking) {
      // Optional annual Roth conversion (e.g. before SS/pension income raises tax bracket)
      const conversionAmount = Math.min(profile.tsp.rothConversionAnnual || 0, tspTradBalance);
      tspTradBalance -= conversionAmount;
      tspRothBalance += conversionAmount;
      // Distributions and growth
      tspTradBalance = Math.max(0, (tspTradBalance - tspTradDistribution) * (1 + returnRate / 100));
      tspRothBalance = Math.max(0, (tspRothBalance - tspRothDistribution) * (1 + returnRate / 100));
    }
    tspBalance = tspTradBalance + tspRothBalance;

    // Estimate Social Security (uses user's actual estimate if provided; WEP applied to fallback only)
    const userSSEstimate = profile.employment.socialSecurityEstimate;
    const socialSecurity = estimateSocialSecurity(
      pensionInfo.high3, age, userSSEstimate, profile.employment.wepMonthlyReduction
    );

    // Calculate FERS Supplement (paid between retirement and age 62 for eligible immediate annuitants)
    const fersSupplement = calculateFERSSupplement(
      pensionInfo.high3,
      age,
      claimPensionAge,
      fersYears,
      eligibilityForSupplement.totalYearsOfService,
      supplementDetectedSystem,
      userSSEstimate
    );

    // Calculate FEHB cost (only after leaving service)
    const fehbCost = stillWorking ? 0 : calculateAnnualFEHBCost(
      profile.assumptions.fehbCoverageLevel,
      age,
      Math.max(0, age - leaveServiceAge),
      profile.assumptions.healthcareInflation
    );

    // Medicare Part B premium — added at 65+ for primary and/or spouse.
    // Standard 2024 premium grows at healthcareInflation rate each year.
    // If a user-provided SS estimate is from SSA.gov it is already WEP-adjusted;
    // Part B is a separate out-of-pocket cost on top of FEHB.
    let medicarePremium = 0;
    const medicareAnnualBase = MEDICARE_PART_B_MONTHLY_2024 * 12;
    if (age >= 65) {
      const yearsOnMedicare = age - 65;
      medicarePremium += medicareAnnualBase *
        Math.pow(1 + profile.assumptions.healthcareInflation / 100, yearsOnMedicare);
    }
    if (spouse) {
      const currentSpouseAgeThisYear = spouseCurrentAge + (age - currentAge);
      if (currentSpouseAgeThisYear >= 65) {
        const spouseMedicareYears = currentSpouseAgeThisYear - 65;
        medicarePremium += medicareAnnualBase *
          Math.pow(1 + profile.assumptions.healthcareInflation / 100, spouseMedicareYears);
      }
    }

    // ── Non-federal 401k growth + contributions ───────────────────────────────
    // Grow the non-TSP 401k pool each year
    const nonFed401kReturnRate = activeNonFederalPeriod?.return401kAssumption ?? profile.tsp.returnAssumption;
    // Add contributions from an active non-federal period (while the user is in that job)
    // We treat the non-federal period as active up until leaveServiceAge (when they return to federal)
    if (activeNonFederalPeriod && age < leaveServiceAge) {
      const annualContrib = activeNonFederalPeriod.annual401kContribution || 0;
      const salary = activeNonFederalPeriod.annualSalary || 0;
      const matchPct = activeNonFederalPeriod.employerMatch401kPercent || 0;
      const employerMatchAmt = salary * (matchPct / 100);
      nonFederal401kBalance += annualContrib + employerMatchAmt;
    }
    nonFederal401kBalance *= (1 + nonFed401kReturnRate / 100);

    // ── Full spouse income modeling ───────────────────────────────────────────
    let spouseIncome = 0;
    let spousePension = 0;
    let spouseTspDistribution = 0;
    let spouseSocialSecurity = 0;

    if (spouse) {
      const currentSpouseAge = spouseCurrentAge + (age - currentAge);
      const spouseStillWorking = currentSpouseAge < spouseLeaveServiceAge;
      const spouseHasClaimed = currentSpouseAge >= spouseRetirementAge;

      if (spouseStillWorking) {
        // Spouse is still working — accumulate TSP contributions
        const spouseTspContrib = spouse.tspAnnualContribution || 0;
        spouseTspBalance += spouseTspContrib;
        spouseTspBalance *= (1 + (spouse.tspReturnAssumption ?? 6.5) / 100);

        spouseIncome = spouseCurrentIncome;
      } else {
        // Spouse has left employment — grow or draw down TSP
        const canAccessSpouseTSP = currentSpouseAge >= 59.5 ||
          (spouseLeaveServiceAge >= 55 && currentSpouseAge >= spouseLeaveServiceAge);

        if (canAccessSpouseTSP) {
          spouseTspDistribution = spouseTspBalance * (drawdownRate / 100);
          spouseTspBalance = (spouseTspBalance - spouseTspDistribution) *
            (1 + (spouse.tspReturnAssumption ?? 6.5) / 100);
        } else {
          spouseTspBalance *= (1 + (spouse.tspReturnAssumption ?? 6.5) / 100);
        }

        // Spouse federal pension (with COLA from the year they claimed)
        if (spouseHasClaimed && spouseBasePension > 0) {
          const yearsFromSpouseClaim = currentSpouseAge - spouseRetirementAge;
          spousePension = calculatePensionWithCOLA(
            spouseBasePension,
            Math.max(0, yearsFromSpouseClaim),
            profile.assumptions.colaRate
          );
        }

        // Spouse Social Security (at age 67)
        if (currentSpouseAge >= 67) {
          if (spouse.socialSecurityEstimate && spouse.socialSecurityEstimate > 0) {
            spouseSocialSecurity = spouse.socialSecurityEstimate;
          } else if (spouse.currentIncome) {
            // Rough fallback: ~35% of working income as SS estimate
            spouseSocialSecurity = spouse.currentIncome * 0.35;
          }
        }

        // Total spouse retirement income: auto-calculated pension + TSP + SS,
        // plus any manually specified additional retirement income
        const manualExtra = spouse.retirementIncome || 0;
        spouseIncome = spousePension + spouseTspDistribution + spouseSocialSecurity + manualExtra;
      }
    }

    // Other income - Barista FIRE part-time work + side hustle
    let otherIncome = 0;

    // Add Barista FIRE income (age-limited)
    if (profile.retirement.enableBaristaFire &&
        profile.retirement.partTimeIncomeAnnual &&
        profile.retirement.partTimeStartAge &&
        profile.retirement.partTimeEndAge) {
      const partTimeStart = profile.retirement.partTimeStartAge;
      const partTimeEnd = profile.retirement.partTimeEndAge;

      if (age >= partTimeStart && age <= partTimeEnd) {
        otherIncome += profile.retirement.partTimeIncomeAnnual;
      }
    }

    // Add side hustle income (active throughout life - Uber, Etsy, etc.)
    if (profile.retirement.sideHustleIncome) {
      otherIncome += profile.retirement.sideHustleIncome;
    }

    // Calculate other investments growth using weighted-average return rate + annual contributions
    const otherAccounts = profile.otherInvestments?.accounts || [];
    const otherAnnualContributions = otherAccounts.reduce((sum, account) => sum + (account.annualContribution || 0), 0);
    let weightedReturnRate: number;
    if (otherAccounts.length === 0 || otherInvestmentsBalance === 0) {
      weightedReturnRate = 0.065; // Default 6.5%
    } else {
      const totalAccountBalances = otherAccounts.reduce((sum, a) => sum + a.currentBalance, 0) || otherInvestmentsBalance;
      weightedReturnRate = otherAccounts.reduce((rate, account) => {
        const weight = totalAccountBalances > 0 ? account.currentBalance / totalAccountBalances : 1 / otherAccounts.length;
        return rate + weight * ((account.returnAssumption || 6.5) / 100);
      }, 0);
    }
    otherInvestmentsBalance = (otherInvestmentsBalance + otherAnnualContributions) * (1 + weightedReturnRate);

    // Calculate inflated living expenses for this year
    const yearsFromStart = age - startAge;
    const inflatedLivingExpenses = baseLivingExpenses * Math.pow(1 + expenseInflationRate / 100, yearsFromStart);

    // Apply living expenses based on settings
    // If applyExpensesFromCurrentAge is enabled, expenses start immediately
    // Otherwise, expenses only apply after leaving service
    const shouldApplyExpenses = applyExpensesFromCurrentAge || !stillWorking;
    // Medicare Part B applies regardless of working status once eligible at 65+
    let totalExpenses = shouldApplyExpenses ? (inflatedLivingExpenses + fehbCost) : 0;
    totalExpenses += medicarePremium;

    // Calculate college costs for children (tracked separately for visibility)
    let collegeCosts = 0;
    (profile.planning?.children || []).forEach(child => {
      const childAge = year - child.birthYear;
      const collegeStart = child.collegeStartAge || 18;
      const collegeEnd = collegeStart + (child.collegeYears || 4);

      if (childAge >= collegeStart && childAge < collegeEnd) {
        collegeCosts += child.annualCollegeCost || 0;
      }
    });
    totalExpenses += collegeCosts;

    // Add life events costs
    (profile.planning?.lifeEvents || []).forEach(event => {
      if (event.year === year) {
        if (!event.recurring) {
          totalExpenses += event.amount || 0;
        }
      }
      // Handle recurring events
      if (event.recurring && event.duration) {
        if (year >= event.year && year < event.year + event.duration) {
          totalExpenses += event.amount || 0;
        }
      }
    });

    // Calculate debt payments and update balances
    let totalDebtPayments = 0;
    debts.forEach(debt => {
      if (debt.currentBalance > 0) {
        const interestCharge = debt.currentBalance * (debt.interestRate / 100);
        const payment = debt.minimumPayment + (debt.extraPayment || 0);
        totalDebtPayments += payment;
        debt.currentBalance = Math.max(0, debt.currentBalance + interestCharge - payment);
      }
    });
    totalExpenses += totalDebtPayments;

    // Update asset values with appreciation
    let totalAssetValue = 0;
    assets.forEach(asset => {
      asset.currentValue *= (1 + (asset.appreciationRate || 0) / 100);
      totalAssetValue += asset.currentValue;
    });

    // Calculate total debt
    const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);

    // Total income (pension + TSP + Social Security + FERS Supplement + other sources)
    const totalIncome = pension + tspDistribution + socialSecurity + fersSupplement + spouseIncome + otherIncome;

    // Net income (after expenses and taxes) — progressive federal + optional state tax
    const filingStatus: FilingStatus = spouse ? 'married' : 'single';
    const spouseAgeThisYear = spouse ? spouseCurrentAge + (age - currentAge) : undefined;
    // Ordinary income: Traditional pension/TSP are taxable; Roth TSP distributions are NOT.
    // Roth conversions ARE taxable in the year of conversion.
    const rothConversionThisYear = !stillWorking
      ? Math.min(profile.tsp.rothConversionAnnual || 0, tspTradBalance + tspTradDistribution)
      : 0;
    const ordinaryIncome = pension + fersSupplement + tspTradDistribution + rothConversionThisYear +
      spousePension + spouseTspDistribution +
      (spouse && spouseCurrentAge + (age - currentAge) < spouseLeaveServiceAge ? spouseCurrentIncome : 0) +
      (spouse?.retirementIncome || 0);
    const totalSSIncome = socialSecurity + spouseSocialSecurity;
    const taxResult = calculateRetirementTax({
      ordinaryIncome: Math.max(0, ordinaryIncome),
      socialSecurityIncome: Math.max(0, totalSSIncome),
      filingStatus,
      primaryAge: age,
      spouseAge: spouseAgeThisYear,
      stateTaxRate: profile.assumptions.stateTaxRate,
    });
    const netIncome = totalIncome - totalExpenses - taxResult.totalTax;

    // ── FIRE metrics ──────────────────────────────────────────────────────────
    // Pension-adjusted FIRE number: portfolio gap after guaranteed income at this year's expense level
    const guaranteedIncome = pension + fersSupplement + socialSecurity +
      (spousePension || 0) + (spouseSocialSecurity || 0);
    const incomeGap = Math.max(0, totalExpenses - guaranteedIncome);
    const adjustedFireNumber = incomeGap / (effectiveWithdrawalRate / 100);

    // Lean / Fat FIRE numbers (scale only the living-expense portion)
    const nonLivingExpenses = totalExpenses - inflatedLivingExpenses;
    const leanTotalExp = inflatedLivingExpenses * leanMultiplier + nonLivingExpenses;
    const fatTotalExp = inflatedLivingExpenses * fatMultiplier + nonLivingExpenses;
    const leanFireNumber = Math.max(0, leanTotalExp - guaranteedIncome) / (effectiveWithdrawalRate / 100);
    const fatFireNumber = Math.max(0, fatTotalExp - guaranteedIncome) / (effectiveWithdrawalRate / 100);

    // CoastFIRE: balance needed now so that, with 0 new contributions, it grows to fireTargetAtRetirement
    const yearsUntilRetirementFromHere = Math.max(0, claimPensionAge - age);
    const coastFIRENumber = yearsUntilRetirementFromHere > 0
      ? fireTargetAtRetirement / Math.pow(1 + returnRate / 100, yearsUntilRetirementFromHere)
      : fireTargetAtRetirement;

    // FI and CoastFIRE: latch true only for the first year each condition is met
    const liquidWorth = tspBalance + otherInvestmentsBalance;
    const fiThisYear = !fiAchieved && liquidWorth >= adjustedFireNumber && adjustedFireNumber > 0;
    const coastThisYear = !coastAchieved && liquidWorth >= coastFIRENumber && coastFIRENumber > 0;
    if (fiThisYear) fiAchieved = true;
    if (coastThisYear) coastAchieved = true;

    // Calculate net worth (includes spouse TSP and non-federal 401k in household wealth)
    const netWorth = tspBalance + otherInvestmentsBalance + spouseTspBalance + nonFederal401kBalance + totalAssetValue - totalDebt;
    const liquidNetWorth = tspBalance + otherInvestmentsBalance + spouseTspBalance + nonFederal401kBalance - totalDebt;

    // Cumulative savings
    cumulativeSavings += netIncome;

    projections.push({
      age,
      year,
      pension,
      tspDistribution,
      socialSecurity,
      fersSupplement,
      otherIncome,
      spouseIncome,
      spousePension,
      spouseTspDistribution,
      spouseSocialSecurity,
      spouseTspBalance: Math.max(0, spouseTspBalance),
      nonFederal401kBalance: Math.max(0, nonFederal401kBalance),
      fehbCost,
      medicarePremium,
      totalIncome,
      federalTax: taxResult.federalTax,
      stateTax: taxResult.stateTax,
      totalTax: taxResult.totalTax,
      effectiveTaxRate: taxResult.effectiveRate,
      expenses: totalExpenses,
      collegeCosts,
      netIncome,
      tspBalance: Math.max(0, tspBalance),
      otherInvestmentsBalance: Math.max(0, otherInvestmentsBalance),
      totalDebt,
      totalAssets: totalAssetValue,
      netWorth,
      liquidNetWorth,
      cumulativeSavings,
    });
  }

  return projections;
}

/**
 * Get pension breakdown for display
 */
export function getPensionBreakdown(profile: UserProfile): PensionBreakdown {
  return calculateAnnualPension(profile);
}

/**
 * Calculate summary statistics for a scenario
 */
export function calculateSummaryStats(projections: ProjectionYear[]) {
  if (projections.length === 0) {
    return {
      totalLifetimeIncome: 0,
      averageAnnualIncome: 0,
      tspDepletionAge: null,
      finalTSPBalance: 0,
    };
  }

  const totalLifetimeIncome = projections.reduce(
    (sum, p) => sum + p.totalIncome,
    0
  );

  const averageAnnualIncome = totalLifetimeIncome / projections.length;

  // Find when TSP runs out
  let tspDepletionAge = null;
  for (const projection of projections) {
    if (projection.tspBalance === 0 && tspDepletionAge === null) {
      tspDepletionAge = projection.age;
      break;
    }
  }

  const finalTSPBalance = projections[projections.length - 1]?.tspBalance || 0;

  return {
    totalLifetimeIncome,
    averageAnnualIncome,
    tspDepletionAge,
    finalTSPBalance,
  };
}
